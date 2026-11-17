import { Textbook, UnitCourse } from '../types';

export const BUILTIN_TEXTBOOKS: Textbook[] = [
  {
    id: 'new-communicative-english-g2-1',
    name: '新交际英语 二年级上册 (重点推荐)',
    grade: '小学二年级',
    publisher: '外语教学与研究出版社 (外研社)',
    description: '匹配北京及全国多地小学二年级新交际英语教材，围绕情绪表达、日常美食、天气季节、穿戴与日常交际主题。',
    units: [
      {
        id: 'nce-g2-u1',
        title: 'Unit 1: Feelings & States (情绪与状态)',
        subtitle: '学习表达开心、难过、疲惫等情绪感受',
        grade: '二年级上',
        source: 'builtin',
        words: [
          { word: 'sad', chinese: '难过的，伤心的', phonetic: '/sæd/' },
          { word: 'angry', chinese: '生气的，愤怒的', phonetic: '/ˈæŋɡri/' },
          { word: 'tired', chinese: '累的，疲倦的', phonetic: '/ˈtaɪəd/' },
          { word: 'hungry', chinese: '饥饿的，饿的', phonetic: '/ˈhʌŋɡri/' },
          { word: 'thirsty', chinese: '口渴的', phonetic: '/ˈθɜːsti/' },
          { word: 'happy', chinese: '开心的，快乐的', phonetic: '/ˈhæpi/' },
          { word: 'fun', chinese: '有趣的，好玩的', phonetic: '/fʌn/' },
          { word: 'show', chinese: '演出，展示', phonetic: '/ʃəʊ/' },
          { word: 'turn', chinese: '机会，轮流', phonetic: '/tɜːn/' },
          { word: 'feel', chinese: '感觉，觉得', phonetic: '/fiːl/' }
        ]
      },
      {
        id: 'nce-g2-u2',
        title: 'Unit 2: Food & Meals (美食与餐饮)',
        subtitle: '认知日常果蔬、主食及美味佳肴',
        grade: '二年级上',
        source: 'builtin',
        words: [
          { word: 'apple', chinese: '苹果', phonetic: '/ˈæpl/' },
          { word: 'banana', chinese: '香蕉', phonetic: '/bəˈnɑːnə/' },
          { word: 'rice', chinese: '米饭', phonetic: '/raɪs/' },
          { word: 'noodle', chinese: '面条', phonetic: '/ˈnuːdl/' },
          { word: 'milk', chinese: '牛奶', phonetic: '/mɪlk/' },
          { word: 'bread', chinese: '面包', phonetic: '/bred/' },
          { word: 'cake', chinese: '蛋糕', phonetic: '/keɪk/' },
          { word: 'sweet', chinese: '糖果，甜的', phonetic: '/swiːt/' },
          { word: 'egg', chinese: '鸡蛋', phonetic: '/eɡ/' },
          { word: 'soup', chinese: '汤', phonetic: '/suːp/' },
          { word: 'yummy', chinese: '美味的，好吃', phonetic: '/ˈjʌmi/' },
          { word: 'dinner', chinese: '晚餐，正餐', phonetic: '/ˈdɪnə/' },
          { word: 'eat', chinese: '吃', phonetic: '/iːt/' },
          { word: 'want', chinese: '想要', phonetic: '/wɒnt/' },
          { word: 'food', chinese: '食物', phonetic: '/fuːd/' }
        ]
      },
      {
        id: 'nce-g2-u3',
        title: 'Unit 3: Weather (神奇的天气)',
        subtitle: '掌握阳光、雨雪、大风等天气词汇',
        grade: '二年级上',
        source: 'builtin',
        words: [
          { word: 'sun', chinese: '太阳，阳光', phonetic: '/sʌn/' },
          { word: 'sunny', chinese: '晴朗的，晴天', phonetic: '/ˈsʌni/' },
          { word: 'windy', chinese: '风大的，多风', phonetic: '/ˈwɪndi/' },
          { word: 'rainy', chinese: '多雨的，下雨', phonetic: '/ˈreɪni/' },
          { word: 'snowy', chinese: '下雪的，多雪', phonetic: '/ˈsnəʊi/' },
          { word: 'warm', chinese: '温暖的', phonetic: '/wɔːm/' },
          { word: 'cold', chinese: '寒冷的，冷的', phonetic: '/kəʊld/' },
          { word: 'hot', chinese: '热的，炎热的', phonetic: '/hɒt/' },
          { word: 'weather', chinese: '天气', phonetic: '/ˈweðə/' }
        ]
      },
      {
        id: 'nce-g2-u4',
        title: 'Unit 4: Seasons & Time (四季与时间)',
        subtitle: '一年春夏秋冬与时间指针',
        grade: '二年级上',
        source: 'builtin',
        words: [
          { word: 'spring', chinese: '春天，春季', phonetic: '/sprɪŋ/' },
          { word: 'summer', chinese: '夏天，夏季', phonetic: '/ˈsʌmə/' },
          { word: 'autumn', chinese: '秋天，秋季', phonetic: '/ˈɔːtəm/' },
          { word: 'winter', chinese: '冬天，冬季', phonetic: '/ˈwɪntə/' },
          { word: 'season', chinese: '季节', phonetic: '/ˈsiːzn/' },
          { word: 'year', chinese: '年，年份', phonetic: '/jɪə/' },
          { word: 'clock', chinese: '时钟，闹钟', phonetic: '/klɒk/' },
          { word: 'time', chinese: '时间', phonetic: '/taɪm/' }
        ]
      },
      {
        id: 'nce-g2-u5',
        title: 'Unit 5: Clothes (漂亮衣物)',
        subtitle: '认识帽子、大衣、裙子与鞋子',
        grade: '二年级上',
        source: 'builtin',
        words: [
          { word: 'hat', chinese: '帽子', phonetic: '/hæt/' },
          { word: 'shirt', chinese: '衬衫', phonetic: '/ʃɜːt/' },
          { word: 'skirt', chinese: '短裙，裙子', phonetic: '/skɜːt/' },
          { word: 'coat', chinese: '外套，大衣', phonetic: '/kəʊt/' },
          { word: 'shoe', chinese: '鞋子', phonetic: '/ʃuː/' },
          { word: 'put', chinese: '穿上，放置', phonetic: '/pʊt/' },
          { word: 'dress', chinese: '连衣裙', phonetic: '/dres/' },
          { word: 'cap', chinese: '便帽，鸭舌帽', phonetic: '/kæp/' }
        ]
      },
      {
        id: 'nce-g2-u6',
        title: 'Unit 6: Daily Life & Play (日常交际与活动)',
        subtitle: '课余生活、户外游戏与生动交际',
        grade: '二年级上',
        source: 'builtin',
        words: [
          { word: 'jump', chinese: '跳跃，跳', phonetic: '/dʒʌmp/' },
          { word: 'kite', chinese: '风筝', phonetic: '/kaɪt/' },
          { word: 'card', chinese: '卡片，贺卡', phonetic: '/kɑːd/' },
          { word: 'house', chinese: '房子，房屋', phonetic: '/haʊs/' },
          { word: 'make', chinese: '制作，制造', phonetic: '/meɪk/' },
          { word: 'wait', chinese: '等待，等候', phonetic: '/weɪt/' },
          { word: 'play', chinese: '玩耍，游玩', phonetic: '/pleɪ/' },
          { word: 'walk', chinese: '散步，步行', phonetic: '/wɔːk/' },
          { word: 'look', chinese: '看，看一看', phonetic: '/lʊk/' },
          { word: 'sing', chinese: '唱歌', phonetic: '/sɪŋ/' }
        ]
      },
      {
        id: 'nce-g2-all',
        title: '全册大通关: 新交际二年级上 (综合特训)',
        subtitle: '全部6个单元核心词汇混合闯关！',
        grade: '二年级上',
        source: 'builtin',
        words: [
          { word: 'sad', chinese: '难过的' },
          { word: 'angry', chinese: '生气的' },
          { word: 'tired', chinese: '疲惫的' },
          { word: 'hungry', chinese: '饥饿的' },
          { word: 'thirsty', chinese: '口渴的' },
          { word: 'apple', chinese: '苹果' },
          { word: 'banana', chinese: '香蕉' },
          { word: 'rice', chinese: '米饭' },
          { word: 'milk', chinese: '牛奶' },
          { word: 'bread', chinese: '面包' },
          { word: 'cake', chinese: '蛋糕' },
          { word: 'sweet', chinese: '糖果' },
          { word: 'egg', chinese: '鸡蛋' },
          { word: 'soup', chinese: '热汤' },
          { word: 'sun', chinese: '太阳' },
          { word: 'sunny', chinese: '晴朗的' },
          { word: 'windy', chinese: '风大的' },
          { word: 'rainy', chinese: '下雨的' },
          { word: 'snowy', chinese: '下雪的' },
          { word: 'spring', chinese: '春天' },
          { word: 'summer', chinese: '夏天' },
          { word: 'autumn', chinese: '秋天' },
          { word: 'winter', chinese: '冬天' },
          { word: 'hat', chinese: '帽子' },
          { word: 'shirt', chinese: '衬衫' },
          { word: 'coat', chinese: '外套' },
          { word: 'shoe', chinese: '鞋子' },
          { word: 'jump', chinese: '跳跃' },
          { word: 'kite', chinese: '风筝' },
          { word: 'play', chinese: '玩耍' }
        ]
      }
    ]
  },
  {
    id: 'beijing-english-g2-1',
    name: '北京版小学英语 二年级上册',
    grade: '小学二年级',
    publisher: '北京出版社 (一年级起点)',
    description: '北京地区公立小学经典教材，涵盖作息时间、交通出行、运动健身、星期日程及可爱动物。',
    units: [
      {
        id: 'bj-g2-u1',
        title: 'Unit 1: Time to Get Up (日常作息)',
        subtitle: '早起、看书、写字与做家务',
        grade: '二年级上',
        source: 'builtin',
        words: [
          { word: 'cook', chinese: '做饭，烹饪' },
          { word: 'read', chinese: '阅读，看书' },
          { word: 'write', chinese: '写字，书写' },
          { word: 'draw', chinese: '画画' },
          { word: 'clean', chinese: '打扫，清洁' },
          { word: 'bed', chinese: '床' },
          { word: 'home', chinese: '家' },
          { word: 'school', chinese: '学校' }
        ]
      },
      {
        id: 'bj-g2-u2',
        title: 'Unit 2: Ways to Go (交通与出行)',
        subtitle: '乘公交、骑单车与小汽车',
        grade: '二年级上',
        source: 'builtin',
        words: [
          { word: 'bus', chinese: '公共汽车' },
          { word: 'car', chinese: '小汽车' },
          { word: 'bike', chinese: '自行车' },
          { word: 'walk', chinese: '步行，走' },
          { word: 'foot', chinese: '脚，步行' },
          { word: 'train', chinese: '火车' },
          { word: 'plane', chinese: '飞机' },
          { word: 'boat', chinese: '小船' }
        ]
      },
      {
        id: 'bj-g2-u3',
        title: 'Unit 3: We Like Sports (我们爱运动)',
        subtitle: '篮球、足球、跳绳与运动',
        grade: '二年级上',
        source: 'builtin',
        words: [
          { word: 'sport', chinese: '体育运动' },
          { word: 'football', chinese: '足球' },
          { word: 'basketball', chinese: '篮球' },
          { word: 'jump', chinese: '跳跃' },
          { word: 'run', chinese: '奔跑' },
          { word: 'swim', chinese: '游泳' },
          { word: 'fast', chinese: '快速的' },
          { word: 'high', chinese: '高的' }
        ]
      },
      {
        id: 'bj-g2-u4',
        title: 'Unit 4: My Week (七彩一星期)',
        subtitle: '从周一到周日的时间记忆',
        grade: '二年级上',
        source: 'builtin',
        words: [
          { word: 'Monday', chinese: '星期一' },
          { word: 'Tuesday', chinese: '星期二' },
          { word: 'Wednesday', chinese: '星期三' },
          { word: 'Thursday', chinese: '星期四' },
          { word: 'Friday', chinese: '星期五' },
          { word: 'Saturday', chinese: '星期六' },
          { word: 'Sunday', chinese: '星期天' },
          { word: 'week', chinese: '星期，周' }
        ]
      },
      {
        id: 'bj-g2-u6',
        title: 'Unit 6: Animals Are Fun (萌宠动物乐园)',
        subtitle: '大象、老虎、小兔与动物伙伴',
        grade: '二年级上',
        source: 'builtin',
        words: [
          { word: 'bear', chinese: '小熊' },
          { word: 'duck', chinese: '鸭子' },
          { word: 'elephant', chinese: '大象' },
          { word: 'tiger', chinese: '老虎' },
          { word: 'rabbit', chinese: '兔子' },
          { word: 'monkey', chinese: '猴子' },
          { word: 'bird', chinese: '小鸟' },
          { word: 'fish', chinese: '鱼' }
        ]
      }
    ]
  },
  {
    id: 'starter-kindergarten-g1',
    name: '儿童键盘初阶：26字母与三字母萌词',
    grade: '键盘启蒙',
    publisher: '趣味打字通',
    description: '适合刚开始学习键盘打字的小朋友，从简短萌词起步，快速建立成就感。',
    units: [
      {
        id: 'starter-letters',
        title: '字母王国 (单字母极速跳跃)',
        subtitle: '一个字母跳一下，认识整个键盘！',
        grade: '启蒙',
        source: 'builtin',
        words: [
          { word: 'a', chinese: '字母 A' },
          { word: 'b', chinese: '字母 B' },
          { word: 'c', chinese: '字母 C' },
          { word: 'd', chinese: '字母 D' },
          { word: 'e', chinese: '字母 E' },
          { word: 'f', chinese: '字母 F' },
          { word: 'g', chinese: '字母 G' },
          { word: 'h', chinese: '字母 H' },
          { word: 'i', chinese: '字母 I' },
          { word: 'j', chinese: '字母 J' },
          { word: 'k', chinese: '字母 K' },
          { word: 'l', chinese: '字母 L' },
          { word: 'm', chinese: '字母 M' },
          { word: 'n', chinese: '字母 N' },
          { word: 'o', chinese: '字母 O' },
          { word: 'p', chinese: '字母 P' },
          { word: 'q', chinese: '字母 Q' },
          { word: 'r', chinese: '字母 R' },
          { word: 's', chinese: '字母 S' },
          { word: 't', chinese: '字母 T' },
          { word: 'u', chinese: '字母 U' },
          { word: 'v', chinese: '字母 V' },
          { word: 'w', chinese: '字母 W' },
          { word: 'x', chinese: '字母 X' },
          { word: 'y', chinese: '字母 Y' },
          { word: 'z', chinese: '字母 Z' }
        ]
      },
      {
        id: 'starter-caterpillar',
        title: '萌萌三字母词 (3-Letter Magic)',
        subtitle: '小猫、小狗、红日，超轻量单词',
        grade: '启蒙',
        source: 'builtin',
        words: [
          { word: 'cat', chinese: '小猫' },
          { word: 'dog', chinese: '小狗' },
          { word: 'pig', chinese: '小猪' },
          { word: 'fox', chinese: '狐狸' },
          { word: 'sun', chinese: '太阳' },
          { word: 'red', chinese: '红色' },
          { word: 'big', chinese: '大的' },
          { word: 'hot', chinese: '炎热' },
          { word: 'run', chinese: '奔跑' },
          { word: 'fly', chinese: '飞翔' }
        ]
      }
    ]
  }
];

export const DEFAULT_UNIT_ID = 'nce-g2-u1';
