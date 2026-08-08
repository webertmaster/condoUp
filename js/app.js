// ==========================================
// EVO UPI - CONRUJA
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

    // 🔥 ATUALIZA A LOGO E O NOME EM TEMPO REAL
    db.collection("condominios").doc(meuCondominio).get().then(doc => {
        if (doc.exists) {
            const dados = doc.data();
            
            // 1. Atualiza a Foto (Logo)
            if (dados.logoSistema) {
                const imgLogoElement = document.querySelector('.logo img');
                if (imgLogoElement) {
                    imgLogoElement.src = dados.logoSistema;
                    imgLogoElement.style.objectFit = "contain"; 
                    imgLogoElement.style.background = "transparent";
                }
            }

            // 2. Atualiza o Nome do Condomínio embaixo da foto
            if (dados.nome) {
                const textoLogoElement = document.querySelector('.logo h2');
                if (textoLogoElement) {
                    textoLogoElement.innerText = dados.nome.toUpperCase(); 
                }
            }

            // 🚀 3. A CHAVE NA IGNIÇÃO (ENVIANDO VENCIMENTO, STATUS E O LINK DO BOLETO):
            if (typeof carregarBannerDeVencimento === 'function' && dados.vencimento) {
                setTimeout(() => {
                    carregarBannerDeVencimento(dados.vencimento, dados.statusAsaas, dados.linkBoleto); // 👈 Olha o link adicionado aqui no final!
                }, 500);
            }
        }
    }).catch(err => console.log("Erro na logo/nome:", err));
    
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
        const registration = await navigator.serviceWorker.register('./sw.js?v=154');
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

// ==========================================
// 🎨 SISTEMA WHITE LABEL - CARREGAR LOGO
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const meuCond = localStorage.getItem("condominioId");
        
        if (meuCond && typeof db !== 'undefined') {
            db.collection("condominios").doc(meuCond).get().then(doc => {
                if (doc.exists && doc.data().logoSistema) {
                    const imgLogoElement = document.querySelector('.logo img');
                    
                    if (imgLogoElement) {
                        imgLogoElement.src = doc.data().logoSistema;
                        imgLogoElement.style.objectFit = "contain"; 
                        imgLogoElement.style.background = "transparent";
                    }
                }
            }).catch(err => {
                console.log("Erro ao puxar a logo do cliente:", err);
            });
        }
    }, 500);
});

// ==========================================
// 🗜️ COMPRESSOR DE IMAGEM PARA O FIREBASE
// ==========================================
async function comprimirLogo(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (e) => {
            const img = new Image();
            img.src = e.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 300; // Tamanho ideal para logo
                const MAX_HEIGHT = 300;
                let width = img.width;
                let height = img.height;

                // Redimensiona mantendo a proporção
                if (width > height) {
                    if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
                } else {
                    if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
                }

                canvas.width = width; 
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                // Transforma na imagem leve e entrega pro banco em Base64
                resolve(canvas.toDataURL('image/png')); 
            };
        };
    });
}

