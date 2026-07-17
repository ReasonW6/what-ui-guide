import {
  defaultAiProviderSelection,
  getAiProviderPreset,
  isAiProviderId,
  normalizeAiApiKey,
  resolveAiProvider,
  type AiProviderProtocol,
  type AiProviderSelection,
} from "../ai-provider-config";
import {
  createCredentialVault,
  type ApiCredential,
  type ProviderProtocol,
} from "./credential-vault";

const ACTIVE_CREDENTIAL_ID = "active-ai-provider";
const VAULT_LOCK_NAME = "what-ui:credential-vault";
const VAULT_CHANNEL_NAME = "what-ui:credential-events";

let currentSelection: AiProviderSelection = { ...defaultAiProviderSelection };
let hydrationPromise: Promise<ProviderSessionSnapshot> | null = null;
let hydrationComplete = false;
let rememberedSelection = false;
let sessionRevision = 0;
let mutationGeneration = 0;
let credentialChannel: BroadcastChannel | null | undefined;
const sessionListeners = new Set<(snapshot: ProviderSessionSnapshot) => void>();

export interface ProviderSessionSnapshot {
  readonly selection: AiProviderSelection;
  readonly remembered: boolean;
  readonly storageWarning?: string;
}

function cloneSelection(selection: AiProviderSelection): AiProviderSelection {
  return { ...selection };
}

function snapshot(storageWarning?: string): ProviderSessionSnapshot {
  return {
    selection: getProviderSession(),
    remembered: rememberedSelection,
    ...(storageWarning ? { storageWarning } : {}),
  };
}

function emitSessionChange(next = snapshot()): void {
  for (const listener of sessionListeners) listener(next);
}

function clearSessionMemory(): AiProviderSelection {
  currentSelection = { ...defaultAiProviderSelection };
  rememberedSelection = false;
  sessionRevision += 1;
  mutationGeneration += 1;
  hydrationComplete = true;
  hydrationPromise = Promise.resolve(snapshot());
  return getProviderSession();
}

function getCredentialChannel(): BroadcastChannel | null {
  if (credentialChannel !== undefined) return credentialChannel;
  credentialChannel = typeof BroadcastChannel === "function"
    ? new BroadcastChannel(VAULT_CHANNEL_NAME)
    : null;
  if (credentialChannel) {
    credentialChannel.onmessage = (event: MessageEvent<unknown>) => {
      if (
        event.data
        && typeof event.data === "object"
        && (event.data as { type?: unknown }).type === "cleared"
      ) {
        clearSessionMemory();
        emitSessionChange();
      }
    };
  }
  return credentialChannel;
}

async function withVaultLock<T>(operation: () => Promise<T>): Promise<T> {
  if (typeof navigator !== "undefined" && navigator.locks) {
    return navigator.locks.request(VAULT_LOCK_NAME, operation);
  }
  return operation();
}

function toVaultProtocol(protocol: AiProviderProtocol): ProviderProtocol {
  return protocol === "openai-chat" ? "openai-chat-completions" : protocol;
}

function fromVaultProtocol(protocol: ProviderProtocol): AiProviderProtocol {
  return protocol === "openai-chat-completions" ? "openai-chat" : protocol;
}

function credentialToSelection(credential: ApiCredential): AiProviderSelection {
  if (!isAiProviderId(credential.providerId)) {
    throw new Error("本地保存的 AI 服务商已不受支持。");
  }
  const customProtocol = fromVaultProtocol(credential.protocol);
  const selection: AiProviderSelection = {
    providerId: credential.providerId,
    model: credential.model ?? "",
    customBaseUrl: credential.providerId === "custom" ? credential.baseUrl : "",
    customProtocol,
    apiKey: credential.apiKey,
  };
  resolveAiProvider(
    selection.providerId,
    selection.model,
    selection.customBaseUrl,
    selection.customProtocol,
  );
  return selection;
}

