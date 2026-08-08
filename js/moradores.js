// ==========================================
// ZERO LABS - CONRUJA (NUVEM FIREBASE)
// moradores.js - Gestão Premium de Moradores (MULTI-TENANT ATIVO)
// ==========================================

let moradoresGlobais = []; 
let veiculosGlobaisParaDashboard = []; // Para contar veículos e ligar no Tooltip
let encomendasGlobaisParaDashboard = []; // Para contar encomendas no Tooltip
let deliveryGlobaisParaDashboard = []; // 👈 NOVO: Para puxar o delivery e gerar a notificação
let pendentesGlobais = []; // 👈 NOVO: Para a matriz desenhar as bolinhas amarelas

// App Secundário para criar acessos sem deslogar o Síndico
const secondaryConfig = {
    apiKey: "AIzaSyCY6Jq9GVYJEQrH0JZ9TAWcQVm-cImiwoc",
    authDomain: "portaria-pro-ebc5c.firebaseapp.com",
    projectId: "portaria-pro-ebc5c",
    storageBucket: "portaria-pro-ebc5c.firebasestorage.app",
    messagingSenderId: "948781126590",
    appId: "1:948781126590:web:5e8888eb6e8124f7df5fef"
};

let secondaryApp;
try {
  secondaryApp = firebase.app("SecondaryApp");
} catch(e) {
  secondaryApp = firebase.initializeApp(secondaryConfig, "SecondaryApp");
}
const secondaryAuth = secondaryApp.auth();

// ==========================================
// 1. ESCUTADORES EM TEMPO REAL
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
    const meuCondominio = localStorage.getItem("condominioId");

    if (!meuCondominio) {
        console.error("Erro Crítico: Condomínio não identificado no navegador!");
        return; 
    }

    if (typeof db !== 'undefined') {
        
        // 👉 1. Puxa o total de apartamentos do contrato do Condomínio (Caixinha Verde)
        db.collection("condominios").doc(meuCondominio).onSnapshot(doc => {
            if (doc.exists) {
                const totalAptos = doc.data().aptos || 0;
                const elTotal = document.getElementById('stat-total-aptos');
                if(elTotal) elTotal.innerText = totalAptos;
                // Guarda na memória para podermos calcular a inadimplência depois
                localStorage.setItem("totalAptosCondominio", totalAptos); 
            }
        });

        // 👉 2. Escuta os Moradores
        db.collection("moradores").where("condominioId", "==", meuCondominio).onSnapshot((snapshot) => {
            moradoresGlobais = [];
            snapshot.forEach((doc) => {
                let morador = doc.data();
                morador.id = doc.id; 
                moradoresGlobais.push(morador);
            });
            
            // Ordena os apartamentos (101, 102, 201...)
            moradoresGlobais.sort((a, b) => (a.apto || "").localeCompare((b.apto || ""), undefined, {numeric: true}));
            localStorage.setItem('moradores', JSON.stringify(moradoresGlobais));
            
            atualizarMatrizDeApartamentos();
        });

        // 👉 3. Escuta Veículos para o Tooltip
        db.collection("veiculos").where("condominioId", "==", meuCondominio).onSnapshot((snapshot) => {
            veiculosGlobaisParaDashboard = [];
            snapshot.forEach(doc => veiculosGlobaisParaDashboard.push(doc.data()));
            atualizarMatrizDeApartamentos();
        });

        // 👉 4. Escuta Encomendas para o Tooltip
        db.collection("encomendas").where("condominioId", "==", meuCondominio).onSnapshot((snapshot) => {
            encomendasGlobaisParaDashboard = [];
            snapshot.forEach(doc => {
                if(!doc.data().excluido) encomendasGlobaisParaDashboard.push(doc.data());
            });
            atualizarMatrizDeApartamentos();
        });

        // 👉 5. Escuta Delivery para o Tooltip e Sanfona (NOVO)
        db.collection("delivery").where("condominioId", "==", meuCondominio).onSnapshot((snapshot) => {
            deliveryGlobaisParaDashboard = [];
            snapshot.forEach(doc => {
                if(!doc.data().excluido) deliveryGlobaisParaDashboard.push(doc.data());
            });
            atualizarMatrizDeApartamentos();
        });

        // Inicia o Radar de Cadastros Pendentes
        setTimeout(iniciarRadarDeCadastros, 1500);

    } else {
        console.error("Firebase DB não encontrado. Verifique o index.html");
    }
});


