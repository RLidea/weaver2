export function logSeedResult(
  entityName: string,
  identifier: string,
  status: 'created' | 'exists',
) {
  if (status === 'created') {
    console.log(`✅ ${entityName} '${identifier}' created!`);
  } else if (status === 'exists') {
    console.warn(`⚠️ ${entityName} '${identifier}' already exists.`);
  }
}
