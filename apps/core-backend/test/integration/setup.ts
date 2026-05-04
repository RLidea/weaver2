// 통합 테스트용 환경 설정
// DevThrottlerGuard가 development에서 스킵되므로 설정
(process.env as Record<string, string>)['NODE_ENV'] = 'development';
