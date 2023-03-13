import sax from "sax";

export class ParserError extends Error {
  constructor(message: string, tag: string, line: number, column: number) {
    super(`${message} (node <${tag}>, line ${line}, column ${column})`);
    this.name = "ParserError";
  }

  public static fromInternalError(
    error: InternalParserError,
    parser: sax.SAXParser
  ): ParserError {
    // The parser starts counting the lines at 0
    const actualLine = parser.line + 1;

    return new ParserError(
      error.message,
      parser.tag.name,
      actualLine,
      parser.column
    );
  }
}

export class InternalParserError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InternalParserError";
  }
}

export class UnknownNamespaceError extends InternalParserError {
  constructor(prefix: string, uri: string) {
    super(`Unknown namespace ${prefix}: ${uri}`);
    this.name = "UnknownNamespaceError";
  }
}

export class ValidationError extends InternalParserError {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export class UnexpectedTagError extends InternalParserError {
  constructor() {
    super(`Unexpected node`);
    this.name = "UnexpectedTagError";
  }
}

export class MissingChildNodeError extends InternalParserError {
  constructor(name: string) {
    super(`Missing child node <${name}>`);
    this.name = "MissingChildNodeError";
  }
}

export class MissingValueError extends InternalParserError {
  constructor(message: string) {
    super(message);
    this.name = "MissingValueError";
  }
}

export class MissingContentError extends InternalParserError {
  constructor() {
    super("Missing content");
    this.name = "MissingContentError";
  }
}

export class DuplicateTagError extends InternalParserError {
  constructor() {
    super("Duplicate value");
    this.name = "DuplicateTagError";
  }
}
