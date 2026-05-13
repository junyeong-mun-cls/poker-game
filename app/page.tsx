import { redirect } from 'next/navigation'
import { getUserId } from '@/lib/session'
import { store } from '@/lib/store'
import { enterLobby } from '@/app/actions/user'
import NicknameForm from './NicknameForm'

export default async function Home() {
  const userId = await getUserId()
  if (userId && store.getPlayer(userId)) redirect('/lobby')

  return (
    <main className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* 배경 장식 */}
      <div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
        <span className="absolute text-[22rem] font-black text-gray-900/40 leading-none -top-20 -left-20">♠</span>
        <span className="absolute text-[16rem] font-black text-gray-900/30 leading-none -bottom-10 -right-10">♥</span>
        <span className="absolute text-[8rem] font-black text-gray-900/20 leading-none top-1/3 right-12">♦</span>
      </div>

      <div className="relative z-10 w-full max-w-sm flex flex-col items-center gap-8">
        <div className="text-center">
          <h1 className="text-6xl font-black text-green-400 tracking-widest drop-shadow-[0_0_40px_rgba(74,222,128,0.25)]">
            ♠ POKER
          </h1>
          <p className="text-gray-600 mt-3 text-sm tracking-widest uppercase">Texas Hold&apos;em · 최대 6인</p>
        </div>

        <div className="w-full bg-gray-900/95 backdrop-blur border border-gray-800 rounded-2xl p-8 shadow-2xl shadow-black/60">
          <h2 className="text-white font-bold text-xl text-center mb-1">게임 참여</h2>
          <p className="text-gray-600 text-xs text-center mb-6">닉네임을 입력하고 바로 시작하세요</p>
          <NicknameForm action={enterLobby} />
        </div>
      </div>
    </main>
  )
}
