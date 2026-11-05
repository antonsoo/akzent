import manifest from "./asset-manifest.json";
import { readTransfer } from "./transfer.ts";

export const assets = manifest;
export type Asset = (typeof assets)[number];

export function asset(path: string): Asset {
  const found = assets.find((item) => item.path === path);
  if (!found) throw new Error(`Unknown retained file: ${path}`);
  return found;
}

async function editionCache(item: Asset): Promise<Response | undefined> {
  const edition = document.querySelector<HTMLMetaElement>('meta[name="akzent-edition"]')?.content;
  if (!edition || !/^[a-f0-9]{20}$/.test(edition) || !("caches" in window)) return;
  try {
    return await caches.match(new URL(`${import.meta.env.BASE_URL}${item.path}`, location.href), {
      cacheName: `akzent-${edition}`,
    });
  } catch {
    return;
  }
}

export async function verifiedBytes(item: Asset, signal?: AbortSignal): Promise<ArrayBuffer> {
  try {
    return await readVerifiedBytes(item, signal);
  } catch (error) {
    // Some browser reads bypass the worker. Discovered failures must also
    // invalidate the page's previous offline-readiness claim.
    if (!signal?.aborted) window.dispatchEvent(new Event("akzent:asset-failure"));
    throw error;
  }
}

async function readVerifiedBytes(item: Asset, signal?: AbortSignal): Promise<ArrayBuffer> {
  let bytes: ArrayBuffer;
  try {
    ({ bytes } = await readTransfer(
      async (transferSignal) => {
        // Read only this document's named edition. Every cached response still
        // passes the same size and hash checks as a network response.
        const cached = !navigator.onLine ? await editionCache(item) : undefined;
        transferSignal.throwIfAborted();
        if (cached) return cached;
        try {
          return await fetch(`${import.meta.env.BASE_URL}${item.path}`, {
            cache: "no-store",
            signal: transferSignal,
          });
        } catch (error) {
          transferSignal.throwIfAborted();
          const fallback = await editionCache(item);
          if (!fallback) throw error;
          return fallback;
        }
      },
      item.bytes,
      signal,
    ));
  } catch (error) {
    if (error instanceof DOMException && error.name === "TimeoutError")
      throw new Error(
        `${error.message} Loading ${item.path} stopped; your notebook has been kept. Reconnect and choose the page again.`,
      );
    throw error;
  }
  const hash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  if (hash !== item.sha256)
    throw new Error(
      `The downloaded ${item.path} failed its source check. No substituted file will be used.`,
    );
  return bytes;
}

export async function dataUrl(item: Asset, signal?: AbortSignal): Promise<string> {
  const bytes = new Uint8Array(await verifiedBytes(item, signal));
  let binary = "";
  for (let i = 0; i < bytes.length; i += 16_384)
    binary += String.fromCharCode(...bytes.subarray(i, i + 16_384));
  return `data:${item.mime};base64,${btoa(binary)}`;
}
