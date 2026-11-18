import React from 'react';
import { UnitCourse, GameStats } from '../types';
import { BUILTIN_TEXTBOOKS } from '../data/curriculumData';
import { PersistedProgress, PendingWordDelta } from '../services/progressStorage';
import { speechEngine } from '../services/speechEngine';
import { X, BarChart3, BookOpen, Target, Repeat, Eye, Volume2, Star, Trophy, CheckCircle2 } from 'lucide-react';

interface LearningStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCourse: UnitCourse;
  stats: GameStats;
  progress: PersistedProgress;
  pendingDelta: PendingWordDelta;
  onSelectCourse: (course: UnitCourse) => void;
}

export const LearningStatsModal: React.FC<LearningStatsModalProps> = ({
  isOpen,
  onClose,
  currentCourse,
  stats,
  progress,
  pendingDelta,
  onSelectCourse
}) => {
  if (!isOpen) return null;

  // Locate current textbook and unit index
  const currentTextbook = BUILTIN_TEXTBOOKS.find((tb) =>
    tb.units.some((u) => u.id === currentCourse.id)
  );
  const currentUnitIdx = currentTextbook
    ? currentTextbook.units.findIndex((u) => u.id === currentCourse.id)
    : -1;

  // Merge persisted word stats + in-flight pending delta for live real-time accuracy
  const savedCourseWords = progress.courseWordStats[currentCourse.id] ?? {};
  const mergedWords = currentCourse.words.map((item) => {
    const key = item.word.toLowerCase();
    const saved = savedCourseWords[key];
    const seen = (saved?.seenCount ?? 0) + (pendingDelta.seen[key] ?? 0);
    const completed = (saved?.completedCount ?? 0) + (pendingDelta.completed[key] ?? 0);
    const mistakes = (saved?.mistakeCount ?? 0) + (pendingDelta.mistakes[key] ?? 0);
    return {
      ...item,
      seenCount: Math.max(seen, completed),
      completedCount: completed,
      mistakeCount: mistakes
    };
  });

  const totalVocab = mergedWords.length;
  const previewedCount = mergedWords.filter((w) => w.seenCount > 0).length;
  const masteredCount = mergedWords.filter((w) => w.completedCount >= 3).length;
  const practicedTotalTimes = mergedWords.reduce((sum, w) => sum + w.completedCount, 0);
  const previewCoveragePct = totalVocab > 0 ? Math.round((previewedCount / totalVocab) * 100) : 0;

  // Round accuracy
  const roundKeys = stats.correctKeystrokes + stats.wrongKeystrokes;
  const roundAccuracy = roundKeys > 0 ? Math.round((stats.correctKeystrokes / roundKeys) * 100) : 100;

  // Course lifetime accuracy (persisted + live pending)
  const courseRec = progress.courseRecords[currentCourse.id];
  const lifetimeCorrect = (courseRec?.totalCorrectKeys ?? 0) + pendingDelta.correctKeysDelta;
  const lifetimeWrong = (courseRec?.totalWrongKeys ?? 0) + pendingDelta.wrongKeysDelta;
  const lifetimeKeys = lifetimeCorrect + lifetimeWrong;
  const lifetimeAccuracy = lifetimeKeys > 0 ? Math.round((lifetimeCorrect / lifetimeKeys) * 100) : roundAccuracy;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-emerald-500/45 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl text-slate-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 bg-emerald-950 border-b border-emerald-800/60">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center shrink-0">
              <BarChart3 className="w-5 h-5 text-emerald-300" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-extrabold text-emerald-200">课本学习统计报告</h2>
                {currentTextbook && currentUnitIdx >= 0 && (
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-400/20 border border-amber-400/50 text-amber-200">
                    第 {currentUnitIdx + 1} / {currentTextbook.units.length} 单元
                  </span>
                )}
              </div>
              <p className="text-xs text-emerald-300/80 truncate mt-0.5">
                {currentTextbook ? `${currentTextbook.name} · ` : '自定义教材 · '}
                {currentCourse.title}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Top 4 KPI Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {/* KPI 1: Previewed Words */}
            <div className="bg-slate-800/70 border border-emerald-500/30 rounded-xl p-3.5 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>已预览词汇</span>
                <Eye className="w-4 h-4 text-sky-400" />
              </div>
              <div className="mt-1.5 flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-sky-300 font-mono">{previewedCount}</span>
                <span className="text-xs text-slate-400 font-mono">/ {totalVocab} 词</span>
              </div>
              <div className="mt-2 w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-sky-400 to-emerald-400 rounded-full transition-all"
                  style={{ width: `${previewCoveragePct}%` }}
                />
              </div>
              <span className="text-[10px] text-slate-400 mt-1">
                覆盖率 {previewCoveragePct}% · 熟练 {masteredCount} 词
              </span>
            </div>

            {/* KPI 2: Practice Repetitions */}
            <div className="bg-slate-800/70 border border-emerald-500/30 rounded-xl p-3.5 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>累计拼写遍数</span>
                <Repeat className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="mt-1.5 flex items-baseline gap-1">
                <span className="text-2xl font-black text-emerald-300 font-mono">{practicedTotalTimes}</span>
                <span className="text-xs text-slate-400">遍</span>
              </div>
              <span className="text-[11px] text-slate-400 mt-2">
                本局已拼 <strong className="text-emerald-200">{stats.wordsCompleted}</strong> 词 · 已通关{' '}
                <strong className="text-amber-300">{courseRec?.completions ?? 0}</strong> 轮
              </span>
            </div>

            {/* KPI 3: Keystroke Accuracy */}
            <div className="bg-slate-800/70 border border-emerald-500/30 rounded-xl p-3.5 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>按键准确率</span>
                <Target className="w-4 h-4 text-amber-400" />
              </div>
              <div className="mt-1.5 flex items-baseline gap-1.5">
                <span
                  className={`text-2xl font-black font-mono ${
                    roundAccuracy >= 90
                      ? 'text-emerald-300'
                      : roundAccuracy >= 75
                      ? 'text-amber-300'
                      : 'text-orange-400'
                  }`}
                >
                  {roundAccuracy}%
                </span>
                <span className="text-[11px] text-slate-400">本局</span>
              </div>
              <span className="text-[11px] text-slate-400 mt-2">
                本单元历史 <strong className="text-amber-200">{lifetimeAccuracy}%</strong> (对 {lifetimeCorrect} / 错{' '}
                {lifetimeWrong})
              </span>
            </div>

            {/* KPI 4: Cumulative Score & Frogs */}
            <div className="bg-slate-800/70 border border-emerald-500/30 rounded-xl p-3.5 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>累计积分与护送</span>
                <Trophy className="w-4 h-4 text-yellow-400" />
              </div>
              <div className="mt-1.5 flex items-baseline gap-1">
                <span className="text-2xl font-black text-yellow-300 font-mono">{progress.totalScore}</span>
                <span className="text-xs text-slate-400">分</span>
              </div>
              <span className="text-[11px] text-slate-400 mt-2">
                累计护送 <strong className="text-emerald-300">{progress.totalFrogsSaved}</strong> 只青蛙过河 🐸
              </span>
            </div>
          </div>

          {/* Section 2: Current Unit Word Mastery Grid */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm text-emerald-200 flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-emerald-400" />
                <span>本单元词汇掌握详情（点击单词可听标准发音 🔊）</span>
              </h3>
              <span className="text-[11px] text-slate-400 hidden sm:inline">
                每跳过一只青蛙自动刷新本地记录
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {mergedWords.map((w, idx) => {
                const statusBadge =
                  w.completedCount >= 3
                    ? { text: '熟练 ⭐', cls: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' }
                    : w.completedCount >= 1
                    ? { text: '已练过', cls: 'bg-sky-500/20 text-sky-300 border-sky-500/40' }
                    : w.seenCount > 0
                    ? { text: '已预览', cls: 'bg-amber-500/20 text-amber-300 border-amber-500/40' }
                    : { text: '未预览', cls: 'bg-slate-800 text-slate-400 border-slate-700' };

                return (
                  <button
                    key={idx}
                    onClick={() => speechEngine.speak(w.word)}
                    className="text-left p-3 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700/80 hover:border-emerald-500/50 transition cursor-pointer flex flex-col justify-between gap-2 group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-extrabold text-sm text-slate-100 group-hover:text-emerald-300 transition">
                            {w.word}
                          </span>
                          {w.pos && (
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-950/80 border border-emerald-500/30 text-emerald-300/90">
                              {w.pos}
                            </span>
                          )}
                          <Volume2 className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-400 transition shrink-0" />
                        </div>
                        <div className="text-[11px] text-slate-400 truncate mt-0.5">
                          {w.chinese}
                          {w.phonetic ? <span className="ml-1.5 text-slate-500">{w.phonetic}</span> : null}
                        </div>
                      </div>

                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${statusBadge.cls}`}>
                        {statusBadge.text}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-slate-700/60 text-slate-400 font-mono">
                      <span>预览 {w.seenCount} 次</span>
                      <span>拼写 {w.completedCount} 遍</span>
                      {w.mistakeCount > 0 ? (
                        <span className="text-orange-300 font-semibold">错键 {w.mistakeCount}</span>
                      ) : (
                        <span className="text-emerald-400/80">零失误</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 3: Full Textbook Units Progress Overview */}
          {currentTextbook && (
            <div>
              <h3 className="font-bold text-sm text-emerald-200 mb-3 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>{currentTextbook.name} · 全册各单元进度总览</span>
              </h3>

              <div className="space-y-2">
                {currentTextbook.units.map((unit, uIdx) => {
                  const isCurrent = unit.id === currentCourse.id;
                  const rec = progress.courseRecords[unit.id];
                  const uWords = progress.courseWordStats[unit.id] ?? {};
                  const uSeen = unit.words.filter((w) => {
                    const k = w.word.toLowerCase();
                    const extraSeen = isCurrent ? pendingDelta.seen[k] ?? 0 : 0;
                    const extraComp = isCurrent ? pendingDelta.completed[k] ?? 0 : 0;
                    return (uWords[k]?.seenCount ?? 0) + extraSeen + (uWords[k]?.completedCount ?? 0) + extraComp > 0;
                  }).length;
                  const uTimes = unit.words.reduce((acc, w) => {
                    const k = w.word.toLowerCase();
                    const extraComp = isCurrent ? pendingDelta.completed[k] ?? 0 : 0;
                    return acc + (uWords[k]?.completedCount ?? 0) + extraComp;
                  }, 0);
                  const uKeys = (rec?.totalCorrectKeys ?? 0) + (rec?.totalWrongKeys ?? 0);
                  const uAcc = uKeys > 0 ? Math.round(((rec?.totalCorrectKeys ?? 0) / uKeys) * 100) : null;

                  return (
                    <div
                      key={unit.id}
                      className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition ${
                        isCurrent
                          ? 'bg-emerald-950/70 border-emerald-400/70 shadow'
                          : 'bg-slate-800/40 border-slate-700/70 hover:bg-slate-800/70'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-slate-900 text-emerald-300 border border-emerald-500/30 font-mono">
                            第 {uIdx + 1} 单元
                          </span>
                          <span className="font-bold text-xs sm:text-sm text-slate-100 truncate">{unit.title}</span>
                          {isCurrent && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950">
                              学习中
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 mt-1.5 text-[11px] text-slate-400">
                          <span>
                            词汇覆盖：<strong className="text-sky-300">{uSeen}/{unit.words.length}</strong> 词
                          </span>
                          <span>
                            累计练习：<strong className="text-emerald-300">{uTimes}</strong> 遍
                          </span>
                          {uAcc !== null && (
                            <span>
                              准确率：<strong className="text-amber-300">{uAcc}%</strong>
                            </span>
                          )}
                          {rec && rec.stars > 0 && (
                            <span className="inline-flex items-center gap-0.5 text-amber-400">
                              {Array.from({ length: rec.stars }).map((_, s) => (
                                <Star key={s} className="w-3 h-3 fill-current" />
                              ))}
                            </span>
                          )}
                        </div>
                      </div>

                      {!isCurrent && (
                        <button
                          onClick={() => {
                            onSelectCourse(unit);
                            onClose();
                          }}
                          className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold transition cursor-pointer shrink-0 self-start sm:self-center"
                        >
                          去练此单元
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>💡 统计数据保存在当前浏览器本地，每次青蛙过河自动同步刷新</span>
          <button
            onClick={onClose}
            className="px-5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold cursor-pointer"
          >
            继续练习
          </button>
        </div>
      </div>
    </div>
  );
};
