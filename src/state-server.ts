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

  public initWebSocketServer(websocketPath: string, port?: string | number) {
    if (port !== undefined) {
      if (!isNaN(port as any)) {
        port = parseInt(port as string)
      }
      WebSocketManager.getInstance(this.app, websocketPath, port as number)
    }
    else {
      WebSocketManager.getInstance(this.app, websocketPath)
    }
  }

  public createState(stateId: string, schema: JSON, initialState: JSON): boolean {
    if (StateManager.getInstance().has(stateId)) {
      return false
    }
    return StateManager.getInstance().createState(stateId, schema, initialState);
  }

  public deleteState(stateId: string) {
    return StateManager.getInstance().deleteState(stateId)
  }

  public setState(stateId: string, newState: JSON): boolean {
    return StateManager.getInstance().setState(stateId, newState)
  }

  public getState(stateId: string): JSON {
    return JSON.parse(JSON.stringify(StateManager.getInstance().getState(stateId)));
  }

  public createClient(): string {
    return uuid()
  }
}
