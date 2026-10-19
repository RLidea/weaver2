import { INestApplication, RequestMethod } from '@nestjs/common';
import { ModulesContainer } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '@weaver2/common/decorator/public.decorator';
import { PERMISSIONS_KEY } from '../../../src/core/permission/decorators/require-permission.decorator';

// 경로 변수 자리. 가드는 파이프(검증)보다 먼저 돌므로 값의 형식은 결과에 영향이 없다.
const PARAM_PLACEHOLDER = '00000000-0000-4000-8000-000000000000';
// @nestjs/common/constants 의 값. 그 서브경로를 import 하면 jest 가 @nestjs/common 을
// 한 벌 더 올려 DI 가 깨지므로(주입이 undefined) 값을 옮겨 적는다.
const PATH_METADATA = 'path';
const METHOD_METADATA = 'method';
const VERSION_METADATA = '__version__';

export interface Route {
  method: string;
  path: string;
  isPublic: boolean;
  permissions: string[] | undefined;
}

function joinPath(...parts: (string | undefined)[]): string {
  const joined = parts
    .filter((p): p is string => !!p)
    .map((p) => p.replace(/^\/+|\/+$/g, ''))
    .filter(Boolean)
    .join('/');
  return `/${joined}`.replace(/:[A-Za-z0-9_]+/g, PARAM_PLACEHOLDER);
}

function firstVersion(value: unknown): string | undefined {
  const v = Array.isArray(value) ? (value as unknown[])[0] : value;
  return typeof v === 'string' ? v : undefined;
}

/** 앱에 등록된 모든 라우트를 메타데이터에서 모은다 — 가드와 같은 우선순위로 공개 · 권한을 읽는다 */
export function collectRoutes(app: INestApplication): Route[] {
  const routes: Route[] = [];
  const modules = app.get(ModulesContainer);
  for (const moduleRef of modules.values()) {
    for (const wrapper of moduleRef.controllers.values()) {
      const controller = wrapper.metatype as
        (new (...args: unknown[]) => unknown) | undefined;
      if (!controller) continue;
      const ctrlPaths = ([] as string[]).concat(
        (Reflect.getMetadata(PATH_METADATA, controller) as string | string[]) ??
          '',
      );
      const ctrlVersion = firstVersion(
        Reflect.getMetadata(VERSION_METADATA, controller),
      );
      const ctrlPublic = Reflect.getMetadata(IS_PUBLIC_KEY, controller) as
        boolean | undefined;
      const ctrlPerms = Reflect.getMetadata(PERMISSIONS_KEY, controller) as
        string[] | undefined;

      const proto = controller.prototype as Record<string, unknown>;
      for (const name of Object.getOwnPropertyNames(proto)) {
        if (name === 'constructor') continue;
        // 디스크립터로 읽는다 — proto[name] 은 getter 를 인스턴스 없이 실행해 버린다
        const handler = Object.getOwnPropertyDescriptor(proto, name)
          ?.value as unknown;
        if (typeof handler !== 'function') continue;
        const methodPath = Reflect.getMetadata(PATH_METADATA, handler) as
          string | string[] | undefined;
        if (methodPath === undefined) continue;
        const method = Reflect.getMetadata(METHOD_METADATA, handler) as
          RequestMethod | undefined;
        if (method === undefined) continue;
        const version =
          firstVersion(Reflect.getMetadata(VERSION_METADATA, handler)) ??
          ctrlVersion;
        const handlerPublic = Reflect.getMetadata(IS_PUBLIC_KEY, handler) as
          boolean | undefined;
        const handlerPerms = Reflect.getMetadata(PERMISSIONS_KEY, handler) as
          string[] | undefined;

        for (const ctrlPath of ctrlPaths) {
          for (const mPath of ([] as string[]).concat(methodPath)) {
            routes.push({
              method: RequestMethod[method].toLowerCase(),
              path: joinPath(
                version ? `v${version}` : undefined,
                ctrlPath,
                mPath,
              ),
              // 가드와 같은 우선순위 — 핸들러가 클래스를 덮는다 (getAllAndOverride)
              isPublic: (handlerPublic ?? ctrlPublic) === true,
              permissions: handlerPerms ?? ctrlPerms,
            });
          }
        }
      }
    }
  }
  return routes;
}
