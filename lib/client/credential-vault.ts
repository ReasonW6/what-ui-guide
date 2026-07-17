export type ProviderProtocol =
  | "openai-responses"
  | "openai-chat-completions"
  | "anthropic-messages";

export type ApiCredential = Readonly<{
  id: string;
  label: string;
  providerId: string;
  protocol: ProviderProtocol;
  baseUrl: string;
  apiKey: string;
  model?: string;
}>;

export type CredentialSummary = Omit<ApiCredential, "apiKey"> & {
  maskedKey: string;
  updatedAt: number;
};

export type CredentialVaultErrorCode =
  | "corrupt"
  | "invalid_credential"
  | "unavailable";

export class CredentialVaultError extends Error {
  readonly code: CredentialVaultErrorCode;

  constructor(code: CredentialVaultErrorCode, message: string) {
    super(message);
    this.name = "CredentialVaultError";
    this.code = code;
  }
}

export type EncryptedCredentialRecordV1 = Readonly<{
  id: string;
  version: 1;
  algorithm: "AES-GCM";
  key: CryptoKey;
  iv: ArrayBuffer;
  ciphertext: ArrayBuffer;
  updatedAt: number;
}>;

export type CredentialVault = Readonly<{
  save(value: ApiCredential): Promise<void>;
  get(id: string): Promise<ApiCredential | null>;
  list(): Promise<CredentialSummary[]>;
  remove(id: string): Promise<void>;
  clear(): Promise<void>;
}>;

type CredentialCryptoOptions = Readonly<{
  crypto?: Crypto;
  now?: () => number;
}>;

type CredentialVaultDependencies = CredentialCryptoOptions & Readonly<{
  indexedDB?: IDBFactory;
}>;

const DATABASE_NAME = "what-ui-private";
const DATABASE_VERSION = 1;
const CREDENTIAL_STORE = "credentials";
const AES_GCM_IV_BYTES = 12;
const AES_GCM_TAG_BITS = 128;
const MAX_CIPHERTEXT_BYTES = 32 * 1024;
const PROTOCOLS = new Set<ProviderProtocol>([
  "openai-responses",
  "openai-chat-completions",
  "anthropic-messages",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function invalidCredential(message: string): never {
  throw new CredentialVaultError("invalid_credential", message);
}

function corruptRecord(message = "本地 API 凭据已损坏，请删除后重新配置。"): never {
  throw new CredentialVaultError("corrupt", message);
}

function unavailable(message = "当前浏览器无法使用本地凭据保险库。"): never {
  throw new CredentialVaultError("unavailable", message);
}

function requiredText(
  value: unknown,
  field: string,
  maxLength: number,
): string {
  if (typeof value !== "string" || !value.trim() || value.length > maxLength) {
    invalidCredential(`${field} 格式无效。`);
  }
  return value;
}

function validateCredential(value: unknown): ApiCredential {
  if (!isRecord(value)) invalidCredential("API 凭据必须是对象。");

  const id = requiredText(value.id, "凭据 ID", 128);
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(id)) {
    invalidCredential("凭据 ID 格式无效。");
  }

  const label = requiredText(value.label, "凭据名称", 120);
  const providerId = requiredText(value.providerId, "服务商 ID", 64);
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(providerId)) {
    invalidCredential("服务商 ID 格式无效。");
  }

  if (typeof value.protocol !== "string" || !PROTOCOLS.has(value.protocol as ProviderProtocol)) {
    invalidCredential("API 协议不受支持。");
  }
  const protocol = value.protocol as ProviderProtocol;

  const baseUrl = requiredText(value.baseUrl, "API 地址", 2_048);
  try {
    const parsed = new URL(baseUrl);
    if (
      (parsed.protocol !== "https:" && parsed.protocol !== "http:")
      || parsed.username
      || parsed.password
    ) {
      invalidCredential("API 地址格式无效。");
    }
  } catch (error) {
    if (error instanceof CredentialVaultError) throw error;
    invalidCredential("API 地址格式无效。");
  }

  const apiKey = requiredText(value.apiKey, "API Key", 8_192);
  let model: string | undefined;
  if (value.model !== undefined) {
    model = requiredText(value.model, "模型名称", 200);
  }

  return model === undefined
    ? { id, label, providerId, protocol, baseUrl, apiKey }
    : { id, label, providerId, protocol, baseUrl, apiKey, model };
}

