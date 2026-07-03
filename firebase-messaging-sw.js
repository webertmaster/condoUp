importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-messaging-compat.js');

// As mesmas chaves do seu index.html
firebase.initializeApp({
    apiKey: "AIzaSyCY6Jq9GVYJEQrH0JZ9TAWcQVm-cImiwoc",
    authDomain: "portaria-pro-ebc5c.firebaseapp.com",
    projectId: "portaria-pro-ebc5c",
    storageBucket: "portaria-pro-ebc5c.firebasestorage.app",
    messagingSenderId: "948781126590",
    appId: "1:948781126590:web:5e8888eb6e8124f7df5fef"
});

const messaging = firebase.messaging();

// Fica escutando as mensagens quando o app estiver em segundo plano (fechado)
messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Recebeu mensagem em background: ', payload);
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: '/img/icon-512.png.png' // O logo do Condo Up
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});