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
    <main className="min-h-screen bg-gray-950 text-white flex flex-col">
      <header className="border-b border-gray-800 px-5 py-3.5 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-green-400 font-bold text-lg">♠ POKER</span>
          <span className="text-gray-700">/</span>
          <span className="text-gray-400 text-sm">{freshRoom.name}</span>
        </div>
        <form action={leaveRoom}>
          <button
            type="submit"
            className="text-gray-500 hover:text-red-400 text-sm transition-colors"
          >
            방 나가기
          </button>
        </form>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row min-h-0">
        <RoomShell roomId={roomId} myId={userId} initialRoom={freshRoom} />
      </div>
    </main>
  )
}
