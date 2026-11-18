import React from 'react';
import { FrogStatus } from '../types';

interface FrogCharacterProps {
  status: FrogStatus;
  size?: number; // size in px
  jumpProgress?: number; // 0 to 1
  isLeader?: boolean;
}

export const FrogCharacter: React.FC<FrogCharacterProps> = React.memo(({
  status,
  size = 64,
  jumpProgress = 0,
  isLeader = false
}) => {
  // Compute jump stretch and vertical offset
  let jumpScaleX = 1;
  let jumpScaleY = 1;
  let jumpRotation = 0;

  if (status === 'jumping' && jumpProgress > 0) {
    // Parabolic arc stretch: squash at launch/land, stretch mid-air
    const arc = Math.sin(jumpProgress * Math.PI);
    jumpScaleY = 1 + arc * 0.35;
    jumpScaleX = 1 - arc * 0.2;
    jumpRotation = (jumpProgress - 0.5) * 20; // slight tilt during flight
  } else if (status === 'drowning') {
    jumpScaleY = 0.7;
    jumpScaleX = 0.9;
  }

  return (
    <div
      className="relative flex items-center justify-center pointer-events-none select-none"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        transform:
          jumpScaleX !== 1 || jumpScaleY !== 1 || jumpRotation !== 0
            ? `scale(${jumpScaleX}, ${jumpScaleY}) rotate(${jumpRotation}deg)`
            : undefined,
      }}
    >
      <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
        <defs>
          <radialGradient id="frogSkin" cx="40%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#86EFAC" />
            <stop offset="60%" stopColor="#4ADE80" />
            <stop offset="100%" stopColor="#22C55E" />
          </radialGradient>
          <radialGradient id="frogBelly" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FEF08A" />
            <stop offset="100%" stopColor="#FACC15" />
          </radialGradient>
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="3" stdDeviation="2" floodColor="#064E3B" floodOpacity="0.25" />
          </filter>
        </defs>

        {/* Back feet */}
        {status === 'jumping' ? (
          // Extended legs during jump
          <>
            <ellipse cx="20" cy="88" rx="14" ry="7" fill="#22C55E" transform="rotate(-30 20 88)" />
            <ellipse cx="80" cy="88" rx="14" ry="7" fill="#22C55E" transform="rotate(30 80 88)" />
          </>
        ) : (
          // Folded resting feet
          <>
            <ellipse cx="18" cy="75" rx="13" ry="8" fill="#22C55E" />
            <circle cx="10" cy="80" r="4" fill="#22C55E" />
            <circle cx="16" cy="83" r="4" fill="#22C55E" />
            <circle cx="23" cy="83" r="4" fill="#22C55E" />

            <ellipse cx="82" cy="75" rx="13" ry="8" fill="#22C55E" />
            <circle cx="90" cy="80" r="4" fill="#22C55E" />
            <circle cx="84" cy="83" r="4" fill="#22C55E" />
            <circle cx="77" cy="83" r="4" fill="#22C55E" />
          </>
        )}

        {/* Frog Body */}
        <ellipse cx="50" cy="58" rx="34" ry="28" fill="url(#frogSkin)" filter="url(#shadow)" />

        {/* Yellow belly */}
        <ellipse cx="50" cy="63" rx="21" ry="17" fill="url(#frogBelly)" opacity="0.9" />

        {/* Front Hands */}
        {status === 'celebrating' ? (
          // Hands waving in the air!
          <>
            <path d="M 28 48 Q 15 30 18 20" stroke="#22C55E" strokeWidth="6" strokeLinecap="round" fill="none" />
            <circle cx="18" cy="18" r="5" fill="#22C55E" />
            <path d="M 72 48 Q 85 30 82 20" stroke="#22C55E" strokeWidth="6" strokeLinecap="round" fill="none" />
            <circle cx="82" cy="18" r="5" fill="#22C55E" />
          </>
        ) : (
          // Resting little hands
          <>
            <ellipse cx="33" cy="65" rx="5" ry="9" fill="#22C55E" />
            <ellipse cx="67" cy="65" rx="5" ry="9" fill="#22C55E" />
          </>
        )}

        {/* Big Frog Eyeballs */}
        <circle cx="31" cy="30" r="15" fill="url(#frogSkin)" stroke="#16A34A" strokeWidth="2.5" />
        <circle cx="69" cy="30" r="15" fill="url(#frogSkin)" stroke="#16A34A" strokeWidth="2.5" />

        {/* Sclera (White) */}
        <circle cx="32" cy="30" r="10" fill="#FFFFFF" />
        <circle cx="68" cy="30" r="10" fill="#FFFFFF" />

        {/* Pupils with expressions */}
        {status === 'drowning' ? (
          // Dizzy/swirly eyes when drowning
          <>
            <text x="32" y="34" textAnchor="middle" fontSize="13" fontWeight="bold" fill="#0F172A">
              X
            </text>
            <text x="68" y="34" textAnchor="middle" fontSize="13" fontWeight="bold" fill="#0F172A">
              X
            </text>
          </>
        ) : status === 'celebrating' ? (
          // Joyful arched crescent eyes ^^
          <>
            <path d="M 25 31 Q 32 23 39 31" fill="none" stroke="#0F172A" strokeWidth="3.5" strokeLinecap="round" />
            <path d="M 61 31 Q 68 23 75 31" fill="none" stroke="#0F172A" strokeWidth="3.5" strokeLinecap="round" />
          </>
        ) : (
          // Cute big shiny eyes
          <>
            <circle cx="34" cy="30" r="6" fill="#0F172A" />
            <circle cx="66" cy="30" r="6" fill="#0F172A" />
            <circle cx="36" cy="27" r="2.5" fill="#FFFFFF" />
            <circle cx="68" cy="27" r="2.5" fill="#FFFFFF" />
          </>
        )}

        {/* Rosy blush cheeks */}
        <circle cx="26" cy="54" r="6.5" fill="#FB7185" opacity="0.65" />
        <circle cx="74" cy="54" r="6.5" fill="#FB7185" opacity="0.65" />

        {/* Mouth */}
        {status === 'drowning' ? (
          // Wavy nervous mouth ~
          <path d="M 38 58 Q 50 50 62 58" fill="none" stroke="#047857" strokeWidth="3.5" strokeLinecap="round" />
        ) : status === 'celebrating' ? (
          // Big happy open mouth with pink tongue
          <g>
            <path d="M 36 53 Q 50 72 64 53 Z" fill="#E11D48" stroke="#047857" strokeWidth="2.5" />
            <ellipse cx="50" cy="62" rx="7" ry="4" fill="#FDA4AF" />
          </g>
        ) : (
          // Sweet gentle smile
          <path d="M 38 54 Q 50 65 62 54" fill="none" stroke="#047857" strokeWidth="3.5" strokeLinecap="round" />
        )}

        {/* Crown or cute sprout on leader frog */}
        {isLeader && (
          <path
            d="M 40 16 L 44 8 L 50 14 L 56 8 L 60 16 Z"
            fill="#FACC15"
            stroke="#CA8A04"
            strokeWidth="1.5"
            className="animate-bounce"
          />
        )}
      </svg>
    </div>
  );
});
