import React from 'react';
import { WordItem } from '../types';
import { VoiceRecognitionStatus } from '../services/voiceRecognitionEngine';
import { Mic, MicOff, Volume2, Keyboard, Sparkles, AlertCircle, Rocket } from 'lucide-react';

export interface VoiceFeedback {
  type: 'success' | 'retry' | 'info';
  text: string;
}

interface VoiceControlPanelProps {
  targetWord: WordItem | null;
  isFinalLeap: boolean;
  voiceStatus: VoiceRecognitionStatus;
  voiceHeard: string;
  voiceFeedback: VoiceFeedback | null;
  voiceError: string | null;
  onToggleListening: () => void;
  onPlaySample: () => void;
  onFinalLeap: () => void;
  onSwitchToTyping: () => void;
}

export const VoiceControlPanel: React.FC<VoiceControlPanelProps> = ({
  targetWord,
  isFinalLeap,
  voiceStatus,
  voiceHeard,
  voiceFeedback,
  voiceError,
  onToggleListening,
  onPlaySample,
  onFinalLeap,
  onSwitchToTyping
}) => {
  const isListening = voiceStatus === 'listening';
  const isUnsupported = voiceStatus === 'unsupported';

  const statusPrimaryText = voiceError
    ? voiceError
    : voiceFeedback
    ? voiceFeedback.text
    : isListening
    ? '🎙️ 麦克风已就绪：读对单词就跳过去，读错会原地等你再试哦！'
    : '点击左侧按钮打开麦克风，大声读出荷叶上的英文单词吧！';

  return (
    <div className="w-full h-[126px] md:h-[86px] lg:h-[90px] bg-slate-950/95 border-t-2 border-emerald-500/45 px-2.5 sm:px-4 lg:px-8 flex items-center text-slate-100 shadow-2xl select-none overflow-hidden shrink-0">
      <div className="w-full max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-1.5 md:gap-3 lg:gap-4">
        {/* Left: Target Word Prompt & Sample Audio (strictly fixed height to prevent layout jump) */}
        <div className="flex items-center gap-2 w-full md:w-[238px] lg:w-[296px] h-[52px] md:h-[60px] lg:h-[62px] shrink-0 justify-between bg-slate-900/90 border border-emerald-500/35 rounded-2xl px-3 lg:px-3.5 shadow-inner overflow-hidden">
          {isFinalLeap ? (
            <div className="flex items-center justify-between gap-2.5 w-full min-w-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-amber-400/20 border border-amber-400/60 flex items-center justify-center shrink-0">
                  <Rocket className="w-4 h-4 text-amber-300 animate-bounce" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-bold text-amber-300 leading-tight truncate">最后一步 · 语音上岸</div>
                  <div className="text-sm sm:text-base font-black text-white tracking-wide leading-tight truncate">
                    大声说 <span className="text-amber-300">"Jump!"</span>
                  </div>
                </div>
              </div>
              <button
                onClick={onFinalLeap}
                className="px-2.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs cursor-pointer transition shadow shrink-0"
              >
                点我上岸
              </button>
            </div>
          ) : targetWord ? (
            <>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] sm:text-[11px] font-semibold text-emerald-300/90 flex items-center gap-1.5 leading-tight truncate">
                  <span className="shrink-0">🎯 请朗读单词</span>
                  {targetWord.phonetic && (
                    <span className="text-slate-400 font-mono truncate">{targetWord.phonetic}</span>
                  )}
                </div>
                <div className="flex items-baseline gap-2 mt-0.5 leading-tight truncate">
                  <span className="text-lg sm:text-xl font-black text-amber-200 tracking-wide shrink-0">
                    {targetWord.word}
                  </span>
                  <span className="text-xs font-medium text-emerald-200/85 truncate">
                    {targetWord.chinese}
                  </span>
                </div>
              </div>

              <button
                onClick={onPlaySample}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-teal-600/80 hover:bg-teal-500 border border-teal-400/60 text-white text-xs font-bold transition cursor-pointer shrink-0 shadow active:scale-95"
                title="点击听标准英文发音，再跟着读"
              >
                <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>听示范</span>
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2 text-xs text-emerald-200/80 font-semibold w-full truncate">
              <span className="text-base leading-none">🐸</span>
              <span className="truncate">小青蛙跳跃中，准备下一个单词...</span>
            </div>
          )}
        </div>

        {/* Center: Mic Toggle + Fixed-Height Live Recognition Feedback */}
        <div className="flex-1 w-full h-[50px] md:h-[60px] lg:h-[62px] flex items-center justify-center gap-2 sm:gap-2.5 lg:gap-3 min-w-0">
          <button
            onClick={onToggleListening}
            disabled={isUnsupported}
            className={`relative h-[44px] md:h-[50px] lg:h-[52px] flex items-center gap-1.5 lg:gap-2 px-3 sm:px-3.5 lg:px-5 rounded-2xl font-extrabold text-xs lg:text-sm transition cursor-pointer shrink-0 shadow-lg active:scale-95 ${
              isUnsupported
                ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                : isListening
                ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 border-2 border-emerald-200 shadow-[0_0_24px_rgba(16,185,129,0.55)]'
                : 'bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-300 hover:to-orange-300 text-slate-950 border-2 border-amber-200'
            }`}
          >
            {isListening && (
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-85" />
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-rose-500 border border-white" />
              </span>
            )}
            {isListening ? <Mic className="w-4 h-4 lg:w-5 lg:h-5 animate-pulse" /> : <MicOff className="w-4 h-4 lg:w-5 lg:h-5" />}
            <span className="lg:hidden whitespace-nowrap">
              {isUnsupported ? '不支持语音' : isListening ? '正在听读' : '开启麦克风'}
            </span>
            <span className="hidden lg:inline whitespace-nowrap">
              {isUnsupported
                ? '浏览器不支持语音'
                : isListening
                ? '正在听你读... (点此暂停)'
                : '点击开启麦克风闯关'}
            </span>
          </button>

          {/* Live Transcript & Match/Mismatch Feedback (strictly fixed 2-row layout, zero height jump!) */}
          <div
            className="flex-1 min-w-0 h-[48px] md:h-[60px] lg:h-[62px] bg-slate-900/90 border border-slate-700/80 rounded-2xl px-2.5 sm:px-3.5 flex flex-col justify-center gap-0.5 overflow-hidden"
            title={statusPrimaryText}
          >
            {/* Row 1: Primary status / feedback */}
            <div className="h-5 leading-5 flex items-center gap-1.5 min-w-0">
              {voiceError ? (
                <>
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
                  <span className="text-xs text-rose-300 font-semibold truncate">{voiceError}</span>
                </>
              ) : voiceFeedback ? (
                <>
                  {voiceFeedback.type === 'success' && <Sparkles className="w-3.5 h-3.5 shrink-0 text-amber-300" />}
                  <span
                    className={`text-xs sm:text-sm font-bold truncate ${
                      voiceFeedback.type === 'success'
                        ? 'text-emerald-300'
                        : voiceFeedback.type === 'retry'
                        ? 'text-amber-300'
                        : 'text-sky-300'
                    }`}
                  >
                    {voiceFeedback.text}
                  </span>
                </>
              ) : (
                <span className={`text-xs truncate ${isListening ? 'text-emerald-300 font-bold' : 'text-slate-400'}`}>
                  {statusPrimaryText}
                </span>
              )}
            </div>

            {/* Row 2: Permanently reserved live transcript slot (never mounts/unmounts!) */}
            <div className="h-4 leading-4 text-[11px] text-slate-400 truncate">
              {voiceError ? (
                <span className="text-slate-500">检查权限后点击左侧麦克风重试</span>
              ) : voiceHeard ? (
                <>
                  实时识别：<span className="text-sky-300 font-mono font-bold">“{voiceHeard}”</span>
                </>
              ) : (
                <span className="text-slate-500">
                  {isListening ? '实时识别：正在聆听你的声音...' : '麦克风暂停中'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Quick Switch Back to Typing Mode */}
        <button
          onClick={onSwitchToTyping}
          className="hidden lg:flex h-[42px] items-center gap-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600/80 text-slate-200 text-xs font-bold transition cursor-pointer shrink-0"
          title="切换回键盘打字模式"
        >
          <Keyboard className="w-4 h-4 text-purple-300" />
          <span>切回打字</span>
        </button>
      </div>
    </div>
  );
};
