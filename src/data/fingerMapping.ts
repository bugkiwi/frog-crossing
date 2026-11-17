export interface KeyInfo {
  key: string;
  display: string;
  finger: 'l-pinky' | 'l-ring' | 'l-middle' | 'l-index' | 'thumb' | 'r-index' | 'r-middle' | 'r-ring' | 'r-pinky';
  fingerName: string;
  fingerColor: string;
}

export const FINGER_NAMES: Record<string, { name: string; color: string; hand: string }> = {
  'l-pinky': { name: '左手小指', color: '#F472B6', hand: '左手' },
  'l-ring': { name: '左手无名指', color: '#FB923C', hand: '左手' },
  'l-middle': { name: '左手中指', color: '#FBBF24', hand: '左手' },
  'l-index': { name: '左手食指', color: '#4ADE80', hand: '左手' },
  'thumb': { name: '大拇指', color: '#A78BFA', hand: '双手' },
  'r-index': { name: '右手食指', color: '#2DD4BF', hand: '右手' },
  'r-middle': { name: '右手中指', color: '#38BDF8', hand: '右手' },
  'r-ring': { name: '右手无名指', color: '#818CF8', hand: '右手' },
  'r-pinky': { name: '右手小指', color: '#C084FC', hand: '右手' },
};

export const KEYBOARD_ROWS: string[][] = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M']
];

export const KEY_MAPPING: Record<string, KeyInfo> = {
  'q': { key: 'q', display: 'Q', finger: 'l-pinky', fingerName: '左手小指', fingerColor: '#F472B6' },
  'a': { key: 'a', display: 'A', finger: 'l-pinky', fingerName: '左手小指', fingerColor: '#F472B6' },
  'z': { key: 'z', display: 'Z', finger: 'l-pinky', fingerName: '左手小指', fingerColor: '#F472B6' },

  'w': { key: 'w', display: 'W', finger: 'l-ring', fingerName: '左手无名指', fingerColor: '#FB923C' },
  's': { key: 's', display: 'S', finger: 'l-ring', fingerName: '左手无名指', fingerColor: '#FB923C' },
  'x': { key: 'x', display: 'X', finger: 'l-ring', fingerName: '左手无名指', fingerColor: '#FB923C' },

  'e': { key: 'e', display: 'E', finger: 'l-middle', fingerName: '左手中指', fingerColor: '#FBBF24' },
  'd': { key: 'd', display: 'D', finger: 'l-middle', fingerName: '左手中指', fingerColor: '#FBBF24' },
  'c': { key: 'c', display: 'C', finger: 'l-middle', fingerName: '左手中指', fingerColor: '#FBBF24' },

  'r': { key: 'r', display: 'R', finger: 'l-index', fingerName: '左手食指', fingerColor: '#4ADE80' },
  't': { key: 't', display: 'T', finger: 'l-index', fingerName: '左手食指', fingerColor: '#4ADE80' },
  'f': { key: 'f', display: 'F', finger: 'l-index', fingerName: '左手食指', fingerColor: '#4ADE80' },
  'g': { key: 'g', display: 'G', finger: 'l-index', fingerName: '左手食指', fingerColor: '#4ADE80' },
  'v': { key: 'v', display: 'V', finger: 'l-index', fingerName: '左手食指', fingerColor: '#4ADE80' },
  'b': { key: 'b', display: 'B', finger: 'l-index', fingerName: '左手食指', fingerColor: '#4ADE80' },

  'y': { key: 'y', display: 'Y', finger: 'r-index', fingerName: '右手食指', fingerColor: '#2DD4BF' },
  'u': { key: 'u', display: 'U', finger: 'r-index', fingerName: '右手食指', fingerColor: '#2DD4BF' },
  'h': { key: 'h', display: 'H', finger: 'r-index', fingerName: '右手食指', fingerColor: '#2DD4BF' },
  'j': { key: 'j', display: 'J', finger: 'r-index', fingerName: '右手食指', fingerColor: '#2DD4BF' },
  'n': { key: 'n', display: 'N', finger: 'r-index', fingerName: '右手食指', fingerColor: '#2DD4BF' },
  'm': { key: 'm', display: 'M', finger: 'r-index', fingerName: '右手食指', fingerColor: '#2DD4BF' },

  'i': { key: 'i', display: 'I', finger: 'r-middle', fingerName: '右手中指', fingerColor: '#38BDF8' },
  'k': { key: 'k', display: 'K', finger: 'r-middle', fingerName: '右手中指', fingerColor: '#38BDF8' },

  'o': { key: 'o', display: 'O', finger: 'r-ring', fingerName: '右手无名指', fingerColor: '#818CF8' },
  'l': { key: 'l', display: 'L', finger: 'r-ring', fingerName: '右手无名指', fingerColor: '#818CF8' },

  'p': { key: 'p', display: 'P', finger: 'r-pinky', fingerName: '右手小指', fingerColor: '#C084FC' },
  
  ' ': { key: ' ', display: '空格 Space', finger: 'thumb', fingerName: '大拇指', fingerColor: '#A78BFA' }
};

export function getKeyFinger(char: string): KeyInfo | undefined {
  return KEY_MAPPING[char.toLowerCase()];
}
