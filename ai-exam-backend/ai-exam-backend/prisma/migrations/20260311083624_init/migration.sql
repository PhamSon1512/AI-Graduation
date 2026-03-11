-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('student', 'teacher');

-- CreateEnum
CREATE TYPE "BloomLevel" AS ENUM ('nhan_biet', 'thong_hieu', 'van_dung', 'van_dung_cao');

-- CreateEnum
CREATE TYPE "AiStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "full_name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(100) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "role" "UserRole" NOT NULL,
    "class_name" VARCHAR(50),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reset_token" VARCHAR(255),
    "reset_token_expiry" TIMESTAMP(3),
    "refresh_token" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questions" (
    "id" SERIAL NOT NULL,
    "content_html" TEXT NOT NULL,
    "topic" VARCHAR(100) NOT NULL,
    "bloom_level" "BloomLevel" NOT NULL,
    "correct_answer" CHAR(1) NOT NULL,
    "explanation_html" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exams" (
    "id" SERIAL NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "is_ai_generated" BOOLEAN NOT NULL DEFAULT false,
    "created_by" INTEGER,
    "duration_minutes" INTEGER NOT NULL DEFAULT 45,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_questions" (
    "exam_id" INTEGER NOT NULL,
    "question_id" INTEGER NOT NULL,

    CONSTRAINT "exam_questions_pkey" PRIMARY KEY ("exam_id","question_id")
);

-- CreateTable
CREATE TABLE "student_exam_results" (
    "id" SERIAL NOT NULL,
    "student_id" INTEGER NOT NULL,
    "exam_id" INTEGER NOT NULL,
    "total_score" DECIMAL(4,2),
    "total_time_seconds" INTEGER,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_exam_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_question_logs" (
    "id" SERIAL NOT NULL,
    "result_id" INTEGER NOT NULL,
    "question_id" INTEGER NOT NULL,
    "student_answer" CHAR(1),
    "is_correct" BOOLEAN NOT NULL,
    "time_spent_seconds" INTEGER NOT NULL,

    CONSTRAINT "student_question_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_suggestions" (
    "id" SERIAL NOT NULL,
    "teacher_id" INTEGER NOT NULL,
    "student_id" INTEGER NOT NULL,
    "suggested_topic" VARCHAR(100),
    "generated_questions" JSONB,
    "ai_reasoning" TEXT,
    "status" "AiStatus" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_suggestions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- AddForeignKey
ALTER TABLE "exams" ADD CONSTRAINT "exams_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_questions" ADD CONSTRAINT "exam_questions_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_questions" ADD CONSTRAINT "exam_questions_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_exam_results" ADD CONSTRAINT "student_exam_results_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_exam_results" ADD CONSTRAINT "student_exam_results_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_question_logs" ADD CONSTRAINT "student_question_logs_result_id_fkey" FOREIGN KEY ("result_id") REFERENCES "student_exam_results"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_question_logs" ADD CONSTRAINT "student_question_logs_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_suggestions" ADD CONSTRAINT "ai_suggestions_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_suggestions" ADD CONSTRAINT "ai_suggestions_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
