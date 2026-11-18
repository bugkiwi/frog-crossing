import React from 'react';
import { UnitCourse, GameSettings } from '../types';
import { Volume2, VolumeX, Mic, MicOff, BookOpen, Settings, RotateCcw, Pause, Play, FileUp, Sparkles } from 'lucide-react';

interface TopNavBarProps {
  currentCourse: UnitCourse;
  score: number;
  totalScore: number;
  combo: number;
  frogsSaved: number;
  totalFrogs: number;
  frogsLost: number;
  isPaused: boolean;
  settings: GameSettings;
  onTogglePause: () => void;
  onRestart: () => void;
  onOpenSettings: () => void;
  onOpenCourseManager: () => void;
  onToggleSound: () => void;
  onToggleTts: () => void;
}

export const TopNavBar: React.FC<TopNavBarProps> = ({
  currentCourse,
  score,
  totalScore,
  combo,
  frogsSaved,
  totalFrogs,
  isPaused,
  settings,
  onTogglePause,
  onRestart,
  onOpenSettings,
  onOpenCourseManager,
  onToggleSound,
  onToggleTts
}) => {
  return (
    <header className="w-full bg-emerald-950/95 text-white backdrop-blur-md px-2.5 sm:px-4 lg:px-6 py-1.5 sm:py-2 border-b-2 border-emerald-600/50 shadow-lg flex items-center justify-between gap-1.5 sm:gap-3 z-30 select-none shrink-0">
      {/* Left: Game Title, Current Lesson & PDF Import */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
        <div className="flex items-center gap-1.5 bg-emerald-800/80 px-2 sm:px-3 py-1 rounded-xl border border-emerald-500/50 shadow-inner shrink-0">
          <span className="text-lg sm:text-xl leading-none">🐸</span>
          <span className="font-extrabold text-sm sm:text-base lg:text-lg tracking-wider bg-gradient-to-r from-amber-200 via-emerald-200 to-teal-100 bg-clip-text text-transparent hidden sm:inline">
            青蛙过河
          </span>
        </div>

        {/* Current Course Button */}
        <button
          onClick={onOpenCourseManager}
          className="flex items-center gap-1.5 bg-emerald-800/60 hover:bg-emerald-700/80 text-emerald-100 hover:text-white px-2 sm:px-3 py-1.5 rounded-xl border border-emerald-500/40 text-[11px] sm:text-xs lg:text-sm font-semibold transition cursor-pointer shadow-sm max-w-[115px] sm:max-w-[200px] lg:max-w-[280px] truncate"
          title="点击切换教材或单元"
        >
          <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-300 shrink-0" />
          <span className="truncate">{currentCourse.title}</span>
        </button>

        {/* Quick PDF Import Button (visible on iPad Landscape & Desktop) */}
        <button
          onClick={onOpenCourseManager}
          className="hidden lg:flex items-center gap-1.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold px-2.5 lg:px-3 py-1.5 rounded-xl text-xs transition cursor-pointer shadow-sm shrink-0"
          title="上传教材 PDF 生成词库"
        >
          <FileUp className="w-3.5 h-3.5" />
          <span>导入PDF教材</span>
        </button>
      </div>

      {/* Middle: Frogs Rescue Queue & Score */}
      <div className="flex items-center gap-1.5 sm:gap-3 lg:gap-4 shrink-0">
        {/* Rescued Frogs Progress: compact on mobile, full frog row on iPad/Desktop */}
        <div className="flex items-center gap-0.5 sm:gap-1 bg-emerald-900/70 px-2 sm:px-3 py-1 rounded-full border border-emerald-700/60">
          <span className="text-xs text-emerald-300 font-medium hidden lg:inline mr-1">护送进度:</span>
          <span className="sm:hidden text-xs font-bold text-emerald-200 font-mono">
            🐸 {frogsSaved}/{totalFrogs}
          </span>
          <div className="hidden sm:flex items-center gap-1">
            {Array.from({ length: totalFrogs }).map((_, idx) => (
              <span
                key={idx}
                className={`text-base lg:text-lg leading-none transition-transform ${
                  idx < frogsSaved ? 'scale-110 drop-shadow-[0_0_6px_rgba(74,222,128,0.85)]' : 'opacity-30 grayscale'
                }`}
              >
                🐸
              </span>
            ))}
            <span className="text-xs font-bold text-emerald-200 ml-1 hidden md:inline font-mono">
              {frogsSaved}/{totalFrogs}
            </span>
          </div>
        </div>

        {/* Score, Total Score & Combo */}
        <div className="flex items-center gap-1.5">
          <div
            className="flex items-center gap-1 bg-amber-500/20 border border-amber-400/50 text-amber-200 px-2 sm:px-2.5 py-1 rounded-xl font-bold text-xs sm:text-sm shadow-inner"
            title={`本局得分: ${score} | 累计总积分: ${totalScore}`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400 hidden sm:inline" />
            <span className="text-[11px] sm:text-xs text-amber-300">得分:</span>
            <span className="font-extrabold text-amber-300 font-mono">{score}</span>
          </div>

          <div
            className="hidden xl:flex items-center gap-1 bg-emerald-800/70 border border-emerald-500/40 text-emerald-200 px-2.5 py-1 rounded-xl font-bold text-xs shadow-inner"
            title="本地已累计保存的历史总积分（每过河一只青蛙自动刷新保存）"
          >
            <span className="text-emerald-300/90">🏆 总积分:</span>
            <span className="font-extrabold text-yellow-200 font-mono">{totalScore}</span>
          </div>

          {combo > 1 && (
            <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-black animate-bounce shadow">
              🔥 x{combo}
            </div>
          )}
        </div>
      </div>

      {/* Right: Controls & Options */}
      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
        {/* Sound Toggle */}
        <button
          onClick={onToggleSound}
          className={`p-1.5 sm:p-2 rounded-lg border transition cursor-pointer ${
            settings.sfxEnabled
              ? 'bg-emerald-800/80 hover:bg-emerald-700 border-emerald-500/60 text-white'
              : 'bg-slate-800/70 border-slate-600 text-slate-400'
          }`}
          title={settings.sfxEnabled ? '音效开启' : '音效静音'}
        >
          {settings.sfxEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>

        {/* English Pronunciation TTS Toggle */}
        <button
          onClick={onToggleTts}
          className={`p-1.5 sm:p-2 rounded-lg border transition cursor-pointer ${
            settings.ttsEnabled
              ? 'bg-teal-800/80 hover:bg-teal-700 border-teal-500/60 text-teal-100'
              : 'bg-slate-800/70 border-slate-600 text-slate-400'
          }`}
          title={settings.ttsEnabled ? '英文单词发音开启' : '英文发音关闭'}
        >
          {settings.ttsEnabled ? <Mic className="w-4 h-4 text-teal-300" /> : <MicOff className="w-4 h-4" />}
        </button>

        {/* Pause / Resume */}
        <button
          onClick={onTogglePause}
          className="p-1.5 sm:p-2 rounded-lg bg-emerald-800/80 hover:bg-emerald-700 border border-emerald-500/60 text-white transition cursor-pointer"
          title={isPaused ? '继续' : '暂停'}
        >
          {isPaused ? <Play className="w-4 h-4 text-amber-300" /> : <Pause className="w-4 h-4" />}
        </button>

        {/* Restart */}
        <button
          onClick={onRestart}
          className="p-1.5 sm:p-2 rounded-lg bg-emerald-800/80 hover:bg-emerald-700 border border-emerald-500/60 text-white transition cursor-pointer"
          title="重新开始"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        {/* Settings */}
        <button
          onClick={onOpenSettings}
          className="p-1.5 sm:p-2 rounded-lg bg-emerald-800/80 hover:bg-emerald-700 border border-emerald-500/60 text-white transition cursor-pointer"
          title="游戏设置"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
