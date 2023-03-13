import sax from "sax";
import { assert, parseDate, Value } from "../util";
import {
  ParserError,
  UnexpectedTagError,
  UnknownNamespaceError,
  MissingContentError,
  MissingValueError,
  InternalParserError,
} from "../errors";
import {
  Datenfeld,
  Datenfeldgruppe,
  ElementReference,
  SchemaContainer,
  Stammdatenschema,
  Feldart,
  Datentyp,
  Regel,
  SchemaElementArt,
  BaseData,
  ElementData,
  ElementStatus,
  parseElementStatus,
  parseSchemaElementArt,
  CodelisteReferenz,
  AbleitungsmodifikationenRepraesentation,
  AbleitungsmodifikationenStruktur,
  parseDatentyp,
  parseFeldart,
  parseAbleitungsmodifikationenRepraesentation,
  parseAbleitungsmodifikationenStruktur,
  GenericodeIdentification,
  Anzahl,
  parseAnzahl,
  SchemaWarnings,
  Warning,
} from "./schema";
import { Table } from "../table";

export interface ParseResult {
  messageId: string;
  createdAt: Date;
  schemaContainer: SchemaContainer;
  warnings: SchemaWarnings;
}

interface Context {
  datenfeldgruppen: Table<Datenfeldgruppe>;
  datenfelder: Table<Datenfeld>;
  regeln: Table<Regel>;
}

const enum StateType {
  // NoOp,
  Value,
  OptionalValue,
  String,
  OptionalString,
  Code,
  Root,
  Message,
  Header,
  Schema,
  Identification,
  Struct,
  Contains,
  DataGroup,
  DataField,
  Rule,
  CodeList,
  Genericode,
}

//interface NoOpState {
//type: StateType.NoOp;
//parent: State<unknown>;
//}

//function createNoOpState(parent: State<unknown>): NoOpState {
//return { type: StateType.NoOp, parent };
//}

interface ValueNodeState<T> {
  type: StateType.Value;
  parent: State<unknown>;
  value: Value<T>;
  parse: (raw: string) => T;
}

function createValueNodeState<T>(
  parent: State<unknown>,
  value: Value<T>,
  parse: (raw: string) => T
): ValueNodeState<T> {
  return {
    type: StateType.Value,
    parent,
    value,
    parse,
  };
}

interface OptionalValueNodeState<T> {
  type: StateType.OptionalValue;
  parent: State<unknown>;
  value: Value<T>;
  parse: (raw: string) => T;
}

function createOptionalValueNodeState<T>(
  parent: State<unknown>,
  value: Value<T>,
  parse: (raw: string) => T
): OptionalValueNodeState<T> {
  return {
    type: StateType.OptionalValue,
    parent,
    value,
    parse,
  };
}

interface CodeNodeState<T> {
  type: StateType.Code;
  parent: State<unknown>;
  value: Value<T>;
  parse: (raw: string) => T;
}

function createCodeNodeState<T>(
  parent: State<unknown>,
  value: Value<T>,
  parse: (raw: string) => T
): CodeNodeState<T> {
  return {
    type: StateType.Code,
    parent,
    value,
    parse,
  };
}

interface StringNodeState {
  type: StateType.String;
  parent: State<unknown>;
  value: Value<string>;
}

function createStringNodeState(
  parent: State<unknown>,
  value: Value<string>
): StringNodeState {
  return {
    type: StateType.String,
    parent,
    value,
  };
}

interface OptionalStringNodeState {
  type: StateType.OptionalString;
  parent: State<unknown>;
  value: Value<string>;
}

function createOptionalStringNodeState(
  parent: State<unknown>,
  value: Value<string>
): OptionalStringNodeState {
  return {
    type: StateType.OptionalString,
    parent,
    value,
  };
}

interface RootState {
  type: StateType.Root;
  value: Value<[string, Date, Stammdatenschema]>;
}

function createRootState(): RootState {
  return {
    type: StateType.Root,
    value: new Value(),
  };
}

interface MessageState {
  type: StateType.Message;
  parent: RootState;
  header: Value<[string, Date]>;
  schema: Value<Stammdatenschema>;
}

function createMessageState(parent: RootState): MessageState {
  return {
    type: StateType.Message,
    parent,
    header: new Value(),
    schema: new Value(),
  };
}

interface HeaderState {
  type: StateType.Header;
  parent: MessageState;
  messageId: Value<string>;
  createdAt: Value<Date>;
}

