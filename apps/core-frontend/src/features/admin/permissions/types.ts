export interface PermissionGroup {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  createdAt: string;
  _count: {
    permissions: number;
    users: number;
  };
}

export interface GroupPermission {
  id: string;
  permission: string;
}

export interface PermissionGroupDetail {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  createdAt: string;
  permissions: GroupPermission[];
  _count: {
    users: number;
  };
}

export interface GroupUser {
  id: string;
  username: string;
  displayName: string;
  createdAt: string;
  assignedAt: string;
}

export interface CreatePermissionGroupRequest {
  name: string;
  description?: string;
}

export interface UpdatePermissionGroupRequest {
  name?: string;
  description?: string;
}
