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

  return (
    <div
      onClick={onSelect}
      className={`absolute cursor-pointer transition-all duration-150 select-none flex flex-col items-center justify-center ${
        isTarget ? 'scale-105 z-20' : 'hover:scale-102 z-10'
      }`}
      style={{
        left: `${pad.x}%`,
        width: `${pad.width}%`,
        height: '100%',
        transform: `translate(-50%, 0) scale(${sinkScale})`,
        opacity: sinkOpacity,
      }}
    >
      {/* Sinking water bubbles if close to sinking */}
      {isSinking && sinkTimer > 0.4 && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <span className="animate-ping absolute w-16 h-16 rounded-full border-2 border-cyan-300 opacity-60"></span>
          <span className="animate-pulse absolute text-xs text-sky-200 font-bold -top-2">💦 噗噜噜...</span>
        </div>
      )}

      {/* Lotus Leaf SVG graphic */}
      <div className="relative w-full max-w-[200px] aspect-[2.4/1] flex items-center justify-center">
        <svg
          viewBox="0 0 240 100"
          className={`w-full h-full overflow-visible transition-all drop-shadow-md ${
            isTarget ? 'filter drop-shadow-[0_0_12px_rgba(250,204,21,0.7)]' : ''
          }`}
        >
          <defs>
            <radialGradient id={`leafGrad-${pad.id}`} cx="45%" cy="45%" r="55%">
              <stop offset="0%" stopColor="#4ADE80" />
              <stop offset="70%" stopColor="#22C55E" />
              <stop offset="100%" stopColor="#15803D" />
            </radialGradient>
            {/* Dew drop shine */}
            <radialGradient id="dewDrop" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#BAE6FD" stopOpacity="0.4" />
            </radialGradient>
          </defs>

          {/* Organic Lotus Leaf with classic notch */}
          <path
            d="M 120 12 
               C 170 10, 225 30, 230 55 
               C 235 80, 185 96, 120 95 
               C 55 96, 5 80, 10 55 
               C 15 30, 70 10, 115 12 
               L 120 45 Z"
            fill={`url(#leafGrad-${pad.id})`}
            stroke={isTarget ? '#FACC15' : '#166534'}
            strokeWidth={isTarget ? '3.5' : '2'}
            strokeLinejoin="round"
          />

          {/* Leaf Veins radiating from center */}
          <path d="M 120 45 Q 160 30 200 32" stroke="#14532D" strokeWidth="1.5" strokeOpacity="0.4" fill="none" />
          <path d="M 120 45 Q 175 58 215 65" stroke="#14532D" strokeWidth="1.5" strokeOpacity="0.4" fill="none" />
          <path d="M 120 45 Q 135 75 150 90" stroke="#14532D" strokeWidth="1.5" strokeOpacity="0.4" fill="none" />
          <path d="M 120 45 Q 95 75 80 90" stroke="#14532D" strokeWidth="1.5" strokeOpacity="0.4" fill="none" />
          <path d="M 120 45 Q 60 58 25 65" stroke="#14532D" strokeWidth="1.5" strokeOpacity="0.4" fill="none" />
          <path d="M 120 45 Q 70 30 35 32" stroke="#14532D" strokeWidth="1.5" strokeOpacity="0.4" fill="none" />

          {/* Cute shiny water dew drop */}
          <circle cx="160" cy="40" r="5" fill="url(#dewDrop)" />
          <circle cx="162" cy="38" r="1.5" fill="#FFFFFF" />

          {/* Optional little pink lotus flower bud */}
          {pad.hasFlower && (
            <g transform="translate(195, 20) scale(0.65)">
              <ellipse cx="0" cy="0" rx="8" ry="14" fill="#F472B6" />
              <ellipse cx="-5" cy="2" rx="6" ry="12" fill="#FB7185" />
              <ellipse cx="5" cy="2" rx="6" ry="12" fill="#FB7185" />
              <circle cx="0" cy="4" r="4" fill="#FEF08A" />
            </g>
          )}

          {/* Golden Target Pulse Ring */}
          {isTarget && (
            <path
              d="M 120 12 
                 C 170 10, 225 30, 230 55 
                 C 235 80, 185 96, 120 95 
                 C 55 96, 5 80, 10 55 
                 C 15 30, 70 10, 115 12 
                 L 120 45 Z"
              fill="none"
              stroke="#FDE047"
              strokeWidth="2"
              strokeDasharray="6 4"
              className="animate-spin origin-center"
            />
          )}
        </svg>

        {/* Word Display Box */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pt-1 px-3">
          <div
            className={`px-3 py-1 rounded-full font-bold tracking-wider text-base md:text-lg flex items-center justify-center shadow-md transition-all ${
              isTarget
                ? 'bg-amber-100/95 border-2 border-amber-400 text-slate-800 scale-105'
                : 'bg-white/90 border border-emerald-400 text-slate-700'
            }`}
          >
            {/* Typed letters: vibrant green */}
            <span className="text-emerald-600 font-extrabold">{typedPart}</span>

            {/* Next character: highlighted with bouncing badge */}
            {nextChar && (
              <span className="relative text-amber-600 underline decoration-amber-400 decoration-2 font-black mx-[1px]">
                {nextChar}
                {isTarget && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] text-amber-500 animate-bounce font-mono">
                    ▼
                  </span>
                )}
              </span>
            )}

            {/* Remaining letters */}
            <span className="text-slate-600">{remainingPart}</span>
          </div>

          {/* Chinese Meaning Badge */}
          {showChinese && word.chinese && (
            <div className="mt-1 px-2 py-0.5 rounded-full bg-emerald-950/70 text-emerald-100 text-[11px] font-medium backdrop-blur-xs max-w-[150px] truncate shadow">
              {word.chinese}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
