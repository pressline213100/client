// ============================================================
// 通用理牌引擎 — Universal Card Sorting Engine (SortProvider)
// ============================================================
// Architecture: Strategy Pattern
//   SortProvider.sort(hand, gameContext) → Card[]
//   Each game mode implements its own SortStrategy
// ============================================================

// ─── Rank Weight Maps (per game) ─────────────────────────────
const RANK_WEIGHTS = {
  big_two: { '3':1,'4':2,'5':3,'6':4,'7':5,'8':6,'9':7,'10':8,'J':9,'Q':10,'K':11,'A':12,'2':13,'small_joker':14,'big_joker':15 },
  dou_dizhu: { '3':1,'4':2,'5':3,'6':4,'7':5,'8':6,'9':7,'10':8,'J':9,'Q':10,'K':11,'A':12,'2':13,'small_joker':14,'big_joker':15 },
  bridge:   { '2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'10':10,'J':11,'Q':12,'K':13,'A':14 },
  solitaire:{ 'A':1,'2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'10':10,'J':11,'Q':12,'K':13 },
  thirteen: { 'A':1,'2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'10':10,'J':11,'Q':12,'K':13 },
  texas_holdem: { '2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'10':10,'J':11,'Q':12,'K':13,'A':14 },
};

const SUIT_WEIGHTS = {
  big_two:    { clubs:1, diamonds:2, hearts:3, spades:4 },
  bridge:     { clubs:1, diamonds:2, hearts:3, spades:4 },
  solitaire:  { spades:4, hearts:3, diamonds:2, clubs:1 },
  dou_dizhu:  { clubs:1, diamonds:2, hearts:3, spades:4 },
  thirteen:   { clubs:1, diamonds:2, hearts:3, spades:4 },
  texas_holdem:{ clubs:1, diamonds:2, hearts:3, spades:4 },
};

// ─── Combo Detection ─────────────────────────────────────────
function getRankCount(hand) {
  const map = {};
  for (const c of hand) {
    map[c.rank] = (map[c.rank] || 0) + 1;
  }
  return map;
}

function getSuitCount(hand) {
  const map = {};
  for (const c of hand) {
    map[c.suit] = (map[c.suit] || 0) + 1;
  }
  return map;
}

function detectCombo(cards, gameMode) {
  if (cards.length === 0) return { type: 'invalid', weight: 0, cards };
  const rankCount = getRankCount(cards);
  const counts = Object.values(rankCount).sort((a, b) => b - a);

  // Joker pair (rocket in dou_dizhu)
  if (cards.length === 2 && cards.every(c => c.isJoker)) {
    return { type: 'rocket', weight: 1000, cards };
  }

  // Four of a kind (bomb)
  if (cards.length === 4 && counts[0] === 4) {
    const rankW = RANK_WEIGHTS[gameMode] || RANK_WEIGHTS.big_two;
    return { type: 'bomb', weight: 800 + (rankW[cards[0].rank] || 0), cards };
  }

  // Full house
  if (cards.length === 5 && counts[0] === 3 && counts[1] === 2) {
    const tripleRank = Object.keys(rankCount).find(r => rankCount[r] === 3);
    const rw = RANK_WEIGHTS[gameMode] || RANK_WEIGHTS.big_two;
    return { type: 'full_house', weight: 600 + (rw[tripleRank] || 0), cards };
  }

  // Flush / Straight / Straight Flush
  if (cards.length === 5) {
    const suitCount = getSuitCount(cards);
    const isFlush = Object.keys(suitCount).length === 1;
    const rw = RANK_WEIGHTS[gameMode] || RANK_WEIGHTS.big_two;
    const sorted = [...cards].sort((a, b) => rw[a.rank] - rw[b.rank]);
    const vals = sorted.map(c => rw[c.rank]);
    const isStraight = vals.every((v, i) => i === 0 || v === vals[i - 1] + 1);
    if (isFlush && isStraight) return { type: 'straight_flush', weight: 900 + vals[4], cards };
    if (isFlush) return { type: 'flush', weight: 500 + vals[4], cards };
    if (isStraight) return { type: 'straight', weight: 400 + vals[4], cards };
  }

  // Triple
  if (counts[0] === 3 && cards.length === 3) {
    const rw = RANK_WEIGHTS[gameMode] || RANK_WEIGHTS.big_two;
    return { type: 'triple', weight: 300 + (rw[cards[0].rank] || 0), cards };
  }

  // Pair
  if (counts[0] === 2 && cards.length === 2) {
    const rw = RANK_WEIGHTS[gameMode] || RANK_WEIGHTS.big_two;
    return { type: 'pair', weight: 200 + (rw[cards[0].rank] || 0), cards };
  }

  // Single
  if (cards.length === 1) {
    const rw = RANK_WEIGHTS[gameMode] || RANK_WEIGHTS.big_two;
    const sw = SUIT_WEIGHTS[gameMode] || SUIT_WEIGHTS.big_two;
    return { type: 'single', weight: (rw[cards[0].rank] || 0) * 10 + (sw[cards[0].suit] || 0), cards };
  }

  return { type: 'invalid', weight: 0, cards };
}

// ─── Sort Strategies ─────────────────────────────────────────

/**
 * Big Two (大老二) Sort:
 *   Primary = rank (2 highest), Secondary = suit (spades highest)
 *   Groups combos: straight flush > four of a kind > full house > pairs
 */
function sortBigTwo(hand) {
  const rw = RANK_WEIGHTS.big_two;
  const sw = SUIT_WEIGHTS.big_two;

  // Group by rank count to cluster pairs/triples
  const rankCount = getRankCount(hand);

  // Sort: first by count (groups pairs/triples together), then by rank weight
  return [...hand].sort((a, b) => {
    const countDiff = (rankCount[b.rank] || 1) - (rankCount[a.rank] || 1);
    if (countDiff !== 0) return countDiff;
    const rankDiff = (rw[a.rank] || 0) - (rw[b.rank] || 0);
    if (rankDiff !== 0) return rankDiff;
    return (sw[a.suit] || 0) - (sw[b.suit] || 0);
  });
}

/**
 * Bridge / Solitaire Sort:
 *   Primary = suit (spades, hearts, diamonds, clubs)
 *   Secondary = rank ascending within each suit
 */
function sortBridgeSolitaire(hand, gameMode) {
  const rw = RANK_WEIGHTS[gameMode] || RANK_WEIGHTS.bridge;
  const sw = SUIT_WEIGHTS[gameMode] || SUIT_WEIGHTS.bridge;
  return [...hand].sort((a, b) => {
    const suitDiff = (sw[b.suit] || 0) - (sw[a.suit] || 0);
    if (suitDiff !== 0) return suitDiff;
    return (rw[a.rank] || 0) - (rw[b.rank] || 0);
  });
}

/**
 * Dou Dizhu (鬥地主) Sort:
 *   Clusters: rockets → bombs → triplets → pairs → singles
 *   Within each group: sort by rank descending
 */
function sortDouDizhu(hand) {
  const rw = RANK_WEIGHTS.dou_dizhu;
  const rankCount = getRankCount(hand);

  // Priority: jokers first, then by count (4>3>2>1), then rank
  return [...hand].sort((a, b) => {
    // Jokers always first
    if (a.isJoker !== b.isJoker) return a.isJoker ? -1 : 1;
    if (a.isJoker && b.isJoker) return (rw[b.rank] || 0) - (rw[a.rank] || 0);

    const countDiff = (rankCount[b.rank] || 1) - (rankCount[a.rank] || 1);
    if (countDiff !== 0) return countDiff;
    return (rw[b.rank] || 0) - (rw[a.rank] || 0);
  });
}

/**
 * Thirteen (十三支) Smart Segmentation:
 *   Detects best combos → distributes to head(3)/middle(5)/tail(5)
 *   Returns { head, middle, tail }
 */
function sortThirteen(hand) {
  const rw = RANK_WEIGHTS.thirteen;
  const sw = SUIT_WEIGHTS.thirteen;

  // Sort all by rank then suit
  const sorted = [...hand].sort((a, b) => {
    const rankDiff = (rw[a.rank] || 0) - (rw[b.rank] || 0);
    if (rankDiff !== 0) return rankDiff;
    return (sw[a.suit] || 0) - (sw[b.suit] || 0);
  });

  // Simple heuristic: tail = last 5 (strongest), middle = next 5, head = first 3
  const tail   = sorted.slice(8, 13);
  const middle = sorted.slice(3, 8);
  const head   = sorted.slice(0, 3);

  return { head, middle, tail, flat: [...head, ...middle, ...tail] };
}

/**
 * Texas Hold'em Sort:
 *   Primary = rank descending, Secondary = suit
 */
function sortTexasHoldem(hand) {
  const rw = RANK_WEIGHTS.texas_holdem;
  const sw = SUIT_WEIGHTS.texas_holdem;
  return [...hand].sort((a, b) => {
    const rankDiff = (rw[b.rank] || 0) - (rw[a.rank] || 0);
    if (rankDiff !== 0) return rankDiff;
    return (sw[b.suit] || 0) - (sw[a.suit] || 0);
  });
}

// ─── SortProvider (Main Export) ─────────────────────────────
const SortProvider = {
  /**
   * Auto-sort hand according to current game context
   * @param {Card[]} hand
   * @param {{ mode: string, sortRule: object }} gameContext
   * @returns {Card[] | { head, middle, tail, flat }}
   */
  autoSort(hand, gameContext) {
    const { mode } = gameContext;
    switch (mode) {
      case 'big_two':      return sortBigTwo(hand);
      case 'bridge':
      case 'solitaire':    return sortBridgeSolitaire(hand, mode);
      case 'dou_dizhu':    return sortDouDizhu(hand);
      case 'thirteen':     return sortThirteen(hand);
      case 'texas_holdem': return sortTexasHoldem(hand);
      default:             return sortBigTwo(hand);
    }
  },

  detectCombo,
  getRankWeight: (rank, mode) => (RANK_WEIGHTS[mode] || RANK_WEIGHTS.big_two)[rank] || 0,
  getSuitWeight: (suit, mode) => (SUIT_WEIGHTS[mode] || SUIT_WEIGHTS.big_two)[suit] || 0,
  RANK_WEIGHTS,
  SUIT_WEIGHTS,
};

module.exports = SortProvider;
