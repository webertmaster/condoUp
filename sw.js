// ==========================================
// CONDO UP - SERVICE WORKER INTELIGENTE
// sw.js - Cache dinâmico e Controle de Push
// ==========================================

// 1. IMPORTA O MOTOR DO FIREBASE PARA SEGUNDO PLANO
importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-messaging-compat.js');

// 2. INICIALIZA O FIREBASE COM AS SUAS CHAVES (Condo Up)
firebase.initializeApp({
    apiKey: "AIzaSyCY6Jq9GVYJEQrH0JZ9TAWcQVm-cImiwoc",
    authDomain: "portaria-pro-ebc5c.firebaseapp.com",
    projectId: "portaria-pro-ebc5c",
    storageBucket: "portaria-pro-ebc5c.firebasestorage.app",
    messagingSenderId: "948781126590",
    appId: "1:948781126590:web:5e8888eb6e8124f7df5fef"
});

// 3. CAPTURA A NOTIFICAÇÃO E FORÇA A SUA LOGO COM LINK ABSOLUTO
const messaging = firebase.messaging();
messaging.onBackgroundMessage((payload) => {
    console.log('[ServiceWorker] Notificação recebida em background.', payload);

    // Força o link completo da imagem para o Android não se perder
    const iconeOficial = self.location.origin + '/img/icon-512.png.png';

    const notificationTitle = payload.notification?.title || "📢 AVISO GLOBAL";
    const notificationOptions = {
        body: payload.notification?.body || "Você tem um novo comunicado do condomínio.",
        icon: iconeOficial, 
        badge: iconeOficial, 
        vibrate: [200, 100, 200]
    };

    return self.registration.showNotification(notificationTitle, notificationOptions);
});

// =========================================================
// O SEU CÓDIGO DE CACHE INTACTO (Apenas subi a versão)
// =========================================================

const CACHE_NAME = 'condo-up-v37'; // Versão alterada para forçar o celular a baixar o arquivo novo

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
