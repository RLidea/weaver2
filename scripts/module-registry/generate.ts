/**
 * 새 모듈의 매니페스트 초안 생성 보조.
 *
 *   pnpm manifest:gen <featureId>
 *
 * features/<featureId> 디렉토리의 import를 정적분석해 자동 추출 가능한 필드
 * (known 의존 + footprint)를 JSON으로 출력한다. 사람이 이 결과를 보고
 * <featureId>.feature.ts 에 features 간 의존·reason·removalNotes 등 비추출
 * 영역을 더해 매니페스트를 완성한다.
 */
import { extractManifest } from '@weaver2/module-registry';

const featureId = process.argv[2];

if (!featureId) {
  // eslint-disable-next-line no-console
  console.error('usage: pnpm manifest:gen <featureId>');
  process.exit(1);
}

const extracted = extractManifest(featureId, process.cwd());

// eslint-disable-next-line no-console
console.log(JSON.stringify(extracted, null, 2));
