import { SchemaContainer, SchemaWarnings } from "./schema";
import { SchemaMessageParser } from "./parser";

export class SchemaMessage {
  public readonly messageId: string;
  public readonly createdAt: Date;
  public readonly schemaContainer: SchemaContainer;

  constructor(
    messageId: string,
    createdAt: Date,
    schemaContainer: SchemaContainer
  ) {
    this.messageId = messageId;
    this.createdAt = createdAt;
    this.schemaContainer = schemaContainer;
  }

  public static fromString(value: string): {
    message: SchemaMessage;
    warnings: SchemaWarnings;
  } {
    const parser = new SchemaMessageParser();
    parser.write(value);
    const { messageId, createdAt, schemaContainer, warnings } = parser.finish();

    const message = new SchemaMessage(messageId, createdAt, schemaContainer);

    return { message, warnings };
  }
}