// ==========================================
// ⏰ MOTOR DO BANNER PREMIUM DE VENCIMENTO
// ==========================================
async function carregarBannerDeVencimento(diaVencimentoDb, statusAsaas, linkBoleto) {
    try {
        // 🛑 ESCUDO PROTETOR: Se a fatura estiver paga ou o sistema não tiver dívidas, não encha o saco do cliente!
        if (statusAsaas === "pago" || statusAsaas === "ativo") {
            const container = document.getElementById('container-banner-vencimento');
            if (container) container.innerHTML = ""; // Limpa qualquer resquício
            console.log("✅ Mensalidade em dia! Banner de vencimento desativado.");
            return; // Interrompe a função aqui e o banner nunca aparece.
        }

        console.log("🔥 Puxando o arquivo do Banner Premium...");
        
        const resposta = await fetch('banner-vencimento.html');
        if (!resposta.ok) {
            console.error("🚨 O Live Server recusou a conexão com o banner:", resposta.status);
            return; 
        }
        
        const htmlDoBanner = await resposta.text();
        
        const container = document.getElementById('container-banner-vencimento');
        if (!container) {
             console.error("🚨 ERRO: A div container-banner-vencimento sumiu do index.html!");
             return;
        }
        container.innerHTML = htmlDoBanner;

        // 👇 A MÁGICA DO BOTÃO DE CHECKOUT INTERNO COM RADAR!
        const btnPagar = document.querySelector('.btn-pagar-premium');
        if (btnPagar) {
            btnPagar.onclick = function() {
                const telaBloqueio = document.getElementById("tela-bloqueio-inadimplente");
                const spanValor = document.getElementById("checkout-valor");
                const inputPixCopia = document.getElementById("checkout-pix-copia");
                const imgQrcode = document.getElementById("checkout-qrcode");
                const inputBarras = document.getElementById("checkout-codigo-barras");
                
                if (telaBloqueio) {
                    telaBloqueio.style.display = "flex"; // Mostra o Checkout
                    const condominioId = obterCondominioAtivo();

                    // LIGA O RADAR: Puxa o Asaas ao vivo para dentro da tela de Checkout!
                    if (condominioId && typeof db !== 'undefined') {
                        db.collection("condominios").doc(condominioId).onSnapshot((docAtualizado) => {
                            if (!docAtualizado.exists) return;
                            const dadosAoVivo = docAtualizado.data();

                            // 1. Preenche o Valor
                            const valorParaCobrar = dadosAoVivo.valorFaturaAtual || dadosAoVivo.valor;
                            if (valorParaCobrar && spanValor) {
                                spanValor.innerText = Number(valorParaCobrar).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                            }

                            // 2. Preenche o PIX
                            if (dadosAoVivo.pixCopiaECola && inputPixCopia) inputPixCopia.value = dadosAoVivo.pixCopiaECola;
                            if (dadosAoVivo.pixQrCodeUrl && imgQrcode) imgQrcode.src = dadosAoVivo.pixQrCodeUrl;

                            // 3. Preenche o Boleto
                            if (dadosAoVivo.linkBoleto) linkBoletoGlobalInterno = dadosAoVivo.linkBoleto;
                            if (dadosAoVivo.codigoBarras && inputBarras) {
                                inputBarras.value = dadosAoVivo.codigoBarras;
                            }

                            // 4. A MÁGICA DO PAGAMENTO AUTOMÁTICO!
                            if (dadosAoVivo.statusAsaas === "pago" || dadosAoVivo.statusAsaas === "ativo") {
                                // Transforma o botão "Pix" num botão verde gigante!
                                const tabPix = document.getElementById("tab-pix");
                                if(tabPix) {
                                    tabPix.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Pagamento Aprovado! Voltando ao sistema...';
                                    tabPix.style.background = "#10b981";
                                    tabPix.style.color = "white";
                                }
                                
                                // Dá 3 segundinhos de glória pra pessoa ver e fecha a tela!
                                setTimeout(() => {
                                    telaBloqueio.style.display = "none";
                                    document.getElementById('container-banner-vencimento').innerHTML = ""; // Some com o banner de vez!
                                }, 3000);
                            }
                        });
                    }
                } else {
                    // Fallback caso a tela não carregue por algum motivo: manda pra aba do Asaas!
                    if (linkBoleto) window.open(linkBoleto, '_blank'); 
                }
            };
        }
        // 👆 FIM DA MÁGICA DO BOTÃO

        if(!diaVencimentoDb) return;
        
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0); 
        
        let dataVencimento = new Date(hoje.getFullYear(), hoje.getMonth(), diaVencimentoDb);
        dataVencimento.setHours(0, 0, 0, 0);

        // =======================================================
        // 🔴 MODO INADIMPLENTE: O BOLETO VENCEU (CARÊNCIA DE 5 DIAS)
        // =======================================================
        if (statusAsaas === "atrasado") {
            console.log("🛑 MODO INADIMPLENTE ATIVADO NO BANNER!");
            
            // Descobre de quando é essa dívida
            if (dataVencimento.getTime() > hoje.getTime()) {
                dataVencimento.setMonth(dataVencimento.getMonth() - 1);
            }
            
            const diffMs = hoje.getTime() - dataVencimento.getTime();
            const diasAtraso = Math.round(diffMs / (1000 * 60 * 60 * 24));
            const diasParaBloqueio = 5 - diasAtraso; // Quantos dias de carência sobraram

            const banner = document.getElementById('banner-premium-vencimento');
            const elContador = document.getElementById('contadorDias');
            const elProgress = document.getElementById('progressBarFill');
            const titulo = document.querySelector('.banner-titulo');
            const descricao = document.querySelector('.banner-descricao');
            const btnFechar = document.querySelector('.btn-close-banner');

            // Só exibe se ainda estiver dentro da carência (<= 5). 
            // Se for > 5, o login.html já bloqueou a entrada de qualquer jeito.
            if (banner && diasAtraso <= 5 && diasAtraso > 0) {
                banner.style.display = 'flex';
                banner.classList.add('urgente');
                
                titulo.textContent = "⚠️ Mensalidade em Atraso";
                titulo.style.color = "#dc2626"; // Vermelho Alerta
                
                descricao.innerHTML = `Identificamos uma fatura pendente há ${diasAtraso} dias.<br>O sistema será <strong>suspenso automaticamente em ${diasParaBloqueio} dia(s)</strong>.`;
                
                elContador.textContent = "BLOQUEIO IMINENTE";
                elContador.style.background = "#dc2626";
                elContador.style.color = "#fff";
                elContador.style.fontSize = "11px";
                
                elProgress.style.width = '100%';
                elProgress.style.background = 'linear-gradient(90deg, #ef4444, #991b1b)';

                // A crueldade do SaaS: Tira a opção de fechar o aviso 😂
                if(btnFechar) btnFechar.style.display = 'none'; 
            }
            return; // Aborta aqui para não rodar a matemática normal de vencimento
        }

        // =======================================================
        // 🟢 MODO AVISO NORMAL: O BOLETO ESTÁ PARA VENCER (Dias -5 a 0)
        // =======================================================
        if (hoje.getTime() > dataVencimento.getTime()) {
            dataVencimento.setMonth(dataVencimento.getMonth() + 1);
        }

        const diffMs = dataVencimento.getTime() - hoje.getTime();
        const diffDias = Math.round(diffMs / (1000 * 60 * 60 * 24));
        
        console.log(`⏰ O robô calculou: Faltam exatos ${diffDias} dias para o próximo vencimento.`);

        const banner = document.getElementById('banner-premium-vencimento');
        const elContador = document.getElementById('contadorDias');
        const elProgress = document.getElementById('progressBarFill');

        if (banner && diffDias <= 5 && diffDias >= 0) { 
            console.log("🚨 Acendendo o Banner Preventivo na tela do cliente!");
            banner.style.display = 'flex'; 
            
            if (diffDias === 0) {
                elContador.textContent = 'HOJE';
                elProgress.style.width = '100%';
                banner.classList.add('urgente');
            } else if (diffDias === 1) {
                elContador.textContent = '1 dia';
                elProgress.style.width = '92%';
                banner.classList.add('urgente');
            } else {
                elContador.textContent = diffDias + ' dias';
                const pct = Math.min(95, Math.max(10, ((30 - diffDias) / 30) * 100));
                elProgress.style.width = pct + '%';
            }
        }

    } catch (erro) {
        console.error('❌ Erro ao carregar o banner premium:', erro);
    }
}

