-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'admin';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL DEFAULT NOW();

-- Update existing rows to have created_at as updated_at
UPDATE "users" SET "updated_at" = "created_at" WHERE "updated_at" IS NULL OR "updated_at" = NOW();
