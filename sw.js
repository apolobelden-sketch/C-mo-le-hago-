const CACHE_NAME = 'comolehago-v2';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './script.js',
  './ahorro-module.js',
  './videos-module.js',
  './manifest.json',
  './icon.svg'
];

self.addEventListener('install', function(event){
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      return cache.addAll(ASSETS).catch(function(){
        // Si algún archivo no existe, no truena todo
        return Promise.all(
          ASSETS.map(function(url){
            return cache.add(url).catch(function(){});
          })
        );
      });
    }).then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function(event){
  event.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(
        keys.filter(function(key){ return key !== CACHE_NAME; })
            .map(function(key){ return caches.delete(key); })
      );
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(event){
  if(event.request.method !== 'GET') return;
  // Primero internet (para ver siempre lo más nuevo); si no hay señal, usa la copia guardada
  event.respondWith(
    fetch(event.request).then(function(response){
      if(response && response.status === 200 && new URL(event.request.url).origin === location.origin){
        const copy = response.clone();
        caches.open(CACHE_NAME).then(function(cache){ cache.put(event.request, copy); });
      }
      return response;
    }).catch(function(){ return caches.match(event.request); })
  );
});
