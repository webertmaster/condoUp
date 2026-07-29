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
                    // Troca o "CONDO UP" pelo nome do cliente em maiúsculo
                    textoLogoElement.innerText = dados.nome.toUpperCase(); 
                }
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
        const registration = await navigator.serviceWorker.register('./sw.js?v=140');
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
async function carregarBannerDeVencimento(diaVencimentoDb) {
    try {
        // 1. Puxa o visual do arquivo separado
        const resposta = await fetch('banner-vencimento.html');
        const htmlDoBanner = await resposta.text();
        
        // 2. Injeta na tela
        document.getElementById('container-banner-vencimento').innerHTML = htmlDoBanner;

        // 3. Calcula os dias baseados no dia real do cliente no banco
        if(!diaVencimentoDb) return;
        
        const hoje = new Date();
        let dataVencimento = new Date(hoje.getFullYear(), hoje.getMonth(), diaVencimentoDb);
        
        if (hoje.getDate() > diaVencimentoDb) {
            dataVencimento.setMonth(dataVencimento.getMonth() + 1);
        }

        const diffMs = dataVencimento.getTime() - hoje.getTime();
        const diffDias = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

        // 4. Aplica a inteligência visual
        const banner = document.getElementById('banner-premium-vencimento');
        const elContador = document.getElementById('contadorDias');
        const elProgress = document.getElementById('progressBarFill');

        if (diffDias <= 5 && diffDias >= 0) { 
            banner.style.display = 'block'; 
            
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
        console.log('Erro ao carregar o banner premium:', erro);
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
            
            // 🔥 CORREÇÃO DO VALOR 0,00 AQUI
            let valorBruto = dados.valor || 0;
            if (typeof valorBruto === 'string') {
                valorBruto = valorBruto.replace(',', '.'); // Troca a virgula pra ponto antes de calcular
            }
            const valorFormatado = Number(valorBruto).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
            
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
                <td style="padding: 15px 20px; color: #0f172a; font-weight: 600;">R$ ${valorFormatado}</td>
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

// 2. Abre a Ficha e gera o Carnê Inteligente baseado no Cliente Clicado
async function abrirFichaCliente(idCondominio) {
    document.getElementById('modalFichaCliente').style.display = 'flex';
    document.getElementById('ficha-nome-condominio').innerHTML = `<i class="fa-solid fa-spinner fa-spin" style="color: #8b5cf6;"></i> Puxando contrato...`;
    
    const listaParcelas = document.getElementById('lista-parcelas-contrato');
    listaParcelas.innerHTML = '<div style="padding: 20px; text-align: center; color: #94a3b8;">Calculando parcelas...</div>';

    try {
        // Busca os dados APENAS deste cliente lá no Firebase
        const doc = await db.collection('condominios').doc(idCondominio).get();
        if (!doc.exists) {
            alert("Cliente não encontrado no banco!");
            return;
        }

        const dados = doc.data();
        const mesesContrato = parseInt(dados.periodo || 12); 
        
        // Formatação de valor segura 
        let valorBruto = dados.valor || 0;
        if (typeof valorBruto === 'string') valorBruto = valorBruto.replace(',', '.');
        const valorFormatado = `R$ ${Number(valorBruto).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
        
        // Puxa as parcelas pagas atualizadas pelo Webhook do Asaas
        const mesesPagos = dados.mesesPagos || 0; 

        // Preenche o cabeçalho da Ficha com os dados reais
        document.getElementById('ficha-nome-condominio').innerHTML = `<i class="fa-solid fa-building" style="color: #8b5cf6;"></i> ${dados.nome}`;
        document.getElementById('ficha-cnpj').innerText = dados.cnpj || "Não cadastrado";
        document.getElementById('ficha-sindico').innerText = dados.email || "Não cadastrado";
        document.getElementById('ficha-valor').innerText = valorFormatado;
        document.getElementById('ficha-plano').innerText = `${dados.aptos || 0} Aptos`;
        document.getElementById('ficha-dia-vencimento').innerText = `Dia ${dados.vencimento || 10}`;
        document.getElementById('ficha-meses-contrato').innerText = mesesContrato;

        // Atualiza a Barra de Progresso (Termômetro)
        const porcentagem = Math.round((mesesPagos / mesesContrato) * 100);
        document.getElementById('ficha-progresso-texto').innerText = `${mesesPagos} de ${mesesContrato} meses (${porcentagem}%)`;
        document.getElementById('ficha-progresso-barra').style.width = `${porcentagem}%`;

        // ===============================================
        // MÁGICA DO CARNÊ: Gerando as parcelas dinâmicas!
        // ===============================================
        listaParcelas.innerHTML = ''; 
        
        let dataBaseContrato = dados.criadoEm ? new Date(dados.criadoEm) : new Date();

        for (let i = 1; i <= mesesContrato; i++) {
            let statusHTML = "";
            
            // Regra visual de cores
            if (i <= mesesPagos) {
                statusHTML = `<span style="background: #dcfce7; color: #166534; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold;">🟢 PAGO</span>`;
            } else if (i === mesesPagos + 1) {
                statusHTML = `<span style="background: #fef9c3; color: #854d0e; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold;">🟡 EM ABERTO</span>`;
            } else {
                statusHTML = `<span style="background: #f1f5f9; color: #64748b; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold;">⚪ AGUARDANDO</span>`;
            }

            // 🌟 A MÁGICA DA SINCRONIA COM O ASAAS AQUI:
            // Tiramos o (i - 1) e deixamos só o 'i'. 
            // Agora, se i = 1 (primeira parcela), ele avança 1 mês para o futuro (Ex: Agosto)!
            let mesParcela = new Date(dataBaseContrato.getFullYear(), dataBaseContrato.getMonth() + i, parseInt(dados.vencimento || 10));
            
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
                        <button class="btn" title="Copiar Link de Pagamento (Asaas)" style="margin: 0; background: transparent; border: 1px solid #cbd5e1; color: #64748b; padding: 5px 10px; font-size: 12px;" onmouseover="this.style.color='#3b82f6'; this.style.borderColor='#3b82f6';" onmouseout="this.style.color='#64748b'; this.style.borderColor='#cbd5e1';">
                            <i class="fa-solid fa-link"></i>
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

// ==========================================
// 🖨️ MOTOR INTELIGENTE DE IMPRESSÃO (VIAS)
// ==========================================

function imprimirCarnePDF() {
    // Ao invés de imprimir direto, abre o nosso menu de opções
    const modal = document.getElementById('modalOpcoesImpressao');
    if (modal) modal.style.display = 'flex';
}

function fecharOpcoesImpressao() {
    const modal = document.getElementById('modalOpcoesImpressao');
    if (modal) modal.style.display = 'none';
}

function executarImpressaoPersonalizada() {
    const opcao = document.querySelector('input[name="tipoImpressao"]:checked').value;
    fecharOpcoesImpressao();

    // Remove qualquer classe de impressão anterior por segurança
    document.body.classList.remove('print-duas-mesma-folha', 'print-duas-separadas');

    if (opcao === '1') {
        // Se for 1 via, imprime normal
        window.print();
    } else {
        // Se for 2 vias, o robô CLONA a sua ficha do cliente temporariamente
        const modalOriginal = document.getElementById('modalFichaCliente');
        const cloneFicha = modalOriginal.cloneNode(true);
        cloneFicha.id = 'clone-impressao-temporario';
        document.body.appendChild(cloneFicha);

        // Aplica a regra de layout escolhida
        if (opcao === '2_mesma') {
            document.body.classList.add('print-duas-mesma-folha');
        } else if (opcao === '2_separadas') {
            document.body.classList.add('print-duas-separadas');
        }

        // Dá 300ms para o navegador desenhar o clone na tela antes de abrir a aba de impressão
        setTimeout(() => {
            window.print();
            
            // Depois que o cliente fecha a tela de impressão, o robô varre a sujeira (apaga o clone)
            cloneFicha.remove();
            document.body.classList.remove('print-duas-mesma-folha', 'print-duas-separadas');
        }, 300);
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

// Botão fake para impressão do carnê
function imprimirCarnePDF() {
    alert("Iniciando motor de PDF para gerar o canhoto em meia folha A4...");
}