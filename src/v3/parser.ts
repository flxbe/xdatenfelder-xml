import sax from "sax";
import {
  StateParser,
  State,
  NoOpState,
  ValueNodeState,
  OptionalValueNodeState,
  CodeNodeState,
  StringNodeState,
  OptionalStringNodeState,
  FinishFn,
  Context,
} from "../sax";
import {
  UnexpectedTagError,
  DuplicateTagError,
  MissingChildNodeError,
  InternalParserError,
  ValidationError,
} from "../errors";
import {
  DataGroup,
  DataField,
  Rule,
  BaseData,
  ChildRef,
  parseFreigabeStatus,
  FreigabeStatus,
  ElementData,
  Datentyp,
  RegelTyp,
  RelationType,
  parseRegelTyp,
  NormReference,
  Keyword,
  NS_XD3,
  Relation,
  parseRelationType,
  Feldart,
  parseFeldart,
  parseDatentyp,
  Vorbefuellung,
  parseVorbefuellung,
  Constraints,
  SchemaContainer,
} from "./schema";
import { Table } from "../table";
import { SchemaElementArt, parseSchemaElementArt } from "../v2/schema";
import { assert, parseDate, Value } from "../util";

class RootState extends State {
  public value: Value<DataGroupMessage3> = new Value();

  public onOpenTag(tag: sax.QualifiedTag): State {
    switch (tag.name) {
      case "xdf:xdatenfelder.datenfeldgruppe.0103":
        return new MessageState(this, this.value);
      default:
        throw new UnexpectedTagError();
    }
  }

  public onCloseTag(): State {
    throw new Error("Should not be called.");
  }
}

class MessageState extends State {
  private parent: State;
  private value: Value<DataGroupMessage3>;

  private header: Value<[string, Date]> = new Value();
  private rootDataGroup: Value<string> = new Value();

  constructor(parent: State, value: Value<DataGroupMessage3>) {
    super();

    this.parent = parent;
    this.value = value;
  }

  public onOpenTag(tag: sax.QualifiedTag | sax.Tag): State {
    switch (tag.name) {
      case "xdf:header":
        return new HeaderState(this, this.header);
      case "xdf:datenfeldgruppe":
        return new DataGroupState(this, (dataGroup) => {
          this.rootDataGroup.set(dataGroup.identifier);
        });
      default:
        throw new UnexpectedTagError();
    }
  }

  public onCloseTag(context: Context): State {
    const [messageId, createdAt] = this.header.expect("Missing <header>");
    const rootDataGroup = this.rootDataGroup.expect(
      "Missing <datenfeldgruppe>"
    );

    this.value.set(
      new DataGroupMessage3(
        messageId,
        createdAt,
        rootDataGroup,
        context.dataGroups,
        context.dataFields,
        context.rules
      )
    );

    return this.parent;
  }
}

class HeaderState extends State {
  private parent: State;
  private value: Value<[string, Date]>;

  private messageId: Value<string> = new Value();
  private createdAt: Value<Date> = new Value();

  constructor(parent: State, value: Value<[string, Date]>) {
    super();

    this.parent = parent;
    this.value = value;
  }

  public onOpenTag(tag: sax.QualifiedTag): State {
    switch (tag.name) {
      case "xdf:nachrichtID":
        return new StringNodeState(this, this.messageId);
      case "xdf:erstellungszeitpunkt":
        return new ValueNodeState(this, this.createdAt, parseDate);
      default:
        throw new UnexpectedTagError();
    }
  }

  public onCloseTag(_context: Context): State {
    const messageId = this.messageId.expect("Missing <nachrichtID>");
    const createdAt = new Date(
      this.createdAt.expect("Missing <erstellungszeitpunkt>")
    );

    this.value.set([messageId, createdAt]);

    return this.parent;
  }
}

