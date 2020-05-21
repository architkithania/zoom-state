import * as http from "http";
import {WebSocketManager} from "./websocket-manager";
import StateManager from "./state-manager";
import { v4 as uuid } from "uuid"
import ClientManager from "./client-manager";

export class StateServer {
  constructor(public app: http.Server) {
    StateManager.getInstance()
    ClientManager.getInstance()
  }

  public initWebSocketServer(websocketPath: string, port: string | number) {
    if (!isNaN(port as any)) {
      port = parseInt(port as string)
    }
    WebSocketManager.getInstance(this.app, websocketPath, port as number)
  }

  public createState(stateId: string, schema: JSON, initialState: JSON): boolean {
    if (StateManager.getInstance().has(stateId)) {
      return false
    }
    return StateManager.getInstance().createState(stateId, schema, initialState);
  }

  public createClient(): string {
    return uuid()
  }
}
