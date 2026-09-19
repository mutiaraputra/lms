# Dokumen 2 — Pemetaan Skema Database & Relasi (LMS SMK Nagara Rebuild)

> Dokumen ini memetakan 26 tabel database lama (MySQL `learning.sql`) ke skema ternormalisasi **Prisma ORM (PostgreSQL 16)** dengan foreign keys, indexing optimal, tipe data yang tepat, dan strategi migrasi password.

- **Status:** Finalisasi untuk Implementasi
- **Target Database:** PostgreSQL 16
- **ORM:** Prisma 6 / latest
- **Tanggal:** 19 September 2026

---

## 1. Prinsip Desain Skema Baru

1. **Autentikasi Terpadu (`users` table):**
   - Menggabungkan `tb_admin`, `tb_guru`, dan `tb_siswa` ke dalam satu tabel `users` dengan kolom `role` (`ADMIN`, `GURU`, `SISWA`).
   - Profil terpisah: `teacher_profiles` (untuk guru) dan `student_profiles` (untuk siswa).
   - Password lama (`sha1` tanpa salt) disimpan di `legacy_password_sha1`. Password baru di-hash menggunakan Argon2id atau bcrypt di kolom `password_hash`. Saat login pertama, hash otomatis diperbarui ke hash baru yang aman.

2. **Penghapusan Masalah Denormalisasi Kolom Nilai:**
   - Kolom `nilai.acak_soal` dan `nilai.jawaban` (yang sebelumnya disimpan sebagai string CSV koma seperti `'12,14,11'` dan `'1,2,0'`) dinormalisasi menjadi tabel `exam_answers` yang berelasi ke `exam_attempts` dan `questions`.
   - Kolom `id_ujian` pada `nilai` yang sebelumnya `varchar(100)` dikonversi menjadi integer dengan Foreign Key ke tabel `exams`.

3. **Integritas Relasi & Tipe Data:**
   - Foreign key eksplisit dengan `ON DELETE CASCADE` atau `ON DELETE RESTRICT` sesuai domain.
   - Tanggal invalid seperti `'0000-00-00'` diubah menjadi `NULL`.
   - String status berulang (`enum('Y','N')`, `'Yes'/'No'`) diubah menjadi tipe `Boolean` atau TypeScript enum yang konsisten.

---

## 2. Pemetaan Tabel Lama ke Model Baru

| # | Tabel Lama (MySQL) | Model Prisma Baru | Keterangan & Transformasi |
|---|---|---|---|
| 1 | `tb_admin` | `User` (Role ADMIN) | Password dimigrasi ke `legacyPasswordSha1` |
| 2 | `tb_guru` | `User` (Role GURU) + `TeacherProfile` | Email/NIK sebagai login, profil terpisah |
| 3 | `tb_siswa` | `User` (Role SISWA) + `StudentProfile` | NIS sebagai login, relasi ke kelas & jurusan |
| 4 | `tb_sekolah` | `SchoolSetting` | Konfigurasi tunggal (nama sekolah, logo, copyright, kepsek) |
| 5 | `tb_master_kelas` | `Class` | Master kelas (`X`, `XI`, `XII`, dsb.) |
| 6 | `tb_master_jurusan` | `Major` | Master jurusan (`RPL`, `TKJ`, `AKL`, dsb.) |
| 7 | `tb_master_semester` | `Semester` | Master semester (Ganjil / Genap) |
| 8 | `tb_master_mapel` | `Subject` | Master mata pelajaran |
| 9 | `tb_jenisujian` | `ExamType` | UTS, UAS, Ulangan Harian |
| 10 | `tb_jenisperangkat` | `TeachingKitType` | RPP, Silabus, ATP, Modul Ajar |
| 11 | `tb_jenistugas` | `AssignmentType` | Tugas Individu, Tugas Kelompok |
| 12 | `tb_roleguru` | `TeachingAssignment` | Pivot penugasan Guru ke Mapel + Kelas + Jurusan + Semester |
| 13 | `tb_materi` | `Material` | Terhubung ke `TeachingAssignment` |
| 14 | `tb_materibaca` | `MaterialRead` | Log siswa membaca materi |
| 15 | `tb_perangkat` | `TeachingKit` | Berkas perangkat ajar guru |
| 16 | `ujian` | `Exam` | Ujian pilihan ganda |
| 17 | `kelas_ujian` | `ExamClass` | Relasi ujian yang dibuka untuk kelas tertentu |
| 18 | `soal` | `Question` + `QuestionOption` | Bank soal PG + 5 opsi jawaban |
| 19 | `nilai` | `ExamAttempt` + `ExamAnswer` | Memecah CSV `acak_soal` & `jawaban` jadi baris jawaban terstruktur |
| 20 | `analisis` | `AnswerAnalysis` | Analisis statistik butir soal |
| 21 | `ujian_essay` | `EssayExam` | Ujian essay |
| 22 | `kelas_ujianessay` | `EssayExamClass` | Relasi ujian essay per kelas |
| 23 | `tb_tugas` | `Assignment` | Tugas yang diberikan guru |
| 24 | `kelas_tugas` | `AssignmentClass` | Pembagian tugas ke kelas & jurusan |
| 25 | `tugas_siswa` | `AssignmentSubmission` | Pengumpulan tugas oleh siswa |
| 26 | `pesan` | `Message` | Chat/pesan internal |

