import Websocket from "ws"

export default interface LivelyWebsockets extends Websocket {
  isAlive?: boolean
  uuid?: string
}

export function heartbeat(ws: LivelyWebsockets) {
  ws.isAlive = true
}
