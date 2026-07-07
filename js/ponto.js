// ==========================================
// ZERO LABS - PORTARIA PRO MASTER
// ponto.js - Relógio de Ponto Inteligente (RH Corporativo)
// ==========================================

let pontosGlobais = []; 
let usuarioNomeAtual = "Desconhecido";
let usuarioCargoAtual = "Porteiro";

// ==========================================
// 1. INICIALIZAÇÃO E IDENTIFICAÇÃO DO USUÁRIO
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
    // 🚀 CAÇADOR DE LOGIN: Tenta achar o nome em todas as gavetas possíveis do seu sistema
    usuarioNomeAtual = localStorage.getItem('nomeUsuario') || 
                       localStorage.getItem('usuarioNome') || 
                       localStorage.getItem('usuario_nome') || 
                       localStorage.getItem('nome') || 
                       localStorage.getItem('usuario_logado_nome') || 
                       sessionStorage.getItem('usuarioLogado') || 
                       "Usuário";

    usuarioCargoAtual = localStorage.getItem('usuario_cargo') || localStorage.getItem('cargoUsuario') || "Porteiro";

    // Mostra na tela imediatamente
    const nomeEl = document.getElementById('nomeIdentificadoPonto');
    if(nomeEl) nomeEl.innerText = usuarioNomeAtual;

    // 🚀 PLANO B (A Mágica): Se o navegador não achar, ele "rouba" o nome lá da aba Dashboard depois de 1 segundo!
    setTimeout(() => {
        let nomeDashboard = document.getElementById('nomeFuncionarioLogado');
        if (nomeDashboard && nomeDashboard.innerText !== "Usuário" && nomeDashboard.innerText.trim() !== "") {
            usuarioNomeAtual = nomeDashboard.innerText.trim();
            if(nomeEl) nomeEl.innerText = usuarioNomeAtual;
            
            // Recarrega os botões agora que sabe quem é
            verificarStatusBotoes();
            mostrarPontos();
        }
    }, 1500);

    const meuCondominio = localStorage.getItem("condominioId");

    if (!meuCondominio) {
        console.error("Erro: Condomínio não identificado no navegador!");
        return;
    }

    if(typeof db !== 'undefined') {
        db.collection("ponto").where("condominioId", "==", meuCondominio).onSnapshot((snapshot) => {
            pontosGlobais = [];
            snapshot.forEach((doc) => {
                let p = doc.data();
                p.id = doc.id;
                pontosGlobais.push(p);
            });
            
            pontosGlobais.sort((a, b) => b.timestamp - a.timestamp);

            verificarStatusBotoes();
            mostrarPontos();
            renderizarPainelGestor();
            atualizarFiltrosRelatorio();
            if(typeof atualizarDashboard === 'function') atualizarDashboard();
        });
    }
});

