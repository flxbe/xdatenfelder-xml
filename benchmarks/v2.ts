import { open } from "node:fs/promises";
import { SchemaMessage } from "../src/v2";

const RUNS = 10;

async function benchmark() {
  const data = await loadData();

  const start = performance.now();
  for (let i = 0; i < RUNS; i++) {
    SchemaMessage.fromString(data);
  }
  const end = performance.now();

  const diff = end - start;
  const perRun = diff / RUNS;
  console.log(`Per Run: ${perRun} ms`);
}

async function loadData(): Promise<string> {
  const file = await open("./benchmarks/bob.xml", "r");
  const data = await file.readFile({ encoding: "utf-8" });
  await file.close();

  return data;
}

benchmark();
