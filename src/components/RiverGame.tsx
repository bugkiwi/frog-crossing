import React, { useState, useEffect, useRef, useCallback } from 'react';
import { UnitCourse, GameSettings, GameInputMode, GameStats, LilyPad, ActiveFrog, WordItem } from '../types';
import { LilyPadView } from './LilyPadView';
import { FrogCharacter } from './FrogCharacter';
import { VoiceControlPanel, VoiceFeedback } from './VoiceControlPanel';
import { soundEngine } from '../services/soundEngine';
import { speechEngine } from '../services/speechEngine';
import {
  voiceRecognitionEngine,
  VoiceRecognitionStatus,
  matchSpokenWord,
  matchFinalLeapCommand
} from '../services/voiceRecognitionEngine';

interface LearningSummary {
  unitLabel: string;
  previewedCount: number;
  totalVocab: number;
  practicedTimes: number;
  accuracy: number;
}

interface RiverGameProps {
  currentCourse: UnitCourse;
  settings: GameSettings;
  isPaused: boolean;
  initialFrogsSaved?: number;
  learningSummary?: LearningSummary;
  onUpdateStats: (statsUpdater: (prev: GameStats) => GameStats) => void;
  onVictory: () => void;
  onGameOver: () => void;
  onNextCharChange: (char: string | null) => void;
  onFrogReachBank: () => void;
  onFrogLost: () => void;
  onWordSeen?: (word: string) => void;
  onWordCompleted?: (word: string) => void;
  onWordMistake?: (word: string) => void;
  onOpenStats?: () => void;
  onSwitchInputMode?: (mode: GameInputMode) => void;
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

/**
 * Compute remaining safe horizontal runway (%) before a drifting pad exits the screen.
 */
function getPadRunway(pad: LilyPad): number {
  return pad.direction === 1 ? 98 - pad.x : pad.x - 2;
}

/**
 * Determine responsive lily pad density per lane based on viewport width so wide desktop
 * screens never have massive empty water gaps between words.
 */
function getPadsPerLaneForWidth(width: number): number {
  if (width >= 1650) return 5;
  if (width >= 1180) return 4;
  return 3;
}

export const RiverGame: React.FC<RiverGameProps> = ({
  currentCourse,
  settings,
  isPaused,
  initialFrogsSaved = 0,
  learningSummary,
  onUpdateStats,
  onVictory,
  onGameOver,
  onNextCharChange,
  onFrogReachBank,
  onFrogLost,
  onWordSeen,
  onWordCompleted,
  onWordMistake,
  onOpenStats,
  onSwitchInputMode
}) => {
  const safeInitialSaved = Math.min(Math.max(0, initialFrogsSaved), Math.max(0, settings.totalFrogsPerRound - 1));
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [padsPerLane, setPadsPerLane] = useState<number>(() =>
    getPadsPerLaneForWidth(typeof window !== 'undefined' ? window.innerWidth : 1280)
  );
  const isVoiceMode = settings.inputMode === 'voice';

  // Voice Recognition UI states
  const [voiceStatus, setVoiceStatus] = useState<VoiceRecognitionStatus>(() =>
    voiceRecognitionEngine.getStatus()
  );
  const [voiceHeard, setVoiceHeard] = useState<string>('');
  const [voiceFeedback, setVoiceFeedback] = useState<VoiceFeedback | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  // If the page cold-loaded already in voice mode, wait for a user gesture before requesting mic permission;
  // if the user clicks "语音" to switch from typing -> voice, auto-start immediately!
  const userMicPausedRef = useRef<boolean>(settings.inputMode === 'voice');

  // Measure river container width to adapt pad density cleanly across Mobile / iPad / Desktop / Ultrawide
  useEffect(() => {
    const updateWidth = (w: number) => {
      if (w <= 0) return;
      const nextCount = getPadsPerLaneForWidth(w);
      setPadsPerLane((prev) => (prev === nextCount ? prev : nextCount));
    };

    const el = containerRef.current;
    if (el && typeof ResizeObserver !== 'undefined') {
      updateWidth(el.clientWidth);
      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          updateWidth(entry.contentRect.width);
        }
      });
      observer.observe(el);
      return () => observer.disconnect();
    }

