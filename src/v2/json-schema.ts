import {
  Datenfeldgruppe,
  Datenfeld,
  Datentyp,
  ElementReference,
  SchemaContainer,
} from "./schema";

export function toJsonSchema(container: SchemaContainer) {
  const { schema } = container;

  const jsonSchema = {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    title: schema.bezeichnungEingabe,
    description: schema.beschreibung,
    type: "object",
    ...createRefs(schema.elemente),
  };

  return jsonSchema;
}

function createRefs(elements: ElementReference[]) {
  const required: string[] = [];
  const properties: Record<string, any> = {};

  for (const element of elements) {
    if (element.anzahl.type === "value") {
      if (!element.anzahl.optional) {
        required.push(element.identifier);
      }
      properties[element.identifier] = { $ref: `#/defs/${element.identifier}` };
    } else {
      required.push(element.identifier);

      properties[element.identifier] = {
        minItems: element.anzahl.minSize,
        maxItems: element.anzahl.maxSize,
        type: "array",
        items: { $ref: `#/defs/${element.identifier}` },
      };
    }
  }

  return { required, properties };
}

function createGroupDefs(groups: Datenfeldgruppe[]) {
  const defs: Record<string, any> = {};

  for (const group of groups) {
    defs[group.identifier] = {
      title: group.bezeichnungEingabe,
      description: group.beschreibung,
      type: "object",
      ...createRefs(group.elemente),
    };
  }
}

const DATENTYP_TO_TYPE: Record<Datentyp, any> = {
  bool: { type: "boolean" },
  date: { type: "string", format: "date" },
  file: { type: "string", "x-display": "file" },
  text: { type: "string" },
  num: { type: "number" },
  num_int: { type: "integer" },
  num_currency: { type: "number" },
  obj: { type: "string", "x-display": "data-url" },
};

function createFieldDefs(fields: Datenfeld[]) {
  const defs: Record<string, any> = {};

  for (const field of fields) {
    const def: Record<string, string> = {
      title: field.bezeichnungEingabe ?? field.name,
    };

    switch (field.feldart) {
      case "input":
        {
          Object.assign(def, DATENTYP_TO_TYPE[field.datentyp]);
        }
        break;
      case "select": {
        Object.assign(def, {});
      }
    }

    defs[field.identifier] = {
      title: field.bezeichnungEingabe,
      ...DATENTYP_TO_TYPE[field.datentyp],
    };
  }
}
