// ==========================================
// ZERO LABS - CONNECTA PRO (NUVEM FIREBASE)
// ocorrencias.js - Livro de Ocorrências Premium Integrado (MULTI-TENANT ATIVO)
// ==========================================

let ocorrenciasGlobais = [];
let idOcorrenciaEditandoFirebase = null;
// NOTA: Não declaramos 'equipeGlobais' aqui porque o equipe.js já faz isso!

function toggleFormOcorrencia() { 
    let form = document.getElementById("form-ocorrencia"); 
    if (form.style.display === "none" || form.style.display === "") {
        form.style.display = "block";
        carregarPorteirosOcorrencia(); 
        
        // 🚀 INVOCA O CARIMBO MÁGICO DA RECEPÇÃO (APP.JS) PARA PREENCHER OS APTOS:
        if (typeof carregarApartamentosNoSelect === 'function') {
            carregarApartamentosNoSelect('ocoApto');
        }
    } else {
        form.style.display = "none";
    }
}

// ==========================================
// 1. ESCUTADOR EM TEMPO REAL (NUVEM COM FILTRO DE CONDOMÍNIO)
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
    const meuCondominio = localStorage.getItem("condominioId");

    if (!meuCondominio) {
        console.error("Erro Crítico: Condomínio não identificado no navegador!");
        return;
    }

    if (typeof db !== 'undefined') {
        db.collection("ocorrencias").where("condominioId", "==", meuCondominio).onSnapshot((snapshot) => {
            ocorrenciasGlobais = [];
            snapshot.forEach((doc) => {
                let o = doc.data();
                o.idFirebase = doc.id; 
                ocorrenciasGlobais.push(o);
            });

            ocorrenciasGlobais.sort((a, b) => new Date(b.dataCadastro) - new Date(a.dataCadastro));

            mostrarOcorrencias(); 
            if(typeof atualizarDashboard === 'function') atualizarDashboard();
        });
    }

    // 🚀 GATILHO DOMINÓ PREMIUM: Quando escolhe o Apto, puxa da memória na hora!
    const selectAptoOco = document.getElementById('ocoApto');
    if (selectAptoOco) {
        selectAptoOco.addEventListener('change', function() {
            const aptoEscolhido = this.value.trim();
            const campoMorador = document.getElementById('ocoMorador');
            if (!campoMorador) return;

            if (!aptoEscolhido) {
                campoMorador.value = '';
                return;
            }

            // Busca instantânea na memória local (Economiza seu faturamento do Firebase)
            if (typeof memoriaDominóMoradores !== 'undefined' && memoriaDominóMoradores.length > 0) {
                const moradorEncontrado = memoriaDominóMoradores.find(m => m.apto === aptoEscolhido);
                
                if (moradorEncontrado) {
                    campoMorador.value = moradorEncontrado.nome;
                } else {
                    campoMorador.value = "Área Comum / Não identificado";
                }
            } else {
                // 🛡️ PLANO B: Se a memória falhar, busca direto no banco de dados!
                db.collection("moradores").where("condominioId", "==", meuCondominio).where("apto", "==", aptoEscolhido).get().then(s => {
                    campoMorador.value = !s.empty ? s.docs[0].data().nome : "Área Comum / Não identificado";
                });
            }
        });
    }
});

function carregarPorteirosOcorrencia() {
    let select = document.getElementById("ocoPorteiro");
    if (!select) return;
    
    select.innerHTML = '<option value="" disabled selected>👮 Selecione o Responsável</option>';
    
    if (typeof equipeGlobais === 'undefined' || equipeGlobais.length === 0) {
        select.innerHTML += '<option value="Sistema">Sistema (Nenhum funcionário cadastrado)</option>';
    } else {
        equipeGlobais.forEach(f => {
            select.innerHTML += `<option value="${f.nome}">${f.nome} (${f.cargo})</option>`;
        });
    }
}

