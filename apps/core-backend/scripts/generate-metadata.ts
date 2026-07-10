/**
 * @nestjs/swagger CLI 플러그인의 정적 메타데이터(metadata.ts)를 생성한다.
 *
 * 플러그인은 원래 컴파일 타임 transformer라 nest build(webpack)에서만 적용되는데,
 * PluginMetadataGenerator가 TS Compiler API로 소스를 정적 분석해 같은 메타데이터를
 * 파일로 뽑아준다. 이 파일을 generate-openapi.ts가 loadPluginMetadata로 로드하면
 * @ApiProperty를 손으로 안 붙인 DTO도 스키마가 채워진다.
 *
 * ⚠️ ReadonlyVisitor 옵션은 nest-cli.json의 plugins[].options와 동기화 유지할 것.
 * 생성물 metadata.ts는 빌드 산출물이라 커밋하지 않는다(.gitignore).
 */
import { join } from 'path';
import { PluginMetadataGenerator } from '@nestjs/cli/lib/compiler/plugins/plugin-metadata-generator';
import { ReadonlyVisitor } from '@nestjs/swagger/dist/plugin';

const generator = new PluginMetadataGenerator();
generator.generate({
  visitors: [
    new ReadonlyVisitor({
      introspectComments: true,
      pathToSource: join(__dirname, '..', 'src'),
    }),
  ],
  outputDir: 'apps/core-backend/src',
  filename: 'metadata.ts',
  tsconfigPath: 'apps/core-backend/tsconfig.app.json',
  watch: false,
  printDiagnostics: false,
});
