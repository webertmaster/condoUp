// ==========================================
// EVO UPI - CONRUJA
// achados.js - Módulo de Achados e Perdidos
// ==========================================

let achadosGlobais = [];
let fotoAchadoBase64 = null;
let idAchadoEntrega = null;
let canvasAchado, ctxAchado, desenhandoAchado = false;

// ==========================================
// 1. INICIALIZAÇÃO E ESCUTA DO BANCO
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
    const meuCondominio = localStorage.getItem("condominioId");
    if (!meuCondominio) return;

    if (typeof db !== 'undefined') {
        db.collection("achados_perdidos")
          .where("condominioId", "==", meuCondominio)
          .where("excluido", "==", false)
          .onSnapshot((snapshot) => {
              achadosGlobais = [];
              snapshot.forEach((doc) => {
                  let item = doc.data();
                  item.idFirebase = doc.id;
                  achadosGlobais.push(item);
              });
              // Ordena do mais recente para o mais antigo
              achadosGlobais.sort((a, b) => b.timestamp - a.timestamp);
              renderizarAchados();
          });
    }
});

// ==========================================
// 2. REGISTRAR NOVO OBJETO (FOTO E DADOS)
// ==========================================
function abrirModalRegistrarAchado() {
    document.getElementById('formNovoAchado').reset();
    fotoAchadoBase64 = null;
    document.getElementById('previewFotoAchado').src = "";
    document.getElementById('previewFotoAchado').style.display = "none";
    document.getElementById('iconeFotoAchado').style.display = "block";
    
    // Seta a data e hora atual automaticamente
    const agora = new Date();
    document.getElementById('achadoData').value = agora.toISOString().split('T')[0];
    document.getElementById('achadoHora').value = agora.toTimeString().slice(0, 5);

    document.getElementById('modalRegistrarAchado').classList.add('ativo');
    document.getElementById('modalRegistrarAchado').style.display = 'flex';
}

function comprimirFotoAchado(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            let width = img.width;
            let height = img.height;
            const max_size = 500; // Tamanho ótimo para os cards

            if (width > height) {
                if (width > max_size) { height *= max_size / width; width = max_size; }
            } else {
                if (height > max_size) { width *= max_size / height; height = max_size; }
            }

            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);

            fotoAchadoBase64 = canvas.toDataURL('image/jpeg', 0.8);
            
            document.getElementById('previewFotoAchado').src = fotoAchadoBase64;
            document.getElementById('previewFotoAchado').style.display = "block";
            document.getElementById('iconeFotoAchado').style.display = "none";
        }
        img.src = e.target.result;
    }
    reader.readAsDataURL(file);
}

function salvarNovoAchado() {
    const nome = document.getElementById('achadoNome').value.trim();
    const categoria = document.getElementById('achadoCategoria').value;
    const gaveta = document.getElementById('achadoGaveta').value.trim();
    const data = document.getElementById('achadoData').value;
    const hora = document.getElementById('achadoHora').value;
    const local = document.getElementById('achadoLocal').value;
    const quemAchou = document.getElementById('achadoQuemAchou').value;
    const obs = document.getElementById('achadoObs').value.trim();

    if (!nome || !categoria || !gaveta || !data || !hora || !local || !quemAchou) {
        alert("⚠️ Por favor, preencha todos os campos obrigatórios (marcados com *).");
        return;
    }

    const btn = document.getElementById('btnSalvarAchado');
    const txtOriginal = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Registrando...';
    btn.style.pointerEvents = 'none';

    const novoObjeto = {
        nome: nome,
        categoria: categoria,
        localArmazenamento: gaveta,
        dataEncontro: data,
        horaEncontro: hora,
        localEncontrado: local,
        quemAchou: quemAchou,
        observacoes: obs,
        fotoBase64: fotoAchadoBase64, // Pode ser null se não anexou
        status: "Disponível",
        condominioId: localStorage.getItem("condominioId"),
        porteiroRegistro: localStorage.getItem("usuario_nome") || "Portaria",
        timestamp: Date.now(),
        excluido: false
    };

    db.collection("achados_perdidos").add(novoObjeto).then(() => {
        alert("✅ Objeto registrado com sucesso!");
        document.getElementById('modalRegistrarAchado').style.display = 'none';
        document.getElementById('modalRegistrarAchado').classList.remove('ativo');
    }).catch(error => {
        alert("❌ Erro ao registrar: " + error.message);
    }).finally(() => {
        btn.innerHTML = txtOriginal;
        btn.style.pointerEvents = 'auto';
    });
}