// ==========================================
// 2. RENDERIZAR A MATRIZ DE APARTAMENTOS E O TOOLTIP PREMIUM
// ==========================================
function atualizarMatrizDeApartamentos() {
    const containerMatriz = document.getElementById('container-matriz-aptos');
    if (!containerMatriz) return;

    const termoBusca = (document.getElementById('pesquisaMatriz')?.value || "").toLowerCase().trim();
    const filtroStatus = document.getElementById('filtroStatusMatriz')?.value || "todos";

    const moradoresAtivos = moradoresGlobais.filter(m => !m.excluido);
    containerMatriz.innerHTML = '';
    
    const elCadastrados = document.getElementById('stat-cadastrados');
    const elSemCadastro = document.getElementById('stat-sem-cadastro');
    
    if (elCadastrados) elCadastrados.innerText = moradoresAtivos.length;

    const aptosComCadastro = new Set(moradoresAtivos.map(m => m.apto)).size;
    const totalAptosDoPredio = parseInt(localStorage.getItem("totalAptosCondominio") || 0);
    
    if (elSemCadastro) {
        const semCad = totalAptosDoPredio > 0 ? (totalAptosDoPredio - aptosComCadastro) : 0;
        elSemCadastro.innerText = semCad >= 0 ? semCad : 0;
    }

    const todosOsAptosMapeados = {};

    moradoresAtivos.forEach(m => {
        if (!todosOsAptosMapeados[m.apto]) todosOsAptosMapeados[m.apto] = { tipo: 'verde', dados: [] };
        todosOsAptosMapeados[m.apto].dados.push(m);
    });

    if (typeof pendentesGlobais !== 'undefined') {
        pendentesGlobais.forEach(p => {
            let aptoFormatado = p.bloco && p.bloco !== "Não Informado" ? `${p.bloco} ${p.apto}` : p.apto;
            if (!todosOsAptosMapeados[aptoFormatado]) {
                todosOsAptosMapeados[aptoFormatado] = { tipo: 'amarelo', dados: [p] };
            }
        });
    }

    let aptosConhecidos = Object.keys(todosOsAptosMapeados).length;
    if (aptosConhecidos < totalAptosDoPredio) {
        let aptosFaltantes = totalAptosDoPredio - aptosConhecidos;
        let andar = 1;
        let final = 1;

        while (aptosFaltantes > 0) {
            let numGerado = andar + "0" + final; 
            if (!todosOsAptosMapeados[numGerado]) {
                todosOsAptosMapeados[numGerado] = { tipo: 'vermelho', dados: [{ nome: "Sem Cadastro" }] };
                aptosFaltantes--;
            }
            final++;
            if (final > 4) { final = 1; andar++; }
            if (andar > 300) break; 
        }
    }

    let cardsDesenhados = 0;

    Object.keys(todosOsAptosMapeados).sort((a, b) => a.localeCompare(b, undefined, {numeric: true})).forEach(numeroApto => {
        const info = todosOsAptosMapeados[numeroApto];
        const moradorPrincipal = info.dados[0]; 
        
        let passaBusca = numeroApto.toLowerCase().includes(termoBusca) || moradorPrincipal.nome.toLowerCase().includes(termoBusca);
        let passaStatus = filtroStatus === "todos" || info.tipo === filtroStatus;

        if (passaBusca && passaStatus) {
            cardsDesenhados++;
            const card = document.createElement('div');
            card.className = 'apt-card';

            if (info.tipo === 'verde') {
                const qtdMoradores = info.dados.length;
                const veiculosDoApto = veiculosGlobaisParaDashboard.filter(v => !v.excluido && (v.vaga === numeroApto || v.morador.toLowerCase() === moradorPrincipal.nome.toLowerCase()));
                const qtdEncomendas = encomendasGlobaisParaDashboard.filter(e => e.apto === numeroApto && e.status !== "Entregue").length + deliveryGlobaisParaDashboard.filter(d => d.apto === numeroApto && d.status !== "Entregue" && d.status !== "Finalizado").length;

                // Monta as Placas do Carro estilo Mercosul para o Tooltip
                let veiculosHtml = "";
                if (veiculosDoApto.length > 0) {
                    veiculosHtml = `<div style="display: flex; gap: 5px; flex-wrap: wrap; margin-top: 5px;">`;
                    veiculosDoApto.forEach(v => {
                        veiculosHtml += `
                        <div style="background: white; border: 1px solid #1e293b; border-radius: 4px; text-align: center; font-weight: bold; width: 65px; box-shadow: 0 1px 2px rgba(0,0,0,0.1);">
                            <div style="background: #003399; color: white; font-size: 5px; display: flex; justify-content: center; padding: 1px 0;">BRASIL</div>
                            <div style="font-size: 10px; padding: 2px 0; color: #1e293b;">${v.placa}</div>
                        </div>`;
                    });
                    veiculosHtml += `</div>`;
                } else {
                    veiculosHtml = `<span style="color: #94a3b8; font-weight: normal;"> Nenhum veículo</span>`;
                }

                card.onclick = () => abrirSidePanelApto(numeroApto, info.dados, veiculosDoApto.length, qtdEncomendas);
                
                // 🚀 TOOLTIP NOVO (IDÊNTICO À FOTO, UM POUCO MENOR)
                card.innerHTML = `
                    <div class="status-dot bg-verde"></div>
                    <h3>${numeroApto}</h3>
                    <i class="fa-solid fa-user-check" style="color: #10b981; margin-top: 5px; font-size: 16px;"></i>
                    
                    <div class="apt-tooltip" style="width: 240px; padding: 12px; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.15); background: white; color: #334155; text-align: left; border: 1px solid #e2e8f0; pointer-events: auto; z-index: 100;">
                        <div style="display: flex; justify-content: center; align-items: center; margin-bottom: 12px;">
                            <h4 style="margin: 0; color: #3b82f6; font-size: 16px; display: flex; align-items: center; gap: 6px;"><i class="fa-regular fa-building" style="color:#64748b;"></i> Apto ${numeroApto}</h4>
                        </div>
                        <div style="font-size: 11px; line-height: 1.6;">
                            <p style="margin: 3px 0;"><i class="fa-solid fa-user" style="color: #3b82f6; width: 16px;"></i> <strong>Responsável:</strong> ${moradorPrincipal.nome}</p>
                            <p style="margin: 3px 0;"><i class="fa-brands fa-whatsapp" style="color: #10b981; width: 16px;"></i> <strong>Contatos:</strong> ${moradorPrincipal.telefones ? moradorPrincipal.telefones.join(' | ') : "Não informado"}</p>
                            <p style="margin: 3px 0;"><i class="fa-solid fa-broom" style="color: #8b5cf6; width: 16px;"></i> <strong>Secretária:</strong> ${moradorPrincipal.secretaria || "Nenhuma"}</p>
                            <p style="margin: 3px 0;"><i class="fa-solid fa-users" style="color: #10b981; width: 16px;"></i> <strong>Autorizados:</strong> ${moradorPrincipal.visitantes || "Nenhum"}</p>
                            <p style="margin: 6px 0 2px 0;"><i class="fa-solid fa-car-side" style="color: #f59e0b; width: 16px;"></i> <strong>Veículos vinculados:</strong></p>
                            ${veiculosHtml}
                        </div>
                        <div style="border-top: 1px dashed #cbd5e1; margin-top: 10px; padding-top: 10px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                            <button onclick="event.stopPropagation(); abrirModalCadastroManual('${numeroApto}', '${moradorPrincipal.id}')" style="background: #eff6ff; color: #3b82f6; border: 1px solid #bfdbfe; padding: 6px; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 11px; transition: 0.2s;"><i class="fa-solid fa-pen"></i> Editar</button>
                            <button onclick="event.stopPropagation(); excluirMoradorDefinitivo('${moradorPrincipal.id}', '${moradorPrincipal.nome}', '${moradorPrincipal.condominioId}')" style="background: #fef2f2; color: #ef4444; border: 1px solid #fecaca; padding: 6px; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 11px; transition: 0.2s;"><i class="fa-solid fa-trash-can"></i> Arquivar</button>
                        </div>
                    </div>
                `;
            } else if (info.tipo === 'amarelo') {
                card.onclick = () => abrirModalAprovacao();
                card.innerHTML = `
                    <div class="status-dot bg-amarelo"></div>
                    <h3>${numeroApto}</h3>
                    <i class="fa-solid fa-paper-plane" style="color: #f59e0b; margin-top: 5px; font-size: 16px;"></i>
                    <div class="apt-tooltip">
                        <p style="font-weight: bold; margin-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.2); padding-bottom: 4px;">${moradorPrincipal.nome}</p>
                        <p><i class="fa-solid fa-clock" style="color: #f59e0b; width: 15px; text-align: center;"></i> Aguardando aprovação</p>
                    </div>
                `;
            } else if (info.tipo === 'vermelho') {
                card.onclick = () => abrirModalCadastroManual(numeroApto); 
                card.innerHTML = `
                    <div class="status-dot bg-vermelho"></div>
                    <h3>${numeroApto}</h3>
                    <i class="fa-solid fa-user-xmark" style="color: #ef4444; margin-top: 5px; font-size: 16px;"></i>
                    <div class="apt-tooltip">
                        <p style="font-weight: bold; margin-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.2); padding-bottom: 4px;">Disponível</p>
                        <p><i class="fa-solid fa-plus" style="color: #ef4444; width: 15px; text-align: center;"></i> Clique para cadastrar</p>
                    </div>
                `;
            }
            containerMatriz.appendChild(card);
        }
    });

    if (cardsDesenhados === 0) {
        if (filtroStatus === "vermelho") {
            containerMatriz.innerHTML = '<div style="text-align: center; grid-column: 1 / -1; padding: 40px; color: #64748b;"><i class="fa-solid fa-circle-exclamation" style="font-size: 30px; margin-bottom: 10px; opacity: 0.5;"></i><p>Os apartamentos sem cadastro ainda não foram mapeados individualmente.<br>Para visualizá-los como caixinhas, será necessário ativar a função de "Mapear Blocos" da administração.</p></div>';
        } else {
            containerMatriz.innerHTML = '<div style="text-align: center; grid-column: 1 / -1; padding: 40px; color: #64748b;">Nenhum resultado para os filtros aplicados.</div>';
        }
    }
}

