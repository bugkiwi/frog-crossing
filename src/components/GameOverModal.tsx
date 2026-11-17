import React from 'react';
import { GameStats, UnitCourse } from '../types';
import { RotateCcw, BookOpen, HeartHandshake, ShieldCheck } from 'lucide-react';
import { FrogCharacter } from './FrogCharacter';

interface GameOverModalProps {
  isOpen: boolean;
  stats: GameStats;
  currentCourse: UnitCourse;
  onRetry: () => void;
  onSwitchToEasy: () => void;
  onChangeCourse: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  isOpen,
  stats,
  currentCourse,
  onRetry,
  onSwitchToEasy,
  onChangeCourse
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-gradient-to-b from-slate-900 via-sky-950 to-slate-900 border-2 border-sky-400/60 rounded-3xl w-full max-w-md p-6 shadow-2xl text-slate-100 text-center relative overflow-hidden">
        {/* Floating dizzy frog */}
        <div className="flex justify-center -mt-2 mb-2">
          <FrogCharacter status="drowning" size={80} />
        </div>

        {/* Title */}
        <h2 className="text-xl font-black text-sky-200 mb-1">
          噗通！小青蛙去河里游泳啦 🌊
        </h2>
        <p className="text-xs text-sky-300/80 mb-4">
          别灰心！打字是一项熟能生巧的超能力，多练几次就会越来越快！
        </p>

        {/* Quick summary */}
        <div className="bg-slate-900/80 p-3 rounded-2xl border border-sky-800/50 mb-5 flex justify-around text-xs">
          <div>
            <span className="text-slate-400 block">安全上岸</span>
            <span className="text-lg font-bold text-emerald-400 font-mono">{stats.frogsSaved} 只</span>
          </div>
          <div className="w-[1px] bg-slate-800"></div>
          <div>
            <span className="text-slate-400 block">敲对字母</span>
            <span className="text-lg font-bold text-amber-300 font-mono">{stats.correctKeystrokes} 个</span>
          </div>
          <div className="w-[1px] bg-slate-800"></div>
          <div>
            <span className="text-slate-400 block">本轮得分</span>
            <span className="text-lg font-bold text-sky-300 font-mono">{stats.score}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2.5">
          <button
            onClick={onRetry}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm shadow-lg transition cursor-pointer flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span>再试一次 (重新开始)</span>
          </button>

          <button
            onClick={onSwitchToEasy}
            className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow transition cursor-pointer flex items-center justify-center gap-1.5"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>切换为“轻松模式” (荷叶不沉没)</span>
          </button>

          <button
            onClick={onChangeCourse}
            className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition cursor-pointer flex items-center justify-center gap-1.5"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>选择其他单元词汇</span>
          </button>
        </div>
      </div>
    </div>
  );
};
