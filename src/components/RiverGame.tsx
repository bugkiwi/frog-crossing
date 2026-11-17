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

const TOTAL_LANES = 4; // Lanes 1, 2, 3, 4

// Standard Lane vertical center percentages in the river container
const LANE_Y: Record<number, number> = {
  0: 92, // Bottom starting bank
  1: 72, // Lane 1
  2: 56, // Lane 2
  3: 40, // Lane 3
  4: 24, // Lane 4
  5: 8   // Top destination bank
};

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

  // Mutable refs for high-frequency physics without stale closures
  const padsRef = useRef<LilyPad[]>([]);
  const frogRef = useRef<ActiveFrog>(activeFrog);
  const targetPadIdRef = useRef<string | null>(null);
  const wordIndexRef = useRef<number>(0);
  const isPausedRef = useRef<boolean>(isPaused);

  // Sync refs with props/state
  isPausedRef.current = isPaused;
  targetPadIdRef.current = targetPadId;

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

  // Spawn initial river lily pads
  useEffect(() => {
    wordIndexRef.current = 0;
    const initialPads: LilyPad[] = [];

    for (let lane = 1; lane <= TOTAL_LANES; lane++) {
      const direction: 1 | -1 = lane % 2 === 1 ? 1 : -1;
      const speedMultiplier = settings.difficulty === 'easy' ? 0.35 : settings.difficulty === 'hard' ? 1.5 : 0.85;
      const baseSpeed = 0.05 * speedMultiplier;

      const count = 3;
      for (let i = 0; i < count; i++) {
        // Stagger X across lane
        const x = (100 / count) * i + (direction === 1 ? 12 : 22);
        initialPads.push({
          id: `pad-${lane}-${i}-${Math.random().toString(36).substring(2, 6)}`,
          lane,
          x,
          width: 18,
          direction,
          speed: baseSpeed + (lane * 0.006 * speedMultiplier),
          word: getNextWord(),
          typedLength: 0,
          isTarget: false,
          isSinking: false,
          sinkTimer: 0,
          hasFlower: Math.random() > 0.6
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
        targetX = 18 + arrivedFrogs * 16;
        targetY = LANE_Y[5];
        padId = null;
      } else if (targetPad) {
        targetX = targetPad.x;
        targetY = LANE_Y[targetPad.lane];
        padId = targetPad.id;
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
    [arrivedFrogs]
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
        // Fallback: pick the closest pad in that lane
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
        // Correct key!
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

        // Check if word completed
        if (nextTyped >= currentTarget.word.word.length) {
          onUpdateStats((prev) => ({
            ...prev,
            wordsCompleted: prev.wordsCompleted + 1
          }));

          jumpFrogTo(currentTarget, false);
        } else {
          // Update next needed character for virtual keyboard
          const nextNeeded = currentTarget.word.word[nextTyped] || null;
          onNextCharChange(nextNeeded);
        }

        // Trigger render
        setPads([...padsRef.current]);
      } else {
        // Typo
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
        // Reset typed length of current target
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
          if (pad.direction === 1 && pad.x > 115) {
            pad.x = -15;
            pad.word = getNextWord();
            pad.typedLength = 0;
            pad.sinkTimer = 0;
            pad.isSinking = false;
          } else if (pad.direction === -1 && pad.x < -15) {
            pad.x = 115;
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
          const nextProgress = curFrog.jumpProgress + dt * 2.8; // ~350ms duration
          if (nextProgress >= 1) {
            // Jump completed!
            if (curFrog.currentLane > TOTAL_LANES) {
              // Reached Top Bank!
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
                }, 400);
              }

              curFrog.status = 'celebrating';
              curFrog.jumpProgress = 1;
              curFrog.x = curFrog.targetX;
              curFrog.y = curFrog.targetY;
            } else {
              // Landed on River Pad
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
            // In flight: track the moving target pad
            const targetPad = currentPads.find((p) => p.id === curFrog.currentPadId);
            const liveTargetX = targetPad ? targetPad.x : curFrog.targetX;

            const arc = Math.sin(nextProgress * Math.PI) * 12;
            curFrog.x = curFrog.startX + (liveTargetX - curFrog.startX) * nextProgress;
            curFrog.y = curFrog.startY + (curFrog.targetY - curFrog.startY) * nextProgress - arc;
            curFrog.jumpProgress = nextProgress;
          }
        } else if (curFrog.status === 'sitting' && curFrog.currentPadId) {
          // Sitting on a moving leaf: follow it exactly!
          const currentPad = currentPads.find((p) => p.id === curFrog.currentPadId);
          if (currentPad) {
            curFrog.x = currentPad.x;
            curFrog.y = LANE_Y[currentPad.lane];

            // Edge / Sinking fail check
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

          if (currentTarget) {
            const nextChar = currentTarget.word.word[currentTarget.typedLength] || null;
            onNextCharChange(nextChar);
          }
        } else {
          // At Lane 4, ready to jump to top bank!
          onNextCharChange(' ');
        }

        // Update target flags on pads
        for (let i = 0; i < currentPads.length; i++) {
          currentPads[i].isTarget = currentPads[i].id === targetPadIdRef.current;
        }

        // Sync to React state for rendering
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
    <div className="relative w-full h-full min-h-[480px] flex-1 overflow-hidden select-none bg-gradient-to-b from-teal-400 via-sky-300 to-emerald-400 shadow-inner flex flex-col justify-between">
      {/* Background Water Currents & Animated Waves */}
      <div className="absolute inset-0 pointer-events-none opacity-25 overflow-hidden">
        <div className="absolute top-[24%] left-0 right-0 h-1 border-b-2 border-dashed border-white/60 animate-pulse"></div>
        <div className="absolute top-[40%] left-0 right-0 h-1 border-b-2 border-dashed border-white/60 animate-pulse delay-150"></div>
        <div className="absolute top-[56%] left-0 right-0 h-1 border-b-2 border-dashed border-white/60 animate-pulse delay-300"></div>
        <div className="absolute top-[72%] left-0 right-0 h-1 border-b-2 border-dashed border-white/60 animate-pulse delay-500"></div>
      </div>

      {/* Decorative little swimming fish */}
      <div className="absolute top-[32%] left-[8%] pointer-events-none opacity-30 text-xs animate-bounce">
        🐟 ~ ~
      </div>
      <div className="absolute top-[62%] right-[12%] pointer-events-none opacity-30 text-xs animate-pulse">
        ~ ~ 🐠
      </div>

      {/* TOP DESTINATION BANK (终点安全岛) */}
      <div
        className="relative w-full bg-gradient-to-b from-emerald-700 via-emerald-600 to-teal-700 border-b-4 border-emerald-800 shadow-lg px-6 flex items-center justify-between z-10"
        style={{ height: '14%' }}
      >
        <div className="flex items-center gap-2">
          <span className="text-2xl">🌸</span>
          <div>
            <span className="font-extrabold text-xs md:text-sm text-emerald-100 tracking-wider drop-shadow block">
              对岸安全岛 (终点站)
            </span>
            <span className="text-[10px] text-emerald-300/80">护送所有小青蛙到达即获胜！</span>
          </div>
        </div>

        {/* Resting slots for rescued frogs */}
        <div className="flex items-center gap-2 md:gap-3">
          {Array.from({ length: settings.totalFrogsPerRound }).map((_, idx) => (
            <div
              key={idx}
              className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-emerald-800/80 border-2 border-emerald-400/60 flex items-center justify-center relative shadow-inner"
            >
              {idx < arrivedFrogs ? (
                <div className="animate-bounce">
                  <FrogCharacter status="celebrating" size={38} />
                </div>
              ) : (
                <span className="text-xs text-emerald-300/40 font-mono font-bold">{idx + 1}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* RIVER PLAY AREA (Lanes & Pads) */}
      <div className="relative w-full flex-1">
        {/* Render River Lanes 4 down to 1 */}
        {[4, 3, 2, 1].map((lane) => {
          const lanePads = pads.filter((p) => p.lane === lane);
          const topPercent = LANE_Y[lane];

          return (
            <div
              key={lane}
              className="absolute left-0 right-0 h-[18%]"
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

        {/* Lane 4 to Top Bank Leap Guide */}
        {activeFrog.currentLane === TOTAL_LANES && activeFrog.status === 'sitting' && (
          <div className="absolute top-[16%] left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-400/90 text-slate-950 font-black text-xs animate-bounce shadow-xl border-2 border-amber-300">
            <span>✨ 敲击 [空格 Space] 或任意键，一跃上岸！✨</span>
          </div>
        )}

        {/* ACTIVE FROG */}
        <div
          className="absolute z-30 transition-transform"
          style={{
            left: `${activeFrog.x}%`,
            top: `${activeFrog.y}%`,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <FrogCharacter
            status={activeFrog.status}
            size={activeFrog.status === 'jumping' ? 76 : 64}
            jumpProgress={activeFrog.jumpProgress}
          />
        </div>
      </div>

      {/* BOTTOM STARTING BANK (出发跳台) */}
      <div
        className="relative w-full bg-gradient-to-t from-emerald-800 via-emerald-700 to-emerald-600 border-t-4 border-emerald-600 shadow-2xl px-6 flex items-center justify-between z-10"
        style={{ height: '14%' }}
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-emerald-900/80 px-3 py-1.5 rounded-xl border border-emerald-400/40 text-xs font-bold text-emerald-100 shadow-sm">
            <span>🌿 出发跳台</span>
          </div>

          {/* Waiting frogs queue */}
          <div className="flex items-center gap-1.5 ml-2">
            <span className="text-xs text-emerald-200/90 font-medium">候场小青蛙:</span>
            {Array.from({ length: waitingFrogs }).map((_, idx) => (
              <span key={idx} className="text-xl md:text-2xl filter drop-shadow">
                🐸
              </span>
            ))}
            {waitingFrogs === 0 && (
              <span className="text-xs text-amber-200 font-bold bg-amber-600/50 px-2 py-0.5 rounded-full animate-pulse">
                冲锋中！
              </span>
            )}
          </div>
        </div>

        {/* Tip for children */}
        <div className="hidden sm:flex items-center gap-2 text-xs text-emerald-100 bg-emerald-900/60 px-3 py-1.5 rounded-xl border border-emerald-500/30">
          <span>🎯 看准黄色光圈荷叶，敲击键盘单词即可跳跃！</span>
        </div>
      </div>
    </div>
  );
};