function selectionToCredential(selection: AiProviderSelection): ApiCredential {
  const provider = resolveAiProvider(
    selection.providerId,
    selection.model,
    selection.customBaseUrl,
    selection.customProtocol,
  );
  if (!selection.apiKey.trim()) {
    throw new Error("请先填写 API Key，再启用本地加密保存。");
  }
  return {
    id: ACTIVE_CREDENTIAL_ID,
    label: provider.label,
    providerId: provider.id,
    protocol: toVaultProtocol(provider.protocol),
    baseUrl: provider.baseUrl,
    apiKey: normalizeAiApiKey(selection.apiKey),
    model: provider.model,
  };
}

export function getProviderSession(): AiProviderSelection {
  return cloneSelection(currentSelection);
}

export function getProviderSessionSnapshot(): ProviderSessionSnapshot {
  return snapshot();
}

export function setProviderSession(selection: AiProviderSelection): void {
  currentSelection = cloneSelection(selection);
  sessionRevision += 1;
  if (hydrationComplete) {
    hydrationPromise = Promise.resolve({
      selection: getProviderSession(),
      remembered: rememberedSelection,
    });
  }
}

export function resetProviderSession(): AiProviderSelection {
  return clearSessionMemory();
}

export function subscribeProviderSession(
  listener: (snapshot: ProviderSessionSnapshot) => void,
): () => void {
  sessionListeners.add(listener);
  getCredentialChannel();
  return () => sessionListeners.delete(listener);
}

export function hydrateProviderSession(): Promise<ProviderSessionSnapshot> {
  if (!hydrationPromise) {
    const startingRevision = sessionRevision;
    const startingGeneration = mutationGeneration;
    hydrationPromise = (async () => {
      getCredentialChannel();
      const saved = await withVaultLock(() =>
        createCredentialVault().get(ACTIVE_CREDENTIAL_ID));
      if (mutationGeneration !== startingGeneration) return snapshot();
      if (saved && sessionRevision === startingRevision) {
        currentSelection = credentialToSelection(saved);
      }
      rememberedSelection = Boolean(saved);
      hydrationComplete = true;
      return {
        selection: getProviderSession(),
        remembered: rememberedSelection,
      };
    })().catch((error) => {
      hydrationPromise = null;
      hydrationComplete = false;
      throw error;
    });
  }
  return hydrationPromise;
}

export async function persistProviderSession(
  selection: AiProviderSelection,
  remember: boolean,
): Promise<ProviderSessionSnapshot> {
  const normalizedSelection = selection.apiKey.trim()
    ? { ...selection, apiKey: normalizeAiApiKey(selection.apiKey) }
    : selection;
  setProviderSession(normalizedSelection);
  mutationGeneration += 1;
  getCredentialChannel();
  if (remember) {
    await withVaultLock(() =>
      createCredentialVault().save(selectionToCredential(normalizedSelection)));
    rememberedSelection = true;
    hydrationComplete = true;
    const next = snapshot();
    hydrationPromise = Promise.resolve(next);
    return next;
  }

  let storageWarning = "";
  try {
    await withVaultLock(() =>
      createCredentialVault().remove(ACTIVE_CREDENTIAL_ID));
  } catch {
    storageWarning = "本次会话配置已应用，但无法删除此前保存的本地记录。";
  }
  rememberedSelection = Boolean(storageWarning);
  hydrationComplete = true;
  const next = snapshot(storageWarning);
  hydrationPromise = Promise.resolve(next);
  return next;
}

export async function clearRememberedProviderSession(): Promise<AiProviderSelection> {
  const selection = clearSessionMemory();
  try {
    await withVaultLock(() =>
      createCredentialVault().remove(ACTIVE_CREDENTIAL_ID));
  } catch (error) {
    rememberedSelection = true;
    hydrationPromise = null;
    hydrationComplete = false;
    throw error;
  }
  getCredentialChannel()?.postMessage({ type: "cleared" });
  return selection;
}

export function updateProviderSelection(
  selection: AiProviderSelection,
  providerId: AiProviderSelection["providerId"],
): AiProviderSelection {
  if (providerId === "custom") {
    return {
      ...selection,
      providerId,
      model: "",
      customBaseUrl: "",
      customProtocol: "openai-chat",
      apiKey: "",
    };
  }
  const preset = getAiProviderPreset(providerId);
  return {
    ...selection,
    providerId,
    model: preset.defaultModel,
    customBaseUrl: "",
    customProtocol: preset.protocol,
    apiKey: "",
  };
}
