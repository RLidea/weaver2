import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@weaver2/prisma';

export interface AttachableFile {
  id: string;
  mimeType: string;
}

/**
 * 붙이려는 파일들을 잠그고 「이 사람이 올렸고, 안 지웠고, 안 가렸고, 아무 데도 안 붙었다」를 확인한다
 * (파일 접근 통제 설계 §3 「파일의 주인은 하나」). 트랜잭션 안에서 불러야 한다 — 잠금은
 * 트랜잭션이 끝날 때 풀리고, 그 사이 같은 파일을 붙이려는 다른 요청은 기다렸다가 「이미 붙음」을 본다.
 *
 * 「아무 데도」는 본체가 아는 붙음(게시글 첨부·프로필)이다. 파생 프로젝트는 자기 첨부도
 * 같은 잠금 뒤에 확인한다.
 */
export async function LockAttachableFilesCommand(
  tx: Prisma.TransactionClient,
  fileIds: string[],
  userId: string,
): Promise<AttachableFile[]> {
  if (fileIds.length === 0) return [];
  if (new Set(fileIds).size !== fileIds.length) {
    throw new BadRequestException('같은 파일을 두 번 붙일 수 없습니다.');
  }

  // 잠금과 확인을 한 문장에 넣으면 안 된다. READ COMMITTED 에서 그 문장의 스냅샷은 잠금을 기다리기
  // 전에 잡혀, 먼저 붙인 쪽이 커밋한 post_attachments·users 행을 못 본다(files 행은 그대로라 재확인도
  // 안 한다) — 같은 파일이 두 곳에 「성공」으로 붙는다. 잠근 뒤 새 문장으로 본다.
  await tx.$queryRaw`
    SELECT id FROM files WHERE id IN (${Prisma.join(fileIds)}) ORDER BY id FOR UPDATE`;

  const rows = await tx.$queryRaw<
    {
      id: string;
      mimeType: string;
      uploadedById: string | null;
      hiddenAt: Date | null;
      deletedAt: Date | null;
      attached: boolean;
    }[]
  >`
    SELECT f.id, f."mimeType", f."uploadedById", f."hiddenAt", f."deletedAt",
           (EXISTS (SELECT 1 FROM post_attachments a WHERE a."fileId" = f.id)
            OR EXISTS (SELECT 1 FROM users u WHERE u."profileImageFileId" = f.id)) AS attached
      FROM files f
     WHERE f.id IN (${Prisma.join(fileIds)})`;

  const byId = new Map(rows.map((r) => [r.id, r]));
  for (const id of fileIds) {
    const row = byId.get(id);
    // 가린 파일(신고 처리)은 새로 붙이지 않는다 — 다른 글로 옮겨 다시 내보내는 길이 된다
    if (!row || row.deletedAt || row.hiddenAt || row.uploadedById !== userId) {
      throw new BadRequestException(`붙일 수 없는 파일입니다: ${id}`);
    }
    if (row.attached) {
      throw new BadRequestException(`이미 다른 곳에 붙은 파일입니다: ${id}`);
    }
  }
  return fileIds.map((id) => {
    const row = byId.get(id)!;
    return { id: row.id, mimeType: row.mimeType };
  });
}