// ==========================================
// 3. RENDERIZAÇÃO E FILTROS DA GRADE
// ==========================================
function filtrarAchados() {
    renderizarAchados();
}

function renderizarAchados() {
    const lista = document.getElementById('lista-achados');
    if (!lista) return;

    const termo = document.getElementById('filtroAchadoBusca').value.toLowerCase();
    const statusFiltro = document.getElementById('filtroAchadoStatus').value;
    const catFiltro = document.getElementById('filtroAchadoCat').value;

    let filtrados = achadosGlobais.filter(item => {
        const bateNome = item.nome.toLowerCase().includes(termo) || item.localArmazenamento.toLowerCase().includes(termo);
        const bateStatus = statusFiltro === "Todos" || item.status === statusFiltro;
        const bateCat = catFiltro === "Todas" || item.categoria === catFiltro;
        return bateNome && bateStatus && bateCat;
    });

    lista.innerHTML = '';

    if (filtrados.length === 0) {
        lista.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 40px; background: white; border-radius: 12px; border: 1px dashed #cbd5e1; color: #64748b;">
                <i class="fa-solid fa-box-open" style="font-size: 30px; margin-bottom: 10px; opacity: 0.5;"></i>
                <p>Nenhum objeto encontrado com estes filtros.</p>
            </div>`;
        return;
    }

    filtrados.forEach(item => {
        const dataFormatada = item.dataEncontro.split('-').reverse().join('/');
        const isDisponivel = item.status === "Disponível";
        
        const badgeStatus = isDisponivel 
            ? `<span style="background: #dcfce7; color: #16a34a; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: bold;"><i class="fa-solid fa-circle-check"></i> Disponível</span>`
            : `<span style="background: #f1f5f9; color: #64748b; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: bold;"><i class="fa-solid fa-handshake"></i> Entregue</span>`;
        
        const corBorda = isDisponivel ? '#3b82f6' : '#cbd5e1';
        const imgDisplay = item.fotoBase64 ? `<img src="${item.fotoBase64}" style="width: 100%; height: 180px; object-fit: cover; border-bottom: 1px solid #f1f5f9;">` : `<div style="width: 100%; height: 150px; background: #f8fafc; display: flex; align-items: center; justify-content: center; color: #cbd5e1; font-size: 40px; border-bottom: 1px solid #f1f5f9;"><i class="fa-solid fa-image"></i></div>`;

        let botoesAcao = '';
        if (isDisponivel) {
            botoesAcao = `
                <button onclick="comunicarMoradoresAchado('${item.idFirebase}')" style="flex: 1; background: #eff6ff; color: #3b82f6; border: none; padding: 10px; border-radius: 8px; font-weight: bold; cursor: pointer; transition: 0.2s; font-size: 12px;"><i class="fa-solid fa-bullhorn"></i> Comunicar</button>
                <button onclick="abrirModalEntregaAchado('${item.idFirebase}')" style="flex: 1; background: #10b981; color: white; border: none; padding: 10px; border-radius: 8px; font-weight: bold; cursor: pointer; transition: 0.2s; font-size: 12px;"><i class="fa-solid fa-hand-holding-hand"></i> Entregar</button>
            `;
        } else {
            botoesAcao = `
                <div style="flex: 1; text-align: left; font-size: 11px; color: #64748b; background: #f8fafc; padding: 10px; border-radius: 8px;">
                    <strong>Retirado por:</strong> ${item.quemRetirou}<br>
                    <strong>Apto/Doc:</strong> ${item.aptoRetirou} | ${item.docRetirou}<br>
                    <strong>Data:</strong> ${item.dataEntrega}
                </div>
            `;
        }

        lista.innerHTML += `
            <div style="background: white; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; border-top: 5px solid ${corBorda}; box-shadow: 0 4px 15px rgba(0,0,0,0.03); display: flex; flex-direction: column;">
                ${imgDisplay}
                <div style="padding: 20px;">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px;">
                        <h4 style="margin: 0; font-size: 16px; color: #0f172a; font-weight: 800;">${item.nome}</h4>
                    </div>
                    ${badgeStatus}
                    
                    <div style="margin-top: 15px; font-size: 12px; color: #475569; line-height: 1.6;">
                        <div><strong>Categoria:</strong> ${item.categoria}</div>
                        <div><strong>Encontrado:</strong> ${dataFormatada} às ${item.horaEncontro}</div>
                        <div><strong>Local:</strong> ${item.localEncontrado}</div>
                        <div><strong>Armazenado em:</strong> <span style="color: #0f172a; font-weight: bold;">${item.localArmazenamento}</span></div>
                    </div>
                </div>
                
                <div style="padding: 15px 20px; background: #f8fafc; border-top: 1px solid #f1f5f9; display: flex; gap: 10px; margin-top: auto;">
                    ${botoesAcao}
                </div>
            </div>
        `;
    });
}

// ==========================================
// 4. SISTEMA DE ENTREGA SEGURO (COM ASSINATURA)
// ==========================================
function abrirModalEntregaAchado(id) {
    idAchadoEntrega = id;
    const item = achadosGlobais.find(a => a.idFirebase === id);
    
    document.getElementById('entregaNomeObjeto').innerText = item.nome;
    document.getElementById('entregaStatusObjeto').innerHTML = `<i class="fa-solid fa-check-circle"></i> Guardado em: ${item.localArmazenamento}`;
    
    document.getElementById('entregaNomePessoa').value = '';
    document.getElementById('entregaApto').value = '';
    document.getElementById('entregaDoc').value = '';
    document.getElementById('entregaCheckConfirma').checked = false;

    document.getElementById('modalEntregarAchado').classList.add('ativo');
    document.getElementById('modalEntregarAchado').style.display = 'flex';

    setTimeout(configurarCanvasAchado, 300); // Aguarda o modal abrir para setar o canvas
}

function configurarCanvasAchado() {
    canvasAchado = document.getElementById('canvasAssinaturaAchado');
    if (!canvasAchado) return;
    
    ctxAchado = canvasAchado.getContext('2d');
    ctxAchado.lineWidth = 2.5;
    ctxAchado.lineCap = 'round';
    ctxAchado.strokeStyle = '#0f172a';
    limparAssinaturaAchado();

    const getPos = (e) => {
        const rect = canvasAchado.getBoundingClientRect();
        const scaleX = canvasAchado.width / rect.width;
        const scaleY = canvasAchado.height / rect.height;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
    };

    const start = (e) => { e.preventDefault(); desenhandoAchado = true; const {x,y} = getPos(e); ctxAchado.beginPath(); ctxAchado.moveTo(x, y); };
    const draw = (e) => { e.preventDefault(); if(!desenhandoAchado) return; const {x,y} = getPos(e); ctxAchado.lineTo(x, y); ctxAchado.stroke(); };
    const stop = (e) => { e.preventDefault(); desenhandoAchado = false; };

    // Limpa eventos antigos para não duplicar
    canvasAchado.onmousedown = start; canvasAchado.onmousemove = draw; canvasAchado.onmouseup = stop; canvasAchado.onmouseout = stop;
    canvasAchado.ontouchstart = start; canvasAchado.ontouchmove = draw; canvasAchado.ontouchend = stop;
}

function limparAssinaturaAchado() {
    if(ctxAchado && canvasAchado) ctxAchado.clearRect(0, 0, canvasAchado.width, canvasAchado.height);
}

function isCanvasAchadoBlank() {
    const blank = document.createElement('canvas'); 
    blank.width = canvasAchado.width; 
    blank.height = canvasAchado.height;
    return canvasAchado.toDataURL() === blank.toDataURL();
}

function processarEntregaObjeto() {
    const nomePessoa = document.getElementById('entregaNomePessoa').value.trim();
    const apto = document.getElementById('entregaApto').value.trim();
    const doc = document.getElementById('entregaDoc').value.trim();
    const check = document.getElementById('entregaCheckConfirma').checked;

    if (!nomePessoa || !apto || !doc) {
        alert("⚠️ Preencha Nome, Apto e Documento de quem está retirando.");
        return;
    }

    if (isCanvasAchadoBlank()) {
        alert("⚠️ Solicite a assinatura digital do morador/solicitante no quadro.");
        return;
    }

    if (!check) {
        alert("⚠️ Você deve marcar a caixa confirmando a verificação de identidade.");
        return;
    }

    const btn = document.getElementById('btnConfirmarEntrega');
    const txtOriginal = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Registrando Baixa...';
    btn.style.pointerEvents = 'none';

    const assinaturaBase64 = canvasAchado.toDataURL("image/png");
    const agora = new Date();

    db.collection("achados_perdidos").doc(idAchadoEntrega).update({
        status: "Entregue",
        quemRetirou: nomePessoa,
        aptoRetirou: apto,
        docRetirou: doc,
        assinaturaRetirada: assinaturaBase64,
        dataEntrega: agora.toLocaleDateString('pt-BR') + " às " + agora.toTimeString().slice(0, 5),
        porteiroEntrega: localStorage.getItem("usuario_nome") || "Portaria"
    }).then(() => {
        alert("✅ Objeto baixado e entregue com sucesso! O comprovante foi salvo.");
        document.getElementById('modalEntregarAchado').style.display = 'none';
        document.getElementById('modalEntregarAchado').classList.remove('ativo');
    }).catch(error => {
        alert("❌ Erro ao processar entrega: " + error.message);
    }).finally(() => {
        btn.innerHTML = txtOriginal;
        btn.style.pointerEvents = 'auto';
    });
}

// ==========================================
// 5. COMUNICAR MORADORES (Gatilho Push via Firestore)
// ==========================================
function comunicarMoradoresAchado(id) {
    if(!confirm("📢 Deseja enviar um aviso geral para o celular de TODOS os moradores sobre este objeto encontrado?")) return;

    const item = achadosGlobais.find(a => a.idFirebase === id);
    const dataFormatada = item.dataEncontro.split('-').reverse().join('/');

    // Salva na coleção "comunicados" que já aciona o seu robô index.js que manda o Push!
    const aviso = {
        titulo: "🔎 Objeto Encontrado na Portaria",
        mensagem: `Atenção moradores!\nUm objeto foi encontrado nas dependências do condomínio.\n\nCategoria: ${item.categoria}\nLocal: ${item.localEncontrado}\nData: ${dataFormatada}\n\nCaso reconheça, por favor procure a portaria para identificação e retirada.`,
        tipo: "Aviso GLOBAL",
        dataRegistro: new Date().toISOString(),
        condominioId: item.condominioId,
        autor: localStorage.getItem("usuario_nome") || "Portaria",
        excluido: false
    };

    db.collection("comunicados").add(aviso).then(() => {
        alert("✅ Aviso enviado! Os moradores receberão uma notificação nos celulares.");
    }).catch(e => {
        alert("❌ Erro ao enviar aviso: " + e.message);
    });
}