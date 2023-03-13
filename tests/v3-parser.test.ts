import { open } from "node:fs/promises";
import { describe, expect, test } from "@jest/globals";
import { DataGroupMessage3 } from "../src";
import { FreigabeStatus, RegelTyp, RelationType } from "../src/v3/schema";
import { SchemaElementArt } from "../src/v2/";

describe("Loading a schema from xml", () => {
  test("Should correctly load the schema", async () => {
    const message = await loadMessage("simple.xml");

    expect(message.id).toEqual("65FD4FCC3C8D77FC");
    expect(message.createdAt).toEqual(new Date("2021-04-14T12:49:54.848Z"));

    expect(message.rootDataGroup).toEqual("G60000000088:1.2.0");
    expect(message.dataGroups.entries()).toEqual({
      "G60000000088:1.2.0": {
        identifier: "G60000000088:1.2.0",
        id: "G60000000088",
        version: "1.2.0",
        name: "Anschrift Inland",
        description: "Eine Beschreibung",
        definition: "Eine Definition",
        releaseState: FreigabeStatus.FachlichFreigegebenGold,
        stateSetAt: new Date("2021-03-05"),
        stateSetBy: "FIM Baustein Datenfelder",
        versionHint: "Hausnummerzusatz aufgenommen",
        validSince: new Date("2021-03-01"),
        validUntil: new Date("2021-03-02"),
        publishedAt: new Date("2021-03-03"),
        lastChangedAt: new Date("2021-03-31T11:51:29Z"),
        elementType: SchemaElementArt.Harmonisiert,
        inputLabel: "Anschrift in Deutschland",
        outputLabel: "Anschrift in Deutschland",
        inputHelp: "Eingabehilfe",
        outputHelp: "Ausgabehilfe",
        normReferences: [
          {
            value: "Rechtsbezug",
            link: undefined,
          },
        ],
        keywords: [
          {
            value: "Ein Stichwort",
            uri: "some reference",
          },
        ],
        rules: ["R60000000019:1.2.0"],
        children: [
          {
            type: "dataGroup",
            normReferences: [{ value: "Rechtsbezug", link: undefined }],
            cardinality: "0:1",
            identifier: "G60000000086:1.2.0",
          },
        ],
        relations: [
          {
            type: RelationType.Ersetzt,
            identifier: "G60000000088:1.1.0",
          },
        ],
      },
      "G60000000086:1.2.0": {
        identifier: "G60000000086:1.2.0",
        id: "G60000000086",
        version: "1.2.0",
        name: "Anschrift Inland Straßenanschrift",
        description: undefined,
        definition: undefined,
        releaseState: "6",
        stateSetAt: new Date("2021-03-31"),
        stateSetBy: "FIM-Baustein Datenfelder",
        validSince: undefined,
        validUntil: undefined,
        versionHint: "Hausnummerzusatz aufgenommen",
        publishedAt: new Date("2021-03-31"),
        lastChangedAt: new Date("2021-01-01T01:00:00Z"),
        inputLabel: "Straßenanschrift",
        outputLabel: "Straßenanschrift",
        elementType: SchemaElementArt.Harmonisiert,
        inputHelp:
          "Geben Sie die Anschrift mit Straße, Hausnummer, Postleitzahl und Ort an. Eine Angabe eines Postfachs ist nicht möglich.",
        outputHelp: undefined,
        normReferences: [],
        keywords: [],
        rules: [],
        relations: [],
        children: [
          {
            type: "dataField",
            identifier: "F60000000243:1.1.0",
            normReferences: [],
            cardinality: "1:1",
          },
        ],
      },
    });
    expect(message.dataFields.entries()).toEqual({
      "F60000000243:1.1.0": {
        identifier: "F60000000243:1.1.0",
        id: "F60000000243",
        version: "1.1.0",
        name: "Straße",
        description:
          "Kompatibilität zu EPA in TR XhD v 1.4 sollte Feldlänge min. 50. Bei XInneres 8 ist die Feldlänge <= 55 Zeichen.",
        definition: undefined,
        releaseState: FreigabeStatus.FachlichFreigegebenGold,
        stateSetAt: new Date("2020-11-02"),
        stateSetBy: "FIM-Baustein Datenfelder",
        validSince: undefined,
        validUntil: undefined,
        versionHint: undefined,
        publishedAt: new Date("2020-11-02"),
        lastChangedAt: new Date("2021-01-01T01:00:00Z"),
        inputLabel: "Straße",
        outputLabel: "Straße",
        elementType: SchemaElementArt.Harmonisiert,
        inputHelp: "Geben Sie an, wie die Straße heißt.",
        outputHelp: undefined,
        codeKey: undefined,
        nameKey: undefined,
        helpKey: undefined,
        constraints: {
          minLength: 1,
          maxLength: 55,
        },
        relations: [],
        keywords: [],
        normReferences: [
          {
            link: undefined,
            value: "XInneres.Meldeanschrift.strasse Version 8",
          },
        ],
        inputType: "input",
        dataType: "text",
        fillType: "keine",
        mediaTypes: [],
        rules: ["R60000000019:1.2.0"],
        values: [],
      },
    });
    expect(message.rules.entries()).toEqual({
      "R60000000019:1.2.0": {
        identifier: "R60000000019:1.2.0",
        id: "R60000000019",
        version: "1.2.0",
        name: "Anschrift Inland Straßenanschrift / Anschrift Inland Postfachanschrift",
        description: "Eine Regelbeschreibung",
        freeFormDefinition:
          'Es muss entweder Feldgruppe G60000086 "Anschrift Inland Straßenanschrift" oder Feldgruppe G60000087 "Anschrift Inland Postfachanschrift" befüllt werden.',
        creator: "FIM Baustein Datenfelder",
        lastChangedAt: new Date("2021-03-29T10:00:00Z"),
        type: RegelTyp.Validierung,
        script: "some script content",
        normReferences: [
          {
            link: "some reference link",
            value: "Eine Bezugsquelle",
          },
        ],
        keywords: [
          {
            value: "Ein Stichwort",
            uri: "some reference",
          },
        ],
      },
    });
  });

  test("should correctly load all input attributes", async () => {
    const message = await loadMessage("input.xml");

    expect(message.dataFields.get("F60000000243:1.1.0")).toEqual(
      expect.objectContaining({
        inputType: "select",
        dataType: "text",
        fillType: "keine",
        codeKey: "CodeKey",
        nameKey: "NameKey",
        helpKey: "HelpKey",
        constraints: {
          minLength: 0,
          maxLength: 1,
          minValue: "0",
          maxValue: "1",
          pattern: "abc",
          value: "Constraints",
        },
        content: "Some Content",
        maxSize: 10,
        mediaTypes: ["application/json"],
        values: [],
      })
    );
  });

  test("should fail for empty id node", async () => {
    await expect(loadMessage("empty-id-node.xml")).rejects.toThrow(
      "Missing content (node <xdf:id>, line 10, column 29)"
    );
  });

  test("should fail for missing id node", async () => {
    await expect(loadMessage("missing-id-node.xml")).rejects.toThrow(
      "Missing <id> (node <xdf:identifikation>, line 11, column 29)"
    );
  });

  test("should fail for duplicate id node", async () => {
    await expect(loadMessage("duplicate-id-node.xml")).rejects.toThrow(
      "Duplicate value (node <xdf:id>, line 11, column 33)"
    );
  });

  test("should fail for unexpected node", async () => {
    await expect(loadMessage("unexpected-node.xml")).rejects.toThrow(
      "Unexpected node (node <xdf:unknown>, line 11, column 25)"
    );
  });

  test("should fail for invalid release state", async () => {
    await expect(loadMessage("invalid-freigabestatus.xml")).rejects.toThrow(
      "Invalid FreigabeStatus: 10 (node <code>, line 18, column 27)"
    );
  });

  test("should fail for unknown namespace", async () => {
    await expect(loadMessage("unknown-namespace.xml")).rejects.toThrow(
      "Unknown namespace xdf: urn:xoev-de:fim:standard:xdatenfelder_unknown (node <xdf:xdatenfelder.datenfeldgruppe.0103>, line 3, column 144)"
    );
  });
});

async function loadMessage(name: string): Promise<DataGroupMessage3> {
  const file = await open(`./tests/v3-data/${name}`, "r");
  const data = await file.readFile({ encoding: "utf-8" });
  await file.close();

  return DataGroupMessage3.fromString(data);
}