function createHeaderState(parent: MessageState): HeaderState {
  return {
    type: StateType.Header,
    parent,
    messageId: new Value(),
    createdAt: new Value(),
  };
}

interface SchemaState {
  type: StateType.Schema;
  parent: MessageState;
  dataContainer: BaseContainer;
  hilfetext: Value<string>;
  ableitungsmodifikationenStruktur: Value<AbleitungsmodifikationenStruktur>;
  ableitungsmodifikationenRepraesentation: Value<AbleitungsmodifikationenRepraesentation>;
  regeln: string[];
  elemente: ElementReference[];
}

function createSchemaState(parent: MessageState): SchemaState {
  return {
    type: StateType.Schema,
    parent,
    dataContainer: createBaseContainer(),
    hilfetext: new Value(),
    ableitungsmodifikationenStruktur: new Value(),
    ableitungsmodifikationenRepraesentation: new Value(),
    regeln: [],
    elemente: [],
  };
}

interface IdentificationState {
  type: StateType.Identification;
  parent: State<unknown>;
  parentValue: Value<[string, string?]>;
  id: Value<string>;
  version: Value<string>;
}

function createIdentificationState(
  parent: State<unknown>,
  value: Value<[string, string?]>
): IdentificationState {
  return {
    type: StateType.Identification,
    parent,
    parentValue: value,
    id: new Value(),
    version: new Value(),
  };
}

type Element =
  | { type: "dataGroup"; dataGroup: Datenfeldgruppe }
  | { type: "dataField"; dataField: Datenfeld };

interface StructState {
  type: StateType.Struct;
  parent: SchemaState | DataGroupState;
  anzahl: Value<Anzahl>;
  bezug: Value<string>;
  element: Value<Element>;
}

function createStructState(parent: SchemaState | DataGroupState): StructState {
  return {
    type: StateType.Struct,
    parent,
    anzahl: new Value(),
    bezug: new Value(),
    element: new Value(),
  };
}

interface ContainsState {
  type: StateType.Contains;
  parent: StructState;
}

interface DataGroupState {
  type: StateType.DataGroup;
  parent: ContainsState;
  dataContainer: ElementContainer;
  elemente: ElementReference[];
  regeln: string[];
}

function createDataGroupState(parent: ContainsState): DataGroupState {
  return {
    type: StateType.DataGroup,
    parent,
    dataContainer: createElementContainer(),
    elemente: [],
    regeln: [],
  };
}

interface DataFieldState {
  type: StateType.DataField;
  parent: ContainsState;
  dataContainer: ElementContainer;
  feldart: Value<Feldart>;
  datentyp: Value<Datentyp>;
  praezisierung: Value<string>;
  inhalt: Value<string>;
  codelisteReferenz: Value<CodelisteReferenz>;
  regeln: string[];
}

function createDataFieldState(parent: ContainsState): DataFieldState {
  return {
    type: StateType.DataField,
    parent,
    dataContainer: createElementContainer(),
    feldart: new Value(),
    datentyp: new Value(),
    praezisierung: new Value(),
    inhalt: new Value(),
    codelisteReferenz: new Value(),
    regeln: [],
  };
}

interface RuleState {
  type: StateType.Rule;
  parent: State<unknown>;
  regeln: string[];
  dataContainer: BaseContainer;
  script: Value<string>;
}

function createRuleState(parent: State<unknown>, regeln: string[]): RuleState {
  return {
    type: StateType.Rule,
    parent,
    regeln,
    dataContainer: createBaseContainer(),
    script: new Value(),
  };
}

interface CodeListState {
  type: StateType.CodeList;
  parent: DataFieldState;
  identification: Value<[string, string?]>;
  genericode: Value<GenericodeIdentification>;
}

function createCodeListState(parent: DataFieldState): CodeListState {
  return {
    type: StateType.CodeList,
    parent,
    identification: new Value(),
    genericode: new Value(),
  };
}

interface GenericodeState {
  type: StateType.Genericode;
  parent: CodeListState;
  canonicalIdentification: Value<string>;
  version: Value<string>;
  canonicalVersionUri: Value<string>;
}

function createGenericodeState(parent: CodeListState): GenericodeState {
  return {
    type: StateType.Genericode,
    parent,
    canonicalIdentification: new Value(),
    version: new Value(),
    canonicalVersionUri: new Value(),
  };
}

