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
      <div className="flex flex-col gap-1.5">
        <label htmlFor="nickname" className="text-gray-400 text-sm">
          닉네임
        </label>
        <input
          id="nickname"
          name="nickname"
          type="text"
          placeholder="2~12자 입력"
          maxLength={12}
          required
          className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-green-500 transition-colors"
        />
        {state?.error && (
          <p className="text-red-400 text-xs">{state.error}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={pending}
        className="bg-green-600 hover:bg-green-500 disabled:bg-green-900 disabled:text-green-700 text-white font-semibold rounded-lg py-2.5 transition-colors"
      >
        {pending ? '입장 중...' : '입장하기'}
      </button>
    </form>
  )
}
