import type { Player, Room, RoomWithPlayers } from './types'
import {
  createGame,
  applyFold,
  applyCheck,
  applyCall,
  applyRaise,
  prepareNextHand,
  type GameState,
} from './game/engine'

const STARTING_CHIPS = 1000
const MAX_PLAYERS = 6

class GameStore {
  private players = new Map<string, Player>()
  private rooms = new Map<string, Room>()
  private games = new Map<string, GameState>()

  // ── Player ──────────────────────────────────────────────

  upsertPlayer(id: string, nickname: string): Player {
    const existing = this.players.get(id)
    if (existing) {
      existing.nickname = nickname
      return existing
    }
    const player: Player = {
      id,
      nickname,
      chips: STARTING_CHIPS,
      stats: { chipsWon: 0, chipsLost: 0, wins: 0, losses: 0 },
      roomId: null,
      seatIndex: null,
      isConnected: true,
    }
    this.players.set(id, player)
    return player
  }

  getPlayer(id: string): Player | undefined {
    return this.players.get(id)
  }

  setConnected(id: string, connected: boolean) {
    const p = this.players.get(id)
    if (p) p.isConnected = connected
  }

  // ── Room ────────────────────────────────────────────────

  createRoom(id: string): Room {
    const room: Room = {
      id,
      name: `방 #${id}`,
      playerIds: [],
      maxPlayers: MAX_PLAYERS,
      status: 'waiting',
      createdAt: Date.now(),
    }
    this.rooms.set(id, room)
    return room
  }

  getRoom(id: string): Room | undefined {
    return this.rooms.get(id)
  }

  getRoomWithPlayers(id: string): RoomWithPlayers | undefined {
    const room = this.rooms.get(id)
    if (!room) return undefined
    return {
      ...room,
      players: room.playerIds.map((pid) => this.players.get(pid)!).filter(Boolean),
    }
  }

  listRooms(): RoomWithPlayers[] {
    return Array.from(this.rooms.values()).map((room) => ({
      ...room,
      players: room.playerIds.map((pid) => this.players.get(pid)!).filter(Boolean),
    }))
  }

  // ── Join / Leave ────────────────────────────────────────

  joinRoom(playerId: string, roomId: string): { ok: true } | { ok: false; error: string } {
    const player = this.players.get(playerId)
    if (!player) return { ok: false, error: '플레이어를 찾을 수 없습니다' }

    const room = this.rooms.get(roomId)
    if (!room) return { ok: false, error: '방을 찾을 수 없습니다' }
    if (room.status === 'playing') return { ok: false, error: '이미 게임 중인 방입니다' }
    if (room.playerIds.length >= room.maxPlayers) return { ok: false, error: '방이 꽉 찼습니다' }
    if (room.playerIds.includes(playerId)) return { ok: true }

    if (player.roomId) this.leaveRoom(playerId)

    room.playerIds.push(playerId)
    player.roomId = roomId
    player.chips = STARTING_CHIPS
    player.stats = { chipsWon: 0, chipsLost: 0, wins: 0, losses: 0 }
    player.seatIndex = room.playerIds.indexOf(playerId)

    return { ok: true }
  }

  leaveRoom(playerId: string): string | null {
    const player = this.players.get(playerId)
    if (!player?.roomId) return null

    const roomId = player.roomId
    const room = this.rooms.get(roomId)

    if (room) {
      room.playerIds = room.playerIds.filter((id) => id !== playerId)
      if (room.playerIds.length === 0) {
        this.rooms.delete(roomId)
        this.games.delete(roomId)
      } else if (room.status === 'playing') {
        // Remove player from active game too
        const game = this.games.get(roomId)
        if (game) {
          const seat = game.seats.find((s) => s.playerId === playerId)
          if (seat && seat.status === 'active') {
            // force fold this player
            try {
              const updated = applyFold(game)
              this.games.set(roomId, updated)
            } catch {
              // ignore if fold fails (not their turn)
              seat.status = 'folded'
            }
          }
        }
      }
    }

    player.roomId = null
    player.seatIndex = null
    return roomId
  }