type State<T> =
  | RootState
  | MessageState
  | HeaderState
  | SchemaState
  // | NoOpState
  | OptionalStringNodeState
  | StringNodeState
  | IdentificationState
  | StructState
  | ContainsState
  | DataGroupState
  | DataFieldState
  | RuleState
  | CodeListState
  | GenericodeState
  | ValueNodeState<T>
  | OptionalValueNodeState<T>
  | CodeNodeState<T>;

function handleText(state: State<unknown>, text: string) {
  switch (state.type) {
    case StateType.String:
    case StateType.OptionalString:
      state.value.set(text);
      break;

    case StateType.Value:
    case StateType.OptionalValue:
      state.value.set(state.parse(text));
      break;

    // case StateType.NoOp:
    // break;

    default:
      throw new InternalParserError(`Got unexpected text block: ${text}`);
  }
}

function handleOpenTag(
  state: State<unknown>,
  tag: sax.QualifiedTag
): State<unknown> {
  switch (state.type) {
    case StateType.Root: {
      switch (tag.local) {
        case "xdatenfelder.stammdatenschema.0102":
          return createMessageState(state);
        default:
          throw new UnexpectedTagError();
      }
    }

    case StateType.Message: {
      switch (tag.local) {
        case "header":
          return createHeaderState(state);
        case "stammdatenschema":
          return createSchemaState(state);
        default:
          throw new UnexpectedTagError();
      }
    }

    case StateType.Header: {
      switch (tag.local) {
        case "nachrichtID":
          return createStringNodeState(state, state.messageId);
        case "erstellungszeitpunkt":
          return createValueNodeState(state, state.createdAt, parseDate);
        default:
          throw new UnexpectedTagError();
      }
    }

    case StateType.Schema: {
      switch (tag.local) {
        case "hilfetext":
          return createOptionalStringNodeState(state, state.hilfetext);
        case "ableitungsmodifikationenStruktur":
          return createCodeNodeState(
            state,
            state.ableitungsmodifikationenStruktur,
            parseAbleitungsmodifikationenStruktur
          );
        case "ableitungsmodifikationenRepraesentation":
          return createCodeNodeState(
            state,
            state.ableitungsmodifikationenRepraesentation,
            parseAbleitungsmodifikationenRepraesentation
          );
        case "regel":
          return createRuleState(state, state.regeln);
        case "struktur":
          return createStructState(state);
        default:
          return handleBaseData(state, tag);
      }
    }

    case StateType.Struct: {
      switch (tag.local) {
        case "anzahl":
          return createValueNodeState(state, state.anzahl, parseAnzahl);
        case "bezug":
          return createOptionalStringNodeState(state, state.bezug);
        case "enthaelt":
          return { type: StateType.Contains, parent: state };
        default:
          throw new UnexpectedTagError();
      }
    }

    case StateType.Contains: {
      switch (tag.local) {
        case "datenfeld":
          return createDataFieldState(state);
        case "datenfeldgruppe":
          return createDataGroupState(state);
        default:
          throw new UnexpectedTagError();
      }
    }

    case StateType.DataGroup: {
      switch (tag.local) {
        case "struktur":
          return createStructState(state);
        case "regel":
          return createRuleState(state, state.regeln);
        default:
          return handleElementData(state, tag);
      }
    }

    case StateType.DataField: {
      switch (tag.local) {
        case "feldart":
          return createCodeNodeState(state, state.feldart, parseFeldart);
        case "datentyp":
          return createCodeNodeState(state, state.datentyp, parseDatentyp);
        case "praezisierung":
          return createOptionalStringNodeState(state, state.praezisierung);
        case "inhalt":
          return createOptionalStringNodeState(state, state.inhalt);
        case "codelisteReferenz":
          return createCodeListState(state);
        case "regel":
          return createRuleState(state, state.regeln);
        default:
          return handleElementData(state, tag);
      }
    }

    case StateType.Rule: {
      switch (tag.local) {
        case "script":
          return createOptionalStringNodeState(state, state.script);
        default:
          return handleBaseData(state, tag);
      }
    }

    case StateType.CodeList: {
      switch (tag.local) {
        case "identifikation":
          return createIdentificationState(state, state.identification);
        case "genericodeIdentification":
          return createGenericodeState(state);
        default:
          throw new UnexpectedTagError();
      }
    }

    case StateType.Identification: {
      switch (tag.local) {
        case "id":
          return createStringNodeState(state, state.id);
        case "version":
          return createOptionalStringNodeState(state, state.version);
        default:
          throw new UnexpectedTagError();
      }
    }

    case StateType.Genericode: {
      switch (tag.local) {
        case "canonicalIdentification":
          return createStringNodeState(state, state.canonicalIdentification);
        case "version":
          return createStringNodeState(state, state.version);
        case "canonicalVersionUri":
          return createStringNodeState(state, state.canonicalVersionUri);
        default:
          throw new UnexpectedTagError();
      }
    }

    case StateType.Code: {
      switch (tag.local) {
        case "code":
          return createValueNodeState(state, state.value, state.parse);
        default:
          throw new UnexpectedTagError();
      }
    }

    case StateType.String:
    case StateType.Value:
    case StateType.OptionalString:
    case StateType.OptionalValue:
      throw new UnexpectedTagError();

    //case StateType.NoOp:
    //return createNoOpState(state);

    default:
      throw new Error("Unknown state");
  }
}

