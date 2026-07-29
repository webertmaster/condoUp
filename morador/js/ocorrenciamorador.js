// ==========================================
// ZERO LABS - CONDO UP
// ocorrenciamorador.js - Módulo de Ocorrências do App
// ==========================================

let minhasOcorrenciasApp = [];

// Função que abre o formulário quando o morador clica em "Nova"
function abrirFormNovaOcorrencia() {
    document.getElementById('lista-minhas-ocorrencias').style.display = 'none';
    document.getElementById('form-nova-ocorrencia').style.display = 'block';
}

// Função que fecha o formulário
function fecharFormNovaOcorrencia() {
    document.getElementById('form-nova-ocorrencia').style.display = 'none';
    document.getElementById('lista-minhas-ocorrencias').style.display = 'block';
    document.getElementById('ocorrenciaAppDescricao').value = ''; // Limpa o texto
}

// Função que envia a reclamação para o Firebase
function salvarNovaOcorrenciaApp() {
    const tipo = document.getElementById('ocorrenciaAppTipo').value;
    const descricao = document.getElementById('ocorrenciaAppDescricao').value.trim();

    if(!descricao) {
        alert("⚠️ Por favor, descreva a ocorrência.");
        return;
    }

    const dadosOcorrencia = {
        tipo: tipo,
        descricao: descricao,
        apto: moradorAptoGlobal, // Pega o apartamento do morador logado
        morador: moradorNomeGlobal, // Pega o nome do morador logado
        status: "Aberta", // Toda ocorrência nasce como 'Aberta'
        timestamp: Date.now(),
        dataRegistro: new Date().toISOString(),
        condominioId: moradorCondominioGlobal
    };

    db.collection("ocorrencias").add(dadosOcorrencia).then(() => {
        
        // Avisa o painel da portaria/síndico
        db.collection("notificacoes").add({
            titulo: "🚨 Nova Ocorrência",
            mensagem: `O Apto ${moradorAptoGlobal} registrou uma reclamação sobre ${tipo}.`,
            tipo: "ocorrencia",
            lida: false,
            condominioId: moradorCondominioGlobal,
            timestamp: new Date().getTime()
        });

        alert(`✅ Ocorrência enviada para a administração com sucesso!`);
        fecharFormNovaOcorrencia();
    }).catch(e => alert("Erro ao enviar: " + e.message));
}

// Radar que fica escutando se a gestão respondeu a ocorrência
function escutarMinhasOcorrencias(condominioId, apartamento) {
    db.collection("ocorrencias")
      .where("condominioId", "==", condominioId)
      .where("apto", "==", apartamento)
      .onSnapshot((snapshot) => {
          minhasOcorrenciasApp = [];
          snapshot.forEach((doc) => {
              let o = doc.data();
              o.idFirebase = doc.id;
              minhasOcorrenciasApp.push(o);
          });

          // Ordena para mostrar as mais recentes primeiro
          minhasOcorrenciasApp.sort((a, b) => b.timestamp - a.timestamp);
          renderizarMinhasOcorrencias();
      });
}

// Desenha a lista de ocorrências na tela do morador
function renderizarMinhasOcorrencias() {
    const lista = document.getElementById('lista-minhas-ocorrencias');
    if(!lista) return;

    if(minhasOcorrenciasApp.length === 0) {
        lista.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-clipboard-list" style="font-size: 50px; color: #cbd5e1; margin-bottom: 15px;"></i>
                <p style="font-size: 15px; color: #64748b; font-weight: 500; margin-bottom: 25px;">Nenhuma ocorrência registrada.</p>
                <button class="btn-acao" onclick="abrirFormNovaOcorrencia()" style="background: #ef4444;">Registrar Nova</button>
            </div>
        `;
        return;
    }

    let html = '';

    minhasOcorrenciasApp.forEach(o => {
        let dataF = new Date(o.timestamp).toLocaleDateString('pt-BR');
        
        // Regras de cores para o Status
        let bgStatus = '#fef2f2'; let corStatus = '#ef4444'; // Aberta (Vermelho)
        if(o.status === "Em Análise") { bgStatus = '#fffbeb'; corStatus = '#f59e0b'; } // Análise (Laranja)
        if(o.status === "Resolvida") { bgStatus = '#dcfce7'; corStatus = '#16a34a'; } // Resolvida (Verde)

        html += `
            <div style="background: white; border-radius: 16px; padding: 18px; margin-bottom: 15px; box-shadow: 0 2px 10px rgba(0,0,0,0.02); border: 1px solid #f8fafc; border-left: 4px solid ${corStatus};">
                
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <span style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #64748b; display: flex; align-items: center; gap: 6px;">
                        <i class="fa-regular fa-calendar"></i> ${dataF}
                    </span>
                    <span style="background: ${bgStatus}; color: ${corStatus}; padding: 4px 10px; border-radius: 20px; font-size: 10px; font-weight: 800;">${o.status.toUpperCase()}</span>
                </div>

                <div style="font-size: 15px; font-weight: 800; color: #0f172a; margin-bottom: 6px;">${o.tipo}</div>
                <p style="font-size: 13px; color: #475569; margin-bottom: 10px; background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px dashed #e2e8f0;">"${o.descricao}"</p>
                
                ${o.respostaGestao ? `
                    <div style="background: #eff6ff; padding: 12px; border-radius: 8px; border: 1px solid #bfdbfe;">
                        <span style="display: block; font-size: 10px; color: #3b82f6; font-weight: bold; text-transform: uppercase; margin-bottom: 4px;"><i class="fa-solid fa-reply"></i> Resposta da Gestão</span>
                        <p style="font-size: 13px; color: #1e3a8a; margin: 0;">${o.respostaGestao}</p>
                    </div>
                ` : ''}
            </div>
        `;
    });

    lista.innerHTML = html;
}
