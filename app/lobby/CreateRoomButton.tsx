'use client'

import { useTransition } from 'react'

interface Props {
  action: () => Promise<{ error: string } | undefined>
}

export default function CreateRoomButton({ action }: Props) {
  const [pending, startTransition] = useTransition()

  return (
    <button
      onClick={() => startTransition(async () => { await action() })}
      disabled={pending}
      className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-60 text-white font-bold text-lg rounded-2xl py-4 transition-colors shadow-lg shadow-green-900/30"
    >
      {pending ? '생성 중...' : '방 만들기'}
    </button>
  )
}
