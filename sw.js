// Service worker: guarda el juego para que el modo individual funcione sin conexión.
// Cada vez que publiques cambios, sube el número de versión para que los móviles descarguen lo nuevo.
const VERSION = "trivia-reforma-v1";
const FILES = [
  "./", "index.html", "styles.css", "manifest.webmanifest",
  "js/app.js", "js/preguntas.js", "js/firebase-config.js",
  "icons/icon-192.png", "icons/icon-512.png", "icons/icon-maskable-512.png", "icons/apple-touch-icon.png"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET") return;

  // Archivos propios: primero la red (para recibir actualizaciones) y, sin conexión, la copia guardada.
  if (url.origin === location.origin) {
    e.respondWith(
      fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open(VERSION).then(c => c.put(e.request, copy));
        return res;
      }).catch(() => caches.match(e.request, {ignoreSearch: true}).then(r => r || caches.match("index.html")))
    );
    return;
  }

  // Tipografías de Google Fonts: se guardan la primera vez que se usan.
  if (url.host === "fonts.googleapis.com" || url.host === "fonts.gstatic.com") {
    e.respondWith(
      caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open(VERSION).then(c => c.put(e.request, copy));
        return res;
      }))
    );
  }
  // Firebase y el resto: siempre por la red.
});
