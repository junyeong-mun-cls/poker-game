import { redirect } from 'next/navigation'
import { getUserId } from '@/lib/session'
import { store } from '@/lib/store'
import { enterLobby } from '@/app/actions/user'
import NicknameForm from './NicknameForm'

export default async function Home() {
  const userId = await getUserId()
  if (userId && store.getPlayer(userId)) redirect('/lobby')

  return (
    <main className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-8">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-green-400 tracking-wider">♠ POKER</h1>
          <p className="text-gray-400 mt-2 text-sm">최대 6인 텍사스 홀덤</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 w-80 shadow-2xl">
          <h2 className="text-white font-semibold text-lg mb-6 text-center">게임 참여</h2>
          <NicknameForm action={enterLobby} />
        </div>
      </div>
    </main>
  )
}
