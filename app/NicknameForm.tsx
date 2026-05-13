'use client'

import { useActionState } from 'react'
import type { ActionState } from './actions/user'

interface Props {
  action: (_prev: ActionState, formData: FormData) => Promise<ActionState>
}

export default function NicknameForm({ action }: Props) {
  const [state, formAction, pending] = useActionState(action, undefined)

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <input
          id="nickname"
          name="nickname"
          type="text"
          placeholder="닉네임 (2~12자)"
          maxLength={12}
          autoFocus
          required
          className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3.5 text-white text-center text-lg placeholder-gray-600 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all"
        />
        {state?.error && (
          <p className="text-red-400 text-xs text-center">{state.error}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={pending}
        className="bg-green-600 hover:bg-green-500 active:scale-[0.98] disabled:opacity-50 text-white font-bold rounded-xl py-3.5 text-base transition-all shadow-lg shadow-green-900/40"
      >
        {pending ? '입장 중...' : '입장하기 →'}
      </button>
    </form>
  )
}
