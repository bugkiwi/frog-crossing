import React from 'react';
import { UnitCourse, GameSettings, GameInputMode } from '../types';
import {
  Volume2,
  VolumeX,
  Headphones,
  Mic,
  Keyboard,
  BookOpen,
  Settings,
  RotateCcw,
  Pause,
  Play,
  FileUp,
  Sparkles,
  BarChart3
} from 'lucide-react';

interface TopNavBarProps {
  currentCourse: UnitCourse;
  score: number;
  totalScore: number;
  accuracy: number;
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
  onOpenStats: () => void;
  onToggleSound: () => void;
  onToggleTts: () => void;
  onSetInputMode: (mode: GameInputMode) => void;
}

export const TopNavBar: React.FC<TopNavBarProps> = ({
  currentCourse,
  score,
  totalScore,
  accuracy,
  combo,
  frogsSaved,
  totalFrogs,
  isPaused,
  settings,
  onTogglePause,
  onRestart,
  onOpenSettings,
  onOpenCourseManager,
  onOpenStats,
  onToggleSound,
  onToggleTts,
  onSetInputMode
}) => {
  const isVoiceMode = settings.inputMode === 'voice';
  return (
    <header className="w-full bg-emerald-950/95 text-white backdrop-blur-md px-2 sm:px-4 lg:px-5 py-1.5 sm:py-2 border-b-2 border-emerald-600/50 shadow-lg flex items-center justify-between gap-1 sm:gap-2 lg:gap-3 z-30 select-none shrink-0 overflow-hidden">
      {/* Left: Game Title, Current Lesson & PDF Import */}
      <div className="flex items-center gap-1 sm:gap-2 min-w-0 shrink">
        <div className="flex items-center gap-1.5 bg-emerald-800/80 px-1.5 sm:px-2.5 py-1 rounded-xl border border-emerald-500/50 shadow-inner shrink-0">
          <span className="text-base sm:text-xl leading-none">🐸</span>
          <span className="font-extrabold text-sm sm:text-base lg:text-lg tracking-wider bg-gradient-to-r from-amber-200 via-emerald-200 to-teal-100 bg-clip-text text-transparent hidden md:inline">
            青蛙过河
          </span>
        </div>

        {/* Current Course Button */}
        <button
          onClick={onOpenCourseManager}
          className="flex items-center gap-1 sm:gap-1.5 bg-emerald-800/60 hover:bg-emerald-700/80 text-emerald-100 hover:text-white px-1.5 sm:px-2.5 py-1.5 rounded-xl border border-emerald-500/40 text-[11px] sm:text-xs lg:text-sm font-semibold transition cursor-pointer shadow-sm max-w-[34px] sm:max-w-[145px] lg:max-w-[185px] xl:max-w-[260px] min-w-0"
          title={`切换教材或单元：${currentCourse.title}`}
        >
          <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-300 shrink-0" />
          <span className="hidden sm:inline truncate">{currentCourse.title}</span>
        </button>

        {/* Quick PDF Import Button (visible on xl Desktop where space is abundant) */}
        <button
          onClick={onOpenCourseManager}
          className="hidden xl:flex items-center gap-1.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold px-2.5 py-1.5 rounded-xl text-xs transition cursor-pointer shadow-sm shrink-0"
          title="上传教材 PDF 生成词库"
        >
          <FileUp className="w-3.5 h-3.5" />
          <span>导入PDF教材</span>
        </button>
      </div>

      {/* Middle: Frogs Rescue Queue & Score */}
      <div className="flex items-center gap-1 sm:gap-2 lg:gap-3 shrink-0">
        {/* Rescued Frogs Progress: compact on mobile & iPad Portrait (768px), full frog row on lg+ */}
        <div className="flex items-center gap-0.5 sm:gap-1 bg-emerald-900/70 px-1.5 sm:px-2.5 py-1 rounded-full border border-emerald-700/60">
          <span className="text-xs text-emerald-300 font-medium hidden xl:inline mr-1">护送进度:</span>
          <span className="lg:hidden text-[11px] sm:text-xs font-bold text-emerald-200 font-mono">
            🐸{frogsSaved}/{totalFrogs}
          </span>
          <div className="hidden lg:flex items-center gap-0.5 lg:gap-1">
            {Array.from({ length: totalFrogs }).map((_, idx) => (
              <span
                key={idx}
                className={`text-sm lg:text-base leading-none transition-transform ${
                  idx < frogsSaved ? 'scale-110 drop-shadow-[0_0_6px_rgba(74,222,128,0.85)]' : 'opacity-30 grayscale'
                }`}
              >
                🐸
              </span>
            ))}
            <span className="text-xs font-bold text-emerald-200 ml-1 font-mono">
              {frogsSaved}/{totalFrogs}
            </span>
          </div>
        </div>

        {/* Score, Total Score & Combo */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          <div
            className="flex items-center gap-1 bg-amber-500/20 border border-amber-400/50 text-amber-200 px-1.5 sm:px-2.5 py-1 rounded-xl font-bold text-[11px] sm:text-sm shadow-inner"
            title={`本局得分: ${score} | 累计总积分: ${totalScore}`}
          >
            <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400 shrink-0" />
            <span className="hidden sm:inline text-xs text-amber-300">得分:</span>
            <span className="font-extrabold text-amber-300 font-mono">{score}</span>
          </div>

          <div
            className="hidden 2xl:flex items-center gap-1 bg-emerald-800/70 border border-emerald-500/40 text-emerald-200 px-2.5 py-1 rounded-xl font-bold text-xs shadow-inner"
            title="本地已累计保存的历史总积分（每过河一只青蛙自动刷新保存）"
          >
            <span className="text-emerald-300/90">🏆 总积分:</span>
            <span className="font-extrabold text-yellow-200 font-mono">{totalScore}</span>
          </div>

          {combo > 1 && (
            <div className="hidden sm:block bg-gradient-to-r from-orange-500 to-red-500 text-white px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-black animate-bounce shadow">
              🔥 x{combo}
            </div>
          )}
        </div>
      </div>

      {/* Right: Controls & Options */}
      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
        {/* Input Mode Switcher: Typing vs Voice Recognition */}
        <div
          className="flex items-center bg-emerald-900/90 p-0.5 rounded-xl border border-emerald-500/45 shadow-inner"
          role="group"
          aria-label="玩法模式切换"
        >
          <button
            onClick={() => onSetInputMode('typing')}
            className={`flex items-center gap-1 px-1.5 sm:px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-bold transition cursor-pointer ${
              !isVoiceMode
                ? 'bg-emerald-500 text-slate-950 shadow-sm'
                : 'text-emerald-200/80 hover:text-white'
            }`}
            title="键盘打字模式"
          >
            <Keyboard className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">打字</span>
          </button>
          <button
            onClick={() => onSetInputMode('voice')}
            className={`flex items-center gap-1 px-1.5 sm:px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-bold transition cursor-pointer ${
              isVoiceMode
                ? 'bg-gradient-to-r from-amber-400 to-orange-400 text-slate-950 shadow-sm'
                : 'text-emerald-200/80 hover:text-white'
            }`}
            title="语音识别闯关模式：读对单词小青蛙就跳过去！"
          >
            <Mic className={`w-3.5 h-3.5 shrink-0 ${isVoiceMode ? 'animate-pulse' : ''}`} />
            <span className="hidden sm:inline">语音</span>
          </button>
        </div>

        {/* Learning Report / Stats Button */}
        <button
          onClick={onOpenStats}
          className="flex items-center gap-1 px-1.5 sm:px-2.5 py-1.5 rounded-lg bg-sky-700/80 hover:bg-sky-600 border border-sky-400/60 text-sky-100 text-xs font-bold transition cursor-pointer shadow-sm"
          title={`查看课本单元学习报告（当前准确率 ${accuracy}%）`}
        >
          <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-sky-200 shrink-0" />
          <span className="hidden lg:inline">学习统计</span>
          <span className="hidden xl:inline font-mono text-[11px] px-1.5 py-0.2 rounded bg-sky-950/60 text-emerald-300">
            {accuracy}%
          </span>
        </button>

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
          {settings.sfxEnabled ? <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
        </button>

        {/* English Pronunciation TTS Toggle */}
        <button
          onClick={onToggleTts}
          className={`hidden md:flex p-1.5 sm:p-2 rounded-lg border transition cursor-pointer ${
            settings.ttsEnabled
              ? 'bg-teal-800/80 hover:bg-teal-700 border-teal-500/60 text-teal-100'
              : 'bg-slate-800/70 border-slate-600 text-slate-400'
          }`}
          title={settings.ttsEnabled ? '英文单词朗读开启' : '英文单词朗读关闭'}
        >
          <Headphones className={`w-4 h-4 ${settings.ttsEnabled ? 'text-teal-300' : 'text-slate-500'}`} />
        </button>

        {/* Pause / Resume */}
        <button
          onClick={onTogglePause}
          className="p-1.5 sm:p-2 rounded-lg bg-emerald-800/80 hover:bg-emerald-700 border border-emerald-500/60 text-white transition cursor-pointer"
          title={isPaused ? '继续' : '暂停'}
        >
          {isPaused ? <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-300" /> : <Pause className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
        </button>

        {/* Restart */}
        <button
          onClick={onRestart}
          className="hidden sm:flex p-1.5 sm:p-2 rounded-lg bg-emerald-800/80 hover:bg-emerald-700 border border-emerald-500/60 text-white transition cursor-pointer"
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
          <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>
      </div>
    </header>
  );
};