function resolveCrypto(value?: Crypto): Crypto {
  const resolved = value ?? globalThis.crypto;
  if (!resolved?.subtle || typeof resolved.getRandomValues !== "function") {
    unavailable("当前浏览器不支持 Web Crypto，无法安全保存 API Key。");
  }
  return resolved;
}

function resolveIndexedDB(value?: IDBFactory): IDBFactory {
  const resolved = value ?? globalThis.indexedDB;
  if (!resolved || typeof resolved.open !== "function") {
    unavailable("当前浏览器不支持 IndexedDB，无法保存 API Key。");
  }
  return resolved;
}

function associatedData(id: string): ArrayBuffer {
  return new TextEncoder()
    .encode(`what-ui:credential:v1:AES-GCM:${id}`)
    .slice()
    .buffer;
}

function validateEncryptedRecord(value: unknown): EncryptedCredentialRecordV1 {
  if (!isRecord(value)) corruptRecord();
  if (value.version !== 1 || value.algorithm !== "AES-GCM") corruptRecord();

  const id = value.id;
  if (
    typeof id !== "string"
    || !id
    || id.length > 128
    || !/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(id)
  ) {
    corruptRecord();
  }

  const key = value.key;
  if (
    !key
    || typeof key !== "object"
    || (key as CryptoKey).type !== "secret"
    || (key as CryptoKey).extractable !== false
    || (key as CryptoKey).algorithm?.name !== "AES-GCM"
    || !(key as CryptoKey).usages?.includes("encrypt")
    || !(key as CryptoKey).usages?.includes("decrypt")
  ) {
    corruptRecord();
  }

  if (!(value.iv instanceof ArrayBuffer) || value.iv.byteLength !== AES_GCM_IV_BYTES) {
    corruptRecord();
  }
  if (
    !(value.ciphertext instanceof ArrayBuffer)
    || value.ciphertext.byteLength <= AES_GCM_TAG_BITS / 8
    || value.ciphertext.byteLength > MAX_CIPHERTEXT_BYTES
  ) {
    corruptRecord();
  }
  if (
    typeof value.updatedAt !== "number"
    || !Number.isFinite(value.updatedAt)
    || value.updatedAt < 0
  ) {
    corruptRecord();
  }

  return {
    id,
    version: 1,
    algorithm: "AES-GCM",
    key: key as CryptoKey,
    iv: value.iv,
    ciphertext: value.ciphertext,
    updatedAt: value.updatedAt,
  };
}

export async function sealCredentialForStorage(
  value: ApiCredential,
  options: CredentialCryptoOptions = {},
): Promise<EncryptedCredentialRecordV1> {
  const credential = validateCredential(value);
  const crypto = resolveCrypto(options.crypto);
  const now = options.now?.() ?? Date.now();
  if (!Number.isFinite(now) || now < 0) unavailable("无法生成有效的凭据时间戳。");

  try {
    const key = await crypto.subtle.generateKey(
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"],
    );
    const iv = crypto.getRandomValues(new Uint8Array(AES_GCM_IV_BYTES));
    const plaintext = new TextEncoder().encode(JSON.stringify(credential));
    try {
      const ciphertext = await crypto.subtle.encrypt(
        {
          name: "AES-GCM",
          iv,
          additionalData: associatedData(credential.id),
          tagLength: AES_GCM_TAG_BITS,
        },
        key,
        plaintext,
      );
      return {
        id: credential.id,
        version: 1,
        algorithm: "AES-GCM",
        key,
        iv: iv.slice().buffer,
        ciphertext,
        updatedAt: now,
      };
    } finally {
      plaintext.fill(0);
    }
  } catch (error) {
    if (error instanceof CredentialVaultError) throw error;
    unavailable("浏览器无法加密 API Key。");
  }
}

