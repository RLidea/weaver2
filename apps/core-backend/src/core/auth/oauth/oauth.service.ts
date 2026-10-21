import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  Optional,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '@weaver2/prisma';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { OAuthProviderRegistry } from './oauth-provider.registry';
import { FindUserByEmailQuery } from '../repositories/find-user-by-email.query';
import { FindOAuthAccountQuery } from '../repositories/find-oauth-account.query';
import { FindOAuthAccountsByUserIdQuery } from '../repositories/find-oauth-accounts-by-user-id.query';
import { CreateOAuthUserCommand } from '../repositories/create-oauth-user.command';
import { DeleteOAuthAccountCommand } from '../repositories/delete-oauth-account.command';
import {
  OAuthCallbackExtras,
  OAuthUserProfile,
} from './interfaces/oauth-provider.interface';
import { AuthProvidersResponseDto } from '../dto/auth-providers-response.dto';
import {
  AUTH_PROVIDER_EXTRAS,
  AuthProviderExtra,
} from './auth-provider-extras';
import { AUTH_MODE_CONFIG, AuthModeConfig } from '../auth-mode';
import {
  generateUniqueDisplayName,
  generateUniqueUsername,
} from '../utils/user-naming';

@Injectable()
export class OAuthService {
  private readonly logger = new Logger(OAuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly providerRegistry: OAuthProviderRegistry,
    @Optional()
    @Inject(AUTH_PROVIDER_EXTRAS)
    private readonly providerExtras: AuthProviderExtra[] = [],
    @Optional()
    @Inject(AUTH_MODE_CONFIG)
    private readonly authMode: AuthModeConfig = { mode: 'local' },
  ) {}

  getAuthorizationUrl(providerName: string): {
    url: string;
    state: string;
    usesFormPost: boolean;
  } {
    const provider = this.providerRegistry.get(providerName);
    const state = randomUUID();
    return {
      url: provider.getAuthorizationUrl(state),
      state,
      usesFormPost: provider.usesFormPost ?? false,
    };
  }

  /** 로그인 화면이 버튼을 서버 설정에 맞춰 그리도록, 켜진 로그인 수단을 알려 준다 */
  /** POST(form_post) 콜백을 받는 provider 인가 — 등록 안 된 provider 도 false */
  acceptsFormPost(providerName: string): boolean {
    return (
      this.providerRegistry.has(providerName) &&
      (this.providerRegistry.get(providerName).usesFormPost ?? false)
    );
  }

  getEnabledProviders(): AuthProvidersResponseDto &
    Record<string, boolean | string | undefined> {
    const extras: Record<string, boolean> = {};
    for (const extra of this.providerExtras) {
      try {
        Object.assign(extras, extra());
      } catch (error) {
        // 파생 프로젝트의 칸 하나가 깨져도 로그인 화면 전체가 버튼을 잃지 않게 한다
        this.logger.error(
          `AUTH_PROVIDER_EXTRAS entry failed: ${(error as Error).message}`,
        );
      }
    }
    // 파생 프로젝트의 칸은 더하기만 한다 — upstream 칸을 덮어쓰지 못하게 뒤에 펼친다.
    // sso 면 로컬 수단은 모두 닫혀 있다(@LocalAuthOnly) — 화면이 그 단추를 그리지 않게 false
    const sso = this.authMode.mode === 'sso';
    return {
      ...extras,
      sso,
      password: !sso,
      google: !sso && this.isProviderReady('google', 'GOOGLE_CLIENT_ID'),
      kakao: !sso && this.isProviderReady('kakao', 'KAKAO_CLIENT_ID'),
      naver: !sso && this.isProviderReady('naver', 'NAVER_CLIENT_ID'),
      apple: !sso && this.isProviderReady('apple', 'APPLE_CLIENT_ID'),
      ...(this.authMode.sso?.accountUrl
        ? { accountUrl: this.authMode.sso.accountUrl }
        : {}),
    };
  }

  /** 등록돼 있고 client id 까지 채워져 있어야 버튼을 눌러 끝까지 갈 수 있다 */
  private isProviderReady(name: string, clientIdKey: string): boolean {
    return (
      this.providerRegistry.has(name) &&
      !!this.configService.get<string>(clientIdKey)
    );
  }

