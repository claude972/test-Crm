import {
  type HermesMcpTool,
  type HermesMcpToolSurfaceReadState,
  readHermesMcpStatus,
} from '@/hermes-admin-runtime/types/HermesMcpToolSurface';

// La surface est un DTO typé, mais son état et ses booléens arrivent en
// valeurs brutes : chacun est donc réduit champ par champ. Une charge dont la
// forme ne correspond pas devient 'unreadable' — jamais une surface vide, qui
// se lirait comme « aucun outil annoncé ».
//
// Rien ici ne déduit. Un accord n'est pas déduit de la présence d'un outil, et
// « appelable » n'est jamais déduit de l'absence de refus.

type JsonObject = Record<string, unknown>;

const isJsonObject = (value: unknown): value is JsonObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const readString = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
};

const readBoolean = (value: unknown): boolean | null =>
  typeof value === 'boolean' ? value : null;

const readStringList = (value: unknown): string[] =>
  Array.isArray(value)
    ? value
        .map(readString)
        .filter((entry): entry is string => entry !== null)
    : [];

const readTool = (value: unknown): HermesMcpTool => {
  const tool = isJsonObject(value) ? value : {};

  return {
    name: readString(tool.name),
    title: readString(tool.title),
    authorized: readBoolean(tool.authorized),
    callable: readBoolean(tool.callable),
    refusals: readStringList(tool.refusals),
    isDraftingTool: readBoolean(tool.isDraftingTool),
  };
};

export const readHermesMcpToolSurface = (
  payload: unknown,
): HermesMcpToolSurfaceReadState => {
  if (!isJsonObject(payload)) {
    return { kind: 'unreadable' };
  }

  const status = readHermesMcpStatus(payload.status);

  if (status === null) {
    return { kind: 'unreadable' };
  }

  return {
    kind: 'read',
    status,
    checkedAt: readString(payload.checkedAt),
    errorCode: readString(payload.errorCode),
    authorizedTools: readStringList(payload.authorizedTools),
    draftingTool: readString(payload.draftingTool),
    // Lu, jamais ramené à false : un `truncated` absent est une complétude
    // inconnue, et présenter un préfixe comme l'ensemble est exactement
    // l'erreur que ce champ existe pour empêcher.
    truncated: readBoolean(payload.truncated),
    tools: Array.isArray(payload.tools) ? payload.tools.map(readTool) : [],
  };
};
