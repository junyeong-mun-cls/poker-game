'use client'

import { useState, useActionState } from 'react'
import { createRoom } from '@/app/actions/room'

const BB_OPTIONS = [50, 100, 200, 500] as const

export default function CreateRoomButton() {
  const [state, formAction, pending] = useActionState(createRoom, undefined)
  const [selected, setSelected] = useState<number>(100)

  return (
    <form action={formAction} className="w-full flex flex-col gap-3">
      <input type="hidden" name="bigBlind" value={selected} />

      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="text-gray-400 text-sm font-semibold">빅 블라인드</p>
          <p className="text-gray-600 text-xs">SB {selected / 2} / BB {selected}</p>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {BB_OPTIONS.map((bb) => (
            <button
              key={bb}
              type="button"
              onClick={() => setSelected(bb)}
              className={`py-2.5 rounded-xl text-sm font-bold transition-all ${
                selected === bb
                  ? 'bg-green-600 text-white shadow-lg shadow-green-900/40 scale-105'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
              }`}
            >
              {bb}
            </button>
          ))}
        </div>
      </div>

      {state?.error && (
        <p className="text-red-400 text-xs text-center">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full bg-green-600 hover:bg-green-500 active:scale-[0.98] disabled:opacity-50 text-white font-bold text-lg rounded-2xl py-4 transition-all shadow-lg shadow-green-900/30"
      >
        {pending ? '방 생성 중...' : '방 만들기 +'}
      </button>
    </form>
  )
}