export interface BaseContainer {
  identification: Value<[string, string]>;
  name: Value<string>;
  description: Value<string | undefined>;
  definition: Value<string | undefined>;
  releaseState: Value<FreigabeStatus>;
  stateSetAt: Value<Date | undefined>;
  stateSetBy: Value<string | undefined>;
  validSince: Value<Date | undefined>;
  validUntil: Value<Date | undefined>;
  versionHint: Value<string | undefined>;
  publishedAt: Value<Date | undefined>;
  lastChangedAt: Value<Date>;
  normReferences: NormReference[];
  keywords: Keyword[];
  relations: Relation[];
}

export function createBaseContainer(): BaseContainer {
  return {
    identification: new Value(),
    name: new Value(),
    description: new Value(),
    definition: new Value(),
    releaseState: new Value(),
    stateSetAt: new Value(),
    stateSetBy: new Value(),
    validSince: new Value(),
    validUntil: new Value(),
    versionHint: new Value(),
    publishedAt: new Value(),
    lastChangedAt: new Value(),
    normReferences: [],
    keywords: [],
    relations: [],
  };
}

export interface ElementContainer extends BaseContainer {
  inputLabel: Value<string>;
  outputLabel: Value<string | undefined>;
  elementType: Value<SchemaElementArt>;
  inputHelp: Value<string | undefined>;
  outputHelp: Value<string | undefined>;
}

function createElementContainer(): ElementContainer {
  return {
    identification: new Value(),
    name: new Value(),
    description: new Value(),
    definition: new Value(),
    releaseState: new Value(),
    stateSetAt: new Value(),
    stateSetBy: new Value(),
    validSince: new Value(),
    validUntil: new Value(),
    versionHint: new Value(),
    publishedAt: new Value(),
    lastChangedAt: new Value(),
    normReferences: [],
    keywords: [],
    relations: [],
    inputLabel: new Value(),
    outputLabel: new Value(),
    elementType: new Value(),
    inputHelp: new Value(),
    outputHelp: new Value(),
  };
}

export function parseBaseData(container: BaseContainer): BaseData {
  const [id, version] = container.identification.expect(
    "Missing <identifikation>"
  );
  const identifier = `${id}:${version}`;

  return {
    identifier,
    id,
    version,
    name: container.name.expect("Missing <name>"),
    description: container.description.get(),
    definition: container.definition.get(),
    releaseState: container.releaseState.expect("Missing <freigabestatus>"),
    stateSetAt: container.stateSetAt.get(),
    stateSetBy: container.stateSetBy.get(),
    validSince: container.validSince.get(),
    validUntil: container.validUntil.get(),
    versionHint: container.versionHint.get(),
    publishedAt: container.publishedAt.get(),
    lastChangedAt: container.lastChangedAt.expect("Missing <letzteAenderung>"),
    normReferences: container.normReferences,
    keywords: container.keywords,
    relations: container.relations,
  };
}

function parseElementData(container: ElementContainer): ElementData {
  const [id, version] = container.identification.expect(
    "Missing <identifikation>"
  );
  const identifier = `${id}:${version}`;

  return {
    identifier,
    id,
    version,
    name: container.name.expect("Missing <name>"),
    description: container.description.get(),
    definition: container.definition.get(),
    releaseState: container.releaseState.expect("Missing <freigabestatus>"),
    stateSetAt: container.stateSetAt.get(),
    stateSetBy: container.stateSetBy.get(),
    validSince: container.validSince.get(),
    validUntil: container.validUntil.get(),
    versionHint: container.versionHint.get(),
    publishedAt: container.publishedAt.get(),
    lastChangedAt: container.lastChangedAt.expect("Missing <letzteAenderung>"),
    normReferences: container.normReferences,
    keywords: container.keywords,
    relations: container.relations,
    inputLabel: container.inputLabel.expect("Missing <bezeichnungEingabe>"),
    outputLabel: container.outputLabel.get(),
    elementType: container.elementType.expect("Missing <schemaelementart>"),
    inputHelp: container.inputHelp.get(),
    outputHelp: container.outputHelp.get(),
  };
}

