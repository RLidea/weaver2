import fs from 'fs';
import path from 'path';

const inputArg = process.argv[2];
const targetDir = path.resolve(__dirname, inputArg || '../libs/common/src');
const output = path.join(targetDir, 'index.ts');

if (!fs.existsSync(targetDir)) {
  console.error(`❌ Target directory does not exist: ${targetDir}`);
  process.exit(1);
}

const results: string[] = [];

function walkDir(dir: string, baseDir: string) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      walkDir(fullPath, baseDir);
    } else if (
      entry.isFile() &&
      entry.name.endsWith('.ts') &&
      entry.name !== 'index.ts' &&
      !entry.name.endsWith('.spec.ts')
    ) {
      let relativePath = path.relative(baseDir, fullPath).replace(/\.ts$/, '');
      relativePath = relativePath.split(path.sep).join('/');
      relativePath = './' + relativePath;

      results.push(`export * from '${relativePath}';`);
    }
  }
}

walkDir(targetDir, targetDir);

fs.writeFileSync(output, results.join('\n') + '\n');
console.log(`✅ Barrel file generated at ${output}`);
