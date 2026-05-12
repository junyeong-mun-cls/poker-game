'use server'

import { redirect } from 'next/navigation'
import { v4 as uuidv4 } from 'uuid'
import { store } from '@/lib/store'
import { getUserId, setUserId } from '@/lib/session'

export type ActionState = { error: string } | undefined

export async function enterLobby(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const nickname = (formData.get('nickname') as string | null)?.trim() ?? ''

  if (nickname.length < 2 || nickname.length > 12) {
    return { error: '닉네임은 2~12자여야 합니다' }
  }

  let userId = await getUserId()
  if (!userId) {
    userId = uuidv4()
    await setUserId(userId)
  }

  store.upsertPlayer(userId, nickname)
  redirect('/lobby')
}

export async function leaveRoom() {
  const userId = await getUserId()
  if (!userId) redirect('/')

  store.leaveRoom(userId)
  redirect('/lobby')
}
