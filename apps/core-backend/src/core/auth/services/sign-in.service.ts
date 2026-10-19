import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '@weaver2/prisma';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import { FindUserByEmailQuery } from '../repositories/find-user-by-email.query';
import { CreateRefreshTokenCommand } from '../repositories/create-refresh-token.command';
import { FindRefreshTokenQuery } from '../repositories/find-refresh-token.query';
import { MarkRefreshTokenRotatedCommand } from '../repositories/mark-refresh-token-rotated.command';
import { PurgeStaleRefreshTokensCommand } from '../repositories/purge-stale-refresh-tokens.command';
import { DeleteRefreshTokensByUserIdCommand } from '../repositories/delete-refresh-tokens-by-user-id.command';
import { IsRefreshSessionRevokedQuery } from '../repositories/is-refresh-session-revoked.query';
import { LockUsersCommand } from '../repositories/lock-users.command';
import {
  ACCOUNT_LOCKED_MESSAGE,
  ReserveAuthAttemptCommand,
} from '../repositories/reserve-auth-attempt.command';
import { ResetAuthAttemptsCommand } from '../repositories/reset-auth-attempts.command';

/**
 * 회전된 토큰이 다시 제시됐을 때, 이 시간 이내면 정상 경합(응답 유실 후 재시도 등)으로 보고
 * 조용히 거절만 한다. 초과 시 탈취로 간주해 전 세션을 무효화한다.
 */
const REFRESH_REUSE_GRACE_MS = 30 * 1000;

/** 없는 계정에도 bcrypt 한 번을 들이기 위한 해시(비용 10, 아무 비밀번호와도 맞지 않는다) */
const DUMMY_PASSWORD_HASH =
  '$2b$10$CwTycUXWue0Thq9StjUM0uJ8.9BqvZGzBv6X3B7vlEPH5bWv1w7mS';

@Injectable()
export class SignInService {
  private readonly logger = new Logger(SignInService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * 비밀번호라는 요소만 확인한다. 계정 상태(탈퇴·정지)와 2FA 는 SignInCompletionService 가
   * 비밀번호가 맞은 **뒤에** 본다 — 전에는 비밀번호를 보기 전에 탈퇴 여부와 정지 날짜를 알려,
   * 이메일만으로 계정 상태가 샜다. 탈퇴한 계정은 찾지 않으므로(그리고 탈퇴 때 자격 행이
   * 지워지므로) 「잘못된 자격 증명」과 같게 답한다.
   */
  async validateUserByEmail(email: string, password: string) {
    const user = await FindUserByEmailQuery(this.prisma, email);

    this.logger.debug(
      `validateUserByEmail: Found user: ${JSON.stringify(user?.id)}`,
    );

    if (!user?.localCredential?.passwordHash) {
      // 있는 계정과 같은 시간을 들인다 — bcrypt 를 건너뛰면 응답 속도로 계정 유무가 샌다
      await bcrypt.compare(password, DUMMY_PASSWORD_HASH);
      throw new UnauthorizedException('Invalid credentials');
    }

    const { localCredential } = user;

    // 비밀번호를 보기 전에 시도를 원자적으로 잡는다 — 동시 요청이 잠금을 앞질러 대입하지 못하게.
    if (!(await ReserveAuthAttemptCommand(this.prisma, user.id, 'PASSWORD'))) {
      throw new UnauthorizedException(ACCOUNT_LOCKED_MESSAGE);
    }

    const match = await bcrypt.compare(password, localCredential.passwordHash);
    if (!match) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // 비밀번호가 맞았으니 비밀번호 요소를 비운다 — 아래 미인증 거절보다 먼저(안 그러면 맞는
    // 비밀번호로 다섯 번 들어와 본 미인증 사용자가 잠긴다). 2FA 코드는 SECOND_FACTOR 로 따로
    // 세므로, 「다시 로그인 → 코드 4번」을 되풀이해도 2FA 쪽 카운터는 비지 않는다.
    await ResetAuthAttemptsCommand(this.prisma, user.id, 'PASSWORD');

    if (!user.emailVerifiedAt) {
      throw new UnauthorizedException('EMAIL_NOT_VERIFIED');
    }

    this.logger.debug(
      `validateUserByEmail: Returning user: ${JSON.stringify(user.id)}`,
    );
    return user;
  }

  async login(
    userId: string,
    _provider: string,
    rememberMe = false,
    ipAddress?: string,
    userAgent?: string,
    oidcSid?: string,
  ) {
    this.logger.debug(
      `Logged in user is: ${userId}, rememberMe: ${rememberMe}`,
    );

    // Update user's last login time
    await this.prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });

