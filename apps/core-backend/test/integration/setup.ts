// 통합 테스트용 환경 설정.
// 통합시험은 로그인·회원가입을 여러 번 쏘므로(계정 잠금 등 검증), 스로틀이 켜지면
// 시험끼리 429 로 막힌다. 그래서 명시 플래그로 끈다.
//   ⚠ DevThrottlerGuard 는 이제 NODE_ENV 가 아니라 THROTTLE_DISABLED 로만 스킵한다
//     (프로덕션 스로틀이 NODE_ENV=development 로 조용히 꺼지던 것을 막기 위함).
const env = process.env as Record<string, string | undefined>;
env.THROTTLE_DISABLED = 'true';
// NODE_ENV 는 다른 코드가 참조할 수 있어 기존대로 둔다(스로틀과는 이제 무관).
env.NODE_ENV = 'development';
