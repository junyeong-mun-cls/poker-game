'use client'

import { useState } from 'react'
import type { ClientGameState, ClientSeatState, ActionEntry } from '@/lib/game/engine'
import type { Card } from '@/lib/game/deck'
import { SUIT_SYMBOL } from '@/lib/game/deck'

interface Props {
  roomId: string
  myId: string
  game: ClientGameState | null
  error: string | null
  playerCount: number
  onEmit: (event: string, data?: unknown) => void
}

// 액션 → 한국어 레이블 + 색상
function actionDisplay(entry: ActionEntry): { label: string; color: string } {
  switch (entry.action) {
    case 'fold':   return { label: '다이', color: 'text-red-400 bg-red-900/40' }
    case 'check':  return { label: '삥', color: 'text-gray-300 bg-gray-700/60' }
    case 'call':   return { label: `콜 ${entry.amount?.toLocaleString()}`, color: 'text-blue-300 bg-blue-900/40' }
    case 'raise':  return { label: `레이즈 ${entry.amount?.toLocaleString()}`, color: 'text-yellow-300 bg-yellow-900/40' }
    case 'all-in': return { label: `올인 ${entry.amount?.toLocaleString()}`, color: 'text-orange-300 bg-orange-900/40' }
    case 'sb':     return { label: `SB ${entry.amount?.toLocaleString()}`, color: 'text-green-500 bg-green-900/30' }
    case 'bb':     return { label: `BB ${entry.amount?.toLocaleString()}`, color: 'text-green-400 bg-green-900/30' }
    default:       return { label: entry.action, color: 'text-gray-400 bg-gray-800' }
  }
}

// 각 시트의 마지막 액션 (블라인드 제외)
function getLastPlayerActions(log: ActionEntry[]): Map<number, ActionEntry> {
  const map = new Map<number, ActionEntry>()
  for (const entry of log) {
    map.set(entry.seatIndex, entry)
  }
  return map
}

// 시트 라벨 (로그에서 나 vs 상대 구분용)
function seatLabel(seatIndex: number, myIndex: number): string {
  return seatIndex === myIndex ? '나' : `P${seatIndex + 1}`
}

