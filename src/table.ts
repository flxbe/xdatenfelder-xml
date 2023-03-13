interface Diff {
  name: string;
  left?: string;
  right?: string;
}

interface TableItem {
  identifier: string;
}

export class Table<T extends TableItem> {
  private items: Record<string, T> = {};

  constructor() {}

  public import(other: Table<T>) {
    Object.values(other.items).forEach((item) => this.insert(item));
  }

  public insert(item: T) {
    const savedItem = this.items[item.identifier];

    if (savedItem) {
      //const diff = this.getDiff(savedItem, item);
      //assert(diff.length === 0);
    } else {
      this.items[item.identifier] = item;
    }
  }

  public has(identifier: string): boolean {
    return identifier in this.items;
  }

  public count(): number {
    return Object.keys(this.items).length;
  }

  public get(identifier: string): T {
    const item = this.items[identifier];

    if (item === undefined) {
      throw new Error(`Unknown identifier: ${identifier}`);
    }

    return item;
  }

  public entries(): Record<string, T> {
    return this.items;
  }
}
