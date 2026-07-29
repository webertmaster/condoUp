// ==========================================
// ZERO LABS - CONDO UP
// autorizacoes.js - Controle de Acesso e Leitura de Códigos
// ==========================================

let autorizacoesGlobais = [];

window.addEventListener('DOMContentLoaded', () => {
    const meuCondominio = localStorage.getItem("condominioId");
    if (!meuCondominio) return;

    if (typeof db !== 'undefined') {
        // 🚀 O RADAR: Puxa o histórico todo (sem excluir os do passado), 
        // para o Filtro de Data conseguir consultar dias anteriores!
        db.collection("autorizacoes")
          .where("condominioId", "==", meuCondominio)
          .where("excluido", "==", false)
          .onSnapshot((snapshot) => {
              autorizacoesGlobais = [];
              snapshot.forEach((doc) => {
                  let a = doc.data();
                  a.idFirebase = doc.id;
                  autorizacoesGlobais.push(a);
              });
              
              autorizacoesGlobais.sort((a, b) => {
                  if (a.status === "Aguardando" && b.status !== "Aguardando") return -1;
                  if (a.status !== "Aguardando" && b.status === "Aguardando") return 1;
                  return b.timestamp - a.timestamp; 
              });
              
              renderizarAutorizacoesPortaria();
          });
    }
});

// ==========================================
// RENDERIZAR NA TELA E APLICAR OS FILTROS
// ==========================================
function renderizarAutorizacoesPortaria() {
    const lista = document.getElementById('lista-autorizacoes-portaria');
    if (!lista) return;

    // CRAVA O FUSO HORÁRIO LOCAL DO BRASIL (Evita virar o dia antes da hora)
    const agoraLocal = new Date();
    const ano = agoraLocal.getFullYear();
    const mes = String(agoraLocal.getMonth() + 1).padStart(2, '0');
    const dia = String(agoraLocal.getDate()).padStart(2, '0');
    const hojeStr = `${ano}-${mes}-${dia}`;

    // 1. Pega o que está digitado ou selecionado nos filtros
    let inputBusca = document.getElementById('buscaCodigoPortaria') ? document.getElementById('buscaCodigoPortaria').value.toLowerCase().trim() : "";
    let inputData = document.getElementById('filtroDataPortaria') ? document.getElementById('filtroDataPortaria').value : "";

    // 2. Filtra a lista da memória do sistema
    let listaFiltrada = autorizacoesGlobais.filter(a => {
        
        // Regra do Filtro de Texto (Nome, Apto, Código, Empresa)
        let bateuTexto = true;
        if (inputBusca !== "") {
            let textoGeral = `${a.nome} ${a.apto} ${a.codigo} ${a.empresa}`.toLowerCase();
            if (!textoGeral.includes(inputBusca)) bateuTexto = false;
        }

        // Regra do Filtro de Data
        let bateuData = true;
        if (inputData !== "") {
            // Se o porteiro escolheu um dia no calendário, mostra SÓ aquele dia (mesmo que seja do passado)
            if (a.data !== inputData) bateuData = false;
        } else {
            // Se o calendário estiver VAZIO, a FAXINA AUTOMÁTICA entra em ação: Mostra só de Hoje pra frente!
            if (a.data < hojeStr) bateuData = false;
        }

        return bateuTexto && bateuData;
    });

    // 3. Monta a tela com o resultado do filtro
    if (listaFiltrada.length === 0) {
        lista.innerHTML = `
            <div style="text-align: center; padding: 50px; background: white; border-radius: 12px; border: 1px dashed #cbd5e1; color: #64748b;">
                <i class="fa-solid fa-user-shield" style="font-size: 40px; margin-bottom: 15px; opacity: 0.5;"></i>
                <p style="font-size: 16px;">Nenhum acesso encontrado com esses filtros.</p>
            </div>`;
        return;
    }

    let html = '<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 15px;">';

    listaFiltrada.forEach(a => {
        const isEntrou = a.status === "Entrou";
        const isPassado = a.data < hojeStr && !isEntrou;
        const isHoje = a.data === hojeStr;
        const dataF = a.data.split('-').reverse().join('/');

        let corBorda = isEntrou ? '#10b981' : (isPassado ? '#94a3b8' : '#a855f7');
        let txtStatus = isEntrou ? `<i class="fa-solid fa-check-double"></i> JÁ ENTROU` : (isPassado ? 'EXPIRADA' : 'AGUARDANDO...');
        let bgStatus = isEntrou ? '#dcfce7' : (isPassado ? '#f1f5f9' : '#fdf4ff');
        let corTxtStatus = isEntrou ? '#16a34a' : (isPassado ? '#64748b' : '#86198f');

        let icone = a.tipo === "Visitante Social" ? 'fa-user-group' : 'fa-helmet-safety';

        html += `
            <div style="background: white; border: 1px solid #e2e8f0; border-top: 4px solid ${corBorda}; border-radius: 12px; padding: 18px; box-shadow: 0 4px 6px rgba(0,0,0,0.02); opacity: ${isPassado ? '0.6' : '1'};">
                
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                    <span style="background: ${bgStatus}; color: ${corTxtStatus}; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 800;">${txtStatus}</span>
                    <span style="font-weight: 900; font-size: 14px; color: #0f172a; background: #f1f5f9; padding: 4px 10px; border-radius: 6px;">Apto ${a.apto}</span>
                </div>
                
                <h3 style="margin: 0 0 5px 0; font-size: 18px; color: #0f172a;"><i class="fa-solid ${icone}" style="color: #94a3b8; margin-right: 6px;"></i> ${a.nome}</h3>
                <p style="margin: 0 0 15px 0; font-size: 13px; color: #64748b;">${a.tipo} ${a.empresa !== 'N/A' ? `• <strong>${a.empresa}</strong>` : ''}</p>

                <div style="background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px dashed #cbd5e1; display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <div>
                        <span style="display: block; font-size: 10px; color: #94a3b8; text-transform: uppercase; font-weight: bold;">Data Liberada</span>
                        <span style="font-weight: 700; font-size: 13px; color: ${isHoje ? '#ef4444' : '#0f172a'};">${isHoje ? 'HOJE (' + dataF + ')' : dataF}</span>
                    </div>
                    <div style="text-align: right;">
                        <span style="display: block; font-size: 10px; color: #94a3b8; text-transform: uppercase; font-weight: bold;">Código</span>
                        <span style="font-weight: 900; font-size: 18px; color: #a855f7; letter-spacing: 2px;">${a.codigo}</span>
                    </div>
                </div>

                ${!isEntrou && !isPassado && isHoje ? `
                    <button onclick="registrarEntrada('${a.idFirebase}', '${a.nome}', '${a.apto}')" style="width: 100%; background: #10b981; color: white; border: none; padding: 14px; border-radius: 8px; font-weight: 800; cursor: pointer; display: flex; justify-content: center; gap: 8px; align-items: center; font-size: 14px; box-shadow: 0 4px 10px rgba(16, 185, 129, 0.25); transition: 0.2s;" onmouseover="this.style.transform='scale(0.98)'" onmouseout="this.style.transform='scale(1)'">
                        <i class="fa-solid fa-door-open"></i> Registrar Entrada
                    </button>
                ` : ''}
                
                ${isEntrou ? `
                    <p style="text-align: center; margin: 0; font-size: 12px; color: #64748b; font-weight: bold;"><i class="fa-regular fa-clock"></i> Entrada registrada às ${a.horaEntrada}</p>
                ` : ''}
            </div>
        `;
    });

    html += '</div>';
    lista.innerHTML = html;
}

