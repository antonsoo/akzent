import assert from "node:assert/strict";
import test from "node:test";
import { readTransfer } from "../src/transfer.ts";

test("chunked verified-size transport returns the exact bytes and media type", async () => {
  const source = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(Uint8Array.of(0, 1));
      controller.enqueue(Uint8Array.of(254, 255));
      controller.close();
    },
  });
  const result = await readTransfer(
    async () => new Response(source, { headers: { "Content-Type": "image/png" } }),
    4,
  );
  assert.deepEqual(new Uint8Array(result.bytes), Uint8Array.of(0, 1, 254, 255));
  assert.equal(result.contentType, "image/png");
});

test("excess bytes cancel an unfinished body instead of retaining it", async () => {
  let canceled = false;
  const source = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(Uint8Array.of(1, 2, 3, 4, 5));
    },
    cancel() {
      canceled = true;
    },
  });
  await assert.rejects(
    readTransfer(async () => new Response(source), 4),
    /too many bytes/,
  );
  assert.equal(canceled, true);
});

test("a caller cancels a stalled body promptly, with its own abort reason", async () => {
  const controller = new AbortController();
  const reason = new DOMException("The caller chose another page", "AbortError");
  let canceled = false;
  const source = new ReadableStream<Uint8Array>({
    start(stream) {
      stream.enqueue(Uint8Array.of(1));
    },
    cancel() {
      canceled = true;
    },
  });
  const reading = readTransfer(async () => new Response(source), 4, controller.signal);
  const result = assert.rejects(reading, (error) => error === reason);
  await new Promise((done) => setTimeout(done, 10));
  controller.abort(reason);
  await result;
  assert.equal(canceled, true);
});

test("an already canceled caller never opens a source", async () => {
  const reason = new DOMException("Canceled before starting", "AbortError");
  const controller = new AbortController();
  controller.abort(reason);
  let opened = false;
  await assert.rejects(
    readTransfer(
      async () => {
        opened = true;
        return new Response("body");
      },
      4,
      controller.signal,
    ),
    (error) => error === reason,
  );
  assert.equal(opened, false);
});
