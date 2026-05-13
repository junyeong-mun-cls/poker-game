export interface PlayerStats {
  chipsWon: number
  chipsLost: number
  wins: number
  losses: number
}

export interface Player {
  id: string
  nickname: string
  chips: number
  stats: PlayerStats
  roomId: string | null
  seatIndex: number | null
  isConnected: boolean
}

export type RoomStatus = 'waiting' | 'playing'

export interface Room {
  id: string
  name: string
  playerIds: string[]
  maxPlayers: number
  status: RoomStatus
  createdAt: number
  bigBlind: number
}

export interface RoomWithPlayers extends Room {
  players: Player[]
}