  /**
   * 콜백을 확인하고(state·code 교환·프로필) 그 사람의 userId 와 공급자 쪽 계정 id 를 돌려준다. 세션은 주지 않는다 —
   * 탈퇴·정지·2FA·세션 발급은 비밀번호 로그인과 같은 SignInCompletionService 가 맡는다
   * (전에는 여기서 바로 세션을 줘, OAuth 로그인만 정지·2FA 를 건너뛰었다).
   * 실패하면 던진다. ConflictException 은 같은 이메일의 기존 계정이 있다는 뜻이다.
   */
  async resolveCallbackUser(
    providerName: string,
    code: string,
    callbackState: string,
    cookieState: string,
    extras?: OAuthCallbackExtras,
  ): Promise<{ userId: string; providerId: string }> {
    if (!cookieState || cookieState !== callbackState) {
      throw new UnauthorizedException(
        'OAuth state mismatch. Possible CSRF attack.',
      );
    }

    const provider = this.providerRegistry.get(providerName);
    const tokens = await provider.exchangeCodeForTokens(code);
    const profile = await provider.getUserProfile(tokens, extras);

    // 이메일은 남기지 않는다 — 로그는 오래 남고 여러 손을 거친다. 추적은 providerId 로 한다
    this.logger.debug(
      `OAuth profile: provider=${profile.provider}, providerId=${profile.providerId}`,
    );

    const { userId } = await this.findOrCreateUser(profile);
    // providerId 도 돌려준다 — 세션을 줄 때 「바로 이 공급자 계정」의 연동이 아직 있는지 잠금 아래에서 본다
    return { userId, providerId: profile.providerId };
  }

  async getMyConnections(userId: string) {
    return FindOAuthAccountsByUserIdQuery(this.prisma, userId);
  }

  async disconnectProvider(userId: string, provider: string): Promise<void> {
    const localCredential = await this.prisma.localCredential.findUnique({
      where: { userId },
    });

    // 비밀번호가 없는 OAuth 전용 계정인 경우 마지막 연동은 해제 불가
    if (!localCredential) {
      const connections = await FindOAuthAccountsByUserIdQuery(
        this.prisma,
        userId,
      );
      if (connections.length <= 1) {
        throw new BadRequestException(
          'Cannot disconnect the last OAuth provider. Set a password first.',
        );
      }
    }

    await DeleteOAuthAccountCommand(this.prisma, userId, provider);
  }

  /**
   * 공급자 토큰은 프로필을 받는 데만 쓰고 저장하지 않는다 — 그 뒤로 읽는 곳이 없고,
   * DB 가 새면 공급자 계정까지 위험해진다. 파생 프로젝트가 공급자 API 를 부를 일이 생기면
   * 그때 암호화해 저장하는 자리를 따로 낸다.
   */
  private async findOrCreateUser(
    profile: OAuthUserProfile,
  ): Promise<{ userId: string }> {
    // 1. 기존 OAuthAccount으로 조회
    const existing = await FindOAuthAccountQuery(
      this.prisma,
      profile.provider,
      profile.providerId,
    );
    if (existing) {
      // 탈퇴한 사람의 연동은 남아 있어도 로그인 길이 아니다
      if (existing.user.deletedAt) {
        throw new UnauthorizedException('ACCOUNT_DELETED');
      }
      return { userId: existing.userId };
    }

    // 신규 가입에는 이메일이 있어야 한다. Apple 은 첫 승인 뒤 email 을 빼고 보낼 수 있고,
    // 그 첫 승인 때만 오는 이름은 다시 받을 수 없으니 식별자를 남겨 추적할 수 있게 한다.
    if (!profile.email) {
      this.logger.warn(
        `OAuth sign-up without email: provider=${profile.provider}, providerId=${profile.providerId}`,
      );
      throw new UnauthorizedException(
        `${profile.provider} did not provide a verified email.`,
      );
    }

    // 공급자가 검증하지 않은 이메일로는 가입시키지 않는다(Apple 은 공급자에서 이미 비운다).
    // 받아 주면 남의 이메일을 주장하는 공급자 계정으로 그 주소의 계정을 선점할 수 있다 —
    // 진짜 주인은 가입이 막히고, 재설정으로 되찾아도 공격자의 연동이 남는다.
    if (!profile.emailVerified) {
      throw new UnauthorizedException(
        `${profile.provider} did not provide a verified email.`,
      );
    }

    // 2. 같은 이메일 사용자 존재 → 자동 연동을 차단한다.
    // 이메일을 검증하지 않는 OAuth provider 또는 임의 이메일을 청구할 수 있는
    // provider에 대해 자동 연동은 계정 탈취 위험. 사용자가 로그인 후 설정에서
    // 명시적으로 연동하도록 안내한다.
    const existingUser = await FindUserByEmailQuery(this.prisma, profile.email);
    if (existingUser) {
      throw new ConflictException(
        `이미 ${profile.email} 이메일로 가입된 계정이 있습니다. 로그인 후 설정에서 ${profile.provider} 계정을 연동해주세요.`,
      );
    }

    // 3. 신규 사용자 생성
    const username = await generateUniqueUsername(
      this.prisma,
      profile.provider,
      profile.providerId,
    );
    const displayName = await generateUniqueDisplayName(
      this.prisma,
      profile.displayName,
    );
    return CreateOAuthUserCommand(this.prisma, {
      username,
      displayName,
      email: profile.email,
      emailVerified: profile.emailVerified,
      provider: profile.provider,
      providerId: profile.providerId,
    });
  }
}
