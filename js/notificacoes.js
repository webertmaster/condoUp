// ==========================================
// MOTOR DO SINO DE NOTIFICAÇÕES
// ==========================================

let notificacoesGlobais = [];

document.addEventListener('DOMContentLoaded', () => {
    // Só liga o radar do sino se o usuário estiver logado
    const isLogado = localStorage.getItem("condoup_logado");
    if (isLogado && !window.location.pathname.includes('login.html')) {
        setTimeout(iniciarRadarNotificacoes, 1500); // Dá um fôlego pro sistema carregar primeiro
    }
});

// Abre e fecha a caixinha do sino
function toggleSino() {
    const caixa = document.getElementById('caixa-notificacoes');
    if (caixa.style.display === 'none') {
        caixa.style.display = 'block';
    } else {
        caixa.style.display = 'none';
    }
}

// Escuta a coleção "notificacoes" em tempo real
function iniciarRadarNotificacoes() {
    const meuCondominio = localStorage.getItem("condominioId");
    if (!meuCondominio || typeof db === 'undefined') return;

    // Busca apenas as últimas 20 mensagens do prédio (COM ORDENAÇÃO)
    // 🚨 ATENÇÃO: Requer Índice Composto no Firebase (condominioId + timestamp)
    db.collection("notificacoes")
    .where("condominioId", "==", meuCondominio)
    .orderBy("timestamp", "desc") 
    .limit(20)
    .onSnapshot((snapshot) => {
        notificacoesGlobais = [];
        let naoLidas = 0;

        snapshot.forEach((doc) => {
            let notif = doc.data();
            notif.id = doc.id;
            notificacoesGlobais.push(notif);
            
            // Conta quantas mensagens o usuário ainda não leu
            if (notif.lida === false) {
                naoLidas++;
            }
        });

        atualizarVisualDoSino(naoLidas);
        desenharListaDeMensagens();
    }, (error) => {
        console.error("Erro ao ler notificações do Firebase. Verifique se o Índice foi criado:", error);
    });
}

// Atualiza a bolinha vermelha
function atualizarVisualDoSino(qtdNaoLidas) {
    const badge = document.getElementById('badge-notificacao');
    const icone = document.querySelector('.fa-bell');
    if (!badge) return;

    if (qtdNaoLidas > 0) {
        badge.innerText = qtdNaoLidas > 9 ? '9+' : qtdNaoLidas;
        badge.style.display = 'block';
        if(icone) icone.style.color = '#38bdf8'; // Deixa o sino azul pra chamar atenção
    } else {
        badge.style.display = 'none';
        if(icone) icone.style.color = '#64748b'; // Volta pra cinza
    }
}

// Desenha a lista de mensagens dentro da caixinha
function desenharListaDeMensagens() {
    const lista = document.getElementById('lista-mensagens-sino');
    if (!lista) return;

    if (notificacoesGlobais.length === 0) {
        lista.innerHTML = '<p style="text-align: center; color: #94a3b8; font-size: 13px; margin: 20px 0;"><i class="fa-regular fa-bell-slash" style="font-size: 20px; display: block; margin-bottom: 10px; opacity: 0.5;"></i> Tudo tranquilo por aqui.</p>';
        return;
    }

    lista.innerHTML = '';
    notificacoesGlobais.forEach(n => {
        // Se não foi lida, ganha um fundo azul clarinho
        const bgCor = n.lida ? '#ffffff' : '#f0f9ff';
        const bordaLida = n.lida ? 'none' : '3px solid #38bdf8';
        
        let icone = 'fa-bell'; let corIcone = '#64748b';
        if(n.tipo === 'encomenda') { icone = 'fa-box'; corIcone = '#10b981'; }
        else if(n.tipo === 'comunicado') { icone = 'fa-bullhorn'; corIcone = '#ef4444'; }
        
        lista.innerHTML += `
            <div style="background: ${bgCor}; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0; border-left: ${bordaLida}; font-size: 13px;">
                <div style="display: flex; gap: 10px; align-items: flex-start;">
                    <i class="fa-solid ${icone}" style="color: ${corIcone}; margin-top: 3px;"></i>
                    <div>
                        <strong style="color: #1e293b; display: block;">${n.titulo || 'Nova Atualização'}</strong>
                        <span style="color: #475569;">${n.mensagem || ''}</span>
                    </div>
                </div>
            </div>
        `;
    });
}

// Função do botão "Marcar Lidas"
function marcarNotificacoesLidas() {
    notificacoesGlobais.forEach(n => {
        if (n.lida === false) {
            db.collection("notificacoes").doc(n.id).update({ lida: true });
        }
    });
}