export async function openCredentialFromStorage(
  value: unknown,
  options: Pick<CredentialCryptoOptions, "crypto"> = {},
): Promise<ApiCredential> {
  const record = validateEncryptedRecord(value);
  const crypto = resolveCrypto(options.crypto);

  let plaintext: ArrayBuffer;
  try {
    plaintext = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: record.iv,
        additionalData: associatedData(record.id),
        tagLength: AES_GCM_TAG_BITS,
      },
      record.key,
      record.ciphertext,
    );
  } catch {
    corruptRecord();
  }

  const bytes = new Uint8Array(plaintext);
  try {
    const parsed: unknown = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
    const credential = validateCredential(parsed);
    if (credential.id !== record.id) corruptRecord();
    return credential;
  } catch (error) {
    if (error instanceof CredentialVaultError && error.code === "corrupt") throw error;
    corruptRecord();
  } finally {
    bytes.fill(0);
  }
}

function maskApiKey(value: string): string {
  if (value.length <= 8) return "••••••••";
  return `${value.slice(0, 3)}••••${value.slice(-4)}`;
}

function openDatabase(indexedDB: IDBFactory): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(CREDENTIAL_STORE)) {
        request.result.createObjectStore(CREDENTIAL_STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => {
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("Credential database is blocked."));
  });
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error);
    transaction.onerror = () => reject(transaction.error);
  });
}

async function withDatabase<T>(
  indexedDB: IDBFactory,
  operation: (database: IDBDatabase) => Promise<T>,
): Promise<T> {
  let database: IDBDatabase | undefined;
  try {
    database = await openDatabase(indexedDB);
    return await operation(database);
  } catch (error) {
    if (error instanceof CredentialVaultError) throw error;
    return unavailable("无法访问浏览器中的本地凭据保险库。");
  } finally {
    database?.close();
  }
}

export function createCredentialVault(
  dependencies: CredentialVaultDependencies = {},
): CredentialVault {
  const crypto = resolveCrypto(dependencies.crypto);
  const indexedDB = resolveIndexedDB(dependencies.indexedDB);
  const cryptoOptions = { crypto, now: dependencies.now };

  return {
    async save(value) {
      const record = await sealCredentialForStorage(value, cryptoOptions);
      await withDatabase(indexedDB, async (database) => {
        const transaction = database.transaction(CREDENTIAL_STORE, "readwrite");
        const done = transactionDone(transaction);
        transaction.objectStore(CREDENTIAL_STORE).put(record);
        await done;
      });
    },

    async get(id) {
      const safeId = requiredText(id, "凭据 ID", 128);
      const stored = await withDatabase(indexedDB, async (database) => {
        const transaction = database.transaction(CREDENTIAL_STORE, "readonly");
        const done = transactionDone(transaction);
        const request = transaction.objectStore(CREDENTIAL_STORE).get(safeId);
        try {
          const result: unknown = await requestResult(request);
          await done;
          return result;
        } catch (error) {
          await done.catch(() => undefined);
          throw error;
        }
      });
      return stored === undefined
        ? null
        : openCredentialFromStorage(stored, { crypto });
    },

    async list() {
      const stored = await withDatabase(indexedDB, async (database) => {
        const transaction = database.transaction(CREDENTIAL_STORE, "readonly");
        const done = transactionDone(transaction);
        const request = transaction.objectStore(CREDENTIAL_STORE).getAll();
        try {
          const result: unknown[] = await requestResult(request);
          await done;
          return result;
        } catch (error) {
          await done.catch(() => undefined);
          throw error;
        }
      });

      const summaries = await Promise.all(stored.map(async (value) => {
        const record = validateEncryptedRecord(value);
        const credential = await openCredentialFromStorage(record, { crypto });
        const { apiKey, ...summary } = credential;
        return {
          ...summary,
          maskedKey: maskApiKey(apiKey),
          updatedAt: record.updatedAt,
        };
      }));
      return summaries.sort((left, right) => right.updatedAt - left.updatedAt);
    },

    async remove(id) {
      const safeId = requiredText(id, "凭据 ID", 128);
      await withDatabase(indexedDB, async (database) => {
        const transaction = database.transaction(CREDENTIAL_STORE, "readwrite");
        const done = transactionDone(transaction);
        transaction.objectStore(CREDENTIAL_STORE).delete(safeId);
        await done;
      });
    },

    async clear() {
      await withDatabase(indexedDB, async (database) => {
        const transaction = database.transaction(CREDENTIAL_STORE, "readwrite");
        const done = transactionDone(transaction);
        transaction.objectStore(CREDENTIAL_STORE).clear();
        await done;
      });
    },
  };
}