// ==========================================
// 2. SALVAR E ATUALIZAR NA NUVEM
// ==========================================
function salvarOcorrencia() {
    let tipo = document.getElementById("ocoTipo").value; 
    let desc = document.getElementById("ocoDescricao").value; 
    let port = document.getElementById("ocoPorteiro").value;
    let statusSelecionado = document.getElementById("ocoStatus").value;
    let prioridade = document.getElementById("ocoPrioridade").value;
    let apto = document.getElementById("ocoApto").value; 
    let morador = document.getElementById("ocoMorador").value;

    if(!tipo || !desc || !port) return alert("⚠️ Preencha Tipo, Porteiro Responsável e Detalhes!");
    
    let btnSalvar = document.getElementById("btnSalvarOcorrencia");
    let textoOriginal = idOcorrenciaEditandoFirebase ? '<i class="fa-solid fa-floppy-disk"></i> Salvar Ocorrência' : (btnSalvar ? btnSalvar.innerHTML : 'Salvar');
    
    if (btnSalvar) {
        btnSalvar.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Salvando na Nuvem...';
        btnSalvar.style.pointerEvents = 'none';
    }

    let fotoInput = document.getElementById("ocoFoto"); 
    let arquivo = fotoInput ? fotoInput.files[0] : null;
    
    if(arquivo) { 
        let leitor = new FileReader(); 
        leitor.onload = function(e){ 
            finalizarSalvamentoOcorrenciaNuvem(e.target.result, tipo, desc, port, statusSelecionado, prioridade, apto, morador, btnSalvar, textoOriginal); 
        }; 
        leitor.readAsDataURL(arquivo); 
    } else { 
        finalizarSalvamentoOcorrenciaNuvem("", tipo, desc, port, statusSelecionado, prioridade, apto, morador, btnSalvar, textoOriginal); 
    }
}

function finalizarSalvamentoOcorrenciaNuvem(foto, tipo, desc, port, statusSelecionado, prioridade, apto, morador, btnSalvar, textoOriginal) {
    let agora = new Date();
    const meuCondominio = localStorage.getItem("condominioId");

    let dadosEnviados = {
        tipo, 
        apto: apto || "", 
        morador: morador || "", 
        prioridade, 
        descricao: desc, 
        status: statusSelecionado, 
        data: agora.toISOString().split('T')[0], 
        hora: agora.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'}), 
        registradoPor: port,
        dataCadastro: agora.toISOString(),
        condominioId: meuCondominio
    };

    if (foto) dadosEnviados.foto = foto;

    if (idOcorrenciaEditandoFirebase) {
        db.collection("ocorrencias").doc(idOcorrenciaEditandoFirebase).update(dadosEnviados)
            .then(() => {
                alert("✅ Ocorrência atualizada com sucesso na nuvem!");
                finalizarFormularioOcorrencia(btnSalvar, '<i class="fa-solid fa-floppy-disk"></i> Salvar Ocorrência');
                idOcorrenciaEditandoFirebase = null;
            }).catch(err => {
                alert("Erro ao atualizar: " + err);
                if(btnSalvar) { btnSalvar.innerHTML = textoOriginal; btnSalvar.style.pointerEvents = 'auto'; }
            });
    } else {
        dadosEnviados.excluido = false; 
        db.collection("ocorrencias").add(dadosEnviados)
            .then(() => {
                alert("🚨 Ocorrência registrada na nuvem!");
                finalizarFormularioOcorrencia(btnSalvar, textoOriginal);
            }).catch(err => {
                alert("Erro ao registrar: " + err);
                if(btnSalvar) { btnSalvar.innerHTML = textoOriginal; btnSalvar.style.pointerEvents = 'auto'; }
            });
    }
}

function finalizarFormularioOcorrencia(btnSalvar, textoFinal) {
    if(btnSalvar) { 
        btnSalvar.innerHTML = textoFinal; 
        btnSalvar.style.background = "#3b82f6"; 
        btnSalvar.style.pointerEvents = 'auto'; 
    }
    document.getElementById("ocoTipo").value = ''; document.getElementById("ocoDescricao").value = ''; 
    document.getElementById("ocoApto").value = ''; document.getElementById("ocoMorador").value = '';
    document.getElementById("ocoPorteiro").value = ''; 
    let fotoInput = document.getElementById("ocoFoto"); if(fotoInput) fotoInput.value = '';
    
    let form = document.getElementById("form-ocorrencia"); 
    if (form) form.style.display = "none";
}

// ==========================================
// 3. AÇÕES RÁPIDAS (RESOLVER E EDITAR)
// ==========================================
function resolverOcorrencia(idFirebase) {
    if(confirm("Deseja marcar esta ocorrência como Resolvida?")) {
        db.collection("ocorrencias").doc(idFirebase).update({ status: "🟢 Resolvido" }).catch(err => alert("Erro: " + err));
    }
}

