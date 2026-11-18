import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { UnitCourse, GameSettings, GameInputMode, GameStats } from './types';
import { BUILTIN_TEXTBOOKS } from './data/curriculumData';
import { RiverGame } from './components/RiverGame';
import { TopNavBar } from './components/TopNavBar';
import { VirtualKeyboard } from './components/VirtualKeyboard';
import { SettingsModal } from './components/SettingsModal';
import { CourseManagerModal } from './components/CourseManagerModal';
import { LearningStatsModal } from './components/LearningStatsModal';
import { VictoryModal } from './components/VictoryModal';
import { GameOverModal } from './components/GameOverModal';
import { soundEngine } from './services/soundEngine';
import { speechEngine } from './services/speechEngine';
import {
  loadPersistedProgress,
  recordFrogCrossed,
  recordRoundVictory,
  clearCurrentRoundProgress,
  createEmptyPendingDelta,
  PersistedProgress,
  PendingWordDelta
} from './services/progressStorage';

const DEFAULT_SETTINGS: GameSettings = {
  difficulty: 'normal',
  inputMode: 'voice',
  soundVolume: 0.8,
  sfxEnabled: true,
  ttsEnabled: true,
  showVirtualKeyboard: true,
  showFingerGuide: true,
  showChinesePrompt: true,
  totalFrogsPerRound: 5,
  driftSpeedMultiplier: 1.0
};

const SETTINGS_VERSION_KEY = 'frog_crossing_settings_version';
const CURRENT_SETTINGS_VERSION = '2';