function handleElementState(
  state: State,
  container: ElementContainer,
  tag: sax.QualifiedTag
): State | undefined {
  switch (tag.name) {
    case "xdf:identifikation":
      return new IdentificationState(state, container.identification);
    case "xdf:name":
      return new StringNodeState(state, container.name);
    case "xdf:beschreibung":
      return new OptionalStringNodeState(state, container.description);
    case "xdf:definition":
      return new OptionalStringNodeState(state, container.definition);
    case "xdf:freigabestatus":
      return new CodeNodeState(
        state,
        container.releaseState,
        parseFreigabeStatus
      );
    case "xdf:statusGesetztAm":
      return new OptionalValueNodeState(state, container.stateSetAt, parseDate);
    case "xdf:statusGesetztDurch":
      return new OptionalStringNodeState(state, container.stateSetBy);
    case "xdf:bezug":
      return new NormReferenceState(state, tag, (ref) =>
        container.normReferences.push(ref)
      );
    case "xdf:versionshinweis":
      return new OptionalStringNodeState(state, container.versionHint);
    case "xdf:veroeffentlichungsdatum":
      return new OptionalValueNodeState(
        state,
        container.publishedAt,
        parseDate
      );
    case "xdf:schemaelementart":
      return new CodeNodeState(
        state,
        container.elementType,
        parseSchemaElementArt
      );
    case "xdf:bezeichnungEingabe":
      return new StringNodeState(state, container.inputLabel);
    case "xdf:bezeichnungAusgabe":
      return new OptionalStringNodeState(state, container.outputLabel);
    case "xdf:hilfetextEingabe":
      return new OptionalStringNodeState(state, container.inputHelp);
    case "xdf:hilfetextAusgabe":
      return new OptionalStringNodeState(state, container.outputHelp);
    case "xdf:letzteAenderung":
      return new ValueNodeState(state, container.lastChangedAt, parseDate);
    case "xdf:gueltigAb":
      return new ValueNodeState(state, container.validSince, parseDate);
    case "xdf:gueltigBis":
      return new ValueNodeState(state, container.validUntil, parseDate);
    case "xdf:stichwort":
      return new KeywordState(state, tag, (keyword) =>
        container.keywords.push(keyword)
      );
    case "xdf:relation":
      return new RelationState(state, (relation) =>
        container.relations.push(relation)
      );
    default:
      return undefined;
  }
}

class DataGroupState extends State {
  private parent: State;
  private onFinish: FinishFn<DataGroup>;

  private elementContainer = createElementContainer();
  private ruleRefs: string[] = [];
  private children: ChildRef[] = [];

  constructor(parent: State, onFinish: FinishFn<DataGroup>) {
    super();

    this.parent = parent;
    this.onFinish = onFinish;
  }

  public onOpenTag(tag: sax.QualifiedTag): State {
    const newState = handleElementState(this, this.elementContainer, tag);
    if (newState) {
      return newState;
    }

    switch (tag.name) {
      case "xdf:regel":
        return new RuleState(this, (rule) => {
          this.ruleRefs.push(rule.identifier);
        });
      case "xdf:struktur":
        return new StructureState(this, (child) => {
          if (child.type === "dataGroup") {
            const { dataGroup } = child;
            this.children.push({
              type: "dataGroup",
              identifier: dataGroup.identifier,
              cardinality: child.cardinality,
              normReferences: child.normReferences,
            });
          } else {
            const { dataField } = child;
            this.children.push({
              type: "dataField",
              identifier: dataField.identifier,
              cardinality: child.cardinality,
              normReferences: child.normReferences,
            });
          }
        });
      default:
        throw new UnexpectedTagError();
    }
  }

  public onCloseTag(context: Context): State {
    const data = parseElementData(this.elementContainer);

    const dataGroup = {
      ...data,
      rules: this.ruleRefs,
      children: this.children,
    };

    context.dataGroups.insert(dataGroup);
    this.onFinish(dataGroup);

    return this.parent;
  }
}

