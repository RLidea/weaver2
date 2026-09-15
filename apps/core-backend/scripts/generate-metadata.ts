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

// 런타임 경로와 타입 경로가 갈려 있다. 한 줄로 못 합친다.
//
// @nestjs/swagger 11.4 부터 package.json 에 exports 맵이 생겨, Node 가 내부 경로
// `dist/plugin` 을 막는다 (ERR_PACKAGE_PATH_NOT_EXPORTED). 공개 경로는 `/plugin` 이다.
// 그런데 이 저장소는 module: "commonjs" 에 moduleResolution 을 안 적어서 TS 가
// node10 방식으로 푸는데, 그 방식은 exports 맵을 안 읽고 `plugin.d.ts` 를 찾는다.
// 패키지에는 `plugin.js` 만 있고 `plugin.d.ts` 는 없다 — 그래서 타입은 dist 에서,
// 값은 공개 경로에서 가져온다. (`import type` 은 컴파일 때 지워지므로 런타임엔 안 닿는다)
//
// ⚠ 이걸 안 고치면 시험도 빌드도 다 통과하는데 `pnpm openapi:types` 만 죽는다.
//   즉 CI 의 openapi-types 잡(ci.yml)에서 처음 만난다.
//
// 한 줄로 합칠 수 있는 때: tsconfig 의 moduleResolution 을 node16/nodenext/bundler 로
// 올리면 된다. 저장소 전역에 영향이 가므로 별건으로 다룬다.
import type { ReadonlyVisitor as ReadonlyVisitorCtor } from '@nestjs/swagger/dist/plugin';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { ReadonlyVisitor } = require('@nestjs/swagger/plugin') as {
  ReadonlyVisitor: typeof ReadonlyVisitorCtor;
};

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
