'use server'

import { redirect } from 'next/navigation'
import { store } from '@/lib/store'
import { getUserId } from '@/lib/session'
import { getIO } from '@/lib/socket'

export type ActionState = { error: string } | undefined

function generateRoomCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000))
}

export async function createRoom(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const userId = await getUserId()
  if (!userId || !store.getPlayer(userId)) redirect('/')

  const rawBigBlind = parseInt(formData.get('bigBlind') as string, 10)
  const bigBlind = [50, 100, 200, 500].includes(rawBigBlind) ? rawBigBlind : 100

  const roomId = generateRoomCode()
  store.createRoom(roomId, bigBlind)
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

  // 이미 방에 있는 플레이어들에게 즉시 알림 (B의 소켓 연결을 기다리지 않음)
  try {
    const updatedRoom = store.getRoomWithPlayers(code)
    if (updatedRoom) getIO().to(code).emit('room_updated', updatedRoom)
  } catch {
    // 소켓 서버 미초기화 시 무시
  }

  redirect(`/room/${code}`)
}
