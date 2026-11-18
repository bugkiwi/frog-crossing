import { GameStats } from '../types';

const PROGRESS_STORAGE_KEY = 'frog_crossing_progress_v1';

export interface CourseRecord {
  bestScore: number;
  bestAccuracy: number;
  stars: number; // 1 to 3
  completions: number;
  lastPlayedAt: number;
}

export interface RoundProgress {
  courseId: string;
  frogsSaved: number;
  totalFrogsPerRound: number;
  score: number;
  combo: number;
  maxCombo: number;
  correctKeystrokes: number;
  wrongKeystrokes: number;
  wordsCompleted: number;
  frogsLost: number;
  updatedAt: number;
}

export interface PersistedProgress {
  activeCourseId: string;
  totalScore: number;
  totalFrogsSaved: number;
  currentRound: RoundProgress | null;
  courseRecords: Record<string, CourseRecord>;
  updatedAt: number;
}

export function loadPersistedProgress(): PersistedProgress {
  try {
    const raw = localStorage.getItem(PROGRESS_STORAGE_KEY);
    if (!raw) {
      return {
        activeCourseId: '',
        totalScore: 0,
        totalFrogsSaved: 0,
        currentRound: null,
        courseRecords: {},
        updatedAt: Date.now()
      };
    }
    const parsed = JSON.parse(raw) as Partial<PersistedProgress>;
    return {
      activeCourseId: typeof parsed.activeCourseId === 'string' ? parsed.activeCourseId : '',
      totalScore: typeof parsed.totalScore === 'number' ? parsed.totalScore : 0,
      totalFrogsSaved: typeof parsed.totalFrogsSaved === 'number' ? parsed.totalFrogsSaved : 0,
      currentRound: parsed.currentRound ?? null,
      courseRecords: parsed.courseRecords ?? {},
      updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : Date.now()
    };
  } catch {
    return {
      activeCourseId: '',
      totalScore: 0,
      totalFrogsSaved: 0,
      currentRound: null,
      courseRecords: {},
      updatedAt: Date.now()
    };
  }
}

export function savePersistedProgress(progress: PersistedProgress): void {
  try {
    localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify({
      ...progress,
      updatedAt: Date.now()
    }));
  } catch (e) {
    console.warn('Failed to persist frog crossing progress:', e);
  }
}

/**
 * Called every time a frog safely jumps across the river and reaches the bank.
 * Refreshes both round progress and cumulative score/frog totals in localStorage.
 */
export function recordFrogCrossed(
  courseId: string,
  stats: GameStats,
  totalFrogsPerRound: number,
  scoreDelta: number
): PersistedProgress {
  const existing = loadPersistedProgress();
  const safeDelta = Math.max(0, scoreDelta);
  const isRoundFinished = stats.frogsSaved >= totalFrogsPerRound;

  const updated: PersistedProgress = {
    ...existing,
    activeCourseId: courseId,
    totalScore: existing.totalScore + safeDelta,
    totalFrogsSaved: existing.totalFrogsSaved + 1,
    currentRound: isRoundFinished
      ? null
      : {
          courseId,
          frogsSaved: stats.frogsSaved,
          totalFrogsPerRound,
          score: stats.score,
          combo: stats.combo,
          maxCombo: stats.maxCombo,
          correctKeystrokes: stats.correctKeystrokes,
          wrongKeystrokes: stats.wrongKeystrokes,
          wordsCompleted: stats.wordsCompleted,
          frogsLost: stats.frogsLost,
          updatedAt: Date.now()
        },
    updatedAt: Date.now()
  };

  savePersistedProgress(updated);
  return updated;
}

/**
 * Called when a full round is completed to record stars & best accuracy for the course.
 */
export function recordRoundVictory(courseId: string, stats: GameStats): PersistedProgress {
  const existing = loadPersistedProgress();
  const totalKeys = stats.correctKeystrokes + stats.wrongKeystrokes;
  const accuracy = totalKeys > 0 ? Math.round((stats.correctKeystrokes / totalKeys) * 100) : 100;
  const stars = accuracy >= 95 ? 3 : accuracy >= 80 ? 2 : 1;

  const prevRec = existing.courseRecords[courseId];
  const nextRec: CourseRecord = {
    bestScore: Math.max(prevRec?.bestScore ?? 0, stats.score),
    bestAccuracy: Math.max(prevRec?.bestAccuracy ?? 0, accuracy),
    stars: Math.max(prevRec?.stars ?? 0, stars),
    completions: (prevRec?.completions ?? 0) + 1,
    lastPlayedAt: Date.now()
  };

  const updated: PersistedProgress = {
    ...existing,
    activeCourseId: courseId,
    currentRound: null,
    courseRecords: {
      ...existing.courseRecords,
      [courseId]: nextRec
    },
    updatedAt: Date.now()
  };

  savePersistedProgress(updated);
  return updated;
}

/**
 * Clears the current unfinished round progress (e.g. on manual Restart or course switch)
 * while keeping cumulative score and course completion records intact.
 */
export function clearCurrentRoundProgress(newCourseId?: string): PersistedProgress {
  const existing = loadPersistedProgress();
  const updated: PersistedProgress = {
    ...existing,
    activeCourseId: newCourseId ?? existing.activeCourseId,
    currentRound: null,
    updatedAt: Date.now()
  };
  savePersistedProgress(updated);
  return updated;
}
