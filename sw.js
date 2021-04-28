const cacheName = "stitchcounter-v1.2.2", //semvar.org
    contentToCache = [
        "/",
        "index.js",
        "main.css",
        "manifest.json",
        "fonts/lexend-v2-stripped-regular.woff2",
        "icons/favicon-32.png",
        "icons/favicon-svg.svg"
    ]
self.addEventListener("install", e => {
    e.waitUntil((async () => {
        const cache = await caches.open(cacheName)
        await cache.addAll(contentToCache)
    })())
})
self.addEventListener("fetch", e => {
    e.respondWith((async () => {
        const r = await caches.match(e.request)
        if (r) return r
        const response = await fetch(e.request).catch(() => false)
        if (response === false) return new Response(undefined, { "status": 503 })
        const cache = await caches.open(cacheName)
        cache.put(e.request, response.clone())
        return response
    })())
})
self.addEventListener('activate', e => {
    e.waitUntil(
        (async () => {
            let keyList = await caches.keys()
            Promise.all(keyList.map(key => {
                if (key !== cacheName) caches.delete(key)
            }))
        })()
    )
})