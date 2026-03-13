-- CreateEnum
CREATE TYPE "ExamStatus" AS ENUM ('draft', 'pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('trac_nghiem', 'tu_luan');

-- CreateEnum
CREATE TYPE "QuestionStatus" AS ENUM ('draft', 'pending', 'approved');

-- CreateEnum
CREATE TYPE "OcrSessionStatus" AS ENUM ('processing', 'pending_review', 'saved', 'cancelled');

-- AlterTable: Add topics column to subjects
ALTER TABLE "subjects" ADD COLUMN IF NOT EXISTS "topics" JSONB;

-- AlterTable: Update exams table
ALTER TABLE "exams" ADD COLUMN IF NOT EXISTS "code" VARCHAR(50);
ALTER TABLE "exams" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "exams" ADD COLUMN IF NOT EXISTS "subject_id" INTEGER;
ALTER TABLE "exams" ADD COLUMN IF NOT EXISTS "total_questions" INTEGER DEFAULT 0;
ALTER TABLE "exams" ADD COLUMN IF NOT EXISTS "status" "ExamStatus" DEFAULT 'draft';
ALTER TABLE "exams" ADD COLUMN IF NOT EXISTS "approved_by" INTEGER;
ALTER TABLE "exams" ADD COLUMN IF NOT EXISTS "approved_at" TIMESTAMP(3);
ALTER TABLE "exams" ADD COLUMN IF NOT EXISTS "rejection_reason" TEXT;
ALTER TABLE "exams" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) DEFAULT NOW();

-- Update existing exams to have a unique code
UPDATE "exams" SET "code" = CONCAT('EXAM-', "id") WHERE "code" IS NULL;

-- Make code unique and not null
ALTER TABLE "exams" ALTER COLUMN "code" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "exams_code_key" ON "exams"("code");

-- AlterTable: Update questions table
ALTER TABLE "questions" ADD COLUMN IF NOT EXISTS "exam_id" INTEGER;
ALTER TABLE "questions" ADD COLUMN IF NOT EXISTS "order_number" INTEGER DEFAULT 0;
ALTER TABLE "questions" ADD COLUMN IF NOT EXISTS "question_type" "QuestionType" DEFAULT 'trac_nghiem';
ALTER TABLE "questions" ADD COLUMN IF NOT EXISTS "subject_id" INTEGER;
ALTER TABLE "questions" ADD COLUMN IF NOT EXISTS "has_image" BOOLEAN DEFAULT false;
ALTER TABLE "questions" ADD COLUMN IF NOT EXISTS "image_url" VARCHAR(500);
ALTER TABLE "questions" ADD COLUMN IF NOT EXISTS "image_description" TEXT;
ALTER TABLE "questions" ADD COLUMN IF NOT EXISTS "status" "QuestionStatus" DEFAULT 'draft';

-- Rename subject column to temp, then update
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'questions' AND column_name = 'subject' AND data_type = 'character varying') THEN
    -- Assign default subject_id if needed
    UPDATE "questions" SET "subject_id" = 1 WHERE "subject_id" IS NULL;
  END IF;
END $$;

-- Modify correct_answer to allow longer values
ALTER TABLE "questions" ALTER COLUMN "correct_answer" TYPE VARCHAR(10);

-- CreateTable: ocr_sessions
CREATE TABLE IF NOT EXISTS "ocr_sessions" (
    "id" SERIAL NOT NULL,
    "exam_id" INTEGER NOT NULL,
    "teacher_id" INTEGER NOT NULL,
    "file_name" VARCHAR(255),
    "file_type" VARCHAR(50),
    "raw_questions" JSONB NOT NULL,
    "reviewed_data" JSONB,
    "status" "OcrSessionStatus" NOT NULL DEFAULT 'processing',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ocr_sessions_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'exams_subject_id_fkey') THEN
    ALTER TABLE "exams" ADD CONSTRAINT "exams_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'exams_approved_by_fkey') THEN
    ALTER TABLE "exams" ADD CONSTRAINT "exams_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'questions_exam_id_fkey') THEN
    ALTER TABLE "questions" ADD CONSTRAINT "questions_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'questions_subject_id_fkey') THEN
    ALTER TABLE "questions" ADD CONSTRAINT "questions_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ocr_sessions_exam_id_fkey') THEN
    ALTER TABLE "ocr_sessions" ADD CONSTRAINT "ocr_sessions_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ocr_sessions_teacher_id_fkey') THEN
    ALTER TABLE "ocr_sessions" ADD CONSTRAINT "ocr_sessions_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
