import type { Server } from 'socket.io'

declare global {
  // eslint-disable-next-line no-var
  var _io: Server | undefined
}

export function getIO(): Server {
  if (!global._io) throw new Error('Socket.io server not initialized')
  return global._io
}

export function setIO(io: Server) {
  global._io = io
}
