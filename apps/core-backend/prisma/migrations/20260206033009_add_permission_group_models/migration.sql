-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "requiredPermission" TEXT;

-- CreateTable
CREATE TABLE "PermissionGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PermissionGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PermissionGroupPermission" (
    "id" TEXT NOT NULL,
    "permissionGroupId" TEXT NOT NULL,
    "permission" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PermissionGroupPermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPermissionGroup" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "permissionGroupId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserPermissionGroup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PermissionGroup_name_key" ON "PermissionGroup"("name");

-- CreateIndex
CREATE UNIQUE INDEX "PermissionGroupPermission_permissionGroupId_permission_key" ON "PermissionGroupPermission"("permissionGroupId", "permission");

-- CreateIndex
CREATE UNIQUE INDEX "UserPermissionGroup_userId_permissionGroupId_key" ON "UserPermissionGroup"("userId", "permissionGroupId");

-- AddForeignKey
ALTER TABLE "PermissionGroupPermission" ADD CONSTRAINT "PermissionGroupPermission_permissionGroupId_fkey" FOREIGN KEY ("permissionGroupId") REFERENCES "PermissionGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPermissionGroup" ADD CONSTRAINT "UserPermissionGroup_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPermissionGroup" ADD CONSTRAINT "UserPermissionGroup_permissionGroupId_fkey" FOREIGN KEY ("permissionGroupId") REFERENCES "PermissionGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