function handleCloseTag(
  state: State<unknown>,
  context: Context
): State<unknown> {
  switch (state.type) {
    case StateType.Root:
      throw new UnexpectedTagError();

    case StateType.Message: {
      const [messageId, createdAt] = state.header.expect("Missing <header>");
      const schema = state.schema.expect("Missing <stammdatenschema>");

      state.parent.value.set([messageId, createdAt, schema]);
      return state.parent;
    }

    case StateType.Header: {
      const messageId = state.messageId.expect("Missing <nachrichtID>");
      const createdAt = state.createdAt.expect(
        "Missing <erstellungszeitpunkt>"
      );

      state.parent.header.set([messageId, createdAt]);
      return state.parent;
    }

    case StateType.Schema: {
      const baseData = parseBaseData(state.dataContainer);

      const schema = {
        ...baseData,
        hilfetext: state.hilfetext.get(),
        ableitungsmodifikationenStruktur:
          state.ableitungsmodifikationenStruktur.expect(
            "Missing <ableitungsmodifikationenStruktur>"
          ),
        ableitungsmodifikationenRepraesentation:
          state.ableitungsmodifikationenRepraesentation.expect(
            "Missing <ableitungsmodifikationenRepraesentation>"
          ),
        regeln: state.regeln,
        elemente: state.elemente,
      };

      state.parent.schema.set(schema);
      return state.parent;
    }

    case StateType.Struct: {
      const anzahl = state.anzahl.expect("Missing <anzahl>");
      const bezug = state.bezug.get();
      const element = state.element.expect("Missing <enthaelt>");

      if (element.type === "dataGroup") {
        state.parent.elemente.push({
          type: "dataGroup",
          identifier: element.dataGroup.identifier,
          anzahl,
          bezug,
        });
      } else {
        state.parent.elemente.push({
          type: "dataField",
          identifier: element.dataField.identifier,
          anzahl,
          bezug,
        });
      }

      return state.parent;
    }

    case StateType.Contains: {
      if (state.parent.element.isEmpty()) {
        throw new MissingValueError("Missing <datenfeld> or <datenfeldgruppe>");
      }

      return state.parent;
    }

    case StateType.DataGroup: {
      const elementData = parseElementData(state.dataContainer);

      const dataGroup: Datenfeldgruppe = {
        ...elementData,
        regeln: state.regeln,
        elemente: state.elemente,
      };

      context.datenfeldgruppen.insert(dataGroup);
      state.parent.parent.element.set({ type: "dataGroup", dataGroup });

      return state.parent;
    }

    case StateType.DataField: {
      const elementData = parseElementData(state.dataContainer);

      const dataField: Datenfeld = {
        ...elementData,
        feldart: state.feldart.expect("Missing <feldart>"),
        datentyp: state.datentyp.expect("Missing <datentyp>"),
        praezisierung: state.praezisierung.get(),
        inhalt: state.inhalt.get(),
        codelisteReferenz: state.codelisteReferenz.get(),
        regeln: state.regeln,
      };

      context.datenfelder.insert(dataField);
      state.parent.parent.element.set({ type: "dataField", dataField });

      return state.parent;
    }

    case StateType.Rule: {
      const baseData = parseBaseData(state.dataContainer);

      const rule: Regel = {
        ...baseData,
        script: state.script.get(),
      };

      context.regeln.insert(rule);
      state.regeln.push(rule.identifier);

      return state.parent;
    }

    case StateType.CodeList: {
      const [id, version] = state.identification.expect(
        "Missing <identifikation>"
      );
      const genericode = state.genericode.expect(
        "Missing <genericodeIdentification"
      );

      state.parent.codelisteReferenz.set({ id, version, genericode });
      return state.parent;
    }

    case StateType.Identification: {
      const id = state.id.expect("Missing <id>");
      const version = state.version.get();

      state.parentValue.set([id, version]);
      return state.parent;
    }

    case StateType.Genericode: {
      const canonicalIdentification = state.canonicalIdentification.expect(
        "Missing <canonicalIdentification>"
      );
      const version = state.version.expect("Missing <version>");
      const canonicalVersionUri = state.canonicalVersionUri.expect(
        "Missing <canonicalVersionUri>"
      );

      state.parent.genericode.set({
        canonicalIdentification,
        version,
        canonicalVersionUri,
      });
      return state.parent;
    }

    case StateType.String: {
      if (state.value.isEmpty()) {
        throw new MissingContentError();
      }
      return state.parent;
    }

    case StateType.Value: {
      if (state.value.isEmpty()) {
        throw new MissingContentError();
      }
      return state.parent;
    }

    case StateType.Code: {
      if (state.value.isEmpty()) {
        throw new MissingValueError("Missing <code>");
      }
      return state.parent;
    }

    case StateType.OptionalString:
    case StateType.OptionalValue:
      if (state.value.isEmpty()) {
        state.value.set(undefined);
      }
      return state.parent;

    // case StateType.NoOp:
    // return state.parent;

    default:
      throw new Error("Unknown state");
  }
}

