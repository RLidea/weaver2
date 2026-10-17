/**
 * .env 권한 경고 회귀 시험 — 소유자 밖으로 열린 비트를 하나도 놓치지 않는지 못박는다.
 */
import { describeEnvFileExposure } from './env-file-permission';

const REGULAR_FILE = 0o100000;

describe('describeEnvFileExposure', () => {
  // 제목에 8진수로 보이게 [표기, 값] 쌍으로 넘긴다 (jest 의 %o 는 8진수가 아니다)
  const octal = (perms: number[]) =>
    perms.map((perm) => [perm.toString(8), perm] as const);

  it.each(octal([0o600, 0o400, 0o700]))('%s 는 닫혀 있다', (_, perm) => {
    expect(describeEnvFileExposure(REGULAR_FILE | perm)).toBeNull();
  });

  it.each(octal([0o644, 0o640, 0o604, 0o660, 0o606, 0o610, 0o601]))(
    '%s 는 열려 있다',
    (_, perm) => {
      const problem = describeEnvFileExposure(REGULAR_FILE | perm);
      expect(problem).toContain(perm.toString(8));
      expect(problem).toContain('chmod 600');
    },
  );
});
