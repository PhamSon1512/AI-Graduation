/*
  Warnings:

  - Added the required column `updated_at` to the `questions` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "questions" ADD COLUMN     "created_by" INTEGER,
ADD COLUMN     "is_ai_generated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "options" JSONB,
ADD COLUMN     "subject" VARCHAR(50) NOT NULL DEFAULT 'vat_ly_12',
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "correct_answer" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