export class SchemaMessageParser {
  private xmlParser: sax.SAXParser;
  private state: State<unknown> = createRootState();
  private context: Context = {
    datenfeldgruppen: new Table(),
    datenfelder: new Table(),
    regeln: new Table(),
  };

  constructor() {
    this.xmlParser = sax.parser(true, {
      trim: true,
      xmlns: true,
    });

    this.xmlParser.onerror = (error) => {
      throw error;
    };

    this.xmlParser.ontext = (text) => {
      handleText(this.state, text);
    };

    this.xmlParser.onopennamespace = (ns) => {
      if (ns.prefix === "xdf") {
        if (ns.uri !== "urn:xoev-de:fim:standard:xdatenfelder_2") {
          throw new UnknownNamespaceError(ns.prefix, ns.uri);
        }
      }
    };

    this.xmlParser.onopentag = (tag) => {
      assert("ns" in tag);
      this.state = handleOpenTag(this.state, tag);
    };

    this.xmlParser.onclosetag = () => {
      this.state = handleCloseTag(this.state, this.context);
    };
  }

  public write(data: string) {
    try {
      this.xmlParser.write(data);
    } catch (error: unknown) {
      if (error instanceof InternalParserError) {
        throw ParserError.fromInternalError(error, this.xmlParser);
      } else {
        throw error;
      }
    }
  }

  public finish(): ParseResult {
    this.xmlParser.close();

    if (this.state.type !== StateType.Root) {
      throw new InternalParserError("Unexpected EOF");
    }

    const [messageId, createdAt, schema] = this.state.value.expect(
      "Missing <urn:xoev-de:fim:standard:xdatenfelder_2>"
    );

    const schemaContainer = new SchemaContainer(
      schema,
      this.context.datenfeldgruppen,
      this.context.datenfelder,
      this.context.regeln
    );

    const warnings: SchemaWarnings = {
      schemaWarnings: collectSchemaWarnings(schema),
      dataGroupWarnings: collectGroupWarnings(
        Object.values(schemaContainer.datenfeldgruppen.entries())
      ),
      dataFieldWarnings: collectFieldWarnings(
        Object.values(schemaContainer.datenfelder.entries())
      ),
      ruleWarnings: collectRuleWarnings(
        Object.values(schemaContainer.regeln.entries())
      ),
    };

    return {
      messageId,
      createdAt,
      schemaContainer,
      warnings,
    };
  }
}

function collectSchemaWarnings(schema: Stammdatenschema): Warning[] {
  return collectBaseWarning(schema);
}

