import { Card, RANK_VALUE } from './deck'

export type HandRank =
  | 'straight-flush'
  | 'four-of-a-kind'
  | 'full-house'
  | 'flush'
  | 'straight'
  | 'three-of-a-kind'
  | 'two-pair'
  | 'one-pair'
  | 'high-card'

const HAND_RANK_INDEX: Record<HandRank, number> = {
  'straight-flush': 8,
  'four-of-a-kind': 7,
  'full-house': 6,
  flush: 5,
  straight: 4,
  'three-of-a-kind': 3,
  'two-pair': 2,
  'one-pair': 1,
  'high-card': 0,
}

export const HAND_LABEL_KO: Record<HandRank, string> = {
  'straight-flush': '스트레이트 플러시',
  'four-of-a-kind': '포 오브 어 카인드',
  'full-house': '풀 하우스',
  flush: '플러시',
  straight: '스트레이트',
  'three-of-a-kind': '트리플',
  'two-pair': '투 페어',
  'one-pair': '원 페어',
  'high-card': '하이카드',
}

export interface HandResult {
  rank: HandRank
  rankIndex: number
  tiebreakers: number[]
  label: string
}

export function compareHands(a: HandResult, b: HandResult): number {
  if (a.rankIndex !== b.rankIndex) return a.rankIndex - b.rankIndex
  for (let i = 0; i < Math.max(a.tiebreakers.length, b.tiebreakers.length); i++) {
    const diff = (a.tiebreakers[i] ?? 0) - (b.tiebreakers[i] ?? 0)
    if (diff !== 0) return diff
  }
  return 0
}

export function evaluate(cards: Card[]): HandResult {
  if (cards.length < 5) throw new Error('At least 5 cards required')
  if (cards.length === 5) return eval5(cards)

  let best: HandResult | null = null
  for (const combo of combinations(cards, 5)) {
    const result = eval5(combo)
    if (!best || compareHands(result, best) > 0) best = result
  }
  return best!
}

function combinations<T>(arr: T[], k: number): T[][] {
  if (k === 0) return [[]]
  if (arr.length < k) return []
  const [first, ...rest] = arr
  return [
    ...combinations(rest, k - 1).map((c) => [first, ...c]),
    ...combinations(rest, k),
  ]
}

function eval5(cards: Card[]): HandResult {
  const sorted = [...cards].sort((a, b) => RANK_VALUE[b.rank] - RANK_VALUE[a.rank])
  const vals = sorted.map((c) => RANK_VALUE[c.rank])
  const suits = sorted.map((c) => c.suit)

  const isFlush = suits.every((s) => s === suits[0])
  const straightHigh = getStraightHigh(vals)
  const isStraight = straightHigh > 0

  // frequency map sorted by (count desc, rank desc)
  const freq = new Map<number, number>()
  for (const v of vals) freq.set(v, (freq.get(v) ?? 0) + 1)
  const groups = [...freq.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0])

  const make = (rank: HandRank, tiebreakers: number[]): HandResult => ({
    rank,
    rankIndex: HAND_RANK_INDEX[rank],
    tiebreakers,
    label: HAND_LABEL_KO[rank],
  })

  if (isFlush && isStraight) return make('straight-flush', [straightHigh])
  if (groups[0][1] === 4) return make('four-of-a-kind', [groups[0][0], groups[1][0]])
  if (groups[0][1] === 3 && groups[1][1] === 2)
    return make('full-house', [groups[0][0], groups[1][0]])
  if (isFlush) return make('flush', vals)
  if (isStraight) return make('straight', [straightHigh])
  if (groups[0][1] === 3)
    return make('three-of-a-kind', [groups[0][0], groups[1][0], groups[2][0]])
  if (groups[0][1] === 2 && groups[1][1] === 2)
    return make('two-pair', [groups[0][0], groups[1][0], groups[2][0]])
  if (groups[0][1] === 2)
    return make('one-pair', [groups[0][0], groups[1][0], groups[2][0], groups[3][0]])
  return make('high-card', vals)
}

function getStraightHigh(vals: number[]): number {
  const unique = [...new Set(vals)].sort((a, b) => b - a)

  // Ace-low wheel: A-2-3-4-5
  if (
    unique.includes(14) &&
    unique.includes(2) &&
    unique.includes(3) &&
    unique.includes(4) &&
    unique.includes(5)
  ) {
    // Check if a better straight exists before returning 5
    const normal = getNormalStraightHigh(unique)
    return normal > 0 ? normal : 5
  }
  return getNormalStraightHigh(unique)
}

function getNormalStraightHigh(unique: number[]): number {
  for (let i = 0; i <= unique.length - 5; i++) {
    if (unique[i] - unique[i + 4] === 4) return unique[i]
  }
  return 0
}
