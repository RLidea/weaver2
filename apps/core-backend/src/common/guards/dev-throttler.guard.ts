import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * 스로틀(무차별 대입 방어)을 개발·테스트에서만 끄기 위한 가드.
 *
 * 🔴 스킵 조건은 **명시 플래그 `THROTTLE_DISABLED=true` 하나뿐이다.**
 *
 * 예전엔 `NODE_ENV === 'development'` 면 스킵했는데, 그게 footgun 이었다:
 * `.env.example`(파생이 복사하는 배포 틀)이 `NODE_ENV=development` 를 담고,
 * `scripts/auto-deploy.sh`(PM2)는 NODE_ENV 를 안 세운다. 그래서 dotenv 가 .env 의
 * development 를 process.env 로 올리면, **프로덕션에서 스로틀이 조용히 꺼졌다.**
 * (docker-compose.prod 경로만 `NODE_ENV: production` 으로 우연히 덮여 안 샜다.)
 *
 * 보안 스위치는 「환경 이름」이 아니라 「명시 의도」에 묶는다. THROTTLE_DISABLED 를
 * 켜지 않는 한 — 어느 배포 경로든·어느 compose 파일이든·NODE_ENV 가 무엇이든 —
 * 스로틀은 켜진 채다. 끄려면 개발·테스트가 THROTTLE_DISABLED=true 를 명시한다.
 */
@Injectable()
export class DevThrottlerGuard extends ThrottlerGuard {
  canActivate(context: ExecutionContext): Promise<boolean> {
    if (process.env.THROTTLE_DISABLED === 'true') {
      return Promise.resolve(true);
    }
    return super.canActivate(context);
  }
}