    const payload = { sub: userId };
    this.logger.debug(`SignInService.login: Signing JWT for userId=${userId}`);

    // Remember me에 따라 토큰 만료 기간 설정
    const expiryDays = rememberMe ? 30 : 7;
    const tokenExpiry = expiryDays * 24 * 60 * 60 * 1000; // 밀리초

    const generatedRefreshToken = await this.generateRefreshToken(
      userId,
      expiryDays,
      ipAddress,
      userAgent,
      oidcSid,
    );
    return {
      accessToken: this.jwtService.sign(payload),
      refreshToken: generatedRefreshToken,
      tokenExpiry, // 쿠키 설정용
    };
  }

  async generateRefreshToken(
    userId: string,
    expiryDays: number,
    ipAddress?: string,
    userAgent?: string,
    oidcSid?: string,
  ) {
    const token = randomUUID();
    const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * expiryDays);

    await CreateRefreshTokenCommand(
      this.prisma,
      userId,
      token,
      expires,
      ipAddress,
      userAgent,
      oidcSid,
    );

    return token;
  }

  async refresh(refreshToken: string, ipAddress?: string, userAgent?: string) {
    const stored = await FindRefreshTokenQuery(this.prisma, refreshToken);

    if (!stored || stored.expires < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // 재사용(탈취) 감지: 이미 회전된 토큰이 다시 제시됨.
    // - grace window 이내: 정상 경합(응답 유실 후 재시도 등)으로 보고 조용히 거절만.
    // - 초과: 탈취로 간주해 해당 유저의 전 세션을 무효화.
    if (stored.rotatedAt) {
      const sinceRotationMs = Date.now() - stored.rotatedAt.getTime();
      if (sinceRotationMs > REFRESH_REUSE_GRACE_MS) {
        this.logger.warn(
          `Refresh token reuse detected for user ${stored.userId}; revoking all sessions`,
        );
        await DeleteRefreshTokensByUserIdCommand(this.prisma, stored.userId);
      }
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // 사용자가 삭제되었거나 존재하지 않는지 확인
    if (!stored.user || stored.user.deletedAt) {
      this.logger.warn(
        `Refresh attempted for deleted or non-existent user: ${stored.user?.id || 'unknown'}`,
      );
      throw new UnauthorizedException('User account no longer exists');
    }

    const now = new Date();
    const remainingMs = stored.expires.getTime() - Date.now();
    const remainingDays = Math.max(
      1,
      Math.ceil(remainingMs / (1000 * 60 * 60 * 24)),
    );
    const newRefreshToken = randomUUID();

    // Rotation 은 한 트랜잭션에서, 그 사람의 users 행을 잠그고 — back-channel 로그아웃도 같은 행을 잠그므로
    // 둘이 줄을 선다. 로그아웃이 먼저면 아래 마킹이 0 건(행이 지워짐)이거나 묘비에 걸린다
    const outcome = await this.prisma.$transaction(async (tx) => {
      await LockUsersCommand(tx, [stored.userId]);
      if (await IsRefreshSessionRevokedQuery(tx, stored, now)) {
        await tx.refreshToken.deleteMany({ where: { id: stored.id } });
        return 'revoked' as const;
      }
      // 삭제 대신 rotatedAt 마킹(재사용 감지용). 다른 요청이 먼저 회전했으면 0 건
      const { count } = await MarkRefreshTokenRotatedCommand(
        tx,
        refreshToken,
        now,
      );
      if (count !== 1) return 'lost' as const;
      // SSO 세션의 sid 를 새 행으로 옮긴다 — 안 옮기면 한 번 회전한 세션은 back-channel 로그아웃에 닿지 않는다
      await CreateRefreshTokenCommand(
        tx,
        stored.userId,
        newRefreshToken,
        new Date(Date.now() + 1000 * 60 * 60 * 24 * remainingDays),
        ipAddress,
        userAgent,
        stored.oidcSid ?? undefined,
      );
      return 'rotated' as const;
    });
    if (outcome !== 'rotated') {
      if (outcome === 'revoked') {
        this.logger.warn(
          `Refresh refused: session ended by back-channel logout (user ${stored.userId})`,
        );
      }
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
    // 만료·오래된 회전 토큰 정리
    await PurgeStaleRefreshTokensCommand(this.prisma, stored.user.id, now);

    return {
      accessToken: this.jwtService.sign({ sub: stored.user.id }),
      refreshToken: newRefreshToken,
      tokenExpiry: remainingMs,
    };
  }
}
