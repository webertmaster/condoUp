// ==========================================
// EVO UPI - CONDO UP
// app.js - Núcleo do Sistema (Menu, Relógio e Dashboard)
// ==========================================

// --- CHAVE MESTRA DA MULTI-TENANCY (RESOLUÇÃO DE CONDOMÍNIO ATIVO) ---
function obterCondominioAtivo() {
    // Se o Modo Fantasma estiver ligado, retorna o ID do condomínio visitado. 
    // Caso contrário, usa o condomínio padrão do usuário logado.
    return localStorage.getItem("condominio_fantasma") || localStorage.getItem("condominioId");
}

// --- MOTOR UNIVERSAL DO DOMINÓ (COMPARTILHADO PARA TODO O PRÉDIO) ---
let memoriaDominóMoradores = []; 

async function carregarApartamentosNoSelect(idSelectDestino) {
    const meuCondominio = obterCondominioAtivo();
    const select = document.getElementById(idSelectDestino);
    if (!meuCondominio || !select || typeof db === 'undefined') return;

    try {
        const snap = await db.collection("moradores")
            .where("condominioId", "==", meuCondominio)
            .where("excluido", "==", false)
            .get();

        memoriaDominóMoradores = [];
        select.innerHTML = '<option value="">Selecione o Apto...</option>';

        snap.forEach(doc => memoriaDominóMoradores.push(doc.data()));

        // Organiza em ordem alfabética bonita na tela (101 A, 101 B, 102 A...)
        memoriaDominóMoradores.sort((a, b) => (a.apto || "").localeCompare(b.apto || ""));

        memoriaDominóMoradores.forEach(m => {
            let opt = document.createElement('option');
            opt.value = m.apto;
            opt.textContent = `Apto ${m.apto} - ${m.nome}`; // Exibe: "Apto 101 - Carlos"
            select.appendChild(opt);
        });

        console.log(`✅ Select [${idSelectDestino}] recheado com ${memoriaDominóMoradores.length} apartamentos!`);

    } catch (e) {
        console.error("Erro ao carregar lista de apartamentos no motor universal:", e);
    }
}

// --- CONTROLE UNIVERSAL DE MENUS E TELAS (BLINDADO) ---
function trocarTela(telaId) {
    // Esconde todas as telas do sistema de forma limpa
    document.querySelectorAll('.content .tela').forEach(tela => {
        tela.classList.remove('ativa');
    });
    
    // Tira o estilo de "selecionado" de todos os botões do menu
    document.querySelectorAll('.menu button').forEach(btn => {
        btn.style.background = 'transparent';
        btn.style.borderLeftColor = 'transparent';
        btn.style.color = '#94a3b8';
    });

    // Mostra a tela solicitada se ela existir no HTML
    const telaSelecionada = document.getElementById(telaId);
    if(telaSelecionada) {
        telaSelecionada.classList.add('ativa');
    } else {
        console.error(`🚨 Erro de Navegação: A tela com o ID '${telaId}' não existe no HTML!`);
    }
    
    // Pinta o botão do menu correspondente
    const btnAtivo = document.getElementById('menu-' + telaId);
    if(btnAtivo) {
        btnAtivo.style.background = 'rgba(59, 130, 246, 0.1)';
        btnAtivo.style.borderLeftColor = '#3b82f6';
        btnAtivo.style.color = '#fff';
    }

    // Gatilhos específicos ao trocar de tela
    if(telaId === 'dashboard') atualizarDashboard();
    
    // Blindagem para a garagem carregar corretamente
    if(telaId === 'veiculos' && typeof mostrarVeiculos === 'function') mostrarVeiculos();

    // 🚀 INJEÇÃO DE GATILHOS DOMINÓ: Força os selects a atualizarem os moradores na hora que abre a aba!
    if(telaId === 'delivery' && typeof carregarApartamentosNoSelect === 'function') carregarApartamentosNoSelect('delApto');
    if(telaId === 'encomendas' && typeof carregarApartamentosNoSelect === 'function') carregarApartamentosNoSelect('encApto');
    if(telaId === 'ocorrencias' && typeof carregarApartamentosNoSelect === 'function') carregarApartamentosNoSelect('ocoApto');
    if(telaId === 'reservas' && typeof carregarApartamentosNoSelect === 'function') carregarApartamentosNoSelect('aptoReserva');

    // =======================================================
    // 🚀 GATILHO INVISÍVEL PARA O IOS (Embutido na troca de tela)
    // =======================================================
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted' && typeof gerarESalvarToken === 'function') {
                gerarESalvarToken();
            }
        }).catch(err => console.log("Permissão silenciosa recusada pelo iOS."));
    }
}

