import { WordItem, UnitCourse } from '../types';

// Built-in dictionary of common primary school English words to auto-translate extracted words
const COMMON_PRIMARY_DICT: Record<string, string> = {
  // Unit 1: Feelings
  sad: '伤心的，难过的',
  angry: '生气的',
  tired: '累的，疲倦的',
  hungry: '饥饿的',
  thirsty: '口渴的',
  happy: '快乐的，开心的',
  fun: '有趣的',
  show: '展示，演出',
  turn: '机会，轮流',
  feel: '感觉',
  // Food
  apple: '苹果',
  banana: '香蕉',
  orange: '橙子',
  pear: '梨',
  grape: '葡萄',
  rice: '米饭',
  noodle: '面条',
  noodles: '面条',
  milk: '牛奶',
  bread: '面包',
  cake: '蛋糕',
  sweet: '糖果',
  egg: '鸡蛋',
  soup: '热汤',
  yummy: '美味的',
  dinner: '正餐，晚餐',
  lunch: '午餐',
  breakfast: '早餐',
  eat: '吃',
  want: '想要',
  food: '食物',
  // Weather
  sun: '太阳',
  sunny: '阳光明媚的',
  wind: '风',
  windy: '多风的',
  rain: '雨',
  rainy: '下雨的',
  snow: '雪',
  snowy: '下雪的',
  cloud: '云',
  cloudy: '多云的',
  warm: '温暖的',
  cold: '寒冷的',
  hot: '炎热的',
  cool: '凉爽的',
  weather: '天气',
  // Seasons
  spring: '春天',
  summer: '夏天',
  autumn: '秋天',
  fall: '秋天',
  winter: '冬天',
  season: '季节',
  year: '年份',
  time: '时间',
  clock: '时钟',
  // Clothes
  hat: '帽子',
  cap: '便帽',
  shirt: '衬衫',
  skirt: '短裙',
  coat: '大衣，外套',
  shoe: '鞋子',
  shoes: '鞋子',
  sock: '袜子',
  socks: '袜子',
  dress: '连衣裙',
  put: '穿上，放置',
  wear: '穿，戴',
  // Actions & Sports
  jump: '跳跃',
  run: '跑',
  swim: '游泳',
  walk: '走，步行',
  play: '玩耍',
  sing: '唱歌',
  dance: '跳舞',
  read: '阅读',
  write: '写字',
  draw: '画画',
  cook: '烹饪',
  clean: '打扫',
  fly: '飞翔',
  stop: '停止',
  go: '去',
  see: '看见',
  look: '看',
  like: '喜欢',
  make: '制作',
  wait: '等待',
  // Animals
  cat: '猫',
  dog: '狗',
  bird: '小鸟',
  fish: '鱼',
  bear: '熊',
  duck: '鸭子',
  elephant: '大象',
  tiger: '老虎',
  rabbit: '兔子',
  monkey: '猴子',
  panda: '大熊猫',
  frog: '青蛙',
  pig: '小猪',
  horse: '马',
  cow: '奶牛',
  sheep: '绵羊',
  lion: '狮子',
  // Routine & School
  bed: '床',
  home: '家',
  school: '学校',
  teacher: '老师',
  student: '学生',
  book: '书本',
  pen: '钢笔',
  pencil: '铅笔',
  ruler: '尺子',
  desk: '课桌',
  chair: '椅子',
  bag: '书包',
  box: '盒子',
  car: '小汽车',
  bus: '公交车',
  bike: '自行车',
  train: '火车',
  plane: '飞机',
  boat: '小船',
  // Days
  monday: '星期一',
  tuesday: '星期二',
  wednesday: '星期三',
  thursday: '星期四',
  friday: '星期五',
  saturday: '星期六',
  sunday: '星期天',
  weekend: '周末',
  week: '周，星期',
};

// Filter out stop words / grammar articles that are meaningless for vocabulary practice
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'to', 'of', 'in', 'on', 'at', 'is', 'am', 'are', 'was', 'were',
  'it', 'he', 'she', 'they', 'we', 'i', 'you', 'my', 'your', 'his', 'her', 'their', 'our',
  'this', 'that', 'these', 'those', 'do', 'does', 'did', 'have', 'has', 'had', 'will', 'can',
  'not', 'no', 'yes', 'page', 'unit', 'lesson', 'part', 'section', 'grade', 'class', 'name'
]);

/**
 * Extracts and cleans words from raw text
 */
export function extractWordsFromText(rawText: string): WordItem[] {
  // Look for patterns like "apple 苹果" or "apple: 苹果" or simply tokens
  const lines = rawText.split(/\r?\n/);
  const wordMap = new Map<string, WordItem>();

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Pattern 1: "word [phonetic] chinese" or "word chinese"
    // e.g. "sad /sæd/ 伤心的" or "apple 苹果"
    const match = trimmed.match(/^([a-zA-Z\s'-]+?)(?:\s+[/\[](.+?)[/\]])?\s+([\u4e00-\u9fa5].*)$/);
    if (match) {
      const rawWord = match[1].trim().toLowerCase();
      const phonetic = match[2]?.trim() || '';
      const chinese = match[3].trim();
      if (rawWord && !STOP_WORDS.has(rawWord) && rawWord.length >= 2) {
        wordMap.set(rawWord, {
          word: rawWord,
          chinese: chinese,
          phonetic: phonetic ? `/${phonetic}/` : undefined
        });
        continue;
      }
    }

    // Pattern 2: Individual English words
    const tokens = trimmed.match(/[a-zA-Z]{2,15}/g);
    if (tokens) {
      for (const token of tokens) {
        const lower = token.toLowerCase();
        if (STOP_WORDS.has(lower)) continue;
        if (!wordMap.has(lower)) {
          const autoChinese = COMMON_PRIMARY_DICT[lower] || '自定义新词';
          wordMap.set(lower, {
            word: lower,
            chinese: autoChinese
          });
        }
      }
    }
  }

  return Array.from(wordMap.values());
}

/**
 * Parses a PDF file using pdfjs-dist and extracts textbook vocabulary
 */
export async function parsePdfFile(file: File): Promise<{ text: string; words: WordItem[]; pageCount: number }> {
  try {
    const pdfjsLib = await import('pdfjs-dist');
    // Set worker source
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
    }

    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdfDoc = await loadingTask.promise;
    let fullText = '';

    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageStrings = textContent.items
        .map((item: any) => ('str' in item ? item.str : ''))
        .filter(Boolean);
      fullText += pageStrings.join(' ') + '\n';
    }

    const words = extractWordsFromText(fullText);
    return {
      text: fullText,
      words,
      pageCount: pdfDoc.numPages
    };
  } catch (error) {
    console.error('PDF parsing error:', error);
    throw new Error('解析 PDF 失败，请检查文件是否损坏，或改用“直接粘贴词汇”功能。');
  }
}

/**
 * Creates a custom unit course from extracted words
 */
export function createCustomCourse(title: string, subtitle: string, words: WordItem[]): UnitCourse {
  return {
    id: `custom-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    title,
    subtitle: subtitle || `自定义教材，共 ${words.length} 个单词`,
    grade: '自定制',
    source: 'custom',
    words
  };
}
