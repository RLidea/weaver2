-- CreateTable
CREATE TABLE "ResourcePermission" (
    "id" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "allowAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResourcePermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResourcePermissionAllowedGroup" (
    "id" TEXT NOT NULL,
    "resourcePermissionId" TEXT NOT NULL,
    "permissionGroupId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResourcePermissionAllowedGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResourcePermissionDeniedGroup" (
    "id" TEXT NOT NULL,
    "resourcePermissionId" TEXT NOT NULL,
    "permissionGroupId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResourcePermissionDeniedGroup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ResourcePermission_resourceType_resourceId_action_key" ON "ResourcePermission"("resourceType", "resourceId", "action");

-- CreateIndex
CREATE UNIQUE INDEX "ResourcePermissionAllowedGroup_resourcePermissionId_permiss_key" ON "ResourcePermissionAllowedGroup"("resourcePermissionId", "permissionGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "ResourcePermissionDeniedGroup_resourcePermissionId_permissi_key" ON "ResourcePermissionDeniedGroup"("resourcePermissionId", "permissionGroupId");

-- AddForeignKey
ALTER TABLE "ResourcePermissionAllowedGroup" ADD CONSTRAINT "ResourcePermissionAllowedGroup_resourcePermissionId_fkey" FOREIGN KEY ("resourcePermissionId") REFERENCES "ResourcePermission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourcePermissionAllowedGroup" ADD CONSTRAINT "ResourcePermissionAllowedGroup_permissionGroupId_fkey" FOREIGN KEY ("permissionGroupId") REFERENCES "PermissionGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourcePermissionDeniedGroup" ADD CONSTRAINT "ResourcePermissionDeniedGroup_resourcePermissionId_fkey" FOREIGN KEY ("resourcePermissionId") REFERENCES "ResourcePermission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourcePermissionDeniedGroup" ADD CONSTRAINT "ResourcePermissionDeniedGroup_permissionGroupId_fkey" FOREIGN KEY ("permissionGroupId") REFERENCES "PermissionGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
