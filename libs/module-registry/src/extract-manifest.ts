import { existsSync, readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { Project } from 'ts-morph';
import { resolveModuleId } from './known-modules';

export interface ExtractedManifest {
  id: string;
  dependsOn: { id: string; kind: 'hard' | 'soft' }[];
  footprint: {
    backendDir: string;
    prismaSchema?: string;
    prismaModels?: string[];
    permissions?: string[];
  };
}

/** dto/event 경로는 데이터 계약(soft)로 본다. */
function isContractPath(importPath: string): boolean {
  return /\/dto\//.test(importPath) || /-event/.test(importPath);
}

/**
 * 상대경로 import의 대상 파일 경로에서 `/features/<id>/` 패턴의 feature id를 뽑는다.
 * features 디렉토리 밖(core/upload/...)이거나 패턴이 없으면 null.
 */
function resolveFeatureId(
  fromFile: string,
  moduleSpecifier: string,
): string | null {
  const targetPath = resolve(dirname(fromFile), moduleSpecifier);
  const match = /\/features\/([^/]+)\//.exec(targetPath);
  return match ? match[1] : null;
}

/**
 * feature 디렉토리의 import를 정적분석해 매니페스트의 자동 추출 가능 필드를 뽑는다.
 * @param featureId  features/<featureId> 디렉토리명
 * @param rootDir    모노레포 루트 (기본: cwd)
 */
export function extractManifest(
  featureId: string,
  rootDir: string = process.cwd(),
): ExtractedManifest {
  const backendDir = `apps/core-backend/src/features/${featureId}`;
  const absFeatureDir = resolve(rootDir, backendDir);

  const project = new Project({
    useInMemoryFileSystem: false,
    skipAddingFilesFromTsConfig: true,
    compilerOptions: { allowJs: false },
  });
  project.addSourceFilesAtPaths([
    `${absFeatureDir}/**/*.ts`,
    `!${absFeatureDir}/**/*.spec.ts`,
    `!${absFeatureDir}/**/*.feature.ts`,
  ]);

  // 모듈 id별 kind 누적: 하나라도 hard면 hard.
  const kindById = new Map<string, 'hard' | 'soft'>();
  const sourceTexts: string[] = [];

  for (const sourceFile of project.getSourceFiles()) {
    sourceTexts.push(sourceFile.getFullText());

    const filePath = sourceFile.getFilePath();

    for (const imp of sourceFile.getImportDeclarations()) {
      const spec = imp.getModuleSpecifierValue();

      // 의존 id 판정: known core/lib 모듈(known-modules) 우선,
      // 아니면 상대경로의 실제 대상 파일에서 /features/<id>/ 추출(다른 feature면 의존).
      let id = resolveModuleId(spec);
      if (!id && spec.startsWith('.')) {
        const depFeatureId = resolveFeatureId(filePath, spec);
        // 추출 대상 feature 자신은 제외 — 다른 feature만 의존으로 잡는다.
        if (depFeatureId && depFeatureId !== featureId) id = depFeatureId;
      }
      if (!id) continue;

      // kind 휴리스틱: 값 import이고 dto/event 경로가 아니면 hard, 아니면 soft.
      // 이 휴리스틱은 dto/event 경로 컨벤션에 의존한다. 같은 모듈에서 service와 dto를
      // 함께 import하면 hard로 머지되어 이벤트성(soft) 의존이 hard로 뒤집힐 수 있다.
      // `-event` 부분일치는 과대매칭 가능. 확신은 사람이 한다(verify는 kind를 warn으로만 처리).
      const valueImport = !imp.isTypeOnly();
      const kind: 'hard' | 'soft' =
        valueImport && !isContractPath(spec) ? 'hard' : 'soft';

      const prev = kindById.get(id);
      if (prev === 'hard' || kind === 'hard') {
        kindById.set(id, 'hard');
      } else {
        kindById.set(id, prev ?? kind);
      }
    }
  }

  const dependsOn = [...kindById.entries()]
    .map(([id, kind]) => ({ id, kind }))
    .sort((a, b) => a.id.localeCompare(b.id));

  const footprint: ExtractedManifest['footprint'] = { backendDir };

  const prismaSchemaRel = `apps/core-backend/prisma/schema/${featureId}.prisma`;
  const prismaSchemaAbs = resolve(rootDir, prismaSchemaRel);
  if (existsSync(prismaSchemaAbs)) {
    footprint.prismaSchema = prismaSchemaRel;
    const schemaText = readFileSync(prismaSchemaAbs, 'utf8');
    const models: string[] = [];
    const modelRe = /^model\s+(\w+)\s*\{/gm;
    let match: RegExpExecArray | null;
    while ((match = modelRe.exec(schemaText)) !== null) {
      models.push(match[1]);
    }
    if (models.length > 0) footprint.prismaModels = models;
  }

  // PERMISSIONS.<X> 를 전 파일에서 모두 수집 → dedupe → 정렬 (glob 순서 비의존).
  const permRe = /PERMISSIONS\.([A-Z_]+)/g;
  const perms = new Set<string>();
  for (const text of sourceTexts) {
    let permMatch: RegExpExecArray | null;
    while ((permMatch = permRe.exec(text)) !== null) {
      perms.add(`PERMISSIONS.${permMatch[1]}`);
    }
  }
  if (perms.size > 0) footprint.permissions = [...perms].sort();

  return { id: featureId, dependsOn, footprint };
}