function abrirSidePanelApto(numeroApto, moradores, qtdVeiculos, qtdEncomendas) {
    const sidePanel = document.getElementById('side-panel-apto');
    if(!sidePanel) return;

    const moradorPrincipal = moradores[0];
    const iniciais = moradorPrincipal.nome.split(" ").map(n => n[0]).join("").substring(0,2).toUpperCase();
    let telefone = moradorPrincipal.telefones && moradorPrincipal.telefones.length > 0 ? moradorPrincipal.telefones[0] : "Não informado";

    document.getElementById('sp-numero-apto').innerText = numeroApto;
    
    // Injeta o Morador Titular no Topo
    const divMorador = sidePanel.querySelector('.sp-morador-principal');
    divMorador.innerHTML = `
        <div class="sp-avatar">${iniciais}</div>
        <div style="flex: 1;">
            <h4 style="margin: 0; color: #0f172a; font-size: 16px;">${moradorPrincipal.nome}</h4>
            <p style="margin: 2px 0 0 0; color: #64748b; font-size: 12px;"><i class="fa-brands fa-whatsapp"></i> ${telefone}</p>
            <p style="margin: 2px 0 0 0; color: #64748b; font-size: 12px;"><i class="fa-regular fa-envelope"></i> App Autorizado</p>
        </div>
    `;

    // 1️⃣ PREENCHENDO A SANFONA: MORADORES & AUTORIZADOS
    document.getElementById('qtd-sanfona-moradores').innerText = `${moradores.length} cadastrado(s)`;
    let htmlMoradores = `<p style="margin: 0 0 8px 0; font-weight: bold; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">Pessoas no App:</p>`;
    moradores.forEach(m => {
        htmlMoradores += `<p style="margin: 4px 0;"><i class="fa-solid fa-mobile-screen" style="color: #3b82f6;"></i> ${m.nome}</p>`;
    });
    if(moradorPrincipal.familiares) {
        htmlMoradores += `<p style="margin: 12px 0 4px 0; font-weight: bold; color: #0f172a;">Familiares:</p><p style="margin: 0; color: #64748b;">${moradorPrincipal.familiares}</p>`;
    }
    if(moradorPrincipal.visitantes) {
        htmlMoradores += `<p style="margin: 12px 0 4px 0; font-weight: bold; color: #0f172a;">Autorizados / Prestadores:</p><p style="margin: 0; color: #64748b;">${moradorPrincipal.visitantes}</p>`;
    }
    document.getElementById('sanfona-moradores').innerHTML = htmlMoradores;

    // 2️⃣ PREENCHENDO A SANFONA: VEÍCULOS
    document.getElementById('qtd-sanfona-veiculos').innerText = `${qtdVeiculos} veículo(s) cadastrado(s)`;
    const veiculosDoApto = veiculosGlobaisParaDashboard.filter(v => !v.excluido && (v.vaga === numeroApto || v.morador.toLowerCase() === moradorPrincipal.nome.toLowerCase()));
    let htmlVeiculos = '';
    if(veiculosDoApto.length > 0) {
        veiculosDoApto.forEach(v => {
            htmlVeiculos += `
            <div style="border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 8px;">
                <p style="margin: 0; font-weight: bold; color: #0f172a;"><i class="fa-solid fa-car-side" style="color: #94a3b8;"></i> ${v.modelo || 'Veículo'}</p>
                <p style="margin: 4px 0 0 0; font-size: 11px;">Placa: <strong style="color:#1e293b;">${v.placa || 'N/A'}</strong> | Cor: ${v.cor || 'N/A'}</p>
            </div>`;
        });
    } else {
        htmlVeiculos = `<p style="margin: 0; color: #64748b;">Nenhum veículo cadastrado.</p>`;
    }
    document.getElementById('sanfona-veiculos').innerHTML = htmlVeiculos;

    // 3️⃣ PREENCHENDO A SANFONA: ENCOMENDAS E DELIVERY
    const encomendasDoApto = encomendasGlobaisParaDashboard.filter(e => e.apto === numeroApto && e.status !== "Entregue");
    const deliveryDoApto = deliveryGlobaisParaDashboard.filter(d => d.apto === numeroApto && d.status !== "Entregue" && d.status !== "Finalizado");
    
    const totalPendencias = encomendasDoApto.length + deliveryDoApto.length;
    
    // Atualiza o texto e a BOLINHA DE NOTIFICAÇÃO!
    document.getElementById('qtd-sanfona-encomendas').innerText = `${totalPendencias} pendente(s)`;
    const badgeEncomendas = document.getElementById('badge-sanfona-encomendas');
    
    // Mostra ou esconde a bolinha vermelha dependendo se tem algo
    if (badgeEncomendas) {
        if (totalPendencias > 0) {
            badgeEncomendas.innerText = totalPendencias;
            badgeEncomendas.style.display = 'block';
        } else {
            badgeEncomendas.style.display = 'none';
        }
    }

    let htmlEncomendas = '';
    if(totalPendencias > 0) {
        // Desenha as Encomendas
        encomendasDoApto.forEach(e => {
            let dataFormatada = e.dataChegada ? new Date(e.dataChegada).toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit'}) : 'Recente';
            htmlEncomendas += `
            <div style="border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 8px;">
                <p style="margin: 0; font-weight: bold; color: #3b82f6;"><i class="fa-solid fa-box-open"></i> Pacote: ${e.descricao || 'Encomenda'}</p>
                <p style="margin: 4px 0 0 0; font-size: 11px;">Chegou em: ${dataFormatada}</p>
            </div>`;
        });
        
        // Desenha os Deliveries
        deliveryDoApto.forEach(d => {
            let dataFormatada = d.dataRegistro ? new Date(d.dataRegistro).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'}) : 'Agora';
            htmlEncomendas += `
            <div style="border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 8px;">
                <p style="margin: 0; font-weight: bold; color: #f59e0b;"><i class="fa-solid fa-motorcycle"></i> Delivery: ${d.empresa || d.tipo || 'Lanche'}</p>
                <p style="margin: 4px 0 0 0; font-size: 11px;">Aguardando retirada às ${dataFormatada}</p>
            </div>`;
        });
    } else {
        htmlEncomendas = `<p style="margin: 0; color: #64748b;">Nenhuma encomenda ou delivery pendente.</p>`;
    }
    document.getElementById('sanfona-encomendas').innerHTML = htmlEncomendas;

    // FECHA TODAS AS SANFONAS ANTES DE ABRIR O PAINEL NOVO
    ['moradores', 'veiculos', 'encomendas'].forEach(tipo => {
        const conteudo = document.getElementById(`sanfona-${tipo}`);
        const icone = document.getElementById(`icone-sanfona-${tipo}`);
        if(conteudo) conteudo.style.display = 'none';
        if(icone) icone.classList.replace('fa-chevron-down', 'fa-chevron-right');
    });

    // BOTOES DE AÇÃO
    const divAcoes = sidePanel.querySelector('.sp-acoes-rapidas');
    if(divAcoes) {
        divAcoes.innerHTML = `
            <button class="sp-btn-acao" onclick="abrirModalCadastroManual('${numeroApto}', '${moradorPrincipal.id}')" style="background: #eff6ff; color: #3b82f6; border-color: #bfdbfe;"><i class="fa-solid fa-pen-to-square"></i> Editar Informações</button>
            <button class="sp-btn-acao primary" onclick="gerarQrCodeConvite(localStorage.getItem('condominioId'))"><i class="fa-solid fa-qrcode"></i> Gerar QR Code</button>
            <button class="sp-btn-acao" onclick="reenviarConviteWhatsApp('${moradorPrincipal.nome}', '${telefone}')"><i class="fa-solid fa-paper-plane"></i> Reenviar Convite</button>
            <button class="sp-btn-acao" onclick="resetarSenhaMorador('${numeroApto}', '${telefone}')"><i class="fa-solid fa-key"></i> Resetar Senha</button>
            <button class="sp-btn-acao danger" onclick="excluirMoradorDefinitivo('${moradorPrincipal.id}', '${moradorPrincipal.nome}', '${moradorPrincipal.condominioId}')"><i class="fa-solid fa-trash-can"></i> Desativar Apto</button>
        `;
    }

    sidePanel.style.display = 'block';
}