---

## 3. Skema Prisma Lengkap (`schema.prisma`)

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum Role {
  ADMIN
  GURU
  SISWA
}

enum Gender {
  L
  P
}

// -------------------------------------------------------------
// 1. AUTENTIKASI & USER
// -------------------------------------------------------------
model User {
  id                 Int             @id @default(autoincrement())
  username           String          @unique @db.VarChar(100)
  email              String?         @unique @db.VarChar(150)
  name               String          @db.VarChar(150)
  passwordHash       String?         @map("password_hash") @db.VarChar(255)
  legacyPasswordSha1 String?         @map("legacy_password_sha1") @db.VarChar(255)
  role               Role
  avatar             String?         @db.VarChar(255)
  isActive           Boolean         @default(true) @map("is_active")
  createdAt          DateTime        @default(now()) @map("created_at")
  updatedAt          DateTime        @updatedAt @map("updated_at")

  teacherProfile     TeacherProfile?
  studentProfile     StudentProfile?
  
  sentMessages       Message[]       @relation("SentMessages")
  receivedMessages   Message[]       @relation("ReceivedMessages")

  @@map("users")
}

model TeacherProfile {
  id          Int       @id @default(autoincrement())
  userId      Int       @unique @map("user_id")
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  nik         String?   @db.VarChar(50)
  birthDate   DateTime? @map("birth_date") @db.Date
  gender      Gender?
  address     String?   @db.Text
  phone       String?   @db.VarChar(30)
  isConfirmed Boolean   @default(true) @map("is_confirmed")
  legacyId    Int?      @unique @map("legacy_id")

  teachingAssignments TeachingAssignment[]
  exams               Exam[]
  essayExams          EssayExam[]
  assignments         Assignment[]

  @@map("teacher_profiles")
}

model StudentProfile {
  id          Int       @id @default(autoincrement())
  userId      Int       @unique @map("user_id")
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  nis         String    @unique @db.VarChar(50)
  birthDate   DateTime? @map("birth_date") @db.Date
  gender      Gender?
  address     String?   @db.Text
  phone       String?   @db.VarChar(30)
  gradeLevel  String?   @map("grade_level") @db.VarChar(20)
  classId     Int?      @map("class_id")
  majorId     Int?      @map("major_id")
  isConfirmed Boolean   @default(true) @map("is_confirmed")
  legacyId    Int?      @unique @map("legacy_id")

  class       Class?    @relation(fields: [classId], references: [id], onDelete: SetNull)
  major       Major?    @relation(fields: [majorId], references: [id], onDelete: SetNull)

  materialReads         MaterialRead[]
  examAttempts          ExamAttempt[]
  answerAnalytics       AnswerAnalysis[]
  assignmentSubmissions AssignmentSubmission[]

  @@map("student_profiles")
}

