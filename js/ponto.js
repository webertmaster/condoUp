// ==========================================
// ZERO LABS - PORTARIA PRO MASTER
// ponto.js - Relógio de Ponto Inteligente (RH Corporativo)
// ==========================================

let pontosGlobais = []; 
let usuarioNomeAtual = "Desconhecido";
let usuarioCargoAtual = "Porteiro";
let listenerPontoAtivo = null;

// ==========================================
// 1. INICIALIZAÇÃO E IDENTIFICAÇÃO (RADAR)
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
    iniciarPontoDigital();
});

function iniciarPontoDigital() {
    const statusText = document.getElementById('statusAtualPonto');
    const meuCondominio = localStorage.getItem("condominioId");

    if (!meuCondominio) {
        if(statusText) statusText.innerHTML = '<span style="color: #ef4444;"><i class="fa-solid fa-triangle-exclamation"></i> Erro: Condomínio não encontrado. Faça login novamente.</span>';
        return;
    }

    // O Radar: Fica procurando o nome real do usuário a cada meio segundo
    let tentativas = 0;
    const buscadorDeLogin = setInterval(() => {
        // Tenta pegar da tela inicial ou da memória
        let nomeDash = document.getElementById('nomeFuncionarioLogado');
        let nomeTela = nomeDash ? nomeDash.innerText.trim() : "";
        let nomeMemoria = localStorage.getItem('usuario_logado_nome') || localStorage.getItem('nomeUsuario') || "";
        
        let nomeReal = nomeTela !== "Usuário" ? nomeTela : nomeMemoria;
        let cargoReal = localStorage.getItem('usuario_cargo') || localStorage.getItem('cargoUsuario') || "Porteiro";

        // Se achou um nome válido (e que não seja a palavra 'carregando')
        if (nomeReal && nomeReal !== "Usuário" && !nomeReal.toLowerCase().includes("carregando")) {
            clearInterval(buscadorDeLogin); // Desliga o radar, achamos!
            
            usuarioNomeAtual = nomeReal;
            usuarioCargoAtual = cargoReal;
            
            const nomeEl = document.getElementById('nomeIdentificadoPonto');
            if(nomeEl) nomeEl.innerText = usuarioNomeAtual;
            if(statusText) statusText.innerText = "Sincronizando com a nuvem...";

            // Liga o Firebase só agora que sabemos quem é
            conectarFirebasePonto(meuCondominio);
        }
        
        tentativas++;
        if (tentativas > 20) { // Se passar 10 segundos e não achar, avisa do erro
            clearInterval(buscadorDeLogin);
            if(statusText) statusText.innerHTML = '<span style="color: #ef4444;"><i class="fa-solid fa-triangle-exclamation"></i> Tempo esgotado ao buscar login. Recarregue a página.</span>';
            const areaBotoes = document.getElementById('areaBotoesPonto');
            if(areaBotoes) areaBotoes.innerHTML = `<button class="btn" style="background: #ef4444;" onclick="location.reload()">Recarregar Página</button>`;
        }
    }, 500);
}

function conectarFirebasePonto(condominio) {
    if(typeof db !== 'undefined') {
        if (listenerPontoAtivo) listenerPontoAtivo(); // Limpa escuta anterior se houver
        
        listenerPontoAtivo = db.collection("ponto").where("condominioId", "==", condominio).onSnapshot((snapshot) => {
            pontosGlobais = [];
            snapshot.forEach((doc) => {
                let p = doc.data();
                p.id = doc.id;
                pontosGlobais.push(p);
            });
            
            pontosGlobais.sort((a, b) => b.timestamp - a.timestamp);

            verificarStatusBotoes();
            mostrarPontos();
            inicializarTelaPontoGestor(condominio); // Chama a nova função de inicialização do gestor
            atualizarFiltrosRelatorio();
            if(typeof atualizarDashboard === 'function') atualizarDashboard();
        }, (error) => {
            console.error("Erro Firebase Ponto:", error);
            document.getElementById('statusAtualPonto').innerHTML = "⚠️ Erro de conexão com o banco de dados.";
        });
    }
}

