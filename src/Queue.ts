export default class Queue<T> {
  private elements: Array<T> = []

  public length(): number {
    return this.elements.length
  }

  public enqueue(element: T) {
    this.elements.push(element)
  }

  public dequeue(): T | undefined {
    return this.elements.shift()
  }
}