function collectGroupWarnings(
  groups: Datenfeldgruppe[]
): Record<string, Warning[]> {
  const warnings: Record<string, Warning[]> = {};

  for (const group of groups) {
    const groupWarnings: Warning[] = collectElementWarnings(group);

    if (groupWarnings.length > 0) {
      warnings[group.identifier] = groupWarnings;
    }
  }

  return warnings;
}

function collectFieldWarnings(fields: Datenfeld[]): Record<string, Warning[]> {
  const warnings: Record<string, Warning[]> = {};

  for (const field of fields) {
    const fieldWarnings: Warning[] = collectElementWarnings(field);

    if (field.praezisierung === undefined) {
      fieldWarnings.push({
        type: "missingAttribute",
        attribute: "praezisierung",
        identifier: field.identifier,
      });
    }

    if (field.inhalt === undefined) {
      fieldWarnings.push({
        type: "missingAttribute",
        attribute: "inhalt",
        identifier: field.identifier,
      });
    }

    if (fieldWarnings.length > 0) {
      warnings[field.identifier] = fieldWarnings;
    }
  }

  return warnings;
}

function collectRuleWarnings(rules: Regel[]): Record<string, Warning[]> {
  const warnings: Record<string, Warning[]> = {};

  for (const rule of rules) {
    const ruleWarnings: Warning[] = collectBaseWarning(rule);

    if (rule.script === undefined) {
      ruleWarnings.push({
        type: "missingAttribute",
        attribute: "script",
        identifier: rule.identifier,
      });
    }

    if (ruleWarnings.length > 0) {
      warnings[rule.identifier] = ruleWarnings;
    }
  }

  return warnings;
}

function collectElementWarnings(data: ElementData): Warning[] {
  const warnings = collectBaseWarning(data);

  if (data.hilfetextEingabe === undefined) {
    warnings.push({
      type: "missingAttribute",
      attribute: "hilfetextEingabe",
      identifier: data.identifier,
    });
  }

  if (data.hilfetextAusgabe === undefined) {
    warnings.push({
      type: "missingAttribute",
      attribute: "hilfetextAusgabe",
      identifier: data.identifier,
    });
  }

  return warnings;
}

function collectBaseWarning(data: BaseData): Warning[] {
  const warnings: Warning[] = [];

  if (data.bezeichnungEingabe === undefined) {
    warnings.push({
      type: "missingAttribute",
      attribute: "bezeichnungEingabe",
      identifier: data.identifier,
    });
  }

  if (data.beschreibung === undefined) {
    warnings.push({
      type: "missingAttribute",
      attribute: "beschreibung",
      identifier: data.identifier,
    });
  }

  if (data.definition === undefined) {
    warnings.push({
      type: "missingAttribute",
      attribute: "definition",
      identifier: data.identifier,
    });
  }

  if (data.bezug === undefined) {
    warnings.push({
      type: "missingAttribute",
      attribute: "bezug",
      identifier: data.identifier,
    });
  }

  return warnings;
}

interface BaseContainer {
  identification: Value<[string, string]>;
  name: Value<string>;
  bezeichnungEingabe: Value<string>;
  bezeichnungAusgabe: Value<string>;
  beschreibung: Value<string>;
  definition: Value<string>;
  bezug: Value<string>;
  status: Value<ElementStatus>;
  gueltigAb: Value<Date>;
  gueltigBis: Value<Date>;
  fachlicherErsteller: Value<string>;
  versionshinweis: Value<string>;
  freigabedatum: Value<Date>;
  veroeffentlichungsdatum: Value<Date>;
}

function createBaseContainer(): BaseContainer {
  return {
    identification: new Value(),
    name: new Value(),
    bezeichnungEingabe: new Value(),
    bezeichnungAusgabe: new Value(),
    beschreibung: new Value(),
    definition: new Value(),
    bezug: new Value(),
    status: new Value(),
    gueltigAb: new Value(),
    gueltigBis: new Value(),
    fachlicherErsteller: new Value(),
    versionshinweis: new Value(),
    freigabedatum: new Value(),
    veroeffentlichungsdatum: new Value(),
  };
}

