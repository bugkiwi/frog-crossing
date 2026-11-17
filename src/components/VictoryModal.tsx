import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { GameStats, UnitCourse } from '../types';
import { Trophy, Star, RotateCcw, BookOpen, ArrowRight, Zap, Target } from 'lucide-react';
import { FrogCharacter } from './FrogCharacter';

interface VictoryModalProps {
  isOpen: boolean;
  stats: GameStats;
  currentCourse: UnitCourse;
  onPlayAgain: () => void;
  onNextUnit?: () => void;
  onChangeCourse: () => void;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  isOpen,
  stats,
  currentCourse,
  onPlayAgain,
  onNextUnit,
  onChangeCourse
}) => {
  useEffect(() => {
    if (isOpen) {
      // Trigger colorful kid-friendly confetti fireworks
      const end = Date.now() + 2.5 * 1000;
      const colors = ['#4ADE80', '#FACC15', '#38BDF8', '#F472B6', '#FB923C'];

      const frame = () => {
        confetti({
          particleCount: 4,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: colors
        });
        confetti({
          particleCount: 4,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: colors
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      frame();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Compute stats
  const totalKeystrokes = stats.correctKeystrokes + stats.wrongKeystrokes;
  const accuracy = totalKeystrokes > 0 ? Math.round((stats.correctKeystrokes / totalKeystrokes) * 100) : 100;

  const durationMin = stats.endTime && stats.startTime ? Math.max((stats.endTime - stats.startTime) / 60000, 0.1) : 0.5;
  const wpm = Math.round(stats.wordsCompleted / durationMin);
  const kpm = Math.round(stats.correctKeystrokes / durationMin);

  // Compute Stars (1 to 3)
  const stars = accuracy >= 95 ? 3 : accuracy >= 80 ? 2 : 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-gradient-to-b from-slate-900 via-emerald-950 to-slate-900 border-2 border-amber-400/80 rounded-3xl w-full max-w-md p-6 shadow-2xl text-slate-100 text-center relative overflow-hidden">
        {/* Top Floating Cheering Frog */}
        <div className="flex justify-center -mt-2 mb-2">
          <FrogCharacter status="celebrating" size={88} isLeader={true} />
        </div>

        {/* Title */}
        <div className="flex items-center justify-center gap-2 mb-1">
          <Trophy className="w-6 h-6 text-amber-400 animate-bounce" />
          <h2 className="text-2xl font-black bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-200 bg-clip-text text-transparent">
            闯关成功！青蛙全员安全过河！
          </h2>
        </div>
        <p className="text-xs text-emerald-300 font-semibold mb-4">{currentCourse.title}</p>

        {/* 3 Stars */}
        <div className="flex justify-center gap-3 mb-6">
          {[1, 2, 3].map((starIdx) => (
            <div
              key={starIdx}
              className={`transition-all duration-500 transform ${
                starIdx <= stars ? 'scale-115 text-amber-400 animate-pulse' : 'text-slate-600 scale-90'
              }`}
            >
              <Star
                className="w-10 h-10 fill-current filter drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]"
              />
            </div>
          ))}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-6 bg-slate-900/80 p-3.5 rounded-2xl border border-emerald-500/30">
          <div className="flex flex-col items-center p-2 rounded-xl bg-slate-800/60">
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Target className="w-3.5 h-3.5 text-emerald-400" />
              <span>准确率</span>
            </span>
            <span className="text-xl font-extrabold text-emerald-300 font-mono mt-0.5">{accuracy}%</span>
          </div>

          <div className="flex flex-col items-center p-2 rounded-xl bg-slate-800/60">
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>手速 (KPM)</span>
            </span>
            <span className="text-xl font-extrabold text-amber-300 font-mono mt-0.5">{kpm} 键/分</span>
          </div>

          <div className="flex flex-col items-center p-2 rounded-xl bg-slate-800/60">
            <span className="text-xs text-slate-400">总得分</span>
            <span className="text-lg font-bold text-yellow-300 font-mono mt-0.5">{stats.score}</span>
          </div>

          <div className="flex flex-col items-center p-2 rounded-xl bg-slate-800/60">
            <span className="text-xs text-slate-400">最高连击</span>
            <span className="text-lg font-bold text-orange-400 font-mono mt-0.5">🔥 {stats.maxCombo} 次</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2.5">
          <button
            onClick={onPlayAgain}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm shadow-lg transition cursor-pointer flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span>再来一局 (挑战更高分)</span>
          </button>

          {onNextUnit && (
            <button
              onClick={onNextUnit}
              className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>练习下一单元</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={onChangeCourse}
            className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition cursor-pointer flex items-center justify-center gap-1.5"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>选择其他教材 / 上传新课</span>
          </button>
        </div>
      </div>
    </div>
  );
};
