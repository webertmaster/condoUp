// ==========================================
// ZERO LABS - CONDO UP (NUVEM FIREBASE)
// comunicados.js - Mural de Avisos (MULTI-TENANT ATIVO)
// ==========================================

let comunicadosGlobais = [];
let idComunicadoEditandoFirebase = null;

// ==========================================
// 1. ESCUTADOR EM TEMPO REAL (NUVEM COM FILTRO)
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
    const meuCondominio = localStorage.getItem("condominioId");

    if (!meuCondominio) {
        console.error("Erro Crítico: Condomínio não identificado no navegador!");
        return;
    }

    if (typeof db !== 'undefined') {
        db.collection("comunicados").where("condominioId", "==", meuCondominio).onSnapshot((snapshot) => {
            comunicadosGlobais = [];
            snapshot.forEach((doc) => {
                let c = doc.data();
                c.idFirebase = doc.id;
                comunicadosGlobais.push(c);
            });
            
            // Ordena por data (mais novo primeiro)
            comunicadosGlobais.sort((a, b) => {
                // Prevenção caso dataRegistro venha vazia ou mal formatada
                const dataA = a.dataRegistro ? new Date(a.dataRegistro).getTime() : 0;
                const dataB = b.dataRegistro ? new Date(b.dataRegistro).getTime() : 0;
                return dataB - dataA;
            });
            
            atualizarListaComunicados();
            if(typeof atualizarDashboard === 'function') atualizarDashboard();
        });
    } else {
        console.error("Firebase DB não encontrado.");
    }
});

// ==========================================
// 2. SALVAR E EDITAR NA NUVEM + GATILHO PUSH & SINO
// ==========================================
function salvarComunicado() {
    const tipo = document.getElementById('tipoComunicado').value;
    const status = document.getElementById('statusComunicado').value;
    const titulo = document.getElementById('tituloComunicado').value.trim();
    const data = document.getElementById('dataComunicado').value;
    const hora = document.getElementById('horaComunicado').value;
    const local = document.getElementById('localComunicado').value.trim();
    const mensagem = document.getElementById('mensagemComunicado').value.trim();

    if (!titulo || !mensagem) {
        alert('⚠️ O Título e a Mensagem do comunicado são obrigatórios!');
        return;
    }

    const btnSalvar = document.querySelector("#comunicados .btn[onclick='salvarComunicado()']") || document.getElementById('btnSalvarComunicado');
    let textoOriginal = idComunicadoEditandoFirebase ? '<i class="fa-solid fa-floppy-disk"></i> Salvar Alterações' : (btnSalvar ? btnSalvar.innerHTML : 'Publicar Comunicado');

    if (btnSalvar) {
        btnSalvar.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Publicando...';
        btnSalvar.style.pointerEvents = 'none';
    }

    const meuCondominio = localStorage.getItem("condominioId");

    const dadosComunicado = {
        tipo,
        status,
        titulo,
        dataEvento: data,
        horaEvento: hora,
        local: local || 'Geral',
        mensagem,
        condominioId: meuCondominio
    };

    if (idComunicadoEditandoFirebase) {
        // EDIÇÃO
        db.collection("comunicados").doc(idComunicadoEditandoFirebase).update(dadosComunicado)
            .then(() => {
                alert('✅ Comunicado atualizado com sucesso no mural!');
                finalizarAcaoComunicado(btnSalvar, '<i class="fa-solid fa-bullhorn"></i> Publicar Comunicado');
                idComunicadoEditandoFirebase = null;
            }).catch(err => {
                alert("Erro ao atualizar: " + err);
                if(btnSalvar) { btnSalvar.innerHTML = textoOriginal; btnSalvar.style.pointerEvents = 'auto'; }
            });
    } else {
        // NOVA PUBLICAÇÃO
        dadosComunicado.dataRegistro = new Date().toISOString();
        dadosComunicado.excluido = false; 

        db.collection("comunicados").add(dadosComunicado)
            .then(() => {
                
                // 🔔 GATILHO DO SINO: Dispara a notificação para todos!
                const idSeguro = localStorage.getItem("condominioId");
                if(idSeguro) {
                    // Limpa o emoji que já vem no select para ficar um título limpo no sino
                    let tipoLimpo = dadosComunicado.tipo.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]|\uFFFD/g, '').trim();

                    db.collection("notificacoes").add({
                        titulo: `📢 Novo Comunicado: ${tipoLimpo}`,
                        mensagem: dadosComunicado.titulo,
                        tipo: "comunicado",
                        lida: false,
                        condominioId: idSeguro,
                        timestamp: new Date().getTime()
                    }).then(() => {
                        console.log("Sino avisado sobre o novo comunicado!");
                    }).catch((err) => {
                        console.error("Erro ao notificar o sino: ", err);
                    });
                }

                alert('📢 Comunicado publicado com sucesso!');
                finalizarAcaoComunicado(btnSalvar, textoOriginal);
            }).catch(err => {
                alert("Erro ao publicar: " + err);
                if(btnSalvar) { btnSalvar.innerHTML = textoOriginal; btnSalvar.style.pointerEvents = 'auto'; }
            });
    }
}

