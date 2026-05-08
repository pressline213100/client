// ============================================================
// 嗆人字詞庫 — Trash Talk Generator
// Poker-contextual humorous / provocative messages
// ============================================================

const TRASH_TALK_POOLS = {
  // General taunts
  general: [
    { text: '你的理牌按鈕壞了嗎？想這麼久？', emoji: '🤔' },
    { text: '我這局連理牌都不用就贏了', emoji: '😎' },
    { text: '你在想什麼？下輩子的牌？', emoji: '💀' },
    { text: '大師出手，不需要看牌直接贏', emoji: '🏆' },
    { text: '我已經數好你的牌了喔～', emoji: '👀' },
    { text: '你的臉就是你的底牌', emoji: '🃏' },
    { text: '慢慢來，反正你也贏不了', emoji: '⏰' },
    { text: '這手牌打不了？還是你不會打？', emoji: '🤷' },
    { text: '我閉著眼睛都能贏你', emoji: '😴' },
    { text: '要不要我幫你出牌？', emoji: '🙋' },
  ],

  // Winning taunts
  winning: [
    { text: '這叫碾壓，懂嗎？', emoji: '💪' },
    { text: '跟我打？再練個十年吧', emoji: '😤' },
    { text: '牌好技術好，就是這麼強', emoji: '✨' },
    { text: '你的籌碼現在是我的了，謝謝', emoji: '💰' },
    { text: '哇，我連詐唬都不用就贏了', emoji: '🤯' },
  ],

  // Losing taunts (self-deprecating)
  losing: [
    { text: '等等，讓我重新排牌！', emoji: '😱' },
    { text: '我故意輸的，讓你開心一下', emoji: '🤡' },
    { text: '這副牌有問題，一定是的', emoji: '🎴' },
    { text: '下一局我要認真了！', emoji: '🔥' },
    { text: '你這是什麼狗屎運？', emoji: '🍀' },
  ],

  // Game-specific: Big Two
  big_two: [
    { text: '我手上有炸彈，你確定要出嗎？', emoji: '💣' },
    { text: '同花順這個感覺還好啦', emoji: '🃏' },
    { text: '啊你有2嗎？我也有耶', emoji: '😏' },
    { text: '大老二就是要這樣打，學著點', emoji: '👑' },
  ],

  // Game-specific: Dou Dizhu
  dou_dizhu: [
    { text: '我是地主，你們是農民，跪下吧', emoji: '👨‍🌾' },
    { text: '炸彈！感謝你的籌碼', emoji: '💥' },
    { text: '農民竟然敢反抗地主？', emoji: '😤' },
    { text: '火箭來了，接著吧！', emoji: '🚀' },
  ],

  // Game-specific: Thirteen
  thirteen: [
    { text: '我的三道全壓過你，回家練習吧', emoji: '📐' },
    { text: '十三支分段，這才叫藝術', emoji: '🎨' },
    { text: '你頭道出什麼？讓我笑一下', emoji: '😂' },
  ],

  // Game-specific: Texas Hold'em
  texas_holdem: [
    { text: 'All in！你有膽子跟嗎？', emoji: '💎' },
    { text: 'Royal Flush，晚安', emoji: '👸' },
    { text: '我的 Bluff 就是我的武器', emoji: '🎭' },
    { text: '你的 Tell 太明顯了', emoji: '🔍' },
  ],
};

// Emoji shortcut map for quick reactions
const EMOJI_SHORTCUTS = {
  '!gg':  { text: 'GG，認輸了', emoji: '🤝' },
  '!gg2': { text: '不服氣，再來一局！', emoji: '😠' },
  '!wp':  { text: '打得不錯！', emoji: '👏' },
  '!lol': { text: '哈哈哈哈哈', emoji: '😂' },
  '!rng': { text: '純粹手氣好而已', emoji: '🎲' },
  '!cry': { text: '這副牌不能玩', emoji: '😭' },
  '!think': { text: '讓我想想…', emoji: '🤔' },
  '!rush': { text: '快點出牌！！', emoji: '⚡' },
};

/**
 * Get a random trash talk message
 * @param {string} gameMode - current game mode
 * @param {string} context - 'general' | 'winning' | 'losing' | gameMode
 * @returns {{ text: string, emoji: string }}
 */
function getRandomTrashTalk(gameMode, context = 'general') {
  const pools = [
    ...TRASH_TALK_POOLS.general,
    ...(TRASH_TALK_POOLS[gameMode] || []),
    ...(context !== 'general' && TRASH_TALK_POOLS[context] ? TRASH_TALK_POOLS[context] : []),
  ];
  return pools[Math.floor(Math.random() * pools.length)];
}

/**
 * Resolve emoji shortcut to full message
 * @param {string} input
 * @returns {{ text: string, emoji: string } | null}
 */
function resolveShortcut(input) {
  return EMOJI_SHORTCUTS[input.toLowerCase()] || null;
}

/**
 * Get all available shortcuts
 */
function getShortcuts() {
  return Object.entries(EMOJI_SHORTCUTS).map(([key, val]) => ({
    key,
    ...val,
  }));
}

module.exports = {
  getRandomTrashTalk,
  resolveShortcut,
  getShortcuts,
  TRASH_TALK_POOLS,
  EMOJI_SHORTCUTS,
};
