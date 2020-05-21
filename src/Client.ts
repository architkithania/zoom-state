export default class Client {
  public wsId: string
  constructor(public id: string, public stateId: string, wsId?: string ) {
    this.wsId = wsId ?? ""
  }
}
