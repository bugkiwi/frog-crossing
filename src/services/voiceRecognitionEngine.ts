/**
 * Kid-friendly, Stall-Proof English Speech Recognition Engine using the Web Speech API.
 *
 * Key Reliability Engineering:
 * - Always creates a fresh SpeechRecognition instance on restart/onend (never reuses zombie instances).
 * - Processes all results from event.resultIndex..results.length-1 with up to 5 alternatives.
 * - Live speech activity telemetry (onspeechstart / onspeechend) + 3.5s speech-stall watchdog.
 * - Preventive healthy session recycling (every ~35s when idle or every ~8 finalized utterances)
 *   to eliminate Chrome's infamous continuous-mode silent freeze ("suddenly stops recognizing window").
 * - Smart recently-matched echo filter instead of long mic blackouts so back-to-back words
 *   like "in", "girl", "window" are recognized immediately without being swallowed.
 * - Optional JSGF SpeechGrammarList hints for the active unit's vocabulary.
 */

export type VoiceRecognitionStatus = 'idle' | 'listening' | 'error' | 'unsupported';

export interface VoiceRecognitionCallbacks {
  onResult: (transcript: string, alternatives: string[], isFinal: boolean) => void;
  onStatusChange: (status: VoiceRecognitionStatus) => void;
  onSpeechActivity?: (isSpeaking: boolean) => void;
  onError?: (message: string) => void;
}