function fecharSidePanelApto() {
    document.getElementById('side-panel-apto').style.display = 'none';
}

// 🚀 FUNÇÃO QUE FAZ O EFEITO DE ABRIR/FECHAR A SANFONA
function abrirDetalheSanfona(tipo) {
    const conteudo = document.getElementById(`sanfona-${tipo}`);
    const icone = document.getElementById(`icone-sanfona-${tipo}`);
    
    if (conteudo.style.display === 'none') {
        conteudo.style.display = 'block';
        icone.classList.replace('fa-chevron-right', 'fa-chevron-down');
    } else {
        conteudo.style.display = 'none';
        icone.classList.replace('fa-chevron-down', 'fa-chevron-right');
    }
}

// ==========================================
// 3. 🚨 LIXEIRA BLINDADA: EXCLUSÃO DO SIDE PANEL
// ==========================================
async function excluirMoradorDefinitivo(idMorador, nomeMorador, idCondominio) {
    
    // Se for Porteiro (Operacional), joga ele no novo fluxo de Arquivamento
    if (window.isPorteiroLogado === true) {
        if(typeof solicitarArquivamentoRestrito === 'function') {
            solicitarArquivamentoRestrito("moradores", idMorador);
        } else {
            alert("⚠️ Função de arquivamento restrito não encontrada.");
        }
        return; 
    }

    // Fluxo do Síndico / Gestão
    if(!confirm(`🚨 EXCLUSÃO DEFINITIVA\n\nTem certeza que deseja apagar os dados de ${nomeMorador}?\nIsso removerá a ficha e CORTARÁ O ACESSO dele ao aplicativo imediatamente!`)) return;

    try {
        // Apaga a ficha da tela de Moradores
        await db.collection("moradores").doc(idMorador).delete();

        // Procura a conta de login dele (na coleção usuarios) e DELETA também!
        const snapUsuarios = await db.collection("usuarios")
            .where("condominioId", "==", idCondominio)
            .where("nome", "==", nomeMorador)
            .get();

        if (!snapUsuarios.empty) {
            const batch = db.batch();
            snapUsuarios.forEach(doc => {
                batch.delete(doc.ref); // Apaga o perfil de acesso e derruba o login
            });
            await batch.commit();
        }

        alert("✅ Morador e acesso ao aplicativo excluídos definitivamente com sucesso!");
        fecharSidePanelApto();

    } catch (error) {
        console.error("Erro ao excluir morador:", error);
        alert("❌ Erro ao tentar excluir do banco de dados: " + error.message);
    }
}


