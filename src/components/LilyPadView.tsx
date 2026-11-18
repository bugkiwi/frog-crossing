import React from 'react';
import { LilyPad } from '../types';

interface LilyPadViewProps {
  pad: LilyPad;
  showChinese: boolean;
  onSelect?: () => void;
}

export const LilyPadView: React.FC<LilyPadViewProps> = ({
  pad,
  showChinese,
  onSelect
}) => {
  const { word, typedLength, isTarget, isSinking, sinkTimer } = pad;
  const wordStr = word.word;

  // Split word into typed, current char, and remaining chars
  const typedPart = wordStr.slice(0, typedLength);
  const nextChar = wordStr.slice(typedLength, typedLength + 1);
  const remainingPart = wordStr.slice(typedLength + 1);

  // Sinking visual effect
  const sinkOpacity = Math.max(0.35, 1 - sinkTimer * 0.65);
  const sinkScale = Math.max(0.75, 1 - sinkTimer * 0.25);

  const leafPath =
    'M 120 12 C 172 10, 226 28, 231 54 C 236 80, 184 95, 120 94 C 56 95, 4 80, 9 54 C 14 28, 68 10, 114 12 L 120 42 Z';

  return (
    <div
      onClick={onSelect}
      className={`absolute top-1/2 cursor-pointer transition-transform duration-150 select-none flex flex-col items-center justify-center ${
        isTarget ? 'z-20' : 'hover:scale-105 z-10'
      }`}
      style={{
        left: `${pad.x}%`,
        transform: `translate(-50%, -50%) scale(${(isTarget ? 1.06 : 1) * sinkScale})`,
        opacity: sinkOpacity,
      }}
    >
      {/* Sinking water bubbles if close to sinking */}
      {isSinking && sinkTimer > 0.4 && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <span className="animate-ping absolute w-16 h-16 rounded-full border-2 border-cyan-200 opacity-60"></span>
          <span className="animate-pulse absolute text-[11px] text-white font-bold -top-4 drop-shadow">💦 噗噜噜...</span>
        </div>
      )}

      {/* Lotus Leaf Container (scales slightly wider for multi-word holiday/cultural phrases) */}
      <div
        className={`relative h-[60px] sm:h-[70px] lg:h-[78px] flex items-center justify-center animate-leaf-bob ${
          word.word.length >= 15
            ? 'w-[144px] sm:w-[196px] md:w-[216px] lg:w-[244px]'
            : 'w-[112px] sm:w-[162px] md:w-[178px] lg:w-[204px]'
        }`}
      >
        {/* Subtle water shadow & ripple ring beneath the leaf */}
        <div
          className={`absolute inset-x-2 -bottom-1 h-4 rounded-full blur-[3px] transition-all pointer-events-none ${
            isTarget ? 'bg-amber-400/45 scale-105' : 'bg-teal-900/25'
          }`}
        />

        <svg
          viewBox="0 0 240 100"
          preserveAspectRatio="none"
          className={`w-full h-full overflow-visible transition-all ${
            isTarget
              ? 'filter drop-shadow-[0_0_12px_rgba(250,204,21,0.85)]'
              : 'filter drop-shadow-[0_4px_4px_rgba(6,78,59,0.28)]'
          }`}
        >
          <defs>
            <radialGradient id={`leafGrad-${pad.id}`} cx="42%" cy="38%" r="60%">
              <stop offset="0%" stopColor="#86EFAC" />
              <stop offset="55%" stopColor="#22C55E" />
              <stop offset="100%" stopColor="#15803D" />
            </radialGradient>
            <radialGradient id={`dewDrop-${pad.id}`} cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#BAE6FD" stopOpacity="0.45" />
            </radialGradient>
          </defs>

          {/* Outer glow halo for active target */}
          {isTarget && (
            <path
              d={leafPath}
              fill="none"
              stroke="#FEF08A"
              strokeWidth="7"
              strokeOpacity="0.45"
              strokeLinejoin="round"
            />
          )}

          {/* Organic Lotus Leaf with notch */}
          <path
            d={leafPath}
            fill={`url(#leafGrad-${pad.id})`}
            stroke={isTarget ? '#FACC15' : '#166534'}
            strokeWidth={isTarget ? '3.5' : '2'}
            strokeLinejoin="round"
          />

          {/* Leaf Veins radiating from center */}
          <path d="M 120 42 Q 162 28 202 32" stroke="#14532D" strokeWidth="1.5" strokeOpacity="0.32" fill="none" />
          <path d="M 120 42 Q 176 58 214 66" stroke="#14532D" strokeWidth="1.5" strokeOpacity="0.32" fill="none" />
          <path d="M 120 42 Q 138 72 152 88" stroke="#14532D" strokeWidth="1.5" strokeOpacity="0.32" fill="none" />
          <path d="M 120 42 Q 96 72 80 88" stroke="#14532D" strokeWidth="1.5" strokeOpacity="0.32" fill="none" />
          <path d="M 120 42 Q 58 58 24 66" stroke="#14532D" strokeWidth="1.5" strokeOpacity="0.32" fill="none" />
          <path d="M 120 42 Q 68 28 34 32" stroke="#14532D" strokeWidth="1.5" strokeOpacity="0.32" fill="none" />

          {/* Shiny water dew drop */}
          <circle cx="192" cy="40" r="4.5" fill={`url(#dewDrop-${pad.id})`} />
          <circle cx="194" cy="38" r="1.4" fill="#FFFFFF" />

          {/* Cute pink lotus flower bud */}
          {pad.hasFlower && (
            <g transform="translate(206, 20) scale(0.68)">
              <ellipse cx="0" cy="0" rx="8" ry="14" fill="#F472B6" />
              <ellipse cx="-6" cy="3" rx="6" ry="11" fill="#FB7185" />
              <ellipse cx="6" cy="3" rx="6" ry="11" fill="#FB7185" />
              <circle cx="0" cy="5" r="4" fill="#FEF08A" />
            </g>
          )}

          {/* Marching golden dashed contour hugging the exact leaf shape */}
          {isTarget && (
            <path
              d={leafPath}
              fill="none"
              stroke="#FEF08A"
              strokeWidth="3"
              strokeDasharray="10 10"
              strokeLinecap="round"
              className="animate-dash-march"
            />
          )}
        </svg>

        {/* Word & Meaning Overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-1.5">
          {/* English Word Pill */}
          <div
            className={`px-2 sm:px-3 py-0.5 rounded-full font-bold tracking-wide leading-tight flex items-center justify-center shadow-md transition-all whitespace-nowrap ${
              word.word.length >= 16
                ? 'text-[10px] sm:text-xs lg:text-sm'
                : word.word.length >= 11
                ? 'text-xs sm:text-sm lg:text-base'
                : 'text-sm sm:text-base lg:text-lg'
            } ${
              isTarget
                ? 'bg-amber-50 border-2 border-amber-400 text-slate-900 shadow-amber-500/30'
                : 'bg-white/95 border border-emerald-500/60 text-slate-800'
            }`}
          >
            {/* Typed letters: vibrant green */}
            <span className="text-emerald-600 font-extrabold">{typedPart}</span>

            {/* Next character: highlighted with bouncing indicator */}
            {nextChar && (
              <span className="relative text-amber-600 underline decoration-amber-400 decoration-2 underline-offset-2 font-black mx-[0.5px]">
                {nextChar}
                {isTarget && (
                  <span
                    aria-hidden="true"
                    className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-[10px] text-amber-400 drop-shadow-[0_1px_1px_rgba(0,0,0,0.6)] animate-bounce font-mono"
                  >
                    ▼
                  </span>
                )}
              </span>
            )}

            {/* Remaining letters */}
            <span className="text-slate-700">{remainingPart}</span>
          </div>

          {/* Chinese Meaning Badge (neatly positioned, never clipped) */}
          {showChinese && word.chinese && (
            <div className="mt-0.5 px-2 py-[1px] rounded-full bg-emerald-950/80 text-emerald-100 text-[10px] sm:text-[11px] leading-snug font-medium backdrop-blur-xs max-w-[104px] sm:max-w-[148px] lg:max-w-[180px] truncate shadow-sm border border-emerald-400/25">
              {word.chinese}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