interface SpeechRecognitionAlternativeLike {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionResultLike {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionResultListLike {
  readonly length: number;
  [index: number]: SpeechRecognitionResultLike;
}

interface SpeechRecognitionEventLike {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultListLike;
}

interface SpeechRecognitionErrorEventLike {
  readonly error: string;
  readonly message?: string;
}

interface SpeechGrammarListLike {
  addFromString: (grammar: string, weight?: number) => void;
}

interface SpeechRecognitionInstanceLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  grammars?: SpeechGrammarListLike;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onspeechstart?: (() => void) | null;
  onspeechend?: (() => void) | null;
  onaudiostart?: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionInstanceLike;
type SpeechGrammarListCtor = new () => SpeechGrammarListLike;

/**
 * Curated phonetic homophones for Grade 1–3 English vocabulary.
 * Strictly true homophones / exact ASR equivalents so unrelated wrong words still do NOT jump.
 */
const HOMOPHONE_GROUPS: string[][] = [
  ['in', 'inn', 'en', 'n'],
  ['girl', 'gurl', 'girls'],
  ['boy', 'buoy', 'boys'],
  ['look', 'luke'],
  ['he', 'hee'],
  ['she', 'shi'],
  ['sun', 'son'],
  ['see', 'sea'],
  ['read', 'red'],
  ['write', 'right'],
  ['for', 'four', '4'],
  ['one', 'won', '1'],
  ['two', 'to', 'too', '2'],
  ['three', '3'],
  ['five', '5'],
  ['six', '6'],
  ['seven', '7'],
  ['eight', 'ate', '8'],
  ['nine', '9'],
  ['ten', '10'],
  ['wear', 'where'],
  ['wait', 'weight'],
  ['meat', 'meet'],
  ['sweet', 'suite'],
  ['pear', 'pair'],
  ['bear', 'bare'],
  ['hair', 'hare'],
  ['here', 'hear'],
  ['blue', 'blew'],
  ['hi', 'high'],
  ['eye', 'i'],
  ['buy', 'by', 'bye'],
  ['flower', 'flour'],
  ['know', 'no'],
  ['new', 'knew'],
  ['tail', 'tale'],
  ['tea', 'tee'],
  ['week', 'weak'],
  ['wood', 'would'],
  ['dear', 'deer'],
  ['plane', 'plain'],
  ['ant', 'aunt'],
  ['bee', 'be', 'b'],
  ['pea', 'p'],
  ['jay', 'j'],
  ['kay', 'k'],
  ['cue', 'q', 'queue'],
  ['are', 'r'],
  ['you', 'u'],
  ['why', 'y'],
  ['oh', 'o'],
  ['okay', 'ok'],
  ['mom', 'mum'],
  ['dad', 'daddy'],
  ['grandma', 'grandmother'],
  ['grandpa', 'grandfather'],
  ['jiaozi', 'dumpling', 'dumplings']
];

const HOMOPHONE_MAP = new Map<string, Set<string>>();
for (const group of HOMOPHONE_GROUPS) {
  const set = new Set(group);
  for (const w of group) {
    HOMOPHONE_MAP.set(w, set);
  }
}

function normalizeSpokenText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[’]/g, "'")
    .replace(/[^a-z0-9\s']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stemSimplePlural(word: string): string {
  if (word.length <= 3) return word;
  if (word.endsWith('ies') && word.length > 4) return word.slice(0, -3) + 'y';
  if (word.endsWith('es') && /(ch|sh|s|x|z|o)es$/.test(word)) return word.slice(0, -2);
  if (word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1);
  return word;
}

function tokensMatch(spokenToken: string, targetToken: string): boolean {
  if (!spokenToken || !targetToken) return false;
  if (spokenToken === targetToken) return true;

  // Plural/singular tolerance (e.g., noodle/noodles, apple/apples, shoe/shoes, girl/girls)
  if (stemSimplePlural(spokenToken) === stemSimplePlural(targetToken)) {
    return true;
  }

  // Exact phonetic homophones (e.g., in/inn/en, sun/son, see/sea, two/to/too, four/for)
  const homophones = HOMOPHONE_MAP.get(targetToken);
  if (homophones && homophones.has(spokenToken)) {
    return true;
  }

  return false;
}

function matchSingleTarget(alternatives: string[], candidateTarget: string): boolean {
  const normalizedTarget = normalizeSpokenText(candidateTarget);
  if (!normalizedTarget) return false;
  const targetTokens = normalizedTarget.split(' ');

  for (const rawAlt of alternatives) {
    const normalizedAlt = normalizeSpokenText(rawAlt);
    if (!normalizedAlt) continue;

    // Exact phrase match
    if (normalizedAlt === normalizedTarget) return true;

    const spokenTokens = normalizedAlt.split(' ');

    if (targetTokens.length === 1) {
      // Single target word: match any token in the child's utterance (e.g. "apple" or "it's apple")
      if (spokenTokens.some((tok) => tokensMatch(tok, targetTokens[0]))) {
        return true;
      }
      // Also handle ASR splitting compound words like "ice cream" vs "icecream" or "o'clock" vs "oclock"
      const compactAlt = normalizedAlt.replace(/[\s'’]+/g, '');
      const compactTarget = targetTokens[0].replace(/['’]+/g, '');
      if (tokensMatch(compactAlt, compactTarget)) {
        return true;
      }
    } else {
      // Multi-word phrase: check contiguous window or compact form
      const compactTarget = targetTokens.join('').replace(/['’]+/g, '');
      const compactAlt = spokenTokens.join('').replace(/['’]+/g, '');
      if (compactAlt.includes(compactTarget)) return true;

      for (let i = 0; i <= spokenTokens.length - targetTokens.length; i++) {
        let allMatched = true;
        for (let j = 0; j < targetTokens.length; j++) {
          if (!tokensMatch(spokenTokens[i + j], targetTokens[j])) {
            allMatched = false;
            break;
          }
        }
        if (allMatched) return true;
      }
    }
  }

  return false;
}

/**
 * Checks whether any speech recognition alternative matches the target English word/phrase
 * or any of its declared aliases (e.g. autumn/fall, favourite/favorite, ice cream/ice-cream).
 * Returns true ONLY if the spoken words accurately match; unrelated words return false.
 */
export function matchSpokenWord(alternatives: string[], targetWord: string, aliases?: string[]): boolean {
  if (matchSingleTarget(alternatives, targetWord)) return true;
  if (aliases && aliases.length > 0) {
    for (const alias of aliases) {
      if (matchSingleTarget(alternatives, alias)) return true;
    }
  }
  return false;
}

const FINAL_LEAP_COMMANDS = new Set([
  'jump',
  'go',
  'hop',
  'up',
  'yes',
  'ok',
  'okay',
  'over',
  'done',
  'frog',
  'win',
  'bank',
  'yay',
  'space',
  'finish'
]);

/**
 * Matches final leap voice commands when the frog is on Lane 4 ready to jump onto the destination bank.
 */
export function matchFinalLeapCommand(alternatives: string[]): boolean {
  for (const rawAlt of alternatives) {
    if (rawAlt.includes('跳') || rawAlt.includes('上岸') || rawAlt.includes('过河')) {
      return true;
    }
    const normalized = normalizeSpokenText(rawAlt);
    if (!normalized) continue;
    const tokens = normalized.split(' ');
    if (tokens.some((tok) => FINAL_LEAP_COMMANDS.has(tok))) {
      return true;
    }
  }
  return false;
}

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

function getSpeechGrammarListCtor(): SpeechGrammarListCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechGrammarList?: SpeechGrammarListCtor;
    webkitSpeechGrammarList?: SpeechGrammarListCtor;
  };
  return w.SpeechGrammarList || w.webkitSpeechGrammarList || null;
}

class VoiceRecognitionEngine {
  private recognition: SpeechRecognitionInstanceLike | null = null;
  private callbacks: VoiceRecognitionCallbacks | null = null;
  private status: VoiceRecognitionStatus = 'idle';
  private shouldBeListening = false;
  private suppressedUntil = 0;
  private audioEchoActive = false;
  private recentlyMatched: { word: string; aliases?: string[]; until: number } | null = null;
  private hintWords: string[] = [];

  private restartTimer: ReturnType<typeof setTimeout> | null = null;
  private speechStallTimer: ReturnType<typeof setTimeout> | null = null;
  private healthRecycleTimer: ReturnType<typeof setTimeout> | null = null;

  private isSpeechActive = false;
  private sessionFinalCount = 0;
  private consecutiveNetworkErrors = 0;

  public isSupported(): boolean {
    return getSpeechRecognitionCtor() !== null;
  }

  public getStatus(): VoiceRecognitionStatus {
    if (!this.isSupported()) return 'unsupported';
    return this.status;
  }

  public setCallbacks(callbacks: VoiceRecognitionCallbacks | null) {
    this.callbacks = callbacks;
  }

  /**
   * Supply the current unit's vocabulary as JSGF grammar hints (when supported by the browser).
   */
  public setHintWords(words: string[]) {
    this.hintWords = words
      .map((w) => normalizeSpokenText(w))
      .filter(Boolean);
  }

  /**
   * Temporarily ignore incoming ASR transcripts for a bounded window (e.g. demo audio playback).
   */
  public suppressFor(ms: number) {
    const until = Date.now() + ms;
    if (until > this.suppressedUntil) {
      this.suppressedUntil = until;
    }
  }

  /**
   * Tie echo suppression directly to demo audio start/end instead of blind long timeouts.
   */
  public setAudioEchoSuppress(active: boolean) {
    this.audioEchoActive = active;
    if (active) {
      // Safety cap so a stuck audio event can never permanently mute recognition
      this.suppressedUntil = Date.now() + 2200;
    } else {
      // Tiny 220ms acoustic room tail after demo audio ends
      this.suppressedUntil = Date.now() + 220;
    }
  }

  /**
   * Flush the just-completed utterance cleanly and ignore ONLY exact trailing duplicates
   * of the matched word so back-to-back words ("in", "girl", "window") trigger instantly!
   */
  public markRecentlyMatched(word: string, aliases?: string[], windowMs: number = 900) {
    this.recentlyMatched = {
      word: normalizeSpokenText(word),
      aliases: aliases?.map((a) => normalizeSpokenText(a)).filter(Boolean),
      until: Date.now() + windowMs
    };
    if (this.shouldBeListening) {
      this.recycleSession(60);
    }
  }

  private setStatus(next: VoiceRecognitionStatus) {
    this.status = next;
    this.callbacks?.onStatusChange(next);
  }

  private setSpeechActivity(active: boolean) {
    if (this.isSpeechActive !== active) {
      this.isSpeechActive = active;
      this.callbacks?.onSpeechActivity?.(active);
    }
  }

  private clearTimers() {
    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }
    if (this.speechStallTimer) {
      clearTimeout(this.speechStallTimer);
      this.speechStallTimer = null;
    }
    if (this.healthRecycleTimer) {
      clearTimeout(this.healthRecycleTimer);
      this.healthRecycleTimer = null;
    }
  }

  private detachAndStopCurrent(abort: boolean = false) {
    if (!this.recognition) return;
    const oldRec = this.recognition;
    oldRec.onstart = null;
    oldRec.onend = null;
    oldRec.onspeechstart = null;
    oldRec.onspeechend = null;
    oldRec.onaudiostart = null;
    oldRec.onerror = null;
    oldRec.onresult = null;
    this.recognition = null;
    try {
      if (abort) oldRec.abort();
      else oldRec.stop();
    } catch {
      // Ignore stop/abort errors
    }
  }

  private scheduleHealthRecycle() {
    if (this.healthRecycleTimer) {
      clearTimeout(this.healthRecycleTimer);
      this.healthRecycleTimer = null;
    }
    // Heartbeat safety net: if Chrome/Safari ever silently freezes without firing onend for 15s,
    // transparently abort and respawn a brand-new recognition session!
    this.healthRecycleTimer = setTimeout(() => {
      if (!this.shouldBeListening) return;
      if (this.isSpeechActive) {
        // User is mid-word right now; re-check shortly instead of interrupting them
        this.scheduleHealthRecycle();
        return;
      }
      this.recycleSession(80);
    }, 15000);
  }

  private armSpeechStallWatchdog() {
    if (this.speechStallTimer) {
      clearTimeout(this.speechStallTimer);
    }
    // If browser detected speech audio but cloud ASR emits ZERO results for 3.5s, recycle cleanly!
    this.speechStallTimer = setTimeout(() => {
      this.speechStallTimer = null;
      if (this.shouldBeListening && this.isSpeechActive) {
        this.setSpeechActivity(false);
        this.recycleSession(120);
      }
    }, 3500);
  }

  private disarmSpeechStallWatchdog() {
    if (this.speechStallTimer) {
      clearTimeout(this.speechStallTimer);
      this.speechStallTimer = null;
    }
  }

  /**
   * Cleanly recycle to a brand-new SpeechRecognition instance without dropping listening status.
   */
  private recycleSession(delayMs: number = 140) {
    this.clearTimers();
    this.setSpeechActivity(false);
    this.detachAndStopCurrent(true);

    if (!this.shouldBeListening) return;
    this.restartTimer = setTimeout(() => {
      this.restartTimer = null;
      if (this.shouldBeListening) {
        this.spawnFreshSession();
      }
    }, delayMs);
  }

  /**
   * Public quick-refresh for users or after a match when the Chrome results buffer grows large.
   */
  public restart() {
    if (!this.isSupported()) return;
    this.shouldBeListening = true;
    this.consecutiveNetworkErrors = 0;
    this.recycleSession(100);
  }

  public start() {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      this.setStatus('unsupported');
      this.callbacks?.onError?.('当前浏览器不支持网页语音识别，推荐使用 Chrome / Edge / Safari 浏览器。');
      return;
    }

    this.shouldBeListening = true;
    this.consecutiveNetworkErrors = 0;

    if (this.recognition && this.status === 'listening') {
      return;
    }

    this.clearTimers();
    this.detachAndStopCurrent(true);
    this.spawnFreshSession();
  }

  private spawnFreshSession() {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor || !this.shouldBeListening) return;

    try {
      const rec = new Ctor();
      rec.lang = 'en-US';
      // Use single-utterance mode (continuous=false) + seamless fresh-instance auto-rearm:
      // 1. Far faster & more accurate on isolated short words ("in", "girl", "sun", "window")
      // 2. Guarantees a clean fresh session after every word, eliminating Chrome's permanent freeze!
      rec.continuous = false;
      rec.interimResults = true;
      rec.maxAlternatives = 5;

      // Apply optional JSGF grammar hint with current unit vocabulary if supported
      const GrammarCtor = getSpeechGrammarListCtor();
      if (GrammarCtor && this.hintWords.length > 0) {
        try {
          const unique = Array.from(new Set([...this.hintWords, 'jump', 'go']));
          const grammar = `#JSGF V1.0; grammar vocab; public <word> = ${unique.join(' | ')} ;`;
          const list = new GrammarCtor();
          list.addFromString(grammar, 1);
          rec.grammars = list;
        } catch {
          // Ignore grammar syntax issues in browsers that stub SpeechGrammarList
        }
      }

      this.sessionFinalCount = 0;

      rec.onstart = () => {
        if (this.recognition !== rec) return;
        this.consecutiveNetworkErrors = 0;
        this.setStatus('listening');
        this.scheduleHealthRecycle();
      };

      rec.onspeechstart = () => {
        if (this.recognition !== rec) return;
        this.setSpeechActivity(true);
        this.armSpeechStallWatchdog();
      };

      rec.onspeechend = () => {
        if (this.recognition !== rec) return;
        this.setSpeechActivity(false);
        this.disarmSpeechStallWatchdog();
      };

      rec.onresult = (event: SpeechRecognitionEventLike) => {
        if (this.recognition !== rec) return;
        this.disarmSpeechStallWatchdog();
        this.consecutiveNetworkErrors = 0;

        // Ignore echo ONLY while demo audio is actively playing (bounded by safety cap)
        const now = Date.now();
        if (this.audioEchoActive && now < this.suppressedUntil) {
          return;
        }
        if (!this.audioEchoActive && now < this.suppressedUntil) {
          return;
        }

        // Collect all results from resultIndex to end so we never miss a fast interim/final transition
        const startIdx = Math.max(0, Math.min(event.resultIndex ?? 0, event.results.length - 1));
        for (let rIdx = startIdx; rIdx < event.results.length; rIdx++) {
          const result = event.results[rIdx];
          if (!result) continue;

          const alternatives: string[] = [];
          for (let i = 0; i < result.length; i++) {
            const text = result[i]?.transcript?.trim();
            if (text) alternatives.push(text);
          }

          if (alternatives.length === 0) continue;

          if (result.isFinal) {
            this.sessionFinalCount++;
            this.setSpeechActivity(false);
          }

          // Smart recently-matched echo filter: skip ONLY if the utterance is solely the word just jumped on
          // (never skip a combined utterance like "happy window" that contains the next word!)
          if (this.recentlyMatched && now < this.recentlyMatched.until) {
            const normPrimary = normalizeSpokenText(alternatives[0]);
            const isOnlyJustMatched =
              normPrimary === this.recentlyMatched.word ||
              Boolean(this.recentlyMatched.aliases?.includes(normPrimary));
            if (isOnlyJustMatched) {
              continue;
            }
          }

          this.callbacks?.onResult(alternatives[0], alternatives, result.isFinal);
        }

        // Keep Chrome's continuous results buffer lean: after 8 finalized utterances, recycle transparently
        if (this.sessionFinalCount >= 8 && !this.isSpeechActive) {
          this.recycleSession(100);
        }
      };

      rec.onerror = (event: SpeechRecognitionErrorEventLike) => {
        if (this.recognition !== rec) return;
        this.disarmSpeechStallWatchdog();
        this.setSpeechActivity(false);

        if (event.error === 'no-speech' || event.error === 'aborted') {
          // Normal silence or intentional recycle — onend will spawn a fresh session cleanly
          return;
        }
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          this.shouldBeListening = false;
          this.clearTimers();
          this.setStatus('error');
          this.callbacks?.onError?.('麦克风权限未开启，请在浏览器地址栏允许麦克风访问后再试。');
          return;
        }
        if (event.error === 'audio-capture') {
          this.shouldBeListening = false;
          this.clearTimers();
          this.setStatus('error');
          this.callbacks?.onError?.('未检测到可用麦克风设备，请检查麦克风连接。');
          return;
        }
        if (event.error === 'network') {
          this.consecutiveNetworkErrors++;
          if (this.consecutiveNetworkErrors <= 2 && this.shouldBeListening) {
            // Transient network hiccup: silently recycle after brief backoff instead of freezing!
            this.recycleSession(900);
            return;
          }
          this.setStatus('error');
          this.callbacks?.onError?.('语音识别服务网络异常，请检查网络后点击麦克风重试。');
          return;
        }
        this.callbacks?.onError?.(`语音识别遇到问题 (${event.error})，请重试。`);
      };

      rec.onend = () => {
        if (this.recognition !== rec) return;
        this.disarmSpeechStallWatchdog();
        this.setSpeechActivity(false);

        if (this.shouldBeListening) {
          // ALWAYS create a fresh SpeechRecognition instance rapidly (~80ms) while keeping
          // status='listening' seamlessly so the UI never flickers and never freezes!
          this.recycleSession(80);
        } else {
          if (this.status !== 'error') {
            this.setStatus('idle');
          }
        }
      };

      this.recognition = rec;
      try {
        rec.start();
      } catch {
        // Rapid switch/recycle: give browser 180ms to finish releasing the previous mic session
        this.restartTimer = setTimeout(() => {
          this.restartTimer = null;
          if (this.shouldBeListening && this.recognition === rec) {
            try {
              rec.start();
            } catch {
              this.recycleSession(300);
            }
          }
        }, 180);
      }
    } catch {
      this.shouldBeListening = false;
      this.clearTimers();
      this.setStatus('error');
      this.callbacks?.onError?.('启动语音识别失败，请点击麦克风按钮重新开启。');
    }
  }

  public stop() {
    this.shouldBeListening = false;
    this.clearTimers();
    this.setSpeechActivity(false);
    this.detachAndStopCurrent(false);
    if (this.status !== 'unsupported') {
      this.setStatus('idle');
    }
  }

  /**
   * Dispatch a simulated recognition result (useful for debugging / automated verification).
   */
  public simulateResult(transcript: string, isFinal: boolean = true) {
    if (Date.now() < this.suppressedUntil) return;
    this.callbacks?.onResult(transcript, [transcript], isFinal);
  }
}

export const voiceRecognitionEngine = new VoiceRecognitionEngine();
