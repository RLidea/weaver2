import { statSync } from 'fs';
import { Logger } from '@nestjs/common';

/** 그룹·기타 사용자의 읽기·쓰기·실행 비트 — 하나라도 서 있으면 소유자 밖으로 열린 것이다 */
const NON_OWNER_BITS = 0o077;

/**
 * .env 파일 권한 비트를 보고, 소유자 밖으로 열려 있으면 그 사실을 문장으로 돌려준다.
 * 닫혀 있으면 null.
 *
 * .env 를 서버에 두는 것 자체는 결함이 아니다 (12-factor 의 흔한 꼴). 결함은
 * **다른 계정이 읽을 수 있는 것**이다 — JWT_SECRET 하나면 아무 사용자로나 토큰을
 * 찍을 수 있고, TOTP_ENCRYPTION_KEY 면 2FA 비밀을 전부 푼다. git clone·cp 로 만든
 * 파일은 umask(보통 022) 를 따라 644 가 되므로 손으로 고치지 않으면 대개 열려 있다.
 */
export function describeEnvFileExposure(mode: number): string | null {
  const exposed = mode & NON_OWNER_BITS;
  if (exposed === 0) return null;
  const octal = (mode & 0o777).toString(8).padStart(3, '0');
  return `권한이 ${octal} 입니다 — 소유자 밖의 계정이 비밀값을 읽을 수 있습니다. chmod 600 으로 닫으세요`;
}

/**
 * 부팅 때 .env 권한을 재고, 열려 있으면 경고를 남긴다.
 *
 * - 파일이 없으면 조용히 넘어간다. Docker·pm2 ecosystem 처럼 env 를 프로세스에 직접
 *   주는 배포는 .env 를 쓰지 않는다.
 * - Windows 는 권한 비트가 ACL 을 반영하지 않으므로 재지 않는다.
 * - 거절하지 않고 경고만 한다. 개발 맥의 .env 도 대개 644 라, 부팅을 막으면 로컬부터
 *   서지 않는다. 서버는 scripts/setup.sh 가 600 으로 만든다.
 */
export function warnIfEnvFileExposed(path: string): void {
  if (process.platform === 'win32') return;
  let mode: number;
  try {
    mode = statSync(path).mode;
  } catch {
    return;
  }
  const problem = describeEnvFileExposure(mode);
  if (problem) new Logger('EnvFile').warn(`${path}: ${problem}`);
}