  // ── Game lifecycle ───────────────────────────────────────

  startGame(roomId: string): GameState | { error: string } {
    const room = this.rooms.get(roomId)
    if (!room) return { error: '방을 찾을 수 없습니다' }
    if (room.playerIds.length < 2) return { error: '최소 2명이 필요합니다' }
    if (room.status === 'playing') return { error: '이미 게임 중입니다' }

    const existingGame = this.games.get(roomId)
    const dealerIndex = existingGame ? (existingGame.dealerIndex + 1) % room.playerIds.length : 0

    const players = room.playerIds.map((id) => {
      const p = this.players.get(id)!
      return { id, chips: p.chips }
    })

    const game = createGame(players, dealerIndex)
    this.games.set(roomId, game)
    room.status = 'playing'
    return game
  }

  getGame(roomId: string): GameState | undefined {
    return this.games.get(roomId)
  }

  applyPlayerAction(
    roomId: string,
    playerId: string,
    action: 'fold' | 'check' | 'call' | 'raise',
    raiseAmount?: number,
  ): GameState | { error: string } {
    const game = this.games.get(roomId)
    if (!game) return { error: '진행 중인 게임이 없습니다' }

    const currentSeatIndex = game.pendingSeats[0]
    if (currentSeatIndex === undefined) return { error: '대기 중인 플레이어가 없습니다' }

    const currentSeat = game.seats[currentSeatIndex]
    if (currentSeat.playerId !== playerId) return { error: '당신의 차례가 아닙니다' }

    try {
      let updated: GameState
      if (action === 'fold') updated = applyFold(game)
      else if (action === 'check') updated = applyCheck(game)
      else if (action === 'call') updated = applyCall(game)
      else if (action === 'raise') {
        if (!raiseAmount) return { error: '레이즈 금액을 입력해주세요' }
        updated = applyRaise(game, raiseAmount)
      } else return { error: '알 수 없는 액션입니다' }

      this.games.set(roomId, updated)

      // If showdown, update player stats
      if (updated.phase === 'showdown' && updated.winners) {
        this.applyShowdownResults(roomId, updated)
      }

      return updated
    } catch (err) {
      return { error: (err as Error).message }
    }
  }

  startNextHand(roomId: string): GameState | { error: string } {
    const room = this.rooms.get(roomId)
    if (!room) return { error: '방을 찾을 수 없습니다' }

    const prevGame = this.games.get(roomId)
    if (!prevGame) return { error: '이전 게임이 없습니다' }

    // Sync chips from game seats back to players
    for (const seat of prevGame.seats) {
      const p = this.players.get(seat.playerId)
      if (p) p.chips = seat.chips
    }

    // Remove players with 0 chips
    const activePlayers = room.playerIds
      .map((id) => this.players.get(id)!)
      .filter((p) => p.chips > 0)

    if (activePlayers.length < 2) return { error: '게임을 계속할 플레이어가 부족합니다' }

    const nextDealer = (prevGame.dealerIndex + 1) % activePlayers.length
    const game = createGame(
      activePlayers.map((p) => ({ id: p.id, chips: p.chips })),
      nextDealer,
    )

    this.games.set(roomId, game)
    return game
  }

  private applyShowdownResults(roomId: string, game: GameState) {
    const room = this.rooms.get(roomId)
    if (!room) return

    for (const seat of game.seats) {
      const p = this.players.get(seat.playerId)
      if (!p) continue
      const startChips = 1000 // or track from game start
      const netChange = seat.chips - startChips
      if (netChange > 0) {
        p.stats.chipsWon += netChange
        p.stats.wins += 1
      } else if (netChange < 0) {
        p.stats.chipsLost += -netChange
        p.stats.losses += 1
      }
    }
  }

  endGame(roomId: string) {
    const room = this.rooms.get(roomId)
    if (room) room.status = 'waiting'
    this.games.delete(roomId)
  }
}

declare global {
  // eslint-disable-next-line no-var
  var _gameStore: GameStore | undefined
}

if (!global._gameStore) {
  global._gameStore = new GameStore()
}

export const store = global._gameStore