// -------------------------------------------------------------
// 2. MASTER DATA
// -------------------------------------------------------------
model SchoolSetting {
  id          Int     @id @default(autoincrement())
  schoolName  String  @map("school_name") @db.VarChar(150)
  principal   String? @map("principal") @db.VarChar(150)
  logoText    String? @map("logo_text") @db.VarChar(150)
  logo        String? @db.VarChar(255)
  copyright   String? @db.VarChar(255)

  @@map("school_settings")
}

model Class {
  id        Int      @id @default(autoincrement())
  name      String   @unique @db.VarChar(50)
  createdAt DateTime @default(now()) @map("created_at")

  students            StudentProfile[]
  teachingAssignments TeachingAssignment[]
  examClasses         ExamClass[]
  essayExamClasses    EssayExamClass[]
  assignmentClasses   AssignmentClass[]
  messages            Message[]

  @@map("classes")
}

model Major {
  id        Int      @id @default(autoincrement())
  name      String   @unique @db.VarChar(100)
  createdAt DateTime @default(now()) @map("created_at")

  students            StudentProfile[]
  teachingAssignments TeachingAssignment[]
  examClasses         ExamClass[]
  essayExamClasses    EssayExamClass[]
  assignmentClasses   AssignmentClass[]
  messages            Message[]

  @@map("majors")
}

model Semester {
  id        Int      @id @default(autoincrement())
  name      String   @db.VarChar(50)
  isActive  Boolean  @default(true) @map("is_active")

  teachingAssignments TeachingAssignment[]
  exams               Exam[]
  essayExams          EssayExam[]
  assignments         Assignment[]

  @@map("semesters")
}

model Subject {
  id        Int      @id @default(autoincrement())
  name      String   @db.VarChar(100)

  teachingAssignments TeachingAssignment[]
  exams               Exam[]
  essayExams          EssayExam[]
  assignments         Assignment[]

  @@map("subjects")
}

model ExamType {
  id   Int    @id @default(autoincrement())
  name String @db.VarChar(100)

  exams      Exam[]
  essayExams EssayExam[]

  @@map("exam_types")
}

model TeachingKitType {
  id   Int    @id @default(autoincrement())
  name String @db.VarChar(100)

  kits TeachingKit[]

  @@map("teaching_kit_types")
}

model AssignmentType {
  id   Int    @id @default(autoincrement())
  name String @db.VarChar(100)

  assignments Assignment[]

  @@map("assignment_types")
}

// -------------------------------------------------------------
// 3. PENUGASAN GURU (TEACHING ASSIGNMENT)
// -------------------------------------------------------------
model TeachingAssignment {
  id         Int @id @default(autoincrement())
  teacherId  Int @map("teacher_id")
  classId    Int @map("class_id")
  subjectId  Int @map("subject_id")
  semesterId Int @map("semester_id")
  majorId    Int @map("major_id")

  teacher    TeacherProfile @relation(fields: [teacherId], references: [id], onDelete: Cascade)
  class      Class          @relation(fields: [classId], references: [id], onDelete: Cascade)
  subject    Subject        @relation(fields: [subjectId], references: [id], onDelete: Cascade)
  semester   Semester       @relation(fields: [semesterId], references: [id], onDelete: Cascade)
  major      Major          @relation(fields: [majorId], references: [id], onDelete: Cascade)

  materials    Material[]
  teachingKits TeachingKit[]

  @@unique([teacherId, classId, subjectId, semesterId, majorId])
  @@map("teaching_assignments")
}

// -------------------------------------------------------------
// 4. MATERI & PERANGKAT AJAR
// -------------------------------------------------------------
model Material {
  id                   Int      @id @default(autoincrement())
  teachingAssignmentId Int      @map("teaching_assignment_id")
  title                String   @db.VarChar(200)
  content              String?  @db.Text
  fileName             String?  @map("file_name") @db.VarChar(255)
  fileType             String?  @map("file_type") @db.VarChar(50)
  fileSize             String?  @map("file_size") @db.VarChar(50)
  fileUrl              String?  @map("file_url") @db.VarChar(255)
  isPublic             Boolean  @default(true) @map("is_public")
  createdAt            DateTime @default(now()) @map("created_at")

  teachingAssignment   TeachingAssignment @relation(fields: [teachingAssignmentId], references: [id], onDelete: Cascade)
  reads                MaterialRead[]

  @@map("materials")
}

