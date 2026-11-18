import React, { useState, useEffect, useRef, useCallback } from 'react';
import { UnitCourse, GameSettings, GameStats, LilyPad, ActiveFrog, WordItem } from '../types';
import { LilyPadView } from './LilyPadView';
import { FrogCharacter } from './FrogCharacter';
import { soundEngine } from '../services/soundEngine';
import { speechEngine } from '../services/speechEngine';

interface RiverGameProps {
  currentCourse: UnitCourse;
  settings: GameSettings;
  isPaused: boolean;
  onUpdateStats: (statsUpdater: (prev: GameStats) => GameStats) => void;
  onVictory: () => void;
  onGameOver: () => void;
  onNextCharChange: (char: string | null) => void;
  onFrogReachBank: () => void;
  onFrogLost: () => void;
}

interface FloatingPopup {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
}

const TOTAL_LANES = 4; // Lanes 1, 2, 3, 4

// Evenly spaced lane centers inside the river play area (22% spacing prevents vertical overlap on Desktop & iPad)
const LANE_Y: Record<number, number> = {
  0: 97, // Starting lotus dock right at the bottom bank edge
  1: 79, // Lane 1
  2: 57, // Lane 2
  3: 35, // Lane 3
  4: 13, // Lane 4
  5: -6  // Destination bank leap target
};

// Staggered horizontal offsets per lane so leaves look natural and organic
const LANE_OFFSETS: Record<number, number> = {
  1: 16,
  2: 4,
  3: 24,
  4: 10
};

const PRAISE_WORDS = ['Great! ✨', 'Awesome! 🌟', 'Nice! 🐸', 'Super! 🎉', '太棒了! ⭐'];