function parseBaseData(container: BaseContainer): BaseData {
  const [id, version] = container.identification.expect(
    "Missing <identifikation>"
  );
  const name = container.name.expect("Missing <name>");

  return {
    identifier: `${id}:${version}`,
    id,
    version,
    name,
    bezeichnungEingabe: container.bezeichnungEingabe.get(),
    bezeichnungAusgabe: container.bezeichnungAusgabe.get(),
    beschreibung: container.beschreibung.get(),
    definition: container.definition.get(),
    status: container.status.expect("Missing <status>"),
    bezug: container.bezug.get(),
    gueltigAb: container.gueltigAb.get(),
    gueltigBis: container.gueltigBis.get(),
    fachlicherErsteller: container.fachlicherErsteller.get(),
    versionshinweis: container.versionshinweis.get(),
    freigabedatum: container.freigabedatum.get(),
    veroeffentlichungsdatum: container.veroeffentlichungsdatum.get(),
  };
}

function handleBaseData(
  state: SchemaState | DataGroupState | DataFieldState | RuleState,
  tag: sax.QualifiedTag
): State<unknown> {
  switch (tag.local) {
    case "identifikation":
      return createIdentificationState(
        state,
        state.dataContainer.identification
      );
    case "name":
      return createStringNodeState(state, state.dataContainer.name);
    case "bezeichnungEingabe":
      return createOptionalStringNodeState(
        state,
        state.dataContainer.bezeichnungEingabe
      );
    case "bezeichnungAusgabe":
      return createOptionalStringNodeState(
        state,
        state.dataContainer.bezeichnungAusgabe
      );
    case "beschreibung":
      return createOptionalStringNodeState(
        state,
        state.dataContainer.beschreibung
      );
    case "definition":
      return createOptionalStringNodeState(
        state,
        state.dataContainer.definition
      );
    case "bezug":
      return createOptionalStringNodeState(state, state.dataContainer.bezug);
    case "status":
      return createCodeNodeState(
        state,
        state.dataContainer.status,
        parseElementStatus
      );
    case "gueltigAb":
      return createOptionalValueNodeState(
        state,
        state.dataContainer.gueltigAb,
        parseDate
      );
    case "gueltigBis":
      return createOptionalValueNodeState(
        state,
        state.dataContainer.gueltigBis,
        parseDate
      );
    case "fachlicherErsteller":
      return createOptionalStringNodeState(
        state,
        state.dataContainer.fachlicherErsteller
      );
    case "versionshinweis":
      return createOptionalStringNodeState(
        state,
        state.dataContainer.versionshinweis
      );
    case "freigabedatum":
      return createOptionalValueNodeState(
        state,
        state.dataContainer.freigabedatum,
        parseDate
      );
    case "veroeffentlichungsdatum":
      return createOptionalValueNodeState(
        state,
        state.dataContainer.veroeffentlichungsdatum,
        parseDate
      );
    default:
      throw new UnexpectedTagError();
  }
}

interface ElementContainer extends BaseContainer {
  schemaelementart: Value<SchemaElementArt>;
  hilfetextEingabe: Value<string>;
  hilfetextAusgabe: Value<string>;
}

function createElementContainer(): ElementContainer {
  return {
    identification: new Value(),
    name: new Value(),
    bezeichnungEingabe: new Value(),
    bezeichnungAusgabe: new Value(),
    beschreibung: new Value(),
    definition: new Value(),
    bezug: new Value(),
    status: new Value(),
    gueltigAb: new Value(),
    gueltigBis: new Value(),
    fachlicherErsteller: new Value(),
    versionshinweis: new Value(),
    freigabedatum: new Value(),
    veroeffentlichungsdatum: new Value(),
    schemaelementart: new Value(),
    hilfetextEingabe: new Value(),
    hilfetextAusgabe: new Value(),
  };
}

function parseElementData(container: ElementContainer): ElementData {
  const baseData = parseBaseData(container);

  return {
    ...baseData,
    schemaelementart: container.schemaelementart.expect(
      "Missing <schemaelementart>"
    ),
    hilfetextEingabe: container.hilfetextEingabe.get(),
    hilfetextAusgabe: container.hilfetextAusgabe.get(),
  };
}

function handleElementData(
  state: DataGroupState | DataFieldState,
  tag: sax.QualifiedTag
): State<unknown> {
  switch (tag.local) {
    case "schemaelementart":
      return createCodeNodeState(
        state,
        state.dataContainer.schemaelementart,
        parseSchemaElementArt
      );
    case "hilfetextEingabe":
      return createOptionalStringNodeState(
        state,
        state.dataContainer.hilfetextEingabe
      );
    case "hilfetextAusgabe":
      return createOptionalStringNodeState(
        state,
        state.dataContainer.hilfetextAusgabe
      );
    default:
      return handleBaseData(state, tag);
  }
}