class DataFieldState extends State {
  private parent: State;
  private onFinish: FinishFn<DataField>;

  private elementContainer = createElementContainer();
  private inputType: Value<Feldart> = new Value();
  private dataType: Value<Datentyp> = new Value();
  private fillType: Value<Vorbefuellung> = new Value();
  private constraints: Value<Constraints> = new Value();
  private content: Value<string | undefined> = new Value();
  private codeKey: Value<string | undefined> = new Value();
  private nameKey: Value<string | undefined> = new Value();
  private helpKey: Value<string | undefined> = new Value();
  private maxSize: Value<number | undefined> = new Value();
  private mediaTypes: string[] = [];
  private rules: string[] = [];

  constructor(parent: State, onFinish: FinishFn<DataField>) {
    super();

    this.parent = parent;
    this.onFinish = onFinish;
  }

  public onOpenTag(tag: sax.QualifiedTag): State {
    const newState = handleElementState(this, this.elementContainer, tag);
    if (newState) {
      return newState;
    }

    switch (tag.name) {
      case "xdf:feldart":
        return new CodeNodeState(this, this.inputType, parseFeldart);
      case "xdf:datentyp":
        return new CodeNodeState(this, this.dataType, parseDatentyp);
      case "xdf:regel":
        return new RuleState(this, (rule) => this.rules.push(rule.identifier));
      case "xdf:vorbefuellung":
        return new CodeNodeState(this, this.fillType, parseVorbefuellung);
      case "xdf:praezisierung":
        return new ConstraintsState(this, this.constraints, tag);
      case "xdf:codeKey":
        return new OptionalStringNodeState(this, this.codeKey);
      case "xdf:nameKey":
        return new OptionalStringNodeState(this, this.nameKey);
      case "xdf:helpKey":
        return new OptionalStringNodeState(this, this.helpKey);
      case "xdf:inhalt":
        return new OptionalStringNodeState(this, this.content);
      case "xdf:werte":
      case "xdf:codelisteReferenz":
        return new NoOpState(this);
      case "xdf:maxSize":
        return new OptionalValueNodeState(this, this.maxSize, parseInt);
      case "xdf:mediaType":
        return new MediaTypeState(this, (mediaType) =>
          this.mediaTypes.push(mediaType)
        );
      default:
        throw new UnexpectedTagError();
    }
  }

  public onCloseTag(context: Context): State {
    const data = parseElementData(this.elementContainer);

    const dataField = {
      ...data,
      inputType: this.inputType.expect("Missing <feldart>"),
      dataType: this.dataType.expect("Missing <datentyp>"),
      fillType: this.fillType.expect("Missing <vorbefuellung>"),
      constraints: this.constraints.get() ?? {},
      content: this.content.get(),
      codeKey: this.codeKey.get(),
      nameKey: this.nameKey.get(),
      helpKey: this.helpKey.get(),
      maxSize: this.maxSize.get(),
      mediaTypes: this.mediaTypes,
      rules: this.rules,
      values: [],
    };

    context.dataFields.insert(dataField);
    this.onFinish(dataField);

    return this.parent;
  }
}

class MediaTypeState extends State {
  private parent: State;
  private onFinish: FinishFn<string>;

  private value?: string = undefined;

  constructor(parent: State, onFinish: FinishFn<string>) {
    super();

    this.parent = parent;
    this.onFinish = onFinish;
  }

  public onText(text: string): void {
    this.value = text;
  }

  public onOpenTag(tag: sax.QualifiedTag): State {
    throw new UnexpectedTagError();
  }

  public onCloseTag(_context: Context): State {
    if (this.value) {
      this.onFinish(this.value);
    }

    return this.parent;
  }
}

class ConstraintsState extends State {
  private parent: State;
  private value: Value<Constraints>;

  private constraints: Constraints = {};

