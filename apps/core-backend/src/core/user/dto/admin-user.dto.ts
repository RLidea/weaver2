export class AdminUserPermissionGroupDto {
  id: string;
  name: string;
}

export class AdminUserDto {
  id: string;
  username: string;
  displayName: string;
  email: string | null;
  profileImageUrl: string | null;
  suspendedUntil: Date | null;
  deletedAt: Date | null;
  createdAt: Date;
  lastLoginAt: Date | null;
  permissionGroups: AdminUserPermissionGroupDto[];
}
