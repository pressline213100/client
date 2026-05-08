// ============================================================
// 撲克牌核心引擎 — Card Engine
// ============================================================

const SUITS = ['spades', 'hearts', 'diamonds', 'clubs'];
const RANKS = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'];

/**
 * Create a standard 52-card deck (+ optional jokers)
 * @param {boolean} includeJokers
 * @returns {Card[]}
 */
function createDeck(includeJokers = false) {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({
        id: `${suit}_${rank}`,
        suit,
        rank,
        rankValue: RANKS.indexOf(rank),
        suitValue: SUITS.indexOf(suit),
        isJoker: false,
        faceUp: false,
      });
    }
  }
  if (includeJokers) {
    deck.push({ id: 'joker_small', suit: 'joker', rank: 'small_joker', rankValue: 52, suitValue: 4, isJoker: true, faceUp: false });
    deck.push({ id: 'joker_big',   suit: 'joker', rank: 'big_joker',   rankValue: 53, suitValue: 5, isJoker: true, faceUp: false });
  }
  return deck;
}

/**
 * Fisher-Yates shuffle
 */
function shuffleDeck(deck) {
  const d = [...deck];
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

/**
 * Deal cards evenly to N players
 */
function dealCards(deck, numPlayers, cardsPerPlayer) {
  const hands = Array.from({ length: numPlayers }, () => []);
  const shuffled = shuffleDeck(deck);
  for (let i = 0; i < cardsPerPlayer * numPlayers; i++) {
    hands[i % numPlayers].push({ ...shuffled[i], faceUp: true });
  }
  return hands;
}

module.exports = { createDeck, shuffleDeck, dealCards, SUITS, RANKS };
