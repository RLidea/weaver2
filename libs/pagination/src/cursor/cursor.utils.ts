export type CursorPayload = Record<string, string | number | Date>;

export function encodeCursor(payload: CursorPayload): string {
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

export function decodeCursor<T extends CursorPayload>(cursor: string): T {
  try {
    const json = Buffer.from(cursor, 'base64url').toString('utf-8');
    return JSON.parse(json) as T;
  } catch {
    throw new Error('Invalid cursor format');
  }
}