// ==========================================
// FUNÇÃO QUE ACIONA OS FILTROS QUANDO O PORTEIRO DIGITA OU CLICA NA DATA
// ==========================================
window.filtrarAutorizacoesPortaria = function() {
    // Agora é simples: toda vez que ele mexer nos campos, a gente redesenha a tela atualizada!
    renderizarAutorizacoesPortaria();
};

// ==========================================
// AÇÃO DO PORTEIRO: DAR O CHECK-IN
// ==========================================
function registrarEntrada(idFirebase, nome, apto) {
    if(confirm(`🔑 O documento confere? Confirmar a entrada de ${nome} para o Apto ${apto}?`)) {
        const agora = new Date();
        const horaStr = agora.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
        
        db.collection("autorizacoes").doc(idFirebase).update({
            status: "Entrou",
            horaEntrada: horaStr
        }).then(() => {
            
            const meuCondominio = localStorage.getItem("condominioId");
            db.collection("notificacoes").add({
                titulo: "🔔 Visita na Portaria!",
                mensagem: `${nome} acabou de apresentar o código e já entrou no condomínio.`,
                tipo: "acesso",
                aptoAviso: apto, 
                lida: false,
                condominioId: meuCondominio,
                timestamp: new Date().getTime()
            });

            alert("✅ Entrada liberada com sucesso! Morador foi notificado.");
        }).catch(e => alert("Erro ao registrar entrada: " + e.message));
    }
}