  constructor(parent: State, value: Value<Constraints>, tag: sax.QualifiedTag) {
    super();

    this.parent = parent;
    this.value = value;

    const minLength = getAttribute(tag, "minLength");
    if (minLength !== undefined) {
      this.constraints.minLength = parseInt(minLength);
    }

    const maxLength = getAttribute(tag, "maxLength");
    if (maxLength !== undefined) {
      this.constraints.maxLength = parseInt(maxLength);
    }

    this.constraints.minValue = getAttribute(tag, "minValue");
    this.constraints.maxValue = getAttribute(tag, "maxValue");
    this.constraints.pattern = getAttribute(tag, "pattern");
  }

  public onText(text: string): void {
    this.constraints.value = text;
  }

  public onOpenTag(tag: sax.QualifiedTag): State {
    throw new UnexpectedTagError();
  }

  public onCloseTag(_context: Context): State {
    this.value.set(this.constraints);

    return this.parent;
  }
}

export type Child =
  | {
      type: "dataGroup";
      dataGroup: DataGroup;
      cardinality: string;
      normReferences: NormReference[];
    }
  | {
      type: "dataField";
      dataField: DataField;
      cardinality: string;
      normReferences: NormReference[];
    };

class StructureState extends State {
  private parent: State;
  private onFinish: FinishFn<Child>;

  private element: Value<Element> = new Value();
  private normReferences: NormReference[] = [];
  private cardinality: Value<string> = new Value();

  constructor(parent: State, onFinish: FinishFn<Child>) {
    super();

    this.parent = parent;
    this.onFinish = onFinish;
  }

  public onOpenTag(tag: sax.QualifiedTag): State {
    switch (tag.name) {
      case "xdf:bezug":
        return new NormReferenceState(this, tag, (ref) =>
          this.normReferences.push(ref)
        );
      case "xdf:anzahl":
        return new StringNodeState(this, this.cardinality);
      case "xdf:enthaelt":
        return new ContainsState(this, this.element);
      default:
        throw new UnexpectedTagError();
    }
  }

  public onCloseTag(_context: Context): State {
    const element = this.element.expect("Missing <enthaelt>");
    const child = {
      ...element,
      cardinality: this.cardinality.expect("Missing <anzahl>"),
      normReferences: this.normReferences,
    };

    this.onFinish(child);

    return this.parent;
  }
}

type Element =
  | { type: "dataGroup"; dataGroup: DataGroup }
  | { type: "dataField"; dataField: DataField };

class ContainsState extends State {
  private parent: State;
  private parentValue: Value<Element>;

  private value?: Element = undefined;

  constructor(parent: State, value: Value<Element>) {
    super();

    this.parent = parent;
    this.parentValue = value;
  }

  public onOpenTag(tag: sax.QualifiedTag): State {
    if (this.value !== undefined) {
      throw new DuplicateTagError();
    }

    switch (tag.name) {
      case "xdf:datenfeldgruppe":
        return new DataGroupState(this, (dataGroup) => {
          this.value = { type: "dataGroup", dataGroup };
        });
      case "xdf:datenfeld":
        return new DataFieldState(this, (dataField) => {
          this.value = { type: "dataField", dataField };
        });
      default:
        throw new UnexpectedTagError();
    }
  }
  public onCloseTag(_context: Context): State {
    if (this.value === undefined) {
      throw new MissingChildNodeError("xdf:datenfeld | xdf:datenfeldgruppe");
    }

    this.parentValue.set(this.value);

    return this.parent;
  }
}

class RelationState extends State {
  private parent: State;
  private onFinish: FinishFn<Relation>;

  private type: Value<RelationType> = new Value();
  private identification: Value<[string, string]> = new Value();

  constructor(parent: State, onFinish: FinishFn<Relation>) {
    super();

    this.parent = parent;
    this.onFinish = onFinish;
  }

  public onOpenTag(tag: sax.QualifiedTag): State {
    switch (tag.name) {
      case "xdf:praedikat":
        return new CodeNodeState(this, this.type, parseRelationType);
      case "xdf:objekt":
        return new IdentificationState(this, this.identification);
      default:
        throw new UnexpectedTagError();
    }
  }

