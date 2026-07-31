// ==========================================
// CONDO UP - SERVICE WORKER INTELIGENTE
// sw.js - Controle TOTAL de Notificações
// ==========================================

// 1. O INTERCEPTADOR SUPREMO (VEM ANTES DO FIREBASE)
self.addEventListener('push', function(event) {
    // 🛑 PARA A EXECUÇÃO PADRÃO DO FIREBASE AQUI! (Evita duplicar e mata a letra C)
    event.stopImmediatePropagation();

    let payload = {};
    try {
        payload = event.data.json();
    } catch (e) {
        console.log("Erro ao ler dados da notificação", e);
    }
// ==========================================
// CONDO UP - SERVICE WORKER INTELIGENTE
// sw.js - Controle TOTAL de Notificações
// ==========================================

// 1. O INTERCEPTADOR SUPREMO (VEM ANTES DO FIREBASE)
self.addEventListener('push', function(event) {
    // 🛑 PARA A EXECUÇÃO PADRÃO DO FIREBASE AQUI! (Evita duplicar e mata a letra C)
    event.stopImmediatePropagation();

    let payload = {};
    try {
        payload = event.data.json();
    } catch (e) {
        console.log("Erro ao ler dados da notificação", e);
    }

    // Puxa os dados que vieram da nuvem
    const title = payload?.notification?.title || payload?.data?.title || "📢 Condo Up";
    const body = payload?.notification?.body || payload?.data?.body || "Você tem uma nova mensagem.";
    
    // Força a imagem absoluta cravada!
    const iconeOficial = self.location.origin + '/img/icon-192.png.png';

    const options = {
        body: body,
        icon: iconeOficial,
        badge: iconeOficial,
        vibrate: [200, 100, 200],
        data: payload?.data || {}
    };

    // Nós mesmos desenhamos a notificação na tela
    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

// 2. AÇÃO AO CLICAR NA NOTIFICAÇÃO (Abre o App)
self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    event.waitUntil(clients.openWindow('/'));
});

// 3. IMPORTA O MOTOR DO FIREBASE EM SEGUNDO PLANO
importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyCY6Jq9GVYJEQrH0JZ9TAWcQVm-cImiwoc",
    authDomain: "portaria-pro-ebc5c.firebaseapp.com",
    projectId: "portaria-pro-ebc5c",
    storageBucket: "portaria-pro-ebc5c.firebasestorage.app",
    messagingSenderId: "948781126590",
    appId: "1:948781126590:web:5e8888eb6e8124f7df5fef"
});

// 4. MOTOR DE CACHE (Versão atualizada)
const CACHE_NAME = 'condo-up-v79';

self.addEventListener('install', event => {
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    if (cache !== CACHE_NAME) {
                        return caches.delete(cache);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    if (
        event.request.method !== 'GET' || 
        url.hostname.includes('firestore.googleapis.com') || 
        url.hostname.includes('google.firestore') ||
        url.hostname.includes('firebase') ||
        url.hostname.includes('identitytoolkit') ||
        url.hostname.includes('wa.me')
    ) {
        return;
    }

    event.respondWith(
        caches.match(event.request).then(cachedResponse => {
            return cachedResponse || fetch(event.request).then(networkResponse => {
                return caches.open(CACHE_NAME).then(cache => {
                    cache.put(event.request, networkResponse.clone());
                    return networkResponse;
                });
            });
        }).catch(() => {
            console.warn("Servidor offline e recurso não cacheado:", event.request.url);
        })
    );
});
    // Puxa os dados que vieram da nuvem
    const title = payload?.notification?.title || payload?.data?.title || "📢 Condo Up";
    const body = payload?.notification?.body || payload?.data?.body || "Você tem uma nova mensagem.";
    
    // Força a imagem absoluta cravada!
    const iconeOficial = self.location.origin + '/img/icon-192.png.png';

    const options = {
        body: body,
        icon: iconeOficial,
        badge: iconeOficial,
        vibrate: [200, 100, 200],
        data: payload?.data || {}
    };

    // Nós mesmos desenhamos a notificação na tela
    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

// 2. AÇÃO AO CLICAR NA NOTIFICAÇÃO (Abre o App)
self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    event.waitUntil(clients.openWindow('/'));
});

// 3. IMPORTA O MOTOR DO FIREBASE EM SEGUNDO PLANO
importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyCY6Jq9GVYJEQrH0JZ9TAWcQVm-cImiwoc",
    authDomain: "portaria-pro-ebc5c.firebaseapp.com",
    projectId: "portaria-pro-ebc5c",
    storageBucket: "portaria-pro-ebc5c.firebasestorage.app",
    messagingSenderId: "948781126590",
    appId: "1:948781126590:web:5e8888eb6e8124f7df5fef"
});

// 4. MOTOR DE CACHE (Versão atualizada)
const CACHE_NAME = 'condo-up-v75';

self.addEventListener('install', event => {
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    if (cache !== CACHE_NAME) {
                        return caches.delete(cache);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    if (
        event.request.method !== 'GET' || 
        url.hostname.includes('firestore.googleapis.com') || 
        url.hostname.includes('google.firestore') ||
        url.hostname.includes('firebase') ||
        url.hostname.includes('identitytoolkit') ||
        url.hostname.includes('wa.me')
    ) {
        return;
    }

    event.respondWith(
        caches.match(event.request).then(cachedResponse => {
            return cachedResponse || fetch(event.request).then(networkResponse => {
                return caches.open(CACHE_NAME).then(cache => {
                    cache.put(event.request, networkResponse.clone());
                    return networkResponse;
                });
            });
        }).catch(() => {
            console.warn("Servidor offline e recurso não cacheado:", event.request.url);
        })
    );
});
