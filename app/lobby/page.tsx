import { redirect } from 'next/navigation'
import { getUserId } from '@/lib/session'
import { store } from '@/lib/store'
import { joinRoomByCode } from '@/app/actions/room'
import CreateRoomButton from './CreateRoomButton'
import JoinByCodeForm from './JoinByCodeForm'

export default async function LobbyPage() {
  const userId = await getUserId()
  if (!userId || !store.getPlayer(userId)) redirect('/')

  const player = store.getPlayer(userId)!
  if (player.roomId) redirect(`/room/${player.roomId}`)

  return (
    <main className="min-h-screen bg-gray-950 flex flex-col">
      <header className="border-b border-gray-800/60 px-5 py-4 flex items-center justify-between flex-shrink-0">
        <span className="text-green-400 font-black text-xl tracking-widest">♠ POKER</span>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.6)]" />
          <span className="text-gray-300 text-sm font-medium">{player.nickname}</span>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-sm flex flex-col gap-5">
          <div className="text-center">
            <h2 className="text-white font-bold text-2xl">방 선택</h2>
            <p className="text-gray-600 text-sm mt-1">새 방을 만들거나 코드로 입장하세요</p>
          </div>

          <CreateRoomButton />

          <div className="flex items-center gap-3">
            <hr className="flex-1 border-gray-800" />
            <span className="text-gray-700 text-xs font-semibold tracking-widest">OR</span>
            <hr className="flex-1 border-gray-800" />
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <p className="text-gray-400 text-sm font-semibold mb-3">방 번호로 입장</p>
            <JoinByCodeForm action={joinRoomByCode} />
          </div>
        </div>
      </div>
    </main>
  )
}