  public onCloseTag(_context: Context): State {
    const type = this.type.expect("Missing <praedikat>");
    const [id, version] = this.identification.expect("Missing <objekt>");
    const identifier = `${id}:${version}`;

    this.onFinish({ type, identifier });

    return this.parent;
  }
}

class RuleState extends State {
  private parent: State;
  private onFinish: FinishFn<Rule>;

  private identification: Value<[string, string]> = new Value();
  private name: Value<string> = new Value();
  private description: Value<string | undefined> = new Value();
  private freeFormDefinition: Value<string | undefined> = new Value();
  private creator: Value<string | undefined> = new Value();
  private lastChangedAt: Value<Date> = new Value();
  private type: Value<RegelTyp> = new Value();
  private script: Value<string | undefined> = new Value();
  private normReferences: NormReference[] = [];
  private keywords: Keyword[] = [];

  constructor(parent: State, onFinish: FinishFn<Rule>) {
    super();

    this.parent = parent;
    this.onFinish = onFinish;
  }

  public onOpenTag(tag: sax.QualifiedTag): State {
    switch (tag.name) {
      case "xdf:identifikation":
        return new IdentificationState(this, this.identification);
      case "xdf:name":
        return new StringNodeState(this, this.name);
      case "xdf:beschreibung":
        return new OptionalStringNodeState(this, this.description);
      case "xdf:freitextRegel":
        return new OptionalStringNodeState(this, this.freeFormDefinition);
      case "xdf:fachlicherErsteller":
        return new OptionalStringNodeState(this, this.creator);
      case "xdf:letzteAenderung":
        return new ValueNodeState(this, this.lastChangedAt, parseDate);
      case "xdf:typ":
        return new CodeNodeState(this, this.type, parseRegelTyp);
      case "xdf:skript":
        return new OptionalStringNodeState(this, this.script);
      case "xdf:bezug":
        return new NormReferenceState(this, tag, (ref) =>
          this.normReferences.push(ref)
        );
      case "xdf:stichwort":
        return new KeywordState(this, tag, (keyword) =>
          this.keywords.push(keyword)
        );

      default:
        throw new UnexpectedTagError();
    }
  }

  public onCloseTag(context: Context): State {
    const [id, version] = this.identification.expect(
      "Missing <identifikation>"
    );
    const identifier = `${id}:${version}`;

    const rule = {
      identifier,
      id,
      version,
      name: this.name.expect("Missing <name>"),
      description: this.description.get(),
      freeFormDefinition: this.freeFormDefinition.get(),
      creator: this.creator.get(),
      lastChangedAt: this.lastChangedAt.expect("Missing <letzteAenderung>"),
      type: this.type.expect("Missing <typ>"),
      script: this.script.get(),
      normReferences: this.normReferences,
      keywords: this.keywords,
    };

    context.rules.insert(rule);
    this.onFinish(rule);

    return this.parent;
  }
}

class KeywordState extends State {
  private parent: State;
  private uri: string | undefined;
  private onFinish: FinishFn<Keyword>;
  private value: Value<string | undefined> = new Value();

  constructor(
    parent: State,
    tag: sax.QualifiedTag,
    onFinish: FinishFn<NormReference>
  ) {
    super();

    this.parent = parent;
    this.onFinish = onFinish;

    this.uri = getAttribute(tag, "uri");
  }

  public onText(text: string): void {
    this.value.set(text);
  }

  public onOpenTag(tag: sax.QualifiedTag): State {
    throw new UnexpectedTagError();
  }

  public onCloseTag(_context: Context): State {
    const value = this.value.get();
    if (value !== undefined) {
      this.onFinish({ value, uri: this.uri });
    } else {
      if (this.uri !== undefined) {
        throw new ValidationError(
          "<xdf:stichwort> with an uri attribute needs a non-empty content"
        );
      }
    }

    return this.parent;
  }
}