export default function GameTable({ roomId, myId, game, error, playerCount, onEmit }: Props) {
  const [raiseInput, setRaiseInput] = useState('')

  const mySeatIndex = game?.seats.findIndex((s) => s.playerId === myId) ?? -1
  const isMyTurn = game !== null && game.pendingSeats[0] === mySeatIndex
  const mySeat = mySeatIndex >= 0 ? game?.seats[mySeatIndex] : null

  const myTotalChips = (mySeat?.chips ?? 0) + (mySeat?.betThisRound ?? 0)
  const callAmount = game && mySeat ? game.currentBet - mySeat.betThisRound : 0
  const minRaiseTotal = game ? game.currentBet + game.minRaise : 0
  const canCheck = game && mySeat ? mySeat.betThisRound >= game.currentBet : false
  const canRaise = game ? myTotalChips > game.currentBet : false

  const quarterTotal = game
    ? Math.min(myTotalChips, Math.max(minRaiseTotal, game.currentBet + Math.ceil(game.pot * 0.25)))
    : 0
  const halfTotal = game
    ? Math.min(myTotalChips, Math.max(minRaiseTotal, game.currentBet + Math.ceil(game.pot * 0.5)))
    : 0
  const potTotal = game
    ? Math.min(myTotalChips, Math.max(minRaiseTotal, game.currentBet + game.pot))
    : 0
  const allInTotal = myTotalChips

  const lastActionBySeat = game ? getLastPlayerActions(game.log) : new Map<number, ActionEntry>()

  // 최근 액션 히스토리 (블라인드 포스트 제외, 최신 순 최대 8개)
  const recentActions = game
    ? [...game.log].filter((e) => e.action !== 'sb' && e.action !== 'bb').reverse().slice(0, 8)
    : []

  function emitRaise(totalBet: number) {
    onEmit('player_action', { roomId, action: 'raise', amount: totalBet })
    setRaiseInput('')
  }

  return (
    <div className="flex-1 flex flex-col gap-4 p-5 overflow-y-auto">
      {error && (
        <div className="bg-red-900/40 border border-red-700 rounded-lg px-4 py-2 text-red-300 text-sm">
          {error}
        </div>
      )}

      {!game ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <p className="text-gray-500">
            {playerCount < 2
              ? '게임 시작을 위해 2명 이상이 필요합니다'
              : '게임을 시작하세요'}
          </p>
          {playerCount >= 2 && (
            <button
              onClick={() => onEmit('start_game', roomId)}
              className="bg-green-600 hover:bg-green-500 text-white font-bold px-8 py-3 rounded-xl transition-colors"
            >
              게임 시작
            </button>
          )}
        </div>
      ) : (
        <>
          {/* 커뮤니티 카드 + 팟 */}
          <div className="bg-green-950 border border-green-900 rounded-2xl p-5 flex flex-col items-center gap-3">
            <div className="flex gap-2">
              {Array.from({ length: 5 }).map((_, i) => {
                const card = game.communityCards[i]
                return card ? <CardDisplay key={i} card={card} /> : <CardBack key={i} />
              })}
            </div>
            <div className="text-green-300 font-semibold">
              팟: <span className="text-white font-bold">{game.pot.toLocaleString()} 칩</span>
            </div>
            {game.currentBet > 0 && (
              <div className="text-green-400 text-sm">
                현재 베팅: {game.currentBet.toLocaleString()} 칩
              </div>
            )}
          </div>

          {/* 좌석 — 마지막 액션 배지 포함 */}
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

          {/* 최근 액션 히스토리 */}
          {recentActions.length > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3">
              <p className="text-gray-600 text-xs mb-2">최근 액션</p>
              <div className="flex flex-col gap-1">
                {recentActions.map((entry, idx) => {
                  const { label, color } = actionDisplay(entry)
                  const name = seatLabel(entry.seatIndex, mySeatIndex)
                  const isFirst = idx === 0
                  return (
                    <div
                      key={idx}
                      className={`flex items-center gap-2 text-sm ${isFirst ? 'opacity-100' : 'opacity-50'}`}
                    >
                      <span className={`text-xs font-semibold w-6 shrink-0 ${entry.seatIndex === mySeatIndex ? 'text-green-400' : 'text-gray-400'}`}>
                        {name}
                      </span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${color}`}>
                        {label}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* 내 홀카드 */}
          {mySeat?.holeCards && Array.isArray(mySeat.holeCards) && (
            <div className="flex flex-col items-center gap-2">
              <p className="text-gray-500 text-xs">내 패</p>
              <div className="flex gap-2">
                {(mySeat.holeCards as Card[]).map((card, i) => (
                  <CardDisplay key={i} card={card} large />
                ))}
              </div>
            </div>
          )}

          {/* 베팅 컨트롤 */}
          {game.phase !== 'showdown' && isMyTurn && mySeat?.status === 'active' && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col gap-3">
              <p className="text-gray-400 text-sm text-center">내 차례입니다</p>

              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => onEmit('player_action', { roomId, action: 'fold' })}
                  className="bg-red-900 hover:bg-red-800 text-red-200 font-semibold rounded-lg py-3 transition-colors text-sm"
                >
                  다이
                </button>

                {canCheck ? (
                  <button
                    onClick={() => onEmit('player_action', { roomId, action: 'check' })}
                    className="bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg py-3 transition-colors text-sm"
                  >
                    삥
                  </button>
                ) : (
                  <button
                    onClick={() => onEmit('player_action', { roomId, action: 'call' })}
                    className="bg-blue-700 hover:bg-blue-600 text-white font-semibold rounded-lg py-3 transition-colors text-sm"
                  >
                    <span className="block">콜</span>
                    <span className="block text-xs text-blue-300">{callAmount.toLocaleString()}</span>
                  </button>
                )}

                <button
                  onClick={() => emitRaise(allInTotal)}
                  disabled={!canRaise}
                  className="bg-orange-800 hover:bg-orange-700 disabled:opacity-40 text-white font-semibold rounded-lg py-3 transition-colors text-sm"
                >
                  <span className="block">올인</span>
                  <span className="block text-xs text-orange-300">{allInTotal.toLocaleString()}</span>
                </button>
              </div>

              {canRaise && (
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => emitRaise(quarterTotal)}
                    className="bg-yellow-900 hover:bg-yellow-800 text-yellow-200 font-semibold rounded-lg py-2 transition-colors text-xs"
                  >
                    <span className="block">쿼터</span>
                    <span className="block text-yellow-400">{quarterTotal.toLocaleString()}</span>
                  </button>
                  <button
                    onClick={() => emitRaise(halfTotal)}
                    className="bg-yellow-900 hover:bg-yellow-800 text-yellow-200 font-semibold rounded-lg py-2 transition-colors text-xs"
                  >
                    <span className="block">하프</span>
                    <span className="block text-yellow-400">{halfTotal.toLocaleString()}</span>
                  </button>
                  <button
                    onClick={() => emitRaise(potTotal)}
                    className="bg-yellow-900 hover:bg-yellow-800 text-yellow-200 font-semibold rounded-lg py-2 transition-colors text-xs"
                  >
                    <span className="block">판돈</span>
                    <span className="block text-yellow-400">{potTotal.toLocaleString()}</span>
                  </button>
                </div>
              )}

              {canRaise && (
                <div className="flex gap-2 items-center">
                  <input
                    type="number"
                    value={raiseInput}
                    onChange={(e) => setRaiseInput(e.target.value)}
                    placeholder={`최소 ${minRaiseTotal.toLocaleString()}`}
                    min={minRaiseTotal}
                    max={allInTotal}
                    className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-500"
                  />
                  <button
                    onClick={() => {
                      const amount = parseInt(raiseInput)
                      if (!isNaN(amount) && amount >= minRaiseTotal && amount <= allInTotal) {
                        emitRaise(amount)
                      }
                    }}
                    className="bg-yellow-700 hover:bg-yellow-600 text-white font-semibold rounded-lg px-4 py-2 transition-colors text-sm"
                  >
                    레이즈
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 쇼다운 결과 */}
          {game.phase === 'showdown' && game.winners && (
            <div className="bg-yellow-900/30 border border-yellow-700 rounded-xl p-4 text-center">
              <p className="text-yellow-300 font-bold text-lg mb-2">결과</p>
              {game.winners.map((w) => {
                const isMe = w.playerId === myId
                const seatNum = game.seats.findIndex((s) => s.playerId === w.playerId)
                return (
                  <div key={w.playerId} className="text-white mb-1">
                    <span className="font-semibold">{isMe ? '나' : `시트 ${seatNum + 1}`}</span>
                    {w.hand && (
                      <span className="text-yellow-400 ml-2 text-sm">({w.hand.label})</span>
                    )}
                    <span className="text-green-400 ml-2 font-bold">
                      +{w.amount.toLocaleString()} 칩
                    </span>
                  </div>
                )
              })}
              <button
                onClick={() => onEmit('next_hand', roomId)}
                className="mt-4 bg-green-600 hover:bg-green-500 text-white font-bold px-6 py-2 rounded-lg transition-colors text-sm"
              >
                다음 핸드
              </button>
            </div>
          )}

          <div className="text-center">
            <PhaseLabel phase={game.phase} />
          </div>
        </>
      )}
    </div>
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
  const isAllIn = seat.status === 'all-in'

  const borderColor = isFolded
    ? 'border-gray-800'
    : isAllIn
      ? 'border-yellow-700'
      : 'border-gray-700'

  const lastDisplay = lastAction ? actionDisplay(lastAction) : null

  return (
    <div
      className={`bg-gray-900 border rounded-xl p-3 ${borderColor} ${isCurrent ? 'ring-2 ring-green-500' : ''} ${isFolded ? 'opacity-40' : ''}`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className={`font-semibold text-sm ${isMe ? 'text-green-400' : 'text-white'}`}>
          {isMe ? '나' : `P${seatIndex + 1}`}
          {isDealer && (
            <span className="ml-1 text-xs bg-yellow-600 text-white rounded px-1">D</span>
          )}
        </span>
        {/* 마지막 액션 배지 */}
        {lastDisplay && (
          <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full leading-none ${lastDisplay.color}`}>
            {lastDisplay.label}
          </span>
        )}
      </div>
      <div className="text-gray-300 text-sm">{seat.chips.toLocaleString()} 칩</div>
      {seat.betThisRound > 0 && (
        <div className="text-yellow-400 text-xs">베팅: {seat.betThisRound.toLocaleString()}</div>
      )}
      <div className="flex gap-1 mt-1.5">
        {seat.holeCards === 'hidden' ? (
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
  const size = large ? 'w-14 h-20 text-xl' : 'w-10 h-14 text-sm'
  return (
    <div
      className={`${size} bg-white rounded-lg flex flex-col items-center justify-center shadow-md font-bold ${isRed ? 'text-red-500' : 'text-gray-900'}`}
    >
      <span>{card.rank}</span>
      <span>{SUIT_SYMBOL[card.suit]}</span>
    </div>
  )
}

function CardBack() {
  return (
    <div className="w-10 h-14 bg-gray-700 border border-gray-600 rounded-lg flex items-center justify-center text-gray-500 text-xs">
      ?
    </div>
  )
}

function MiniCard({ card }: { card: Card }) {
  const isRed = card.suit === 'hearts' || card.suit === 'diamonds'
  return (
    <div
      className={`w-7 h-9 bg-white rounded text-xs font-bold flex flex-col items-center justify-center shadow ${isRed ? 'text-red-500' : 'text-gray-900'}`}
    >
      <span className="leading-none">{card.rank}</span>
      <span className="leading-none">{SUIT_SYMBOL[card.suit]}</span>
    </div>
  )
}

function MiniCardBack() {
  return <div className="w-7 h-9 bg-blue-900 border border-blue-800 rounded" />
}

function PhaseLabel({ phase }: { phase: string }) {
  const labels: Record<string, string> = {
    'pre-flop': '프리플랍',
    flop: '플랍',
    turn: '턴',
    river: '리버',
    showdown: '쇼다운',
  }
  return <span className="text-gray-600 text-xs">{labels[phase] ?? phase}</span>
}
