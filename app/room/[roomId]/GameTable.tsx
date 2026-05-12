'use client'

import { useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import type { ClientGameState, ClientSeatState } from '@/lib/game/engine'
import type { Card } from '@/lib/game/deck'
import { SUIT_SYMBOL } from '@/lib/game/deck'

interface Props {
  roomId: string
  myId: string
  initialPlayerCount: number
}

export default function GameTable({ roomId, myId, initialPlayerCount }: Props) {
  const [game, setGame] = useState<ClientGameState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [raiseInput, setRaiseInput] = useState('')
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    const socket = io({ auth: { userId: myId } })
    socketRef.current = socket

    socket.emit('join_room', roomId)
    socket.on('game_state', (state: ClientGameState) => {
      setGame(state)
      setError(null)
    })
    socket.on('error', (msg: string) => setError(msg))

    return () => { socket.disconnect() }
  }, [roomId, myId])

  const emit = (event: string, data?: unknown) => socketRef.current?.emit(event, data)

  const mySeatIndex = game?.seats.findIndex((s) => s.playerId === myId) ?? -1
  const isMyTurn = game?.pendingSeats[0] === mySeatIndex
  const mySeat = mySeatIndex >= 0 ? game?.seats[mySeatIndex] : null

  const callAmount = game ? game.currentBet - (mySeat?.betThisRound ?? 0) : 0
  const minRaiseTotal = game ? game.currentBet + game.minRaise : 0
  const canCheck = game ? (mySeat?.betThisRound ?? 0) >= game.currentBet : false

  if (!game) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
        <p className="text-gray-500">대기 중...</p>
        {initialPlayerCount >= 2 && (
          <button
            onClick={() => emit('start_game', roomId)}
            className="bg-green-600 hover:bg-green-500 text-white font-bold px-8 py-3 rounded-xl transition-colors"
          >
            게임 시작
          </button>
        )}
        {initialPlayerCount < 2 && (
          <p className="text-gray-600 text-sm">게임 시작을 위해 2명 이상이 필요합니다</p>
        )}
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col gap-4 p-5">
      {error && (
        <div className="bg-red-900/40 border border-red-700 rounded-lg px-4 py-2 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Community Cards + Pot */}
      <div className="bg-green-950 border border-green-900 rounded-2xl p-5 flex flex-col items-center gap-3">
        <div className="flex gap-2">
          {Array.from({ length: 5 }).map((_, i) => {
            const card = game.communityCards[i]
            return card ? (
              <CardDisplay key={i} card={card} />
            ) : (
              <CardBack key={i} />
            )
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

      {/* Seats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {game.seats.map((seat, i) => (
          <SeatDisplay
            key={seat.playerId}
            seat={seat}
            seatIndex={i}
            isDealer={i === game.dealerIndex}
            isCurrent={game.pendingSeats[0] === i}
            isMe={seat.playerId === myId}
          />
        ))}
      </div>

      {/* My hole cards */}
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

      {/* Betting controls */}
      {game.phase !== 'showdown' && isMyTurn && mySeat?.status === 'active' && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col gap-3">
          <p className="text-gray-400 text-sm text-center">내 차례입니다</p>
          <div className="flex gap-2">
            <button
              onClick={() => emit('player_action', { roomId, action: 'fold' })}
              className="flex-1 bg-red-900 hover:bg-red-800 text-red-200 font-semibold rounded-lg py-2.5 transition-colors text-sm"
            >
              폴드
            </button>
            {canCheck ? (
              <button
                onClick={() => emit('player_action', { roomId, action: 'check' })}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg py-2.5 transition-colors text-sm"
              >
                체크
              </button>
            ) : (
              <button
                onClick={() => emit('player_action', { roomId, action: 'call' })}
                className="flex-1 bg-blue-700 hover:bg-blue-600 text-white font-semibold rounded-lg py-2.5 transition-colors text-sm"
              >
                콜 ({callAmount.toLocaleString()})
              </button>
            )}
            <button
              onClick={() => {
                const amount = parseInt(raiseInput)
                if (!isNaN(amount) && amount >= minRaiseTotal) {
                  emit('player_action', { roomId, action: 'raise', amount })
                  setRaiseInput('')
                }
              }}
              className="flex-1 bg-yellow-700 hover:bg-yellow-600 text-white font-semibold rounded-lg py-2.5 transition-colors text-sm"
            >
              레이즈
            </button>
          </div>
          <div className="flex gap-2 items-center">
            <input
              type="number"
              value={raiseInput}
              onChange={(e) => setRaiseInput(e.target.value)}
              placeholder={`최소 ${minRaiseTotal.toLocaleString()}`}
              min={minRaiseTotal}
              max={mySeat.chips + mySeat.betThisRound}
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-500"
            />
            <div className="flex gap-1">
              {[minRaiseTotal, Math.floor(game.pot / 2), game.pot].map((v) => (
                <button
                  key={v}
                  onClick={() => setRaiseInput(String(v))}
                  className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 rounded px-2 py-1"
                >
                  {v >= game.pot ? 'Pot' : v >= Math.floor(game.pot / 2) ? '1/2' : 'Min'}
                </button>
              ))}
              <button
                onClick={() => setRaiseInput(String(mySeat.chips + mySeat.betThisRound))}
                className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 rounded px-2 py-1"
              >
                All-in
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Showdown result */}
      {game.phase === 'showdown' && game.winners && (
        <div className="bg-yellow-900/30 border border-yellow-700 rounded-xl p-4 text-center">
          <p className="text-yellow-300 font-bold text-lg mb-2">결과</p>
          {game.winners.map((w) => {
            const seat = game.seats.find((s) => s.playerId === w.playerId)
            return (
              <div key={w.playerId} className="text-white">
                <span className="font-semibold">{seat?.playerId === myId ? '나' : `시트 ${w.seatIndex + 1}`}</span>
                {w.hand && <span className="text-yellow-400 ml-2 text-sm">({w.hand.label})</span>}
                <span className="text-green-400 ml-2 font-bold">+{w.amount.toLocaleString()} 칩</span>
              </div>
            )
          })}
          <button
            onClick={() => emit('next_hand', roomId)}
            className="mt-4 bg-green-600 hover:bg-green-500 text-white font-bold px-6 py-2 rounded-lg transition-colors text-sm"
          >
            다음 핸드
          </button>
        </div>
      )}

      {/* Phase indicator */}
      <div className="text-center">
        <PhaseLabel phase={game.phase} />
      </div>
    </div>
  )
}

function SeatDisplay({
  seat, seatIndex, isDealer, isCurrent, isMe,
}: {
  seat: ClientSeatState
  seatIndex: number
  isDealer: boolean
  isCurrent: boolean
  isMe: boolean
}) {
  const statusColor = {
    active: 'border-gray-700',
    folded: 'border-gray-800 opacity-50',
    'all-in': 'border-yellow-700',
  }[seat.status]

  return (
    <div
      className={`bg-gray-900 border rounded-xl p-3 ${statusColor} ${isCurrent ? 'ring-2 ring-green-500' : ''}`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className={`font-semibold text-sm ${isMe ? 'text-green-400' : 'text-white'}`}>
          {isMe ? '나' : `P${seatIndex + 1}`}
          {isDealer && <span className="ml-1 text-xs bg-yellow-600 text-white rounded px-1">D</span>}
        </span>
        <span className="text-gray-500 text-xs">{seat.status === 'folded' ? '폴드' : seat.status === 'all-in' ? '올인' : ''}</span>
      </div>
      <div className="text-gray-300 text-sm">{seat.chips.toLocaleString()} 칩</div>
      {seat.betThisRound > 0 && (
        <div className="text-yellow-400 text-xs">베팅: {seat.betThisRound.toLocaleString()}</div>
      )}
      {/* Show cards if available */}
      <div className="flex gap-1 mt-1.5">
        {seat.holeCards === 'hidden' ? (
          <>
            <MiniCardBack />
            <MiniCardBack />
          </>
        ) : seat.holeCards && Array.isArray(seat.holeCards) ? (
          (seat.holeCards as Card[]).map((card, i) => (
            <MiniCard key={i} card={card} />
          ))
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
