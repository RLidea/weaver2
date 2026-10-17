/**
 * 백엔드가 읽는 .env 경로 (작업 디렉터리 = 저장소 루트 기준).
 * ConfigModule 이 읽는 곳과 부팅 권한 검사가 재는 곳이 어긋나지 않게 한 군데에 둔다.
 */
export const CORE_ENV_FILE_PATH = 'apps/core-backend/.env';
