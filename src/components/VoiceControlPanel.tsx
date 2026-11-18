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

  return (
    <div className="w-full bg-slate-950/95 border-t-2 border-emerald-500/45 px-3 sm:px-5 lg:px-8 py-2.5 sm:py-3.5 text-slate-100 shadow-2xl select-none">
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2.5 sm:gap-4">
        {/* Left: Target Word Prompt & Sample Audio */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start bg-slate-900/90 border border-emerald-500/35 rounded-2xl px-3.5 py-2 sm:py-2.5 shadow-inner min-w-[240px]">
          {isFinalLeap ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-400/20 border border-amber-400/60 flex items-center justify-center shrink-0">
                <Rocket className="w-5 h-5 text-amber-300 animate-bounce" />
              </div>
              <div>
                <div className="text-[11px] font-bold text-amber-300">最后一步 · 语音上岸</div>
                <div className="text-base sm:text-lg font-black text-white tracking-wide">
                  大声说 <span className="text-amber-300">"Jump!"</span>
                </div>
              </div>
              <button
                onClick={onFinalLeap}
                className="ml-2 px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs cursor-pointer transition shadow"
              >
                或点我上岸
              </button>
            </div>
          ) : targetWord ? (
            <>
              <div className="min-w-0">
                <div className="text-[10px] sm:text-[11px] font-semibold text-emerald-300/90 flex items-center gap-1.5">
                  <span>🎯 请朗读黄色光圈单词</span>
                  {targetWord.phonetic && (
                    <span className="text-slate-400 font-mono">{targetWord.phonetic}</span>
                  )}
                </div>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-xl sm:text-2xl font-black text-amber-200 tracking-wide">
                    {targetWord.word}
                  </span>
                  <span className="text-xs sm:text-sm font-medium text-emerald-200/85 truncate max-w-[120px]">
                    {targetWord.chinese}
                  </span>
                </div>
              </div>

              <button
                onClick={onPlaySample}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-teal-600/80 hover:bg-teal-500 border border-teal-400/60 text-white text-xs font-bold transition cursor-pointer shrink-0 shadow active:scale-95"
                title="点击听标准英文发音，再跟着读"
              >
                <Volume2 className="w-4 h-4" />
                <span>听示范</span>
              </button>
            </>
          ) : (
            <div className="text-xs text-slate-400 py-1">正在准备下一个荷叶单词...</div>
          )}
        </div>

        {/* Center: Mic Toggle + Live Recognition Feedback */}
        <div className="flex-1 w-full flex items-center justify-center gap-3 min-w-0">
          <button
            onClick={onToggleListening}
            disabled={isUnsupported}
            className={`relative flex items-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl font-extrabold text-xs sm:text-sm transition cursor-pointer shrink-0 shadow-lg active:scale-95 ${
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
            {isListening ? <Mic className="w-4 h-4 sm:w-5 sm:h-5 animate-pulse" /> : <MicOff className="w-4 h-4 sm:w-5 sm:h-5" />}
            <span className="sm:hidden">
              {isUnsupported ? '不支持语音' : isListening ? '正在听读' : '开麦闯关'}
            </span>
            <span className="hidden sm:inline">
              {isUnsupported
                ? '浏览器不支持语音'
                : isListening
                ? '正在听你读... (点此暂停)'
                : '点击开启麦克风闯关'}
            </span>
          </button>

          {/* Live Transcript & Match/Mismatch Feedback */}
          <div className="flex-1 min-w-0 bg-slate-900/90 border border-slate-700/80 rounded-2xl px-3.5 py-2 flex flex-col justify-center min-h-[50px]">
            {voiceError ? (
              <div className="flex items-center gap-1.5 text-xs text-rose-300 font-semibold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span className="truncate sm:whitespace-normal">{voiceError}</span>
              </div>
            ) : voiceFeedback ? (
              <div
                className={`flex items-center gap-1.5 text-xs sm:text-sm font-bold ${
                  voiceFeedback.type === 'success'
                    ? 'text-emerald-300'
                    : voiceFeedback.type === 'retry'
                    ? 'text-amber-300'
                    : 'text-sky-300'
                }`}
              >
                {voiceFeedback.type === 'success' && <Sparkles className="w-4 h-4 shrink-0 text-amber-300" />}
                <span className="truncate sm:whitespace-normal">{voiceFeedback.text}</span>
              </div>
            ) : (
              <div className="text-xs text-slate-300 flex items-center gap-2">
                <span className={isListening ? 'text-emerald-300 font-bold' : 'text-slate-400'}>
                  {isListening
                    ? '🎙️ 麦克风已就绪：读对单词小青蛙就跳过去，读错会原地等你再试哦！'
                    : '点击左侧按钮打开麦克风，大声读出荷叶上的英文单词吧！'}
                </span>
              </div>
            )}

            {voiceHeard && !voiceError && (
              <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                实时识别：<span className="text-sky-300 font-mono font-bold">“{voiceHeard}”</span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Quick Switch Back to Typing Mode */}
        <button
          onClick={onSwitchToTyping}
          className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600/80 text-slate-200 text-xs font-bold transition cursor-pointer shrink-0"
          title="切换回键盘打字模式"
        >
          <Keyboard className="w-4 h-4 text-purple-300" />
          <span>切回打字</span>
        </button>
      </div>
    </div>
  );
};
