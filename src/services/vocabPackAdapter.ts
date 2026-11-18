import { Textbook, UnitCourse, VocabBookEntry, VocabJsonPack, VocabSemester, WordItem } from '../types';

function formatSemesterLabel(semester?: VocabSemester): string {
  switch (semester) {
    case 'upper':
      return '上册';
    case 'lower':
      return '下册';
    case 'full':
      return '全册';
    default:
      return '';
  }
}

function formatGradeWithSemester(grade?: string, semester?: VocabSemester): string {
  const g = (grade || '').trim();
  const sem = formatSemesterLabel(semester);
  if (g && sem && !g.includes(sem)) {
    return `${g}${sem}`;
  }
  return g || sem || '通用';
}

function slugifyId(input: string, fallback: string): string {
  const cleaned = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return cleaned || fallback;
}

export function vocabBookToTextbook(
  book: VocabBookEntry,
  source: 'builtin' | 'custom' = 'builtin'
): Textbook {
  const bookId = (book.id || '').trim() || slugifyId(book.name, `book-${Date.now()}`);
  const gradeLabel = formatGradeWithSemester(book.grade, book.semester);

  const units: UnitCourse[] = (book.units || []).map((unit, idx) => {
    const unitId = (unit.id || '').trim() || `${bookId}-u${unit.unitNumber ?? idx + 1}`;
    const seen = new Set<string>();
    const cleanWords: WordItem[] = [];

    for (const raw of unit.words || []) {
      const wordText = (raw.word || '').trim();
      if (!wordText) continue;
      const dedupeKey = wordText.toLowerCase();
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);

      cleanWords.push({
        word: wordText,
        chinese: (raw.chinese || '').trim(),
        phonetic: raw.phonetic ? raw.phonetic.trim() : undefined,
        pos: raw.pos ? raw.pos.trim() : undefined,
        category: raw.category,
        difficulty: raw.difficulty,
        aliases: Array.isArray(raw.aliases) ? raw.aliases.map((a) => a.trim()).filter(Boolean) : undefined,
        example: raw.example ? raw.example.trim() : undefined
      });
    }

    return {
      id: unitId,
      unitNumber: unit.unitNumber ?? idx + 1,
      title: unit.title,
      subtitle: unit.subtitle || '',
      grade: gradeLabel,
      source,
      words: cleanWords
    };
  });

  return {
    id: bookId,
    name: book.name,
    category: book.category,
    stage: book.stage,
    grade: gradeLabel,
    semester: book.semester,
    publisher: book.publisher || '自定义词库',
    description: book.description || '',
    tags: book.tags,
    units
  };
}

export function vocabPackToTextbooks(
  pack: VocabJsonPack,
  source: 'builtin' | 'custom' = 'builtin'
): Textbook[] {
  const rawBooks: VocabBookEntry[] = [];
  if (pack.book) rawBooks.push(pack.book);
  if (Array.isArray(pack.books)) rawBooks.push(...pack.books);
  return rawBooks.map((b) => vocabBookToTextbook(b, source));
}
