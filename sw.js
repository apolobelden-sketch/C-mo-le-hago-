const CACHE_NAME = 'comolehago-v1';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './script.js',
  './ahorro-module.js',
  './manifest.json',
  './icon.svg'
];

self.addEventListener('install', function(event){
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      return cache.addAll(ASSETS).catch(function(){
        // Si algún archivo no existe (ej. ahorro-module.js aún no subido), no truena todo
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
  event.respondWith(
    caches.match(event.request).then(function(cached){
      const network = fetch(event.request).then(function(response){
        if(response && response.status === 200){
          const copy = response.clone();
          caches.open(CACHE_NAME).then(function(cache){ cache.put(event.request, copy); });
        }
        return response;
      }).catch(function(){ return cached; });
      return cached || network;
    })
  );
});