function finalizarAcaoComunicado(btnNode, textoFinal) {
    if(btnNode) {
        btnNode.innerHTML = textoFinal;
        btnNode.style.background = "#3b82f6"; // Volta pro azul padrão
        btnNode.style.pointerEvents = 'auto';
    }
    // Limpa o form
    document.getElementById('tipoComunicado').value = '📢 Geral';
    document.getElementById('statusComunicado').value = '🟡 Pendente';
    document.getElementById('tituloComunicado').value = '';
    document.getElementById('dataComunicado').value = '';
    document.getElementById('horaComunicado').value = '';
    document.getElementById('localComunicado').value = '';
    document.getElementById('mensagemComunicado').value = '';
}

// ==========================================
// 3. AÇÕES (RESOLVER, EDITAR, ARQUIVAR)
// ==========================================
function resolverComunicado(idFirebase) {
    if(confirm('Tem certeza que deseja marcar este assunto como Resolvido?')) {
        db.collection("comunicados").doc(idFirebase).update({ status: '🟢 Resolvido' })
            .catch(err => alert("Erro ao atualizar status: " + err));
    }
}

function prepararEdicaoComunicado(idFirebase) {
    let c = comunicadosGlobais.find(com => com.idFirebase === idFirebase);
    if (!c) return;

    // Preenche o formulário lá no topo
    document.getElementById('tipoComunicado').value = c.tipo;
    document.getElementById('statusComunicado').value = c.status;
    document.getElementById('tituloComunicado').value = c.titulo;
    document.getElementById('dataComunicado').value = c.dataEvento || '';
    document.getElementById('horaComunicado').value = c.horaEvento || '';
    document.getElementById('localComunicado').value = c.local === 'Geral' ? '' : c.local;
    document.getElementById('mensagemComunicado').value = c.mensagem;

    // Altera o botão Publicar para Salvar
    const btnSalvar = document.querySelector("#comunicados .btn[onclick='salvarComunicado()']") || document.getElementById('btnSalvarComunicado');
    if (btnSalvar) {
        btnSalvar.innerHTML = "<i class='fa-solid fa-floppy-disk'></i> Salvar Alterações";
        btnSalvar.style.background = "#10b981"; // Verde sucesso
    }

    idComunicadoEditandoFirebase = idFirebase;
    // Sobe a tela pro form
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function excluirComunicado(idFirebase) {
    if(confirm('🚨 Arquivar Comunicado: Ocultar esta mensagem do mural da portaria?')) {
        db.collection("comunicados").doc(idFirebase).update({
            excluido: true,
            dataExclusao: Date.now()
        }).catch(err => alert("Erro ao arquivar: " + err));
    }
}

// ==========================================
// 4. RENDERIZAR MURAL
// ==========================================
function atualizarListaComunicados() {
    const lista = document.getElementById('listaComunicados');
    if (!lista) return;

    const cargo = localStorage.getItem("usuario_cargo") || ""; // Garante string
    
    // 🛡️ PERMISSÃO: Define se é operacional (Porteiro/Zelador)
    const isOperacional = cargo.toLowerCase().includes('porteiro') || 
                          cargo.toLowerCase().includes('funcionário') || 
                          cargo.toLowerCase().includes('zelador');

    const ativos = comunicadosGlobais.filter(c => !c.excluido);
    lista.innerHTML = '';

    // Cria um dicionário invisível para guardar os textos limpos para o botão Copiar
    window.textosParaCopiar = {}; 

    if (ativos.length === 0) {
        lista.innerHTML = '<div style="text-align: center; grid-column: 1 / -1; padding: 40px; background: white; border-radius: 12px; border: 1px dashed #cbd5e1; color: #64748b;"><i class="fa-solid fa-envelope-open-text" style="font-size: 30px; margin-bottom: 10px; opacity: 0.5;"></i><p>Nenhum comunicado ativo no mural.</p></div>';
        return;
    }

    const grid = document.createElement('div');
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(300px, 1fr))'; 
    grid.style.gap = '20px';
    grid.style.marginTop = '20px';

    ativos.forEach(com => {
        let corBorda = '#3b82f6'; // Azul Geral
        let iconeTipo = 'fa-bullhorn';
        
        if (com.tipo && com.tipo.includes('Manutenção')) { corBorda = '#f59e0b'; iconeTipo = 'fa-wrench'; }
        if (com.tipo && com.tipo.includes('Ocorrência')) { corBorda = '#ef4444'; iconeTipo = 'fa-triangle-exclamation'; }
        if (com.tipo && com.tipo.includes('Assembleia')) { corBorda = '#8b5cf6'; iconeTipo = 'fa-users-rectangle'; }
        // Se estiver resolvido, a borda vira verde independente do tipo
        if (com.status && com.status.includes('Resolvido')) corBorda = '#10b981'; 

        const tituloSeguro = com.titulo || 'Aviso da Portaria';
        // Limpa emojis para o texto do WhatsApp/Copiar
        const tipoSeguro = com.tipo ? com.tipo.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]|\uFFFD/g, '').replace('📢', '').replace('🔧', '').replace('🚨', '').replace('👥', '').trim() : 'Geral';
        const localSeguro = com.local || 'Geral';
        const mensagemSegura = com.mensagem || '';
        
        const dataReg = com.dataRegistro ? new Date(com.dataRegistro).toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'}) : 'Data Desconhecida';
        
        // Trata datas vazias do evento
        const dataEvtRaw = com.dataEvento || '';
        const dataEvt = dataEvtRaw ? dataEvtRaw.split('-').reverse().join('/') : '';
        const horaEvt = com.horaEvento || '';
        
        let badgeEvento = '';
        if (dataEvt || horaEvt) {
            badgeEvento = `<span style="background: ${corBorda}15; color: ${corBorda}; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: bold;">
                <i class="fa-regular fa-calendar" style="margin-right: 5px;"></i>
                ${dataEvt ? dataEvt : 'Data a definir'} ${horaEvt ? 'às ' + horaEvt : ''}
            </span>`;
        }

        // ==========================================
// 🛡️ LÓGICA DE PERMISSÕES DOS BOTÕES COLORIDOS
// ==========================================
let areaResolucaoHtml = '';
let botoesGestaoHtml = '';

const isResolvido = com.status && com.status.includes('Resolvido');

// A. ÁREA DE RESOLUÇÃO (RESOLVER / STATUS)
if (isResolvido) {
    // Se está resolvido, TODOS veem apenas a faixa de status, sem botão para clicar.
    areaResolucaoHtml = `<div style="text-align: center; color: #10b981; font-weight: bold; font-size: 14px; padding: 10px 0; background: #ecfdf5; border-radius: 8px; border: 1px solid #d1fae5;"><i class="fa-solid fa-circle-check"></i> Assunto Resolvido</div>`;
} else if (!isOperacional) {
    // Se NÃO está resolvido e NÃO é porteiro (ou seja, é GESTÃO/SÍNDICO), mostra o botão para resolver.
    areaResolucaoHtml = `<button onclick="resolverComunicado('${com.idFirebase}')" style="width: 100%; background: #10b981; color: white; border: none; padding: 10px; border-radius: 8px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 5px; transition: 0.2s;" onmouseover="this.style.background='#059669'" onmouseout="this.style.background='#10b981'"><i class="fa-solid fa-check"></i> Marcar como Resolvido</button>`;
}
// Se não é resolvido e é OPERACIONAL, a área fica vazia. O Porteiro não resolve.

// B. BOTÕES DE GESTÃO (EDITAR / ARQUIVAR)
if (!isOperacional) {
    // Apenas GESTÃO vê Editar e Arquivar.
    botoesGestaoHtml = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 8px;">
            <button onclick="prepararEdicaoComunicado('${com.idFirebase}')" style="background: #eff6ff; color: #3b82f6; border: 1px solid #bfdbfe; padding: 10px; border-radius: 8px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 5px; transition: 0.2s;" onmouseover="this.style.background='#dbeafe'" onmouseout="this.style.background='#eff6ff'" title="Editar"><i class="fa-solid fa-pen"></i> Editar</button>
            <button onclick="excluirComunicado('${com.idFirebase}')" style="background: #fef2f2; color: #ef4444; border: 1px solid #fecaca; padding: 10px; border-radius: 8px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 5px; transition: 0.2s;" onmouseover="this.style.background='#fee2e2'" onmouseout="this.style.background='#fef2f2'" title="Arquivar"><i class="fa-solid fa-trash-can"></i> Arquivar</button>
        </div>
    `;
}
// Se é OPERACIONAL, não ganha botoesGestaoHtml.

        // ==========================================
        // 🚀 PREPARA O TEXTO LIMPO PARA O WHATSAPP E PARA COPIAR
        // ==========================================
        let textoLimpo = `*CONDO UP - AVISO OFICIAL*\n`;
        textoLimpo += `----------------------------------------\n`;
        textoLimpo += `*Assunto:* ${tituloSeguro}\n`;
        textoLimpo += `*Categoria:* ${tipoSeguro}\n`;
        
        if (localSeguro && localSeguro !== 'Geral') {
            textoLimpo += `*Local:* ${localSeguro}\n`;
        }
        
        if (dataEvt || horaEvt) {
            textoLimpo += `*Evento:* ${dataEvt ? dataEvt : 'Data a definir'} ${horaEvt ? 'às ' + horaEvt : ''}\n`;
        }

        textoLimpo += `\n*Mensagem:*\n_${mensagemSegura}_\n`;
        textoLimpo += `----------------------------------------`;

        // 1. Guarda o texto no dicionário invisível usando o ID como chave (Para o botão Copiar)
        window.textosParaCopiar[com.idFirebase] = textoLimpo;

        // 2. Transforma o texto para link (Para o botão WhatsApp)
        let linkWhatsapp = `https://wa.me/?text=${encodeURIComponent(textoLimpo)}`;

        // ==========================================
        // DESENHA O CARD FINAL RENDERIZADO
        // ==========================================
        const card = document.createElement('div');
        card.className = 'card';
        card.style.borderLeft = `5px solid ${corBorda}`;
        
        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 15px; border-bottom: 1px dashed #e2e8f0; padding-bottom: 10px;">
                <div>
                    <h3 style="margin: 0; font-size: 18px; color: #0f172a; display: flex; align-items: center; gap: 8px;">
                        <i class="fa-solid ${iconeTipo}" style="color: ${corBorda};"></i>${tituloSeguro}
                    </h3>
                    <span style="font-size: 11px; color: #94a3b8; display: block; margin-top: 5px;">Publicado em ${dataReg}</span>
                </div>
                <span class="badge" style="background: ${corBorda}; color: white; margin-bottom: 0; padding: 4px 10px; font-size: 11px; border-radius: 20px; text-transform: capitalize;">${tipoSeguro}</span>
            </div>
            
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                ${badgeEvento}
                <span style="font-size: 13px; color: #475569; font-weight: bold; display: flex; align-items: center; gap: 5px;"><i class="fa-solid fa-location-dot" style="color: #ef4444;"></i> ${localSeguro}</span>
            </div>

            <div style="background: #f8fafc; padding: 15px; border-radius: 8px; color: #334155; font-size: 14px; line-height: 1.6; border: 1px solid #e2e8f0; border-left: 3px solid ${corBorda}; margin-bottom: 15px; white-space: pre-wrap; font-style: italic;">
                <i class="fa-solid fa-quote-left" style="color: #cbd5e1; margin-right: 5px; font-size: 16px;"></i>${mensagemSegura}
            </div>
            
            <!-- ÁREA DE RESOLUÇÃO (DINÂMICA POR PERMISSÃO) -->
            <div style="margin-top: 15px; border-top: 1px dashed #e2e8f0; padding-top: 15px;">
                ${areaResolucaoHtml}
            </div>
            
            <!-- BOTÕES DE GESTÃO (APARECE APENAS PARA SÍNDICO/GESTÃO) -->
            ${botoesGestaoHtml}
            
            <!-- BOTÕES DE COMPARTILHAMENTO (APARECE PARA TODOS) -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 8px;">
                <a href="${linkWhatsapp}" target="_blank" style="background: #25d366; color: white; padding: 10px; border-radius: 8px; text-decoration: none; display: flex; justify-content: center; align-items: center; gap: 5px; font-weight: bold; font-size: 14px; transition: 0.2s;" onmouseover="this.style.background='#22c55e'" onmouseout="this.style.background='#25d366'">
                    <i class="fa-brands fa-whatsapp" style="font-size: 18px;"></i> WhatsApp
                </a>
                
                <button onclick="copiarTextoComunicado('${com.idFirebase}')" style="background: #64748b; color: white; border: none; padding: 10px; border-radius: 8px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 5px; transition: 0.2s; font-size: 14px;" onmouseover="this.style.background='#475569'" onmouseout="this.style.background='#64748b'">
                    <i class="fa-regular fa-copy" style="font-size: 18px;"></i> Copiar
                </button>
            </div>
        `;
        grid.appendChild(card);
    });

    lista.appendChild(grid);
}

// ==========================================
// 5. FUNÇÃO PARA COPIAR O TEXTO LIMPO
// ==========================================
window.copiarTextoComunicado = function(idFirebase) {
    const texto = window.textosParaCopiar[idFirebase];
    if (texto) {
        navigator.clipboard.writeText(texto).then(() => {
            alert('📋 Aviso copiado com sucesso! Agora é só colar onde quiser.');
        }).catch(err => {
            alert('Erro ao copiar: ' + err);
        });
    }
};