// ==========================================
// 4. PAINEL DE APROVAÇÃO E CONTADORES
// ==========================================
function iniciarRadarDeCadastros() {
    const condominioIdLogado = localStorage.getItem("condominioId");
    const badge = document.getElementById('badge-pendentes');
    
    if(!condominioIdLogado) return;

    db.collection("cadastrosPendentes")
      .where("condominioId", "==", condominioIdLogado)
      .where("status", "==", "Pendente")
      .onSnapshot((snapshot) => {
          const quantidade = snapshot.size;
          
          // Atualiza a bolinha vermelha do botão
          if (badge) {
              if (quantidade > 0) {
                  badge.innerText = quantidade;
                  badge.style.display = 'block'; 
              } else {
                  badge.style.display = 'none'; 
              }
          }

          // 👉 Atualiza o Card Amarelo Gigante
          const statPendentes = document.getElementById('stat-pendentes');
          if (statPendentes) statPendentes.innerText = quantidade;
      });
}

function abrirModalAprovacao() {
    document.getElementById('modalAprovacaoMoradores').style.display = 'flex';
    carregarCadastrosPendentes();
}

function fecharModalAprovacao() {
    document.getElementById('modalAprovacaoMoradores').style.display = 'none';
}

function carregarCadastrosPendentes() {
    const condominioIdLogado = localStorage.getItem("condominioId");
    const container = document.getElementById('lista-moradores-pendentes');
    container.innerHTML = '<p style="color: #94a3b8; text-align: center;"><i class="fa-solid fa-spinner fa-spin"></i> Buscando solicitações...</p>';

    db.collection("cadastrosPendentes")
      .where("condominioId", "==", condominioIdLogado)
      .where("status", "==", "Pendente")
      .get()
      .then((snapshot) => {
          container.innerHTML = ''; 
          if (snapshot.empty) {
              container.innerHTML = '<div style="text-align: center; color: #64748b; padding: 20px;"><i class="fa-solid fa-check-double" style="font-size: 30px; margin-bottom: 10px;"></i><br>Nenhum cadastro pendente.</div>';
              return;
          }

          snapshot.forEach((doc) => {
              const dados = doc.data();
              const id = doc.id;
              
              const autorizados = dados.autorizados ? `<p style="color: #94a3b8; font-size: 12px; margin: 5px 0 0 0;"><i class="fa-solid fa-users"></i> Autorizados: ${dados.autorizados}</p>` : '';
              const carrosQtd = (dados.veiculosObj && dados.veiculosObj.length > 0) ? `<p style="color: #f59e0b; font-size: 12px; margin: 5px 0 0 0;"><i class="fa-solid fa-car"></i> Veículos: ${dados.veiculosObj.length}</p>` : '';

              container.innerHTML += `
                <div style="background: #1e293b; border: 1px solid #334155; border-radius: 10px; padding: 15px; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <h4 style="color: #f8fafc; margin: 0 0 5px 0; font-size: 16px;">${dados.nome}</h4>
                        <p style="color: #94a3b8; font-size: 13px; margin: 0;"><i class="fa-solid fa-building"></i> Bloco ${dados.bloco} - Apto ${dados.apto}</p>
                        <p style="color: #94a3b8; font-size: 13px; margin: 0;"><i class="fa-brands fa-whatsapp"></i> ${dados.celular}</p>
                        ${autorizados}
                        ${carrosQtd}
                    </div>
                    <div style="display: flex; gap: 10px;">
                        <button onclick="recusarMorador('${id}')" style="background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3); padding: 8px 12px; border-radius: 6px; cursor: pointer;"><i class="fa-solid fa-xmark"></i></button>
                        <button onclick="aprovarMorador('${id}', this)" style="background: #10b981; color: white; border: none; padding: 8px 12px; border-radius: 6px; cursor: pointer; font-weight: bold;"><i class="fa-solid fa-check"></i> Aprovar</button>
                    </div>
                </div>
              `;
          });
      })
      .catch((error) => {
          console.error("Erro:", error);
          container.innerHTML = '<p style="color: #ef4444;">Erro ao carregar dados.</p>';
      });
}

