import { open } from "node:fs/promises";
import { describe, expect, test } from "@jest/globals";
import {
  AbleitungsmodifikationenRepraesentation,
  AbleitungsmodifikationenStruktur,
  SchemaElementArt,
} from "../src/v2/schema";
import { SchemaMessage } from "../src/v2/messages";

describe("Loading a schema from xml", () => {
  test("should parse a full example", async () => {
    const message = await loadMessage("simple.xml");

    expect(message.schemaContainer.schema).toEqual({
      identifier: "T1234:1.0",
      id: "T1234",
      version: "1.0",
      name: "Test",
      bezeichnungEingabe: "Test",
      bezeichnungAusgabe: undefined,
      beschreibung: "Eine Beschreibung",
      definition: "Eine Definition",
      bezug: "Bezug",
      status: "aktiv",
      gueltigAb: new Date("2020-11-04"),
      gueltigBis: new Date("2020-11-05"),
      fachlicherErsteller: "Test",
      versionshinweis: "Ein Versionshinweis",
      freigabedatum: new Date("2023-01-01"),
      veroeffentlichungsdatum: new Date("2023-01-02"),
      hilfetext: undefined,
      ableitungsmodifikationenStruktur:
        AbleitungsmodifikationenStruktur.NichtModifizierbar,
      ableitungsmodifikationenRepraesentation:
        AbleitungsmodifikationenRepraesentation.Modifizierbar,
      regeln: ["R60000037:1.2"],
      elemente: [
        {
          type: "dataGroup",
          identifier: "G00000082:1.3",
          anzahl: { type: "value", optional: false },
          bezug: undefined,
        },
      ],
    });

    expect(message.schemaContainer.datenfeldgruppen.entries()).toEqual({
      "G00000082:1.3": {
        identifier: "G00000082:1.3",
        id: "G00000082",
        version: "1.3",
        name: "Natürliche Person (abstrakt, umfassend)",
        bezeichnungEingabe: "Natürliche Person",
        bezeichnungAusgabe: "Natürliche Person",
        beschreibung: "Eine Beschreibung",
        definition: "Eine Definition",
        bezug: undefined,
        status: "aktiv",
        gueltigAb: new Date("2020-11-04"),
        gueltigBis: new Date("2020-11-05"),
        fachlicherErsteller: "FIM Baustein Datenfelder",
        versionshinweis: "Versionshinweis",
        freigabedatum: undefined,
        veroeffentlichungsdatum: undefined,
        schemaelementart: SchemaElementArt.Abstrakt,
        hilfetextEingabe: undefined,
        hilfetextAusgabe: undefined,
        regeln: [],
        elemente: [
          {
            type: "dataField",
            identifier: "F60000227:1.1",
            anzahl: { type: "value", optional: false },
            bezug: undefined,
          },
        ],
      },
    });

    expect(message.schemaContainer.datenfelder.entries()).toEqual({
      "F60000227:1.1": {
        identifier: "F60000227:1.1",
        id: "F60000227",
        version: "1.1",
        name: "Familienname",
        bezeichnungEingabe: "Familienname",
        bezeichnungAusgabe: "Familienname",
        beschreibung: "Eine Beschreibung",
        definition: "Eine Definition",
        bezug: "Ein Bezug",
        status: "aktiv",
        gueltigAb: new Date("2020-11-04"),
        gueltigBis: new Date("2020-11-05"),
        fachlicherErsteller: "FIM-Baustein Datenfelder",
        versionshinweis: undefined,
        freigabedatum: new Date("2020-11-02"),
        veroeffentlichungsdatum: new Date("2020-11-03"),
        schemaelementart: SchemaElementArt.Harmonisiert,
        hilfetextEingabe: "Hilfe Eingabe",
        hilfetextAusgabe: "Hilfe Ausgabe",
        feldart: "input",
        datentyp: "text",
        praezisierung: '{"minLength":"1","maxLength":"120"}',
        inhalt: undefined,
        codelisteReferenz: undefined,
        regeln: [],
      },
    });

    expect(message.schemaContainer.regeln.entries()).toEqual({
      "R60000037:1.2": {
        identifier: "R60000037:1.2",
        id: "R60000037",
        version: "1.2",
        name: "MindestEineAngabe",
        bezeichnungEingabe: "MindestEineAngabe",
        bezeichnungAusgabe: undefined,
        beschreibung: undefined,
        definition: "Eine Definition",
        bezug: undefined,
        status: "aktiv",
        gueltigAb: new Date("2020-11-04"),
        gueltigBis: new Date("2020-11-05"),
        fachlicherErsteller: "Bundesredaktion",
        versionshinweis: undefined,
        freigabedatum: new Date("2023-01-01"),
        veroeffentlichungsdatum: new Date("2023-01-02"),
        script: "function script() {}",
      },
    });
  });

  test("should parse a minimal example", async () => {
    const message = await loadMessage("minimal.xml");

    expect(message.schemaContainer.schema).toEqual({
      identifier: "T1234:1.0",
      id: "T1234",
      version: "1.0",
      name: "Test",
      bezeichnungEingabe: "Test",
      bezeichnungAusgabe: undefined,
      beschreibung: undefined,
      definition: undefined,
      bezug: undefined,
      status: "aktiv",
      gueltigAb: undefined,
      gueltigBis: undefined,
      fachlicherErsteller: undefined,
      versionshinweis: undefined,
      freigabedatum: undefined,
      veroeffentlichungsdatum: undefined,
      hilfetext: undefined,
      ableitungsmodifikationenStruktur:
        AbleitungsmodifikationenStruktur.NichtModifizierbar,
      ableitungsmodifikationenRepraesentation:
        AbleitungsmodifikationenRepraesentation.Modifizierbar,
      regeln: [],
      elemente: [],
    });
  });

  test("should parse select fields", async () => {
    const message = await loadMessage("select.xml");

    expect(message.schemaContainer.datenfelder.get("F123:1.0")).toEqual(
      expect.objectContaining({
        feldart: "select",
        datentyp: "text",
        praezisierung: undefined,
        inhalt: undefined,
        codelisteReferenz: {
          id: "C123",
          version: undefined,
          genericode: {
            version: "1",
            canonicalIdentification: "urn:de:example",
            canonicalVersionUri: "urn:de:example_1",
          },
        },
      })
    );
  });

  test("should parse label fields", async () => {
    const message = await loadMessage("label.xml");

    expect(message.schemaContainer.datenfelder.get("F123:1.0")).toEqual(
      expect.objectContaining({
        feldart: "label",
        datentyp: "text",
        praezisierung: undefined,
        inhalt: "Hinweis Inhalt",
        codelisteReferenz: undefined,
      })
    );
  });

  test("should parse schema rules", async () => {
    const message = await loadMessage("rule.xml");

    expect(message.schemaContainer.schema.regeln).toEqual(["R60000037:1.2"]);
    expect(message.schemaContainer.regeln.has("R60000037:1.2")).toBeTruthy();
  });

  test("should parse data field rules", async () => {
    const message = await loadMessage("data-field-rule.xml");

    expect(message.schemaContainer.datenfelder.get("F123:1.0").regeln).toEqual([
      "R60000037:1.2",
    ]);
    expect(message.schemaContainer.regeln.has("R60000037:1.2")).toBeTruthy();
  });

  test("should parse data group rules", async () => {
    const message = await loadMessage("data-group-rule.xml");

    expect(
      message.schemaContainer.datenfeldgruppen.get("G00000082:1.3").regeln
    ).toEqual(["R60000037:1.2"]);
    expect(message.schemaContainer.regeln.has("R60000037:1.2")).toBeTruthy();
  });

  test("should fail for duplicate required value", async () => {
    await expect(loadMessage("duplicate-required-value.xml")).rejects.toThrow(
      "Duplicate value (node <xdf:name>, line 13, column 33)"
    );
  });

  test("should fail for duplicate optional value", async () => {
    await expect(loadMessage("duplicate-optional-value.xml")).rejects.toThrow(
      "Duplicate value (node <xdf:beschreibung>, line 15, column 45)"
    );
  });

  test.todo("should use name if label is undefined");
});

async function loadMessage(name: string): Promise<SchemaMessage> {
  const file = await open(`./tests/v2-data/${name}`, "r");
  const data = await file.readFile({ encoding: "utf-8" });
  await file.close();

  return SchemaMessage.fromString(data).message;
}
