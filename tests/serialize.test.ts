import { describe, expect, test } from "@jest/globals";
import { serializeSchema } from "../src/v3/serialize";
import { SchemaMessage3 } from "../src/v3/parser";
import { FreigabeStatus, SchemaContainer } from "../src/v3/schema";
import { Table } from "../src/table";

describe("Serializing a schema", () => {
  test("should return the correct xml string", async () => {
    const container = await loadSchema();

    const xml = serializeSchema(container);
    const message = SchemaMessage3.fromString(xml);

    expect(message.container.schema).toEqual(container.schema);
    expect(message.container.dataGroups.entries()).toEqual(
      container.dataGroups.entries()
    );
    expect(message.container.dataFields.entries()).toEqual(
      container.dataFields.entries()
    );
    expect(message.container.rules.entries()).toEqual(
      container.rules.entries()
    );
  });
});

async function loadSchema(): Promise<SchemaContainer> {
  return {
    schema: {
      identifier: "S1:1.2.0",
      id: "S1",
      version: "1.2.0",
      name: "Some Schema",
      label: "Some Label",
      releaseState: FreigabeStatus.FachlichFreigegebenGold,
      lastChangedAt: new Date(0),
      rules: [],
      children: [],
      relations: [],
      keywords: [],
      normReferences: [],
    },
    dataGroups: new Table(),
    dataFields: new Table(),
    rules: new Table(),
  };
}