// --- RELÓGIO EM TEMPO REAL ---
function atualizarRelogio() {
    const agora = new Date();
    const horas = String(agora.getHours()).padStart(2, '0');
    const minutes = String(agora.getMinutes()).padStart(2, '0');
    const segundos = String(agora.getSeconds()).padStart(2, '0');
    const elRelogio = document.getElementById('relogio');
    if(elRelogio) elRelogio.textContent = `${horas}:${minutes}:${segundos}`;
}
setInterval(atualizarRelogio, 1000);

// --- MOTO ESCURO (DARK MODE) ---
function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDark);
}

// --- DASHBOARD (NUVEM EM TEMPO REAL REDIRECIONADA) ---
function atualizarDashboard() {
    const meuCondominio = obterCondominioAtivo();

    if (!meuCondominio || typeof db === 'undefined') {
        console.log("⏳ Aguardando Firebase para atualizar a Dashboard...");
        return;
    }
    
    db.collection("encomendas").where("condominioId", "==", meuCondominio).onSnapshot(snap => {
        let pendentes = 0;
        snap.forEach(doc => { 
            let enc = doc.data();
            if (!enc.excluido && enc.status !== 'Entregue') pendentes++; 
        });
        if(document.getElementById('dash-encomendas')) document.getElementById('dash-encomendas').textContent = pendentes;
    });

    db.collection("delivery").where("condominioId", "==", meuCondominio).onSnapshot(snap => {
        let delPendentes = 0;
        snap.forEach(doc => {
            let d = doc.data();
            if (!d.excluido && (d.status === "Aguardando Morador" || d.status === "Aguardando")) {
                delPendentes++;
            }
        });
        if(document.getElementById('dash-delivery')) document.getElementById('dash-delivery').textContent = delPendentes;
    });

    db.collection("veiculos").where("condominioId", "==", meuCondominio).onSnapshot(snap => {
        let total = 0;
        snap.forEach(doc => { if (!doc.data().excluido) total++; });
        if(document.getElementById('dash-veiculos')) document.getElementById('dash-veiculos').textContent = total;
    });

    db.collection("moradores").where("condominioId", "==", meuCondominio).onSnapshot(snap => {
        let total = 0;
        snap.forEach(doc => { if (!doc.data().excluido) total++; });
        if(document.getElementById('dash-moradores')) document.getElementById('dash-moradores').textContent = total;
    });

    db.collection("passagem").where("condominioId", "==", meuCondominio).onSnapshot(snap => {
        let total = 0;
        snap.forEach(doc => { if (!doc.data().excluido) total++; });
        if(document.getElementById('dash-plantao')) document.getElementById('dash-plantao').textContent = total;
    });

    db.collection("ocorrencias").where("condominioId", "==", meuCondominio).onSnapshot(snap => {
        let abertas = 0;
        snap.forEach(doc => { 
            let oco = doc.data();
            if (!oco.excluido && oco.status !== '🟢 Resolvido' && oco.status !== 'Resolvido') abertas++; 
        });
        if(document.getElementById('dash-ocorrencias')) document.getElementById('dash-ocorrencias').textContent = abertas;
    });

    db.collection("reservas").where("condominioId", "==", meuCondominio).onSnapshot(snap => {
        let reservasHj = 0;
        const hojeStr = new Date().toISOString().split('T')[0];
        snap.forEach(doc => { 
            let r = doc.data();
            if (!r.excluido && r.data === hojeStr) reservasHj++; 
        });
        if(document.getElementById('dash-reservas')) document.getElementById('dash-reservas').textContent = reservasHj;
    });

    db.collection("comunicados").where("condominioId", "==", meuCondominio).onSnapshot(snap => {
        let ativos = 0;
        snap.forEach(doc => { 
            let com = doc.data();
            if (!com.excluido && !com.status.includes('Resolvido')) ativos++; 
        });
        if(document.getElementById('dash-comunicados')) document.getElementById('dash-comunicados').textContent = ativos;
    });

    db.collection("equipe").where("condominioId", "==", meuCondominio).onSnapshot(snap => {
        let totalEquipe = 0;
        snap.forEach(() => { totalEquipe++; });
        if(document.getElementById('dash-equipe')) document.getElementById('dash-equipe').textContent = totalEquipe;
    });

    db.collection("ponto").where("condominioId", "==", meuCondominio).onSnapshot(snap => {
        let pontosHj = 0;
        const hojeStr = new Date().toISOString().split('T')[0];
        snap.forEach(doc => { 
            if (doc.data().data === hojeStr) pontosHj++; 
        });
        if(document.getElementById('dash-ponto')) document.getElementById('dash-ponto').textContent = pontosHj;
    });
}