function loadInitialCustomCourses(): UnitCourse[] {
  try {
    const saved = localStorage.getItem('frog_crossing_custom_courses');
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function loadInitialSettings(): GameSettings {
  try {
    const saved = localStorage.getItem('frog_crossing_settings');
    const savedVer = localStorage.getItem(SETTINGS_VERSION_KEY);
    if (!saved) {
      localStorage.setItem(SETTINGS_VERSION_KEY, CURRENT_SETTINGS_VERSION);
      return DEFAULT_SETTINGS;
    }
    const merged: GameSettings = { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    // One-time migration: adopt Voice Mode as the new default for returning browsers
    if (savedVer !== CURRENT_SETTINGS_VERSION) {
      merged.inputMode = 'voice';
      localStorage.setItem(SETTINGS_VERSION_KEY, CURRENT_SETTINGS_VERSION);
      localStorage.setItem('frog_crossing_settings', JSON.stringify(merged));
    }
    return merged;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function findCourseById(courseId: string, customCourses: UnitCourse[]): UnitCourse | null {
  if (!courseId) return null;
  const builtin = BUILTIN_TEXTBOOKS.flatMap((t) => t.units).find((u) => u.id === courseId);
  if (builtin) return builtin;
  return customCourses.find((c) => c.id === courseId) || null;
}

export const App: React.FC = () => {
  const initialCustomCourses = useRef<UnitCourse[]>(loadInitialCustomCourses());
  const initialSettings = useRef<GameSettings>(loadInitialSettings());
  const initialProgress = useRef<PersistedProgress>(loadPersistedProgress());

  // Custom Courses stored in LocalStorage
  const [customCourses, setCustomCourses] = useState<UnitCourse[]>(initialCustomCourses.current);

  // Settings State
  const [settings, setSettings] = useState<GameSettings>(initialSettings.current);

  // Persisted Progress State (refreshed on every frog crossing / victory / restart)
  const [persistedProgress, setPersistedProgress] = useState<PersistedProgress>(initialProgress.current);

  // Course State: Restore last active course from localStorage, fallback to 《新交际英语 二年级上册》 Unit 1
  const [currentCourse, setCurrentCourse] = useState<UnitCourse>(() => {
    const restored = findCourseById(initialProgress.current.activeCourseId, initialCustomCourses.current);
    return restored || BUILTIN_TEXTBOOKS[0].units[0];
  });

  // Check if there is a valid unfinished round in localStorage for the active course
  const restoredRound =
    initialProgress.current.currentRound &&
    initialProgress.current.currentRound.courseId === currentCourse.id &&
    initialProgress.current.currentRound.frogsSaved > 0 &&
    initialProgress.current.currentRound.frogsSaved < initialSettings.current.totalFrogsPerRound
      ? initialProgress.current.currentRound
      : null;

  const [initialFrogsSaved, setInitialFrogsSaved] = useState<number>(restoredRound?.frogsSaved ?? 0);
  const [saveToast, setSaveToast] = useState<string | null>(null);

  // Game Stats State (restored from localStorage if mid-round)
  const [stats, setStats] = useState<GameStats>(() => ({
    score: restoredRound?.score ?? 0,
    combo: restoredRound?.combo ?? 0,
    maxCombo: restoredRound?.maxCombo ?? 0,
    correctKeystrokes: restoredRound?.correctKeystrokes ?? 0,
    wrongKeystrokes: restoredRound?.wrongKeystrokes ?? 0,
    wordsCompleted: restoredRound?.wordsCompleted ?? 0,
    frogsSaved: restoredRound?.frogsSaved ?? 0,
    frogsLost: restoredRound?.frogsLost ?? 0,
    startTime: Date.now(),
    endTime: null
  }));

  // In-flight per-word learning delta (flushed to localStorage every time a frog crosses the river)
  const [pendingDelta, setPendingDelta] = useState<PendingWordDelta>(() => createEmptyPendingDelta());
  const pendingDeltaRef = useRef<PendingWordDelta>(pendingDelta);

  // Refs for synchronous access during frog-crossing persistence
  const statsRef = useRef<GameStats>(stats);
  const currentCourseRef = useRef<UnitCourse>(currentCourse);
  const settingsRef = useRef<GameSettings>(settings);
  const lastSavedRoundScoreRef = useRef<number>(restoredRound?.score ?? 0);
  const lastSavedCorrectKeysRef = useRef<number>(restoredRound?.correctKeystrokes ?? 0);
  const lastSavedWrongKeysRef = useRef<number>(restoredRound?.wrongKeystrokes ?? 0);
  const lastSavedWordsRef = useRef<number>(restoredRound?.wordsCompleted ?? 0);

  statsRef.current = stats;
  currentCourseRef.current = currentCourse;
  settingsRef.current = settings;

  // Game Lifecycle States
  const [isPaused, setIsPaused] = useState(false);
  const [gameKey, setGameKey] = useState(0); // increment to force restart river
  const [nextChar, setNextChar] = useState<string | null>(null);
  // Persists across RiverGame remounts (next unit / restart) so microphone stays open once activated
  const [voiceMicActive, setVoiceMicActive] = useState<boolean>(false);

  // If browser microphone permission is already granted and app starts in Voice Mode, auto-enable mic seamlessly
  useEffect(() => {
    if (initialSettings.current.inputMode !== 'voice') return;
    if (typeof navigator === 'undefined' || !navigator.permissions?.query) return;
    let cancelled = false;
    navigator.permissions
      .query({ name: 'microphone' as PermissionName })
      .then((status) => {
        if (!cancelled && status.state === 'granted') {
          setVoiceMicActive(true);
        }
      })
      .catch(() => {
        // Safari/older browsers may not support microphone permission query; user clicks the inviting CTA button
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCourseManagerOpen, setIsCourseManagerOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [isVictoryOpen, setIsVictoryOpen] = useState(false);
  const [isGameOverOpen, setIsGameOverOpen] = useState(false);

  // Sync sound settings with engines
  useEffect(() => {
    soundEngine.setMuted(!settings.sfxEnabled);
    soundEngine.setVolume(settings.soundVolume);
    speechEngine.setEnabled(settings.ttsEnabled);
    try {
      localStorage.setItem('frog_crossing_settings', JSON.stringify(settings));
    } catch {}
  }, [settings]);

  const showSavedToast = useCallback((msg: string) => {
    setSaveToast(msg);
    setTimeout(() => {
      setSaveToast((curr) => (curr === msg ? null : curr));
    }, 2000);
  }, []);

  // Word-level learning telemetry callbacks (live in memory + persisted when frog crosses)
  const handleWordSeen = useCallback((word: string) => {
    const key = word.toLowerCase();
    const cur = pendingDeltaRef.current;
    const next: PendingWordDelta = {
      ...cur,
      seen: { ...cur.seen, [key]: (cur.seen[key] ?? 0) + 1 }
    };
    pendingDeltaRef.current = next;
    setPendingDelta(next);
  }, []);

  const handleWordCompleted = useCallback((word: string) => {
    const key = word.toLowerCase();
    const cur = pendingDeltaRef.current;
    const next: PendingWordDelta = {
      ...cur,
      completed: { ...cur.completed, [key]: (cur.completed[key] ?? 0) + 1 }
    };
    pendingDeltaRef.current = next;
    setPendingDelta(next);
  }, []);

  const handleWordMistake = useCallback((word: string) => {
    const key = word.toLowerCase();
    const cur = pendingDeltaRef.current;
    const next: PendingWordDelta = {
      ...cur,
      mistakes: { ...cur.mistakes, [key]: (cur.mistakes[key] ?? 0) + 1 }
    };
    pendingDeltaRef.current = next;
    setPendingDelta(next);
  }, []);

  // Sync custom courses with storage
  const handleAddCustomCourse = (course: UnitCourse) => {
    const updated = [course, ...customCourses];
    setCustomCourses(updated);
    try {
      localStorage.setItem('frog_crossing_custom_courses', JSON.stringify(updated));
    } catch {}
  };

  const handleDeleteCustomCourse = (id: string) => {
    const updated = customCourses.filter((c) => c.id !== id);
    setCustomCourses(updated);
    try {
      localStorage.setItem('frog_crossing_custom_courses', JSON.stringify(updated));
    } catch {}
  };

  const handleUpdateSettings = (partial: Partial<GameSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
    if (partial.inputMode === 'voice') {
      setVoiceMicActive(true);
    } else if (partial.inputMode === 'typing') {
      setVoiceMicActive(false);
    }
  };

  const handleSetInputMode = useCallback((mode: GameInputMode) => {
    setSettings((prev) => ({ ...prev, inputMode: mode }));
    setVoiceMicActive(mode === 'voice');
  }, []);

  const handleResetDefaults = () => {
    setSettings(DEFAULT_SETTINGS);
    setVoiceMicActive(false);
  };

  // Restart Game (clears unfinished round progress in localStorage while preserving cumulative totalScore & word history)
  const handleRestart = useCallback((targetCourseId?: string) => {
    const courseId = targetCourseId ?? currentCourseRef.current.id;
    const updatedProgress = clearCurrentRoundProgress(courseId);
    setPersistedProgress(updatedProgress);

    lastSavedRoundScoreRef.current = 0;
    lastSavedCorrectKeysRef.current = 0;
    lastSavedWrongKeysRef.current = 0;
    lastSavedWordsRef.current = 0;

    const emptyDelta = createEmptyPendingDelta();
    pendingDeltaRef.current = emptyDelta;
    setPendingDelta(emptyDelta);

    setInitialFrogsSaved(0);
    setStats({
      score: 0,
      combo: 0,
      maxCombo: 0,
      correctKeystrokes: 0,
      wrongKeystrokes: 0,
      wordsCompleted: 0,
      frogsSaved: 0,
      frogsLost: 0,
      startTime: Date.now(),
      endTime: null
    });
    setIsVictoryOpen(false);
    setIsGameOverOpen(false);
    setIsPaused(false);
    setGameKey((k) => k + 1);
  }, []);

  // Course Switch
  const handleSelectCourse = (course: UnitCourse) => {
    setCurrentCourse(course);
    currentCourseRef.current = course;
    handleRestart(course.id);
  };

  // Victory handler
  const handleVictory = useCallback(() => {
    const finalStats: GameStats = { ...statsRef.current, endTime: Date.now() };
    setStats(finalStats);
    const updatedProgress = recordRoundVictory(currentCourseRef.current.id, finalStats);
    setPersistedProgress(updatedProgress);
    soundEngine.playVictoryFanfare();
    setIsVictoryOpen(true);
  }, []);

  // Frog lost handler
  const handleFrogLost = useCallback(() => {
    setStats((prev) => {
      const lost = prev.frogsLost + 1;
      if (settingsRef.current.difficulty === 'hard' && lost >= 3) {
        setTimeout(() => setIsGameOverOpen(true), 800);
      }
      return {
        ...prev,
        frogsLost: lost
      };
    });
  }, []);

  // Every time a frog jumps across and lands on the bank: immediately refresh score, progress & word stats in localStorage!
  const handleFrogReachBank = useCallback(() => {
    const prev = statsRef.current;
    const nextStats: GameStats = {
      ...prev,
      frogsSaved: prev.frogsSaved + 1
    };
    statsRef.current = nextStats;
    setStats(nextStats);

    const scoreDelta = Math.max(0, nextStats.score - lastSavedRoundScoreRef.current);
    const correctKeysDelta = Math.max(0, nextStats.correctKeystrokes - lastSavedCorrectKeysRef.current);
    const wrongKeysDelta = Math.max(0, nextStats.wrongKeystrokes - lastSavedWrongKeysRef.current);
    const wordsTypedDelta = Math.max(0, nextStats.wordsCompleted - lastSavedWordsRef.current);

    lastSavedRoundScoreRef.current = nextStats.score;
    lastSavedCorrectKeysRef.current = nextStats.correctKeystrokes;
    lastSavedWrongKeysRef.current = nextStats.wrongKeystrokes;
    lastSavedWordsRef.current = nextStats.wordsCompleted;

    const flushDelta: PendingWordDelta = {
      ...pendingDeltaRef.current,
      correctKeysDelta,
      wrongKeysDelta,
      wordsTypedDelta
    };

    const persisted = recordFrogCrossed(
      currentCourseRef.current.id,
      nextStats,
      settingsRef.current.totalFrogsPerRound,
      scoreDelta,
      flushDelta
    );

    const emptyDelta = createEmptyPendingDelta();
    pendingDeltaRef.current = emptyDelta;
    setPendingDelta(emptyDelta);
    setPersistedProgress(persisted);

    showSavedToast(
      `💾 进度已保存 (${nextStats.frogsSaved}/${settingsRef.current.totalFrogsPerRound}) · 总积分 ${persisted.totalScore}`
    );
  }, [showSavedToast]);

  // Find next unit in the same textbook
  const handleNextUnit = () => {
    const allUnits = BUILTIN_TEXTBOOKS.flatMap((t) => t.units);
    const currentIndex = allUnits.findIndex((u) => u.id === currentCourse.id);
    if (currentIndex >= 0 && currentIndex < allUnits.length - 1) {
      handleSelectCourse(allUnits[currentIndex + 1]);
    } else {
      handleRestart();
    }
  };

  // Compute live keystroke accuracy & unit learning summary for HUD and Bottom Bank strip
  const livePendingDeltaWithKeys = useMemo<PendingWordDelta>(() => {
    return {
      ...pendingDelta,
      correctKeysDelta: Math.max(0, stats.correctKeystrokes - lastSavedCorrectKeysRef.current),
      wrongKeysDelta: Math.max(0, stats.wrongKeystrokes - lastSavedWrongKeysRef.current),
      wordsTypedDelta: Math.max(0, stats.wordsCompleted - lastSavedWordsRef.current)
    };
  }, [pendingDelta, stats.correctKeystrokes, stats.wrongKeystrokes, stats.wordsCompleted]);

  const liveAccuracy = useMemo(() => {
    const roundKeys = stats.correctKeystrokes + stats.wrongKeystrokes;
    if (roundKeys > 0) {
      return Math.round((stats.correctKeystrokes / roundKeys) * 100);
    }
    const rec = persistedProgress.courseRecords[currentCourse.id];
    const savedKeys = (rec?.totalCorrectKeys ?? 0) + (rec?.totalWrongKeys ?? 0);
    if (savedKeys > 0 && rec) {
      return Math.round((rec.totalCorrectKeys / savedKeys) * 100);
    }
    return 100;
  }, [stats.correctKeystrokes, stats.wrongKeystrokes, persistedProgress.courseRecords, currentCourse.id]);

  const learningSummary = useMemo(() => {
    const tb = BUILTIN_TEXTBOOKS.find((b) => b.units.some((u) => u.id === currentCourse.id));
    const unitIdx = tb ? tb.units.findIndex((u) => u.id === currentCourse.id) : -1;
    const unitLabel = tb && unitIdx >= 0 ? `第 ${unitIdx + 1}/${tb.units.length} 单元` : '自定义单元';

    const savedWords = persistedProgress.courseWordStats[currentCourse.id] ?? {};
    let previewedCount = 0;
    let practicedTimes = 0;

    for (const item of currentCourse.words) {
      const key = item.word.toLowerCase();
      const saved = savedWords[key];
      const seen = (saved?.seenCount ?? 0) + (pendingDelta.seen[key] ?? 0);
      const comp = (saved?.completedCount ?? 0) + (pendingDelta.completed[key] ?? 0);
      if (seen > 0 || comp > 0) previewedCount++;
      practicedTimes += comp;
    }

    return {
      unitLabel,
      previewedCount,
      totalVocab: currentCourse.words.length,
      practicedTimes,
      accuracy: liveAccuracy
    };
  }, [currentCourse, persistedProgress.courseWordStats, pendingDelta, liveAccuracy]);

  return (
    <div className="flex flex-col h-[100dvh] w-screen bg-slate-900 text-slate-100 overflow-hidden font-sans select-none">
      {/* Top HUD / Navigation */}
      <TopNavBar
        currentCourse={currentCourse}
        score={stats.score}
        totalScore={persistedProgress.totalScore}
        accuracy={liveAccuracy}
        combo={stats.combo}
        frogsSaved={stats.frogsSaved}
        totalFrogs={settings.totalFrogsPerRound}
        frogsLost={stats.frogsLost}
        isPaused={isPaused}
        settings={settings}
        onTogglePause={() => setIsPaused(!isPaused)}
        onRestart={() => handleRestart()}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenCourseManager={() => setIsCourseManagerOpen(true)}
        onOpenStats={() => setIsStatsOpen(true)}
        onToggleSound={() => handleUpdateSettings({ sfxEnabled: !settings.sfxEnabled })}
        onToggleTts={() => handleUpdateSettings({ ttsEnabled: !settings.ttsEnabled })}
        onSetInputMode={handleSetInputMode}
      />

      {/* LocalStorage Auto-Save Toast Notification */}
      {saveToast && (
        <div className="fixed top-14 sm:top-16 right-3 sm:right-6 z-50 bg-emerald-950/90 border border-emerald-400/60 text-emerald-100 px-3 py-1.5 rounded-full text-xs font-bold shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200 pointer-events-none">
          {saveToast}
        </div>
      )}

      {/* Main River Game Canvas */}
      <div className="relative flex-1 flex flex-col overflow-hidden">
        <RiverGame
          key={gameKey}
          currentCourse={currentCourse}
          settings={settings}
          initialFrogsSaved={initialFrogsSaved}
          learningSummary={learningSummary}
          isPaused={
            isPaused ||
            isVictoryOpen ||
            isGameOverOpen ||
            isSettingsOpen ||
            isCourseManagerOpen ||
            isStatsOpen
          }
          onUpdateStats={setStats}
          onVictory={handleVictory}
          onGameOver={() => setIsGameOverOpen(true)}
          onNextCharChange={setNextChar}
          onFrogReachBank={handleFrogReachBank}
          onFrogLost={handleFrogLost}
          onWordSeen={handleWordSeen}
          onWordCompleted={handleWordCompleted}
          onWordMistake={handleWordMistake}
          onOpenStats={() => setIsStatsOpen(true)}
          onSwitchInputMode={handleSetInputMode}
          voiceMicActive={voiceMicActive}
          onVoiceMicActiveChange={setVoiceMicActive}
        />

        {/* Pause Overlay */}
        {isPaused && (
          <div className="absolute inset-0 z-40 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center">
            <div className="bg-slate-900 border border-emerald-500/60 p-6 rounded-2xl shadow-2xl text-center space-y-4">
              <span className="text-4xl block">⏸️</span>
              <h3 className="text-xl font-bold text-emerald-200">游戏已暂停</h3>
              <p className="text-xs text-slate-400">喝口水休息一下眼睛，准备好了随时继续！</p>
              <button
                onClick={() => setIsPaused(false)}
                className="px-6 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow cursor-pointer"
              >
                继续游戏
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Virtual Keyboard Guide (Typing mode only; Voice mode shows VoiceControlPanel) */}
      {settings.inputMode !== 'voice' && settings.showVirtualKeyboard && (
        <div className="shrink-0 z-20">
          <VirtualKeyboard
            nextChar={nextChar}
            showFingerGuide={settings.showFingerGuide}
            onKeyPress={(char) => {
              window.dispatchEvent(new KeyboardEvent('keydown', { key: char }));
            }}
          />
        </div>
      )}

      {/* Modals */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        onResetDefaults={handleResetDefaults}
      />

      <CourseManagerModal
        isOpen={isCourseManagerOpen}
        onClose={() => setIsCourseManagerOpen(false)}
        currentCourseId={currentCourse.id}
        onSelectCourse={handleSelectCourse}
        customCourses={customCourses}
        onAddCustomCourse={handleAddCustomCourse}
        onDeleteCustomCourse={handleDeleteCustomCourse}
        progress={persistedProgress}
      />

      <LearningStatsModal
        isOpen={isStatsOpen}
        onClose={() => setIsStatsOpen(false)}
        currentCourse={currentCourse}
        stats={stats}
        progress={persistedProgress}
        pendingDelta={livePendingDeltaWithKeys}
        onSelectCourse={handleSelectCourse}
      />

      <VictoryModal
        isOpen={isVictoryOpen}
        stats={stats}
        currentCourse={currentCourse}
        onPlayAgain={() => handleRestart()}
        onNextUnit={handleNextUnit}
        onChangeCourse={() => {
          setIsVictoryOpen(false);
          setIsCourseManagerOpen(true);
        }}
      />

      <GameOverModal
        isOpen={isGameOverOpen}
        stats={stats}
        currentCourse={currentCourse}
        onRetry={() => handleRestart()}
        onSwitchToEasy={() => {
          handleUpdateSettings({ difficulty: 'easy' });
          handleRestart();
        }}
        onChangeCourse={() => {
          setIsGameOverOpen(false);
          setIsCourseManagerOpen(true);
        }}
      />
    </div>
  );
};

export default App;
