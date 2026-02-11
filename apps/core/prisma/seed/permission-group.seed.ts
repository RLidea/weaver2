import { PrismaClient } from '@prisma/client';
import { PERMISSIONS } from '@weaver2/common/constants/permissions.const';
import { logSeedResult } from './seed-logger';

interface PermissionGroupSeed {
  name: string;
  description: string;
  isSystem: boolean;
  permissions: string[];
}

const permissionGroupsToSeed: PermissionGroupSeed[] = [
  {
    name: 'SuperAdmin',
    description: '모든 권한을 가진 최고 관리자',
    isSystem: true,
    permissions: [PERMISSIONS.SUPER],
  },
  {
    name: 'Admin',
    description: '시스템 운영 및 관리 권한',
    isSystem: true,
    permissions: [
      // 관리자
      PERMISSIONS.ADMIN.ALL,
      // 콘텐츠
      PERMISSIONS.POST.ALL,
      PERMISSIONS.COMMENT.ALL,
      PERMISSIONS.BOARD.ALL,
      // 유저 관리 (삭제 제외)
      PERMISSIONS.USER.READ,
      PERMISSIONS.USER.UPDATE_ALL,
      PERMISSIONS.USER.SUSPEND,
      // 운영
      PERMISSIONS.EMAIL.ALL,
      PERMISSIONS.ANALYTICS.ALL,
      PERMISSIONS.TERMS.ALL,
      PERMISSIONS.UPLOAD.ALL,
    ],
  },
  {
    name: 'Moderator',
    description: '콘텐츠 중재 및 사용자 관리',
    isSystem: true,
    permissions: [
      // 관리자 (제한적)
      PERMISSIONS.ADMIN.ACCESS,
      PERMISSIONS.ADMIN.DASHBOARD,
      // 게시글 중재
      PERMISSIONS.POST.READ,
      PERMISSIONS.POST.READ_ALL,
      PERMISSIONS.POST.UPDATE_ALL,
      PERMISSIONS.POST.DELETE_ALL,
      // 댓글 중재
      PERMISSIONS.COMMENT.READ,
      PERMISSIONS.COMMENT.UPDATE_ALL,
      PERMISSIONS.COMMENT.DELETE_ALL,
      // 게시판
      PERMISSIONS.BOARD.READ,
      // 유저
      PERMISSIONS.USER.READ,
      PERMISSIONS.USER.SUSPEND,
      // 파일
      PERMISSIONS.UPLOAD.READ,
      PERMISSIONS.UPLOAD.DELETE,
    ],
  },
  {
    name: 'User',
    description: '일반 사용자 기본 권한',
    isSystem: true,
    permissions: [
      // 게시글 (본인)
      PERMISSIONS.POST.CREATE,
      PERMISSIONS.POST.READ,
      PERMISSIONS.POST.UPDATE_OWN,
      PERMISSIONS.POST.DELETE_OWN,
      // 댓글 (본인)
      PERMISSIONS.COMMENT.CREATE,
      PERMISSIONS.COMMENT.READ,
      PERMISSIONS.COMMENT.UPDATE_OWN,
      PERMISSIONS.COMMENT.DELETE_OWN,
      // 게시판
      PERMISSIONS.BOARD.READ,
      // 유저 (본인)
      PERMISSIONS.USER.READ,
      PERMISSIONS.USER.UPDATE_OWN,
      PERMISSIONS.USER.DELETE_OWN,
      // 약관
      PERMISSIONS.TERMS.READ,
      // 파일
      PERMISSIONS.UPLOAD.CREATE,
      PERMISSIONS.UPLOAD.READ,
    ],
  },
  {
    name: 'Suspended',
    description: '정지된 계정 (모든 권한 제거)',
    isSystem: true,
    permissions: [],
  },
];

export async function seedPermissionGroups(prisma: PrismaClient) {
  for (const groupData of permissionGroupsToSeed) {
    const existing = await prisma.permissionGroup.findUnique({
      where: { name: groupData.name },
    });

    if (existing) {
      logSeedResult('PermissionGroup', groupData.name, 'exists');
      continue;
    }

    await prisma.permissionGroup.create({
      data: {
        name: groupData.name,
        description: groupData.description,
        isSystem: groupData.isSystem,
        permissions: {
          create: groupData.permissions.map((permission) => ({ permission })),
        },
      },
    });

    logSeedResult('PermissionGroup', groupData.name, 'created');
  }
}
