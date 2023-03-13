import {
  ValidationError,
  DuplicateTagError,
  MissingValueError,
} from "./errors";

export function assert(condition: any, msg?: string): asserts condition {
  if (!condition) {
    throw new Error(msg);
  }
}

export function parseDate(value: string): Date {
  try {
    return new Date(value);
  } catch (error: unknown) {
    throw new ValidationError(`Invalid date: ${value}`);
  }
}

/**
 * Container holding a parsed value.
 *
 * Can only be set once, throws an error on the second call to `set`.
 */
export class Value<T> {
  private value?: T = undefined;
  private filled = false;

  public set(value: T | undefined) {
    if (this.filled) {
      throw new DuplicateTagError();
    }

    this.filled = true;
    this.value = value;
  }

  public isEmpty(): boolean {
    return this.value === undefined;
  }

  public get(): T | undefined {
    return this.value;
  }

  public expect(errorMessage: string): T {
    if (this.value === undefined) {
      throw new MissingValueError(errorMessage);
    }

    assert(this.filled);

    return this.value;
  }
}