// Botão para fechar o aviso na tela
window.fecharBannerPremium = function() {
    const banner = document.getElementById('banner-premium-vencimento');
    if (banner) {
        banner.classList.add('saindo');
        setTimeout(() => {
            banner.style.display = 'none';
        }, 450); 
    }
}

// 👇 MANTÉM ESSA AQUI! Ela vai conectar com o Asaas em breve!
function abrirFaturaAsaas() {
    // Aqui nós vamos injetar a URL da fatura gerada pelo Asaas amanhã junto com o Webhook!
    alert("Redirecionando para a fatura oficial no Asaas... 💳");
}


// ==========================================
// 🏢 MÓDULO CRM: GESTÃO DE CONTRATOS E CARNÊ (SAAS)
// ==========================================

// 1. Puxa os condomínios do Firebase e monta a tabela do CRM
async function carregarContratosCRM() {
    const tbody = document.getElementById('lista-contratos-crm');
    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 30px; color: #94a3b8;"><i class="fa-solid fa-spinner fa-spin"></i> Buscando clientes no banco de dados...</td></tr>';

    try {
        // Puxa do Firebase
        const snapshot = await db.collection('condominios').get();
        tbody.innerHTML = '';

        if (snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 30px; color: #94a3b8;">Nenhum contrato ativo no momento.</td></tr>';
            return;
        }

        snapshot.forEach(doc => {
            const dados = doc.data();
            const nome = dados.nome || 'Sem Nome';
            const aptos = dados.aptos || 0;
            
            // 🚀 AQUI A CENSURA ENTRA EM AÇÃO PARA A TABELA DE CONTRATOS
            const valorFormatado = formatarMoedaCensurada(dados.valor);
            
            const diaVenc = parseInt(dados.vencimento || 10);
            
            // Verifica se está ativo ou suspenso
            const statusAtivo = dados.status !== false && dados.status !== "false";
            const badgeStatus = statusAtivo 
                ? `<span style="background: #dcfce7; color: #166534; padding: 6px 10px; border-radius: 6px; font-size: 12px; font-weight: bold;">✅ Ativo</span>`
                : `<span style="background: #fee2e2; color: #991b1b; padding: 6px 10px; border-radius: 6px; font-size: 12px; font-weight: bold;">🔴 Suspenso</span>`;

            // Calcula o próximo vencimento no mês atual
            const hoje = new Date();
            let proxVenc = new Date(hoje.getFullYear(), hoje.getMonth(), diaVenc);
            if(hoje.getDate() > diaVenc) {
                proxVenc.setMonth(proxVenc.getMonth() + 1);
            }

            // Cria a linha da tabela
            const tr = document.createElement('tr');
            tr.style.cssText = "border-bottom: 1px solid #e2e8f0; cursor: pointer; transition: 0.2s;";
            tr.onmouseover = () => tr.style.background = '#f8fafc';
            tr.onmouseout = () => tr.style.background = 'white';
            
            // Quando clicar na linha, abre o Modal passando o ID real do cliente!
            tr.onclick = () => abrirFichaCliente(doc.id); 

            tr.innerHTML = `
                <td style="padding: 15px 20px; font-weight: bold; color: #1e293b;"><i class="fa-solid fa-building" style="color: #94a3b8; margin-right: 8px;"></i> ${nome}</td>
                <td style="padding: 15px 20px; color: #64748b;">${aptos} aptos</td>
                <td style="padding: 15px 20px; color: ${ (localStorage.getItem('usuario_cargo') || '').toLowerCase().includes('gestor') ? '#94a3b8' : '#0f172a' }; font-weight: 600;">${valorFormatado}</td>
                <td style="padding: 15px 20px; color: #64748b;">${proxVenc.toLocaleDateString('pt-BR')}</td>
                <td style="padding: 15px 20px;">${badgeStatus}</td>
            `;
            tbody.appendChild(tr);
        });

    } catch (erro) {
        console.error("Erro ao carregar contratos:", erro);
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: red;">Erro ao puxar dados do servidor.</td></tr>';
    }
}

