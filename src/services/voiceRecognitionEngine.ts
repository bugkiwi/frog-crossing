/**
 * Kid-friendly English Speech Recognition Engine using the Web Speech API.
 * Supports continuous recognition, echo suppression during TTS playback,
 * strict-yet-fair elementary English word matching, and clean browser fallbacks.
 */

export type VoiceRecognitionStatus = 'idle' | 'listening' | 'error' | 'unsupported';

export interface VoiceRecognitionCallbacks {
  onResult: (transcript: string, alternatives: string[], isFinal: boolean) => void;
  onStatusChange: (status: VoiceRecognitionStatus) => void;
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

interface SpeechRecognitionInstanceLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionInstanceLike;

/**
 * Curated phonetic homophones for Grade 1–3 English vocabulary.
 * Strictly true homophones / exact ASR equivalents so wrong words still fail cleanly.
 */
const HOMOPHONE_GROUPS: string[][] = [
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
  ['grandpa', 'grandfather']
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

  // Plural/singular tolerance (e.g., noodle/noodles, apple/apples, shoe/shoes)
  if (stemSimplePlural(spokenToken) === stemSimplePlural(targetToken)) {
    return true;
  }

  // Exact phonetic homophones (e.g., sun/son, see/sea, two/to/too, four/for)
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

class VoiceRecognitionEngine {
  private recognition: SpeechRecognitionInstanceLike | null = null;
  private callbacks: VoiceRecognitionCallbacks | null = null;
  private status: VoiceRecognitionStatus = 'idle';
  private shouldBeListening = false;
  private suppressedUntil = 0;
  private restartTimer: ReturnType<typeof setTimeout> | null = null;

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
   * Temporarily ignore incoming ASR transcripts (e.g. while TTS is speaking) to avoid self-echo triggers.
   */
  public suppressFor(ms: number) {
    const until = Date.now() + ms;
    if (until > this.suppressedUntil) {
      this.suppressedUntil = until;
    }
  }

  private setStatus(next: VoiceRecognitionStatus) {
    this.status = next;
    this.callbacks?.onStatusChange(next);
  }

  public start() {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      this.setStatus('unsupported');
      this.callbacks?.onError?.('当前浏览器不支持网页语音识别，推荐使用 Chrome / Edge / Safari 浏览器。');
      return;
    }

    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }

    this.shouldBeListening = true;

    if (this.recognition && this.status === 'listening') {
      return;
    }

    try {
      if (this.recognition) {
        const oldRec = this.recognition;
        oldRec.onstart = null;
        oldRec.onend = null;
        oldRec.onerror = null;
        oldRec.onresult = null;
        this.recognition = null;
        try {
          oldRec.abort();
        } catch {
          // Ignore abort errors
        }
      }

      const rec = new Ctor();
      rec.lang = 'en-US';
      rec.continuous = true;
      rec.interimResults = true;
      rec.maxAlternatives = 5;

      rec.onstart = () => {
        if (this.recognition !== rec) return;
        this.setStatus('listening');
      };

      rec.onresult = (event: SpeechRecognitionEventLike) => {
        if (this.recognition !== rec) return;
        if (Date.now() < this.suppressedUntil) {
          return;
        }
        const latestIndex = event.results.length - 1;
        if (latestIndex < 0) return;

        const result = event.results[latestIndex];
        const alternatives: string[] = [];
        for (let i = 0; i < result.length; i++) {
          const text = result[i]?.transcript?.trim();
          if (text) alternatives.push(text);
        }

        if (alternatives.length === 0) return;
        this.callbacks?.onResult(alternatives[0], alternatives, result.isFinal);
      };

      rec.onerror = (event: SpeechRecognitionErrorEventLike) => {
        if (this.recognition !== rec) return;
        if (event.error === 'no-speech' || event.error === 'aborted') {
          // Normal silence or intentional restart
          return;
        }
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          this.shouldBeListening = false;
          this.setStatus('error');
          this.callbacks?.onError?.('麦克风权限未开启，请在浏览器地址栏允许麦克风访问后再试。');
          return;
        }
        if (event.error === 'audio-capture') {
          this.shouldBeListening = false;
          this.setStatus('error');
          this.callbacks?.onError?.('未检测到可用麦克风设备，请检查麦克风连接。');
          return;
        }
        if (event.error === 'network') {
          this.setStatus('error');
          this.callbacks?.onError?.('语音识别服务网络异常，请检查网络或稍后重试。');
          return;
        }
        this.callbacks?.onError?.(`语音识别遇到问题 (${event.error})，请重试。`);
      };

      rec.onend = () => {
        if (this.recognition !== rec) return;
        if (this.shouldBeListening) {
          this.restartTimer = setTimeout(() => {
            if (this.shouldBeListening && this.recognition === rec) {
              try {
                rec.start();
              } catch {
                this.setStatus('idle');
              }
            }
          }, 260);
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
        // Rapid unit-switch / restart: give the browser 180ms to finish tearing down the previous mic session
        this.restartTimer = setTimeout(() => {
          if (this.shouldBeListening && this.recognition === rec) {
            try {
              rec.start();
            } catch {
              this.shouldBeListening = false;
              this.setStatus('error');
              this.callbacks?.onError?.('启动语音识别失败，请点击麦克风按钮重新开启。');
            }
          }
        }, 180);
      }
    } catch {
      this.shouldBeListening = false;
      this.setStatus('error');
      this.callbacks?.onError?.('启动语音识别失败，请点击麦克风按钮重新开启。');
    }
  }

  public stop() {
    this.shouldBeListening = false;
    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }
    if (this.recognition) {
      const oldRec = this.recognition;
      oldRec.onstart = null;
      oldRec.onend = null;
      oldRec.onerror = null;
      oldRec.onresult = null;
      this.recognition = null;
      try {
        oldRec.stop();
      } catch {
        // Ignore stop error if not started
      }
    }
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
