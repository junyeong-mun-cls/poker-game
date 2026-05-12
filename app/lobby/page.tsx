import { redirect } from 'next/navigation'
import { getUserId } from '@/lib/session'
import { store } from '@/lib/store'
import { createRoom, joinRoomByCode } from '@/app/actions/room'
import CreateRoomButton from './CreateRoomButton'
import JoinByCodeForm from './JoinByCodeForm'

export default async function LobbyPage() {
  const userId = await getUserId()
  if (!userId || !store.getPlayer(userId)) redirect('/')

  const player = store.getPlayer(userId)!

  // 이미 방에 있으면 해당 방으로 이동
  if (player.roomId) redirect(`/room/${player.roomId}`)

  return (
    <main className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-8 w-full max-w-sm px-4">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-green-400 tracking-wider">♠ POKER</h1>
          <p className="text-gray-400 mt-2">
            안녕하세요, <span className="text-white font-semibold">{player.nickname}</span>님
          </p>
        </div>

        <div className="w-full flex flex-col gap-4">
          <CreateRoomButton action={createRoom} />

          <div className="flex items-center gap-3 text-gray-700">
            <hr className="flex-1 border-gray-800" />
            <span className="text-sm">또는</span>
            <hr className="flex-1 border-gray-800" />
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <p className="text-gray-400 text-sm mb-4">방 번호로 입장</p>
            <JoinByCodeForm action={joinRoomByCode} />
          </div>
        </div>
      </div>
    </main>
  )
}