async function aprovarMorador(docId, btnElement) {
    const confirmar = confirm(`Deseja aprovar e criar os acessos definitivos?`);
    if (!confirmar) return;

    if(btnElement) btnElement.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Criando...';

    try {
        const condominioIdLogado = localStorage.getItem("condominioId");
        
        // 1. Puxa os dados originais do banco
        const docRef = await db.collection("cadastrosPendentes").doc(docId).get();
        const dados = docRef.data();
        
        let prefixoBloco = (dados.bloco && dados.bloco !== "Não Informado") ? dados.bloco.toLowerCase() : "";
        const aptoFormatado = prefixoBloco ? `${dados.bloco} ${dados.apto}` : dados.apto;
        
        const emailLogin = `${condominioIdLogado.toLowerCase()}_${prefixoBloco}${dados.apto}@conruja.com.br`.replace(/\s+/g, '').normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const senhaGerada = `CONRUJA@${dados.apto}`; 

        // 2. Criação na autenticação
        const userCredential = await secondaryAuth.createUserWithEmailAndPassword(emailLogin, senhaGerada);
        const novoUid = userCredential.user.uid;

        // 3. Salva Perfil de Usuário
        await db.collection("usuarios").doc(novoUid).set({
            nome: dados.nome,
            bloco: dados.bloco,
            apartamento: dados.apto,
            telefone: dados.celular,
            emailPessoal: dados.emailPessoal || dados.email || "", 
            cargo: "Morador",
            condominioId: condominioIdLogado,
            emailAcesso: emailLogin,
            dataCadastro: new Date().toISOString()
        });
        
        // 4. Salva Ficha do Morador
        await db.collection("moradores").add({
            nome: dados.nome,
            apto: aptoFormatado,
            telefones: [dados.celular],
            secretaria: dados.secretaria || "",
            visitantes: dados.autorizados || "",
            dataCadastro: new Date().toISOString(),
            condominioId: condominioIdLogado,
            excluido: false
        });

       // 5. BATELADA DE VEÍCULOS
        if (dados.veiculosObj && dados.veiculosObj.length > 0) {
            const batch = db.batch(); 
            dados.veiculosObj.forEach(v => {
                const newVeiculoRef = db.collection("veiculos").doc();
                batch.set(newVeiculoRef, {
                    condominioId: condominioIdLogado,
                    morador: dados.nome,           
                    nomeMorador: dados.nome,       
                    placa: v.placa,
                    modelo: v.modelo,
                    cor: v.cor,
                    vaga: aptoFormatado,           
                    dataCadastro: new Date().toISOString(),
                    excluido: false
                });
            });
            await batch.commit(); 
        }

        // 6. Atualiza o status do Cadastro Pendente
        await db.collection("cadastrosPendentes").doc(docId).update({ status: "Aprovado" });

        carregarCadastrosPendentes(); 
        secondaryAuth.signOut(); 

        // ==========================================
        // 7. INTEGRAÇÃO BREVO (DISPARO DE E-MAIL)
        // ==========================================
        const emailRealDoMorador = dados.emailPessoal || dados.email;
        if (emailRealDoMorador && emailRealDoMorador.trim() !== "") {
            const assuntoEmail = "Seus dados de acesso - CONRUJA";
            const htmlDaMensagem = `
                <div style="font-family: Arial, sans-serif; color: #334155; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
                    <h2 style="color: #3b82f6; text-align: center;">Bem-vindo(a) ao CONRUJA!</h2>
                    <p>Olá, <b>${dados.nome}</b>! 🎉</p>
                    <p>O seu cadastro foi <b>aprovado</b> pela administração do condomínio. Abaixo estão os seus dados oficiais para acessar o aplicativo da portaria:</p>
                    
                    <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px dashed #cbd5e1;">
                        <p style="margin: 5px 0;"><b>📱 Aplicativo:</b> <a href="https://app.conruja.com.br/" style="color: #3b82f6; text-decoration: none;">app.conruja.com.br/</a></p>
                        <p style="margin: 5px 0;"><b>📧 E-mail (Login):</b> ${emailLogin}</p>
                        <p style="margin: 5px 0;"><b>🔑 Senha provisória:</b> ${senhaGerada}</p>
                    </div>
                    
                    <p style="font-size: 13px; color: #64748b;"><i>Recomendamos fortemente que você altere sua senha no seu primeiro acesso, acessando a aba "Meu Perfil" no menu do sistema.</i></p>
                </div>
            `;
            
            if(typeof dispararEmail === 'function') {
                dispararEmail(emailRealDoMorador, dados.nome, assuntoEmail, htmlDaMensagem);
            }
        }

        // ==========================================
        // 8. ENVIO VIA WHATSAPP
        // ==========================================
        let numeroLimpo = dados.celular.replace(/\D/g, '');
        if (numeroLimpo.length === 10 || numeroLimpo.length === 11) { numeroLimpo = '55' + numeroLimpo; }

        const textoMsg = `Olá, ${dados.nome}! 🎉\n\nSeu acesso ao app da portaria foi *aprovado*.\n\n📱 *Link:* app.conruja.com.br\n📧 *Login:* ${emailLogin}\n🔑 *Senha:* ${senhaGerada}\n\n_Recomendamos alterar sua senha no primeiro acesso!_`;
        const linkWhatsApp = `https://wa.me/${numeroLimpo}?text=${encodeURIComponent(textoMsg)}`;

        window.open(linkWhatsApp, '_blank');

    } catch (error) {
        console.error("Erro:", error);
        alert("❌ Erro ao criar acessos definitivos. Pode ser erro de conexão.");
        carregarCadastrosPendentes();
    }
}

function recusarMorador(docId) {
    if (confirm("Tem certeza que deseja recusar e excluir esta solicitação?")) {
        db.collection("cadastrosPendentes").doc(docId).delete().then(() => {
            carregarCadastrosPendentes();
        });
    }
}

// ==========================================
// 5. EXPORTAR RELATÓRIO PDF
// ==========================================
function gerarRelatorioMoradores() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.setTextColor(15, 23, 42);
    doc.text("Relatório de Moradores e Autorizados", 14, 20);
    
    const moradoresAtivos = moradoresGlobais.filter(m => !m.excluido);
    
    if (moradoresAtivos.length === 0) {
        alert("Não há moradores ativos cadastrados para gerar relatório.");
        return;
    }
    
    const dados = moradoresAtivos.map(m => [
        m.apto,
        m.nome,
        m.secretaria || '-',
        m.visitantes || '-'
    ]);

    doc.autoTable({
        startY: 30,
        head: [['Apto', 'Nome do Responsável', 'Secretária', 'Visitantes Autorizados']],
        body: dados,
        theme: 'striped',
        headStyles: { fillColor: [15, 23, 42] },
        styles: { fontSize: 10, cellPadding: 4 }
    });

    doc.save("Auditoria_Moradores_Ativos.pdf");
}

// ==========================================
// 🚀 AÇÕES RÁPIDAS DO SIDE PANEL
// ==========================================

