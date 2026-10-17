import { Injectable, Logger } from '@nestjs/common';
import { File } from '@weaver2/prisma';
import { CommonAuthUserDto } from '@weaver2/common';
import { PERMISSIONS } from '@weaver2/common/constants/permissions.const';
import { PermissionService } from '../../../core/permission/services/permission.service';
import { FileAccessVerdict } from './file-access-rule';
import { FileAccessRuleRegistry } from './file-access-rule.registry';

/**
 * 「이 사람이 이 파일을 받을 수 있나」 (파일 접근 통제 설계 §4.1).
 *
 * 1. 지운 파일 → 아무도(관리자 포함 — 관리자는 관리 화면의 별도 경로)
 * 2. 가린 파일 → 관리자(UPLOAD.READ)만
 * 3. 등록된 규칙들 — 파일의 주인은 하나라 답은 많아야 하나. 둘 이상이면 거절하고 오류 로그(규칙 버그)
 * 4. 아무 규칙도 자기 것이라 하지 않으면(어디에도 안 붙음) → 올린 사람만
 *
 * viewer 는 인증 설계 §4.0 의 일원화된 검증을 거친 사용자다 — pre-auth·탈퇴·정지는 비로그인으로 온다.
 */
@Injectable()
export class FileAccessService {
  private readonly logger = new Logger(FileAccessService.name);

  constructor(
    private readonly registry: FileAccessRuleRegistry,
    private readonly permissionService: PermissionService,
  ) {}

  async canRead(
    file: Pick<File, 'id' | 'uploadedById' | 'hiddenAt' | 'deletedAt'>,
    viewer: CommonAuthUserDto | undefined,
  ): Promise<FileAccessVerdict> {
    if (file.deletedAt) return 'deny';
    const userId = viewer?.isLogin ? viewer.id : null;

    if (file.hiddenAt) {
      return userId &&
        (await this.permissionService.hasPermission(
          userId,
          PERMISSIONS.UPLOAD.READ,
        ))
        ? 'allow'
        : 'deny';
    }

    const answers = (
      await Promise.all(
        this.registry.all().map((r) => r.decide(file.id, viewer)),
      )
    ).filter((a): a is FileAccessVerdict => a !== null);

    if (answers.length > 1) {
      this.logger.error(
        `파일 ${file.id} 에 규칙 ${answers.length}개가 답했습니다 — 파일의 주인은 하나여야 합니다`,
      );
      return 'deny';
    }
    if (answers.length === 1) return answers[0];

    return userId !== null && userId === file.uploadedById ? 'allow' : 'deny';
  }
}
