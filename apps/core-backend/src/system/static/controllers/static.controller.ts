import { Controller, Get, Res, Param, NotFoundException } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Response } from 'express';
import { Public } from '@weaver2/common/decorator/public.decorator';
import { join, resolve, sep } from 'path';

// 이 컨트롤러는 @Public() 이라 인증이 없다. 그래서 사용자가 준 경로 조각(:type·:file·
// :component)이 그대로 파일 경로가 되면, 인증 없는 임의 파일 읽기가 된다.
//
// 실제로 그랬다 (2026-09-15 실측, Express 5.2.1):
//   GET /static/shared/styles/..%2f..%2f..%2f..%2f..%2f..%2fpackage.json
//   → 200, 저장소 루트 package.json 이 그대로 나왔다.
// `..%2f` 는 라우팅 단계에서는 한 세그먼트로 매칭되고, Express 가 파라미터를
// 디코드하면서 `../` 로 풀린다. join 이 그걸 정규화해 base 밖으로 나가고,
// res.sendFile 은 root 옵션이 없으면 절대경로를 그대로 낸다.
//
// 고치는 방식은 blocklist(`..` 문자열 금지)가 아니다 — 인코딩 변종(%2e·이중인코딩
// 등)에 샌다. 대신 최종 경로를 resolve 로 완전히 푼 뒤, 의도한 base 디렉토리 안에
// 있는지 검사한다(containment). 밖이면 파일이 있든 없든 404 로 막는다.
//
// 각 base 디렉토리를 절대경로로 미리 굳혀 둔다.
const ASSET_ROOT = resolve(process.cwd(), 'apps/core-backend/src/assets');
const BASE_SHARED = join(ASSET_ROOT, 'shared');
const BASE_SHARED_COMPONENTS = join(ASSET_ROOT, 'shared/components');
const BASE_ADMIN = join(ASSET_ROOT, 'admin');

// base 아래로 한정해 안전한 절대경로를 만든다. 벗어나면 NotFoundException.
// (base 밖임을 「경로 순회 감지」로 알리지 않는다 — 존재 여부를 흘리지 않기 위해
//  일반 404 로 통일한다.)
function safeAssetPath(base: string, ...segments: string[]): string {
  const candidate = resolve(base, ...segments);
  // base 자신과, base 로 시작하되 그 아래(구분자 포함)인 경로만 허용한다.
  if (candidate !== base && !candidate.startsWith(base + sep)) {
    throw new NotFoundException();
  }
  return candidate;
}

function setStaticContentType(res: Response, file: string): void {
  if (file.endsWith('.css')) {
    res.setHeader('Content-Type', 'text/css');
  } else if (file.endsWith('.js')) {
    res.setHeader('Content-Type', 'application/javascript');
  }
}

@ApiExcludeController()
@Controller('static')
@Public()
export class StaticController {
  @Get('/shared/:type/:file')
  serveSharedFiles(
    @Param('type') type: string,
    @Param('file') file: string,
    @Res() res: Response,
  ) {
    const filePath = safeAssetPath(BASE_SHARED, type, file);
    setStaticContentType(res, file);
    return res.sendFile(filePath);
  }

  @Get('/shared/components/:component/:file')
  serveComponentFiles(
    @Param('component') component: string,
    @Param('file') file: string,
    @Res() res: Response,
  ) {
    const filePath = safeAssetPath(BASE_SHARED_COMPONENTS, component, file);
    setStaticContentType(res, file);
    return res.sendFile(filePath);
  }

  @Get('/admin/:type/:file')
  serveAdminAssets(
    @Param('type') type: string,
    @Param('file') file: string,
    @Res() res: Response,
  ) {
    const filePath = safeAssetPath(BASE_ADMIN, type, file);
    setStaticContentType(res, file);
    return res.sendFile(filePath);
  }
}
