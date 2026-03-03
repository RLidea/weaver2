export interface AdminBoard {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  stats: {
    totalPosts: number;
    totalComments: number;
    recentPosts: number;
  };
}

export interface BoardPermissionItem {
  id: string;
  action: string;
  allowAnonymous: boolean;
  allowedGroupNames: string[];
}

export interface UpdateBoardPermissionsRequest {
  action: string;
  allowAnonymous?: boolean;
  allowedGroupNames?: string[];
}

export interface CreateBoardRequest {
  name: string;
  description?: string;
}

export interface UpdateBoardRequest {
  name?: string;
  description?: string;
}

export const BOARD_ACTIONS = [
  { value: 'read', label: '읽기' },
  { value: 'write', label: '글쓰기' },
  { value: 'comment', label: '댓글' },
  { value: 'edit_own', label: '본인 글 수정' },
  { value: 'edit_all', label: '전체 글 수정' },
  { value: 'delete_own', label: '본인 글 삭제' },
  { value: 'delete_all', label: '전체 글 삭제' },
] as const;
