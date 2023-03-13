import { open, readdir } from "node:fs/promises";
import { ParserError } from "./src/errors";
import {
  SchemaMessage,
  Datenfeld,
  Datenfeldgruppe,
  Regel,
  Stammdatenschema,
} from "./src/v2";
import { Table } from "./src/table";

async function main() {
  const files = await readdir("./test-data");

  const schemas = new Table<Stammdatenschema>();
  const groups = new Table<Datenfeldgruppe>();
  const fields = new Table<Datenfeld>();
  const rules = new Table<Regel>();

  for (const filename of files) {
    if (!filename.startsWith("S")) {
      continue;
    }

    const file = await open(`./test-data/${filename}`, "r");

    try {
      const data = await file.readFile({ encoding: "utf-8" });
      const result = SchemaMessage.fromString(data);

      schemas.insert(result.message.schemaContainer.schema);
      groups.import(result.message.schemaContainer.datenfeldgruppen);
      fields.import(result.message.schemaContainer.datenfelder);
      rules.import(result.message.schemaContainer.regeln);
    } catch (error: unknown) {
      if (error instanceof ParserError) {
        console.error(filename, error.message);
      } else {
        console.error(filename);
        throw error;
      }
    } finally {
      await file.close();
    }
  }

  console.log("Schemas:", schemas.count());
  console.log("Gruppen:", groups.count());
  console.log("Felder:", fields.count());
  console.log("Regeln:", rules.count());

  const database = {
    schemas: schemas.entries(),
    groups: groups.entries(),
    fields: fields.entries(),
    rules: rules.entries(),
  };

  const file = await open("./database.json", "w");
  await file.write(JSON.stringify(database));
  file.close();
}

main();
