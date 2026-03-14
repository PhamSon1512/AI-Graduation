-- CreateTable: classes
CREATE TABLE IF NOT EXISTS "classes" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "description" TEXT,
    "school_year" VARCHAR(20),
    "teacher_id" INTEGER NOT NULL,
    "subject_id" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable: class_students
CREATE TABLE IF NOT EXISTS "class_students" (
    "id" SERIAL NOT NULL,
    "class_id" INTEGER NOT NULL,
    "student_id" INTEGER NOT NULL,
    "enrolled_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',

    CONSTRAINT "class_students_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "classes_code_key" ON "classes"("code");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "class_students_class_id_student_id_key" ON "class_students"("class_id", "student_id");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'classes_teacher_id_fkey') THEN
    ALTER TABLE "classes" ADD CONSTRAINT "classes_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'classes_subject_id_fkey') THEN
    ALTER TABLE "classes" ADD CONSTRAINT "classes_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'class_students_class_id_fkey') THEN
    ALTER TABLE "class_students" ADD CONSTRAINT "class_students_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'class_students_student_id_fkey') THEN
    ALTER TABLE "class_students" ADD CONSTRAINT "class_students_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
