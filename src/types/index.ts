export type VocabCategory = 'textbook' | 'exam' | 'phonics' | 'custom';
export type VocabStage = 'primary' | 'junior' | 'senior' | 'ielts' | 'toefl' | 'cet' | 'other';
export type VocabSemester = 'upper' | 'lower' | 'full' | 'none';

export interface WordItem {
  word: string;
  chinese: string;
  phonetic?: string;
  pos?: string;
  category?: string;
  difficulty?: number; // 1 (easy/short) to 3 (harder)
  aliases?: string[];
  example?: string;
}

export interface UnitCourse {
  id: string;
  unitNumber?: number;
  title: string;
  subtitle: string;
  grade: string;
  source: 'builtin' | 'custom';
  words: WordItem[];
}

export interface Textbook {
  id: string;
  name: string;
  category?: VocabCategory;
  stage?: VocabStage;
  grade: string;
  semester?: VocabSemester;
  publisher: string;
  description: string;
  tags?: string[];
  units: UnitCourse[];
}

export interface VocabUnitEntry {
  id?: string;
  unitNumber?: number;
  title: string;
  subtitle?: string;
  words: WordItem[];
}

export interface VocabBookEntry {
  id?: string;
  name: string;
  category?: VocabCategory;
  stage?: VocabStage;
  grade?: string;
  semester?: VocabSemester;
  publisher?: string;
  description?: string;
  tags?: string[];
  units: VocabUnitEntry[];
}

export interface VocabJsonPack {
  schemaVersion?: string;
  book?: VocabBookEntry;
  books?: VocabBookEntry[];
}

export type GameDifficulty = 'easy' | 'normal' | 'hard';
export type GameInputMode = 'typing' | 'voice';

export interface GameSettings {
  difficulty: GameDifficulty;
  inputMode: GameInputMode;
  soundVolume: number; // 0 to 1
  sfxEnabled: boolean;
  ttsEnabled: boolean; // Voice pronunciation
  showVirtualKeyboard: boolean;
  showFingerGuide: boolean;
  showChinesePrompt: boolean;
  totalFrogsPerRound: number; // e.g., 5 frogs to cross
  driftSpeedMultiplier: number;
}

export interface LilyPad {
  id: string;
  lane: number; // 0 (bottom bank) to N+1 (top bank), 1..N are river lanes
  x: number; // 0 to 100 (% of lane width)
  width: number; // in %
  direction: 1 | -1; // 1 = moving right, -1 = moving left
  speed: number;
  word: WordItem;
  typedLength: number;
  isTarget: boolean;
  isSinking: boolean;
  sinkTimer: number; // 0 (dry) to 1 (fully sunk)
  hasFlower?: boolean;
}

export type FrogStatus = 'idle' | 'jumping' | 'sitting' | 'drowning' | 'celebrating';

export interface ActiveFrog {
  currentLane: number; // 0 is bottom bank, 1..totalLanes, totalLanes+1 is destination bank
  currentPadId: string | null;
  x: number; // %
  y: number; // %
  status: FrogStatus;
  jumpProgress: number; // 0 to 1
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
}

export interface GameStats {
  score: number;
  combo: number;
  maxCombo: number;
  correctKeystrokes: number;
  wrongKeystrokes: number;
  wordsCompleted: number;
  frogsSaved: number;
  frogsLost: number;
  startTime: number;
  endTime: number | null;
}
