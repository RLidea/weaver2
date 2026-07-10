/**
 * OpenAPI(Swagger) 스펙을 빌드 타임에 JSON 파일로 추출한다.
 *
 * preview 모드로 부팅하므로 프로바이더가 인스턴스화되지 않아 DB·외부 연결 없이
 * 컨트롤러 메타데이터만으로 스펙을 만든다. 런타임 /docs와 동일한 buildSwaggerConfig를 공유한다.
 *
 * 실행: pnpm openapi:generate  →  apps/core-backend/openapi.json
 * 이 JSON을 openapi-typescript가 읽어 프론트 타입(api-schema.d.ts)을 생성한다.
 */
import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { CoreModule } from '../src/core.module';
import { buildSwaggerConfig } from '@weaver2/common/global/nest.config';
// generate-metadata.ts가 먼저 생성한 CLI 플러그인 정적 메타데이터
// (openapi:generate 스크립트가 metadata 생성을 선행한다)
import metadata from '../src/metadata';

async function generate(): Promise<void> {
  const app = await NestFactory.create(CoreModule, {
    preview: true, // 프로바이더 미인스턴스화 → DB 없이 라우트 메타데이터만 수집
    logger: false,
  });

  // @ApiProperty를 손으로 안 붙인 DTO도 스키마가 채워지도록 플러그인 메타데이터 로드
  await SwaggerModule.loadPluginMetadata(metadata);
  const document = SwaggerModule.createDocument(app, buildSwaggerConfig());

  const outPath = join(process.cwd(), 'apps/core-backend/openapi.json');
  writeFileSync(outPath, `${JSON.stringify(document, null, 2)}\n`);

  await app.close();
  const pathCount = Object.keys(document.paths ?? {}).length;
  const schemaCount = Object.keys(document.components?.schemas ?? {}).length;
  console.log(
    `OpenAPI spec written to ${outPath} (${pathCount} paths, ${schemaCount} schemas)`,
  );
}

generate().catch((err) => {
  console.error('Failed to generate OpenAPI spec:', err);
  process.exit(1);
});
