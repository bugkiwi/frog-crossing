# 词库标准 JSON 规范（`frog-crossing-vocab/v1`）

本文档定义了 **青蛙过河（Frog Crossing）** 项目的统一词库 JSON 数据格式、单元词量建议（软限制）与按年级上下册加载规范。所有内置课本数据、按需加载词库以及用户导入/导出的词典（如小学各年级上下册、雅思/托福词典等）均须遵循本规范。

---

## 1. 设计原则

1. **一套协议通吃「课本」与「词典」**：既支持按「年级 + 上下册」组织的同步教材（1 册含多个 Unit），也支持雅思、托福、四六级等考试词典（1 本词典含 N 个 List/主题单元）。
2. **支持单本与多本合集**：顶层支持 `book`（导入单本书/词典）或 `books`（一次导入多册合集，如某年级上+下册）。
3. **最小必填、渐进增强**：最小只需书名、单元名与中英文词条即可导入；音标、词性、难度、语音别名等均为可选扩展字段。
4. **软建议、不硬限**：每单元词汇数只给体验建议与友好提示，不做硬性拦截。
5. **稳定 ID 支撑学习统计**：为 `book.id` 和 `unit.id` 提供稳定标识，便于 `localStorage` / `IndexedDB` 持续追踪每单元的词汇预览数、练习遍数与准确率。

---

## 2. TypeScript 类型定义

```ts
export type VocabCategory = 'textbook' | 'exam' | 'phonics' | 'custom';

export type VocabStage =
  | 'primary'
  | 'junior'
  | 'senior'
  | 'ielts'
  | 'toefl'
  | 'cet'
  | 'other';

export type VocabSemester = 'upper' | 'lower' | 'full' | 'none';

export interface VocabWordEntry {
  /** 英文单词或短语（必填，如 "apple", "ice cream"） */
  word: string;
  /** 中文释义（必填，建议简短清晰，便于荷叶展示） */
  chinese: string;
  /** 音标（可选，如 "/ˈæpl/"） */
  phonetic?: string;
  /** 词性（可选，如 "n.", "v.", "adj."） */
  pos?: string;
  /** 词汇分类/主题标签（可选） */
  category?: string;
  /** 词汇难度：1 简单 / 2 中等 / 3 较难（可选） */
  difficulty?: 1 | 2 | 3;
  /** 语音模式额外可接受的读音或拼写变体（可选，如 ["fall"], ["color"]） */
  aliases?: string[];
  /** 简短例句（可选，预留扩展） */
  example?: string;
}

export interface VocabUnitEntry {
  /** 单元唯一 ID（可选；强烈建议提供稳定 ID，缺省时按 `${bookId}-u${index}` 自动生成） */
  id?: string;
  /** 单元序号，从 1 开始（可选） */
  unitNumber?: number;
  /** 单元名称（必填，如 "Unit 1: Feelings & States" 或 "List 01 · Environment"） */
  title: string;
  /** 单元简介/主题说明（可选） */
  subtitle?: string;
  /** 本单元词汇列表（必填，建议非空） */
  words: VocabWordEntry[];
}

export interface VocabBookEntry {
  /** 书/词典唯一 ID（可选；内置分册必填，用户导入缺省时自动生成） */
  id?: string;
  /** 书名或词典名（必填，如 "新交际英语 二年级下册"、"雅思高频核心词典"） */
  name: string;
  /** 词库分类（可选，默认 "custom"） */
  category?: VocabCategory;
  /** 学段或考试体系（可选，默认 "other"） */
  stage?: VocabStage;
  /** 年级或目标等级（可选，如 "二年级"、"Grade 2"、"IELTS 6.5+"） */
  grade?: string;
  /** 分册：upper 上册 / lower 下册 / full 全册 / none 不分册（可选，默认 "none"） */
  semester?: VocabSemester;
  /** 出版社或词库来源（可选） */
  publisher?: string;
  /** 词库简介（可选） */
  description?: string;
  /** 检索/筛选标签（可选，如 ["新交际", "二年级", "下册"]） */
  tags?: string[];
  /** 包含的多个单元/List（必填，至少 1 个单元） */
  units: VocabUnitEntry[];
}

/** 顶层词库 JSON 包：支持单本 (book) 或多本合集 (books) */
export interface VocabJsonPack {
  /** 协议版本，当前固定为 "1.0"（缺省按 "1.0" 解析） */
  schemaVersion?: '1.0';
  /** 单本教材或单本词典（与 books 二选一） */
  book?: VocabBookEntry;
  /** 多本合集（与 book 二选一，如某年级上+下册合集） */
  books?: VocabBookEntry[];
}
```

