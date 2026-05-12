'use server'

import { redirect } from 'next/navigation'
import { v4 as uuidv4 } from 'uuid'
import { store } from '@/lib/store'
import { getUserId, setUserId } from '@/lib/session'
import { getIO } from '@/lib/socket'

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

  const player = store.getPlayer(userId)
  const roomId = player?.roomId

  store.leaveRoom(userId)

  // 다른 플레이어들에게 방 상태 변경 즉시 알림
  if (roomId) {
    try {
      const io = getIO()
      const updatedRoom = store.getRoomWithPlayers(roomId)
      if (updatedRoom) {
        io.to(roomId).emit('room_updated', updatedRoom)
      } else {
        io.to(roomId).emit('room_closed')
      }
    } catch {
      // 소켓 서버 미초기화 시 무시
    }
  }

  redirect('/lobby')
}