// ==========================================
// 2. MÁQUINA DE ESTADOS (Botões Dinâmicos)
// ==========================================
function verificarStatusBotoes() {
    const areaBotoes = document.getElementById('areaBotoesPonto');
    const statusText = document.getElementById('statusAtualPonto');
    if(!areaBotoes) return;

    // Pega a data exata local (evita bug de fuso horário UTC)
    const agora = new Date();
    const dataHoje = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}-${String(agora.getDate()).padStart(2, '0')}`;
    
    // Filtra só os pontos DE HOJE e DO USUÁRIO LOGADO
    const pontosHoje = pontosGlobais.filter(p => p.nome === usuarioNomeAtual && p.data === dataHoje);

    let temEntrada = pontosHoje.some(p => p.tipo === 'Entrada');
    let temPausa = pontosHoje.some(p => p.tipo === 'Pausa Almoço');
    let temRetorno = pontosHoje.some(p => p.tipo === 'Retorno Almoço');
    let temSaida = pontosHoje.some(p => p.tipo === 'Saída');

    let htmlBotoes = '';

    if (!temEntrada) {
        statusText.innerText = "Você ainda não iniciou seu expediente hoje.";
        htmlBotoes = `<button class="btn" style="background: #10b981; margin:0; padding: 20px; font-size: 16px; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 4px 12px rgba(16,185,129,0.3);" onclick="registrarPonto('Entrada')"><i class="fa-solid fa-play"></i> Registrar Entrada</button>`;
    } 
    else if (temEntrada && !temPausa && !temSaida) {
        statusText.innerText = "🟢 Você está em serviço.";
        htmlBotoes = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                <button class="btn" style="background: #f59e0b; margin:0; padding: 20px; font-size: 16px; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 4px 12px rgba(245,158,11,0.3);" onclick="registrarPonto('Pausa Almoço')"><i class="fa-solid fa-pause"></i> Pausa Almoço</button>
                <button class="btn" style="background: #ef4444; margin:0; padding: 20px; font-size: 16px; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 4px 12px rgba(239,68,68,0.3);" onclick="registrarPonto('Saída')"><i class="fa-solid fa-stop"></i> Finalizar Expediente</button>
            </div>`;
    } 
    else if (temPausa && !temRetorno) {
        statusText.innerText = "⏸️ Você está em horário de almoço/intervalo.";
        htmlBotoes = `<button class="btn" style="background: #3b82f6; margin:0; padding: 20px; font-size: 16px; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 4px 12px rgba(59,130,246,0.3);" onclick="registrarPonto('Retorno Almoço')"><i class="fa-solid fa-rotate-right"></i> Registrar Retorno</button>`;
    } 
    else if (temRetorno && !temSaida) {
        statusText.innerText = "🟢 Você retornou e está em serviço.";
        htmlBotoes = `<button class="btn" style="background: #ef4444; margin:0; padding: 20px; font-size: 16px; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 4px 12px rgba(239,68,68,0.3);" onclick="registrarPonto('Saída')"><i class="fa-solid fa-stop"></i> Finalizar Expediente</button>`;
    } 
    else if (temSaida) {
        statusText.innerHTML = '<span style="color: #ef4444; font-weight: bold;"><i class="fa-solid fa-bed"></i> Expediente finalizado por hoje.</span>';
        htmlBotoes = `<div style="padding: 15px; background: #fef2f2; border: 1px dashed #fca5a5; color: #ef4444; border-radius: 8px;"><i class="fa-solid fa-check-double"></i> Seu ponto de hoje já foi encerrado com sucesso.</div>`;
    }

    areaBotoes.innerHTML = htmlBotoes;
}