function reenviarConviteWhatsApp(nome, celular) {
    if (!celular || celular === "Não informado") {
        alert("⚠️ Este morador não possui um telefone cadastrado.");
        return;
    }
    
    // Limpa a máscara do número
    let numeroLimpo = celular.replace(/\D/g, '');
    if (numeroLimpo.length === 10 || numeroLimpo.length === 11) { numeroLimpo = '55' + numeroLimpo; }
    
    const linkAcesso = "https://app.conruja.com.br/";
    const textoMsg = `Olá, ${nome}! 🎉\n\nAqui está o link oficial de acesso ao seu painel do condomínio:\n📱 *Link:* ${linkAcesso}\n\nLembre-se que o seu login é o e-mail que você cadastrou conosco. Qualquer dúvida, estamos à disposição!`;
    
    // Abre direto na conversa do morador
    window.open(`https://wa.me/${numeroLimpo}?text=${encodeURIComponent(textoMsg)}`, '_blank');
}

async function resetarSenhaMorador(apto, celular) {
    const condominioId = localStorage.getItem("condominioId");
    
    try {
        // Busca a conta de login atrelada a este apartamento
        const snap = await db.collection("usuarios")
            .where("condominioId", "==", condominioId)
            .where("apartamento", "==", apto)
            .get();
            
        if(snap.empty) {
            alert("❌ Nenhum acesso de login encontrado para este apartamento.");
            return;
        }
        
        const userData = snap.docs[0].data();
        const emailParaReset = userData.emailAcesso || userData.emailPessoal;

        if(confirm(`Deseja enviar um link de redefinição de senha para o e-mail de acesso deste apartamento?\n\nDestino: ${emailParaReset}`)) {
            
            // Envia o link oficial do Firebase para o e-mail do cara
            await firebase.auth().sendPasswordResetEmail(emailParaReset);
            alert("✅ E-mail de redefinição enviado com sucesso para " + emailParaReset);
            
            // Opcional: Abre o WhatsApp para avisar o morador que o e-mail chegou!
            if(celular && celular !== "Não informado") {
                let numeroLimpo = celular.replace(/\D/g, '');
                if (numeroLimpo.length === 10 || numeroLimpo.length === 11) numeroLimpo = '55' + numeroLimpo;
                
                const textoMsg = `Olá! Solicitamos a redefinição da sua senha de acesso do CONRUJA.\n\nPor favor, verifique o seu e-mail: *${emailParaReset}* (dê uma olhada na lixeira/spam caso não encontre na caixa principal) para cadastrar sua nova senha. 🔐`;
                window.open(`https://wa.me/${numeroLimpo}?text=${encodeURIComponent(textoMsg)}`, '_blank');
            }
        }
    } catch(e) {
        console.error("Erro no reset de senha:", e);
        alert("❌ Ocorreu um erro ao tentar resetar a senha.");
    }
}
// ==========================================
// 🚀 CADASTRO MANUAL E MODO EDIÇÃO (FULL DARK THEME)
// ==========================================
let idMoradorEmEdicao = null;

function abrirModalCadastroManual(aptoPredefinido = "", idMorador = null) {
    document.getElementById('modalCadastroManual').style.display = 'flex';
    idMoradorEmEdicao = idMorador; // Marca se é edição ou cadastro novo

    // Limpa todos os campos primeiro
    document.getElementById('manual-nome').value = '';
    document.getElementById('manual-email').value = '';
    document.getElementById('manual-senha').value = '';
    document.getElementById('manual-bloco').value = '';
    document.getElementById('manual-apto').value = '';
    document.getElementById('manual-secretaria').value = '';
    document.getElementById('manual-familiares').value = '';
    document.getElementById('manual-visitantes').value = '';
    document.getElementById('modal-container-telefones').innerHTML = `
        <div style="display: flex; gap: 8px; align-items: center;">
            <input type="tel" class="modal-telefone-input" placeholder="(00) 00000-0000" style="flex: 1; background: #020617; border: 1px solid #1e293b; color: #f8fafc; padding: 12px 14px; border-radius: 10px; font-size: 14px; outline: none; box-sizing: border-box; margin: 0;">
            <button type="button" onclick="adicionarTelefoneModal()" style="width: 42px; height: 42px; border-radius: 8px; border: none; background: #10b981; color: white; font-size: 16px; cursor: pointer; flex: none; transition: 0.2s;"><i class="fa-solid fa-plus"></i></button>
        </div>`;

    const btnSalvar = document.getElementById('btnSalvarManualFull');

    if (idMoradorEmEdicao) {
        // 🚀 MODO EDIÇÃO ATIVADO
        const morador = moradoresGlobais.find(m => m.id === idMoradorEmEdicao);
        if(morador) {
            document.getElementById('manual-nome').value = morador.nome || '';
            
            // Separa bloco e apto se estiverem juntos ("B 301")
            let aptoTxt = morador.apto || '';
            if(aptoTxt.includes(" ")) {
                let partes = aptoTxt.split(" ");
                document.getElementById('manual-bloco').value = partes[0];
                document.getElementById('manual-apto').value = partes.slice(1).join(" ");
            } else {
                document.getElementById('manual-apto').value = aptoTxt;
            }

            document.getElementById('manual-secretaria').value = morador.secretaria || '';
            document.getElementById('manual-visitantes').value = morador.visitantes || '';
            
            // Telefones
            if (morador.telefones && morador.telefones.length > 0) {
                document.querySelector('.modal-telefone-input').value = morador.telefones[0];
                for (let i = 1; i < morador.telefones.length; i++) {
                    adicionarTelefoneModal(morador.telefones[i]);
                }
            }
            
            // Oculta e-mail e senha porque na edição a gente só edita o painel
            document.getElementById('manual-email').parentElement.parentElement.style.display = 'none';
            btnSalvar.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Salvar Alterações';
        }
    } else {
        // 🚀 MODO NOVO CADASTRO
        if (aptoPredefinido) document.getElementById('manual-apto').value = aptoPredefinido;
        document.getElementById('manual-email').parentElement.parentElement.style.display = 'grid'; // Mostra e-mail e senha
        btnSalvar.innerHTML = '<i class="fa-solid fa-rocket"></i> Enviar Cadastro';
    }
}

function fecharModalCadastroManual() {
    document.getElementById('modalCadastroManual').style.display = 'none';
    idMoradorEmEdicao = null;
}

