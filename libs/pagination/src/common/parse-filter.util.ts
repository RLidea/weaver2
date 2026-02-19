export function parseFilter(filter?: string): Record<string, string> {
  const result: Record<string, string> = {};
  if (!filter) return result;
  const parts = filter.split(',');
  for (const part of parts) {
    const [key, value] = part.split(':');
    if (key && value) result[key.trim()] = value.trim();
  }
  return result;
}
