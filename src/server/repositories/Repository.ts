export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export abstract class Repository<T extends { id: string }> {
  protected abstract getCollection(): T[];
  protected abstract persist(): void;

  public findAll(): T[] {
    return this.getCollection();
  }

  public findById(id: string): T | undefined {
    return this.getCollection().find(item => item.id === id);
  }

  public findPaginated(
    page: number, 
    pageSize: number, 
    filterFn?: (item: T) => boolean,
    sortFn?: (a: T, b: T) => number
  ): PaginatedResult<T> {
    let result = this.getCollection();
    
    if (filterFn) {
      result = result.filter(filterFn);
    }
    
    if (sortFn) {
      result = result.sort(sortFn);
    }

    const total = result.length;
    const start = (page - 1) * pageSize;
    const paginatedData = result.slice(start, start + pageSize);

    return {
      data: paginatedData,
      total,
      page,
      pageSize
    };
  }

  public save(item: T): T {
    const collection = this.getCollection();
    const idx = collection.findIndex(i => i.id === item.id);
    if (idx >= 0) {
      collection[idx] = item;
    } else {
      collection.push(item);
    }
    this.persist();
    return item;
  }

  public delete(id: string): boolean {
    const collection = this.getCollection();
    const idx = collection.findIndex(i => i.id === id);
    if (idx >= 0) {
      collection.splice(idx, 1);
      this.persist();
      return true;
    }
    return false;
  }
}
