import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { Prisma, PrismaClient, PrismaService } from '@weaver2/prisma';
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
import { FindLocalCredentialByUserIdQuery } from '../repositories/find-local-credential-by-user-id.query';
import { JwtPayload } from '../strategy/jwt-payload.interface';
import { hashToken } from '../utils/auth-crypto.util';
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

/**
 * 첫 요소가 무엇으로 신원을 확인했는가 — `login` 이 사용자 행 잠금 아래에서 그것이 지금도 유효한지 다시 본다.
 * 확인한 뒤 · 세션을 주기 전에 비밀번호 변경 · 재설정 · 연동 해제가 끼어들면, 그쪽이 지운 세션 자리에
 * 이 로그인의 새 refresh 행이 남는다. 그 사이를 이 값으로 가린다.
 *
 * - `password` — 맞춰 본 그 자격의 passwordChangedAt(ms)과 해시 지문. 둘 다 같아야 같은 비밀번호다
 *   (시각만으로는 같은 ms 안의 두 번 변경 · 인스턴스 사이 시계 차이를 못 가린다. 해시는 바꿀 때마다 솔트가 새로 붙는다)
 * - `oauth` — 그 공급자 연동이 아직 있는가 (재설정이 미인증 계정의 연동을 끊는다 — 선점한 사람을 내보내는 길)
 * - `sso` — 그 sub 가 아직 이 사람에게 이어져 있는가 (연결 해제 · 탈퇴가 끊는다)
 */
export type SignInProof =
  | { kind: 'password'; changedAtMs: number; hashFingerprint: string }
  | { kind: 'oauth'; provider: string }
  | { kind: 'sso'; sub: string };

/**
 * `login` 이 받는 확인 — 2FA 를 거쳤으면(`afterTwoFactor`) 거절 문구가 「로그인부터 다시」가 된다.
 * `null` 은 견줄 것이 없다는 뜻이고, 이 값을 싣기 전에 발급된 pre-auth 토큰(수명 5분)뿐이다. 그때도 탈퇴는 본다.
 * 일부러 선택 인자로 두지 않는다 — 빼먹으면 컴파일이 막아야 파생 프로젝트에서 틈이 조용히 돌아오지 않는다.
 */
export type LoginProof = SignInProof & { afterTwoFactor: boolean };

/** 비밀번호 해시의 지문 — pre-auth 토큰에 해시 자체를 싣지 않으려고 한 번 더 감싼다 */
export function passwordHashFingerprint(passwordHash: string): string {
  return hashToken(passwordHash);
}

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
    rememberMe: boolean,
    ipAddress: string | undefined,
    userAgent: string | undefined,
    oidcSid: string | undefined,
    proof: LoginProof | null,
  ) {
    this.logger.debug(
      `Logged in user is: ${userId}, rememberMe: ${rememberMe}`,
    );

    // SSO 로그인이면 sid 를 싣는다 — back-channel 로그아웃이 이 access token 도 다음 요청에서 막게(JwtStrategy).
    // 없으면 키 자체를 넣지 않는다
    const payload: JwtPayload = {
      sub: userId,
      ...(oidcSid ? { sid: oidcSid } : {}),
    };
    this.logger.debug(`SignInService.login: Signing JWT for userId=${userId}`);

    // Remember me에 따라 토큰 만료 기간 설정
    const expiryDays = rememberMe ? 30 : 7;
    const tokenExpiry = expiryDays * 24 * 60 * 60 * 1000; // 밀리초

    /*
      세션을 **사용자 행 잠금 아래 한 트랜잭션**에서 준다 — refresh 회전과 같은 자리.

      신원을 확인한 뒤(bcrypt · OAuth 콜백 · SSO, 잠금 밖) 토큰을 넣기 전에 비밀번호 변경 · 재설정 ·
      연동 해제 · 탈퇴가 끼어들면, 그쪽은 아직 없는 토큰을 지우지 못하고 이 로그인이 7~30일짜리
      refresh 토큰을 남긴다. 그래서 확인한 것이 지금도 그대로인지 잠금 아래에서 다시 읽어 견준다.
      바꾸는 쪽도 이 행을 잠근 채 커밋하므로, 다시 읽은 값은 늘 커밋된 최신 값이다.
    */
    const generatedRefreshToken = await this.prisma.$transaction(async (tx) => {
      await LockUsersCommand(tx, [userId]);
      await this.assertProofStillHolds(tx, userId, proof);

      await tx.user.update({
        where: { id: userId },
        data: { lastLoginAt: new Date() },
      });
      return this.generateRefreshToken(
        userId,
        expiryDays,
        ipAddress,
        userAgent,
        oidcSid,
        tx,
      );
    });
    return {
      accessToken: this.jwtService.sign(payload),
      refreshToken: generatedRefreshToken,
      tokenExpiry, // 쿠키 설정용
    };
  }

  /** 잠금 아래에서 — 탈퇴는 늘, 첫 요소는 실려 온 확인대로 다시 본다. 어긋나면 세션 없이 거절한다 */
  private async assertProofStillHolds(
    tx: Prisma.TransactionClient,
    userId: string,
    proof: LoginProof | null,
  ): Promise<void> {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { deletedAt: true, ssoSubject: true },
    });
    if (!user || user.deletedAt) {
      throw new UnauthorizedException('ACCOUNT_DELETED');
    }
    if (!proof) return;

    let holds: boolean;
    if (proof.kind === 'password') {
      const credential = await FindLocalCredentialByUserIdQuery(tx, userId);
      holds =
        !!credential?.passwordHash &&
        credential.passwordChangedAt.getTime() === proof.changedAtMs &&
        passwordHashFingerprint(credential.passwordHash) ===
          proof.hashFingerprint;
    } else if (proof.kind === 'oauth') {
      holds = !!(await tx.oAuthAccount.findFirst({
        where: { userId, provider: proof.provider },
        select: { id: true },
      }));
    } else {
      holds = user.ssoSubject === proof.sub;
    }
    if (holds) return;

    this.logger.warn(
      `Login rejected — ${proof.kind} changed after it was verified: user=${userId}`,
    );
    throw new UnauthorizedException(
      proof.afterTwoFactor
        ? 'Invalid or expired pre-auth token'
        : 'Invalid credentials',
    );
  }

  async generateRefreshToken(
    userId: string,
    expiryDays: number,
    ipAddress?: string,
    userAgent?: string,
    oidcSid?: string,
    prisma: PrismaClient | Prisma.TransactionClient = this.prisma,
  ) {
    const token = randomUUID();
    const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * expiryDays);

    await CreateRefreshTokenCommand(
      prisma,
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
      // 회전한 세션도 sid 를 이어 싣는다 — 새 refresh 행과 같은 sid 다
      accessToken: this.jwtService.sign({
        sub: stored.user.id,
        ...(stored.oidcSid ? { sid: stored.oidcSid } : {}),
      } satisfies JwtPayload),
      refreshToken: newRefreshToken,
      tokenExpiry: remainingMs,
    };
  }
}
