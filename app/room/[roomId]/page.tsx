import { redirect, notFound } from 'next/navigation'
import { getUserId } from '@/lib/session'
import { store } from '@/lib/store'
import { leaveRoom } from '@/app/actions/user'
import RoomShell from './RoomShell'

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
    <main className="h-screen bg-gray-950 text-white flex flex-col overflow-hidden">
      <header className="border-b border-gray-800 px-4 sm:px-5 py-3 flex items-center justify-between flex-shrink-0 bg-gray-950/95 backdrop-blur z-10">
        <div className="flex items-center gap-2.5">
          <span className="text-green-400 font-black text-lg tracking-widest">♠</span>
          <span className="text-gray-700 hidden sm:inline">/</span>
          <span className="text-gray-400 text-sm hidden sm:inline">{freshRoom.name}</span>
        </div>

        {/* 모바일: 중앙에 방번호 */}
        <div className="lg:hidden absolute left-1/2 -translate-x-1/2 flex items-center gap-1.5">
          <span className="text-gray-600 text-xs">방</span>
          <span className="text-green-400 font-mono font-bold tracking-[0.2em] text-sm">{roomId}</span>
        </div>

        <form action={leaveRoom}>
          <button
            type="submit"
            className="text-gray-500 hover:text-red-400 text-sm transition-colors px-2.5 py-1.5 rounded-lg hover:bg-red-900/20 active:scale-95"
          >
            나가기
          </button>
        </form>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        <RoomShell roomId={roomId} myId={userId} initialRoom={freshRoom} />
      </div>
    </main>
  )
}
