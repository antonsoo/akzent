/** Shared by the reader and generated worker: bound silence, total time and retained size.
 * The worker builder transpiles this import-free module, so both paths use the same policy.
 */
export async function readTransfer(
  open: (signal: AbortSignal) => Promise<Response>,
  expectedBytes: number,
  signal?: AbortSignal,
  hooks: {
    onProgress?: (received: number) => void;
    listenForProgress?: (activity: () => void) => () => void;
  } = {},
): Promise<{ bytes: ArrayBuffer; contentType: string }> {
  const controller = new AbortController();
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  let idle: ReturnType<typeof setTimeout> | undefined;
  const resetIdle = () => {
    clearTimeout(idle);
    idle = setTimeout(
      () =>
        controller.abort(
          new DOMException("No source bytes arrived for 20 seconds.", "TimeoutError"),
        ),
      20_000,
    );
  };
  const ceiling = setTimeout(
    () =>
      controller.abort(
        new DOMException("The source transfer exceeded three minutes.", "TimeoutError"),
      ),
    180_000,
  );
  const cancel = () => controller.abort(signal?.reason);
  let rejectAbort: (reason: unknown) => void = () => {};
  const aborted = new Promise<never>((_, reject) => {
    rejectAbort = reject;
  });
  const onAbort = () => {
    rejectAbort(controller.signal.reason);
    void reader?.cancel(controller.signal.reason).catch(() => {});
  };
  controller.signal.addEventListener("abort", onAbort, { once: true });
  signal?.addEventListener("abort", cancel, { once: true });
  resetIdle();
  let stopActivity: (() => void) | undefined;
  try {
    stopActivity = hooks.listenForProgress?.(resetIdle);
    if (signal?.aborted) cancel();
    // Attach the abort race even when the caller was already aborted.
    const response = await Promise.race([
      controller.signal.aborted
        ? Promise.reject(controller.signal.reason)
        : open(controller.signal),
      aborted,
    ]);
    controller.signal.throwIfAborted();
    if (!response.ok)
      throw new Error(`The source returned HTTP ${response.status}. Reconnect and try again.`);
    if (!response.body) throw new Error("The source returned no body. Reconnect and try again.");
    resetIdle();
    reader = response.body.getReader();
    const retained = new Uint8Array(expectedBytes);
    let offset = 0;
    for (;;) {
      const { value, done } = await Promise.race([reader.read(), aborted]);
      controller.signal.throwIfAborted();
      if (done) break;
      if (!value?.byteLength) continue;
      resetIdle();
      if (offset + value.byteLength > expectedBytes)
        throw new Error(
          "The downloaded source does not match this edition: too many bytes. Reload before trying again.",
        );
      retained.set(value, offset);
      offset += value.byteLength;
      hooks.onProgress?.(offset);
    }
    if (offset !== expectedBytes)
      throw new Error(
        "The downloaded source does not match this edition: incomplete body. Reload before trying again.",
      );
    return {
      bytes: retained.buffer,
      contentType: response.headers.get("Content-Type") ?? "application/octet-stream",
    };
  } catch (error) {
    void reader?.cancel(error).catch(() => {});
    if (controller.signal.aborted) throw controller.signal.reason;
    throw error;
  } finally {
    stopActivity?.();
    clearTimeout(idle);
    clearTimeout(ceiling);
    signal?.removeEventListener("abort", cancel);
    controller.signal.removeEventListener("abort", onAbort);
    reader?.releaseLock();
  }
}
