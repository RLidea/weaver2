export function logSeedResult(
  entityName: string,
  identifier: string,
  status: 'created' | 'exists' | 'skipped',
  reason?: string,
) {
  if (status === 'created') {
    console.log(`✅ ${entityName} '${identifier}' created!`);
  } else if (status === 'exists') {
    console.warn(`⚠️ ${entityName} '${identifier}' already exists.`);
  } else if (status === 'skipped') {
    console.warn(`⏭️ ${entityName} '${identifier}' skipped${reason ? ` (${reason})` : ''}.`);
  }
}
