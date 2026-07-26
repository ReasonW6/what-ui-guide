export const PROVIDER_FETCH_TIMEOUT_MS = 45_000;
export const PROVIDER_FETCH_MAX_RESPONSE_BYTES = 1024 * 1024;

export interface BoundedProviderFetchOptions {
  readonly fetchImpl?: typeof fetch;
  readonly maxResponseBytes?: number;
  readonly signal?: AbortSignal;
  readonly timeoutMs?: number;
}

export interface BoundedProviderJsonResponse {
  readonly response: Response;
  readonly payload: unknown;
}

function abortReason(signal: AbortSignal): Error {
  return signal.reason instanceof Error
    ? signal.reason
    : new DOMException("The provider request was aborted.", "AbortError");
}

function readStreamChunk(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  signal: AbortSignal,
): Promise<ReadableStreamReadResult<Uint8Array>> {
  if (signal.aborted) return Promise.reject(abortReason(signal));
  return new Promise((resolve, reject) => {
    const onAbort = () => reject(abortReason(signal));
    signal.addEventListener("abort", onAbort, { once: true });
    reader.read().then(resolve, reject).finally(() => {
      signal.removeEventListener("abort", onAbort);
    });
  });
}

async function readBoundedJson(
  response: Response,
  signal: AbortSignal,
  maximumBytes: number,
): Promise<unknown> {
  const declaredLength = response.headers.get("content-length");
  if (
    declaredLength !== null
    && Number.isFinite(Number(declaredLength))
    && Number(declaredLength) > maximumBytes
  ) {
    await response.body?.cancel().catch(() => {});
    throw new Error("Provider response exceeded the allowed size.");
  }
  if (!response.body) return null;

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let received = 0;
  let text = "";
  try {
    while (true) {
      const { done, value } = await readStreamChunk(reader, signal);
      if (done) break;
      received += value.byteLength;
      if (received > maximumBytes) {
        throw new Error("Provider response exceeded the allowed size.");
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
  } catch (error) {
    await reader.cancel(error).catch(() => {});
    throw error;
  }

  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export async function fetchBoundedProviderJson(
  input: RequestInfo | URL,
  init: RequestInit = {},
  options: BoundedProviderFetchOptions = {},
): Promise<BoundedProviderJsonResponse> {
  const timeoutController = new AbortController();
  const timeoutMs = options.timeoutMs ?? PROVIDER_FETCH_TIMEOUT_MS;
  const timeout = setTimeout(() => {
    timeoutController.abort(new Error("Provider request timed out."));
  }, timeoutMs);
  const parentSignals = [init.signal, options.signal]
    .filter((signal): signal is AbortSignal => signal instanceof AbortSignal);
  const signal = AbortSignal.any([
    ...parentSignals,
    timeoutController.signal,
  ]);

  try {
    const response = await (options.fetchImpl ?? fetch)(input, {
      ...init,
      signal,
    });
    const payload = await readBoundedJson(
      response,
      signal,
      options.maxResponseBytes ?? PROVIDER_FETCH_MAX_RESPONSE_BYTES,
    );
    return { response, payload };
  } finally {
    clearTimeout(timeout);
  }
}
