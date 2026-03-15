-- CreateEnum
CREATE TYPE "AssignmentType" AS ENUM ('fixed_exam', 'random_config');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('draft', 'published');

-- CreateEnum
CREATE TYPE "AssignmentAttemptStatus" AS ENUM ('in_progress', 'completed');

-- CreateTable
CREATE TABLE "assignments" (
    "id" SERIAL NOT NULL,
    "class_id" INTEGER NOT NULL,
    "teacher_id" INTEGER NOT NULL,
    "exam_id" INTEGER,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "assignment_type" "AssignmentType" NOT NULL,
    "exam_config" JSONB,
    "deadline" TIMESTAMPTZ(6),
    "duration_minutes" INTEGER NOT NULL DEFAULT 60,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'draft',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assignment_attempts" (
    "id" SERIAL NOT NULL,
    "assignment_id" INTEGER NOT NULL,
    "student_id" INTEGER NOT NULL,
    "exam_id" INTEGER,
    "status" "AssignmentAttemptStatus" NOT NULL DEFAULT 'in_progress',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submitted_at" TIMESTAMP(3),
    "time_spent_seconds" INTEGER,
    "score" DECIMAL(5, 2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assignment_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assignment_attempt_questions" (
    "id" SERIAL NOT NULL,
    "attempt_id" INTEGER NOT NULL,
    "question_id" INTEGER NOT NULL,
    "order_number" INTEGER NOT NULL,

    CONSTRAINT "assignment_attempt_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assignment_attempt_answers" (
    "id" SERIAL NOT NULL,
    "attempt_id" INTEGER NOT NULL,
    "question_id" INTEGER NOT NULL,
    "student_answer" VARCHAR(10),
    "is_correct" BOOLEAN,

    CONSTRAINT "assignment_attempt_answers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "assignment_attempts_assignment_id_student_id_key" ON "assignment_attempts"("assignment_id", "student_id");

-- CreateIndex
CREATE UNIQUE INDEX "assignment_attempt_questions_attempt_id_question_id_key" ON "assignment_attempt_questions"("attempt_id", "question_id");

-- CreateIndex
CREATE UNIQUE INDEX "assignment_attempt_answers_attempt_id_question_id_key" ON "assignment_attempt_answers"("attempt_id", "question_id");

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "exams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment_attempts" ADD CONSTRAINT "assignment_attempts_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment_attempts" ADD CONSTRAINT "assignment_attempts_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment_attempts" ADD CONSTRAINT "assignment_attempts_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "exams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment_attempt_questions" ADD CONSTRAINT "assignment_attempt_questions_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "assignment_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment_attempt_questions" ADD CONSTRAINT "assignment_attempt_questions_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment_attempt_answers" ADD CONSTRAINT "assignment_attempt_answers_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "assignment_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment_attempt_answers" ADD CONSTRAINT "assignment_attempt_answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
