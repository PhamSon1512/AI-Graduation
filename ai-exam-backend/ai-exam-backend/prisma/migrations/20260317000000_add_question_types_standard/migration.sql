-- AlterEnum: Add new question types to QuestionType enum
ALTER TYPE "QuestionType" ADD VALUE IF NOT EXISTS 'trac_nghiem_1_dap_an';
ALTER TYPE "QuestionType" ADD VALUE IF NOT EXISTS 'trac_nghiem_nhieu_dap_an';
ALTER TYPE "QuestionType" ADD VALUE IF NOT EXISTS 'trac_nghiem_dung_sai';
ALTER TYPE "QuestionType" ADD VALUE IF NOT EXISTS 'trac_nghiem_tra_loi_ngan';

-- AlterTable: Add rounding_rule column for short answer questions
ALTER TABLE "questions" ADD COLUMN IF NOT EXISTS "rounding_rule" VARCHAR(50);

-- AlterTable: Extend correct_answer column for true/false (JSON string) and multiple choice
ALTER TABLE "questions" ALTER COLUMN "correct_answer" TYPE VARCHAR(100);
