import { EventEmitter } from "events"
import LivelyWebsockets from "./LivelyWebsockets"
import * as http from "http"

export interface Payload {
  ws: LivelyWebsockets
  Request: http.IncomingMessage
  message: string
}

class MessageEmitter extends EventEmitter {
}

export default class MessageManager {
  private static instance: MessageManager
  private messageEmitter: MessageEmitter

  private constructor() {
    this.messageEmitter = new MessageEmitter()
  }

  public static getInstance(): MessageManager {
    if (!MessageManager.instance) {
      MessageManager.instance = new MessageManager()
    }
    return MessageManager.instance
  }

  public receivedMessage(payload: Payload) {
    this.messageEmitter.emit("received-message", payload)
  }

  public subscribeToReceivedMessages(cb: (payload: Payload) => void) {
    this.messageEmitter.on("received-message", cb)
  }

  public sendMessage(message: string, sockets: LivelyWebsockets[]) {
    this.messageEmitter.emit("send-message", message, sockets)
  }

  public subscribeToSentMessages(cb: (message: string, sockets: LivelyWebsockets[]) => void) {
    this.messageEmitter.on("send-message", cb)
  }
}