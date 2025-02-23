type SelectionConstructor<T = unknown> = {
  new (...args: unknown[]): T;
  type: string;
};

export type BaseSelectionOptions = {
  blockId: string;
  path: string[];
};

export abstract class BaseSelection {
  static readonly type: string;
  readonly blockId: string;
  readonly path: string[];
  constructor({ blockId, path }: BaseSelectionOptions) {
    this.blockId = blockId;
    this.path = path;
  }

  is<T extends BlockSuiteSelectionType>(
    type: T
  ): this is BlockSuiteSelectionInstance[T] {
    return this.type === type;
  }

  get type(): BlockSuiteSelectionType {
    return (this.constructor as SelectionConstructor)
      .type as BlockSuiteSelectionType;
  }

  abstract equals(other: BaseSelection): boolean;

  abstract toJSON(): Record<string, unknown>;

  static fromJSON(_: Record<string, unknown>): BaseSelection {
    throw new Error('You must override this method');
  }
}
