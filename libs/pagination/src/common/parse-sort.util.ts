export function parseSort(sort?: string): Record<string, 'asc' | 'desc'> {
  const result: Record<string, 'asc' | 'desc'> = {};
  if (!sort) return result;
  const parts = sort.split(',');
  for (const part of parts) {
    const [field, order] = part.split(':');
    if (field)
      result[field.trim()] = (order?.trim() as 'asc' | 'desc') || 'asc';
  }
  return result;
}