class NormReferenceState extends State {
  private parent: State;
  private link: string | undefined;
  private onFinish: FinishFn<NormReference>;
  private value: Value<string | undefined> = new Value();

  constructor(
    parent: State,
    tag: sax.QualifiedTag,
    onFinish: FinishFn<NormReference>
  ) {
    super();

    this.parent = parent;
    this.onFinish = onFinish;

    this.link = getAttribute(tag, "link");
  }

  public onText(text: string): void {
    this.value.set(text);
  }

  public onOpenTag(tag: sax.QualifiedTag): State {
    throw new UnexpectedTagError();
  }

  public onCloseTag(_context: Context): State {
    const value = this.value.get();
    if (value !== undefined) {
      this.onFinish({ value, link: this.link });
    } else {
      if (this.link !== undefined) {
        throw new ValidationError(
          "<xdf:bezug> with a link attribute needs a non-empty content"
        );
      }
    }

    return this.parent;
  }
}

function getAttribute(tag: sax.QualifiedTag, key: string): string | undefined {
  const attribute = tag.attributes[key];
  if (attribute === undefined) {
    return undefined;
  } else {
    assert(typeof attribute === "object");
    return attribute.value;
  }
}

class IdentificationState extends State {
  private parent: State;
  private value: Value<[string, string]>;

  private id: Value<string> = new Value();
  private version: Value<string> = new Value();

  constructor(parent: State, value: Value<[string, string]>) {
    super();

    this.parent = parent;
    this.value = value;
  }

  public onOpenTag(tag: sax.QualifiedTag | sax.Tag): State {
    switch (tag.name) {
      case "xdf:id":
        return new StringNodeState(this, this.id);
      case "xdf:version":
        return new StringNodeState(this, this.version);
      default:
        throw new UnexpectedTagError();
    }
  }

  public onCloseTag(): State {
    const id = this.id.expect("Missing <id>");
    const version = this.version.expect("Missing <version>");
    this.value.set([id, version]);

    return this.parent;
  }
}

class DataGroupMessageParser {
  private stateParser: StateParser;

  constructor() {
    this.stateParser = new StateParser(new RootState(), NS_XD3);
  }

  public write(data: string) {
    this.stateParser.write(data);
  }

  public finish(): DataGroupMessage3 {
    const state = this.stateParser.finish();

    if (!(state instanceof RootState)) {
      throw new InternalParserError("Unexpected EOF");
    }

    return state.value.expect("Missing <xdatenfelder.datenfeldgruppe.0103>");
  }
}

export class DataGroupMessage3 {
  public id: string;
  public createdAt: Date;

  public rootDataGroup: string;
  public dataGroups: Table<DataGroup>;
  public dataFields: Table<DataField>;
  public rules: Table<Rule>;

  constructor(
    id: string,
    createdAt: Date,
    rootDataGroup: string,
    dataGroups: Table<DataGroup>,
    dataFields: Table<DataField>,
    rules: Table<Rule>
  ) {
    this.id = id;
    this.createdAt = createdAt;
    this.rootDataGroup = rootDataGroup;
    this.dataFields = dataFields;
    this.dataGroups = dataGroups;
    this.rules = rules;
  }

  public static fromString(value: string): DataGroupMessage3 {
    const parser = new DataGroupMessageParser();
    parser.write(value);

    return parser.finish();
  }
}

export class SchemaMessage3 {
  public readonly id: string;
  public readonly createdAt: Date;
  public readonly container: SchemaContainer;

  constructor(container: SchemaContainer, id: string, createdAt: Date) {
    this.container = container;
    this.id = id;
    this.createdAt = createdAt;
  }

  public static fromString(value: string): SchemaMessage3 {
    // TODO: Actually parse the message
    const container = {
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
      dataGroups: new Table<DataGroup>(),
      dataFields: new Table<DataField>(),
      rules: new Table<Rule>(),
    };

    return new SchemaMessage3(container, "some-message-id", new Date());
  }
}
