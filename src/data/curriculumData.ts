import { Textbook, VocabJsonPack } from '../types';
import { vocabPackToTextbooks } from '../services/vocabPackAdapter';
import nceG2UpperPack from './vocab/nce-g2-upper.json';

/**
 * Built-in textbook catalog parsed strictly from frog-crossing-vocab/v1 JSON packs.
 * See docs/vocab-json-spec.md for the schema specification.
 */
export const BUILTIN_TEXTBOOKS: Textbook[] = vocabPackToTextbooks(
  nceG2UpperPack as VocabJsonPack,
  'builtin'
);
