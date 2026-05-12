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
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    const socket = io({ auth: { userId: myId } })
    socketRef.current = socket

    // connect 이벤트마다 join_room 재전송 — 재접속 시에도 방 멤버십 유지
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
      {/* 사이드바: 방 번호 + 플레이어 목록 */}
      <aside className="lg:w-64 border-b lg:border-b-0 lg:border-r border-gray-800 p-4 flex flex-col gap-4 flex-shrink-0">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-center">
          <p className="text-gray-500 text-xs mb-1">방 번호</p>
          <p className="text-2xl font-bold tracking-[0.25em] text-green-400 font-mono">{roomId}</p>
          <p className="text-gray-600 text-xs mt-1">친구에게 이 번호를 알려주세요</p>
        </div>

        <div>
          <p className="text-gray-500 text-xs mb-2 px-1">
            플레이어 ({players.length}/{maxPlayers})
          </p>
          <PlayerList players={players} myId={myId} />
        </div>
      </aside>

      {/* 게임 테이블 */}
      <GameTable
        roomId={roomId}
        myId={myId}
        game={game}
        error={error}
        playerCount={players.length}
        onEmit={emit}
      />
    </>
  )
}
