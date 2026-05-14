'use client'

import { useState, useRef, useActionState } from 'react'
import { createRoom } from '@/app/actions/room'

const BB_OPTIONS = [50, 100, 200, 500] as const

export default function CreateRoomButton() {
  const [state, formAction, pending] = useActionState(createRoom, undefined)
  const [selected, setSelected] = useState(100)
  const hiddenInputRef = useRef<HTMLInputElement>(null)

  function selectBB(bb: number) {
    setSelected(bb)
    // hidden input도 직접 업데이트 (React controlled value 외 보험)
    if (hiddenInputRef.current) hiddenInputRef.current.value = String(bb)
  }

  return (
    <div className="w-full flex flex-col gap-3">
      {/* BB 선택 — form 바깥에 위치시켜 submit 충돌 완전 차단 */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-300 text-sm font-bold">시작 판돈</p>
            <p className="text-gray-600 text-xs mt-0.5">작을수록 여유있게, 클수록 빠른 판</p>
          </div>
          <div className="text-right">
            <p className="text-green-400 font-mono font-black text-sm">BB {selected}</p>
            <p className="text-gray-600 text-xs">SB {selected / 2}</p>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {BB_OPTIONS.map((bb) => (
            <button
              key={bb}
              type="button"
              onClick={() => selectBB(bb)}
              className={`py-3 rounded-xl text-sm font-bold transition-all border-2 ${
                selected === bb
                  ? 'border-green-500 bg-green-900/40 text-green-400'
                  : 'border-transparent bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
              }`}
            >
              {bb}
            </button>
          ))}
        </div>
        <p className="text-gray-700 text-[11px] text-center">
          초기 보유 칩 1,000 · 시작 칩 기준 SB {selected / 2} / BB {selected}
        </p>
      </div>

      {/* 방 만들기 form (submit 버튼만 포함) */}
      <form action={formAction}>
        <input ref={hiddenInputRef} type="hidden" name="bigBlind" value={selected} />
        {state?.error && (
          <p className="text-red-400 text-xs text-center mb-2">{state.error}</p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="w-full bg-green-600 hover:bg-green-500 active:scale-[0.98] disabled:opacity-50 text-white font-bold text-lg rounded-2xl py-4 transition-all shadow-lg shadow-green-900/30"
        >
          {pending ? '방 생성 중...' : '방 만들기 +'}
        </button>
      </form>
    </div>
  )
}