// ==========================================
// MOTOR DE NOTIFICAÇÕES PUSH (SISTEMA INTEGRADO ATIVO)
// ==========================================

function gerarESalvarToken() {
    const messaging = firebase.messaging();
    const meuCondominio = obterCondominioAtivo();
    const meuCargo = localStorage.getItem("usuario_cargo"); 

    messaging.getToken({ vapidKey: "BBADwvMiUsP_fLnWAzEK8ktiFbvPLsySsE0Zm4P4FaYgujxdGIgl8AiHMXt9vmmz2lD8UrFI7Z7DlrgUszYGSyE" })
        .then((currentToken) => {
            if (currentToken) {
                console.log('📱 Token gerado silenciosamente.');
                localStorage.setItem("push_token", currentToken);
                
                if (typeof db !== 'undefined') {
                    if (meuCondominio || meuCargo === 'ADM') {
                        db.collection("tokens_push").doc(currentToken).set({
                            token: currentToken,
                            condominioId: meuCondominio || "GLOBAL_MASTER", 
                            cargo: meuCargo || "operacional",
                            dataRegistro: new Date().toISOString()
                        }, { merge: true }).catch(err => console.error("Erro no banco:", err));
                    }
                }
            }
        }).catch((err) => {
            console.log('Erro silencioso ao pegar token (Normal no iOS se bloqueado ou em localhost sem HTTPS).', err);
        });

    messaging.onMessage((payload) => {
        console.log('🔔 Mensagem em background (App Aberto): ', payload);
    });
}

async function ativarNotificacoesPush() {
    if (!('Notification' in window) || !('serviceWorker' in navigator) || typeof firebase === 'undefined') {
        return;
    }

    try {
        // 🚀 AQUI ESTÁ A MUDANÇA: v=100 para forçar o celular a baixar a logo!
        const registration = await navigator.serviceWorker.register('./sw.js?v=100');
        
        if (typeof firebase.messaging().useServiceWorker === 'function') {
            firebase.messaging().useServiceWorker(registration);
        }
    } catch (e) {
        console.log("Falha no SW (Normal se testando local):", e);
    }

    if (Notification.permission === 'granted') {
        gerarESalvarToken();
    } else if (Notification.permission === 'denied') {
        const modalIos = document.getElementById('modal-permissao-ios');
        if (modalIos) modalIos.style.display = 'block';
    } else {
        const toqueInvisivel = async () => {
            try {
                const permission = await Notification.requestPermission();
                if (permission === 'granted') gerarESalvarToken();
            } catch (error) {
                console.error(error);
            } finally {
                document.body.removeEventListener('click', toqueInvisivel);
                document.body.removeEventListener('touchstart', toqueInvisivel);
            }
        };
        document.body.addEventListener('click', toqueInvisivel);
        document.body.addEventListener('touchstart', toqueInvisivel);
    }
}

window.fecharModalIos = function() {
    const modalIos = document.getElementById('modal-permissao-ios');
    if (modalIos) modalIos.style.display = 'none';
}

// ==========================================
// INICIALIZAÇÃO BLINDADA DO SISTEMA
// ==========================================
window.addEventListener('load', () => {
    atualizarRelogio();
    setTimeout(atualizarDashboard, 1500);
    
    if (localStorage.getItem('darkMode') === 'true') {
        document.body.classList.add('dark-mode');
    }

    const nomeSalvo = localStorage.getItem("usuario_nome");
    const elementoNome = document.getElementById("nomeFuncionarioLogado");

    if (elementoNome) {
        if (nomeSalvo && nomeSalvo !== "undefined" && nomeSalvo !== "null") {
            elementoNome.innerText = nomeSalvo.split(" ")[0];
        } else {
            elementoNome.innerText = "Guerreiro"; 
        }
    }

    setTimeout(ativarNotificacoesPush, 1000);
});
