'use client'

import { useState, useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import type { RoomWithPlayers, Player } from '@/lib/types'
import type { ClientGameState } from '@/lib/game/engine'
import PlayerList from './PlayerList'
import GameTable from './GameTable'

interface Props {
  roomId: string
  myId: string
  initialRoom: RoomWithPlayers
}

export default function RoomShell({ roomId, myId, initialRoom }: Props) {
  const [players, setPlayers] = useState<Player[]>(initialRoom.players)
  const [maxPlayers] = useState(initialRoom.maxPlayers)
  const [game, setGame] = useState<ClientGameState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showPlayers, setShowPlayers] = useState(false)
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    const socket = io({ auth: { userId: myId } })
    socketRef.current = socket

    socket.on('connect', () => {
      socket.emit('join_room', roomId)
    })

    socket.on('room_updated', (room: RoomWithPlayers) => {
      setPlayers(room.players)
    })

    socket.on('room_closed', () => {
      window.location.href = '/lobby'
    })

    socket.on('game_state', (state: ClientGameState) => {
      setGame(state)
      setError(null)
    })

    socket.on('game_error', (msg: string) => {
      setError(msg)
    })

    return () => {
      socket.disconnect()
    }
  }, [roomId, myId])

  const emit = (event: string, data?: unknown) => {
    socketRef.current?.emit(event, data)
  }

  return (
    <>
      {/* ── 데스크톱 사이드바 ─────────────────────────────── */}
      <aside className="hidden lg:flex w-60 xl:w-64 border-r border-gray-800 bg-gray-950 flex-col gap-4 flex-shrink-0 overflow-y-auto">
        <div className="p-4 flex flex-col gap-4">
          {/* 방번호 */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
            <p className="text-gray-600 text-[10px] mb-1.5 tracking-widest uppercase">방 번호</p>
            <p className="text-2xl font-black tracking-[0.3em] text-green-400 font-mono">{roomId}</p>
            <p className="text-gray-700 text-[10px] mt-2">친구에게 공유하세요</p>
          </div>

          {/* 플레이어 목록 */}
          <div>
            <p className="text-gray-600 text-[10px] mb-2.5 px-0.5 tracking-widest uppercase">
              플레이어 {players.length}/{maxPlayers}
            </p>
            <PlayerList players={players} myId={myId} />
          </div>
        </div>
      </aside>

      {/* ── 모바일 플레이어 패널 (하단 시트) ─────────────── */}
      {showPlayers && (
        <div
          className="lg:hidden fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex flex-col justify-end"
          onClick={() => setShowPlayers(false)}
        >
          <div
            className="bg-gray-900 border-t border-gray-800 rounded-t-3xl max-h-[75vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 드래그 핸들 */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-gray-700 rounded-full" />
            </div>

            <div className="px-5 pt-2 pb-6">
              <div className="flex items-start justify-between mb-5">
                <div>
                  <p className="text-gray-600 text-[10px] tracking-widest uppercase mb-1">방 번호</p>
                  <p className="text-3xl font-black tracking-[0.3em] text-green-400 font-mono">{roomId}</p>
                </div>
                <div className="text-right">
                  <p className="text-gray-600 text-xs mb-1">
                    {players.length}/{maxPlayers}명
                  </p>
                  <button
                    onClick={() => setShowPlayers(false)}
                    className="text-gray-500 hover:text-white text-2xl leading-none w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-800 transition-colors"
                  >
                    ×
                  </button>
                </div>
              </div>
              <PlayerList players={players} myId={myId} />
            </div>
          </div>
        </div>
      )}

      {/* ── 게임 테이블 ────────────────────────────────────── */}
      <GameTable
        roomId={roomId}
        myId={myId}
        game={game}
        error={error}
        playerCount={players.length}
        onEmit={emit}
        onShowPlayers={() => setShowPlayers(true)}
        mobilePlayerCount={players.length}
        mobileMaxPlayers={maxPlayers}
      />
    </>
  )
}
