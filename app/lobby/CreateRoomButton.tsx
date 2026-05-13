'use client'

import { useState } from 'react'
import { useActionState } from 'react'
import { createRoom } from '@/app/actions/room'

const BIG_BLIND_OPTIONS = [50, 100, 200, 500]

export default function CreateRoomButton() {
  const [state, formAction, pending] = useActionState(createRoom, undefined)
  const [selected, setSelected] = useState(100)

  return (
    <form action={formAction} className="w-full flex flex-col gap-3">
      <input type="hidden" name="bigBlind" value={selected} />

      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex flex-col gap-2">
        <p className="text-gray-500 text-xs text-center">빅 블라인드 설정</p>
        <div className="grid grid-cols-4 gap-1.5">
          {BIG_BLIND_OPTIONS.map((bb) => (
            <button
              key={bb}
              type="button"
              onClick={() => setSelected(bb)}
              className={`py-2 rounded-lg text-sm font-semibold transition-colors ${
                selected === bb
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
              }`}
            >
              {bb}
            </button>
          ))}
        </div>
        <p className="text-gray-600 text-xs text-center">
          SB {selected / 2} / BB {selected}
        </p>
      </div>

      {state?.error && (
        <p className="text-red-400 text-sm text-center">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-60 text-white font-bold text-lg rounded-2xl py-4 transition-colors shadow-lg shadow-green-900/30"
      >
        {pending ? '생성 중...' : '방 만들기'}
      </button>
    </form>
  )
}