function prepararEdicaoOcorrencia(idFirebase) {
    let o = ocorrenciasGlobais.find(oco => oco.idFirebase === idFirebase);
    if(!o) return;

    let form = document.getElementById("form-ocorrencia");
    if(form && (form.style.display === "none" || form.style.display === "")) toggleFormOcorrencia();

    setTimeout(() => {
        document.getElementById("ocoTipo").value = o.tipo; 
        document.getElementById("ocoDescricao").value = o.descricao;
        document.getElementById("ocoApto").value = o.apto || "";
        document.getElementById("ocoMorador").value = o.morador || ""; 
        document.getElementById("ocoPrioridade").value = o.prioridade;
        
        let selectPorteiro = document.getElementById("ocoPorteiro");
        if(selectPorteiro) selectPorteiro.value = o.registradoPor;
        
        let comboStatus = document.getElementById("ocoStatus");
        if(comboStatus) {
            for(let i=0; i<comboStatus.options.length; i++) { 
                if(comboStatus.options[i].value === o.status) { comboStatus.selectedIndex = i; break; } 
            }
        }
        
        let btnSalvar = document.getElementById("btnSalvarOcorrencia");
        if(btnSalvar) {
            btnSalvar.innerHTML = "<i class='fa-solid fa-floppy-disk'></i> Salvar Alterações";
            btnSalvar.style.background = "#10b981"; 
        }
        
        idOcorrenciaEditandoFirebase = idFirebase; 
        window.scrollTo({ top: 0, behavior: "smooth" });
    }, 100);
}

// ==========================================
// 4. LIXEIRA BLINDADA
// ==========================================
function excluirOco(idFirebase) { 
    // 1. Se for Porteiro (Operacional), joga para a Justificativa!
    if (window.isPorteiroLogado === true) {
        if(typeof solicitarArquivamentoRestrito === 'function') {
            solicitarArquivamentoRestrito("ocorrencias", idFirebase);
        } else {
            alert("⚠️ Função de arquivamento restrito não encontrada.");
        }
        return; 
    }

    // 2. Se for Gestão/Síndico, arquiva direto e avisa os síndicos (caso tenha mais de um)
    if(confirm("🚨 Arquivar Registro: Tem certeza que deseja arquivar esta ocorrência? Ela sairá do painel, mas será mantida nos relatórios da auditoria.")) { 
        db.collection("ocorrencias").doc(idFirebase).update({
            excluido: true,
            dataExclusao: Date.now()
        }).catch(err => alert("Erro ao arquivar: " + err));
    } 
}

