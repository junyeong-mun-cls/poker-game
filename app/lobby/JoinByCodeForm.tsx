'use client'

import { useActionState } from 'react'
import type { ActionState } from '../actions/room'

interface Props {
  action: (_prev: ActionState, formData: FormData) => Promise<ActionState>
}

export default function JoinByCodeForm({ action }: Props) {
  const [state, formAction, pending] = useActionState(action, undefined)

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input
        name="code"
        type="text"
        inputMode="numeric"
        pattern="\d{6}"
        placeholder="6자리 방 번호"
        maxLength={6}
        required
        className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white text-center text-xl tracking-widest placeholder-gray-600 focus:outline-none focus:border-green-500 transition-colors"
      />
      {state?.error && <p className="text-red-400 text-xs text-center">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white font-semibold rounded-lg py-3 transition-colors"
      >
        {pending ? '입장 중...' : '입장하기'}
      </button>
    </form>
  )
}
