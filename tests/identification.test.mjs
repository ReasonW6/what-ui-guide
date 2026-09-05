import assert from "node:assert/strict";
import test from "node:test";
import { deflateSync } from "node:zlib";
import { loadIdentificationModules } from "./identification-loader.mjs";

const { contract, openai, capture } = await loadIdentificationModules();

const allowedSlugs = ["combobox", "select", "dialog"];

function imageDataUrl(mediaType, bytes) {
  return `data:${mediaType};base64,${Buffer.from(bytes).toString("base64")}`;
}

const validImageBytes = {
  png: Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAADUlEQVQImWP4z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==",
    "base64",
  ),
  jpeg: Buffer.from(
    "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAF//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABBQJ//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAwEBPwF//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAgEBPwF//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQAGPwJ//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPyF//9oADAMBAAIAAwAAABD/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAEDAQE/EB//xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAECAQE/EB//xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAE/EB//2Q==",
    "base64",
  ),
  webpVp8: Buffer.from(
    "UklGRjwAAABXRUJQVlA4IDAAAADQAQCdASoBAAEAAUAmJaACdLoB+AADsAD+8ut//NgVzXPv9//S4P0uD9Lg/9KQAAA=",
    "base64",
  ),
  webpVp8l: Buffer.from(
    "UklGRhwAAABXRUJQVlA4TA8AAAAvAAAAAAcQ/Y/+ByKi/wEA",
    "base64",
  ),
  webpVp8x: Buffer.from(
    "UklGRl4AAABXRUJQVlA4WAoAAAAQAAAAAQAAAAAAQUxQSAMAAAAAgP8AVlA4IDQAAAAwAgCdASoCAAEAAUAmJaACdLoB+AADIQb7gADOP1oXdYgj//Xo/no/no/yUf/FnIxHZeAA",
    "base64",
  ),
};

const crc32Table = Uint32Array.from({ length: 256 }, (_, value) => {
  let crc = value;
  for (let bit = 0; bit < 8; bit += 1) {
    crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb8_8320 : 0);
  }
  return crc >>> 0;
});

function crc32(bytes) {
  let crc = 0xffff_ffff;
  for (const byte of bytes) {
    crc = crc32Table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffff_ffff) >>> 0;
}

function pngChunk(type, data) {
  const chunk = Buffer.alloc(12 + data.length);
  chunk.writeUInt32BE(data.length, 0);
  chunk.write(type, 4, "ascii");
  data.copy(chunk, 8);
  chunk.writeUInt32BE(crc32(chunk.subarray(4, 8 + data.length)), 8 + data.length);
  return chunk;
}

function encodedRgbaPng(
  width,
  height,
  level,
  scanlines = Buffer.alloc(height * (1 + width * 4)),
) {
  return encodedRgbaPngFromData(
    width,
    height,
    deflateSync(scanlines, { level }),
  );
}