model MaterialRead {
  id         Int      @id @default(autoincrement())
  materialId Int      @map("material_id")
  studentId  Int      @map("student_id")
  readAt     DateTime @default(now()) @map("read_at")

  material   Material       @relation(fields: [materialId], references: [id], onDelete: Cascade)
  student    StudentProfile @relation(fields: [studentId], references: [id], onDelete: Cascade)

  @@map("material_reads")
}

model TeachingKit {
  id                   Int      @id @default(autoincrement())
  teachingAssignmentId Int      @map("teaching_assignment_id")
  kitTypeId            Int      @map("kit_type_id")
  title                String   @db.VarChar(200)
  content              String?  @db.Text
  fileName             String?  @map("file_name") @db.VarChar(255)
  fileType             String?  @map("file_type") @db.VarChar(50)
  fileSize             String?  @map("file_size") @db.VarChar(50)
  fileUrl              String?  @map("file_url") @db.VarChar(255)
  isPublished          Boolean  @default(true) @map("is_published")
  createdAt            DateTime @default(now()) @map("created_at")

  teachingAssignment   TeachingAssignment @relation(fields: [teachingAssignmentId], references: [id], onDelete: Cascade)
  kitType              TeachingKitType    @relation(fields: [kitTypeId], references: [id], onDelete: Cascade)

  @@map("teaching_kits")
}

// -------------------------------------------------------------
// 5. UJIAN OBJEKTIF & ANALISIS
// -------------------------------------------------------------
model Exam {
  id              Int      @id @default(autoincrement())
  title           String   @db.VarChar(150)
  examDate        DateTime @map("exam_date") @db.Date
  durationMinutes Int      @map("duration_minutes")
  totalQuestions  Int      @default(0) @map("total_questions")
  isRandom        Boolean  @default(true) @map("is_random")
  type            Int      @default(1)
  examTypeId      Int      @map("exam_type_id")
  teacherId       Int      @map("teacher_id")
  subjectId       Int      @map("subject_id")
  semesterId      Int      @map("semester_id")
  createdAt       DateTime @default(now()) @map("created_at")

  examType        ExamType       @relation(fields: [examTypeId], references: [id], onDelete: Cascade)
  teacher         TeacherProfile @relation(fields: [teacherId], references: [id], onDelete: Cascade)
  subject         Subject        @relation(fields: [subjectId], references: [id], onDelete: Cascade)
  semester        Semester       @relation(fields: [semesterId], references: [id], onDelete: Cascade)

  classes         ExamClass[]
  questions       Question[]
  attempts        ExamAttempt[]
  analyses        AnswerAnalysis[]

  @@map("exams")
}

model ExamClass {
  id       Int     @id @default(autoincrement())
  examId   Int     @map("exam_id")
  classId  Int     @map("class_id")
  majorId  Int     @map("major_id")
  isActive Boolean @default(true) @map("is_active")

  exam     Exam    @relation(fields: [examId], references: [id], onDelete: Cascade)
  class    Class   @relation(fields: [classId], references: [id], onDelete: Cascade)
  major    Major   @relation(fields: [majorId], references: [id], onDelete: Cascade)

  @@unique([examId, classId, majorId])
  @@map("exam_classes")
}

model Question {
  id            Int     @id @default(autoincrement())
  examId        Int     @map("exam_id")
  questionText  String  @map("question_text") @db.Text
  correctOption Int     @map("correct_option") // 1 sampai 5
  isActive      Boolean @default(true) @map("is_active")

  exam          Exam             @relation(fields: [examId], references: [id], onDelete: Cascade)
  options       QuestionOption[]
  answers       ExamAnswer[]
  analyses      AnswerAnalysis[]

  @@map("questions")
}

model QuestionOption {
  id           Int      @id @default(autoincrement())
  questionId   Int      @map("question_id")
  optionNumber Int      @map("option_number") // 1, 2, 3, 4, 5
  optionText   String   @map("option_text") @db.Text

  question     Question @relation(fields: [questionId], references: [id], onDelete: Cascade)

  @@unique([questionId, optionNumber])
  @@map("question_options")
}

