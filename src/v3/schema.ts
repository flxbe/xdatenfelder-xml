import { ValidationError } from "../errors";
import { SchemaElementArt } from "../v2/schema";
import { Table } from "../table";

export const NS_XD3 = "urn:xoev-de:fim:standard:xdatenfelder_3.0.0";

export type Vorbefuellung = "keine" | "optional" | "verpflichtend";

export function parseVorbefuellung(value: string): Vorbefuellung {
  switch (value) {
    case "keine":
    case "optional":
    case "verpflichtend":
      return value;
    default:
      throw new ValidationError(
        `Invalid value in <xdf:vorbefuellung>: ${value}`
      );
  }
}

export type Datentyp =
  | "text"
  | "text_latin"
  | "date"
  | "time"
  | "datetime"
  | "bool"
  | "num"
  | "num_int"
  | "num_currency"
  | "file"
  | "obj";

export function parseDatentyp(value: string): Datentyp {
  switch (value) {
    case "text":
    case "text_latin":
    case "date":
    case "time":
    case "datetime":
    case "bool":
    case "num":
    case "num_int":
    case "num_currency":
    case "file":
    case "obj":
      return value;
    default:
      throw new ValidationError(`Invalid value for Datentyp: ${value}`);
  }
}

export type Feldart = "input" | "select" | "label" | "hidden" | "locked";

export function parseFeldart(value: string): Feldart {
  switch (value) {
    case "input":
    case "select":
    case "label":
    case "hidden":
    case "locked":
      return value;
    default:
      throw new ValidationError(`Invalid value for Feldart: ${value}`);
  }
}

/**
 * https://www.xrepository.de/details/urn:xoev-de:fim-datenfelder:codeliste:relation
 * Version 1.0
 */
export const enum RelationType {
  Abgeleitet = "ABL",
  Ersetzt = "ERS",
  Aequivalent = "EQU",
}

export function parseRelationType(value: string): RelationType {
  switch (value) {
    case "ABL":
      return RelationType.Abgeleitet;
    case "ERS":
      return RelationType.Ersetzt;
    case "EQU":
      return RelationType.Aequivalent;
    default:
      throw new ValidationError(`Invalid value for RelationType: ${value}`);
  }
}

export const enum RegelTyp {
  Komplex = "K",
  Multiplizitaet = "M",
  Validierung = "V",
  Berechnung = "B",
}

export function parseRegelTyp(value: string): RegelTyp {
  switch (value) {
    case "K":
      return RegelTyp.Komplex;
    case "M":
      return RegelTyp.Multiplizitaet;
    case "V":
      return RegelTyp.Validierung;
    case "B":
      return RegelTyp.Berechnung;
    default:
      throw new ValidationError(`Invalid value for RegelTyp: ${value}`);
  }
}

// See: https://www.xrepository.de/details/urn:xoev-de:xprozess:codeliste:status
// Version: 2022-07-12
export const enum FreigabeStatus {
  InPlanung = "1",
  InBearbeitung = "2",
  Entwurf = "3",
  MethodischFreigegeben = "4",
  FachlichFreigegebenSilber = "5",
  FachlichFreigegebenGold = "6",
  Inaktiv = "7",
  VorgesehenZumLoeschen = "8",
}

export function parseFreigabeStatus(value: string): FreigabeStatus {
  switch (value) {
    case "1":
      return FreigabeStatus.InPlanung;
    case "2":
      return FreigabeStatus.InBearbeitung;
    case "3":
      return FreigabeStatus.Entwurf;
    case "4":
      return FreigabeStatus.MethodischFreigegeben;
    case "5":
      return FreigabeStatus.FachlichFreigegebenSilber;
    case "6":
      return FreigabeStatus.FachlichFreigegebenGold;
    case "7":
      return FreigabeStatus.Inaktiv;
    case "8":
      return FreigabeStatus.VorgesehenZumLoeschen;
    default:
      throw new ValidationError(`Invalid FreigabeStatus: ${value}`);
  }
}

export interface NormReference {
  value: string;
  link?: string;
}

export interface Keyword {
  value: string;
  uri?: string;
}

export interface Relation {
  type: RelationType;
  identifier: string;
}

export interface BaseData {
  identifier: string;
  id: string;
  version: string;
  name: string;
  description?: string;
  definition?: string;
  releaseState: FreigabeStatus;
  stateSetAt?: Date;
  stateSetBy?: string;
  validSince?: Date;
  validUntil?: Date;
  versionHint?: string;
  publishedAt?: Date;
  lastChangedAt: Date;
  normReferences: NormReference[];
  relations: Relation[];
  keywords: Keyword[];
}

export interface ElementData extends BaseData {
  inputLabel: string;
  outputLabel?: string;
  elementType: SchemaElementArt;
  inputHelp?: string;
  outputHelp?: string;
}

export interface ChildRef {
  type: "dataGroup" | "dataField";
  identifier: string;
  cardinality: string;
  normReferences: NormReference[];
}

export interface DataGroup extends ElementData {
  rules: string[];
  children: ChildRef[];
}

export interface Constraints {
  minLength?: number;
  maxLength?: number;
  minValue?: string;
  maxValue?: string;
  pattern?: string;
  value?: string;
}

export interface SelectValue {
  code: string;
  name: string;
  help?: string;
}

export interface CodeListReference {
  canonicalIdentification?: string;
  version?: string;
  canonicalVersionUri?: string;
}

export interface DataField extends ElementData {
  inputType: Feldart;
  dataType: Datentyp;
  fillType: Vorbefuellung;
  rules: string[];
  constraints: Constraints;
  content?: string;
  codeKey?: string;
  nameKey?: string;
  helpKey?: string;
  inputSize?: number;
  mediaTypes: string[];
  values: SelectValue[];
  codeListReference?: CodeListReference;
}

export interface Rule {
  identifier: string;
  id: string;
  version: string;
  name: string;
  description?: string;
  freeFormDefinition?: string;
  normReferences: NormReference[];
  keywords: Keyword[];
  creator?: string;
  lastChangedAt: Date;
  type: RegelTyp;
  // params
  // targets
  script?: string;
  // errors
}

export interface Schema extends BaseData {
  label: string;
  help?: string;
  // ableitungsmodifikationStruktur
  // ableitungsmodifikationRepraesentation
  // Dokumentsteckbrief
  rules: Rule[];
  children: ChildRef[];
}

export interface SchemaContainer {
  schema: Schema;

  dataGroups: Table<DataGroup>;
  dataFields: Table<DataField>;
  rules: Table<Rule>;
}
