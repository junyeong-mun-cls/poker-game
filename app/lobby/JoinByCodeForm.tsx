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
        placeholder="000000"
        maxLength={6}
        required
        className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3.5 text-white text-center text-2xl font-mono tracking-[0.6em] placeholder-gray-700 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all"
      />
      {state?.error && (
        <p className="text-red-400 text-xs text-center">{state.error}</p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="bg-gray-700 hover:bg-gray-600 active:scale-[0.98] disabled:opacity-50 text-white font-bold rounded-xl py-3.5 text-sm transition-all"
      >
        {pending ? '입장 중...' : '입장하기'}
      </button>
    </form>
  )
}