    const onResize = () => updateWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

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

  const [waitingFrogs, setWaitingFrogs] = useState<number>(
    Math.max(0, settings.totalFrogsPerRound - safeInitialSaved - 1)
  );
  const [arrivedFrogs, setArrivedFrogs] = useState<number>(safeInitialSaved);
  const [targetPadId, setTargetPadId] = useState<string | null>(null);
  const [popups, setPopups] = useState<FloatingPopup[]>([]);

  // Mutable refs for high-frequency physics without stale closures
  const padsRef = useRef<LilyPad[]>([]);
  const frogRef = useRef<ActiveFrog>(activeFrog);
  const targetPadIdRef = useRef<string | null>(null);
  const wordIndexRef = useRef<number>(0);
  const isPausedRef = useRef<boolean>(isPaused);
  const waitingFrogsRef = useRef<number>(waitingFrogs);
  const arrivedFrogsRef = useRef<number>(arrivedFrogs);
  const lastSeenPadIdRef = useRef<string | null>(null);
  const onWordSeenRef = useRef(onWordSeen);
  const onWordCompletedRef = useRef(onWordCompleted);
  const onWordMistakeRef = useRef(onWordMistake);

  isPausedRef.current = isPaused;
  targetPadIdRef.current = targetPadId;
  waitingFrogsRef.current = waitingFrogs;
  arrivedFrogsRef.current = arrivedFrogs;
  onWordSeenRef.current = onWordSeen;
  onWordCompletedRef.current = onWordCompleted;
  onWordMistakeRef.current = onWordMistake;

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

  // Helper: Reset a pad to a clean, un-typed state with a fresh word
  const resetPadFresh = useCallback(
    (pad: LilyPad) => {
      pad.word = getNextWord();
      pad.typedLength = 0;
      pad.isSinking = false;
      pad.sinkTimer = 0;
      pad.isTarget = false;
    },
    [getNextWord]
  );

  // Helper: Clean up any completed/sinking pads whenever a new frog starts from Lane 0
  const sanitizeAllPadsForNewFrog = useCallback(() => {
    const currentPads = padsRef.current;
    for (let i = 0; i < currentPads.length; i++) {
      const p = currentPads[i];
      if (p.typedLength > 0 || p.isSinking || p.sinkTimer > 0) {
        if (p.typedLength >= p.word.word.length) {
          p.word = getNextWord();
        }
        p.typedLength = 0;
        p.isSinking = false;
        p.sinkTimer = 0;
      }
    }
  }, [getNextWord]);