export const RiverGame: React.FC<RiverGameProps> = ({
  currentCourse,
  settings,
  isPaused,
  onUpdateStats,
  onVictory,
  onGameOver,
  onNextCharChange,
  onFrogReachBank,
  onFrogLost
}) => {
  // Visible state for rendering
  const [pads, setPads] = useState<LilyPad[]>([]);
  const [activeFrog, setActiveFrog] = useState<ActiveFrog>({
    currentLane: 0,
    currentPadId: null,
    x: 50,
    y: LANE_Y[0],
    status: 'idle',
    jumpProgress: 0,
    startX: 50,
    startY: LANE_Y[0],
    targetX: 50,
    targetY: LANE_Y[0]
  });

  const [waitingFrogs, setWaitingFrogs] = useState<number>(settings.totalFrogsPerRound - 1);
  const [arrivedFrogs, setArrivedFrogs] = useState<number>(0);
  const [targetPadId, setTargetPadId] = useState<string | null>(null);
  const [popups, setPopups] = useState<FloatingPopup[]>([]);

  // Mutable refs for high-frequency physics without stale closures
  const padsRef = useRef<LilyPad[]>([]);
  const frogRef = useRef<ActiveFrog>(activeFrog);
  const targetPadIdRef = useRef<string | null>(null);
  const wordIndexRef = useRef<number>(0);
  const isPausedRef = useRef<boolean>(isPaused);

  isPausedRef.current = isPaused;
  targetPadIdRef.current = targetPadId;

  const spawnPopup = useCallback((x: number, y: number, text: string, color: string = 'text-amber-300') => {
    const id = `pop-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setPopups((prev) => [...prev.slice(-4), { id, x, y, text, color }]);
    setTimeout(() => {
      setPopups((prev) => prev.filter((p) => p.id !== id));
    }, 1050);
  }, []);

  // Get next word from course
  const getNextWord = useCallback((): WordItem => {
    const words = currentCourse.words;
    if (words.length === 0) {
      return { word: 'frog', chinese: '青蛙' };
    }
    const word = words[wordIndexRef.current % words.length];
    wordIndexRef.current++;
    return word;
  }, [currentCourse]);

  // Spawn initial staggered river lily pads
  useEffect(() => {
    wordIndexRef.current = 0;
    const initialPads: LilyPad[] = [];

    for (let lane = 1; lane <= TOTAL_LANES; lane++) {
      const direction: 1 | -1 = lane % 2 === 1 ? 1 : -1;
      const speedMultiplier = settings.difficulty === 'easy' ? 0.35 : settings.difficulty === 'hard' ? 1.5 : 0.85;
      const baseSpeed = 0.048 * speedMultiplier;

      const count = 3;
      const laneOffset = LANE_OFFSETS[lane] ?? 12;
      for (let i = 0; i < count; i++) {
        const x = (laneOffset + i * (100 / count)) % 100;
        initialPads.push({
          id: `pad-${lane}-${i}-${Math.random().toString(36).substring(2, 6)}`,
          lane,
          x,
          width: 18,
          direction,
          speed: baseSpeed + lane * 0.005 * speedMultiplier,
          word: getNextWord(),
          typedLength: 0,
          isTarget: false,
          isSinking: false,
          sinkTimer: 0,
          hasFlower: (lane + i) % 2 === 0
        });
      }
    }

    padsRef.current = initialPads;
    setPads(initialPads);

    const initialFrog: ActiveFrog = {
      currentLane: 0,
      currentPadId: null,
      x: 50,
      y: LANE_Y[0],
      status: 'idle',
      jumpProgress: 0,
      startX: 50,
      startY: LANE_Y[0],
      targetX: 50,
      targetY: LANE_Y[0]
    };
    frogRef.current = initialFrog;
    setActiveFrog(initialFrog);

    setWaitingFrogs(settings.totalFrogsPerRound - 1);
    setArrivedFrogs(0);
    setTargetPadId(null);
    setPopups([]);
  }, [currentCourse, settings.difficulty, settings.totalFrogsPerRound, getNextWord]);

  // Jump Frog Action
  const jumpFrogTo = useCallback(
    (targetPad: LilyPad | null, isTopBank: boolean = false) => {
      soundEngine.playJump();
      soundEngine.playFrogCroak();

      const curFrog = frogRef.current;
      const startX = curFrog.x;
      const startY = curFrog.y;

      const nextLane = curFrog.currentLane + 1;
      let targetX = 50;
      let targetY = LANE_Y[nextLane] ?? LANE_Y[5];
      let padId: string | null = null;

      if (isTopBank) {
        targetX = Math.min(86, 22 + arrivedFrogs * 15);
        targetY = LANE_Y[5];
        padId = null;
        spawnPopup(curFrog.x, 15, '成功上岸! 🎉', 'text-yellow-200');
      } else if (targetPad) {
        targetX = targetPad.x;
        targetY = LANE_Y[targetPad.lane];
        padId = targetPad.id;
        const praise = PRAISE_WORDS[Math.floor(Math.random() * PRAISE_WORDS.length)];
        spawnPopup(targetPad.x, targetY, praise, 'text-amber-200');
      }

      const nextFrogState: ActiveFrog = {
        currentLane: nextLane,
        currentPadId: padId,
        x: startX,
        y: startY,
        status: 'jumping',
        jumpProgress: 0,
        startX,
        startY,
        targetX,
        targetY
      };

      frogRef.current = nextFrogState;
      setActiveFrog(nextFrogState);
      setTargetPadId(null);
    },
    [arrivedFrogs, spawnPopup]
  );

  // Process Keystroke Input
  const handleKeyInput = useCallback(
    (keyChar: string) => {
      if (isPausedRef.current) return;
      const curFrog = frogRef.current;
      if (curFrog.status === 'jumping' || curFrog.status === 'drowning') return;

      soundEngine.unlock();

      const nextLane = curFrog.currentLane + 1;

      // Leaping onto Top Bank from Lane 4!
      if (nextLane > TOTAL_LANES) {
        onUpdateStats((prev) => ({
          ...prev,
          score: prev.score + 180 + prev.combo * 20,
          combo: prev.combo + 1,
          maxCombo: Math.max(prev.maxCombo, prev.combo + 1),
          correctKeystrokes: prev.correctKeystrokes + 1,
          wordsCompleted: prev.wordsCompleted + 1
        }));
        jumpFrogTo(null, true);
        return;
      }

      // Looking for target pad in next lane
      const currentPads = padsRef.current;
      let currentTarget = currentPads.find((p) => p.id === targetPadIdRef.current);

      // Check if user typed the first letter of another leaf in that lane
      const otherMatchingPad = currentPads.find(
        (p) =>
          p.lane === nextLane &&
          p.id !== targetPadIdRef.current &&
          p.word.word[0].toLowerCase() === keyChar.toLowerCase()
      );

      if (
        (!currentTarget || currentTarget.typedLength === 0) &&
        otherMatchingPad &&
        (!currentTarget || currentTarget.word.word[0].toLowerCase() !== keyChar.toLowerCase())
      ) {
        currentTarget = otherMatchingPad;
        targetPadIdRef.current = otherMatchingPad.id;
        setTargetPadId(otherMatchingPad.id);
      }

      if (!currentTarget) {
        const lanePads = currentPads.filter((p) => p.lane === nextLane);
        if (lanePads.length > 0) {
          currentTarget = lanePads.reduce((prev, curr) =>
            Math.abs(curr.x - curFrog.x) < Math.abs(prev.x - curFrog.x) ? curr : prev
          );
          targetPadIdRef.current = currentTarget.id;
          setTargetPadId(currentTarget.id);
        }
      }

      if (!currentTarget) return;

      const expectedChar = currentTarget.word.word[currentTarget.typedLength]?.toLowerCase();

      if (keyChar.toLowerCase() === expectedChar) {
        const nextTyped = currentTarget.typedLength + 1;
        currentTarget.typedLength = nextTyped;

        onUpdateStats((prev) => {
          const newCombo = prev.combo + 1;
          soundEngine.playKeyCorrect(newCombo);
          return {
            ...prev,
            score: prev.score + 25 + newCombo * 5,
            combo: newCombo,
            maxCombo: Math.max(prev.maxCombo, newCombo),
            correctKeystrokes: prev.correctKeystrokes + 1
          };
        });

        if (nextTyped >= currentTarget.word.word.length) {
          onUpdateStats((prev) => ({
            ...prev,
            wordsCompleted: prev.wordsCompleted + 1
          }));

          jumpFrogTo(currentTarget, false);
        } else {
          const nextNeeded = currentTarget.word.word[nextTyped] || null;
          onNextCharChange(nextNeeded);
        }

        setPads([...padsRef.current]);
      } else {
        soundEngine.playKeyError();
        onUpdateStats((prev) => ({
          ...prev,
          combo: 0,
          wrongKeystrokes: prev.wrongKeystrokes + 1
        }));
      }
    },
    [jumpFrogTo, onNextCharChange, onUpdateStats]
  );

  // Global keydown listener
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }
      if (e.key === 'Escape') {
        const currentTarget = padsRef.current.find((p) => p.id === targetPadIdRef.current);
        if (currentTarget) {
          currentTarget.typedLength = 0;
          setPads([...padsRef.current]);
          onNextCharChange(currentTarget.word.word[0] || null);
        }
        return;
      }

      if (e.key.length === 1) {
        e.preventDefault();
        handleKeyInput(e.key);
      } else if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        handleKeyInput(' ');
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleKeyInput, onNextCharChange]);

  // Trigger final leap to top bank via touch/click
  const handleFinalLeap = useCallback(() => {
    if (frogRef.current.currentLane === TOTAL_LANES && frogRef.current.status === 'sitting') {
      soundEngine.unlock();
      onUpdateStats((prev) => ({
        ...prev,
        score: prev.score + 180 + prev.combo * 20,
        combo: prev.combo + 1,
        maxCombo: Math.max(prev.maxCombo, prev.combo + 1),
        correctKeystrokes: prev.correctKeystrokes + 1,
        wordsCompleted: prev.wordsCompleted + 1
      }));
      jumpFrogTo(null, true);
    }
  }, [jumpFrogTo, onUpdateStats]);

  // Main 60fps Physics & Drift Loop
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const loop = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      if (!isPausedRef.current) {
        const curFrog = frogRef.current;
        const currentPads = padsRef.current;

        // 1. Move Lily Pads
        for (let i = 0; i < currentPads.length; i++) {
          const pad = currentPads[i];
          pad.x += pad.direction * pad.speed * 60 * dt;

          // Wrap around screen edges
          if (pad.direction === 1 && pad.x > 112) {
            pad.x = -12;
            pad.word = getNextWord();
            pad.typedLength = 0;
            pad.sinkTimer = 0;
            pad.isSinking = false;
          } else if (pad.direction === -1 && pad.x < -12) {
            pad.x = 112;
            pad.word = getNextWord();
            pad.typedLength = 0;
            pad.sinkTimer = 0;
            pad.isSinking = false;
          }

          // Sinking logic when frog is standing on it
          if (curFrog.currentPadId === pad.id && settings.difficulty !== 'easy') {
            pad.isSinking = true;
            pad.sinkTimer += dt * (settings.difficulty === 'hard' ? 0.12 : 0.05);
          }
        }

        // 2. Update Frog Physics
        if (curFrog.status === 'jumping') {
          const nextProgress = curFrog.jumpProgress + dt * 2.8;
          if (nextProgress >= 1) {
            if (curFrog.currentLane > TOTAL_LANES) {
              soundEngine.playReachBank();
              onFrogReachBank();

              setArrivedFrogs((prev) => {
                const nextCount = prev + 1;
                if (nextCount >= settings.totalFrogsPerRound) {
                  setTimeout(() => onVictory(), 500);
                }
                return nextCount;
              });

              if (waitingFrogs > 0) {
                setWaitingFrogs((prev) => prev - 1);
                setTimeout(() => {
                  const newFrog: ActiveFrog = {
                    currentLane: 0,
                    currentPadId: null,
                    x: 50,
                    y: LANE_Y[0],
                    status: 'idle',
                    jumpProgress: 0,
                    startX: 50,
                    startY: LANE_Y[0],
                    targetX: 50,
                    targetY: LANE_Y[0]
                  };
                  frogRef.current = newFrog;
                  setActiveFrog(newFrog);
                  setTargetPadId(null);
                }, 420);
              }

              curFrog.status = 'celebrating';
              curFrog.jumpProgress = 1;
              curFrog.x = curFrog.targetX;
              curFrog.y = curFrog.targetY;
            } else {
              const landedPad = currentPads.find((p) => p.id === curFrog.currentPadId);
              if (landedPad) {
                curFrog.x = landedPad.x;
                curFrog.y = LANE_Y[landedPad.lane];
                if (settings.ttsEnabled) {
                  speechEngine.speak(landedPad.word.word);
                }
              }
              curFrog.status = 'sitting';
              curFrog.jumpProgress = 0;
            }
          } else {
            const targetPad = currentPads.find((p) => p.id === curFrog.currentPadId);
            const liveTargetX = targetPad ? targetPad.x : curFrog.targetX;

            const arc = Math.sin(nextProgress * Math.PI) * 12;
            curFrog.x = curFrog.startX + (liveTargetX - curFrog.startX) * nextProgress;
            curFrog.y = curFrog.startY + (curFrog.targetY - curFrog.startY) * nextProgress - arc;
            curFrog.jumpProgress = nextProgress;
          }
        } else if (curFrog.status === 'sitting' && curFrog.currentPadId) {
          const currentPad = currentPads.find((p) => p.id === curFrog.currentPadId);
          if (currentPad) {
            curFrog.x = currentPad.x;
            curFrog.y = LANE_Y[currentPad.lane];

            if (settings.difficulty !== 'easy' && (currentPad.x < 2 || currentPad.x > 98 || currentPad.sinkTimer >= 1)) {
              soundEngine.playSplash();
              onFrogLost();
              curFrog.status = 'drowning';

              setTimeout(() => {
                const respawnFrog: ActiveFrog = {
                  currentLane: 0,
                  currentPadId: null,
                  x: 50,
                  y: LANE_Y[0],
                  status: 'idle',
                  jumpProgress: 0,
                  startX: 50,
                  startY: LANE_Y[0],
                  targetX: 50,
                  targetY: LANE_Y[0]
                };
                frogRef.current = respawnFrog;
                setActiveFrog(respawnFrog);
                setTargetPadId(null);
              }, 800);
            }
          }
        }

        // 3. Keep target pad and virtual keyboard in sync
        const nextLane = curFrog.currentLane + 1;
        if (nextLane <= TOTAL_LANES) {
          let currentTarget = currentPads.find((p) => p.id === targetPadIdRef.current && p.lane === nextLane);
          // Re-pick if current target drifted off visible play region while untouched
          if (currentTarget && currentTarget.typedLength === 0 && (currentTarget.x < 8 || currentTarget.x > 92)) {
            currentTarget = undefined;
          }
          if (!currentTarget) {
            const visibleLanePads = currentPads.filter((p) => p.lane === nextLane && p.x >= 10 && p.x <= 90);
            const pool = visibleLanePads.length > 0 ? visibleLanePads : currentPads.filter((p) => p.lane === nextLane);
            if (pool.length > 0) {
              currentTarget = pool.reduce((prev, curr) =>
                Math.abs(curr.x - curFrog.x) < Math.abs(prev.x - curFrog.x) ? curr : prev
              );
              targetPadIdRef.current = currentTarget.id;
              setTargetPadId(currentTarget.id);
            }
          }

          if (currentTarget) {
            const nextChar = currentTarget.word.word[currentTarget.typedLength] || null;
            onNextCharChange(nextChar);
          }
        } else {
          onNextCharChange(' ');
        }

        for (let i = 0; i < currentPads.length; i++) {
          currentPads[i].isTarget = currentPads[i].id === targetPadIdRef.current;
        }

        setPads([...currentPads]);
        setActiveFrog({ ...curFrog });
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [
    getNextWord,
    onFrogLost,
    onFrogReachBank,
    onNextCharChange,
    onVictory,
    settings.difficulty,
    settings.totalFrogsPerRound,
    settings.ttsEnabled,
    waitingFrogs
  ]);

  return (
    <div className="relative w-full h-full min-h-0 flex-1 overflow-hidden select-none bg-gradient-to-b from-cyan-400 via-sky-300 to-teal-400 shadow-inner flex flex-col justify-between">
      {/* Subtle sunlit shimmer & river lane wave guides */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.28),transparent_60%)]" />
        <div className="absolute top-[24%] left-0 right-0 h-[1px] border-b border-dashed border-white/35" />
        <div className="absolute top-[46%] left-0 right-0 h-[1px] border-b border-dashed border-white/35" />
        <div className="absolute top-[68%] left-0 right-0 h-[1px] border-b border-dashed border-white/35" />
      </div>

      {/* Decorative swimming fish & ripples */}
      <div className="absolute top-[28%] left-[7%] pointer-events-none opacity-35 text-xs sm:text-sm animate-float">
        🐟 ~ ~
      </div>
      <div className="absolute top-[66%] right-[10%] pointer-events-none opacity-35 text-xs sm:text-sm animate-pulse">
        ~ ~ 🐠
      </div>

      {/* TOP DESTINATION BANK (终点安全岛 - with storybook hills scenery) */}
      <div
        onClick={handleFinalLeap}
        className={`relative w-full h-[54px] sm:h-[66px] lg:h-[74px] shrink-0 bg-gradient-to-b from-emerald-600 via-emerald-500 to-emerald-600 border-b-4 border-emerald-700/80 shadow-lg px-3 sm:px-6 lg:px-8 flex items-center justify-between z-10 overflow-hidden transition ${
          activeFrog.currentLane === TOTAL_LANES ? 'cursor-pointer ring-4 ring-amber-300/90 animate-pulse' : ''
        }`}
      >
        {/* Storybook distant rolling hills SVG silhouette (tribute to classic Kingsoft pond bank) */}
        <svg
          viewBox="0 0 1440 90"
          preserveAspectRatio="none"
          className="absolute inset-0 w-full h-full pointer-events-none opacity-30"
        >
          <path d="M0 90 Q 160 15, 340 60 T 720 45 T 1100 55 T 1440 35 L 1440 90 Z" fill="#A7F3D0" />
          <path d="M0 90 Q 220 40, 480 72 T 960 55 T 1440 68 L 1440 90 Z" fill="#065F46" />
        </svg>

        <div className="relative flex items-center gap-2 sm:gap-3 z-10">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-emerald-700/70 border border-emerald-300/40 flex items-center justify-center shadow-inner text-lg sm:text-2xl">
            🌸
          </div>
          <div>
            <span className="font-extrabold text-xs sm:text-sm lg:text-base text-white tracking-wider drop-shadow block">
              对岸安全岛 (终点站)
            </span>
            <span className="hidden sm:inline text-[11px] text-emerald-100/85">
              护送全部 {settings.totalFrogsPerRound} 只小青蛙上岸即闯关成功！
            </span>
          </div>
        </div>

        {/* Resting lotus slots for rescued frogs */}
        <div className="relative flex items-center gap-1.5 sm:gap-2.5 lg:gap-3 z-10">
          {Array.from({ length: settings.totalFrogsPerRound }).map((_, idx) => (
            <div
              key={idx}
              className={`w-8 h-8 sm:w-11 sm:h-11 lg:w-12 lg:h-12 rounded-full border-2 flex items-center justify-center relative shadow-inner transition-all ${
                idx < arrivedFrogs
                  ? 'bg-emerald-400/35 border-amber-300 shadow-[0_0_12px_rgba(253,224,71,0.45)]'
                  : 'bg-emerald-800/70 border-emerald-300/40'
              }`}
            >
              {idx < arrivedFrogs ? (
                <div className="animate-bounce">
                  <FrogCharacter status="celebrating" size={34} />
                </div>
              ) : (
                <span className="text-[11px] sm:text-xs text-emerald-200/50 font-mono font-bold">{idx + 1}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* RIVER PLAY AREA (4 Evenly Spaced Floating Lanes) */}
      <div className="relative w-full flex-1 min-h-0">
        {[4, 3, 2, 1].map((lane) => {
          const lanePads = pads.filter((p) => p.lane === lane);
          const topPercent = LANE_Y[lane];

          return (
            <div
              key={lane}
              className="absolute left-0 right-0 h-[22%]"
              style={{
                top: `${topPercent}%`,
                transform: 'translateY(-50%)',
              }}
            >
              {lanePads.map((pad) => (
                <LilyPadView
                  key={pad.id}
                  pad={pad}
                  showChinese={settings.showChinesePrompt}
                  onSelect={() => {
                    targetPadIdRef.current = pad.id;
                    setTargetPadId(pad.id);
                  }}
                />
              ))}
            </div>
          );
        })}

        {/* Floating Praise / Score Popups */}
        {popups.map((p) => (
          <div
            key={p.id}
            className={`absolute z-40 pointer-events-none font-black text-sm sm:text-base lg:text-lg drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] animate-float-up whitespace-nowrap ${p.color}`}
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
            }}
          >
            {p.text}
          </div>
        ))}

        {/* Lane 4 to Top Bank Leap Button (Works seamlessly on Desktop, iPad & Mobile) */}
        {activeFrog.currentLane === TOTAL_LANES && activeFrog.status === 'sitting' && (
          <button
            onClick={handleFinalLeap}
            className="absolute top-[2%] left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 px-5 sm:px-6 py-2 sm:py-2.5 rounded-full bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 text-slate-950 font-black text-xs sm:text-sm lg:text-base animate-bounce shadow-[0_6px_24px_rgba(251,191,36,0.65)] border-2 border-white cursor-pointer hover:scale-105 active:scale-95 transition whitespace-nowrap"
          >
            <span>🚀 点击一跃上岸！(或敲击空格 Space) 🌸</span>
          </button>
        )}

        {/* Starting Dock Lotus Leaf at bottom center (where Lane 0 frog sits) */}
        <div
          className="absolute left-1/2 -translate-x-1/2 bottom-0 translate-y-[20%] w-24 sm:w-28 h-10 sm:h-12 rounded-full bg-gradient-to-b from-emerald-400 to-emerald-600 border-2 border-emerald-700/70 shadow-md pointer-events-none z-10 opacity-90"
        />

        {/* ACTIVE FROG */}
        <div
          onClick={handleFinalLeap}
          className={`absolute z-30 transition-transform ${
            activeFrog.currentLane === TOTAL_LANES ? 'cursor-pointer hover:scale-110 active:scale-95' : ''
          }`}
          style={{
            left: `${activeFrog.x}%`,
            top: `${activeFrog.y}%`,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <FrogCharacter
            status={activeFrog.status}
            size={activeFrog.status === 'jumping' ? 74 : 62}
            jumpProgress={activeFrog.jumpProgress}
          />
        </div>
      </div>

      {/* BOTTOM STARTING BANK (出发跳台) */}
      <div className="relative w-full h-[46px] sm:h-[54px] lg:h-[60px] shrink-0 bg-gradient-to-t from-emerald-800 via-emerald-700 to-emerald-600 border-t-4 border-emerald-500/70 shadow-2xl px-3 sm:px-6 lg:px-8 flex items-center justify-between z-10">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 bg-emerald-900/80 px-2.5 sm:px-3 py-1 rounded-xl border border-emerald-400/40 text-xs font-bold text-emerald-100 shadow-sm">
            <span>🌿 出发跳台</span>
          </div>

          {/* Waiting frogs queue */}
          <div className="flex items-center gap-1 sm:gap-1.5">
            <span className="text-xs text-emerald-200/90 font-medium hidden sm:inline">候场小青蛙:</span>
            {Array.from({ length: waitingFrogs }).map((_, idx) => (
              <span key={idx} className="text-lg sm:text-xl lg:text-2xl leading-none filter drop-shadow">
                🐸
              </span>
            ))}
            {waitingFrogs === 0 && (
              <span className="text-xs text-amber-200 font-bold bg-amber-600/50 px-2.5 py-0.5 rounded-full animate-pulse">
                最后一只冲锋中！
              </span>
            )}
          </div>
        </div>

        {/* Tip for children on iPad & Desktop */}
        <div className="hidden md:flex items-center gap-2 text-xs text-emerald-100 bg-emerald-900/65 px-3.5 py-1.5 rounded-xl border border-emerald-400/30 shadow-inner">
          <span>🎯 敲击黄色光圈荷叶上的单词，也可直接点击荷叶切换目标 (Esc 键重置输入)</span>
        </div>
      </div>
    </div>
  );
};
