import MessageManager, {Payload} from "./message-emitter";
import Joi from "@hapi/joi"
import Client from "./Client"
import StateManager from "./state-manager";

interface ClientSchema {
  type: string,
  clientId: string,
  stateId: string
}

export default class ClientManager {
  private static instance: ClientManager
  private schema: Joi.Schema

  private clients = new Map<string, Client>()

  private constructor() {
    this.schema = Joi.object({
      manager: Joi.string().alphanum().required(),
      data: Joi.object({
        type: Joi.string().valid('subscribe', 'unsubscribe').required(),
        clientId: Joi.string(),
        stateId: Joi.string()
      })
    })

    this.handleMessages()
  }

  public static getInstance() {
    if (!ClientManager.instance) {
      ClientManager.instance = new ClientManager()
    }
    return ClientManager.instance
  }

  private handleMessages() {
    MessageManager.getInstance().subscribeToReceivedMessages(async (payload: Payload) => {
      let messageJson: any;
      try {
        messageJson = await JSON.parse(payload.message);
      } catch (e) {
        console.log("Message not JSON parsable. Aborting handle")
        return
      }

      if (!messageJson.manager) {
        return
      }

      // @ts-ignore
      if (messageJson.manager !== "client") {
        return
      }

      const validationResult = this.schema.validate(messageJson)
      if (validationResult.error) {
        console.log(validationResult.error, "Aborting!")
        return
      }

      if (validationResult.value.manager !== "client") {
        return
      }

      const value: ClientSchema = <ClientSchema>validationResult.value.data
      const client = new Client(value.clientId, value.stateId, payload.ws.uuid!)

      switch (value.type) {
        case "subscribe":
          if (!payload.ws.uuid) {
            console.log("No id on websocket. Aborting creation")
            return
          }

          StateManager.getInstance().subscribe(client)
          break

        case "unsubscribe":
          StateManager.getInstance().unsubscribe(client)
          break
      }
    })
  }
}