  // Spawn initial staggered river lily pads (adapts density cleanly to screen width)
  useEffect(() => {
    wordIndexRef.current = 0;
    const initialPads: LilyPad[] = [];

    // Compensate horizontal percentage speed slightly on wider viewports so leaves don't zip across 1920px+ screens
    const wideSpeedScale = padsPerLane >= 5 ? 0.72 : padsPerLane === 4 ? 0.85 : 1.0;

    for (let lane = 1; lane <= TOTAL_LANES; lane++) {
      const direction: 1 | -1 = lane % 2 === 1 ? 1 : -1;
      const speedMultiplier = settings.difficulty === 'easy' ? 0.35 : settings.difficulty === 'hard' ? 1.45 : 0.78;
      const baseSpeed = 0.044 * speedMultiplier * wideSpeedScale;

      const count = padsPerLane;
      const step = 100 / count;
      const laneOffset = (LANE_OFFSETS[lane] ?? 12) % step;
      for (let i = 0; i < count; i++) {
        const x = (laneOffset + i * step) % 100;
        initialPads.push({
          id: `pad-${lane}-${i}-${Math.random().toString(36).substring(2, 6)}`,
          lane,
          x,
          width: Math.round(70 / count),
          direction,
          speed: baseSpeed + lane * 0.004 * speedMultiplier * wideSpeedScale,
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

    const saved = Math.min(Math.max(0, initialFrogsSaved), Math.max(0, settings.totalFrogsPerRound - 1));
    const waiting = Math.max(0, settings.totalFrogsPerRound - saved - 1);
    setArrivedFrogs(saved);
    arrivedFrogsRef.current = saved;
    setWaitingFrogs(waiting);
    waitingFrogsRef.current = waiting;
    setTargetPadId(null);
    targetPadIdRef.current = null;
    setPopups([]);
  }, [currentCourse, settings.difficulty, settings.totalFrogsPerRound, initialFrogsSaved, padsPerLane, getNextWord]);

  // Jump Frog Action
  const jumpFrogTo = useCallback(
    (targetPad: LilyPad | null, isTopBank: boolean = false) => {
      soundEngine.playJump();
      soundEngine.playFrogCroak();

      const curFrog = frogRef.current;
      const startX = curFrog.x;
      const startY = curFrog.y;

      // Immediately refresh the pad the frog is jumping AWAY from so it's never left in a stale completed state
      if (curFrog.currentPadId) {
        const prevPad = padsRef.current.find((p) => p.id === curFrog.currentPadId);
        if (prevPad && (!targetPad || prevPad.id !== targetPad.id)) {
          resetPadFresh(prevPad);
        }
      }

      const nextLane = curFrog.currentLane + 1;
      let targetX = 50;
      let targetY = LANE_Y[nextLane] ?? LANE_Y[5];
      let padId: string | null = null;

      if (isTopBank) {
        targetX = Math.min(86, 22 + arrivedFrogsRef.current * 15);
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
      targetPadIdRef.current = null;
      setTargetPadId(null);
    },
    [resetPadFresh, spawnPopup]
  );

  // Helper: Guarantee a valid, uncompleted, SAFE-RUNWAY target pad in nextLane
  // Prevents jumping onto a far-edge leaf that immediately drifts off-screen and traps the child!
  const ensureValidTargetInLane = useCallback(
    (nextLane: number, frogX: number): LilyPad | null => {
      const currentPads = padsRef.current;

      // Defensive sanitization: no pad in nextLane should ever remain completed (typedLength >= word.length)
      for (let i = 0; i < currentPads.length; i++) {
        const p = currentPads[i];
        if (p.lane === nextLane && p.id !== frogRef.current.currentPadId && p.typedLength >= p.word.word.length) {
          resetPadFresh(p);
        }
      }

      let currentTarget = currentPads.find(
        (p) => p.id === targetPadIdRef.current && p.lane === nextLane && p.typedLength < p.word.word.length
      );

      // Re-pick if current target is untouched and has drifted too close to its exit edge (< 24% runway)
      if (
        currentTarget &&
        currentTarget.typedLength === 0 &&
        (currentTarget.x < 8 || currentTarget.x > 92 || getPadRunway(currentTarget) < 24)
      ) {
        currentTarget = undefined;
      }

      if (!currentTarget) {
        const lanePads = currentPads.filter((p) => p.lane === nextLane && p.typedLength < p.word.word.length);

        // Tier 1: Comfortably visible AND plenty of safe drift runway (>= 36%)
        const primePool = lanePads.filter((p) => p.x >= 10 && p.x <= 90 && getPadRunway(p) >= 36);
        // Tier 2: Visible with acceptable runway (>= 24%)
        const safePool = lanePads.filter((p) => p.x >= 8 && p.x <= 92 && getPadRunway(p) >= 24);
        const pool = primePool.length > 0 ? primePool : safePool.length > 0 ? safePool : lanePads;

        if (pool.length > 0) {
          // Prefer nearby pads while giving a meaningful bonus to pads with generous safe runway
          currentTarget = pool.reduce((best, curr) => {
            const bestScore = Math.abs(best.x - frogX) - getPadRunway(best) * 0.25;
            const currScore = Math.abs(curr.x - frogX) - getPadRunway(curr) * 0.25;
            return currScore < bestScore ? curr : best;
          });
          targetPadIdRef.current = currentTarget.id;
          setTargetPadId(currentTarget.id);
        }
      }

      return currentTarget ?? null;
    },
    [resetPadFresh]
  );

  // Process Keystroke Input
  const handleKeyInput = useCallback(
    (keyChar: string) => {
      if (isPausedRef.current) return;
      const curFrog = frogRef.current;
      if (curFrog.status === 'jumping' || curFrog.status === 'drowning' || curFrog.status === 'celebrating') return;

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

      // Ensure we have a valid target pad in nextLane
      let currentTarget = ensureValidTargetInLane(nextLane, curFrog.x);

      // Check if user typed the first letter of another visible leaf in nextLane
      const otherMatchingPad = padsRef.current.find(
        (p) =>
          p.lane === nextLane &&
          p.id !== targetPadIdRef.current &&
          p.x >= 4 &&
          p.x <= 96 &&
          p.typedLength === 0 &&
          p.word.word[0]?.toLowerCase() === keyChar.toLowerCase()
      );

      if (
        (!currentTarget || currentTarget.typedLength === 0) &&
        otherMatchingPad &&
        (!currentTarget || currentTarget.word.word[0]?.toLowerCase() !== keyChar.toLowerCase())
      ) {
        currentTarget = otherMatchingPad;
        targetPadIdRef.current = otherMatchingPad.id;
        setTargetPadId(otherMatchingPad.id);
      }

      if (!currentTarget) return;

      const expectedChar = currentTarget.word.word[currentTarget.typedLength]?.toLowerCase();

      if (expectedChar && keyChar.toLowerCase() === expectedChar) {
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
          onWordCompletedRef.current?.(currentTarget.word.word);

          jumpFrogTo(currentTarget, false);
        } else {
          const nextNeeded = currentTarget.word.word[nextTyped] || null;
          onNextCharChange(nextNeeded);
        }

        setPads([...padsRef.current]);
      } else {
        soundEngine.playKeyError();
        onWordMistakeRef.current?.(currentTarget.word.word);
        onUpdateStats((prev) => ({
          ...prev,
          combo: 0,
          wrongKeystrokes: prev.wrongKeystrokes + 1
        }));
      }
    },
    [ensureValidTargetInLane, jumpFrogTo, onNextCharChange, onUpdateStats]
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

  // Trigger final leap to top bank via touch/click or voice command
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

  // Process Speech Recognition transcripts in Voice Mode
  const handleVoiceResult = useCallback(
    (transcript: string, alternatives: string[], isFinal: boolean) => {
      if (isPausedRef.current) return;
      setVoiceHeard(transcript);
      setVoiceError(null);

      const curFrog = frogRef.current;
      if (curFrog.status === 'jumping' || curFrog.status === 'drowning' || curFrog.status === 'celebrating') {
        return;
      }

      soundEngine.unlock();
      const nextLane = curFrog.currentLane + 1;

      // Lane 4 -> Top Bank final voice leap ("Jump!" / "Go!" / "跳")
      if (nextLane > TOTAL_LANES) {
        if (matchFinalLeapCommand(alternatives)) {
          voiceRecognitionEngine.suppressFor(1200);
          setVoiceFeedback({ type: 'success', text: '读得真棒！小青蛙一跃上岸！🎉' });
          setVoiceHeard('');
          handleFinalLeap();
        } else if (isFinal) {
          soundEngine.playKeyError();
          setVoiceFeedback({
            type: 'retry',
            text: `听到了「${transcript}」，请大声说 "Jump!" 或点击上方按钮上岸哦 💪`
          });
        }
        return;
      }

      const currentTarget = ensureValidTargetInLane(nextLane, curFrog.x);
      if (!currentTarget) return;

      // Check primary target pad first, then any other visible uncompleted pad in nextLane
      let matchedPad: LilyPad | null = null;
      if (matchSpokenWord(alternatives, currentTarget.word.word)) {
        matchedPad = currentTarget;
      } else {
        const otherMatch = padsRef.current.find(
          (p) =>
            p.lane === nextLane &&
            p.id !== currentTarget.id &&
            p.x >= 6 &&
            p.x <= 94 &&
            p.typedLength < p.word.word.length &&
            matchSpokenWord(alternatives, p.word.word)
        );
        if (otherMatch) {
          matchedPad = otherMatch;
        }
      }

      if (matchedPad) {
        // Pronounced accurately! Jump to the matched lotus leaf!
        const wordLen = Math.max(1, matchedPad.word.word.length);
        matchedPad.typedLength = wordLen;

        onUpdateStats((prev) => {
          const newCombo = prev.combo + 1;
          soundEngine.playKeyCorrect(newCombo);
          return {
            ...prev,
            score: prev.score + 60 + wordLen * 15 + newCombo * 10,
            combo: newCombo,
            maxCombo: Math.max(prev.maxCombo, newCombo),
            correctKeystrokes: prev.correctKeystrokes + wordLen,
            wordsCompleted: prev.wordsCompleted + 1
          };
        });

        onWordCompletedRef.current?.(matchedPad.word.word);
        voiceRecognitionEngine.suppressFor(1400);
        setVoiceFeedback({
          type: 'success',
          text: `发音准确！「${matchedPad.word.word}」跳跃成功！✨`
        });
        setVoiceHeard('');
        jumpFrogTo(matchedPad, false);
        setPads([...padsRef.current]);
      } else if (isFinal) {
        // Incorrect pronunciation -> do NOT jump! Encourage child to try again.
        soundEngine.playKeyError();
        onWordMistakeRef.current?.(currentTarget.word.word);
        onUpdateStats((prev) => ({
          ...prev,
          combo: 0,
          wrongKeystrokes: prev.wrongKeystrokes + 1
        }));
        setVoiceFeedback({
          type: 'retry',
          text: `听到了「${transcript}」，还没读对哦，请再试着读「${currentTarget.word.word}」💪`
        });
      }
    },
    [ensureValidTargetInLane, handleFinalLeap, jumpFrogTo, onUpdateStats]
  );

  // Manage Voice Recognition Engine lifecycle when in Voice Mode
  useEffect(() => {
    if (!isVoiceMode) {
      voiceRecognitionEngine.stop();
      voiceRecognitionEngine.setCallbacks(null);
      setVoiceHeard('');
      setVoiceFeedback(null);
      setVoiceError(null);
      userMicPausedRef.current = false;
      return;
    }

    voiceRecognitionEngine.setCallbacks({
      onResult: handleVoiceResult,
      onStatusChange: (status) => setVoiceStatus(status),
      onError: (msg) => setVoiceError(msg)
    });

    if (isPaused) {
      voiceRecognitionEngine.stop();
    } else if (!userMicPausedRef.current) {
      voiceRecognitionEngine.start();
    }

    return () => {
      voiceRecognitionEngine.stop();
      voiceRecognitionEngine.setCallbacks(null);
    };
  }, [isVoiceMode, isPaused, handleVoiceResult]);

  const handleToggleVoiceMic = useCallback(() => {
    soundEngine.unlock();
    setVoiceError(null);
    if (voiceStatus === 'listening') {
      userMicPausedRef.current = true;
      voiceRecognitionEngine.stop();
    } else {
      userMicPausedRef.current = false;
      voiceRecognitionEngine.start();
    }
  }, [voiceStatus]);

  const handlePlayVoiceSample = useCallback(() => {
    const pad = padsRef.current.find((p) => p.id === targetPadIdRef.current);
    if (pad) {
      voiceRecognitionEngine.suppressFor(1400);
      speechEngine.speak(pad.word.word, true);
    }
  }, []);

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
        const voiceDriftScale = isVoiceMode ? 0.72 : 1.0;

        // Check if child is actively typing the next target word so we pause sinking gracefully
        const activeTargetPad = targetPadIdRef.current
          ? currentPads.find((p) => p.id === targetPadIdRef.current)
          : undefined;
        const isActivelyTyping = Boolean(activeTargetPad && activeTargetPad.typedLength > 0);

        // 1. Move Lily Pads
        for (let i = 0; i < currentPads.length; i++) {
          const pad = currentPads[i];
          pad.x += pad.direction * pad.speed * voiceDriftScale * 60 * dt;

          // Wrap around screen edges
          if (pad.direction === 1 && pad.x > 112) {
            pad.x = -12;
            resetPadFresh(pad);
            if (targetPadIdRef.current === pad.id) {
              targetPadIdRef.current = null;
              setTargetPadId(null);
            }
          } else if (pad.direction === -1 && pad.x < -12) {
            pad.x = 112;
            resetPadFresh(pad);
            if (targetPadIdRef.current === pad.id) {
              targetPadIdRef.current = null;
              setTargetPadId(null);
            }
          }

          // Anti-frustration sinking logic:
          // - Never sink in Easy mode
          // - Pause sinking in Voice mode or while actively typing letters
          // - Gentler sinking rate in Normal mode (0.028/s vs 0.11/s in Hard)
          if (curFrog.currentPadId === pad.id && settings.difficulty !== 'easy') {
            if (!isVoiceMode && !isActivelyTyping) {
              pad.isSinking = true;
              pad.sinkTimer += dt * (settings.difficulty === 'hard' ? 0.11 : 0.028);
            }
          }
        }

        // 2. Update Frog Physics
        if (curFrog.status === 'jumping') {
          const nextProgress = curFrog.jumpProgress + dt * 2.8;
          if (nextProgress >= 1) {
            if (curFrog.currentLane > TOTAL_LANES) {
              soundEngine.playReachBank();
              onFrogReachBank();

              const nextArrived = arrivedFrogsRef.current + 1;
              arrivedFrogsRef.current = nextArrived;
              setArrivedFrogs(nextArrived);

              if (nextArrived >= settings.totalFrogsPerRound) {
                setTimeout(() => onVictory(), 500);
              } else if (waitingFrogsRef.current > 0) {
                const nextWaiting = waitingFrogsRef.current - 1;
                waitingFrogsRef.current = nextWaiting;
                setWaitingFrogs(nextWaiting);

                setTimeout(() => {
                  sanitizeAllPadsForNewFrog();
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
                  targetPadIdRef.current = null;
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
                  if (isVoiceMode) {
                    voiceRecognitionEngine.suppressFor(1350);
                  }
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
                sanitizeAllPadsForNewFrog();
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
                targetPadIdRef.current = null;
                setTargetPadId(null);
              }, 800);
            }
          }
        }

        // 3. Keep target pad and virtual keyboard strictly in sync
        if (curFrog.status === 'idle' || curFrog.status === 'sitting') {
          const nextLane = curFrog.currentLane + 1;
          if (nextLane <= TOTAL_LANES) {
            const validTarget = ensureValidTargetInLane(nextLane, curFrog.x);
            if (validTarget) {
              const targetKey = `${validTarget.id}:${validTarget.word.word}`;
              if (lastSeenPadIdRef.current !== targetKey) {
                lastSeenPadIdRef.current = targetKey;
                onWordSeenRef.current?.(validTarget.word.word);
              }
              const nextChar = validTarget.word.word[validTarget.typedLength] || null;
              onNextCharChange(nextChar);
            } else {
              onNextCharChange(null);
            }
          } else {
            onNextCharChange(' ');
          }
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
    ensureValidTargetInLane,
    isVoiceMode,
    onFrogLost,
    onFrogReachBank,
    onNextCharChange,
    onVictory,
    resetPadFresh,
    sanitizeAllPadsForNewFrog,
    settings.difficulty,
    settings.totalFrogsPerRound,
    settings.ttsEnabled
  ]);

  const activeTargetPad = targetPadId ? pads.find((p) => p.id === targetPadId) ?? null : null;
  const isFinalLeapReady = activeFrog.currentLane === TOTAL_LANES && activeFrog.status === 'sitting';

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full min-h-0 flex-1 overflow-hidden select-none bg-gradient-to-b from-cyan-400 via-sky-300 to-teal-400 shadow-inner flex flex-col justify-between"
    >
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
        {/* Storybook distant rolling hills SVG silhouette */}
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
                    // Only allow selecting pads in the immediate next lane!
                    const nextLane = frogRef.current.currentLane + 1;
                    if (pad.lane !== nextLane) return;
                    if (pad.typedLength >= pad.word.word.length) {
                      resetPadFresh(pad);
                    }
                    targetPadIdRef.current = pad.id;
                    setTargetPadId(pad.id);
                    onNextCharChange(pad.word.word[pad.typedLength] || null);
                    if (isVoiceMode) {
                      voiceRecognitionEngine.suppressFor(1400);
                      speechEngine.speak(pad.word.word, true);
                    }
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

        {/* Lane 4 to Top Bank Leap Button */}
        {isFinalLeapReady && (
          <button
            onClick={handleFinalLeap}
            className="absolute top-[2%] left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 px-5 sm:px-6 py-2 sm:py-2.5 rounded-full bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 text-slate-950 font-black text-xs sm:text-sm lg:text-base animate-bounce shadow-[0_6px_24px_rgba(251,191,36,0.65)] border-2 border-white cursor-pointer hover:scale-105 active:scale-95 transition whitespace-nowrap"
          >
            <span>
              {isVoiceMode
                ? '🎙️ 大声说 "Jump!" 或点击一跃上岸！🌸'
                : '🚀 点击一跃上岸！(或敲击空格 Space) 🌸'}
            </span>
          </button>
        )}

        {/* Starting Dock Lotus Leaf at bottom center */}
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

        {/* Live Unit Learning Progress Strip (clickable to open full Learning Report) */}
        {learningSummary ? (
          <button
            onClick={onOpenStats}
            className="flex items-center gap-2 sm:gap-3 text-[11px] sm:text-xs text-emerald-100 bg-emerald-950/70 hover:bg-emerald-900/90 px-2.5 sm:px-3.5 py-1.5 rounded-xl border border-emerald-400/35 hover:border-amber-300/60 shadow-inner transition cursor-pointer"
            title="点击查看完整课本单元词汇学习统计报告"
          >
            <span className="font-bold text-amber-200 hidden sm:inline">{learningSummary.unitLabel}</span>
            <span className="text-emerald-200/90">
              词汇 <strong className="text-sky-300 font-mono">{learningSummary.previewedCount}/{learningSummary.totalVocab}</strong>
            </span>
            <span className="text-emerald-200/90 hidden xs:inline sm:inline">
              已练 <strong className="text-emerald-300 font-mono">{learningSummary.practicedTimes}</strong> 遍
            </span>
            <span className="text-emerald-200/90">
              准确率{' '}
              <strong
                className={`font-mono ${
                  learningSummary.accuracy >= 90
                    ? 'text-emerald-300'
                    : learningSummary.accuracy >= 75
                    ? 'text-amber-300'
                    : 'text-orange-300'
                }`}
              >
                {learningSummary.accuracy}%
              </strong>
            </span>
            <span className="hidden lg:inline text-[10px] text-emerald-300/80 underline underline-offset-2">
              详情
            </span>
          </button>
        ) : (
          <div className="hidden md:flex items-center gap-2 text-xs text-emerald-100 bg-emerald-900/65 px-3.5 py-1.5 rounded-xl border border-emerald-400/30 shadow-inner">
            <span>🎯 敲击黄色光圈荷叶上的单词，也可直接点击荷叶切换目标 (Esc 键重置输入)</span>
          </div>
        )}
      </div>

      {/* VOICE MODE CONTROL PANEL (replaces virtual keyboard when Voice Gameplay is active) */}
      {isVoiceMode && (
        <div className="shrink-0 z-20">
          <VoiceControlPanel
            targetWord={activeTargetPad?.word ?? null}
            isFinalLeap={isFinalLeapReady}
            voiceStatus={voiceStatus}
            voiceHeard={voiceHeard}
            voiceFeedback={voiceFeedback}
            voiceError={voiceError}
            onToggleListening={handleToggleVoiceMic}
            onPlaySample={handlePlayVoiceSample}
            onFinalLeap={handleFinalLeap}
            onSwitchToTyping={() => onSwitchInputMode?.('typing')}
          />
        </div>
      )}
    </div>
  );
};
