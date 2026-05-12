import { redirect, notFound } from 'next/navigation'
import { getUserId } from '@/lib/session'
import { store } from '@/lib/store'
import { leaveRoom } from '@/app/actions/user'
import PlayerList from './PlayerList'
import GameTable from './GameTable'

interface Props {
  params: Promise<{ roomId: string }>
}

export default async function RoomPage({ params }: Props) {
  const { roomId } = await params

  const userId = await getUserId()
  if (!userId || !store.getPlayer(userId)) redirect('/')

  const room = store.getRoomWithPlayers(roomId)
  if (!room) notFound()

  const player = store.getPlayer(userId)!

  if (player.roomId !== roomId) {
    const result = store.joinRoom(userId, roomId)
    if (!result.ok) redirect('/lobby')
  }

  const freshRoom = store.getRoomWithPlayers(roomId)!

  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col">
      <header className="border-b border-gray-800 px-5 py-3.5 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-green-400 font-bold text-lg">♠ POKER</span>
          <span className="text-gray-700">/</span>
          <span className="text-gray-400 text-sm">{freshRoom.name}</span>
        </div>
        <form action={leaveRoom}>
          <button type="submit" className="text-gray-500 hover:text-red-400 text-sm transition-colors">
            방 나가기
          </button>
        </form>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row min-h-0">
        {/* 사이드바: 방 번호 + 플레이어 통계 */}
        <aside className="lg:w-64 border-b lg:border-b-0 lg:border-r border-gray-800 p-4 flex flex-col gap-4 flex-shrink-0">
          {/* 방 번호 */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-center">
            <p className="text-gray-500 text-xs mb-1">방 번호</p>
            <p className="text-2xl font-bold tracking-[0.25em] text-green-400 font-mono">{roomId}</p>
            <p className="text-gray-600 text-xs mt-1">친구에게 이 번호를 알려주세요</p>
          </div>

          {/* 플레이어 목록 (이름 클릭 → 통계) */}
          <div>
            <p className="text-gray-500 text-xs mb-2 px-1">
              플레이어 ({freshRoom.players.length}/{freshRoom.maxPlayers})
            </p>
            <PlayerList players={freshRoom.players} myId={userId} />
          </div>
        </aside>

        {/* 게임 테이블 */}
        <GameTable
          roomId={roomId}
          myId={userId}
          initialPlayerCount={freshRoom.players.length}
        />
      </div>
    </main>
  )
}