---

## 3. 字段速查表

| 层级 | 字段 | 必填 | 说明 |
| :--- | :--- | :---: | :--- |
| **顶层** | `schemaVersion` | 否 | 建议填写 `"1.0"` |
| | `book` / `books` | **二选一** | 单本书用 `book`，一次导入多本用 `books` |
| **Book** | `id` | 内置必填 / 导入可选 | 推荐短横线命名，如 `nce-g2-lower`、`ielts-core-2026` |
| | `name` | **是** | 书名或词典名 |
| | `category` | 否 | `textbook` \| `exam` \| `phonics` \| `custom` |
| | `stage` | 否 | `primary` \| `junior` \| `senior` \| `ielts` \| `toefl` \| `cet` \| `other` |
| | `grade` | 否 | 年级或目标级别（如 `二年级`、`IELTS 6.5+`） |
| | `semester` | 否 | `upper`（上册）\| `lower`（下册）\| `full`（全册）\| `none`（不分册） |
| | `publisher` | 否 | 出版社或来源 |
| | `description` | 否 | 词库说明 |
| | `tags` | 否 | 字符串数组标签 |
| | `units` | **是** | 单元数组（`VocabUnitEntry[]`） |
| **Unit** | `id` | 否 | 建议填写稳定 ID，保障本地学习统计与进度持久化 |
| | `unitNumber` | 否 | 单元序号（1, 2, 3...） |
| | `title` | **是** | 单元 / List 标题 |
| | `subtitle` | 否 | 单元副标题或主题描述 |
| | `words` | **是** | 单词数组（`VocabWordEntry[]`） |
| **Word** | `word` | **是** | 英文单词或短语（首尾自动 trim，仅保留有效词条） |
| | `chinese` | **是** | 中文释义 |
| | `phonetic` | 否 | 音标 |
| | `pos` | 否 | 词性（`n.`, `v.`, `adj.` 等） |
| | `difficulty` | 否 | `1` \| `2` \| `3` |
| | `aliases` | 否 | 语音模式兼容别名/英美拼写变体 |
| | `example` | 否 | 例句（预留） |

---

## 4. 每单元建议词汇数量（仅作软建议，不做硬限制）

青蛙过河每只青蛙跨越 **4 排河道（4 词）**，一局默认 **5 只青蛙（20 词次）**，同屏荷叶约 **12–20 片**。据此制定分级建议：

| 适用对象 / 词库类型 | 建议每单元词量 | 最佳体验区间 | 依据 |
| :--- | :---: | :---: | :--- |
| **小学低年级（1–3 年级）** | **10 – 18 词** | **12 – 15 词** | 1 局 5 只青蛙刚好完整覆盖本单元并复现 1–2 遍，成就感强 |
| **小学高年级 / 初中（4–9 年级）** | **15 – 25 词** | **18 – 20 词** | 1–2 局即可达成单元 100% 预览覆盖，贴合课本单课体量 |
| **考试词典（雅思 / 托福 / 四六级）** | **20 – 35 词** | **25 – 30 词** | 对应 1 个标准记忆 List（约 5–8 分钟），大词典按此拆分最利于统计打卡 |

### 导入校验与软提示规则（禁止硬拦截）

- **不设硬上限/硬下限**：只要单元内至少包含 1 个合法词条即可导入。
- **词数偏少提示（`< 6 词`）**：展示温和提示「当前单元词数较少，河面荷叶会出现高频重复，建议补充到 10 词以上」，仍允许直接导入。
- **词数偏多提示（`> 40 词`）**：展示温和提示「当前单元词量较大（X 词），建议按每 20–30 词拆分为多个单元以获得更佳的学习统计体验」，并同时提供 **「保持原样导入」** 与 **「自动按每 25 词拆分单元」** 两个选项。
- **自动清洗与去重**：导入时对同一单元内的 `word` 忽略大小写去重并过滤空项，保留首次出现的词条并向用户汇报去重数量。

---

## 5. 按年级上下册按需加载目录规范

