/*
  Warnings:

  - You are about to drop the column `subject` on the `questions` table. All the data in the column will be lost.
  - Made the column `subject_id` on table `exams` required. This step will fail if there are existing NULL values in that column.
  - Made the column `total_questions` on table `exams` required. This step will fail if there are existing NULL values in that column.
  - Made the column `status` on table `exams` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updated_at` on table `exams` required. This step will fail if there are existing NULL values in that column.
  - Made the column `exam_id` on table `questions` required. This step will fail if there are existing NULL values in that column.
  - Made the column `order_number` on table `questions` required. This step will fail if there are existing NULL values in that column.
  - Made the column `question_type` on table `questions` required. This step will fail if there are existing NULL values in that column.
  - Made the column `subject_id` on table `questions` required. This step will fail if there are existing NULL values in that column.
  - Made the column `has_image` on table `questions` required. This step will fail if there are existing NULL values in that column.
  - Made the column `status` on table `questions` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "exams" DROP CONSTRAINT "exams_subject_id_fkey";

-- DropForeignKey
ALTER TABLE "questions" DROP CONSTRAINT "questions_subject_id_fkey";

-- AlterTable
ALTER TABLE "classes" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "exams" ALTER COLUMN "subject_id" SET NOT NULL,
ALTER COLUMN "total_questions" SET NOT NULL,
ALTER COLUMN "status" SET NOT NULL,
ALTER COLUMN "updated_at" SET NOT NULL,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ocr_sessions" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "questions" DROP COLUMN "subject",
ALTER COLUMN "exam_id" SET NOT NULL,
ALTER COLUMN "order_number" SET NOT NULL,
ALTER COLUMN "question_type" SET NOT NULL,
ALTER COLUMN "subject_id" SET NOT NULL,
ALTER COLUMN "has_image" SET NOT NULL,
ALTER COLUMN "status" SET NOT NULL;

-- AlterTable
ALTER TABLE "subjects" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "topics" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "updated_at" DROP DEFAULT;

-- CreateTable
CREATE TABLE "study_plans" (
    "id" SERIAL NOT NULL,
    "student_id" INTEGER NOT NULL,
    "subject_id" INTEGER,
    "title" VARCHAR(200) NOT NULL,
    "content" JSON NOT NULL,
    "suggestions" JSONB,
    "source" VARCHAR(50) NOT NULL DEFAULT 'ai_analysis',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "study_plans_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exams" ADD CONSTRAINT "exams_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_plans" ADD CONSTRAINT "study_plans_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_plans" ADD CONSTRAINT "study_plans_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