model ExamAttempt {
  id             Int       @id @default(autoincrement())
  studentId      Int       @map("student_id")
  examId         Int       @map("exam_id")
  remainingTime  String?   @map("remaining_time") @db.VarChar(30)
  finishedTime   String?   @map("finished_time") @db.VarChar(30)
  correctCount   Int       @default(0) @map("correct_count")
  emptyCount     Int       @default(0) @map("empty_count")
  wrongCount     Int       @default(0) @map("wrong_count")
  score          Float     @default(0)
  createdAt      DateTime  @default(now()) @map("created_at")

  student        StudentProfile @relation(fields: [studentId], references: [id], onDelete: Cascade)
  exam           Exam           @relation(fields: [examId], references: [id], onDelete: Cascade)
  answers        ExamAnswer[]

  @@unique([studentId, examId])
  @@map("exam_attempts")
}

model ExamAnswer {
  id             Int      @id @default(autoincrement())
  attemptId      Int      @map("attempt_id")
  questionId     Int      @map("question_id")
  orderIndex     Int      @map("order_index")
  selectedOption Int      @map("selected_option") // 0 = kosong, 1..5 = pilihan
  isCorrect      Boolean  @default(false) @map("is_correct")

  attempt        ExamAttempt @relation(fields: [attemptId], references: [id], onDelete: Cascade)
  question       Question    @relation(fields: [questionId], references: [id], onDelete: Cascade)

  @@unique([attemptId, questionId])
  @@map("exam_answers")
}

model AnswerAnalysis {
  id           Int      @id @default(autoincrement())
  examId       Int      @map("exam_id")
  questionId   Int      @map("question_id")
  studentId    Int      @map("student_id")
  chosenOption Int      @map("chosen_option")

  exam         Exam           @relation(fields: [examId], references: [id], onDelete: Cascade)
  question     Question       @relation(fields: [questionId], references: [id], onDelete: Cascade)
  student      StudentProfile @relation(fields: [studentId], references: [id], onDelete: Cascade)

  @@map("answer_analyses")
}

// -------------------------------------------------------------
// 6. UJIAN ESSAY
// -------------------------------------------------------------
model EssayExam {
  id             Int      @id @default(autoincrement())
  title          String   @db.VarChar(150)
  examDate       DateTime @map("exam_date") @db.Date
  totalQuestions Int      @default(0) @map("total_questions")
  essayContent   String   @map("essay_content") @db.Text
  examTypeId     Int      @map("exam_type_id")
  teacherId      Int      @map("teacher_id")
  subjectId      Int      @map("subject_id")
  semesterId     Int      @map("semester_id")
  createdAt      DateTime @default(now()) @map("created_at")

  examType       ExamType       @relation(fields: [examTypeId], references: [id], onDelete: Cascade)
  teacher        TeacherProfile @relation(fields: [teacherId], references: [id], onDelete: Cascade)
  subject        Subject        @relation(fields: [subjectId], references: [id], onDelete: Cascade)
  semester       Semester       @relation(fields: [semesterId], references: [id], onDelete: Cascade)

  classes        EssayExamClass[]

  @@map("essay_exams")
}

model EssayExamClass {
  id          Int     @id @default(autoincrement())
  essayExamId Int     @map("essay_exam_id")
  classId     Int     @map("class_id")
  majorId     Int     @map("major_id")
  isActive    Boolean @default(true) @map("is_active")

  essayExam   EssayExam @relation(fields: [essayExamId], references: [id], onDelete: Cascade)
  class       Class     @relation(fields: [classId], references: [id], onDelete: Cascade)
  major       Major     @relation(fields: [majorId], references: [id], onDelete: Cascade)

  @@unique([essayExamId, classId, majorId])
  @@map("essay_exam_classes")
}