// ==========================================
// 3. REGISTRAR PONTO NA NUVEM
// ==========================================
function registrarPonto(tipo) {
    if (!usuarioNomeAtual || usuarioNomeAtual === "Usuário" || usuarioNomeAtual === "Desconhecido") {
        alert('⚠️ Erro Crítico: Sistema perdeu sua sessão. Recarregue a página para bater o ponto.');
        return;
    }

    const obsInput = document.getElementById('obsPonto');
    const obsTexto = obsInput ? obsInput.value.trim() : "";

    const botoes = document.querySelectorAll("#areaBotoesPonto .btn");
    botoes.forEach(b => { b.style.pointerEvents = "none"; b.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Gravando na nuvem...'; });

    const dataHora = new Date();
    const dataLocal = `${dataHora.getFullYear()}-${String(dataHora.getMonth() + 1).padStart(2, '0')}-${String(dataHora.getDate()).padStart(2, '0')}`;
    const horaLocal = dataHora.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit', second:'2-digit'});
    
    const meuCondominio = localStorage.getItem("condominioId");
    
    const registro = {
        nome: usuarioNomeAtual,
        tipo: tipo, 
        data: dataLocal, 
        hora: horaLocal, 
        observacao: obsTexto,
        timestamp: dataHora.getTime(),
        condominioId: meuCondominio
    };

    db.collection("ponto").add(registro).then(() => {
        const primeiroNome = usuarioNomeAtual.split(' ')[0];
        
        // Atualiza o status atual do ponto do usuário na coleção 'usuarios' ou 'equipe'
        atualizarStatusUsuario(usuarioNomeAtual, tipo, meuCondominio).then(() => {
            alert(`✅ Ponto Batido com Sucesso!\n\n${tipo} registrado para ${primeiroNome}.\n⏰ Horário: ${registro.hora}`);
            if(obsInput) obsInput.value = '';
        });
        
    }).catch((err) => {
        alert("Erro ao registrar ponto: " + err);
        verificarStatusBotoes(); // Volta o botão ao normal em caso de erro
    });
}

// Função para atualizar o status do funcionário para o painel de gestão
function atualizarStatusUsuario(nome, tipoPonto, condominioId) {
    return new Promise((resolve, reject) => {
        let status = "Fora";
        if(tipoPonto === "Entrada" || tipoPonto === "Retorno Almoço") status = "Trabalhando";
        if(tipoPonto === "Pausa Almoço") status = "Almoço";

        // Tenta achar na tabela de usuários primeiro
        db.collection("usuarios")
          .where("nome", "==", nome)
          .where("condominioId", "==", condominioId)
          .get()
          .then((snapshot) => {
              if(!snapshot.empty) {
                  const docId = snapshot.docs[0].id;
                  db.collection("usuarios").doc(docId).update({ statusAtualPonto: status }).then(resolve).catch(reject);
              } else {
                  resolve(); // Resolve mesmo se não achar, para não travar o fluxo do alerta
              }
          }).catch(reject);
    });
}

// ==========================================
// 4. PAINEL PREMIUM EM TEMPO REAL DO GESTOR
// ==========================================

let equipeServico = [];
let equipeAlmoco = [];
let equipeIntervalo = [];
let equipeFora = [];

function inicializarTelaPontoGestor(condominioLogado) {
    const cargo = localStorage.getItem("usuario_cargo") || "Porteiro";
    const painelGestao = document.getElementById('painelGestaoPonto');

    const cargosAutorizados = ['Síndico', 'sindico', 'SINDICO', 'Gerente', 'Administrador(a)', 'ADM', 'admin-master'];

    if (painelGestao && cargosAutorizados.includes(cargo)) {
        painelGestao.style.display = 'block';
        console.log("📊 Painel de Gestão de Ponto liberado para o cargo:", cargo);
        ouvirStatusEquipeEmTempoReal(condominioLogado);
    } else if (painelGestao) {
        painelGestao.style.display = 'none';
    }
}

function ouvirStatusEquipeEmTempoReal(condominioId) {
    if (!condominioId) {
        console.error("⚠️ Erro: condominioId não encontrado para puxar a equipe.");
        return;
    }

    db.collection("usuarios")
    .where("condominioId", "==", condominioId)
    .onSnapshot((snapshot) => {
        
        equipeServico = [];
        equipeAlmoco = [];
        equipeIntervalo = [];
        equipeFora = [];

        snapshot.forEach((doc) => {
            let funcionario = doc.data();
            
            // Ignora cargos de gestão na contagem
            const cargosExcluidos = ["Síndico", "sindico", "ADM", "Gerente", "Administrador(a)"];
            if (!cargosExcluidos.includes(funcionario.cargo)) {
                let status = funcionario.statusAtualPonto || "Fora"; 
                let dadosFunc = { nome: funcionario.nome || "Sem Nome", cargo: funcionario.cargo || "Funcionário" };

                if (status === "Trabalhando" || status === "Em Serviço") equipeServico.push(dadosFunc);
                else if (status === "Almoço" || status === "Almoco") equipeAlmoco.push(dadosFunc);
                else if (status === "Intervalo") equipeIntervalo.push(dadosFunc);
                else equipeFora.push(dadosFunc);
            }
        });

        // Atualiza a tela
        const cardServico = document.getElementById('card-qtd-servico');
        if(cardServico) cardServico.innerText = equipeServico.length;
        
        const cardAlmoco = document.getElementById('card-qtd-almoco');
        if(cardAlmoco) cardAlmoco.innerText = equipeAlmoco.length;
        
        const cardIntervalo = document.getElementById('card-qtd-intervalo');
        if(cardIntervalo) cardIntervalo.innerText = equipeIntervalo.length;
        
        const cardFora = document.getElementById('card-qtd-fora');
        if(cardFora) cardFora.innerText = equipeFora.length;
        
    }, (error) => {
        console.error("Erro ao escutar status da equipe:", error);
    });
}

function abrirModalEquipePonto(tipo) {
    const modal = document.getElementById('modalGestaoPonto');
    const listaDiv = document.getElementById('modalPontoLista');
    const titulo = document.getElementById('modalPontoTitulo');
    const header = document.getElementById('modalPontoHeader');
    
    if(!modal || !listaDiv || !titulo || !header) return;

    listaDiv.innerHTML = '';
    let listaParaMostrar = [];
    let corBg = "";

    if (tipo === 'servico') {
        listaParaMostrar = equipeServico;
        titulo.innerText = "🟢 Equipe em Serviço";
        corBg = "#10b981";
    } else if (tipo === 'almoco') {
        listaParaMostrar = equipeAlmoco;
        titulo.innerText = "🟠 Equipe no Almoço";
        corBg = "#f59e0b";
    } else if (tipo === 'intervalo') {
        listaParaMostrar = equipeIntervalo;
        titulo.innerText = "☕ Equipe no Intervalo";
        corBg = "#ca8a04";
    } else if (tipo === 'fora') {
        listaParaMostrar = equipeFora;
        titulo.innerText = "🔴 Fora de Serviço";
        corBg = "#ef4444";
    }

    header.style.background = corBg;

    if (listaParaMostrar.length === 0) {
        listaDiv.innerHTML = '<p style="text-align:center; color:#64748b; padding:20px;">Nenhum funcionário neste status agora.</p>';
    } else {
        listaParaMostrar.forEach(func => {
            listaDiv.innerHTML += `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; border-bottom: 1px solid #e2e8f0; background: #f8fafc; border-radius: 8px; margin-bottom: 8px;">
                    <div>
                        <strong style="color: #1e293b; display: block; font-size: 15px;">${func.nome}</strong>
                        <span style="color: #64748b; font-size: 12px; font-weight: bold;">${func.cargo}</span>
                    </div>
                </div>
            `;
        });
    }

    modal.style.display = 'flex';
}

// ==========================================
// 5. RENDERIZAR HISTÓRICO EM TELA
// ==========================================
function atualizarFiltrosRelatorio() {
    let equipe = [];
    if (typeof equipeGlobais !== 'undefined' && equipeGlobais.length > 0) { equipe = equipeGlobais; } 
    else { equipe = JSON.parse(localStorage.getItem('equipe')) || []; }
    
    const filtroPonto = document.getElementById('filtroFuncionarioPonto');
    
    const cargosGestao = ['síndico', 'sindico', 'gerente', 'administrador', 'admin', 'sub síndico', 'sub-síndico', 'adm'];
    const temPermissao = cargosGestao.some(c => usuarioCargoAtual.toLowerCase().includes(c));

    if(filtroPonto) {
        if(temPermissao) {
            filtroPonto.innerHTML = '<option value="" disabled selected>Todos os Funcionários</option>';
            equipe.forEach(f => { filtroPonto.innerHTML += `<option value="${f.nome}">${f.nome}</option>`; });
        } else {
            filtroPonto.innerHTML = `<option value="${usuarioNomeAtual}" selected>${usuarioNomeAtual} (Meu Histórico)</option>`;
            filtroPonto.style.display = 'none'; 
        }
    }
}

function filtrarPorSeletores() { mostrarPontos(); }

function mostrarPontos() {
    const lista = document.getElementById('listaPontos');
    const telaPonto = document.getElementById('ponto');
    
    if (!lista || (telaPonto && telaPonto.style.display === 'none')) return;

    const filtroMes = document.getElementById('filtroMesPonto')?.value;
    
    const cargosGestao = ['síndico', 'sindico', 'gerente', 'administrador', 'admin', 'sub síndico', 'sub-síndico', 'adm'];
    const isGestor = cargosGestao.some(c => usuarioCargoAtual.toLowerCase().includes(c));
    let filtroFunc = isGestor ? document.getElementById('filtroFuncionarioPonto')?.value : usuarioNomeAtual;

    lista.innerHTML = '';
    let filtrados = pontosGlobais; 

    if (filtroMes) filtrados = filtrados.filter(p => p.data.startsWith(filtroMes));
    if (filtroFunc) filtrados = filtrados.filter(p => p.nome === filtroFunc);

    if (filtrados.length === 0) {
        lista.innerHTML = '<div style="text-align: center; grid-column: 1 / -1; padding: 40px; background: white; border-radius: 12px; border: 1px dashed #cbd5e1; color: #64748b;"><i class="fa-solid fa-clock" style="font-size: 30px; margin-bottom: 10px; opacity: 0.5;"></i><p>Nenhum registro de ponto encontrado para este mês.</p></div>';
        return;
    }

    filtrados.forEach(p => {
        const dataFormatada = p.data.split('-').reverse().join('/'); 
        let corBadge = '#64748b'; let iconeBadge = 'fa-fingerprint';
        const tipoRegistro = p.tipo || p.acao || 'Registro S/N';

        if(tipoRegistro === 'Entrada') { corBadge = '#10b981'; iconeBadge = 'fa-play'; }
        else if(tipoRegistro === 'Pausa Almoço') { corBadge = '#f59e0b'; iconeBadge = 'fa-pause'; }
        else if(tipoRegistro === 'Retorno Almoço') { corBadge = '#3b82f6'; iconeBadge = 'fa-rotate-right'; }
        else if(tipoRegistro === 'Saída') { corBadge = '#ef4444'; iconeBadge = 'fa-stop'; }

        const obsBadge = p.observacao ? `<p style="margin-top: 8px; font-size: 11px; background: #fef2f2; color: #ef4444; padding: 5px; border-radius: 4px; border-left: 2px solid #ef4444;">${p.observacao}</p>` : '';

        const card = document.createElement('div');
        card.className = 'card';
        card.style.borderLeft = `5px solid ${corBadge}`;
        
        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; border-bottom: 1px dashed #e2e8f0; padding-bottom: 10px;">
                <span style="background: ${corBadge}; color: white; padding: 5px 12px; border-radius: 20px; font-size: 11px; font-weight: bold; display: flex; align-items: center; gap: 5px;">
                    <i class="fa-solid ${iconeBadge}"></i> ${tipoRegistro}
                </span>
                <strong style="font-size: 18px; color: #0f172a; letter-spacing: 1px; font-family: monospace;">${p.hora || '00:00:00'}</strong>
            </div>
            <h3 style="font-size: 15px; margin-bottom: 8px; color: #1e293b; display: flex; align-items: center; gap: 8px;">
                <i class="fa-solid fa-id-badge" style="color: #64748b;"></i> ${p.nome || 'Usuário'}
            </h3>
            <p style="color: #64748b; font-size: 12px; display: flex; align-items: center; gap: 8px;">
                <i class="fa-regular fa-calendar" style="color: #94a3b8;"></i> ${dataFormatada}
            </p>
            ${obsBadge}
        `;
        lista.appendChild(card);
    });
}

// ==========================================
// 6. EXTRATOR AUTOMÁTICO DE FOLHA CLT (PDF)
// ==========================================
async function gerarFolhaPontoIndividual(param1 = null, param2 = null) {
    let funcionarioNome = document.getElementById("filtroFuncionarioPonto")?.value;
    let mesAno = document.getElementById("filtroMesPonto")?.value; 

    const cargosGestao = ['síndico', 'sindico', 'gerente', 'administrador', 'admin', 'sub síndico', 'sub-síndico', 'adm'];
    const isGestor = cargosGestao.some(c => usuarioCargoAtual.toLowerCase().includes(c));
    if(!isGestor) funcionarioNome = usuarioNomeAtual;

    if (typeof param1 === 'string' && param1.trim() !== '') {
        funcionarioNome = param1;
        mesAno = param2;
    }

    if (!funcionarioNome || !mesAno) {
        alert("⚠️ Selecione o Mês (e o Funcionário) para gerar o PDF.");
        return;
    }

    const [ano, mes] = mesAno.split('-');
    const meuCondominio = localStorage.getItem("condominioId");
    const diasNoMes = new Date(ano, mes, 0).getDate();

    let btnGerar = null;
    let textoOriginal = "";
    if (param1 && param1.currentTarget) btnGerar = param1.currentTarget;
    else if (typeof event !== 'undefined' && event && event.currentTarget) btnGerar = event.currentTarget;

    if (btnGerar) {
        textoOriginal = btnGerar.innerHTML;
        btnGerar.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
        btnGerar.style.pointerEvents = 'none';
    }

    try {
        let cargo = "Não informado"; let cpf = "Não informado"; let assinatura = null;
        
        const equipeSnap = await db.collection("equipe").where("condominioId", "==", meuCondominio).where("nome", "==", funcionarioNome).get();
        if (!equipeSnap.empty) {
            let dadosEquipe = equipeSnap.docs[0].data();
            cargo = dadosEquipe.cargo || "Não informado"; cpf = dadosEquipe.cpf || "______________________"; assinatura = dadosEquipe.assinatura || null; 
        }

        const pontoSnap = await db.collection("ponto").where("condominioId", "==", meuCondominio).where("nome", "==", funcionarioNome).get();
        let registrosMes = {};
        pontoSnap.forEach(doc => {
            let p = doc.data();
            if (p.data && p.data.startsWith(mesAno)) {
                let dia = p.data.split('-')[2];
                if(!registrosMes[dia]) registrosMes[dia] = {};
                registrosMes[dia][p.tipo] = p.hora; 
            }
        });

        const { jsPDF } = window.jspdf; const doc = new jsPDF();

        doc.setTextColor(15, 23, 42); doc.setFontSize(16); doc.setFont("helvetica", "bold");
        doc.text("CONDO UP - REGISTRO DE PONTO", 105, 15, null, null, "center");
        doc.setLineWidth(0.5); doc.line(14, 18, 196, 18);

        doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.text(`Mês/Ano:`, 14, 25); doc.setFont("helvetica", "normal"); doc.text(`${mes}/${ano}`, 33, 25);
        doc.setFont("helvetica", "bold"); doc.text(`Nome:`, 14, 31); doc.setFont("helvetica", "normal"); doc.text(`${funcionarioNome}`, 27, 31);
        doc.setFont("helvetica", "bold"); doc.text(`CPF:`, 110, 25); doc.setFont("helvetica", "normal"); doc.text(`${cpf}`, 120, 25);
        doc.setFont("helvetica", "bold"); doc.text(`Cargo:`, 110, 31); doc.setFont("helvetica", "normal"); doc.text(`${cargo}`, 123, 31);

        let linhasTabela = [];
        for (let i = 1; i <= diasNoMes; i++) {
            let diaStr = String(i).padStart(2, '0'); let reg = registrosMes[diaStr] || {};
            linhasTabela.push([ diaStr, reg["Entrada"] || "", reg["Pausa Almoço"] || "", reg["Retorno Almoço"] || "", reg["Saída"] || "", "" ]);
        }

        doc.autoTable({
            startY: 35,
            head: [['Dia', 'Entrada', 'Saída p/ Almoço', 'Retorno', 'Saída', 'Hora extra']],
            body: linhasTabela, theme: 'grid',
            headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], halign: 'center', fontStyle: 'bold', lineWidth: 0.1 },
            bodyStyles: { textColor: [0, 0, 0], lineWidth: 0.1 },
            columnStyles: { 0: { halign: 'center', fontStyle: 'bold' }, 1: { halign: 'center' }, 2: { halign: 'center' }, 3: { halign: 'center' }, 4: { halign: 'center' } },
            styles: { cellPadding: 1.5, fontSize: 9, font: 'helvetica' } 
        });

        let finalY = doc.lastAutoTable.finalY + 15;
        if (assinatura && assinatura.length > 50) doc.addImage(assinatura, 'PNG', 75, finalY, 60, 20);
        
        doc.setLineWidth(0.3); doc.line(55, finalY + 22, 155, finalY + 22);
        doc.setFont("helvetica", "bold"); doc.text("Assinatura do Funcionário", 105, finalY + 27, null, null, "center");

        doc.save(`Folha_Ponto_${funcionarioNome.replace(/\s+/g, '_')}_${mes}_${ano}.pdf`);

    } catch (erro) {
        alert("⚠️ Ocorreu um erro ao gerar a folha.");
    } finally {
        if (btnGerar) { btnGerar.innerHTML = textoOriginal; btnGerar.style.pointerEvents = 'auto'; }
    }
}

function mascararCpf(input) {
    let value = input.value.replace(/\D/g, ''); 
    value = value.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    input.value = value;
}
