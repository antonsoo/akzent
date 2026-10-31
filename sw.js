/* Generated from the complete production edition. */
const EDITION = "1e634d1ac9eafe4a38bb";
const CACHE = 'akzent-' + EDITION;
const FILES = [{"url":"/akzent/assets/index-B9IEqO7Y.js","hash":"234352cf6ea3379fd4b681bc12801cc09942baae7ca55d6f132fc10479ab576e","bytes":71821},{"url":"/akzent/assets/index-ClbAD7c4.css","hash":"d0181e066cf8a109aa460fa4e1b09862156316878fd126988c5a7d0c01dd1a78","bytes":16268},{"url":"/akzent/fonts/gentium-OFL.txt","hash":"c309a440be606e283ccacc746662d714b9c5b5a7a0a10dd2514b90206b55ddfe","bytes":4507},{"url":"/akzent/fonts/gentium.ttf","hash":"845e06bb4673a908a5f3b3b4ac9f38841750a07faa9aa45bfcb5796893346f0b","bytes":822956},{"url":"/akzent/fonts/hanken-latin-ext.woff2","hash":"768af2923e0ab1549f1dfba0a5c8ea749c4c01f01d8e77ffaf7fcd12f57a0a24","bytes":19588},{"url":"/akzent/fonts/hanken-latin.woff2","hash":"e9201eddf1d41d0b62253295d869ce3cf65768f7102b797f02c7f8c876b4a9d5","bytes":34704},{"url":"/akzent/fonts/hanken-OFL.txt","hash":"26ff01d30304ca6dc862c560bc80cd145c7f9ede745b4bc801f0207f1438e417","bytes":9377},{"url":"/akzent/fonts/provenance.json","hash":"44e5299dc60cf15a478faa483e9915e2f6ceb68325f0805deb3b12d41144f00c","bytes":1347},{"url":"/akzent/icon.svg","hash":"45d0dc4ce5bb94003e9a534b34c10073493bcb361ec9c2656f6a70c36233a92f","bytes":282},{"url":"/akzent/index.html","hash":"4f7f43b030a471e8ba99a4e5cb1362c37c65b4aaea9deb7311c86579cd096260","bytes":1052},{"url":"/akzent/sources/NOTICE.txt","hash":"5b14e6014e92b5b5532b73d7429f4f9eccc3dcd31a69b313b97909e1f9d597ef","bytes":1206},{"url":"/akzent/sources/provenance.json","hash":"1ae2cf56da5dbe2cabc8a0e2a68c2b270e7db3c3f99cbbb28adcbcba852f40fc","bytes":3019},{"url":"/akzent/sources/verner-100.png","hash":"16b68b6db903a6960aa8f071eb522dfe272952860ceb8e717d941e409399c549","bytes":191411},{"url":"/akzent/sources/verner-101.png","hash":"17451bc658ed707f11671eaf97a5b17d714234f4564845035568030e44b7c485","bytes":184841},{"url":"/akzent/sources/verner-102.png","hash":"8f57f174b1a2ebd24f5139f1b4b1564012dd8535722097302e2be92d4de0a309","bytes":175023},{"url":"/akzent/sources/verner-114.png","hash":"973ae21daf264a435da88f721140ec47b613484ceb4df3273f3b0aabf2f3b73c","bytes":165386},{"url":"/akzent/sources/verner-115.png","hash":"cc1d278903ba8a55363bd160d6a44040781cf848549602c065a7a37dce15e342","bytes":180996},{"url":"/akzent/sources/verner-117.png","hash":"0cfbdfc133ea0c3040b29f8346c38a8ada6d8470198574720c96825eaca43c35","bytes":184997},{"url":"/akzent/sources/verner-118.png","hash":"71629a1884f4773cd7af1d7928cdd2f3f140b77902c27de0d2252f115f333411","bytes":175954},{"url":"/akzent/sources/verner-119.png","hash":"e1f6da2f63cec281e4b718f19bf2baeb6875e782cd88ee97f006f5552f6cc7a8","bytes":163958},{"url":"/akzent/sources/verner-130.png","hash":"9f51681d7d6a883432b0cb314bf4ab33094655c4202c048c0f03daff22eb8a90","bytes":156240},{"url":"/akzent/sources/verner-97.png","hash":"1a70f9257eb9e07555deff3319abf26574039347f91d9f45a81779d5ef24d104","bytes":130587},{"url":"/akzent/sources/verner-98.png","hash":"d8c8833e202fb56cb83ba04bcca09512b6d41caa83070dacadca2771918625ce","bytes":182921},{"url":"/akzent/sources/verner-99.png","hash":"6442751b67139c52546f0ffcdcede5ec2cca16347cc4f02936b60d5495505b1d","bytes":190195}];
const allowed = new Map(FILES.map(file => [new URL(file.url, self.location.origin).href, file]));
const digest = async bytes => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), b => b.toString(16).padStart(2, '0')).join('');
let invalidationSent = false;
async function notifyClients(type) {
  const pages = await self.clients.matchAll({type:'window'});
  for (const page of pages) page.postMessage({type,edition:EDITION});
}
async function invalidateClients() {
  if (invalidationSent) return;
  invalidationSent = true;
  await notifyClients('inventory-invalidated');
}
async function restoreClients() {
  if (!invalidationSent) return;
  invalidationSent = false;
  await notifyClients('inventory-restored');
}
async function storedInventoryComplete() {
  for (const file of FILES) {
    if (!await matches(await caches.match(file.url, {cacheName:CACHE}), file)) return false;
  }
  return true;
}
async function matches(response, file) {
  if (!response || !response.ok) return false;
  const bytes = await response.arrayBuffer();
  return bytes.byteLength === file.bytes && await digest(bytes) === file.hash;
}
async function fetchEdition(file) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(file.url, {cache:'reload', signal:controller.signal});
    if (!await matches(response.clone(), file)) throw new Error('Edition mismatch: ' + file.url);
    return response;
  } finally {clearTimeout(timeout);}
}
self.addEventListener('install', event => event.waitUntil((async () => {
  const cache = await caches.open(CACHE);
  try {
    for (const file of FILES) {
      const response = await fetchEdition(file);
      await cache.put(file.url, response);
    }
  } catch (error) { await caches.delete(CACHE); throw error; }
})()));
self.addEventListener('activate', event => event.waitUntil((async () => {
  for (const name of await caches.keys()) if (name.startsWith('akzent-') && name !== CACHE) await caches.delete(name);
  await self.clients.claim();
})()));
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname === '/akzent/') url.pathname += 'index.html';
  url.search = ''; url.hash = '';
  const file = allowed.get(url.href);
  if (!file) return;
  event.respondWith((async () => {
    const saved = await caches.match(url.href, {cacheName:CACHE});
    if (saved && await matches(saved.clone(), file)) return saved;
    await invalidateClients();
    try {
      const response = await fetchEdition(file);
      try {
        await (await caches.open(CACHE)).put(file.url, response.clone());
        if (invalidationSent && await storedInventoryComplete()) await restoreClients();
      }
      catch {} // A connected read can succeed without claiming offline retention.
      return response;
    } catch {
      return new Response('This file is unavailable for the current Akzent edition. Reconnect and reopen the workshop.', {status:503, headers:{'Content-Type':'text/plain;charset=utf-8'}});
    }
  })());
});
self.addEventListener('message', event => {
  if (event.data?.type !== 'inventory' || !event.ports[0]) return;
  event.waitUntil((async () => {
    let complete = true;
    for (const file of FILES) {
      if (!await matches(await caches.match(file.url, {cacheName:CACHE}), file)) {
        await invalidateClients();
        if (event.data.repair !== true) {complete = false; break;}
        const response = await fetchEdition(file);
        await (await caches.open(CACHE)).put(file.url, response);
      }
    }
    if (complete) await restoreClients();
    event.ports[0].postMessage({edition:EDITION, complete, files:FILES.length});
  })().catch(async () => {
    await invalidateClients();
    event.ports[0].postMessage({edition:EDITION,complete:false});
  }));
});
