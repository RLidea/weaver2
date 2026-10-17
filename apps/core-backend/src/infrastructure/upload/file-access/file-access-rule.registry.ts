import { Injectable } from '@nestjs/common';
import { FileAccessRule } from './file-access-rule';

/**
 * 파일 읽기 규칙을 모으는 곳. 본체(게시글 첨부·프로필 이미지)와 파생 프로젝트가 각자의
 * 모듈 초기화(onModuleInit)에서 등록한다 — 한 토큰에 공급자가 하나뿐인 Nest 에서 여러 모듈이
 * 규칙을 보태려면 등록부가 필요하다.
 */
@Injectable()
export class FileAccessRuleRegistry {
  private readonly rules: FileAccessRule[] = [];

  register(rule: FileAccessRule): void {
    if (!this.rules.includes(rule)) this.rules.push(rule);
  }

  all(): readonly FileAccessRule[] {
    return this.rules;
  }
}
