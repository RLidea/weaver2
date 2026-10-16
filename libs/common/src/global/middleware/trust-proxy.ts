import { INestApplication } from '@nestjs/common';
import type { Express } from 'express';

/**
 * Express `trust proxy` 에 넘길 값. (express 가 받는 꼴 중 env 로 적을 수 있는 것만)
 */
export type TrustProxyValue = boolean | number | string[];

/**
 * `TRUST_PROXY` env 를 Express 의 `trust proxy` 값으로 바꾼다.
 *
 * - 미설정·빈 값 → `['loopback']` (같은 호스트의 프록시만 믿는다)
 * - `true` / `false` → 불리언 (`true` 는 XFF 를 통째로 믿는다 — 위조 가능)
 * - 숫자 → 믿을 홉 수
 * - 그 밖 → 쉼표 목록 (`loopback`, `10.0.0.0/8`, `uniquelocal` 등). 틀린 주소는
 *   express 가 `app.set` 시점에 던지므로 부팅에서 바로 드러난다.
 *
 * 🔴 NODE_ENV 에 묶지 않는다. .env.example 이 development 를 배포 틀로 내보내는
 *    전례가 있어, 환경 이름에 보안 동작을 걸면 프로덕션에서 조용히 바뀐다.
 */
export function parseTrustProxy(raw: string | undefined): TrustProxyValue {
  const value = raw?.trim() ?? '';
  if (value === '') return ['loopback'];
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (/^\d+$/.test(value)) return Number(value);
  return value
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part !== '');
}

/**
 * 앞단 프록시(Next.js rewrite·nginx)가 붙인 X-Forwarded-For 로 req.ip 를 되살린다.
 *
 * 이게 없으면 프록시 뒤에서 req.ip 가 늘 127.0.0.1 이라, 스로틀 버킷이 사이트 전체에
 * 하나로 뭉쳐(한 사람이 로그인 한도를 다 쓰면 모두가 막힌다) 로그인 IP 기록도 틀린다.
 * 스로틀 가드(getTracker)·CSRF 세션 식별·요청 로그가 모두 req.ip 를 읽으므로
 * 다른 미들웨어보다 먼저 세운다.
 *
 * ⚠️ Next.js rewrite 는 X-Forwarded-For 가 **없을 때만** 소켓 주소로 채우고, 있으면
 *    클라이언트가 보낸 값을 그대로 넘긴다. 그래서 Next 를 인터넷에 바로 노출하면
 *    loopback 신뢰로도 IP 를 위조할 수 있다 — Next 앞에 XFF 를 `$remote_addr` 로
 *    덮어쓰는 nginx 를 두는 것이 전제다 (scripts/setup.sh 주석 참고).
 */
export function setTrustProxy(app: INestApplication): void {
  const instance = app.getHttpAdapter().getInstance() as Express;
  instance.set('trust proxy', parseTrustProxy(process.env.TRUST_PROXY));
}
