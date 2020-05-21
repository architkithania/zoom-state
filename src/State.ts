import Client from "./Client";
import Ajv from "ajv"

export default class State {
  public clients: Client[] = []
  private readonly schemaValidator: Ajv.ValidateFunction

  constructor(public id: string, private schema: any, private state: any) {
    const ajv = new Ajv({allErrors: true})

    this.schemaValidator = ajv.compile(schema)
    if (!this.schemaValidator(state)) {
      throw Error("initial state does not adhere to schema.")
    }
  }

  public getState(withClients=false): any {
    if (!withClients) {
      return this.state
    }
    return {
      clients: this.clients.map(client => client.id),
      state: this.state
    }
  }

  public setState(state: any): boolean {
    if (!this.schemaValidator(state)) {
      return false
    }

    for (let [ key, value ] of Object.entries(state)) {
      this.state[key] = value
    }

    // this.state = state
    return true
  }

  public subscribe(client: Client) {
    this.clients.push(client)
  }

  public unsubscribe(client: Client) {
    this.clients.splice(this.clients.findIndex(cl => cl === client), 1)
  }
}
