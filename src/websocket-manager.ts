import { Map } from "typescript"
import * as WebSocket from "ws"
import * as http from "http";
import { v4 as uuidv4 } from 'uuid';
import LivelyWebsockets, {heartbeat} from "./LivelyWebsockets";
import MessageManager from "./message-emitter";

export class WebSocketManager {
  private static instance: WebSocketManager
  private pingInterval: NodeJS.Timeout
  public websockets = new Map<string, LivelyWebsockets>()

  public readonly wss: WebSocket.Server

  private constructor(private readonly app: http.Server, public readonly webSocketPath: string,
                      public readonly port?: number) {

    if (port === undefined) {
      this.wss = new WebSocket.Server({server: app, path: webSocketPath})
    }
    else {
      this.wss = new WebSocket.Server({server: app, path: webSocketPath, port: port})
    }

    this.messageListener();
    this.handleConnections();

    this.pingInterval = <NodeJS.Timeout><unknown>null
    this.initialisePinging(5000);
  }

  private handleConnections() {
    // Register heartbeat function for each connected websocket
    this.wss.on("connection", (ws: any, req) => {
      ws.isAlive = true
      ws.uuid = uuidv4()
      const livelyWebsocket = <LivelyWebsockets>ws
      this.websockets.set(ws.uuid, ws)
      ws.on("pong", () => heartbeat(livelyWebsocket))

      this.handleMessages(ws, req)
    })
  }

  // Register periodic pinging of all websockets
  // Remove if websocket does not respond
  private initialisePinging(interval: number) {
    this.pingInterval = setInterval(() => {
      this.wss.clients.forEach((ws: LivelyWebsockets) => {
        if (!ws.isAlive) {
          this.closeWebsocket(ws);
        }

        ws.isAlive = false
        ws.ping("")
      })
    }, interval)

    // Unregister pinging of the websockets
    this.wss.on("close", () => clearInterval(this.pingInterval))
  }

  public static getInstance(app?: http.Server, webSocketPath?: string, port?: number): WebSocketManager {
    if (!WebSocketManager.instance) {
      if (!app || !webSocketPath) {
        throw new Error("Trying to get instance of an uninitialized WebSocketManager." +
                        " Provide at least an http.Server and a webSocketPath")
      }
      WebSocketManager.instance = new WebSocketManager(app, webSocketPath, port)
    }
    return WebSocketManager.instance
  }

  public closeWebsocket(ws: LivelyWebsockets) {
    this.websockets.delete(ws.uuid ?? "")
    ws.terminate()
  }

  public closeAll() {
    const currentlyOpenWebsockets = new Set(this.wss.clients)
    currentlyOpenWebsockets.forEach((ws: LivelyWebsockets) => {
      this.websockets.delete(ws.uuid ?? "")
      ws.terminate()
    })
  }

  private handleMessages(ws: LivelyWebsockets, req: http.IncomingMessage) {
    ws.on("message", (message: string) => {
      MessageManager.getInstance().receivedMessage({ws: ws, Request: req, message: message})
    })
  }

  private messageListener() {
    MessageManager.getInstance().subscribeToSentMessages((message: string, sockets: LivelyWebsockets[]) => {
      sockets.forEach(ws => {
        if (ws.isAlive && ws.readyState == WebSocket.OPEN) {
          ws.send(message)
        }
      })
    })
  }
}
