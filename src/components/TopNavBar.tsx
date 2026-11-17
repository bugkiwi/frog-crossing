import React from 'react';
import { UnitCourse, GameSettings } from '../types';
import { Volume2, VolumeX, Mic, MicOff, BookOpen, Settings, RotateCcw, Pause, Play, FileUp, Sparkles } from 'lucide-react';

interface TopNavBarProps {
  currentCourse: UnitCourse;
  score: number;
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
    <header className="w-full bg-emerald-900/90 text-white backdrop-blur-md px-3 py-2 border-b-2 border-emerald-600/50 shadow-lg flex flex-wrap items-center justify-between gap-2 z-30 select-none">
      {/* Left: Game Title and Current Lesson */}
      <div className="flex items-center gap-2.5">
        <div className="flex items-center gap-2 bg-emerald-800/80 px-2.5 py-1 rounded-xl border border-emerald-500/50 shadow-inner">
          <span className="text-xl">🐸</span>
          <span className="font-extrabold text-base md:text-lg tracking-wider bg-gradient-to-r from-amber-200 via-emerald-200 to-teal-100 bg-clip-text text-transparent">
            青蛙过河
          </span>
        </div>

        {/* Current Course Button */}
        <button
          onClick={onOpenCourseManager}
          className="flex items-center gap-1.5 bg-emerald-700/60 hover:bg-emerald-600/80 text-emerald-100 hover:text-white px-3 py-1 rounded-xl border border-emerald-500/40 text-xs md:text-sm font-semibold transition cursor-pointer shadow-sm max-w-[240px] md:max-w-xs truncate"
          title="点击切换教材或单元"
        >
          <BookOpen className="w-4 h-4 text-emerald-300 shrink-0" />
          <span className="truncate">{currentCourse.title}</span>
        </button>

        {/* Quick PDF Import Button */}
        <button
          onClick={onOpenCourseManager}
          className="hidden lg:flex items-center gap-1 bg-amber-500/90 hover:bg-amber-400 text-slate-900 font-bold px-2.5 py-1 rounded-xl text-xs transition cursor-pointer shadow"
          title="上传教材 PDF 生成词库"
        >
          <FileUp className="w-3.5 h-3.5" />
          <span>导入PDF教材</span>
        </button>
      </div>

      {/* Middle: Frogs Rescue Queue & Score */}
      <div className="flex items-center gap-4">
        {/* Rescued Frogs Progress */}
        <div className="flex items-center gap-1 bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-700/50">
          <span className="text-xs text-emerald-300 font-medium mr-1">护送进度:</span>
          {Array.from({ length: totalFrogs }).map((_, idx) => (
            <span
              key={idx}
              className={`text-base md:text-lg transition-transform ${
                idx < frogsSaved ? 'scale-110 drop-shadow-[0_0_6px_rgba(74,222,128,0.8)]' : 'opacity-30 grayscale'
              }`}
            >
              🐸
            </span>
          ))}
          <span className="text-xs font-bold text-emerald-200 ml-1">
            {frogsSaved}/{totalFrogs}
          </span>
        </div>

        {/* Score & Combo */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-amber-500/20 border border-amber-400/50 text-amber-200 px-2.5 py-1 rounded-xl font-bold text-xs md:text-sm shadow-inner">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>得分:</span>
            <span className="font-extrabold text-amber-300 font-mono">{score}</span>
          </div>

          {combo > 1 && (
            <div className="bg-red-500/80 text-white px-2 py-0.5 rounded-full text-xs font-black animate-bounce shadow">
              🔥 连击 x{combo}
            </div>
          )}
        </div>
      </div>

      {/* Right: Controls & Options */}
      <div className="flex items-center gap-1.5">
        {/* Sound Toggle */}
        <button
          onClick={onToggleSound}
          className={`p-1.5 rounded-lg border transition cursor-pointer ${
            settings.sfxEnabled
              ? 'bg-emerald-700/70 border-emerald-500 text-white'
              : 'bg-slate-700/70 border-slate-600 text-slate-400'
          }`}
          title={settings.sfxEnabled ? '音效开启' : '音效静音'}
        >
          {settings.sfxEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>

        {/* English Pronunciation TTS Toggle */}
        <button
          onClick={onToggleTts}
          className={`p-1.5 rounded-lg border transition cursor-pointer ${
            settings.ttsEnabled
              ? 'bg-teal-700/70 border-teal-500 text-teal-100'
              : 'bg-slate-700/70 border-slate-600 text-slate-400'
          }`}
          title={settings.ttsEnabled ? '英文单词发音开启' : '英文发音关闭'}
        >
          {settings.ttsEnabled ? <Mic className="w-4 h-4 text-teal-300" /> : <MicOff className="w-4 h-4" />}
        </button>

        {/* Pause / Resume */}
        <button
          onClick={onTogglePause}
          className="p-1.5 rounded-lg bg-emerald-700/70 hover:bg-emerald-600 border border-emerald-500 text-white transition cursor-pointer"
          title={isPaused ? '继续' : '暂停'}
        >
          {isPaused ? <Play className="w-4 h-4 text-amber-300" /> : <Pause className="w-4 h-4" />}
        </button>

        {/* Restart */}
        <button
          onClick={onRestart}
          className="p-1.5 rounded-lg bg-emerald-700/70 hover:bg-emerald-600 border border-emerald-500 text-white transition cursor-pointer"
          title="重新开始"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        {/* Settings */}
        <button
          onClick={onOpenSettings}
          className="p-1.5 rounded-lg bg-emerald-700/70 hover:bg-emerald-600 border border-emerald-500 text-white transition cursor-pointer"
          title="游戏设置"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