function adicionarTelefoneModal(valor = '') {
    const container = document.getElementById('modal-container-telefones');
    const div = document.createElement('div');
    div.style.display = 'flex'; div.style.gap = '8px'; div.style.alignItems = 'center';
    div.innerHTML = `
        <input type="tel" class="modal-telefone-input" value="${valor}" placeholder="Outro Telefone" style="flex: 1; background: #020617; border: 1px solid #1e293b; color: #f8fafc; padding: 12px 14px; border-radius: 10px; font-size: 14px; outline: none; box-sizing: border-box; margin: 0;">
        <button type="button" onclick="this.parentElement.remove()" style="width: 42px; height: 42px; border-radius: 8px; border: none; background: #ef4444; color: white; font-size: 16px; cursor: pointer; flex: none; transition: 0.2s;"><i class="fa-solid fa-minus"></i></button>
    `;
    container.appendChild(div);
}

function adicionarVeiculoModal() {
    const container = document.getElementById('modal-container-veiculos');
    const div = document.createElement('div');
    div.style.display = 'flex'; div.style.gap = '8px'; div.style.alignItems = 'center';
    div.innerHTML = `
        <input type="text" class="modal-vei-placa" placeholder="Placa" oninput="mascararPlacaModal(this)" maxlength="8" style="width: 100px; text-transform: uppercase; font-weight: bold; text-align: center; background: #020617; border: 1px solid #1e293b; color: #f8fafc; padding: 12px 8px; border-radius: 10px; font-size: 14px; outline: none; box-sizing: border-box; margin: 0;">
        <input type="text" class="modal-vei-modelo" placeholder="Modelo" style="flex: 1; background: #020617; border: 1px solid #1e293b; color: #f8fafc; padding: 12px 8px; border-radius: 10px; font-size: 14px; outline: none; box-sizing: border-box; margin: 0;">
        <input type="text" class="modal-vei-cor" placeholder="Cor" style="width: 80px; background: #020617; border: 1px solid #1e293b; color: #f8fafc; padding: 12px 8px; border-radius: 10px; font-size: 14px; outline: none; box-sizing: border-box; margin: 0;">
        <button type="button" onclick="this.parentElement.remove()" style="width: 42px; height: 42px; border-radius: 8px; border: none; background: #ef4444; color: white; font-size: 16px; cursor: pointer; flex: none; transition: 0.2s;"><i class="fa-solid fa-minus"></i></button>
    `;
    container.appendChild(div);
}

function mascararPlacaModal(input) {
    let valor = input.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (valor.length > 3) {
        valor = valor.substring(0, 3) + '-' + valor.substring(3, 7);
    }
    input.value = valor;
}

async function salvarMoradorManualFull() {
    const nome = document.getElementById('manual-nome').value.trim();
    const bloco = document.getElementById('manual-bloco').value.trim();
    const apto = document.getElementById('manual-apto').value.trim();
    const secretaria = document.getElementById('manual-secretaria').value.trim();
    const familiares = document.getElementById('manual-familiares').value.trim();
    const visitantes = document.getElementById('manual-visitantes').value.trim();
    const condominioIdLogado = localStorage.getItem("condominioId");

    if (!nome || !apto) {
        alert("⚠️ Nome e Apartamento são obrigatórios!");
        return;
    }

    // Coleta Telefones
    const inputsTel = document.querySelectorAll('.modal-telefone-input');
    const listaTelefones = Array.from(inputsTel).map(input => input.value.trim()).filter(val => val !== "");

    const btnSalvar = document.getElementById('btnSalvarManualFull');
    btnSalvar.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Salvando...';
    btnSalvar.disabled = true;

    let prefixoBloco = (bloco) ? `${bloco} ` : "";
    const aptoFormatado = `${prefixoBloco}${apto}`;

    try {
        if (idMoradorEmEdicao) {
            // ATUALIZA O MORADOR EXISTENTE
            await db.collection("moradores").doc(idMoradorEmEdicao).update({
                nome: nome,
                apto: aptoFormatado,
                telefones: listaTelefones,
                secretaria: secretaria,
                familiares: familiares,
                visitantes: visitantes
            });
            alert('✅ Dados do morador atualizados com sucesso!');
        } else {
            // CRIA UM NOVO NA FILA (Exige e-mail e senha)
            const email = document.getElementById('manual-email').value.trim();
            const senha = document.getElementById('manual-senha').value.trim();
            
            if (!email || !senha) { alert("⚠️ E-mail e Senha são obrigatórios no cadastro!"); return; }
            if (senha.length < 6) { alert("⚠️ A senha deve ter no mínimo 6 caracteres."); return; }

            // Coleta Veículos apenas no Cadastro
            const placas = document.querySelectorAll('.modal-vei-placa');
            const modelos = document.querySelectorAll('.modal-vei-modelo');
            const cores = document.querySelectorAll('.modal-vei-cor');
            let veiculosArray = [];
            for(let i = 0; i < placas.length; i++) {
                if(placas[i].value || modelos[i].value) veiculosArray.push({ placa: placas[i].value || '', modelo: modelos[i].value || '', cor: cores[i].value || '' });
            }

            await db.collection("cadastrosPendentes").add({
                nome: nome, email: email, senha: senha, apto: apto, bloco: bloco || "Não Informado",
                secretaria: secretaria, familiares: familiares, visitantes: visitantes,
                celular: listaTelefones.join(' | ') || "Não Informado", veiculosObj: veiculosArray,
                condominioId: condominioIdLogado, cargo: "Morador", status: "Pendente", dataRegistro: new Date().toISOString()
            });
            alert('✅ Morador enviado para a fila de "Pendentes" (Amarelo). Aprove-o para gerar o acesso.');
        }

        fecharModalCadastroManual();
    } catch (error) {
        console.error(error);
        alert('❌ Erro ao salvar: ' + error.message);
    } finally {
        btnSalvar.disabled = false;
        btnSalvar.innerHTML = idMoradorEmEdicao ? '<i class="fa-solid fa-floppy-disk"></i> Salvar Alterações' : '<i class="fa-solid fa-rocket"></i> Enviar Cadastro';
    }
}
