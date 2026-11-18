import React, { useState } from 'react';
import { Textbook, UnitCourse, WordItem } from '../types';
import { BUILTIN_TEXTBOOKS } from '../data/curriculumData';
import { parsePdfFile, extractWordsFromText, createCustomCourse } from '../services/pdfExtractor';
import { PersistedProgress } from '../services/progressStorage';
import { X, BookOpen, FileUp, Sparkles, Plus, Trash2, Check, FileText, Star } from 'lucide-react';

interface CourseManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCourseId: string;
  onSelectCourse: (course: UnitCourse) => void;
  customCourses: UnitCourse[];
  onAddCustomCourse: (course: UnitCourse) => void;
  onDeleteCustomCourse: (id: string) => void;
  progress?: PersistedProgress;
}

export const CourseManagerModal: React.FC<CourseManagerModalProps> = ({
  isOpen,
  onClose,
  currentCourseId,
  onSelectCourse,
  customCourses,
  onAddCustomCourse,
  onDeleteCustomCourse,
  progress
}) => {
  const [activeTab, setActiveTab] = useState<'builtin' | 'import'>('builtin');
  const [selectedTextbookId, setSelectedTextbookId] = useState<string>(BUILTIN_TEXTBOOKS[0].id);

  // PDF import state
  const [isProcessingPdf, setIsProcessingPdf] = useState(false);
  const [importTitle, setImportTitle] = useState('');
  const [extractedWords, setExtractedWords] = useState<WordItem[]>([]);
  const [rawTextInput, setRawTextInput] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  if (!isOpen) return null;

  const currentTextbook = BUILTIN_TEXTBOOKS.find((t) => t.id === selectedTextbookId) || BUILTIN_TEXTBOOKS[0];

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage('');
    setSuccessMessage('');
    setIsProcessingPdf(true);

    try {
      if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        const result = await parsePdfFile(file);
        setExtractedWords(result.words);
        setImportTitle(file.name.replace(/\.[^/.]+$/, ''));
        setSuccessMessage(`成功解析 PDF（共 ${result.pageCount} 页），提取出 ${result.words.length} 个单词！`);
      } else {
        // Plain text file
        const text = await file.text();
        const words = extractWordsFromText(text);
        setExtractedWords(words);
        setImportTitle(file.name.replace(/\.[^/.]+$/, ''));
        setSuccessMessage(`成功提取 ${words.length} 个单词！`);
      }
    } catch (err: any) {
      setErrorMessage(err.message || '文件解析遇到问题，请重试或直接粘贴单词文本。');
    } finally {
      setIsProcessingPdf(false);
    }
  };

  const handleParseRawText = () => {
    if (!rawTextInput.trim()) {
      setErrorMessage('请输入或粘贴单词内容！');
      return;
    }
    const words = extractWordsFromText(rawTextInput);
    if (words.length === 0) {
      setErrorMessage('未能提取出有效英文单词，请检查输入格式。');
      return;
    }
    setExtractedWords(words);
    setSuccessMessage(`已从文本中提取 ${words.length} 个单词！`);
    if (!importTitle) {
      setImportTitle('我的自定义生词本');
    }
  };

  const handleSaveAndPlay = () => {
    if (extractedWords.length === 0) {
      setErrorMessage('词库不能为空，请至少添加或提取几个单词！');
      return;
    }
    const courseTitle = importTitle.trim() || '自定义教材课程';
    const newCourse = createCustomCourse(courseTitle, `自定导入，共 ${extractedWords.length} 个单词`, extractedWords);
    onAddCustomCourse(newCourse);
    onSelectCourse(newCourse);
    onClose();
  };

  const handleRemoveWord = (index: number) => {
    setExtractedWords((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl text-slate-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-emerald-950 border-b border-emerald-800/60">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">📚</span>
            <div>
              <h2 className="text-lg font-bold text-emerald-200">打字词库与教材管理</h2>
              <p className="text-xs text-emerald-400">选择官方小学教材单元，或上传自定义 PDF 教材</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 px-6 gap-3 pt-2">
          <button
            onClick={() => setActiveTab('builtin')}
            className={`flex items-center gap-2 pb-2.5 px-3 font-semibold text-sm border-b-2 transition cursor-pointer ${
              activeTab === 'builtin'
                ? 'border-emerald-400 text-emerald-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>官方同步教材</span>
          </button>

          <button
            onClick={() => setActiveTab('import')}
            className={`flex items-center gap-2 pb-2.5 px-3 font-semibold text-sm border-b-2 transition cursor-pointer ${
              activeTab === 'import'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileUp className="w-4 h-4" />
            <span>上传教材 PDF / 自定义词库</span>
            {customCourses.length > 0 && (
              <span className="bg-amber-500/30 text-amber-300 text-xs px-1.5 py-0.2 rounded-full font-bold">
                {customCourses.length}
              </span>
            )}
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'builtin' ? (
            <div className="space-y-6">
              {/* Textbook Selector Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {BUILTIN_TEXTBOOKS.map((tb) => {
                  const isSelected = tb.id === selectedTextbookId;
                  return (
                    <button
                      key={tb.id}
                      onClick={() => setSelectedTextbookId(tb.id)}
                      className={`text-left p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'bg-emerald-900/60 border-emerald-400 ring-2 ring-emerald-500/40 shadow-lg'
                          : 'bg-slate-800/60 border-slate-700 hover:bg-slate-800 hover:border-slate-600'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                            {tb.grade}
                          </span>
                          {isSelected && <Check className="w-4 h-4 text-emerald-400" />}
                        </div>
                        <h4 className="font-bold text-sm text-slate-100">{tb.name}</h4>
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2">{tb.description}</p>
                      </div>
                      <span className="text-[11px] text-emerald-400/80 mt-2 font-mono">
                        {tb.units.length} 个学习单元
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Units in the selected textbook */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-slate-200 text-sm flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    <span>选择练习单元 - {currentTextbook.name}</span>
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {currentTextbook.units.map((unit, uIdx) => {
                    const isCurrent = unit.id === currentCourseId;
                    const rec = progress?.courseRecords[unit.id];
                    const wordMap = progress?.courseWordStats[unit.id] ?? {};
                    const seenCount = unit.words.filter((w) => {
                      const s = wordMap[w.word.toLowerCase()];
                      return s && (s.seenCount > 0 || s.completedCount > 0);
                    }).length;
                    const totalTimes = unit.words.reduce(
                      (sum, w) => sum + (wordMap[w.word.toLowerCase()]?.completedCount ?? 0),
                      0
                    );
                    const totalKeys = (rec?.totalCorrectKeys ?? 0) + (rec?.totalWrongKeys ?? 0);
                    const unitAcc =
                      totalKeys > 0 ? Math.round(((rec?.totalCorrectKeys ?? 0) / totalKeys) * 100) : null;

                    return (
                      <div
                        key={unit.id}
                        className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                          isCurrent
                            ? 'bg-gradient-to-r from-emerald-950/80 to-teal-950/80 border-emerald-400 shadow-md ring-1 ring-emerald-400'
                            : 'bg-slate-800/40 border-slate-700/80 hover:bg-slate-800/80'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <span className="font-bold text-sm text-emerald-200 truncate">
                              <span className="text-[11px] font-mono text-emerald-400/90 mr-1.5">#{uIdx + 1}</span>
                              {unit.title}
                            </span>
                            <span className="text-[11px] bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full shrink-0">
                              {unit.words.length} 词
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mb-2">{unit.subtitle}</p>

                          {/* Unit learning progress summary */}
                          {(seenCount > 0 || totalTimes > 0 || (rec && rec.stars > 0)) && (
                            <div className="flex flex-wrap items-center gap-2 mb-2.5 px-2.5 py-1 rounded-lg bg-slate-900/70 border border-slate-700/80 text-[11px] text-slate-300">
                              <span>
                                已预览 <strong className="text-sky-300 font-mono">{seenCount}/{unit.words.length}</strong>
                              </span>
                              <span>
                                练过 <strong className="text-emerald-300 font-mono">{totalTimes}</strong> 遍
                              </span>
                              {unitAcc !== null && (
                                <span>
                                  准确率 <strong className="text-amber-300 font-mono">{unitAcc}%</strong>
                                </span>
                              )}
                              {rec && rec.stars > 0 && (
                                <span className="inline-flex items-center gap-0.5 text-amber-400 ml-auto">
                                  {Array.from({ length: rec.stars }).map((_, s) => (
                                    <Star key={s} className="w-3 h-3 fill-current" />
                                  ))}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Word preview tags */}
                          <div className="flex flex-wrap gap-1.5 mb-3 max-h-16 overflow-y-auto">
                            {unit.words.slice(0, 10).map((w, i) => (
                              <span
                                key={i}
                                className="text-[11px] px-2 py-0.5 rounded-md bg-slate-900/80 border border-slate-700 text-slate-300"
                              >
                                {w.word}
                                <span className="text-slate-500 ml-1 text-[10px]">{w.chinese}</span>
                              </span>
                            ))}
                            {unit.words.length > 10 && (
                              <span className="text-[11px] text-slate-500 py-0.5">...</span>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            onSelectCourse(unit);
                            onClose();
                          }}
                          className={`w-full py-2 rounded-lg font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 ${
                            isCurrent
                              ? 'bg-emerald-500 text-slate-950'
                              : 'bg-emerald-700 hover:bg-emerald-600 text-white shadow'
                          }`}
                        >
                          {isCurrent ? <Check className="w-3.5 h-3.5" /> : null}
                          <span>{isCurrent ? '当前正在学习' : '开始练习此单元'}</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            /* Tab: Import PDF & Custom Words */
            <div className="space-y-6">
              {/* Existing Custom Courses */}
              {customCourses.length > 0 && (
                <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700">
                  <h3 className="font-bold text-sm text-amber-300 mb-3 flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    <span>已保存的自建词库 ({customCourses.length})</span>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {customCourses.map((c) => {
                      const isCurrent = c.id === currentCourseId;
                      return (
                        <div
                          key={c.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-slate-900/80 border border-slate-700"
                        >
                          <div className="truncate mr-2">
                            <div className="font-bold text-xs text-slate-200 truncate">{c.title}</div>
                            <div className="text-[11px] text-slate-400">{c.words.length} 个单词</div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => {
                                onSelectCourse(c);
                                onClose();
                              }}
                              className="px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs cursor-pointer"
                            >
                              {isCurrent ? '使用中' : '开始练习'}
                            </button>
                            <button
                              onClick={() => onDeleteCustomCourse(c.id)}
                              className="p-1 rounded text-slate-400 hover:text-red-400 hover:bg-slate-800 cursor-pointer"
                              title="删除词库"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Upload Box */}
              <div className="border-2 border-dashed border-emerald-500/50 hover:border-emerald-400 bg-emerald-950/20 rounded-2xl p-6 text-center transition">
                <input
                  type="file"
                  id="pdfUploadInput"
                  accept=".pdf,.txt"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={isProcessingPdf}
                />
                <label
                  htmlFor="pdfUploadInput"
                  className="flex flex-col items-center justify-center cursor-pointer group"
                >
                  <div className="w-14 h-14 rounded-full bg-emerald-500/20 group-hover:bg-emerald-500/30 flex items-center justify-center text-emerald-300 mb-3 transition">
                    <FileUp className="w-7 h-7" />
                  </div>
                  <h4 className="font-bold text-base text-slate-200 mb-1">
                    点击上传小学英语教材 (PDF 或 TXT)
                  </h4>
                  <p className="text-xs text-slate-400 max-w-md">
                    系统会自动智能提取 PDF 中的英文生词、单元词汇表并匹配释义，为您一键生成打字关卡！
                  </p>
                  {isProcessingPdf && (
                    <div className="mt-3 flex items-center gap-2 text-xs text-amber-300 font-semibold animate-pulse">
                      <span>⏳ 正在解析 PDF 教材中，请稍候...</span>
                    </div>
                  )}
                </label>
              </div>

              {/* Paste Text Alternative */}
              <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/80">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-emerald-400" />
                    <span>或者：直接粘贴单词文本 (每行一个，支持中英文)</span>
                  </span>
                  <button
                    onClick={handleParseRawText}
                    className="text-xs font-bold px-2.5 py-1 rounded bg-emerald-700 hover:bg-emerald-600 text-white cursor-pointer"
                  >
                    从文本提取单词
                  </button>
                </div>
                <textarea
                  rows={3}
                  value={rawTextInput}
                  onChange={(e) => setRawTextInput(e.target.value)}
                  placeholder="例如：
apple 苹果
banana 香蕉
orange 橙子
或直接粘贴教材段落..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                ></textarea>
              </div>

              {/* Notifications */}
              {errorMessage && (
                <div className="p-3 bg-red-950/60 border border-red-500/60 text-red-200 rounded-lg text-xs">
                  {errorMessage}
                </div>
              )}
              {successMessage && (
                <div className="p-3 bg-emerald-950/60 border border-emerald-500/60 text-emerald-200 rounded-lg text-xs">
                  {successMessage}
                </div>
              )}

              {/* Extracted Words Preview & Save Section */}
              {extractedWords.length > 0 && (
                <div className="bg-slate-800/80 p-4 rounded-xl border border-emerald-500/60 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex-1">
                      <label className="text-xs text-slate-400 block mb-1">词库名称：</label>
                      <input
                        type="text"
                        value={importTitle}
                        onChange={(e) => setImportTitle(e.target.value)}
                        placeholder="输入课程名称，如：新交际英语自选生词"
                        className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 font-bold w-full max-w-sm focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                    <button
                      onClick={handleSaveAndPlay}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs md:text-sm shadow-lg cursor-pointer flex items-center justify-center gap-1.5 self-end"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>保存此词库并立即开始游戏 ({extractedWords.length} 词)</span>
                    </button>
                  </div>

                  {/* Word List Tags */}
                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                      <span>提取结果预览 (可点击 × 移除不需要的词)：</span>
                      <span>共 {extractedWords.length} 个单词</span>
                    </div>

                    <div className="max-h-56 overflow-y-auto p-2 bg-slate-950 rounded-lg border border-slate-800 flex flex-wrap gap-2">
                      {extractedWords.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-xs text-slate-200 group"
                        >
                          <span className="font-bold text-emerald-300">{item.word}</span>
                          <span className="text-slate-400 text-[11px]">{item.chinese}</span>
                          <button
                            onClick={() => handleRemoveWord(idx)}
                            className="text-slate-500 hover:text-red-400 ml-1 cursor-pointer"
                            title="移除"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-950 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};
