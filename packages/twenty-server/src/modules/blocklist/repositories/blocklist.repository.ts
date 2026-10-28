export class BlocklistRepository {
  private items: Record<string, any>[] = [];

  async create(
    query: Record<string, any>
  ): Promise<Record<string, any>> {
    return { ...query };
  }

  async save(entity: Record<string, any>): Promise<Record<string, any>> {
    if (!this.items.includes(entity)) {
      this.items.push(entity);
    }
    return entity;
  }

  private matches(entity: Record<string, any>, where: Record<string, any>) {
    return Object.entries(where).every(
      ([key, value]) =>
        entity[key] === value ||
        (value && typeof value === 'object' &&
          entity[key] === undefined &&
          false) ||
        (value !== null &&
          typeof value === 'object' &&
          JSON.stringify(entity[key]) === JSON.stringify(value))
    );
  }

  async find(
    query: { where?: Record<string, any> } = {}
  ): Promise<Record<string, any>[]> {
    const where = query.where ?? {};
    return this.items.filter((item) => this.matches(item, where));
  }

  async findOne(
    query: { where?: Record<string, any> } = {}
  ): Promise<Record<string, any> | null> {
    return (await this.find(query))[0] ?? null;
  }

  async update(
    id: string,
    changeset: Record<string, any>
  ): Promise<Record<string, any> | null> {
    const entity = this.items.find((item) => item.id === id);
    if (!entity) {
      return null;
    }
    Object.assign(entity, changeset);
    return entity;
  }

  async delete(
    query: { where?: Record<string, any> } = {}
  ): Promise<{ affected: number }> {
    const before = this.items.length;
    this.items = this.items.filter((item) => !this.matches(item, query.where ?? {}));
    return { affected: before - this.items.length };
  }
}
