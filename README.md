# xdatenfelder-xml

[![CI](https://github.com/flxbe/xdatenfelder-xml/actions/workflows/test.yml/badge.svg)](https://github.com/flxbe/xdatenfelder-xml/actions/workflows/test.yml)
[![npm](https://img.shields.io/npm/v/xdatenfelder-xml)](https://www.npmjs.com/package/xdatenfelder-xml)

A parser for XDatenfelder v2.0 and v3.0.0.

## Getting Started

```sh
npm install xdatenfelder-xml
```

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
