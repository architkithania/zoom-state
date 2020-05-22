import MessageManager, {Payload} from "./message-emitter";
import Joi from "@hapi/joi"
import State from "./State";
import {WebSocketManager} from "./websocket-manager";
import Client from "./Client";

interface Manager {
  manager: string
}

interface StateSchema {
  type: string,
  stateId: string,
  state?: JSON
}

export default class StateManager {
  private static instance: StateManager
  private stateSchema: Joi.Schema

  private states = new Map<string, State>()

  private constructor() {
    this.stateSchema = Joi.object({
      manager: Joi.string().alphanum().required(),
      data: Joi.object({
        type: Joi.string().valid('set-state', 'get-state', 'create-state').alphanum().required(),
        stateId: Joi.string().required(),
        state: Joi.alternatives().conditional('type', {
          is: "set-state",
          then: Joi.object().keys().unknown().required()
        }),
        stateSchema: Joi.alternatives().conditional("type", {
          is: "create-state",
          then: Joi.object().keys().unknown().required()
        })
      })
    })

    this.handleMessages()
  }

  public static getInstance() {
    if (!StateManager.instance) {
      StateManager.instance = new StateManager()
    }
    return StateManager.instance
  }

  private handleMessages() {
    MessageManager.getInstance().subscribeToReceivedMessages(async (payload: Payload) => {
      let messageJson: any;
      try {
        messageJson = await JSON.parse(payload.message);
      }
      catch (e) {
        console.log("Message not JSON parsable. Aborting handle")
        return
      }

      if (!messageJson.manager) {
        return
      }

      // @ts-ignore
      if (messageJson.manager !== "state") {
        return
      }

      const validationResult = this.stateSchema.validate(messageJson)
      if (validationResult.error) {
        console.log(validationResult.error, "Aborting!")
        return
      }

      if (validationResult.value.manager !== "state") {
        return
      }

      const value: StateSchema = <StateSchema>validationResult.value.data
      switch (value.type) {
        case "set-state":
          this.setState(value.stateId, value.state!)
          break

        case "get-state":
          const state: JSON = this.getState(value.stateId)
          MessageManager.getInstance().sendMessage(JSON.stringify(state), [payload.ws])
          break
      }
    })
  }

  public setState(stateId: string, newState: JSON): boolean {
    if (!this.states.has(stateId)) {
      return false
    }

    const state = <State>this.states.get(stateId)
    if (!state.setState(newState)) {
      return false
    }

    const notUndefined = function <T>(x: T | undefined): x is T {
      return x !== undefined;
    }

    const sockets = state.clients
        .map(client => WebSocketManager.getInstance().websockets.get(client.wsId))
        .filter(notUndefined)

    MessageManager.getInstance().sendMessage(JSON.stringify(state.getState(true)), sockets)
    return true
  }

  public getState(stateId: string): JSON {
    return this.states.get(stateId)?.getState() ?? JSON.parse(`{"error": "no such state"}`)
  }

  public has(stateId: string): boolean {
    return this.states.has(stateId)
  }

  public createState(stateId: string, schema: any, initialState: any): boolean {
    try {
      const state = new State(stateId, schema, initialState)
      this.states.set(stateId, state)
    }
    catch (e) {
      console.log("State creation error:", e)
      return false
    }
    return true
  }

  public deleteState(stateId: string) {
    return this.states.delete(stateId)
  }

  public subscribe(client: Client) {
    this.states.get(client.stateId)?.subscribe(client)
    const state = this.states.get(client.stateId)?.getState(false)
    if (state !== undefined && state !== null) {
      this.setState(client.stateId, state!)
    }
  }

  public unsubscribe(client: Client) {
    this.states.get(client.stateId)?.unsubscribe(client)
    const state = this.states.get(client.stateId)?.getState(false)
    if (state !== undefined && state !== null) {
      this.setState(client.stateId, state!)
    }
  }
}