function encodedRgbaPngFromData(width, height, compressed) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  return Buffer.concat([
    validImageBytes.png.subarray(0, 8),
    pngChunk("IHDR", header),
    pngChunk("IDAT", compressed),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

function pngBytes(width, height) {
  const bytes = Buffer.from(validImageBytes.png);
  bytes.writeUInt32BE(width, 16);
  bytes.writeUInt32BE(height, 20);
  bytes.writeUInt32BE(crc32(bytes.subarray(12, 29)), 29);
  return bytes;
}

function jpegBytes(width, height) {
  const bytes = Buffer.from(validImageBytes.jpeg);
  const startOfFrame = bytes.indexOf(Buffer.from([0xff, 0xc0]));
  assert.notEqual(startOfFrame, -1);
  bytes.writeUInt16BE(height, startOfFrame + 5);
  bytes.writeUInt16BE(width, startOfFrame + 7);
  return bytes;
}

function findWebpChunk(bytes, format) {
  let offset = 12;
  while (offset + 8 <= bytes.length) {
    const chunkFormat = bytes.toString("ascii", offset, offset + 4);
    const length = bytes.readUInt32LE(offset + 4);
    if (chunkFormat === format) return offset + 8;
    offset += 8 + length + (length % 2);
  }
  return -1;
}

function webpBytes(format, width, height) {
  const source = format === "VP8 "
    ? validImageBytes.webpVp8
    : format === "VP8L"
      ? validImageBytes.webpVp8l
      : validImageBytes.webpVp8x;
  const bytes = Buffer.from(source);
  if (format === "VP8X") {
    const extended = findWebpChunk(bytes, "VP8X");
    assert.notEqual(extended, -1);
    bytes.writeUIntLE(width - 1, extended + 4, 3);
    bytes.writeUIntLE(height - 1, extended + 7, 3);
    const vp8 = findWebpChunk(bytes, "VP8 ");
    assert.notEqual(vp8, -1);
    bytes.writeUInt16LE(width, vp8 + 6);
    bytes.writeUInt16LE(height, vp8 + 8);
  } else if (format === "VP8 ") {
    const vp8 = findWebpChunk(bytes, "VP8 ");
    assert.notEqual(vp8, -1);
    bytes.writeUInt16LE(width, vp8 + 6);
    bytes.writeUInt16LE(height, vp8 + 8);
  } else {
    const vp8l = findWebpChunk(bytes, "VP8L");
    assert.notEqual(vp8l, -1);
    bytes.writeUInt32LE((width - 1) + (height - 1) * (2 ** 14), vp8l + 1);
  }
  return bytes;
}

const screenshots = {
  png: imageDataUrl("image/png", pngBytes(1, 1)),
  jpeg: imageDataUrl("image/jpeg", jpegBytes(1, 1)),
  webp: imageDataUrl("image/webp", webpBytes("VP8 ", 1, 1)),
  gif: `data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==`,
};

function makeResult(overrides = {}) {
  return {
    status: "identified",
    summary: "这是一个允许输入筛选的组合框。",
    candidates: [
      {
        slug: "combobox",
        confidence: "high",
        evidence: ["输入框下方显示候选列表"],
        distinction: "与 Select 不同，它允许直接输入筛选。",
        implementation: {
          anatomy: ["输入框", "候选列表"],
          behavior: ["输入时过滤候选项"],
          styling: ["保持输入框与浮层对齐"],
          accessibility: ["使用 combobox 与 listbox 语义"],
        },
      },
    ],
    uncertainties: [],
    followUpQuestion: null,
    ...overrides,
  };
}

test("screenshot data URLs accept supported signatures and enforce 8 MiB", async () => {
  for (const [name, dataUrl] of Object.entries(screenshots)) {
    const result = await contract.validateScreenshotDataUrl(dataUrl);
    assert.match(result.mediaType, /^image\/(png|jpeg|webp|gif)$/);
    assert.ok(result.byteLength > 0, name);
    assert.equal(result.width, 1, name);
    assert.equal(result.height, 1, name);
  }

  await assert.rejects(
    () => contract.validateScreenshotDataUrl("data:image/svg+xml;base64,PHN2Zz4="),
    (error) => error.code === "invalid_screenshot",
  );
  await assert.rejects(
    () => contract.validateScreenshotDataUrl(
      imageDataUrl("image/png", Uint8Array.from([0xff, 0xd8, 0xff, 0xe0])),
    ),
    /do not match/i,
  );

  const staticGif = Buffer.from(screenshots.gif.split(",")[1], "base64");
  const imageDescriptor = staticGif.indexOf(0x2c);
  const animatedGif = Buffer.concat([
    staticGif.subarray(0, staticGif.length - 1),
    staticGif.subarray(imageDescriptor, staticGif.length - 1),
    Buffer.from([0x3b]),
  ]);
  await assert.rejects(
    () => contract.validateScreenshotDataUrl(imageDataUrl("image/gif", animatedGif)),
    /Animated GIF/i,
  );

  const animatedWebp = Buffer.from(
    "UklGRsIAAABXRUJQVlA4WAoAAAACAAAAAAAAAAAAQU5JTQYAAAD/////AABBTk1GSAAAAAAAAAAAAAAAAAAAAGQAAAJWUDggMAAAANABAJ0BKgEAAQABQCYloAJ0ugH4AAOwAP7y63/82BXNc+/3/9Lg/S4P0uD/0pAAAEFOTUZGAAAAAAAAAAAAAAAAAAAAZAAAAFZQOCAuAAAAlAEAnQEqAQABAAAAJiWgAnS6AAOYAP77VeP/pcH/0uD/6XB/6XB/G7LOG6QAAA==",
    "base64",
  );
  await assert.rejects(
    () => contract.validateScreenshotDataUrl(imageDataUrl("image/webp", animatedWebp)),
    /Animated WebP/i,
  );

  const oversizedFrameGif = Buffer.from(staticGif);
  oversizedFrameGif.writeUInt16LE(1, 6);
  oversizedFrameGif.writeUInt16LE(1, 8);
  oversizedFrameGif.writeUInt16LE(8_193, imageDescriptor + 5);
  oversizedFrameGif.writeUInt16LE(1, imageDescriptor + 7);
  await assert.rejects(
    () => contract.validateScreenshotDataUrl(imageDataUrl("image/gif", oversizedFrameGif)),
    (error) => error.code === "screenshot_too_large",
  );

  const oversized = Buffer.alloc(contract.MAX_SCREENSHOT_BYTES + 1);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(oversized);
  await assert.rejects(
    () => contract.validateScreenshotDataUrl(imageDataUrl("image/png", oversized)),
    (error) => error.code === "screenshot_too_large",
  );
});

test("screenshot validation rejects structurally truncated or trailing image data", async () => {
  const cases = [
    ["PNG", "image/png", validImageBytes.png],
    ["JPEG", "image/jpeg", validImageBytes.jpeg],
    ["WebP", "image/webp", validImageBytes.webpVp8],
    ["GIF", "image/gif", Buffer.from(screenshots.gif.split(",")[1], "base64")],
  ];

  for (const [name, mediaType, bytes] of cases) {
    for (const truncated of [
      bytes.subarray(0, Math.max(1, Math.floor(bytes.length / 2))),
      bytes.subarray(0, bytes.length - 1),
    ]) {
      await assert.rejects(
        () => contract.validateScreenshotDataUrl(imageDataUrl(mediaType, truncated)),
        (error) => error.code === "invalid_screenshot",
        `${name} truncation`,
      );
    }
    await assert.rejects(
      () => contract.validateScreenshotDataUrl(
        imageDataUrl(mediaType, Buffer.concat([bytes, Buffer.from([0])])),
      ),
      (error) => error.code === "invalid_screenshot",
      `${name} trailing bytes`,
    );
  }

  await assert.rejects(
    () => contract.validateScreenshotDataUrl(
      imageDataUrl("image/png", validImageBytes.png.subarray(0, 24)),
    ),
    (error) => error.code === "invalid_screenshot",
  );
});

test("PNG validation rejects a complete container with undecodable image data", async () => {
  const malformed = Buffer.concat([
    validImageBytes.png.subarray(0, 8),
    validImageBytes.png.subarray(8, 33),
    pngChunk("IDAT", Buffer.from([0])),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);

  await assert.rejects(
    () => contract.validateScreenshotDataUrl(imageDataUrl("image/png", malformed)),
    (error) => error.code === "invalid_screenshot",
  );
});

test("PNG validation streams DEFLATE and rejects truncated, trailing, oversized, checksum, and filter errors", async () => {
  for (const [level, expectedBlockType] of [[0, 0], [6, 2]]) {
    const png = encodedRgbaPng(64, 64, level);
    const imageDataType = png.indexOf(Buffer.from("IDAT"));
    assert.notEqual(imageDataType, -1);
    assert.equal((png[imageDataType + 6] >> 1) & 0x03, expectedBlockType);
    await assert.doesNotReject(() => contract.validateScreenshotDataUrl(
      imageDataUrl("image/png", png),
    ));
  }

  const scanline = Buffer.alloc(5);
  const compressed = deflateSync(scanline);
  const corruptChecksum = Buffer.from(compressed);
  corruptChecksum[corruptChecksum.length - 1] ^= 0xff;
  const malformedStreams = [
    compressed.subarray(0, compressed.length - 1),
    Buffer.concat([compressed, Buffer.from([0])]),
    deflateSync(Buffer.alloc(6)),
    corruptChecksum,
  ];
  for (const malformed of malformedStreams) {
    await assert.rejects(
      () => contract.validateScreenshotDataUrl(imageDataUrl(
        "image/png",
        encodedRgbaPngFromData(1, 1, malformed),
      )),
      (error) => error.code === "invalid_screenshot",
    );
  }

  const invalidFilterScanline = Buffer.from([5, 0, 0, 0, 0]);
  const invalidFilter = encodedRgbaPng(1, 1, 6, invalidFilterScanline);
  await assert.rejects(
    () => contract.validateScreenshotDataUrl(imageDataUrl("image/png", invalidFilter)),
    (error) => error.code === "invalid_screenshot",
  );
});

test("PNG structural validation handles a complete image near the byte budget", async () => {
  const metadataLength = contract.MAX_SCREENSHOT_BYTES
    - validImageBytes.png.length
    - 12;
  const metadata = Buffer.alloc(metadataLength, 0x61);
  Buffer.from("note\0", "ascii").copy(metadata);
  const nearLimit = Buffer.concat([
    validImageBytes.png.subarray(0, 33),
    pngChunk("tEXt", metadata),
    validImageBytes.png.subarray(33),
  ]);

  assert.equal(nearLimit.length, contract.MAX_SCREENSHOT_BYTES);
  await assert.doesNotReject(() => contract.validateScreenshotDataUrl(
    imageDataUrl("image/png", nearLimit),
  ));
});

test("public webpage URL normalization rejects unsafe destinations", () => {
  assert.equal(
    contract.normalizePublicWebpageUrl(" HTTPS://Example.COM/path?x=1#section "),
    "https://example.com/path?x=1",
  );

  for (const value of [
    "http://example.com/",
    "https://user:pass@example.com/",
    "https://example.com:443/",
    "https://localhost/",
    "https://service.internal/",
    "https://127.0.0.1/",
    "https://127.1/",
    "https://[2001:db8::1]/",
    "https://single-label/",
  ]) {
    assert.throws(
      () => contract.normalizePublicWebpageUrl(value),
      (error) => error.code === "unsafe_webpage_url",
      value,
    );
  }
  assert.throws(
    () => contract.normalizePublicWebpageUrl(
      `https://example.com/${"a".repeat(contract.MAX_WEBPAGE_URL_LENGTH)}`,
    ),
    (error) => error.code === "invalid_webpage_url",
  );
});

test("identification schema and validator enforce the shared result contract", () => {
  const schema = contract.createIdentificationResultJsonSchema(allowedSlugs);
  assert.deepEqual(
    schema.properties.candidates.items.properties.slug.enum,
    allowedSlugs,
  );
  assert.equal(schema.properties.candidates.maxItems, 3);
  assert.equal(schema.properties.uncertainties.maxItems, 5);
  assert.deepEqual(
    schema.properties.candidates.items.properties.implementation.required,
    ["anatomy", "behavior", "styling", "accessibility"],
  );
  assert.ok(
    schema.properties.candidates.items.required.includes("implementation"),
  );
  assert.ok(!schema.required.includes("implementation"));

  const validated = contract.validateIdentificationResult(makeResult(), allowedSlugs);
  assert.equal(validated.candidates[0].slug, "combobox");
  assert.deepEqual(
    contract.validateIdentificationResult(
      makeResult({
        status: "unknown",
        candidates: [],
      }),
      allowedSlugs,
    ).candidates,
    [],
  );

  const topLevelImplementationResult = makeResult();
  const candidateWithoutImplementation = {
    ...topLevelImplementationResult.candidates[0],
  };
  delete candidateWithoutImplementation.implementation;
  assert.throws(
    () => contract.validateIdentificationResult({
      ...topLevelImplementationResult,
      candidates: [candidateWithoutImplementation],
      implementation: makeResult().candidates[0].implementation,
    }, allowedSlugs),
    /top-level implementation is not supported/i,
  );

  assert.throws(
    () => contract.validateIdentificationResult(
      makeResult({ status: "identified", candidates: [] }),
      allowedSlugs,
    ),
    /at least one candidate/i,
  );
  assert.throws(
    () => contract.validateIdentificationResult(
      makeResult({
        candidates: [makeResult().candidates[0], makeResult().candidates[0]],
      }),
      allowedSlugs,
    ),
    /duplicated/i,
  );
  assert.throws(
    () => contract.validateIdentificationResult(
      makeResult({
        candidates: [{ ...makeResult().candidates[0], slug: "invented" }],
      }),
      allowedSlugs,
    ),
    /not in the catalog/i,
  );
  assert.throws(
    () => contract.validateIdentificationResult(
      makeResult({ uncertainties: ["1", "2", "3", "4", "5", "6"] }),
      allowedSlugs,
    ),
    /between 0 and 5/i,
  );
});

function successfulOpenAIResponse(result = makeResult(), annotations = []) {
  return {
    status: "completed",
    output: [
      {
        type: "message",
        content: [
          {
            type: "output_text",
            text: JSON.stringify(result),
            annotations,
          },
        ],
      },
    ],
  };
}

function baseOpenAIOptions(fetchImpl, input) {
  return {
    apiKey: "test-api-key",
    allowedSlugs,
    catalogKnowledge: JSON.stringify([{
      slug: "combobox",
      summary: "editable input plus listbox",
    }]),
    instructions: "Respond in concise Chinese and preserve catalog terminology.",
    input,
    fetchImpl,
  };
}

test("OpenAI screenshot request uses Responses, high image detail, and strict schema", async () => {
  let requestUrl;
  let requestInit;
  const fetchImpl = async (url, init) => {
    requestUrl = String(url);
    requestInit = init;
    return Response.json(successfulOpenAIResponse(makeResult(), [
      {
        type: "url_citation",
        title: "Component reference",
        url: "https://example.com/reference#combobox",
      },
      {
        type: "url_citation",
        title: "Duplicate",
        url: "https://example.com/reference",
      },
      {
        type: "url_citation",
        title: "Unsafe",
        url: "http://localhost/source",
      },
    ]));
  };

  const response = await openai.identifyWithOpenAI(baseOpenAIOptions(fetchImpl, {
    mode: "screenshot",
    imageDataUrl: screenshots.png,
  }));
  const body = JSON.parse(requestInit.body);

  assert.equal(requestUrl, openai.OPENAI_RESPONSES_ENDPOINT);
  assert.equal(requestInit.method, "POST");
  assert.equal(requestInit.headers.authorization, "Bearer test-api-key");
  assert.equal(body.model, "gpt-5.6-sol");
  assert.deepEqual(body.reasoning, { effort: "low" });
  assert.equal(body.store, false);
  assert.equal(body.max_output_tokens, 4096);
  assert.equal(body.input[0].content[1].type, "input_image");
  assert.equal(body.input[0].content[1].detail, "high");
  assert.equal(body.text.format.type, "json_schema");
  assert.equal(body.text.format.strict, true);
  assert.equal(body.tools, undefined);
  assert.equal(response.result.status, "identified");
  assert.deepEqual(response.sources, [
    { title: "Component reference", url: "https://example.com/reference" },
  ]);
});

test("catalog prompts preserve complete JSON entries and reject oversized catalogs", async () => {
  const catalogEntries = [
    { slug: "combobox", summary: "editable input plus listbox" },
    { slug: "dialog", summary: "modal surface", marker: "tail-entry" },
  ];
  const request = await openai.createOpenAIIdentificationRequest({
    ...baseOpenAIOptions(fetch, {
      mode: "screenshot",
      imageDataUrl: screenshots.png,
    }),
    catalogKnowledge: JSON.stringify(catalogEntries),
  });
  const embeddedCatalog = request.instructions.split("Catalog knowledge:\n").at(-1);
  assert.deepEqual(JSON.parse(embeddedCatalog), catalogEntries);

  await assert.rejects(
    () => openai.createOpenAIIdentificationRequest({
      ...baseOpenAIOptions(fetch, {
        mode: "screenshot",
        imageDataUrl: screenshots.png,
      }),
      catalogKnowledge: JSON.stringify([{
        slug: "combobox",
        summary: "x".repeat(64_000),
      }]),
    }),
    /catalogKnowledge exceeds/i,
  );
});

test("server screenshot validation enforces dimensions for PNG, JPEG, and WebP", async () => {
  const cases = [
    ["PNG", "image/png", pngBytes, [1, 1]],
    ["JPEG", "image/jpeg", jpegBytes, [4_000, 4_000]],
    ["WebP VP8", "image/webp", (width, height) => webpBytes("VP8 ", width, height), [4_000, 4_000]],
    ["WebP VP8L", "image/webp", (width, height) => webpBytes("VP8L", width, height), [4_000, 4_000]],
    ["WebP VP8X", "image/webp", (width, height) => webpBytes("VP8X", width, height), [4_000, 4_000]],
  ];

  for (const [name, mediaType, createBytes, validDimensions] of cases) {
    await assert.doesNotReject(
      () => contract.validateScreenshotDataUrl(
        imageDataUrl(mediaType, createBytes(...validDimensions)),
      ),
      name,
    );
    for (const [width, height] of [[8_193, 1], [5_000, 4_000]]) {
      await assert.rejects(
        () => contract.validateScreenshotDataUrl(
          imageDataUrl(mediaType, createBytes(width, height)),
        ),
        (error) => error.code === "screenshot_too_large",
        `${name} ${width}x${height}`,
      );
    }
  }
});

test("server GIF validation checks logical-screen and image-descriptor dimensions", async () => {
  const staticGif = Buffer.from(screenshots.gif.split(",")[1], "base64");
  const imageDescriptor = staticGif.indexOf(0x2c);

  const oversizedLogicalScreen = Buffer.from(staticGif);
  oversizedLogicalScreen.writeUInt16LE(5_000, 6);
  oversizedLogicalScreen.writeUInt16LE(4_000, 8);
  await assert.rejects(
    () => contract.validateScreenshotDataUrl(
      imageDataUrl("image/gif", oversizedLogicalScreen),
    ),
    (error) => error.code === "screenshot_too_large",
  );

  const smallScreenLargeFrame = Buffer.from(staticGif);
  smallScreenLargeFrame.writeUInt16LE(1, 6);
  smallScreenLargeFrame.writeUInt16LE(1, 8);
  smallScreenLargeFrame.writeUInt16LE(8_193, imageDescriptor + 5);
  smallScreenLargeFrame.writeUInt16LE(1, imageDescriptor + 7);
  await assert.rejects(
    () => contract.validateScreenshotDataUrl(
      imageDataUrl("image/gif", smallScreenLargeFrame),
    ),
    (error) => error.code === "screenshot_too_large",
  );
});

test("semantic URL mode restricts web_search to the exact source hostname", async () => {
  let body;
  const fetchImpl = async (url, init) => {
    assert.equal(String(url), openai.OPENAI_RESPONSES_ENDPOINT);
    body = JSON.parse(init.body);
    return Response.json({
      status: "completed",
      output_text: JSON.stringify(makeResult({ status: "ambiguous" })),
    });
  };

  const response = await openai.identifyWithOpenAI(baseOpenAIOptions(fetchImpl, {
    mode: "semantic-url",
    url: "https://docs.example.com/patterns#menu",
    snapshot: {
      screenshotDataUrl: screenshots.jpeg,
      markdown: "# Account menu",
      accessibilityTree: { role: "menu", name: "Account" },
    },
  }));

  assert.deepEqual(body.tools, [
    {
      type: "web_search",
      filters: { allowed_domains: ["docs.example.com"] },
    },
  ]);
  assert.equal(body.tool_choice, "auto");
  assert.match(body.input[0].content[0].text, /https:\/\/docs\.example\.com\/patterns/);
  assert.equal(body.input[0].content[1].detail, "high");
  assert.equal(response.result.status, "ambiguous");
});

test("OpenAI client reports refusals, upstream failures, and invalid output", async () => {
  const screenshotInput = { mode: "screenshot", imageDataUrl: screenshots.gif };

  await assert.rejects(
    openai.identifyWithOpenAI(baseOpenAIOptions(
      async () => Response.json({
        status: "completed",
        output: [{
          type: "message",
          content: [{ type: "refusal", refusal: "Unable to inspect this image." }],
        }],
      }),
      screenshotInput,
    )),
    (error) => error.code === "refusal" && /Unable to inspect/.test(error.message),
  );

  await assert.rejects(
    openai.identifyWithOpenAI(baseOpenAIOptions(
      async () => Response.json(
        { error: { message: "Rate limit reached" } },
        { status: 429 },
      ),
      screenshotInput,
    )),
    (error) => error.code === "upstream"
      && error.status === 429
      && error.retryable === true,
  );

  await assert.rejects(
    openai.identifyWithOpenAI(baseOpenAIOptions(
      async () => Response.json({ status: "completed", output_text: "not json" }),
      screenshotInput,
    )),
    (error) => error.code === "invalid_response",
  );

  await assert.rejects(
    openai.identifyWithOpenAI(baseOpenAIOptions(
      async () => {
        throw new Error("connection reset");
      },
      screenshotInput,
    )),
    (error) => error.code === "network" && error.retryable === true,
  );
});

function snapshotEnvelope() {
  return {
    success: true,
    meta: { status: 200, title: "Checkout" },
    result: {
      screenshot: screenshots.jpeg.split(",")[1],
      markdown: "# Checkout\n\nChoose a payment method.",
      accessibilityTree: {
        role: "RootWebArea",
        children: [{ role: "button", name: "Pay" }],
      },
    },
  };
}

test("Browser binding snapshot is allowlisted and uses bounded multi-format payload", async () => {
  let action;
  let payload;
  const result = await capture.captureWebpageSnapshot({
    url: "https://example.com/checkout#payment",
    env: {
      BROWSER_ALLOWED_HOSTS: "example.com, another.example.org",
      BROWSER: {
        async quickAction(nextAction, nextPayload) {
          action = nextAction;
          payload = nextPayload;
          return Response.json(snapshotEnvelope());
        },
      },
    },
    viewport: { width: 99_999, height: 1 },
    timeoutMs: 99_999,
    fetchImpl: async () => {
      throw new Error("REST fallback should not run");
    },
  });

  assert.equal(action, "snapshot");
  assert.deepEqual(payload.formats, ["screenshot", "markdown", "accessibilityTree"]);
  assert.deepEqual(payload.viewport, { width: 1360, height: 240 });
  assert.equal(payload.actionTimeout, 30_000);
  assert.equal(payload.cacheTTL, 0);
  assert.deepEqual(payload.screenshotOptions, {
    type: "png",
    fullPage: false,
  });
  assert.deepEqual(payload.allowRequestPattern, [
    "^https://example\\.com(?:/|$)",
  ]);
  const requestPattern = new RegExp(payload.allowRequestPattern[0]);
  assert.equal(requestPattern.test("https://example.com/assets/app.js"), true);
  assert.equal(requestPattern.test("https://example.com.evil.test/app.js"), false);
  assert.equal(requestPattern.test("http://example.com/app.js"), false);
  assert.equal(payload.gotoOptions.timeout, 30_000);
  assert.equal(payload.url, "https://example.com/checkout");
  assert.equal(result.ok, true);
  assert.equal(result.snapshot.source, "binding");
  assert.match(result.snapshot.screenshotDataUrl, /^data:image\/jpeg;base64,/);
  assert.match(result.snapshot.accessibilityTree, /RootWebArea/);
  assert.deepEqual(result.snapshot.diagnostics, {
    requestedHostname: "example.com",
    requestPolicy: "same-origin-only",
    pageStatus: 200,
    pageTitle: "Checkout",
    browserMsUsed: null,
  });
});

test("Browser REST snapshot uses only Cloudflare API and disables cache", async () => {
  let requestUrl;
  let requestInit;
  const result = await capture.captureWebpageSnapshot({
    url: "https://docs.example.com/components",
    env: {
      BROWSER_ALLOWED_HOSTS: "docs.example.com",
      BROWSER_ACCOUNT_ID: "account-id",
      BROWSER_API_TOKEN: "browser-token",
    },
    fetchImpl: async (url, init) => {
      requestUrl = new URL(url);
      requestInit = init;
      return Response.json(snapshotEnvelope());
    },
  });

  assert.equal(requestUrl.origin, "https://api.cloudflare.com");
  assert.equal(
    requestUrl.pathname,
    "/client/v4/accounts/account-id/browser-rendering/snapshot",
  );
  assert.equal(requestUrl.searchParams.get("cacheTTL"), "0");
  assert.equal(requestInit.headers.authorization, "Bearer browser-token");
  const body = JSON.parse(requestInit.body);
  assert.equal(body.url, "https://docs.example.com/components");
  assert.equal(body.cacheTTL, undefined);
  assert.deepEqual(body.allowRequestPattern, [
    "^https://docs\\.example\\.com(?:/|$)",
  ]);
  assert.deepEqual(body.formats, ["screenshot", "markdown", "accessibilityTree"]);
  assert.equal(result.ok, true);
  assert.equal(result.snapshot.source, "rest");
});

test("Browser capture blocks non-exact hosts and degrades without providers", async () => {
  let called = false;
  const blocked = await capture.captureWebpageSnapshot({
    url: "https://sub.example.com/",
    env: {
      BROWSER_ALLOWED_HOSTS: "example.com",
      BROWSER_ACCOUNT_ID: "account-id",
      BROWSER_API_TOKEN: "browser-token",
    },
    fetchImpl: async () => {
      called = true;
      return Response.json(snapshotEnvelope());
    },
  });
  assert.equal(blocked.ok, false);
  assert.equal(blocked.warning.code, "host_not_allowed");
  assert.equal(called, false);

  const unavailable = await capture.captureWebpageSnapshot({
    url: "https://example.com/",
    env: { BROWSER_ALLOWED_HOSTS: "example.com" },
  });
  assert.equal(unavailable, null);

  const invalid = await capture.captureWebpageSnapshot({
    url: "http://example.com/",
    env: { BROWSER_ALLOWED_HOSTS: "example.com" },
  });
  assert.equal(invalid.ok, false);
  assert.equal(invalid.warning.code, "invalid_url");

  const failed = await capture.captureWebpageSnapshot({
    url: "https://example.com/",
    env: {
      BROWSER_ALLOWED_HOSTS: "example.com",
      BROWSER: {
        async quickAction() {
          throw new Error("browser timed out");
        },
      },
    },
  });
  assert.equal(failed.ok, false);
  assert.equal(failed.warning.code, "binding_failed");
  assert.equal(failed.warning.retryable, true);

  const oversized = await capture.captureWebpageSnapshot({
    url: "https://example.com/",
    env: {
      BROWSER_ALLOWED_HOSTS: "example.com",
      BROWSER: {
        async quickAction() {
          return new Response("{}", {
            headers: { "content-length": String(12 * 1024 * 1024 + 1) },
          });
        },
      },
    },
  });
  assert.equal(oversized.ok, false);
  assert.equal(oversized.warning.code, "binding_failed");
  assert.match(oversized.warning.message, /allowed size/i);
});

async function settleWithin(promise, timeoutMs) {
  let timer;
  const timedOut = Symbol("timed-out");
  const result = await Promise.race([
    promise,
    new Promise((resolve) => {
      timer = setTimeout(() => resolve(timedOut), timeoutMs);
    }),
  ]);
  clearTimeout(timer);
  assert.notEqual(result, timedOut, `operation did not settle within ${timeoutMs} ms`);
  return result;
}

test("Browser binding snapshot stops waiting when the caller aborts", async () => {
  const controller = new AbortController();
  const resultPromise = capture.captureWebpageSnapshot({
    url: "https://example.com/",
    env: {
      BROWSER_ALLOWED_HOSTS: "example.com",
      BROWSER: {
        async quickAction() {
          return new Promise(() => {});
        },
      },
    },
    signal: controller.signal,
  });

  controller.abort();
  const result = await settleWithin(resultPromise, 250);
  assert.equal(result.ok, false);
  assert.equal(result.warning.code, "binding_failed");
});

test("Browser REST timeout remains active while a response body is streaming", async () => {
  let bodyCancelled = false;
  const resultPromise = capture.captureWebpageSnapshot({
    url: "https://example.com/",
    env: {
      BROWSER_ALLOWED_HOSTS: "example.com",
      BROWSER_ACCOUNT_ID: "account-id",
      BROWSER_API_TOKEN: "browser-token",
    },
    fetchImpl: async () => new Response(new ReadableStream({
      cancel() {
        bodyCancelled = true;
      },
    })),
    timeoutMs: 1_000,
  });

  const result = await settleWithin(resultPromise, 3_500);
  assert.equal(result.ok, false);
  assert.equal(result.warning.code, "rest_failed");
  assert.equal(bodyCancelled, true);
});

test("Browser binding enforces its own deadline even without caller cancellation", async () => {
  const result = await settleWithin(capture.captureWebpageSnapshot({
    url: "https://example.com/",
    env: { BROWSER_ALLOWED_HOSTS: "example.com", BROWSER: { quickAction: () => new Promise(() => {}) } },
    timeoutMs: 1000,
  }), 3500);
  assert.equal(result.ok, false);
  assert.equal(result.warning.code, "binding_failed");
});
