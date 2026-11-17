/**
 * English Voice Pronunciation Engine using Web Speech API
 * Speaks words clearly with child-friendly speed and native accents.
 */

class SpeechEngine {
  private enabled: boolean = true;
  private voice: SpeechSynthesisVoice | null = null;
  private isInitialized: boolean = false;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.initVoices();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = () => this.initVoices();
      }
    }
  }

  private initVoices() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return;

    // Prefer English (US or UK) female or natural kid-friendly voice
    const preferredVoices = voices.filter(
      (v) =>
        (v.lang.startsWith('en') || v.lang.includes('US') || v.lang.includes('GB')) &&
        (v.name.includes('Natural') ||
          v.name.includes('Samantha') ||
          v.name.includes('Karen') ||
          v.name.includes('Google') ||
          v.name.includes('Daniel') ||
          v.name.includes('Zira'))
    );

    if (preferredVoices.length > 0) {
      this.voice = preferredVoices[0];
    } else {
      this.voice = voices.find((v) => v.lang.startsWith('en')) || voices[0] || null;
    }
    this.isInitialized = true;
  }

  public setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  public speak(word: string) {
    if (!this.enabled || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (!this.isInitialized) {
      this.initVoices();
    }

    // Cancel current speech to prevent queue build-up
    window.speechSynthesis.cancel();

    // Clean word for pronunciation (strip special characters)
    const cleanWord = word.replace(/[^a-zA-Z\s]/g, '').trim();
    if (!cleanWord) return;

    const utterance = new SpeechSynthesisUtterance(cleanWord);
    if (this.voice) {
      utterance.voice = this.voice;
    }
    utterance.lang = 'en-US';
    utterance.rate = 0.88; // Slightly slower, very clear for 2nd graders
    utterance.pitch = 1.05; // Friendly and cheerful tone

    try {
      window.speechSynthesis.speak(utterance);
    } catch {
      // Ignore if speech failed
    }
  }
}

export const speechEngine = new SpeechEngine();