// ==========================================
// 2. MÁQUINA DE ESTADOS (Botões Dinâmicos)
// ==========================================
function verificarStatusBotoes() {
    const areaBotoes = document.getElementById('areaBotoesPonto');
    const statusText = document.getElementById('statusAtualPonto');
    if(!areaBotoes) return;

    const dataHoje = new Date().toISOString().split('T')[0];
    
    // Filtra só os pontos DE HOJE e DO USUÁRIO LOGADO
    const pontosHoje = pontosGlobais.filter(p => p.nome === usuarioNomeAtual && p.data === dataHoje);

    let temEntrada = pontosHoje.some(p => p.tipo === 'Entrada');
    let temPausa = pontosHoje.some(p => p.tipo === 'Pausa Almoço');
    let temRetorno = pontosHoje.some(p => p.tipo === 'Retorno Almoço');
    let temSaida = pontosHoje.some(p => p.tipo === 'Saída');

    let htmlBotoes = '';

    if (!temEntrada) {
        statusText.innerText = "Você ainda não iniciou seu expediente hoje.";
        htmlBotoes = `<button class="btn" style="background: #10b981; margin:0; padding: 20px; font-size: 16px; display: flex; align-items: center; justify-content: center; gap: 8px;" onclick="registrarPonto('Entrada')"><i class="fa-solid fa-play"></i> Registrar Entrada</button>`;
    } 
    else if (temEntrada && !temPausa && !temSaida) {
        statusText.innerText = "🟢 Você está em serviço.";
        htmlBotoes = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                <button class="btn" style="background: #f59e0b; margin:0; padding: 20px; font-size: 16px; display: flex; align-items: center; justify-content: center; gap: 8px;" onclick="registrarPonto('Pausa Almoço')"><i class="fa-solid fa-pause"></i> Pausa Almoço</button>
                <button class="btn" style="background: #ef4444; margin:0; padding: 20px; font-size: 16px; display: flex; align-items: center; justify-content: center; gap: 8px;" onclick="registrarPonto('Saída')"><i class="fa-solid fa-stop"></i> Finalizar Expediente</button>
            </div>`;
    } 
    else if (temPausa && !temRetorno) {
        statusText.innerText = "⏸️ Você está em horário de almoço/intervalo.";
        htmlBotoes = `<button class="btn" style="background: #3b82f6; margin:0; padding: 20px; font-size: 16px; display: flex; align-items: center; justify-content: center; gap: 8px;" onclick="registrarPonto('Retorno Almoço')"><i class="fa-solid fa-rotate-right"></i> Registrar Retorno</button>`;
    } 
    else if (temRetorno && !temSaida) {
        statusText.innerText = "🟢 Você retornou e está em serviço.";
        htmlBotoes = `<button class="btn" style="background: #ef4444; margin:0; padding: 20px; font-size: 16px; display: flex; align-items: center; justify-content: center; gap: 8px;" onclick="registrarPonto('Saída')"><i class="fa-solid fa-stop"></i> Finalizar Expediente</button>`;
    } 
    else if (temSaida) {
        statusText.innerText = "🔴 Expediente finalizado por hoje.";
        htmlBotoes = `<div style="padding: 15px; background: #fef2f2; border: 1px dashed #fca5a5; color: #ef4444; border-radius: 8px;"><i class="fa-solid fa-check-double"></i> Seu ponto de hoje já foi encerrado.</div>`;
    }

    areaBotoes.innerHTML = htmlBotoes;
}

// ==========================================
// 3. REGISTRAR PONTO NA NUVEM
// ==========================================
function registrarPonto(tipo) {
    if (usuarioNomeAtual === "Usuário" || usuarioNomeAtual === "Desconhecido") {
        alert('⚠️ Erro de Autenticação: Seu login não foi identificado. Faça login novamente.');
        return;
    }

    const obsInput = document.getElementById('obsPonto');
    const obsTexto = obsInput ? obsInput.value.trim() : "";

    const botoes = document.querySelectorAll("#areaBotoesPonto .btn");
    botoes.forEach(b => { b.style.pointerEvents = "none"; b.innerHTML = "Salvando..."; });

    const dataHora = new Date();
    const meuCondominio = localStorage.getItem("condominioId");
    
    const registro = {
        nome: usuarioNomeAtual,
        tipo: tipo, 
        data: dataHora.toISOString().split('T')[0], 
        hora: dataHora.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit', second:'2-digit'}), 
        observacao: obsTexto,
        timestamp: dataHora.getTime(),
        condominioId: meuCondominio
    };

    db.collection("ponto").add(registro).then(() => {
        const primeiroNome = usuarioNomeAtual.split(' ')[0];
        alert(`✅ Ponto Batido!\n\n${tipo} registrado para ${primeiroNome}.\n⏰ Horário: ${registro.hora}`);
        if(obsInput) obsInput.value = '';
    }).catch((err) => {
        alert("Erro ao registrar ponto: " + err);
    });
}

// ==========================================
// 4. PAINEL DO GESTOR (Bolinhas Verde/Vermelha)
// ==========================================
function renderizarPainelGestor() {
    const painel = document.getElementById('painelGestaoPonto');
    if(!painel) return;

    // Só mostra para chefia
    const cargosGestao = ['síndico', 'sindico', 'gerente', 'administrador', 'admin'];
    const temPermissao = cargosGestao.some(c => usuarioCargoAtual.toLowerCase().includes(c));

    if (!temPermissao) {
        painel.style.display = 'none';
        return;
    }

    painel.style.display = 'block';

    let equipe = [];
    if (typeof equipeGlobais !== 'undefined' && equipeGlobais.length > 0) {
        equipe = equipeGlobais;
    } else {
        equipe = JSON.parse(localStorage.getItem('equipe')) || [];
    }

    const dataHoje = new Date().toISOString().split('T')[0];
    const listaEmServicoEl = document.getElementById('listaEmServico');
    const listaForaServicoEl = document.getElementById('listaForaServico');
    
    let trabalhandoHtml = '';
    let folgaHtml = '';
    let qtdTrab = 0;
    let qtdFolga = 0;

    equipe.forEach(func => {
        const pontosFunc = pontosGlobais.filter(p => p.nome === func.nome && p.data === dataHoje);
        
        let statusFunc = "Fora";
        let ultimoPonto = "";

        if (pontosFunc.length > 0) {
            const ultimo = pontosFunc[0]; // Como já vem ordenado descrescente, o [0] é o último do dia
            ultimoPonto = `${ultimo.tipo} às ${ultimo.hora}`;
            
            if (ultimo.tipo === 'Entrada' || ultimo.tipo === 'Retorno Almoço') statusFunc = "Em Serviço";
            else if (ultimo.tipo === 'Pausa Almoço') statusFunc = "No Almoço";
            else if (ultimo.tipo === 'Saída') statusFunc = "Finalizado";
        }

        if (statusFunc === "Em Serviço") {
            qtdTrab++;
            trabalhandoHtml += `<div style="padding: 8px; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center;">
                                    <strong style="color: #334155; font-size: 14px;">${func.nome.split(' ')[0]}</strong>
                                    <span style="font-size: 11px; color: #10b981;">🟢 Trabalhando</span>
                                </div>`;
        } else {
            qtdFolga++;
            let badge = statusFunc === "Fora" ? "🔴 Sem Registro" : (statusFunc === "No Almoço" ? "🟡 No Almoço" : "🔴 Encerrado");
            folgaHtml += `<div style="padding: 8px; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center;">
                                    <strong style="color: #334155; font-size: 14px;">${func.nome.split(' ')[0]}</strong>
                                    <span style="font-size: 11px; color: #64748b;">${badge}</span>
                                </div>`;
        }
    });

    if(qtdTrab === 0) trabalhandoHtml = `<p style="color: #94a3b8; font-size: 13px; text-align: center;">Ninguém em serviço no momento.</p>`;
    if(qtdFolga === 0) folgaHtml = `<p style="color: #94a3b8; font-size: 13px; text-align: center;">Toda a equipe está em serviço.</p>`;

    document.getElementById('qtdEmServico').innerText = qtdTrab;
    document.getElementById('qtdForaServico').innerText = qtdFolga;
    listaEmServicoEl.innerHTML = trabalhandoHtml;
    listaForaServicoEl.innerHTML = folgaHtml;
}

// ==========================================
// 5. RENDERIZAR HISTÓRICO E PDF
// ==========================================
function atualizarFiltrosRelatorio() {
    let equipe = [];
    if (typeof equipeGlobais !== 'undefined' && equipeGlobais.length > 0) { equipe = equipeGlobais; } 
    else { equipe = JSON.parse(localStorage.getItem('equipe')) || []; }
    
    const filtroPonto = document.getElementById('filtroFuncionarioPonto');
    
    // Se for Gestor, ele vê todos. Se for funcionário, o select trava no nome dele e fica invisível/desabilitado (só puxa o dele)
    const cargosGestao = ['síndico', 'sindico', 'gerente', 'administrador', 'admin'];
    const temPermissao = cargosGestao.some(c => usuarioCargoAtual.toLowerCase().includes(c));

    if(filtroPonto) {
        if(temPermissao) {
            filtroPonto.innerHTML = '<option value="" disabled selected>Todos os Funcionários</option>';
            equipe.forEach(f => { filtroPonto.innerHTML += `<option value="${f.nome}">${f.nome}</option>`; });
        } else {
            filtroPonto.innerHTML = `<option value="${usuarioNomeAtual}" selected>${usuarioNomeAtual} (Meu Histórico)</option>`;
            filtroPonto.style.display = 'none'; // Esconde o campo pro porteiro
        }
    }
}

function filtrarPorSeletores() { mostrarPontos(); }

function mostrarPontos() {
    const lista = document.getElementById('listaPontos');
    const telaPonto = document.getElementById('ponto');
    
    if (!lista || (telaPonto && telaPonto.style.display === 'none')) return;

    const filtroMes = document.getElementById('filtroMesPonto')?.value;
    
    // Força o filtro do nome de acordo com a permissão
    const cargosGestao = ['síndico', 'sindico', 'gerente', 'administrador', 'admin'];
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

// PDF (A mesma lógica que já estava pronta se mantém intacta abaixo)
async function gerarFolhaPontoIndividual(param1 = null, param2 = null) {
    let funcionarioNome = document.getElementById("filtroFuncionarioPonto")?.value;
    let mesAno = document.getElementById("filtroMesPonto")?.value; 

    // Se for porteiro comum forçando download, ele só puxa o dele mesmo
    const cargosGestao = ['síndico', 'sindico', 'gerente', 'administrador', 'admin'];
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
