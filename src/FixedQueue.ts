export class FixedQueue<T> {
  private items: T[] = [];
  private readonly capacity: number;

  constructor(capacity: number) {
    if (capacity <= 0) {
      throw new Error("Capacity must be greater than 0");
    }
    this.capacity = capacity;
  }

  enqueue(item: T): void {
    if (this.items.length >= this.capacity) {
      this.items.shift();
    }
    this.items.push(item);
  }

  dequeue(): T | undefined {
    return this.items.shift();
  }

  peek(): T | undefined {
    return this.items[0];
  }

  size(): number {
    return this.items.length;
  }

  isEmpty(): boolean {
    return this.items.length === 0;
  }

  toArray(): T[] {
    return [...this.items];
  }

  contains(compareFn: (item: T) => boolean): boolean {
    return this.items.some(compareFn);
  }
}
