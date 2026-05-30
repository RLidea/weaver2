export type AbuseReportTarget = 'POST' | 'COMMENT' | 'USER' | 'MEDIA';
export type AbuseReportReason =
  | 'SPAM'
  | 'HARASSMENT'
  | 'HATE_SPEECH'
  | 'VIOLENCE'
  | 'ADULT_CONTENT'
  | 'MISINFORMATION'
  | 'COPYRIGHT'
  | 'OTHER';
export type AbuseReportStatus =
  | 'PENDING'
  | 'REVIEWING'
  | 'RESOLVED'
  | 'DISMISSED';
export type AbuseReportAction =
  | 'NO_ACTION'
  | 'WARN_USER'
  | 'HIDE_CONTENT'
  | 'DELETE_CONTENT'
  | 'SUSPEND_USER';

export interface AbuseReport {
  id: string;
  reporterId: string;
  targetType: AbuseReportTarget;
  targetId: string;
  reason: AbuseReportReason;
  description: string | null;
  status: AbuseReportStatus;
  resolvedById: string | null;
  resolvedAt: string | null;
  actionTaken: AbuseReportAction | null;
  moderatorNote: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AbuseReportsResponse {
  data: AbuseReport[];
  nextCursor: string | null;
}

export interface AbuseReportsParams {
  status?: AbuseReportStatus;
  targetType?: AbuseReportTarget;
  cursor?: string;
  limit?: number;
}

export interface ResolveAbuseReportRequest {
  actionTaken: AbuseReportAction;
  moderatorNote?: string;
}

export const ABUSE_REPORT_TARGET_LABELS: Record<AbuseReportTarget, string> = {
  POST: '게시글',
  COMMENT: '댓글',
  USER: '사용자',
  MEDIA: '미디어',
};

export const ABUSE_REPORT_REASON_LABELS: Record<AbuseReportReason, string> = {
  SPAM: '스팸',
  HARASSMENT: '괴롭힘',
  HATE_SPEECH: '혐오 발언',
  VIOLENCE: '폭력',
  ADULT_CONTENT: '성인 콘텐츠',
  MISINFORMATION: '허위 정보',
  COPYRIGHT: '저작권 침해',
  OTHER: '기타',
};

export const ABUSE_REPORT_STATUS_LABELS: Record<AbuseReportStatus, string> = {
  PENDING: '대기',
  REVIEWING: '검토 중',
  RESOLVED: '처리 완료',
  DISMISSED: '기각',
};

export const ABUSE_REPORT_ACTION_LABELS: Record<AbuseReportAction, string> = {
  NO_ACTION: '조치 없음',
  WARN_USER: '경고',
  HIDE_CONTENT: '콘텐츠 숨김',
  DELETE_CONTENT: '콘텐츠 삭제',
  SUSPEND_USER: '사용자 정지',
};
