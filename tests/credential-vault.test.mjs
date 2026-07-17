import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import test from "node:test";
import { loadCredentialVaultModule } from "./credential-vault-loader.mjs";

const vault = await loadCredentialVaultModule();

const credential = {
  id: "openai-primary",
  label: "OpenAI",
  providerId: "openai",
  protocol: "openai-responses",
  baseUrl: "https://api.openai.com/v1",
  apiKey: "sk-test-secret-that-must-not-be-plaintext",
  model: "gpt-5.6-sol",
};

test("credential records round-trip through a non-extractable AES-GCM key", async () => {
  const record = await vault.sealCredentialForStorage(credential, {
    crypto: webcrypto,
    now: () => 1_234,
  });

  assert.equal(record.version, 1);
  assert.equal(record.algorithm, "AES-GCM");
  assert.equal(record.updatedAt, 1_234);
  assert.equal(record.iv.byteLength, 12);
  assert.equal(record.key.type, "secret");
  assert.equal(record.key.extractable, false);
  assert.deepEqual(record.key.usages, ["encrypt", "decrypt"]);
  assert.ok(record.ciphertext.byteLength > credential.apiKey.length);
  assert.equal(
    Buffer.from(record.ciphertext).toString("utf8").includes(credential.apiKey),
    false,
  );

  await assert.rejects(webcrypto.subtle.exportKey("raw", record.key));
  assert.deepEqual(
    await vault.openCredentialFromStorage(record, { crypto: webcrypto }),
    credential,
  );
});

test("each save uses a fresh key, IV, and ciphertext", async () => {
  const [left, right] = await Promise.all([
    vault.sealCredentialForStorage(credential, { crypto: webcrypto }),
    vault.sealCredentialForStorage(credential, { crypto: webcrypto }),
  ]);

  assert.notEqual(left.key, right.key);
  assert.notDeepEqual(Buffer.from(left.iv), Buffer.from(right.iv));
  assert.notDeepEqual(Buffer.from(left.ciphertext), Buffer.from(right.ciphertext));
});

test("tampering with ciphertext or authenticated record identity fails closed", async () => {
  const record = await vault.sealCredentialForStorage(credential, { crypto: webcrypto });
  const ciphertext = record.ciphertext.slice(0);
  new Uint8Array(ciphertext)[0] ^= 1;

  await assert.rejects(
    vault.openCredentialFromStorage({ ...record, ciphertext }, { crypto: webcrypto }),
    (error) => error.code === "corrupt",
  );
  await assert.rejects(
    vault.openCredentialFromStorage(
      { ...record, id: "openai-secondary" },
      { crypto: webcrypto },
    ),
    (error) => error.code === "corrupt",
  );
  await assert.rejects(
    vault.openCredentialFromStorage({ ...record, version: 2 }, { crypto: webcrypto }),
    (error) => error.code === "corrupt",
  );
});

test("credential validation rejects unsupported protocols and malformed URLs", async () => {
  await assert.rejects(
    vault.sealCredentialForStorage(
      { ...credential, protocol: "arbitrary-http" },
      { crypto: webcrypto },
    ),
    (error) => error.code === "invalid_credential",
  );
  await assert.rejects(
    vault.sealCredentialForStorage(
      { ...credential, baseUrl: "https://user:password@example.com/v1" },
      { crypto: webcrypto },
    ),
    (error) => error.code === "invalid_credential",
  );
});
