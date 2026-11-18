import React from 'react';

interface LilyPadViewProps {
  padId: string;
  wordText: string;
  chinese: string;
  typedLength: number;
  isTarget: boolean;
  hasFlower: boolean;
  showSinkBubbles: boolean;
  showChinese: boolean;
  onSelect: () => void;
  innerRef?: (el: HTMLDivElement | null) => void;
  initialLeftPx?: number;
}

const LEAF_PATH =
  'M 120 12 C 172 10, 226 28, 231 54 C 236 80, 184 95, 120 94 C 56 95, 4 80, 9 54 C 14 28, 68 10, 114 12 L 120 42 Z';

export const LilyPadView: React.FC<LilyPadViewProps> = React.memo(
  ({
    padId,
    wordText,
    chinese,
    typedLength,
    isTarget,
    hasFlower,
    showSinkBubbles,
    showChinese,
    onSelect,
    innerRef,
    initialLeftPx
  }) => {
    const typedPart = wordText.slice(0, typedLength);
    const nextChar = wordText[typedLength] || '';
    const remainingPart = wordText.slice(typedLength + 1);

    return (
      <div
        ref={innerRef}
        onClick={onSelect}
        className={`absolute top-1/2 left-0 cursor-pointer select-none flex flex-col items-center justify-center will-change-transform ${
          isTarget ? 'z-20' : 'z-10'
        }`}
        style={{
          transform:
            initialLeftPx !== undefined
              ? `translate3d(${initialLeftPx}px, -50%, 0) translateX(-50%) scale(${isTarget ? 1.06 : 1})`
              : `translate3d(0px, -50%, 0) translateX(-50%) scale(${isTarget ? 1.06 : 1})`,
        }}
      >
        {/* Sinking water bubbles if close to sinking */}
        {showSinkBubbles && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <span className="animate-ping absolute w-16 h-16 rounded-full border-2 border-cyan-200 opacity-60"></span>
            <span className="animate-pulse absolute text-[11px] text-white font-bold -top-4 drop-shadow">💦 噗噜噜...</span>
          </div>
        )}

        {/* Lotus Leaf Container (scales slightly wider for multi-word holiday/cultural phrases) */}
        <div
          className={`relative h-[58px] sm:h-[68px] lg:h-[76px] flex items-center justify-center ${
            wordText.length >= 15
              ? 'w-[144px] sm:w-[196px] md:w-[216px] lg:w-[244px]'
              : 'w-[112px] sm:w-[162px] md:w-[178px] lg:w-[204px]'
          }`}
        >
          {/* Lightweight water shadow / target halo beneath the leaf (zero expensive SVG filter!) */}
          <div
            className={`absolute inset-x-2 -bottom-1 h-4 rounded-full pointer-events-none ${
              isTarget
                ? 'bg-amber-300/55 shadow-[0_0_18px_rgba(250,204,21,0.7)]'
                : 'bg-teal-950/25'
            }`}
          />

          <svg
            viewBox="0 0 240 100"
            preserveAspectRatio="none"
            className="w-full h-full overflow-visible"
          >
            <defs>
              <radialGradient id={`leafGrad-${padId}`} cx="42%" cy="38%" r="60%">
                <stop offset="0%" stopColor="#86EFAC" />
                <stop offset="55%" stopColor="#22C55E" />
                <stop offset="100%" stopColor="#15803D" />
              </radialGradient>
            </defs>

            {/* Outer glow halo for active target (pure vector stroke — GPU cheap!) */}
            {isTarget && (
              <path
                d={LEAF_PATH}
                fill="none"
                stroke="#FEF08A"
                strokeWidth="8"
                strokeOpacity="0.45"
                strokeLinejoin="round"
              />
            )}

            {/* Organic Lotus Leaf with notch */}
            <path
              d={LEAF_PATH}
              fill={`url(#leafGrad-${padId})`}
              stroke={isTarget ? '#FACC15' : '#166534'}
              strokeWidth={isTarget ? '3.5' : '2'}
              strokeLinejoin="round"
            />

            {/* Leaf Veins radiating from center */}
            <path d="M 120 42 Q 162 28 202 32" stroke="#14532D" strokeWidth="1.5" strokeOpacity="0.3" fill="none" />
            <path d="M 120 42 Q 176 58 214 66" stroke="#14532D" strokeWidth="1.5" strokeOpacity="0.3" fill="none" />
            <path d="M 120 42 Q 138 72 152 88" stroke="#14532D" strokeWidth="1.5" strokeOpacity="0.3" fill="none" />
            <path d="M 120 42 Q 96 72 80 88" stroke="#14532D" strokeWidth="1.5" strokeOpacity="0.3" fill="none" />
            <path d="M 120 42 Q 58 58 24 66" stroke="#14532D" strokeWidth="1.5" strokeOpacity="0.3" fill="none" />
            <path d="M 120 42 Q 68 28 34 32" stroke="#14532D" strokeWidth="1.5" strokeOpacity="0.3" fill="none" />

            {/* Shiny water dew drop */}
            <circle cx="192" cy="40" r="4" fill="#E0F2FE" fillOpacity="0.85" />
            <circle cx="193.5" cy="38.5" r="1.4" fill="#FFFFFF" />

            {/* Cute pink lotus flower bud */}
            {hasFlower && (
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
                d={LEAF_PATH}
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
              className={`px-2 sm:px-3 py-0.5 rounded-full font-bold tracking-wide leading-tight flex items-center justify-center shadow-sm whitespace-nowrap ${
                wordText.length >= 16
                  ? 'text-[10px] sm:text-xs lg:text-sm'
                  : wordText.length >= 11
                  ? 'text-xs sm:text-sm lg:text-base'
                  : 'text-sm sm:text-base lg:text-lg'
              } ${
                isTarget
                  ? 'bg-amber-50 border-2 border-amber-400 text-slate-900'
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
                      className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-[10px] text-amber-400 animate-bounce font-mono"
                    >
                      ▼
                    </span>
                  )}
                </span>
              )}

              {/* Remaining letters */}
              <span className="text-slate-700">{remainingPart}</span>
            </div>

            {/* Chinese Meaning Badge (no backdrop-blur on moving layers = butter-smooth 60fps!) */}
            {showChinese && chinese && (
              <div className="mt-0.5 px-2 py-[1px] rounded-full bg-emerald-950/88 text-emerald-100 text-[10px] sm:text-[11px] leading-snug font-medium max-w-[104px] sm:max-w-[148px] lg:max-w-[180px] truncate shadow-xs border border-emerald-400/25">
                {chinese}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  },
  (prev, next) =>
    prev.padId === next.padId &&
    prev.wordText === next.wordText &&
    prev.chinese === next.chinese &&
    prev.typedLength === next.typedLength &&
    prev.isTarget === next.isTarget &&
    prev.hasFlower === next.hasFlower &&
    prev.showSinkBubbles === next.showSinkBubbles &&
    prev.showChinese === next.showChinese
);
