export type ReportTarget = 'POST' | 'COMMENT' | 'USER' | 'MEDIA';
export type ReportReason =
  | 'SPAM'
  | 'HARASSMENT'
  | 'HATE_SPEECH'
  | 'VIOLENCE'
  | 'ADULT_CONTENT'
  | 'MISINFORMATION'
  | 'COPYRIGHT'
  | 'OTHER';
export type ReportStatus = 'PENDING' | 'REVIEWING' | 'RESOLVED' | 'DISMISSED';
export type ReportAction =
  | 'NO_ACTION'
  | 'WARN_USER'
  | 'HIDE_CONTENT'
  | 'DELETE_CONTENT'
  | 'SUSPEND_USER';

export interface Report {
  id: string;
  reporterId: string;
  targetType: ReportTarget;
  targetId: string;
  reason: ReportReason;
  description: string | null;
  status: ReportStatus;
  resolvedById: string | null;
  resolvedAt: string | null;
  actionTaken: ReportAction | null;
  moderatorNote: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReportsResponse {
  data: Report[];
  nextCursor: string | null;
}

export interface ReportsParams {
  status?: ReportStatus;
  targetType?: ReportTarget;
  cursor?: string;
  limit?: number;
}

export interface ResolveReportRequest {
  actionTaken: ReportAction;
  moderatorNote?: string;
}

export const REPORT_TARGET_LABELS: Record<ReportTarget, string> = {
  POST: '게시글',
  COMMENT: '댓글',
  USER: '사용자',
  MEDIA: '미디어',
};

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  SPAM: '스팸',
  HARASSMENT: '괴롭힘',
  HATE_SPEECH: '혐오 발언',
  VIOLENCE: '폭력',
  ADULT_CONTENT: '성인 콘텐츠',
  MISINFORMATION: '허위 정보',
  COPYRIGHT: '저작권 침해',
  OTHER: '기타',
};

export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  PENDING: '대기',
  REVIEWING: '검토 중',
  RESOLVED: '처리 완료',
  DISMISSED: '기각',
};

export const REPORT_ACTION_LABELS: Record<ReportAction, string> = {
  NO_ACTION: '조치 없음',
  WARN_USER: '경고',
  HIDE_CONTENT: '콘텐츠 숨김',
  DELETE_CONTENT: '콘텐츠 삭제',
  SUSPEND_USER: '사용자 정지',
};
