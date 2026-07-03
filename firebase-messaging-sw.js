// 1. Importa as ferramentas do Firebase direto do Google
importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-messaging-compat.js');

// 2. Suas credenciais do Condo Up
const firebaseConfig = {
    apiKey: "AIzaSyCY6Jq9GVYJEQrH0JZ9TAWcQVm-cImiwoc",
    authDomain: "portaria-pro-ebc5c.firebaseapp.com",
    projectId: "portaria-pro-ebc5c",
    storageBucket: "portaria-pro-ebc5c.firebasestorage.app",
    messagingSenderId: "948781126590",
    appId: "1:948781126590:web:5e8888eb6e8124f7df5fef"
};

// 3. Inicia o Firebase no plano de fundo
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// 4. Lida com as mensagens quando o aplicativo estiver fechado/minimizado
messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Notificação recebida em segundo plano: ', payload);
    
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: '/img/icon-512.png.png', // O ícone do seu app
        badge: '/img/icon-512.png.png'
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});
