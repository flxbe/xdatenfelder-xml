# xdatenfelder-xml

## Getting Started

```ts
import { SchemaMessage } from "xdatenfelder-xml/src/v2";

const { message, warnings } = SchemaMessage.fromString("...");

console.log(message.messageId);
console.log(message.createdAt);

console.log(message.schemaContainer.schema.identifier);
console.log(message.schemaContainer.datenfeldgruppen.count());
console.log(message.schemaContainer.datenfelder.count());
console.log(message.schemaContainer.regeln.count());
```
