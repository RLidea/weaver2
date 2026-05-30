import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { Project } from 'ts-morph';
import { resolveModuleId } from './known-modules';

export interface ExtractedManifest {
  id: string;
  dependsOn: { id: string; kind: 'hard' | 'soft' }[];
  footprint: {
    backendDir: string;
    prismaSchema?: string;
    prismaModels?: string[];
    permissions?: string;
  };
}

/** dto/event 경로는 데이터 계약(soft)로 본다. */
function isContractPath(importPath: string): boolean {
  return /\/dto\//.test(importPath) || /-event/.test(importPath);
}

/**
 * feature 디렉토리의 import를 정적분석해 매니페스트의 자동 추출 가능 필드를 뽑는다.
 * @param featureId  features/<featureId> 디렉토리명
 * @param rootDir    모노레포 루트 (기본: cwd)
 */
export function extractManifest(featureId: string, rootDir: string = process.cwd()): ExtractedManifest {
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

    for (const imp of sourceFile.getImportDeclarations()) {
      const spec = imp.getModuleSpecifierValue();

      // 같은 feature 내부 상대경로(상위로 안 나감)는 무시.
      if (spec.startsWith('./') && !spec.startsWith('../')) continue;

      const id = resolveModuleId(spec);
      if (!id) continue;

      const valueImport = !imp.isTypeOnly();
      const kind: 'hard' | 'soft' = valueImport && !isContractPath(spec) ? 'hard' : 'soft';

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

  const permRe = /PERMISSIONS\.([A-Z_]+)/;
  for (const text of sourceTexts) {
    const permMatch = permRe.exec(text);
    if (permMatch) {
      footprint.permissions = `PERMISSIONS.${permMatch[1]}`;
      break;
    }
  }

  return { id: featureId, dependsOn, footprint };
}
