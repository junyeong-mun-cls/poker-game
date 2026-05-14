'use client'

import { useState } from 'react'
import type { ClientGameState, ClientSeatState, ActionEntry } from '@/lib/game/engine'
import type { Card } from '@/lib/game/deck'
import { SUIT_SYMBOL, RANK_VALUE } from '@/lib/game/deck'
import { evaluate, type HandRank, type HandResult } from '@/lib/game/evaluator'

interface Props {
  roomId: string
  myId: string
  game: ClientGameState | null
  error: string | null
  playerCount: number
  onEmit: (event: string, data?: unknown) => void
  onShowPlayers: () => void
  mobilePlayerCount: number
  mobileMaxPlayers: number
}

// 숫자 → 랭크 문자 (tiebreaker 표시용)
const NUM_TO_RANK: Record<number, string> = Object.fromEntries(
  Object.entries(RANK_VALUE).map(([r, v]) => [v, r]),
)

function handStrengthStyle(rank: HandRank): string {
  switch (rank) {
    case 'high-card':      return 'text-gray-400 bg-gray-800/80 border-gray-700'
    case 'one-pair':       return 'text-blue-300 bg-blue-950/70 border-blue-700'
    case 'two-pair':       return 'text-purple-300 bg-purple-950/70 border-purple-700'
    case 'three-of-a-kind': return 'text-yellow-300 bg-yellow-950/70 border-yellow-700'
    case 'straight':       return 'text-orange-300 bg-orange-950/70 border-orange-700'
    case 'flush':          return 'text-teal-300 bg-teal-950/70 border-teal-700'
    case 'full-house':     return 'text-orange-400 bg-orange-950/70 border-orange-600'
    case 'four-of-a-kind': return 'text-red-300 bg-red-950/70 border-red-700'
    case 'straight-flush': return 'text-pink-300 bg-pink-950/70 border-pink-600'
    default:               return 'text-gray-400 bg-gray-800 border-gray-700'
  }
}

function handDetail(result: HandResult): string {
  const r = (n: number) => NUM_TO_RANK[n] ?? String(n)
  const tb = result.tiebreakers
  switch (result.rank) {
    case 'one-pair':        return `${r(tb[0])}-${r(tb[0])}`
    case 'two-pair':        return `${r(tb[0])} & ${r(tb[1])}`
    case 'three-of-a-kind': return `${r(tb[0])}-${r(tb[0])}-${r(tb[0])}`
    case 'full-house':      return `${r(tb[0])} 풀 ${r(tb[1])}`
    case 'four-of-a-kind':  return `${r(tb[0])} 포카드`
    case 'straight':        return `${r(tb[0])} 하이`
    case 'straight-flush':  return `${r(tb[0])} 하이`
    case 'high-card':       return `${r(tb[0])} 하이`
    case 'flush':           return `${r(tb[0])} 플러시`
    default:                return ''
  }
}

/** 플랍 이후 현재 베스트 핸드 계산 */
function computeHandStrength(holeCards: Card[], communityCards: Card[]): HandResult | null {
  if (communityCards.length < 3) return null
  try {
    return evaluate([...holeCards, ...communityCards])
  } catch {
    return null
  }
}

function actionDisplay(entry: ActionEntry): { label: string; color: string } {
  switch (entry.action) {
    case 'fold':   return { label: '다이',                                    color: 'text-red-300 bg-red-900/50 border-red-800/50' }
    case 'check':  return { label: '삥',                                      color: 'text-gray-300 bg-gray-700/60 border-gray-600/40' }
    case 'call':   return { label: `콜 ${entry.amount?.toLocaleString()}`,    color: 'text-blue-300 bg-blue-900/50 border-blue-800/50' }
    case 'raise':  return { label: `레이즈 ${entry.amount?.toLocaleString()}`,color: 'text-yellow-300 bg-yellow-900/50 border-yellow-800/50' }
    case 'all-in': return { label: `올인 ${entry.amount?.toLocaleString()}`,  color: 'text-orange-300 bg-orange-900/50 border-orange-800/50' }
    case 'sb':     return { label: `SB ${entry.amount?.toLocaleString()}`,    color: 'text-green-500/80 bg-green-900/30 border-green-800/30' }
    case 'bb':     return { label: `BB ${entry.amount?.toLocaleString()}`,    color: 'text-green-400/80 bg-green-900/30 border-green-800/30' }
    default:       return { label: entry.action,                              color: 'text-gray-400 bg-gray-800 border-gray-700' }
  }
}

