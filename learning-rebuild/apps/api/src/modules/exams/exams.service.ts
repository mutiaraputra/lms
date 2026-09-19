import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { prisma } from '@lms/database';

@Injectable()
export class ExamsService {
  async findAll(classId?: number, majorId?: number) {
    return prisma.exam.findMany({
      where: {
        classes: classId && majorId ? {
          some: {
            classId,
            majorId,
            isActive: true
          }
        } : undefined
      },
      include: {
        teacher: { include: { user: true } },
        subject: true,
        semester: true,
        examType: true,
        classes: {
          include: {
            class: true,
            major: true
          }
        },
        _count: {
          select: { questions: true }
        }
      },
      orderBy: { examDate: 'desc' }
    });
  }

  async findOne(id: number, isStudent = false) {
    const exam = await prisma.exam.findUnique({
      where: { id },
      include: {
        teacher: { include: { user: true } },
        subject: true,
        semester: true,
        examType: true,
        questions: {
          where: { isActive: true },
          include: {
            options: {
              orderBy: { optionNumber: 'asc' }
            }
          }
        }
      }
    });

    if (!exam) {
      throw new NotFoundException('Ujian tidak ditemukan');
    }

    // Jika siswa yang mengakses, sembunyikan kunci jawaban
    if (isStudent) {
      const sanitizedQuestions = exam.questions.map(q => ({
        id: q.id,
        examId: q.examId,
        questionText: q.questionText,
        options: q.options.map(opt => ({
          id: opt.id,
          optionNumber: opt.optionNumber,
          optionText: opt.optionText
        }))
      }));

      return {
        ...exam,
        questions: sanitizedQuestions
      };
    }

    return exam;
  }

  async submitExam(
    examId: number,
    studentId: number,
    answers: Array<{ questionId: number; selectedOption: number }>
  ) {
    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      include: {
        questions: { where: { isActive: true } }
      }
    });

    if (!exam) {
      throw new NotFoundException('Ujian tidak ditemukan');
    }

    const questionMap = new Map<number, number>();
    for (const q of exam.questions) {
      questionMap.set(q.id, q.correctOption);
    }

    let correctCount = 0;
    let emptyCount = 0;
    let wrongCount = 0;

    const answerRecords: Array<{
      questionId: number;
      orderIndex: number;
      selectedOption: number;
      isCorrect: boolean;
    }> = [];

    answers.forEach((ans, idx) => {
      const correct = questionMap.get(ans.questionId);
      if (!ans.selectedOption || ans.selectedOption === 0) {
        emptyCount++;
        answerRecords.push({
          questionId: ans.questionId,
          orderIndex: idx + 1,
          selectedOption: 0,
          isCorrect: false
        });
      } else if (ans.selectedOption === correct) {
        correctCount++;
        answerRecords.push({
          questionId: ans.questionId,
          orderIndex: idx + 1,
          selectedOption: ans.selectedOption,
          isCorrect: true
        });
      } else {
        wrongCount++;
        answerRecords.push({
          questionId: ans.questionId,
          orderIndex: idx + 1,
          selectedOption: ans.selectedOption,
          isCorrect: false
        });
      }
    });

    const total = exam.questions.length || 1;
    const score = parseFloat(((correctCount / total) * 100).toFixed(2));

    const attempt = await prisma.examAttempt.upsert({
      where: {
        studentId_examId: {
          studentId,
          examId
        }
      },
      create: {
        studentId,
        examId,
        correctCount,
        emptyCount,
        wrongCount,
        score
      },
      update: {
        correctCount,
        emptyCount,
        wrongCount,
        score
      }
    });

    for (const rec of answerRecords) {
      await prisma.examAnswer.upsert({
        where: {
          attemptId_questionId: {
            attemptId: attempt.id,
            questionId: rec.questionId
          }
        },
        create: {
          attemptId: attempt.id,
          questionId: rec.questionId,
          orderIndex: rec.orderIndex,
          selectedOption: rec.selectedOption,
          isCorrect: rec.isCorrect
        },
        update: {
          orderIndex: rec.orderIndex,
          selectedOption: rec.selectedOption,
          isCorrect: rec.isCorrect
        }
      });
    }

    return {
      message: 'Ujian berhasil diselesaikan dan dinilai',
      score,
      correctCount,
      wrongCount,
      emptyCount,
      totalQuestions: total
    };
  }
}
