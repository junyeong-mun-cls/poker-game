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
  const httpServer = createServer((req, res) => handle(req, res))

  const io = new Server(httpServer, {
    cors: { origin: '*' },
  })

  setIO(io)

  function broadcastGameState(roomId: string) {
    const game = store.getGame(roomId)
    if (!game) return

    const room = store.getRoomWithPlayers(roomId)
    if (!room) return

    for (const player of room.players) {
      const socket = [...io.sockets.sockets.values()].find(
        (s) => s.handshake.auth.userId === player.id,
      )
      if (socket) {
        socket.emit('game_state', sanitizeForPlayer(game, player.id))
      }
    }
  }

  function broadcastRoomState(roomId: string) {
    const room = store.getRoomWithPlayers(roomId)
    if (room) io.to(roomId).emit('room_updated', room)
  }

  io.on('connection', (socket) => {
    const userId = socket.handshake.auth.userId as string | undefined
    if (!userId) { socket.disconnect(); return }

    store.setConnected(userId, true)

    socket.on('join_room', (roomId: string) => {
      socket.join(roomId)
      const game = store.getGame(roomId)
      if (game) socket.emit('game_state', sanitizeForPlayer(game, userId))
      broadcastRoomState(roomId)
    })

    socket.on('leave_room', (roomId: string) => {
      store.leaveRoom(userId)
      socket.leave(roomId)
      broadcastRoomState(roomId)
    })

    // ── Game events ──────────────────────────────────────

    socket.on('start_game', (roomId: string) => {
      const result = store.startGame(roomId)
      if ('error' in result) {
        socket.emit('error', result.error)
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
          socket.emit('error', result.error)
          return
        }
        broadcastGameState(data.roomId)
      },
    )

    socket.on('next_hand', (roomId: string) => {
      const result = store.startNextHand(roomId)
      if ('error' in result) {
        socket.emit('error', result.error)
        return
      }
      broadcastGameState(roomId)
    })

    socket.on('disconnect', () => {
      store.setConnected(userId, false)
      const player = store.getPlayer(userId)
      if (player?.roomId) {
        io.to(player.roomId).emit('player_disconnected', { userId, nickname: player.nickname })
        broadcastRoomState(player.roomId)
      }
    })
  })

  httpServer.listen(port, () => {
    console.log(`> Ready on http://localhost:${port} [${dev ? 'dev' : 'prod'}]`)
  })
})
