import React, { useState, useEffect } from 'react';
import { KEYBOARD_ROWS, KEY_MAPPING, FINGER_NAMES } from '../data/fingerMapping';
import { Keyboard, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';

interface VirtualKeyboardProps {
  nextChar: string | null;
  onKeyPress?: (char: string) => void;
  showFingerGuide?: boolean;
}

const ROW_OFFSETS = ['', 'sm:pl-4 md:pl-6', 'sm:pl-10 md:pl-14'];

export const VirtualKeyboard: React.FC<VirtualKeyboardProps> = ({
  nextChar,
  onKeyPress,
  showFingerGuide = true
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeKey, setActiveKey] = useState<string | null>(null);

  // Listen to physical keyboard events to provide pressing animation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const char = e.key.toLowerCase();
      setActiveKey(char);
    };

    const handleKeyUp = () => {
      setActiveKey(null);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const targetChar = nextChar ? nextChar.toLowerCase() : null;
  const targetKeyInfo = targetChar ? KEY_MAPPING[targetChar] : null;

  return (
    <div className="w-full bg-slate-950/95 border-t border-emerald-700/40 pt-1 px-1.5 sm:px-4 pb-1 sm:pb-2 transition-all duration-300">
      <div className="w-full max-w-4xl mx-auto">
        {/* Keyboard Header / Toolbar */}
        <div className="flex items-center justify-between px-3 sm:px-4 py-1 sm:py-1.5 bg-emerald-900/90 text-white rounded-t-xl text-xs backdrop-blur-md shadow-md border-t border-x border-emerald-600/40">
          <div className="flex items-center gap-2 min-w-0">
            <Keyboard className="w-4 h-4 text-emerald-300 shrink-0" />
            <span className="font-bold tracking-wide truncate">儿童指法小键盘</span>
            {targetChar === ' ' ? (
              <div className="flex items-center gap-1.5 ml-1 sm:ml-2 bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 px-2.5 py-0.5 rounded-full font-black animate-bounce text-[11px] shadow shrink-0">
                <Sparkles className="w-3 h-3 text-amber-800" />
                <span>目标：按 [空格 Space] 或点击上岸！</span>
              </div>
            ) : targetKeyInfo ? (
              <div className="flex items-center gap-1.5 ml-1 sm:ml-2 bg-amber-400 text-slate-950 px-2.5 py-0.5 rounded-full font-bold text-[11px] shadow truncate">
                <Sparkles className="w-3 h-3 text-amber-800 shrink-0" />
                <span className="truncate">
                  当前目标：按键 [{targetChar?.toUpperCase()}] ➔ {targetKeyInfo.fingerName}
                </span>
              </div>
            ) : null}
          </div>

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-emerald-700 text-emerald-200 hover:text-white transition cursor-pointer shrink-0"
          >
            <span>{isCollapsed ? '展开键盘' : '收起'}</span>
            {isCollapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {!isCollapsed && (
          <div className="vk-compact-container p-1.5 sm:p-2.5 lg:p-3 bg-slate-900/95 backdrop-blur-md rounded-b-xl border-b border-x border-slate-700/80 shadow-2xl flex flex-col gap-1 sm:gap-1.5 lg:gap-2">
            {/* Finger legend color bar (hidden on narrow mobile & short landscape viewports) */}
            {showFingerGuide && (
              <div className="vk-compact-legend hidden sm:flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[10px] lg:text-[11px] text-slate-300 pb-1.5 border-b border-slate-800">
                <span className="text-slate-400 font-semibold">手指分工：</span>
                {Object.entries(FINGER_NAMES).map(([key, info]) => (
                  <div key={key} className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full shadow" style={{ backgroundColor: info.color }} />
                    <span>{info.name}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Keyboard Keys Layout */}
            <div className="flex flex-col gap-1 sm:gap-1.5 items-center select-none w-full">
              {KEYBOARD_ROWS.map((row, rowIdx) => (
                <div
                  key={rowIdx}
                  className={`flex gap-1 sm:gap-1.5 lg:gap-2 justify-center w-full ${ROW_OFFSETS[rowIdx] || ''}`}
                >
                  {row.map((keyChar) => {
                    const lowerChar = keyChar.toLowerCase();
                    const keyInfo = KEY_MAPPING[lowerChar];
                    const isTarget = targetChar === lowerChar;
                    const isPressed = activeKey === lowerChar;
                    const isHomeKey = lowerChar === 'f' || lowerChar === 'j';

                    const fingerColor = keyInfo ? keyInfo.fingerColor : '#94A3B8';

                    return (
                      <button
                        key={keyChar}
                        onClick={() => onKeyPress && onKeyPress(lowerChar)}
                        style={{
                          borderColor: isTarget ? '#FBBF24' : fingerColor,
                          boxShadow: isTarget
                            ? '0 0 16px rgba(251, 191, 36, 0.9), inset 0 0 8px rgba(251, 191, 36, 0.35)'
                            : '0 3px 0 rgba(2, 6, 23, 0.85)'
                        }}
                        className={`vk-compact-key relative flex-1 max-w-[36px] sm:max-w-[52px] md:max-w-[56px] lg:max-w-[60px] h-8 sm:h-10 md:h-11 lg:h-12 rounded-lg font-bold text-xs sm:text-sm md:text-base flex flex-col items-center justify-center transition-all cursor-pointer active:translate-y-0.5 ${
                          isTarget
                            ? 'bg-amber-300 text-slate-950 font-black scale-105 -translate-y-0.5 z-10'
                            : isPressed
                            ? 'bg-emerald-400 text-slate-950 translate-y-0.5'
                            : 'bg-slate-800/95 text-slate-100 hover:bg-slate-700'
                        } border-2`}
                      >
                        <span className="leading-none">{keyChar}</span>
                        {/* Home-row tactile bump indicator on F and J */}
                        {isHomeKey && (
                          <span
                            className={`w-3 h-[2px] rounded-full mt-0.5 ${
                              isTarget ? 'bg-slate-900' : 'bg-slate-400/80'
                            }`}
                          />
                        )}
                        {!isHomeKey && showFingerGuide && keyInfo && (
                          <span
                            className="w-1.5 h-1.5 rounded-full mt-0.5"
                            style={{ backgroundColor: isTarget ? '#0F172A' : keyInfo.fingerColor }}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}

              {/* Space Bar Row */}
              <div className="flex justify-center w-full mt-0.5">
                <button
                  onClick={() => onKeyPress && onKeyPress(' ')}
                  style={{
                    boxShadow:
                      targetChar === ' '
                        ? '0 0 18px rgba(251, 191, 36, 0.9)'
                        : '0 3px 0 rgba(2, 6, 23, 0.85)'
                  }}
                  className={`vk-compact-space w-4/5 sm:w-3/5 max-w-[360px] h-8 sm:h-9 lg:h-10 rounded-lg font-bold text-xs sm:text-sm flex items-center justify-center border-2 transition-all cursor-pointer active:translate-y-0.5 ${
                    targetChar === ' '
                      ? 'bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 text-slate-950 border-amber-200 scale-105 animate-pulse'
                      : 'bg-slate-800/95 text-slate-200 border-purple-400/80 hover:bg-slate-700'
                  }`}
                >
                  {targetChar === ' ' ? '✨ 点击空格 (Space) 一跃上岸！🚀' : '空格 (Space) - 大拇指'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
