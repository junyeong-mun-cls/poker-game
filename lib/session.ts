import { cookies } from 'next/headers'

const COOKIE_NAME = 'poker_uid'

export async function getUserId(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get(COOKIE_NAME)?.value ?? null
}

export async function setUserId(id: string) {
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, id, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24,
  })
}