// -------------------------------------------------------------
// 7. TUGAS
// -------------------------------------------------------------
model Assignment {
  id               Int      @id @default(autoincrement())
  assignmentTypeId Int      @map("assignment_type_id")
  title            String   @db.VarChar(200)
  instructions     String?  @db.Text
  dueDate          DateTime @map("due_date") @db.Date
  durationDays     Int      @default(1) @map("duration_days")
  maxMembers       Int      @default(1) @map("max_members")
  teacherId        Int      @map("teacher_id")
  subjectId        Int      @map("subject_id")
  semesterId       Int      @map("semester_id")
  createdAt        DateTime @default(now()) @map("created_at")

  assignmentType   AssignmentType @relation(fields: [assignmentTypeId], references: [id], onDelete: Cascade)
  teacher          TeacherProfile @relation(fields: [teacherId], references: [id], onDelete: Cascade)
  subject          Subject        @relation(fields: [subjectId], references: [id], onDelete: Cascade)
  semester         Semester       @relation(fields: [semesterId], references: [id], onDelete: Cascade)

  classes          AssignmentClass[]
  submissions      AssignmentSubmission[]

  @@map("assignments")
}

model AssignmentClass {
  id           Int     @id @default(autoincrement())
  assignmentId Int     @map("assignment_id")
  classId      Int     @map("class_id")
  majorId      Int     @map("major_id")
  isActive     Boolean @default(true) @map("is_active")

  assignment   Assignment @relation(fields: [assignmentId], references: [id], onDelete: Cascade)
  class        Class      @relation(fields: [classId], references: [id], onDelete: Cascade)
  major        Major      @relation(fields: [majorId], references: [id], onDelete: Cascade)

  @@unique([assignmentId, classId, majorId])
  @@map("assignment_classes")
}

model AssignmentSubmission {
  id           Int      @id @default(autoincrement())
  assignmentId Int      @map("assignment_id")
  studentId    Int      @map("student_id")
  subject      String?  @db.VarChar(200)
  groupMembers String?  @map("group_members") @db.Text
  fileName     String?  @map("file_name") @db.VarChar(255)
  fileType     String?  @map("file_type") @db.VarChar(50)
  fileSize     String?  @map("file_size") @db.VarChar(50)
  fileUrl      String?  @map("file_url") @db.VarChar(255)
  notes        String?  @db.Text
  score        Float?
  feedback     String?  @db.Text
  submittedAt  DateTime @default(now()) @map("submitted_at")

  assignment   Assignment     @relation(fields: [assignmentId], references: [id], onDelete: Cascade)
  student      StudentProfile @relation(fields: [studentId], references: [id], onDelete: Cascade)

  @@map("assignment_submissions")
}

// -------------------------------------------------------------
// 8. PESAN / CHAT
// -------------------------------------------------------------
model Message {
  id          Int      @id @default(autoincrement())
  senderId    Int      @map("sender_id")
  recipientId Int?     @map("recipient_id") // null jika pesan grup kelas
  classId     Int?     @map("class_id")
  majorId     Int?     @map("major_id")
  content     String   @db.Text
  isRead      Boolean  @default(false) @map("is_read")
  createdAt   DateTime @default(now()) @map("created_at")

  sender      User     @relation("SentMessages", fields: [senderId], references: [id], onDelete: Cascade)
  recipient   User?    @relation("ReceivedMessages", fields: [recipientId], references: [id], onDelete: Cascade)
  class       Class?   @relation(fields: [classId], references: [id], onDelete: SetNull)
  major       Major?   @relation(fields: [majorId], references: [id], onDelete: SetNull)

  @@map("messages")
}
```

---

## 4. Rencana Validasi Data & Penanganan Inkonsistensi

1. **Deduplikasi Siswa:**
   - Dalam dump lama, beberapa record siswa memiliki NIS yang sama.
   - Skrip ETL akan menyeleksi record terbaru berdasarkan ID terbesar, sementara record lama dicatat dalam log CSV (`student-duplicates.csv`) untuk audit pihak sekolah.
2. **Penguraian CSV Ujian:**
   - Baris `nilai` dengan `acak_soal` dan `jawaban` diparsing menjadi pasangan `(question_id, selected_option)`.
   - Skor dihitung ulang dan diverifikasi terhadap nilai asli `nilai.nilai`.
3. **Pembersihan Tanggal Invalid:**
   - Kolom `tgl_lahir = '0000-00-00'` diubah otomatis menjadi `NULL`.
