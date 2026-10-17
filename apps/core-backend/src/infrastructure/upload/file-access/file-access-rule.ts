import { CommonAuthUserDto } from '@weaver2/common';

/**
 * 붙은 쪽이 내는 파일 읽기 답.
 * - `public`: 비로그인도 본다(캐시해도 된다)
 * - `allow`: 이 사람은 본다
 * - `deny`: 못 본다
 * - `null`: 이 파일은 내 것이 아니다 — 다음 규칙으로
 */
export type FileAccessVerdict = 'public' | 'allow' | 'deny';

/**
 * 파일 읽기 정책은 붙은 쪽이 낸다 (파일 접근 통제 설계 §4.1).
 *
 * 파생 프로젝트는 자기 첨부 테이블마다 규칙 하나를 만들어 등록한다:
 *
 * ```ts
 * @Injectable()
 * export class InquiryAttachmentRule implements FileAccessRule, OnModuleInit {
 *   constructor(private readonly registry: FileAccessRuleRegistry, private readonly prisma: PrismaService) {}
 *   onModuleInit() { this.registry.register(this); }
 *   async decide(fileId: string, viewer?: CommonAuthUserDto) {
 *     const row = await this.prisma.inquiryAttachment.findUnique({ where: { fileId }, include: { inquiry: true } });
 *     if (!row) return null;
 *     return viewer?.isLogin && viewer.id === row.inquiry.authorId ? 'allow' : 'deny';
 *   }
 * }
 * ```
 *
 * 그 첨부 테이블의 FK 는 files 를 향해 `onDelete: Restrict` 로 둔다 — 정리 작업이 「아직 붙은 파일」을
 * FK 위반으로 알아채고 건너뛴다. 파일의 주인은 하나라 둘 이상의 규칙이 답하면 거절한다.
 */
export interface FileAccessRule {
  decide(
    fileId: string,
    viewer: CommonAuthUserDto | undefined,
  ): Promise<FileAccessVerdict | null>;
}
