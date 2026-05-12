'use server'

import { redirect } from 'next/navigation'
import { store } from '@/lib/store'
import { getUserId } from '@/lib/session'

export type ActionState = { error: string } | undefined

function generateRoomCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000))
}

export async function createRoom(): Promise<ActionState> {
  const userId = await getUserId()
  if (!userId || !store.getPlayer(userId)) redirect('/')

  const roomId = generateRoomCode()
  store.createRoom(roomId)
  const result = store.joinRoom(userId, roomId)
  if (!result.ok) return { error: result.error }

  redirect(`/room/${roomId}`)
}

export async function joinRoomByCode(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const userId = await getUserId()
  if (!userId || !store.getPlayer(userId)) redirect('/')

  const code = (formData.get('code') as string | null)?.trim().replace(/\s/g, '')
  if (!code || !/^\d{6}$/.test(code)) {
    return { error: '6자리 숫자 방 번호를 입력해주세요' }
  }

  if (!store.getRoom(code)) {
    return { error: '존재하지 않는 방입니다' }
  }

  const result = store.joinRoom(userId, code)
  if (!result.ok) return { error: result.error }

  redirect(`/room/${code}`)
}