内置多册教材（如 1–6 年级上下册）统一存放在 `public/vocab/` 下，通过轻量目录索引 `catalog.json` 实现按需懒加载：

```text
public/vocab/
├── catalog.json              # 轻量目录清单（书目元信息 + JSON 文件路径，不含单词明细）
├── nce-g1-upper.json         # 新交际英语 一年级上册
├── nce-g1-lower.json         # 新交际英语 一年级下册
├── nce-g2-upper.json         # 新交际英语 二年级上册
├── nce-g2-lower.json         # 新交际英语 二年级下册
└── ...
```

`catalog.json` 结构示例：

```json
{
  "schemaVersion": "1.0",
  "books": [
    {
      "id": "nce-g2-upper",
      "name": "新交际英语 二年级上册",
      "category": "textbook",
      "stage": "primary",
      "grade": "二年级",
      "semester": "upper",
      "publisher": "外语教学与研究出版社",
      "unitCount": 7,
      "wordCount": 68,
      "path": "/vocab/nce-g2-upper.json"
    }
  ]
}
```

---

## 6. 标准范例

### 范例 A：小学课本分册（年级 + 上下册）

```json
{
  "schemaVersion": "1.0",
  "book": {
    "id": "nce-g2-lower",
    "name": "新交际英语 二年级下册",
    "category": "textbook",
    "stage": "primary",
    "grade": "二年级",
    "semester": "lower",
    "publisher": "外语教学与研究出版社",
    "description": "小学二年级下学期同步词汇，涵盖季节、动物、日常活动等主题。",
    "tags": ["新交际", "小学二年级", "下册"],
    "units": [
      {
        "id": "nce-g2-lower-u1",
        "unitNumber": 1,
        "title": "Unit 1: Seasons & Weather (季节与天气)",
        "subtitle": "学习四季名称与常见天气表达",
        "words": [
          { "word": "spring", "chinese": "春天", "phonetic": "/sprɪŋ/", "pos": "n.", "difficulty": 2 },
          { "word": "summer", "chinese": "夏天", "phonetic": "/ˈsʌmə/", "pos": "n.", "difficulty": 2 },
          { "word": "autumn", "chinese": "秋天", "phonetic": "/ˈɔːtəm/", "pos": "n.", "difficulty": 2, "aliases": ["fall"] },
          { "word": "winter", "chinese": "冬天", "phonetic": "/ˈwɪntə/", "pos": "n.", "difficulty": 2 }
        ]
      }
    ]
  }
}
```

### 范例 B：雅思词典（1 本词典含 N 个单元）

```json
{
  "schemaVersion": "1.0",
  "book": {
    "id": "ielts-core-academic",
    "name": "雅思高频核心词典 (Academic)",
    "category": "exam",
    "stage": "ielts",
    "grade": "IELTS 6.5+",
    "semester": "none",
    "publisher": "自定义词库",
    "description": "按主题/List 划分的雅思核心词汇，支持打字拼写与语音朗读双模式。",
    "tags": ["IELTS", "雅思", "留学考试"],
    "units": [
      {
        "id": "ielts-list-01",
        "unitNumber": 1,
        "title": "List 01 · Environment (环境与生态)",
        "subtitle": "雅思阅读与写作高频环境类词汇",
        "words": [
          { "word": "sustainable", "chinese": "可持续的", "phonetic": "/səˈsteɪnəbl/", "pos": "adj.", "difficulty": 3 },
          { "word": "emission", "chinese": "排放物", "phonetic": "/ɪˈmɪʃn/", "pos": "n.", "difficulty": 3 },
          { "word": "habitat", "chinese": "栖息地", "phonetic": "/ˈhæbɪtæt/", "pos": "n.", "difficulty": 2 }
        ]
      },
      {
        "id": "ielts-list-02",
        "unitNumber": 2,
        "title": "List 02 · Education (教育与研究)",
        "subtitle": "学术研究与校园场景核心词",
        "words": [
          { "word": "curriculum", "chinese": "课程体系", "phonetic": "/kəˈrɪkjələm/", "pos": "n.", "difficulty": 3 },
          { "word": "hypothesis", "chinese": "假设，假说", "phonetic": "/haɪˈpɒθəsɪs/", "pos": "n.", "difficulty": 3 }
        ]
      }
    ]
  }
}
```
