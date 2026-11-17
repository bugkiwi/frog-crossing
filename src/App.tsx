import React, { useState, useEffect, useCallback } from 'react';
import { UnitCourse, GameSettings, GameStats } from './types';
import { BUILTIN_TEXTBOOKS } from './data/curriculumData';
import { RiverGame } from './components/RiverGame';
import { TopNavBar } from './components/TopNavBar';
import { VirtualKeyboard } from './components/VirtualKeyboard';
import { SettingsModal } from './components/SettingsModal';
import { CourseManagerModal } from './components/CourseManagerModal';
import { VictoryModal } from './components/VictoryModal';
import { GameOverModal } from './components/GameOverModal';
import { soundEngine } from './services/soundEngine';
import { speechEngine } from './services/speechEngine';

const DEFAULT_SETTINGS: GameSettings = {
  difficulty: 'normal',
  soundVolume: 0.8,
  sfxEnabled: true,
  ttsEnabled: true,
  showVirtualKeyboard: true,
  showFingerGuide: true,
  showChinesePrompt: true,
  totalFrogsPerRound: 5,
  driftSpeedMultiplier: 1.0
};

export const App: React.FC = () => {
  // Course State: Default to 《新交际英语 二年级上册》 Unit 1
  const [currentCourse, setCurrentCourse] = useState<UnitCourse>(() => {
    return BUILTIN_TEXTBOOKS[0].units[0];
  });

  // Custom Courses stored in LocalStorage
  const [customCourses, setCustomCourses] = useState<UnitCourse[]>(() => {
    try {
      const saved = localStorage.getItem('frog_crossing_custom_courses');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Settings State
  const [settings, setSettings] = useState<GameSettings>(() => {
    try {
      const saved = localStorage.getItem('frog_crossing_settings');
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  // Game Stats State
  const [stats, setStats] = useState<GameStats>({
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

  // Game Lifecycle States
  const [isPaused, setIsPaused] = useState(false);
  const [gameKey, setGameKey] = useState(0); // increment to force restart river
  const [nextChar, setNextChar] = useState<string | null>(null);

  // Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCourseManagerOpen, setIsCourseManagerOpen] = useState(false);
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
  };

  const handleResetDefaults = () => {
    setSettings(DEFAULT_SETTINGS);
  };

  // Restart Game
  const handleRestart = useCallback(() => {
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
    handleRestart();
  };

  // Victory handler
  const handleVictory = () => {
    setStats((prev) => ({ ...prev, endTime: Date.now() }));
    soundEngine.playVictoryFanfare();
    setIsVictoryOpen(true);
  };

  // Frog lost handler (if all frogs lost or lost too many)
  const handleFrogLost = () => {
    setStats((prev) => {
      const lost = prev.frogsLost + 1;
      // In hard or normal mode, if too many frogs lost, trigger game over
      if (settings.difficulty === 'hard' && lost >= 3) {
        setTimeout(() => setIsGameOverOpen(true), 800);
      }
      return {
        ...prev,
        frogsLost: lost
      };
    });
  };

  const handleFrogReachBank = () => {
    setStats((prev) => ({
      ...prev,
      frogsSaved: prev.frogsSaved + 1
    }));
  };

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

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-900 text-slate-100 overflow-hidden font-sans select-none">
      {/* Top HUD / Navigation */}
      <TopNavBar
        currentCourse={currentCourse}
        score={stats.score}
        combo={stats.combo}
        frogsSaved={stats.frogsSaved}
        totalFrogs={settings.totalFrogsPerRound}
        frogsLost={stats.frogsLost}
        isPaused={isPaused}
        settings={settings}
        onTogglePause={() => setIsPaused(!isPaused)}
        onRestart={handleRestart}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenCourseManager={() => setIsCourseManagerOpen(true)}
        onToggleSound={() => handleUpdateSettings({ sfxEnabled: !settings.sfxEnabled })}
        onToggleTts={() => handleUpdateSettings({ ttsEnabled: !settings.ttsEnabled })}
      />

      {/* Main River Game Canvas */}
      <div className="relative flex-1 flex flex-col overflow-hidden">
        <RiverGame
          key={gameKey}
          currentCourse={currentCourse}
          settings={settings}
          isPaused={isPaused || isVictoryOpen || isGameOverOpen || isSettingsOpen || isCourseManagerOpen}
          onUpdateStats={setStats}
          onVictory={handleVictory}
          onGameOver={() => setIsGameOverOpen(true)}
          onNextCharChange={setNextChar}
          onFrogReachBank={handleFrogReachBank}
          onFrogLost={handleFrogLost}
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

      {/* Bottom Virtual Keyboard Guide (Optional / Toggleable) */}
      {settings.showVirtualKeyboard && (
        <div className="shrink-0 z-20">
          <VirtualKeyboard
            nextChar={nextChar}
            showFingerGuide={settings.showFingerGuide}
            onKeyPress={(char) => {
              // Dispatch keyboard event so river game handles it identically
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
      />

      <VictoryModal
        isOpen={isVictoryOpen}
        stats={stats}
        currentCourse={currentCourse}
        onPlayAgain={handleRestart}
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
        onRetry={handleRestart}
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
