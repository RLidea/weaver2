import { resolve } from 'path';
import { extractManifest } from './extract-manifest';

// 이 파일: libs/module-registry/src → repo root 는 ../../..
const ROOT = resolve(__dirname, '../../..');

describe('extractManifest(board)', () => {
  const m = extractManifest('board', ROOT);

  it('extracts dependsOn ids including auth (which the hand-written manifest missed)', () => {
    expect(m.dependsOn.map((d) => d.id).sort()).toEqual([
      'auth',
      'notification',
      'permission',
      'upload',
    ]);
  });

  it('marks notification as soft (DTO-only import) and permission/auth/upload as hard', () => {
    const kind = (id: string) => m.dependsOn.find((d) => d.id === id)?.kind;
    expect(kind('permission')).toBe('hard');
    expect(kind('auth')).toBe('hard');
    expect(kind('upload')).toBe('hard');
    expect(kind('notification')).toBe('soft');
  });

  it('extracts footprint backendDir/prismaSchema/prismaModels/permissions', () => {
    expect(m.footprint.backendDir).toBe('apps/core-backend/src/features/board');
    expect(m.footprint.prismaSchema).toBe('apps/core-backend/prisma/schema/board.prisma');
    expect(m.footprint.prismaModels?.sort()).toEqual([
      'Board',
      'Comment',
      'Emoji',
      'Post',
      'PostCategory',
      'PostFile',
      'PostReaction',
    ]);
    expect(m.footprint.permissions).toBe('PERMISSIONS.BOARD');
  });
});