// ==========================================
// 5. RENDERIZAR NA TELA (DESIGN PADRÃO PREMIUM)
// ==========================================
function mostrarOcorrencias(filtro="") {
    let lista = document.getElementById("listaOcorrencias"); 
    if(!lista) return; 
    lista.innerHTML = "";
    
    lista.style.display = "grid";
    lista.style.gridTemplateColumns = "repeat(auto-fit, minmax(300px, 1fr))";
    lista.style.gap = "15px";
    lista.style.alignItems = "start";

    let urg = 0, abertos = 0, res = 0, hoje = 0; 
    let dHoje = new Date().toISOString().split('T')[0];
    const cargo = localStorage.getItem("usuario_cargo");
    const ocorrencias = ocorrenciasGlobais;

    ocorrencias.forEach((o) => {
        if (o.excluido === true) return; 
        
        let conteudoBuscavel = `${o.tipo} ${o.apto} ${o.morador} ${o.descricao} ${o.registradoPor}`.toLowerCase(); 
        if(filtro && !conteudoBuscavel.includes(filtro.toLowerCase())) return;
        
        if(o.prioridade === "Alta" && !o.status.includes("Resolvido")) urg++; 
        if(o.status.includes("Pendente") || o.status.includes("Aberta") || o.status === "Em aberto") abertos++; 
        if(o.status.includes("Resolvido")) res++; 
        if(o.data === dHoje || o.dataRegistro?.startsWith(dHoje)) hoje++;
        
        let corBorda = "#cbd5e1"; let classeBadge = ""; let iconeStatus = "";
        
        if (o.status.includes("Não Resolvido") || o.status.includes("🔴")) { corBorda = "#ef4444"; classeBadge = "status-urgente"; iconeStatus = '<i class="fa-solid fa-circle-exclamation"></i> '; } 
        else if (o.status.includes("Pendente") || o.status.includes("Aberta") || o.status === "Em aberto" || o.status.includes("🟡")) { corBorda = "#f59e0b"; classeBadge = "status-pendente"; iconeStatus = '<i class="fa-solid fa-clock-rotate-left"></i> '; } 
        else if (o.status.includes("Resolvida") || o.status.includes("Resolvido") || o.status.includes("🟢")) { corBorda = "#10b981"; classeBadge = "status-entregue"; iconeStatus = '<i class="fa-solid fa-circle-check"></i> '; }
        
        let dataFormatada = "Data Indefinida";
        let horaFormatada = "";
        
        if(o.data) {
            dataFormatada = o.data.split('-').reverse().join('/');
            horaFormatada = o.hora ? `às ${o.hora}` : '';
        } else if (o.timestamp) {
            let dataCriacao = new Date(o.timestamp);
            dataFormatada = dataCriacao.toLocaleDateString('pt-BR');
            horaFormatada = `às ${dataCriacao.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}`;
        }

        let prioridadeExibida = o.prioridade ? o.prioridade : "Média"; 
        let porteiroExibido = o.registradoPor || 'App do Morador';
        let moradorExibido = o.morador || 'N/A';

        // Mensagem do WhatsApp codificada para não quebrar o link
        let txtWhatsRaw = `Olá ${moradorExibido}, sou da Administração do CondoUp. Entro em contato referente à sua ocorrência: "${o.tipo}".`;
        let txtWhats = encodeURIComponent(txtWhatsRaw);
        
        // ==========================================
        // 🚀 O NOVO DESIGN DOS BOTÕES (SaaS LEVEL)
        // ==========================================
        
        // 1. Botão Resolver (Só aparece se não estiver resolvido)
        let btnResolver = !o.status.includes("Resolvido") && !o.status.includes("Resolvida") 
            ? `<button onclick="resolverOcorrencia('${o.idFirebase}')" title="Marcar como Resolvida" style="flex: 1; height: 42px; background: #dcfce7; color: #16a34a; border: 1px solid #bbf7d0; border-radius: 8px; cursor: pointer; font-size: 18px; transition: 0.2s; display: flex; align-items: center; justify-content: center;" onmouseover="this.style.background='#16a34a'; this.style.color='white'" onmouseout="this.style.background='#dcfce7'; this.style.color='#16a34a'"><i class="fa-solid fa-check-double"></i></button>` 
            : '';

        // 2. Botão WhatsApp (Sempre aparece)
        let btnZap = `<a href="https://wa.me/?text=${txtWhats}" target="_blank" title="Avisar Morador no WhatsApp" style="flex: 1; height: 42px; background: rgba(37,211,102,0.1); color: #25D366; border: 1px solid rgba(37,211,102,0.3); border-radius: 8px; cursor: pointer; font-size: 20px; transition: 0.2s; display: flex; align-items: center; justify-content: center; text-decoration: none;" onmouseover="this.style.background='#25D366'; this.style.color='white'" onmouseout="this.style.background='rgba(37,211,102,0.1)'; this.style.color='#25D366'"><i class="fa-brands fa-whatsapp"></i></a>`;

        // 3. Botão Editar
        let btnEditar = `<button onclick="prepararEdicaoOcorrencia('${o.idFirebase}')" title="Editar Ocorrência" style="flex: 1; height: 42px; background: #eff6ff; color: #3b82f6; border: 1px solid #bfdbfe; border-radius: 8px; cursor: pointer; font-size: 16px; transition: 0.2s; display: flex; align-items: center; justify-content: center;" onmouseover="this.style.background='#3b82f6'; this.style.color='white'" onmouseout="this.style.background='#eff6ff'; this.style.color='#3b82f6'"><i class="fa-solid fa-pen"></i></button>`;

        // 4. Botão Arquivar
        let btnArquivar = `<button onclick="excluirOco('${o.idFirebase}')" title="Arquivar Ocorrência" style="flex: 1; height: 42px; background: #fef2f2; color: #ef4444; border: 1px solid #fecaca; border-radius: 8px; cursor: pointer; font-size: 16px; transition: 0.2s; display: flex; align-items: center; justify-content: center;" onmouseover="this.style.background='#ef4444'; this.style.color='white'" onmouseout="this.style.background='#fef2f2'; this.style.color='#ef4444'"><i class="fa-solid fa-trash-can"></i></button>`;

        // A MÁGICA DO ALINHAMENTO: Coloca todos lado a lado dividindo o espaço igualmente (flex: 1)
        let containerBotoes = `
            <div style="display: flex; gap: 10px; margin-top: 15px; border-top: 1px dashed #e2e8f0; padding-top: 15px;">
                ${btnResolver}
                ${btnZap}
                ${btnEditar}
                ${btnArquivar}
            </div>
        `;

        lista.innerHTML += `
        <div class="card" style="border-left: 5px solid ${corBorda}; padding: 18px;">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px; border-bottom: 1px dashed #e2e8f0; padding-bottom: 10px;">
                <h3 style="margin: 0; font-size: 16px; color: #0f172a; display: flex; flex-direction: column; gap: 5px;">
                    <div><i class="fa-solid fa-triangle-exclamation" style="color: ${corBorda}; margin-right: 8px; font-size: 18px;"></i>${o.tipo}</div>
                    <span style="font-size: 11px; color: #64748b; font-weight: normal; background: #f1f5f9; padding: 2px 8px; border-radius: 12px; border: 1px solid #e2e8f0; width: fit-content;">Prioridade: ${prioridadeExibida}</span>
                </h3>
                <span class="badge ${classeBadge}" style="margin: 0; padding: 5px 10px; font-size: 11px; border-radius: 20px;">${iconeStatus}${o.status.replace('🔴', '').replace('🟡', '').replace('🟢', '')}</span>
            </div>
            
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; font-size: 14px; color: #475569; margin-bottom: 15px; background: rgba(241, 245, 249, 0.5); padding: 12px; border-radius: 8px; border: 1px solid #f1f5f9;">
                <p style="margin: 0; display: flex; align-items: center;"><i class="fa-solid fa-building" style="color: #3b82f6; width: 20px; text-align: center; margin-right: 5px;"></i> <b>Local:</b>&nbsp; <span style="color: #0f172a;">${o.apto || 'Área Comum'}</span></p>
                <p style="margin: 0; display: flex; align-items: center;"><i class="fa-solid fa-clock" style="color: #8b5cf6; width: 20px; text-align: center; margin-right: 5px;"></i> <b>Data:</b>&nbsp; <span style="color: #0f172a;">${dataFormatada} ${horaFormatada}</span></p>
                <p style="margin: 0; display: flex; align-items: center;"><i class="fa-solid fa-user" style="color: #f59e0b; width: 20px; text-align: center; margin-right: 5px;"></i> <b>Morador:</b>&nbsp; <span style="color: #0f172a;">${moradorExibido}</span></p>
                <p style="margin: 0; display: flex; align-items: center;"><i class="fa-solid fa-user-shield" style="color: #10b981; width: 20px; text-align: center; margin-right: 5px;"></i> <b>Origem:</b>&nbsp; <span style="color: #0f172a;">${porteiroExibido}</span></p>
            </div>
            
            <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 15px; font-style: italic; font-size: 14px; color: #334155; border-left: 3px solid #cbd5e1; line-height: 1.5;">
                <i class="fa-solid fa-quote-left" style="color: #cbd5e1; margin-right: 8px; font-size: 16px;"></i> ${o.descricao}
            </div>
            
            ${o.foto ? `<img src="${o.foto}" class="foto" style="max-height: 180px; border-radius: 8px; margin-bottom: 15px; border: 1px solid #e2e8f0; width: 100%; object-fit: cover; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">` : ''}
            
            ${containerBotoes}
        </div>`;
    });
    
    let sUrg = document.getElementById("stat-urgente"); if(sUrg) sUrg.innerText = urg; 
    let sAb = document.getElementById("stat-aberto"); if(sAb) sAb.innerText = abertos;
    let sRes = document.getElementById("stat-resolvida"); if(sRes) sRes.innerText = res; 
    let sHj = document.getElementById("stat-hoje"); if(sHj) sHj.innerText = hoje;
}
