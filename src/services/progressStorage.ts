import { GameStats } from '../types';

const PROGRESS_STORAGE_KEY = 'frog_crossing_progress_v1';

export interface WordPracticeStat {
  word: string;
  seenCount: number;      // 预览/出现次数
  completedCount: number; // 成功完整拼写遍数
  mistakeCount: number;   // 拼错按键次数
  lastPracticedAt: number;
}

export interface CourseRecord {
  bestScore: number;
  bestAccuracy: number;
  stars: number; // 0 to 3
  completions: number;
  totalWordsTyped: number;
  totalCorrectKeys: number;
  totalWrongKeys: number;
  totalFrogsSaved: number;
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
  /** Map of courseId -> { [wordLower]: WordPracticeStat } */
  courseWordStats: Record<string, Record<string, WordPracticeStat>>;
  updatedAt: number;
}

export interface PendingWordDelta {
  seen: Record<string, number>;
  completed: Record<string, number>;
  mistakes: Record<string, number>;
  correctKeysDelta: number;
  wrongKeysDelta: number;
  wordsTypedDelta: number;
}

export function createEmptyPendingDelta(): PendingWordDelta {
  return {
    seen: {},
    completed: {},
    mistakes: {},
    correctKeysDelta: 0,
    wrongKeysDelta: 0,
    wordsTypedDelta: 0
  };
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
        courseWordStats: {},
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
      courseWordStats: parsed.courseWordStats ?? {},
      updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : Date.now()
    };
  } catch {
    return {
      activeCourseId: '',
      totalScore: 0,
      totalFrogsSaved: 0,
      currentRound: null,
      courseRecords: {},
      courseWordStats: {},
      updatedAt: Date.now()
    };
  }
}

export function savePersistedProgress(progress: PersistedProgress): void {
  try {
    localStorage.setItem(
      PROGRESS_STORAGE_KEY,
      JSON.stringify({
        ...progress,
        updatedAt: Date.now()
      })
    );
  } catch (e) {
    console.warn('Failed to persist frog crossing progress:', e);
  }
}

function mergeWordDeltas(
  existingCourseWords: Record<string, WordPracticeStat> | undefined,
  delta: PendingWordDelta
): Record<string, WordPracticeStat> {
  const result: Record<string, WordPracticeStat> = { ...(existingCourseWords ?? {}) };
  const now = Date.now();

  const allWords = new Set([
    ...Object.keys(delta.seen),
    ...Object.keys(delta.completed),
    ...Object.keys(delta.mistakes)
  ]);

  for (const w of allWords) {
    const key = w.toLowerCase();
    const prev = result[key] ?? {
      word: w,
      seenCount: 0,
      completedCount: 0,
      mistakeCount: 0,
      lastPracticedAt: now
    };
    const seenAdd = delta.seen[w] ?? 0;
    const compAdd = delta.completed[w] ?? 0;
    const missAdd = delta.mistakes[w] ?? 0;

    result[key] = {
      word: prev.word || w,
      seenCount: Math.max(prev.seenCount + seenAdd, prev.completedCount + compAdd),
      completedCount: prev.completedCount + compAdd,
      mistakeCount: prev.mistakeCount + missAdd,
      lastPracticedAt: now
    };
  }

  return result;
}

/**
 * Called every time a frog safely jumps across the river and reaches the bank.
 * Refreshes round progress, cumulative score, word mastery, and unit accuracy in localStorage.
 */
export function recordFrogCrossed(
  courseId: string,
  stats: GameStats,
  totalFrogsPerRound: number,
  scoreDelta: number,
  wordDelta?: PendingWordDelta
): PersistedProgress {
  const existing = loadPersistedProgress();
  const safeDelta = Math.max(0, scoreDelta);
  const isRoundFinished = stats.frogsSaved >= totalFrogsPerRound;
  const now = Date.now();

  const prevRec = existing.courseRecords[courseId] ?? {
    bestScore: 0,
    bestAccuracy: 0,
    stars: 0,
    completions: 0,
    totalWordsTyped: 0,
    totalCorrectKeys: 0,
    totalWrongKeys: 0,
    totalFrogsSaved: 0,
    lastPlayedAt: now
  };

  const nextRec: CourseRecord = {
    ...prevRec,
    bestScore: Math.max(prevRec.bestScore, stats.score),
    totalWordsTyped: (prevRec.totalWordsTyped ?? 0) + (wordDelta?.wordsTypedDelta ?? 0),
    totalCorrectKeys: (prevRec.totalCorrectKeys ?? 0) + (wordDelta?.correctKeysDelta ?? 0),
    totalWrongKeys: (prevRec.totalWrongKeys ?? 0) + (wordDelta?.wrongKeysDelta ?? 0),
    totalFrogsSaved: (prevRec.totalFrogsSaved ?? 0) + 1,
    lastPlayedAt: now
  };

  const nextWordStats = wordDelta
    ? mergeWordDeltas(existing.courseWordStats[courseId], wordDelta)
    : existing.courseWordStats[courseId] ?? {};

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
          updatedAt: now
        },
    courseRecords: {
      ...existing.courseRecords,
      [courseId]: nextRec
    },
    courseWordStats: {
      ...existing.courseWordStats,
      [courseId]: nextWordStats
    },
    updatedAt: now
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
  const now = Date.now();

  const prevRec = existing.courseRecords[courseId] ?? {
    bestScore: 0,
    bestAccuracy: 0,
    stars: 0,
    completions: 0,
    totalWordsTyped: 0,
    totalCorrectKeys: 0,
    totalWrongKeys: 0,
    totalFrogsSaved: 0,
    lastPlayedAt: now
  };

  const nextRec: CourseRecord = {
    ...prevRec,
    bestScore: Math.max(prevRec.bestScore, stats.score),
    bestAccuracy: Math.max(prevRec.bestAccuracy, accuracy),
    stars: Math.max(prevRec.stars, stars),
    completions: prevRec.completions + 1,
    lastPlayedAt: now
  };

  const updated: PersistedProgress = {
    ...existing,
    activeCourseId: courseId,
    currentRound: null,
    courseRecords: {
      ...existing.courseRecords,
      [courseId]: nextRec
    },
    updatedAt: now
  };

  savePersistedProgress(updated);
  return updated;
}

/**
 * Clears the current unfinished round progress (e.g. on manual Restart or course switch)
 * while keeping cumulative score, word mastery, and course completion records intact.
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
