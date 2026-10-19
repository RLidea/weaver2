/**
 * e2e · 로컬 개발용 가짜 OIDC 발급자 — `tsx scripts/fake-oidc-issuer.ts [--port 4280]`.
 *
 * Jest 의 가짜 발급자(`apps/core-backend/test/helpers/fake-oidc-issuer.ts`)를 정해진 포트에 띄운다.
 * authorize 는 이메일 칸 하나짜리 폼(+ 「email_verified 끄기」)이고, sub 는 이메일에서 늘 같게
 * 뽑는다(같은 이메일 = 같은 사람). end_session 은 묻지 않고 `post_logout_redirect_uri?state=` 로 302.
 * `POST /oidc/test/backchannel-logout`(폼 `email` 또는 `sub`, 고를 수 있는 `sid`)은 그 사람의 마지막 sid 로
 * 서명한 logout_token 을 백엔드의 back-channel 주소(`--backchannel-uri`, 기본
 * `http://localhost:<API 포트>/v1/auth/oidc/backchannel-logout`)로 보낸다.
 *
 * 포트는 백엔드 포트에서 뽑는다 — `4280 + (API 포트 − 4000)`: 런타임 레인(4000) 4280, 격리 레인
 * (4010~4019) 4290~4299. 4100 은 로컬 accounts 몫이다. 4180 대역은 쓰지 않는다 — 4190 이 Fetch
 * 표준의 bad port 라 백엔드의 fetch 가 닿지 못한다. 백엔드에는 이렇게 넘긴다:
 *
 *   AUTH_MODE=sso
 *   ACCOUNTS_OIDC_ISSUER=http://127.0.0.1:<port>/oidc
 *   ACCOUNTS_OIDC_CLIENT_ID=local
 *   ACCOUNTS_OIDC_CLIENT_SECRET=local
 */
import { FakeOidcIssuer } from '../apps/core-backend/test/helpers/fake-oidc-issuer';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  // --port 만 받으면 API 포트는 같은 셈을 거꾸로 — lane:e2e 는 --port 만 넘긴다
  const apiPort = Number(
    arg('api-port') ?? (arg('port') ? Number(arg('port')) - 280 : 4000),
  );
  const port = Number(arg('port') ?? 4280 + (apiPort - 4000));
  const issuer = new FakeOidcIssuer({
    clientId: arg('client-id') ?? 'local',
    clientSecret: arg('client-secret') ?? 'local',
    backchannelLogoutUri:
      arg('backchannel-uri') ??
      `http://localhost:${apiPort}/v1/auth/oidc/backchannel-logout`,
  });
  await issuer.start(port);
  console.log(`fake OIDC issuer ${issuer.issuer} (client local/local)`);

  const stop = () => {
    void issuer.stop().then(() => process.exit(0));
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