// ==========================================
// 🏢 ABRIR A FICHA COMPLETA DO CLIENTE
// ==========================================
async function abrirFichaCliente(idCondominio) {
    // 3. 🚀 O SEGREDO AQUI: Grava o ID na memória blindada quando abre a ficha!
    memoriaClienteSaaSAtual = idCondominio;

    document.getElementById('modalFichaCliente').style.display = 'flex';
    document.getElementById('ficha-nome-condominio').innerHTML = `<i class="fa-solid fa-spinner fa-spin" style="color: #8b5cf6;"></i> Puxando contrato...`;
    
    const listaParcelas = document.getElementById('lista-parcelas-contrato');
    listaParcelas.innerHTML = '<div style="padding: 20px; text-align: center; color: #94a3b8;">Calculando parcelas...</div>';

    try {
        const doc = await db.collection('condominios').doc(idCondominio).get();
        if (!doc.exists) {
            alert("Cliente não encontrado no banco!");
            return;
        }

        const dados = doc.data();
        
        // ---- MATEMÁTICA E VALORES ----
        const mesesContrato = parseInt(dados.periodo || 12); 
        const mesesPagos = parseInt(dados.mesesPagos || 0);
        const diaVenc = parseInt(dados.vencimento || 10);

        let valorBruto = dados.valor || 0;
        if (typeof valorBruto === 'string') valorBruto = valorBruto.replace(',', '.');
        const valorNum = Number(valorBruto);
        const valorFormatado = `R$ ${valorNum.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
        
        const valorTotalContrato = valorNum * mesesContrato;
        const valorTotalFormatado = `R$ ${valorTotalContrato.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

        // ---- PREENCHENDO O CABEÇALHO ----
        document.getElementById('ficha-nome-condominio').innerText = dados.nome || "Cliente sem nome";
        document.getElementById('ficha-plano').innerText = `${dados.aptos || 0} Aptos`;
        document.getElementById('ficha-sindico').innerText = dados.email || "Não cadastrado";
        document.getElementById('ficha-email').innerText = dados.email || "Não cadastrado";
        
        // 🚀 O SEGUNDO SEGREDO: Foto inteligente com as iniciais do nome!
        const imgFoto = document.getElementById('ficha-foto-condominio');
        if (dados.logoSistema && dados.logoSistema !== "") {
            imgFoto.src = dados.logoSistema;
        } else {
            const nomeFormatado = encodeURIComponent(dados.nome || "Cliente");
            imgFoto.src = `https://ui-avatars.com/api/?name=${nomeFormatado}&background=8b5cf6&color=fff&size=150`;
        }

       // ---- DATAS DO CONTRATO E GERADOR DE NÚMERO OFICIAL (SÓ NÚMEROS) ----
        let dataInicio = dados.criadoEm ? new Date(dados.criadoEm) : new Date();
        let dataFim = new Date(dataInicio);
        dataFim.setMonth(dataFim.getMonth() + mesesContrato);
        
        document.getElementById('ficha-inicio-contrato').innerText = dataInicio.toLocaleDateString('pt-BR');
        document.getElementById('ficha-fim-contrato').innerText = dataFim.toLocaleDateString('pt-BR');
        
        // Mágica do Número do Contrato (100% Numérico e Fixo)
        const ano = dataInicio.getFullYear();
        const mes = String(dataInicio.getMonth() + 1).padStart(2, '0');
        const dia = String(dataInicio.getDate()).padStart(2, '0');
        
        // Cria um código numérico de 4 dígitos baseado no ID do cliente para nunca mudar
        let codigoCliente = 0;
        for(let i = 0; i < idCondominio.length; i++) {
            codigoCliente += idCondominio.charCodeAt(i);
        }
        const sufixoNumerico = String(codigoCliente).padStart(4, '0');
        
        document.getElementById('ficha-num-contrato').innerText = `${ano}${mes}${dia}${sufixoNumerico}`;

        // ---- PREENCHENDO OS CARDS INTELIGENTES ----
        document.getElementById('card-mensalidade-valor').innerText = valorFormatado;
        document.getElementById('card-total-valor').innerText = valorTotalFormatado;
        document.getElementById('card-total-desc').innerText = `${mesesContrato} parcelas de ${valorFormatado}`;
        document.getElementById('card-total-parcelas').innerText = `${mesesContrato} parcelas`;
        document.getElementById('card-parcelas-pagas').innerText = `${mesesPagos} de ${mesesContrato} pagas`;

        // Inteligência do Próximo Vencimento
        const hoje = new Date();
        let proxVenc = new Date(hoje.getFullYear(), hoje.getMonth(), diaVenc);
        if (hoje.getDate() > diaVenc) {
            proxVenc.setMonth(proxVenc.getMonth() + 1);
        }
        document.getElementById('card-prox-vencimento').innerText = proxVenc.toLocaleDateString('pt-BR');
        
        // Alerta de Dias Restantes
        const diffTempo = proxVenc.getTime() - hoje.getTime();
        const diffDias = Math.ceil(diffTempo / (1000 * 3600 * 24));
        const alertaVenc = document.getElementById('card-alerta-vencimento');
        
        if (diffDias === 0) {
            alertaVenc.innerText = "Vence HOJE!";
            alertaVenc.style.color = "#dc2626"; 
        } else if (diffDias < 0) {
            alertaVenc.innerText = `Atrasado há ${Math.abs(diffDias)} dias`;
            alertaVenc.style.color = "#dc2626"; 
        } else if (diffDias <= 5) {
            alertaVenc.innerText = `Faltam ${diffDias} dias`;
            alertaVenc.style.color = "#ea580c"; 
        } else {
            alertaVenc.innerText = `Faltam ${diffDias} dias`;
            alertaVenc.style.color = "#16a34a"; 
        }

        // ---- BARRA DE PROGRESSO E STATUS ----
        const porcentagem = Math.round((mesesPagos / mesesContrato) * 100) || 0;
        document.getElementById('ficha-progresso-texto').innerText = `${mesesPagos} de ${mesesContrato} parcelas pagas (${porcentagem}%)`;
        document.getElementById('ficha-progresso-barra').style.width = `${porcentagem}%`;

        const badgeStatus = document.getElementById('ficha-status-badge');
        if (dados.status !== false && dados.status !== "false") {
            badgeStatus.innerText = "🟢 CONTRATO ATIVO";
            badgeStatus.className = "badge-ativo";
            badgeStatus.style.background = "#dcfce7";
            badgeStatus.style.color = "#166534";
        } else {
            badgeStatus.innerText = "🔴 SUSPENSO";
            badgeStatus.className = "badge-ativo";
            badgeStatus.style.background = "#fee2e2";
            badgeStatus.style.color = "#991b1b";
        }

        // ---- GERANDO O CARNÊ DIGITAL ----
        listaParcelas.innerHTML = ''; 
        for (let i = 1; i <= mesesContrato; i++) {
            let statusHTML = "";
            if (i <= mesesPagos) {
                statusHTML = `<span style="background: #dcfce7; color: #166534; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold;">🟢 PAGO</span>`;
            } else if (i === mesesPagos + 1) {
                statusHTML = `<span style="background: #fef9c3; color: #854d0e; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold;">🟡 EM ABERTO</span>`;
            } else {
                statusHTML = `<span style="background: #f1f5f9; color: #64748b; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold;">⚪ AGUARDANDO</span>`;
            }

            let mesParcela = new Date(dataInicio.getFullYear(), dataInicio.getMonth() + i, diaVenc);
            
            const linha = `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 15px; border-bottom: 1px solid #e2e8f0; background: white;">
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <div style="background: #f1f5f9; color: #475569; font-weight: bold; width: 35px; height: 35px; display: flex; align-items: center; justify-content: center; border-radius: 8px; font-size: 12px;">
                            ${i}/${mesesContrato}
                        </div>
                        <div>
                            <div style="font-weight: 600; color: #1e293b; font-size: 14px;">Vencimento: ${mesParcela.toLocaleDateString('pt-BR')}</div>
                            <div style="color: #64748b; font-size: 12px;">Valor: ${valorFormatado}</div>
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        ${statusHTML}
                        <button class="btn" title="Imprimir Vias do Boleto" onclick="imprimirCarnePDF('${dados.linkBoleto}')" style="margin: 0; background: transparent; border: 1px solid #cbd5e1; color: #64748b; padding: 5px 10px; font-size: 12px; border-radius: 6px; cursor: pointer;" onmouseover="this.style.color='#3b82f6'; this.style.borderColor='#3b82f6';" onmouseout="this.style.color='#64748b'; this.style.borderColor='#cbd5e1';">
                            <i class="fa-solid fa-print"></i>
                        </button>
                    </div>
                </div>
            `;
            listaParcelas.innerHTML += linha;
        }

    } catch (erro) {
        console.error("Erro ao gerar carnê ou buscar cliente:", erro);
        alert("Falha ao abrir ficha do cliente. Verifique a conexão.");
    }
}

// 3. Função de Filtragem Visual (Botões Coloridos do CRM)
function filtrarContratosSaaS(statusEscolhido) {
    const linhas = document.querySelectorAll('#lista-contratos-crm tr');
    
    linhas.forEach(linha => {
        // Se a linha for a de "Carregando" ou "Nenhum contrato", ignora
        if(linha.innerText.includes('Buscando') || linha.innerText.includes('Nenhum')) return;

        const textoLinha = linha.innerText.toLowerCase();
        
        if (statusEscolhido === 'todos') {
            linha.style.display = '';
        } else if (statusEscolhido === 'ativos' && textoLinha.includes('ativo')) {
            linha.style.display = '';
        } else if (statusEscolhido === 'suspensos' && textoLinha.includes('suspenso')) {
            linha.style.display = '';
        } else {
            linha.style.display = 'none'; // Esconde quem não bate com o filtro
        }
    });
}

// ==========================================
// 🖨️ MOTOR INTELIGENTE DE IMPRESSÃO (VIAS)
// ==========================================

function imprimirCarnePDF(urlFatura) {
    // Se o robô ainda não teve tempo de salvar o link no banco de dados
    if (!urlFatura || urlFatura === 'null' || urlFatura === 'undefined') {
        alert("⚠️ O carnê ainda está sendo gerado pelo Asaas ou o link não chegou.\n\nFeche a ficha do cliente, aguarde alguns segundos e abra novamente!");
        return;
    }

    // Abre o boleto do Asaas direto na tela, sem fazer perguntas!
    window.open(urlFatura, '_blank');
}

// ==========================================
// 🔗 CONEXÃO DIRETA COM O ASAAS (NOVAS FUNÇÕES)
// ==========================================

// Função para o botão de link original (caso você use em outro lugar)
function abrirLinkBoleto(urlFatura) {
    if (!urlFatura || urlFatura === 'null' || urlFatura === 'undefined') {
        alert("⚠️ O link deste boleto ainda não foi gerado pelo Asaas ou não está disponível.");
        return;
    }
    // Abre o boleto do Asaas em uma nova aba
    window.open(urlFatura, '_blank');
}
// ==========================================
// 🔗 CONEXÃO DIRETA COM O ASAAS (NOVAS FUNÇÕES)
// ==========================================

// 1. Função para o botão de link (ao lado da etiqueta PAGO / EM ABERTO)
function abrirLinkBoleto(urlFatura) {
    if (!urlFatura || urlFatura === 'null' || urlFatura === 'undefined') {
        alert("⚠️ O link deste boleto ainda não foi gerado pelo Asaas ou não está disponível.");
        return;
    }
    // Abre o boleto do Asaas em uma nova aba
    window.open(urlFatura, '_blank');
}

// 2. O "Truque" para clonar a tela do Asaas na mesma folha A4
function gerarImpressaoDuplaAsaas(urlFatura) {
    let janelaImpressao = window.open('', '_blank');
    
    janelaImpressao.document.write(`
        <html>
        <head>
            <title>Impressão Dupla - Carnê Asaas</title>
            <style>
                body { margin: 0; padding: 0; display: flex; flex-direction: column; height: 100vh; background: white;}
                iframe { width: 100%; height: 49vh; border: none; border-bottom: 2px dashed #94a3b8; }
                @media print { @page { margin: 0; } body { -webkit-print-color-adjust: exact; } }
            </style>
        </head>
        <body>
            <iframe src="${urlFatura}"></iframe>
            <iframe src="${urlFatura}"></iframe>
            <script>
                setTimeout(() => { window.print(); }, 1500);
            <\/script>
        </body>
        </html>
    `);
    
    janelaImpressao.document.close();
}
// ==========================================
// 📸 UPLOAD DE FOTO DO CLIENTE (SAAS)
// ==========================================
// 1. Criamos uma memória blindada para o robô nunca esquecer o cliente
let memoriaClienteSaaSAtual = ""; 

async function fazerUploadFotoCliente(event) {
    const file = event.target.files[0];
    if (!file) return;

    // 2. O robô puxa o ID direto da memória blindada
    const idCondominio = memoriaClienteSaaSAtual; 

    if (!idCondominio || idCondominio === "") {
        alert("Erro: Não foi possível identificar o cliente.");
        return;
    }

    const imgElement = document.getElementById('ficha-foto-condominio');
    const srcOriginal = imgElement.src;
    
    // Efeito visual de carregamento (deixa a foto meio transparente)
    imgElement.style.opacity = '0.5';

    try {
        // Usa a sua função compressora nativa
        const base64Img = await comprimirLogo(file);

        // Salva a foto leve lá no banco de dados do Firebase
        await db.collection('condominios').doc(idCondominio).update({
            logoSistema: base64Img
        });

        // Atualiza a imagem na tela imediatamente
        imgElement.src = base64Img;
        imgElement.style.opacity = '1';
        
        // Atualiza a tabela de trás para refletir a mudança (se ela existir)
        if(typeof carregarContratosCRM === 'function') carregarContratosCRM();

    } catch (erro) {
        console.error("Erro ao salvar a foto:", erro);
        imgElement.src = srcOriginal; // Volta pro que tava se der erro
        imgElement.style.opacity = '1';
        alert("Erro ao salvar a foto. Tente novamente.");
    }
}
