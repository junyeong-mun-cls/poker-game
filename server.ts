import { createServer } from 'http'
import next from 'next'
import { Server } from 'socket.io'
import { store } from './lib/store'
import { setIO } from './lib/socket'
import { sanitizeForPlayer } from './lib/game/engine'

const port = parseInt(process.env.PORT ?? '3000', 10)
const dev = process.env.NODE_ENV !== 'production'

const app = next({ dev })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  // Socket.io 폴링 요청이 Next.js 핸들러로 넘어가지 않도록 분기
  const httpServer = createServer((req, res) => {
    if (req.url?.startsWith('/socket.io')) return
    handle(req, res)
  })

  const io = new Server(httpServer, {
    cors: { origin: '*' },
  })

  setIO(io)

  // Socket.io 룸 멤버십을 기준으로 각 플레이어에게 격리된 게임 상태 전송
  function broadcastGameState(roomId: string) {
    const game = store.getGame(roomId)
    if (!game) return

    const roomSockets = io.sockets.adapter.rooms.get(roomId)
    if (!roomSockets) return

    for (const socketId of roomSockets) {
      const socket = io.sockets.sockets.get(socketId)
      if (!socket) continue
      const userId = socket.handshake.auth.userId as string
      socket.emit('game_state', sanitizeForPlayer(game, userId))
    }
  }

  function broadcastRoomState(roomId: string) {
    const room = store.getRoomWithPlayers(roomId)
    if (room) io.to(roomId).emit('room_updated', room)
    else io.to(roomId).emit('room_closed')
  }

  io.on('connection', (socket) => {
    const userId = socket.handshake.auth.userId as string | undefined
    if (!userId) { socket.disconnect(); return }

    store.setConnected(userId, true)

    socket.on('join_room', (roomId: string) => {
      socket.join(roomId)
      socket.data.roomId = roomId  // disconnect 시 참조용

      const game = store.getGame(roomId)
      if (game) socket.emit('game_state', sanitizeForPlayer(game, userId))
      broadcastRoomState(roomId)
    })

    socket.on('leave_room', (roomId: string) => {
      store.leaveRoom(userId)
      socket.leave(roomId)
      delete socket.data.roomId
      broadcastRoomState(roomId)
    })

    // ── Game events ─────────────────────────────────────

    socket.on('start_game', (roomId: string) => {
      const result = store.startGame(roomId)
      if ('error' in result) {
        socket.emit('game_error', result.error)
        return
      }
      broadcastGameState(roomId)
      broadcastRoomState(roomId)
    })

    socket.on(
      'player_action',
      (data: { roomId: string; action: 'fold' | 'check' | 'call' | 'raise'; amount?: number }) => {
        const result = store.applyPlayerAction(data.roomId, userId, data.action, data.amount)
        if ('error' in result) {
          socket.emit('game_error', result.error)
          return
        }
        broadcastGameState(data.roomId)
      },
    )

    socket.on('next_hand', (roomId: string) => {
      const result = store.startNextHand(roomId)
      if ('error' in result) {
        socket.emit('game_error', result.error)
        return
      }
      broadcastGameState(roomId)
    })

    socket.on('disconnect', () => {
      store.setConnected(userId, false)
      const roomId: string | undefined = socket.data.roomId
      if (roomId) {
        broadcastRoomState(roomId)
      }
    })
  })

  httpServer.listen(port, () => {
    console.log(`> Ready on http://localhost:${port} [${dev ? 'dev' : 'prod'}]`)
  })
})