function getLastActionBySeat(log: ActionEntry[]): Map<number, ActionEntry> {
  const map = new Map<number, ActionEntry>()
  for (const entry of log) map.set(entry.seatIndex, entry)
  return map
}

export default function GameTable({
  roomId, myId, game, error, playerCount, onEmit, onShowPlayers,
  mobilePlayerCount, mobileMaxPlayers,
}: Props) {
  const [raiseInput, setRaiseInput] = useState('')

  const mySeatIndex = game?.seats.findIndex((s) => s.playerId === myId) ?? -1
  const isMyTurn = game !== null && game.pendingSeats[0] === mySeatIndex
  const mySeat = mySeatIndex >= 0 ? game?.seats[mySeatIndex] : null

  const myTotalChips  = (mySeat?.chips ?? 0) + (mySeat?.betThisRound ?? 0)
  const callAmount    = game && mySeat ? game.currentBet - mySeat.betThisRound : 0
  const minRaiseTotal = game ? game.currentBet + game.minRaise : 0
  const canCheck      = game && mySeat ? mySeat.betThisRound >= game.currentBet : false
  const canRaise      = game ? myTotalChips > game.currentBet : false

  const quarterTotal = game ? Math.min(myTotalChips, Math.max(minRaiseTotal, game.currentBet + Math.ceil(game.pot * 0.25))) : 0
  const halfTotal    = game ? Math.min(myTotalChips, Math.max(minRaiseTotal, game.currentBet + Math.ceil(game.pot * 0.5)))  : 0
  const potTotal     = game ? Math.min(myTotalChips, Math.max(minRaiseTotal, game.currentBet + game.pot))                   : 0
  const allInTotal   = myTotalChips

  // 현재 베스트 핸드
  const holeCards = mySeat?.holeCards && Array.isArray(mySeat.holeCards) ? (mySeat.holeCards as Card[]) : null
  const handResult = game && holeCards ? computeHandStrength(holeCards, game.communityCards) : null

  const lastActionBySeat = game ? getLastActionBySeat(game.log) : new Map<number, ActionEntry>()
  const recentActions    = game
    ? [...game.log].filter((e) => e.action !== 'sb' && e.action !== 'bb').reverse().slice(0, 6)
    : []

  // 가장 최근 상대 액션 (배너용)
  const latestOpponentAction = recentActions.find((e) => e.seatIndex !== mySeatIndex) ?? null

  function emitRaise(totalBet: number) {
    onEmit('player_action', { roomId, action: 'raise', amount: totalBet })
    setRaiseInput('')
  }

  const showBettingControls = game?.phase !== 'showdown' && isMyTurn && mySeat?.status === 'active'

  return (
    <div className="flex-1 flex flex-col overflow-hidden">

      {/* ── 스크롤 영역 ──────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col gap-3 p-3 sm:p-4">

          {/* 에러 배너 */}
          {error && (
            <div className="bg-red-900/40 border border-red-800 rounded-xl px-4 py-2.5 text-red-300 text-sm flex items-center gap-2">
              <span>⚠</span> {error}
            </div>
          )}

          {/* 모바일 상단 바 */}
          <div className="lg:hidden flex items-center justify-between gap-2">
            <button
              onClick={onShowPlayers}
              className="flex items-center gap-1.5 bg-gray-900 border border-gray-800 rounded-xl px-3 py-2 text-sm text-gray-400 hover:text-white hover:border-gray-700 transition-colors active:scale-95"
            >
              <span>👥</span>
              <span className="font-medium">{mobilePlayerCount}/{mobileMaxPlayers}</span>
            </button>
            {game && <PhaseLabel phase={game.phase} />}
            {/* 모바일 내 칩 빠른 확인 */}
            {game && mySeat && (
              <div className="flex items-center gap-1 text-xs">
                <span className="text-gray-600">내 칩</span>
                <span className="text-green-400 font-bold font-mono">{mySeat.chips.toLocaleString()}</span>
              </div>
            )}
          </div>

          {!game ? (
            /* ── 대기 화면 ── */
            <div className="flex flex-col items-center justify-center gap-5 py-20">
              <div className="text-6xl opacity-20">♠</div>
              <p className="text-gray-500 text-center">
                {playerCount < 2 ? '게임 시작을 위해 2명 이상이 필요합니다' : '모두 준비됐으면 게임을 시작하세요'}
              </p>
              {playerCount >= 2 && (
                <button
                  onClick={() => onEmit('start_game', roomId)}
                  className="bg-green-600 hover:bg-green-500 active:scale-95 text-white font-bold px-10 py-4 rounded-2xl transition-all text-lg shadow-lg shadow-green-900/40"
                >
                  게임 시작
                </button>
              )}
            </div>
          ) : (
            <>
              {/* ── 커뮤니티 카드 + 팟 ── */}
              <div className="bg-green-950/80 border border-green-900/60 rounded-2xl p-4 flex flex-col items-center gap-3">
                <div className="flex gap-1.5 sm:gap-2">
                  {Array.from({ length: 5 }).map((_, i) => {
                    const card = game.communityCards[i]
                    return card ? <CardDisplay key={i} card={card} /> : <CardBack key={i} />
                  })}
                </div>
                <div className="flex items-center gap-5">
                  <div className="text-center">
                    <p className="text-green-800 text-[10px] uppercase tracking-wider mb-0.5">팟</p>
                    <p className="text-white font-black text-xl font-mono">{game.pot.toLocaleString()}</p>
                  </div>
                  {game.currentBet > 0 && (
                    <>
                      <div className="w-px h-8 bg-green-900" />
                      <div className="text-center">
                        <p className="text-green-800 text-[10px] uppercase tracking-wider mb-0.5">콜 금액</p>
                        <p className="text-green-300 font-black text-xl font-mono">{game.currentBet.toLocaleString()}</p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* ── 최근 상대 액션 배너 (가장 최근 1개) ── */}
              {latestOpponentAction && (
                <div className="flex items-center justify-between bg-gray-900/70 border border-gray-800 rounded-xl px-4 py-2.5">
                  <span className="text-gray-500 text-sm">
                    P{latestOpponentAction.seatIndex + 1}
                  </span>
                  <span className={`font-bold text-sm px-3 py-1 rounded-full border ${actionDisplay(latestOpponentAction).color}`}>
                    {actionDisplay(latestOpponentAction).label}
                  </span>
                </div>
              )}

              {/* ── 좌석 그리드 ── */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {game.seats.map((seat, i) => (
                  <SeatDisplay
                    key={seat.playerId}
                    seat={seat}
                    seatIndex={i}
                    isDealer={i === game.dealerIndex}
                    isCurrent={game.pendingSeats[0] === i}
                    isMe={seat.playerId === myId}
                    lastAction={lastActionBySeat.get(i)}
                  />
                ))}
              </div>

              {/* ── 최근 액션 히스토리 ── */}
              {recentActions.length > 0 && (
                <div className="bg-gray-900/60 border border-gray-800/60 rounded-xl px-4 py-3">
                  <p className="text-gray-700 text-[10px] uppercase tracking-wider mb-2">액션 내역</p>
                  <div className="flex flex-col gap-1.5">
                    {recentActions.map((entry, idx) => {
                      const { label, color } = actionDisplay(entry)
                      const name = entry.seatIndex === mySeatIndex ? '나' : `P${entry.seatIndex + 1}`
                      return (
                        <div key={idx} className="flex items-center gap-2.5" style={{ opacity: 1 - idx * 0.14 }}>
                          <span className={`text-xs font-bold w-5 shrink-0 ${entry.seatIndex === mySeatIndex ? 'text-green-400' : 'text-gray-500'}`}>
                            {name}
                          </span>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${color}`}>
                            {label}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* ── 내 홀카드 + 현재 핸드 ── */}
              {holeCards && (
                <div className="flex flex-col items-center gap-2.5">
                  <p className="text-gray-600 text-[10px] uppercase tracking-wider">내 패</p>
                  <div className="flex gap-2.5">
                    {holeCards.map((card, i) => (
                      <CardDisplay key={i} card={card} large />
                    ))}
                  </div>
                  {/* 현재 베스트 핸드 */}
                  {handResult && (
                    <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full border ${handStrengthStyle(handResult.rank)}`}>
                      <span className="font-black text-sm">{handResult.label}</span>
                      <span className="text-xs opacity-70">{handDetail(handResult)}</span>
                    </div>
                  )}
                  {/* 프리플랍: 포켓 페어 표시 */}
                  {!handResult && holeCards.length === 2 && holeCards[0].rank === holeCards[1].rank && (
                    <div className="flex items-center gap-2 px-4 py-1.5 rounded-full border text-yellow-300 bg-yellow-950/70 border-yellow-700">
                      <span className="font-black text-sm">포켓 페어</span>
                      <span className="text-xs opacity-70">{holeCards[0].rank}-{holeCards[1].rank}</span>
                    </div>
                  )}
                </div>
              )}

              {/* ── 쇼다운 결과 ── */}
              {game.phase === 'showdown' && game.winners && (
                <div className="bg-yellow-900/20 border border-yellow-800/60 rounded-2xl p-5 text-center">
                  <p className="text-yellow-400 font-black text-xl mb-3">🏆 결과</p>
                  <div className="flex flex-col gap-2 mb-4">
                    {game.winners.map((w) => {
                      const isMe = w.playerId === myId
                      const seatNum = game.seats.findIndex((s) => s.playerId === w.playerId)
                      return (
                        <div key={w.playerId} className="flex items-center justify-center gap-2 text-sm flex-wrap">
                          <span className={`font-bold ${isMe ? 'text-green-400' : 'text-white'}`}>
                            {isMe ? '나' : `시트 ${seatNum + 1}`}
                          </span>
                          {w.hand && (
                            <span className="text-yellow-500 text-xs bg-yellow-900/40 border border-yellow-800/40 px-2 py-0.5 rounded-full">
                              {w.hand.label}
                            </span>
                          )}
                          <span className="text-green-400 font-bold font-mono">+{w.amount.toLocaleString()}</span>
                        </div>
                      )
                    })}
                  </div>
                  <button
                    onClick={() => onEmit('next_hand', roomId)}
                    className="bg-green-600 hover:bg-green-500 active:scale-95 text-white font-bold px-8 py-3 rounded-xl transition-all text-sm shadow-lg shadow-green-900/40"
                  >
                    다음 핸드 →
                  </button>
                </div>
              )}

              <div className="hidden lg:flex justify-center pb-1">
                <PhaseLabel phase={game.phase} />
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── 하단 고정 영역 ────────────────────────────────── */}
      {game && mySeat && (
        <div className="flex-shrink-0 border-t border-gray-800 bg-gray-950">

          {/* 내 현황 바 (항상 표시) */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800/60">
            <div className="flex items-center gap-4">
              <div>
                <p className="text-gray-600 text-[10px] uppercase tracking-wider leading-none mb-0.5">내 칩</p>
                <p className="text-green-400 font-black text-base font-mono leading-none">{mySeat.chips.toLocaleString()}</p>
              </div>
              {mySeat.betThisRound > 0 && (
                <div>
                  <p className="text-gray-600 text-[10px] uppercase tracking-wider leading-none mb-0.5">베팅 중</p>
                  <p className="text-yellow-400 font-black text-base font-mono leading-none">{mySeat.betThisRound.toLocaleString()}</p>
                </div>
              )}
            </div>
            <div className="text-right">
              <p className="text-gray-600 text-[10px] uppercase tracking-wider leading-none mb-0.5">팟</p>
              <p className="text-gray-300 font-bold text-sm font-mono leading-none">{game.pot.toLocaleString()}</p>
            </div>
          </div>

          {/* 베팅 컨트롤 */}
          {showBettingControls && (
            <div className="p-3 flex flex-col gap-2">
              <p className="text-green-400 text-xs text-center font-semibold tracking-wide">● 내 차례</p>

              {/* 주요 액션 */}
              <div className="grid grid-cols-3 gap-2">
                <ActionBtn
                  label="다이"
                  sub=""
                  color="bg-red-900/80 hover:bg-red-800 border-red-800/60 text-red-200"
                  onClick={() => onEmit('player_action', { roomId, action: 'fold' })}
                />
                {canCheck ? (
                  <ActionBtn
                    label="삥"
                    sub="(체크)"
                    color="bg-gray-800 hover:bg-gray-700 border-gray-700 text-white"
                    onClick={() => onEmit('player_action', { roomId, action: 'check' })}
                  />
                ) : (
                  <ActionBtn
                    label="콜"
                    sub={callAmount.toLocaleString()}
                    color="bg-blue-900/80 hover:bg-blue-800 border-blue-800/60 text-blue-100"
                    onClick={() => onEmit('player_action', { roomId, action: 'call' })}
                  />
                )}
                <ActionBtn
                  label="올인"
                  sub={allInTotal.toLocaleString()}
                  color="bg-orange-900/80 hover:bg-orange-800 border-orange-800/60 text-orange-100"
                  onClick={() => emitRaise(allInTotal)}
                  disabled={!canRaise}
                />
              </div>

              {/* 레이즈 프리셋 */}
              {canRaise && (
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { label: '쿼터', sub: '25%', total: quarterTotal },
                    { label: '하프', sub: '50%', total: halfTotal },
                    { label: '판돈', sub: '100%', total: potTotal },
                  ] as const).map(({ label, sub, total }) => (
                    <button
                      key={label}
                      onClick={() => emitRaise(total)}
                      className="bg-yellow-900/60 hover:bg-yellow-800/70 border border-yellow-800/50 text-yellow-200 font-semibold rounded-xl py-2.5 transition-all active:scale-95 text-xs"
                    >
                      <span className="block font-bold">{label}</span>
                      <span className="block text-yellow-600 text-[10px]">{sub} · {total.toLocaleString()}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* 직접 입력 */}
              {canRaise && (
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={raiseInput}
                    onChange={(e) => setRaiseInput(e.target.value)}
                    placeholder={`최소 ${minRaiseTotal.toLocaleString()}`}
                    min={minRaiseTotal}
                    max={allInTotal}
                    className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm font-mono focus:outline-none focus:border-yellow-600 focus:ring-1 focus:ring-yellow-600/30 placeholder-gray-600 transition-all"
                  />
                  <button
                    onClick={() => {
                      const amount = parseInt(raiseInput)
                      if (!isNaN(amount) && amount >= minRaiseTotal && amount <= allInTotal) {
                        emitRaise(amount)
                      }
                    }}
                    className="bg-yellow-700 hover:bg-yellow-600 active:scale-95 text-white font-bold rounded-xl px-4 py-2.5 transition-all text-sm"
                  >
                    레이즈
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ── 서브 컴포넌트 ───────────────────────────────────────── */

function ActionBtn({
  label, sub, color, onClick, disabled = false,
}: {
  label: string; sub: string; color: string; onClick: () => void; disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`border rounded-xl py-3 font-bold transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${color}`}
    >
      <span className="block text-sm sm:text-base">{label}</span>
      {sub && <span className="block text-[11px] opacity-75 font-mono mt-0.5">{sub}</span>}
    </button>
  )
}

function SeatDisplay({
  seat, seatIndex, isDealer, isCurrent, isMe, lastAction,
}: {
  seat: ClientSeatState
  seatIndex: number
  isDealer: boolean
  isCurrent: boolean
  isMe: boolean
  lastAction?: ActionEntry
}) {
  const isFolded = seat.status === 'folded'
  const isAllIn  = seat.status === 'all-in'

  const borderClass = isCurrent
    ? 'border-green-600'
    : isAllIn
      ? 'border-yellow-700'
      : 'border-gray-800'

  const bgClass = isCurrent ? 'bg-green-950/50' : 'bg-gray-900'
  const lastDisplay = lastAction ? actionDisplay(lastAction) : null

  return (
    <div
      className={`${bgClass} border ${borderClass} rounded-xl p-2.5 sm:p-3 transition-all
        ${isCurrent ? 'ring-1 ring-green-600/40 shadow-lg shadow-green-900/20' : ''}
        ${isFolded ? 'opacity-30' : ''}`}
    >
      {/* 이름 + 딜러 뱃지 */}
      <div className="flex items-center gap-1 mb-1">
        <span className={`font-bold text-sm leading-tight truncate flex-1 ${isMe ? 'text-green-400' : 'text-white'}`}>
          {isMe ? '나' : `P${seatIndex + 1}`}
        </span>
        {isDealer && (
          <span className="text-[10px] bg-yellow-500 text-gray-900 font-black rounded px-1 leading-tight shrink-0">D</span>
        )}
        {isAllIn && (
          <span className="text-[10px] bg-orange-800 text-orange-200 font-bold rounded px-1 leading-tight shrink-0">ALL</span>
        )}
      </div>

      {/* 칩 */}
      <div className="text-gray-300 text-xs font-mono font-semibold">
        {seat.chips.toLocaleString()} <span className="text-gray-600 font-normal">칩</span>
      </div>

      {/* 베팅 금액 — 크게 표시 */}
      {seat.betThisRound > 0 && (
        <div className="mt-1 bg-yellow-900/30 border border-yellow-800/40 rounded-lg px-2 py-1 text-center">
          <span className="text-yellow-400 font-black text-sm font-mono">{seat.betThisRound.toLocaleString()}</span>
          <span className="text-yellow-700 text-[10px] ml-1">베팅</span>
        </div>
      )}

      {/* 마지막 액션 배지 */}
      {lastDisplay && !isFolded && (
        <div className={`mt-1.5 text-center text-[10px] font-bold px-1.5 py-0.5 rounded border leading-tight ${lastDisplay.color}`}>
          {lastDisplay.label}
        </div>
      )}

      {/* 미니 카드 */}
      <div className="flex gap-1 mt-2">
        {isFolded ? (
          <span className="text-gray-700 text-[10px]">폴드</span>
        ) : seat.holeCards === 'hidden' ? (
          <>
            <MiniCardBack />
            <MiniCardBack />
          </>
        ) : seat.holeCards && Array.isArray(seat.holeCards) ? (
          (seat.holeCards as Card[]).map((card, i) => <MiniCard key={i} card={card} />)
        ) : null}
      </div>
    </div>
  )
}

function CardDisplay({ card, large = false }: { card: Card; large?: boolean }) {
  const isRed = card.suit === 'hearts' || card.suit === 'diamonds'
  const sizeClass = large
    ? 'w-12 h-[4.5rem] sm:w-14 sm:h-20 text-lg sm:text-xl'
    : 'w-9 h-12 sm:w-10 sm:h-14 text-xs sm:text-sm'
  return (
    <div className={`${sizeClass} bg-white rounded-lg flex flex-col items-center justify-center shadow-md font-black ${isRed ? 'text-red-500' : 'text-gray-900'}`}>
      <span className="leading-none">{card.rank}</span>
      <span className="leading-none">{SUIT_SYMBOL[card.suit]}</span>
    </div>
  )
}

function CardBack() {
  return (
    <div className="w-9 h-12 sm:w-10 sm:h-14 bg-gray-800 border border-gray-700 rounded-lg flex items-center justify-center text-gray-600 text-sm">
      ?
    </div>
  )
}

function MiniCard({ card }: { card: Card }) {
  const isRed = card.suit === 'hearts' || card.suit === 'diamonds'
  return (
    <div className={`w-6 h-8 sm:w-7 sm:h-9 bg-white rounded text-[10px] sm:text-xs font-black flex flex-col items-center justify-center shadow ${isRed ? 'text-red-500' : 'text-gray-900'}`}>
      <span className="leading-none">{card.rank}</span>
      <span className="leading-none">{SUIT_SYMBOL[card.suit]}</span>
    </div>
  )
}

function MiniCardBack() {
  return <div className="w-6 h-8 sm:w-7 sm:h-9 bg-blue-900/80 border border-blue-800/60 rounded" />
}

function PhaseLabel({ phase }: { phase: string }) {
  const labels: Record<string, string> = {
    'pre-flop': '프리플랍', flop: '플랍', turn: '턴', river: '리버', showdown: '쇼다운',
  }
  const colors: Record<string, string> = {
    'pre-flop': 'text-gray-500 bg-gray-900 border-gray-800',
    flop:       'text-blue-400 bg-blue-950/50 border-blue-800',
    turn:       'text-purple-400 bg-purple-950/50 border-purple-800',
    river:      'text-orange-400 bg-orange-950/50 border-orange-800',
    showdown:   'text-yellow-400 bg-yellow-950/50 border-yellow-800',
  }
  return (
    <span className={`text-xs font-bold px-3 py-1 rounded-full border ${colors[phase] ?? 'text-gray-500 bg-gray-900 border-gray-800'}`}>
      {labels[phase] ?? phase}
    </span>
  )
}
