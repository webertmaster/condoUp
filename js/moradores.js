// ==========================================
// ZERO LABS - CONDO UP (NUVEM FIREBASE)
// moradores.js - Gestão Premium de Moradores (MULTI-TENANT ATIVO)
// ==========================================

let idMoradorEditandoFirebase = null; 
let moradoresGlobais = []; 

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
        // Escuta os Moradores
        db.collection("moradores").where("condominioId", "==", meuCondominio).onSnapshot((snapshot) => {
            moradoresGlobais = [];
            snapshot.forEach((doc) => {
                let morador = doc.data();
                morador.id = doc.id; 
                moradoresGlobais.push(morador);
            });
            
            moradoresGlobais.sort((a, b) => a.apto.localeCompare(b.apto, undefined, {numeric: true}));
            localStorage.setItem('moradores', JSON.stringify(moradoresGlobais));
            
            atualizarListaMoradores();
            if(typeof atualizarDashboard === 'function') atualizarDashboard();
        });

        // Inicia o Radar de Cadastros Pendentes
        setTimeout(iniciarRadarDeCadastros, 1500);

    } else {
        console.error("Firebase DB não encontrado. Verifique o index.html");
    }
});

// ==========================================
// 2. FUNÇÕES DE TELEFONE DINÂMICO
// ==========================================
function adicionarCampoTelefone(containerId) {
    const container = document.getElementById(containerId);
    const div = document.createElement('div');
    div.style.display = 'flex';
    div.style.gap = '10px';
    div.style.alignItems = 'center';
    
    div.innerHTML = `
        <input class="telefone-input" type="tel" placeholder="Outro WhatsApp / Telefone" style="flex: 1; width: 100%; margin: 0;">
        <button type="button" class="btn" onclick="this.parentElement.remove()" style="background: #ef4444; margin: 0; padding: 0; width: 42px; height: 42px; flex: none; display: flex; align-items: center; justify-content: center; border-radius: 8px; font-size: 16px; transition: 0.2s;" title="Remover telefone"><i class="fa-solid fa-minus"></i></button>
    `;
    container.appendChild(div);
}

// ==========================================
// 3. ADICIONAR / ATUALIZAR NA NUVEM (CADASTRO MANUAL)
// ==========================================
function addMorador() {
    const nome = document.getElementById('nome').value.trim();
    const apto = document.getElementById('apto').value.trim();
    const secretaria = document.getElementById('secretaria').value.trim();
    const visitantes = document.getElementById('visitantes').value.trim();

    // Captura os telefones (Array)
    const inputsTelefones = document.querySelectorAll('.telefone-input');
    const listaTelefones = Array.from(inputsTelefones).map(input => input.value.trim()).filter(valor => valor !== "");

    if (!nome || !apto) {
        alert('⚠️ Nome e Apartamento são obrigatórios!');
        return;
    }

    const btnSalvar = document.getElementById('btnSalvarMorador');
    let textoOriginal = idMoradorEditandoFirebase ? "Cadastrar Morador" : (btnSalvar ? btnSalvar.innerText : "Salvar");
    
    if (btnSalvar) {
        btnSalvar.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Salvando na Nuvem...';
        btnSalvar.style.pointerEvents = 'none';
    }

    const meuCondominio = localStorage.getItem("condominioId");

    const dadosMorador = {
        nome: nome,
        apto: apto,
        telefones: listaTelefones,
        secretaria: secretaria,
        visitantes: visitantes,
        dataCadastro: new Date().toISOString(),
        condominioId: meuCondominio 
    };

    if (idMoradorEditandoFirebase) {
        db.collection("moradores").doc(idMoradorEditandoFirebase).update(dadosMorador)
            .then(() => {
                alert('✅ Registro de morador atualizado com sucesso na nuvem!');
                finalizarAcaoMorador(btnSalvar, textoOriginal);
                idMoradorEditandoFirebase = null;
            })
            .catch(err => alert('Erro ao atualizar: ' + err));
    } else {
        dadosMorador.excluido = false;
        db.collection("moradores").add(dadosMorador)
            .then(() => {
                alert('✅ Morador cadastrado com sucesso na nuvem!');
                finalizarAcaoMorador(btnSalvar, textoOriginal);
            })
            .catch(err => alert('Erro ao salvar: ' + err));
    }
}

function finalizarAcaoMorador(btnNode, textoFinal) {
    if(btnNode) {
        btnNode.innerHTML = `<i class="fa-solid fa-plus"></i> ${textoFinal}`;
        btnNode.style.background = "#3b82f6"; 
        btnNode.style.pointerEvents = 'auto';
    }
    document.getElementById('nome').value = '';
    document.getElementById('apto').value = '';
    document.getElementById('secretaria').value = '';
    document.getElementById('visitantes').value = '';
    
    // Reseta telefones para o padrão (apenas 1)
    const container = document.getElementById('container-telefones');
    container.innerHTML = `
        <div style="display: flex; gap: 10px; align-items: center;">
            <input class="telefone-input" type="tel" placeholder="WhatsApp / Telefone principal" style="flex: 1; width: 100%; margin: 0;">
            <button type="button" class="btn" onclick="adicionarCampoTelefone('container-telefones')" style="background: #10b981; margin: 0; padding: 0; width: 42px; height: 42px; flex: none; display: flex; align-items: center; justify-content: center; border-radius: 8px; font-size: 16px; transition: 0.2s;" title="Adicionar outro telefone"><i class="fa-solid fa-plus"></i></button>
        </div>`;
}

// ==========================================
// 4. RENDERIZAR LISTA DIRETO DA NUVEM
// ==========================================
function atualizarListaMoradores(termoPesquisa = '') {
    const lista = document.getElementById('listaMoradores');
    if (!lista) return;

    const moradoresAtivos = moradoresGlobais.filter(m => !m.excluido);
    lista.innerHTML = '';

    if (moradoresAtivos.length === 0) {
        lista.innerHTML = '<div style="text-align: center; grid-column: 1 / -1; padding: 40px; background: white; border-radius: 12px; border: 1px dashed #cbd5e1; color: #64748b;"><i class="fa-solid fa-house-chimney-user" style="font-size: 30px; margin-bottom: 10px; opacity: 0.5;"></i><p>Nenhum morador ativo cadastrado.</p></div>';
        return;
    }

    const aptos = {};
    moradoresAtivos.forEach(m => {
        if (!aptos[m.apto]) aptos[m.apto] = [];
        aptos[m.apto].push(m);
    });

    const grid = document.createElement('div');
    grid.className = 'apto-grid';

    Object.keys(aptos).sort().forEach(numeroApto => {
        const moradoresDoApto = aptos[numeroApto];
        
        const atendePesquisa = moradoresDoApto.some(m => 
            m.nome.toLowerCase().includes(termoPesquisa.toLowerCase()) || 
            m.apto.toLowerCase().includes(termoPesquisa.toLowerCase())
        );

        if (termoPesquisa === '' || atendePesquisa) {
            const btn = document.createElement('button');
            btn.className = 'apto-btn';
            btn.textContent = numeroApto;
            btn.onclick = () => abrirModalMorador(numeroApto, moradoresDoApto);
            grid.appendChild(btn);
        }
    });

    lista.appendChild(grid);
}

function pesquisarMoradores() {
    const termo = document.getElementById('pesquisaMorador').value;
    atualizarListaMoradores(termo);
}

function abrirModalMorador(apto, moradores) {
    const modal = document.getElementById('modalMorador');
    const conteudo = document.getElementById('conteudoModalMorador');
    const veiculos = typeof veiculosGlobais !== 'undefined' ? veiculosGlobais : (JSON.parse(localStorage.getItem('veiculos')) || []);
    
    // Agora o JavaScript sabe se é porteiro pela variável que criamos no auth.js!
    const isOperacional = window.isPorteiroLogado === true; 
    
    let html = `<h3 style="margin-bottom: 20px; color: #3b82f6; text-align: center; font-size: 24px;"><i class="fa-regular fa-building" style="margin-right: 8px; color: #64748b;"></i>Apto ${apto}</h3>`;
    
    moradores.forEach(m => {
        const carrosDoMorador = veiculos.filter(v => 
            !v.excluido && (
                v.morador.toLowerCase().trim() === m.nome.toLowerCase().trim() ||
                v.morador.toLowerCase().trim() === m.apto.toLowerCase().trim()
            )
        );

        let veiculosHtml = '';
        if (carrosDoMorador.length > 0) {
            veiculosHtml = `<p style="margin-bottom: 6px; font-size: 14px;"><i class="fa-solid fa-car-side" style="color: #f59e0b; width: 20px; text-align: center; margin-right: 5px;"></i><strong>Veículos vinculados:</strong></p>
            <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 15px;">`;
            
            carrosDoMorador.forEach(v => {
                veiculosHtml += `
                    <div onclick="redirecionarParaVeiculo('${v.id || v.idFirebase}')" style="cursor: pointer; background: white; border: 2px solid #1e293b; border-radius: 6px; text-align: center; font-weight: bold; width: 95px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.08); transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'" title="Clique para ver a ficha completa deste carro">
                        <div style="background: #003399; color: white; font-size: 6px; display: flex; justify-content: space-between; padding: 1px 4px; letter-spacing: 0.5px;">
                            <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/Mercosur_flag.svg/120px-Mercosur_flag.svg.png" style="height: 5px; opacity: 0.9;">
                            <span>BRASIL</span>
                            <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Flag_of_Brazil.svg/120px-Flag_of_Brazil.svg.png" style="height: 5px; opacity: 0.9;">
                        </div>
                        <div style="font-size: 12px; padding: 2px 0; letter-spacing: 0.5px; color: #1e293b; background: white;">${v.placa}</div>
                    </div>
                `;
            });
            veiculosHtml += `</div>`;
        } else {
            veiculosHtml = `<p style="margin-bottom: 12px; font-size: 14px;"><i class="fa-solid fa-car-side" style="color: #94a3b8; width: 20px; text-align: center; margin-right: 5px;"></i><strong>Veículos:</strong> <span style="color: #94a3b8; font-style: italic;">Nenhum veículo encontrado</span></p>`;
        }

        let telefonesText = '<span style="color: #94a3b8;">Nenhum</span>';
        if (m.telefones && m.telefones.length > 0) {
            telefonesText = m.telefones.join(' | ');
        }

        // ==========================================
        // 🔒 BLINDAGEM DE BOTÕES - MODAL DE MORADOR
        // ==========================================
        let botoesHtml = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 15px; border-top: 1px dashed #e2e8f0; padding-top: 15px;">
                <button onclick="editarMoradorModal('${m.id}')" style="background: #eff6ff; color: #3b82f6; border: 1px solid #bfdbfe; padding: 10px; border-radius: 8px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 5px; transition: 0.2s;" onmouseover="this.style.background='#dbeafe'" onmouseout="this.style.background='#eff6ff'" title="Editar Morador">
                    <i class="fa-solid fa-pen"></i> Editar
                </button>
                <button onclick="excluirMorador('${m.id}')" style="background: #fef2f2; color: #ef4444; border: 1px solid #fecaca; padding: 10px; border-radius: 8px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: 0.2s; gap: 5px;" onmouseover="this.style.background='#fee2e2'" onmouseout="this.style.background='#fef2f2'" title="Arquivar Morador">
                    <i class="fa-solid fa-trash-can"></i> Arquivar
                </button>
            </div>
        `;

        html += `
            <div style="background: white; padding: 18px; border-radius: 12px; margin-bottom: 15px; border: 1px solid #e2e8f0; box-shadow: 0 2px 8px rgba(0,0,0,0.01);">
                <p style="margin-bottom: 8px; font-size: 14px;">
                    <i class="fa-solid fa-user-tie" style="color: #3b82f6; width: 20px; text-align: center; margin-right: 5px;"></i>
                    <strong>Responsável:</strong> <span style="color: #0f172a; font-weight: 600;">${m.nome}</span>
                </p>
                <p style="margin-bottom: 8px; font-size: 14px;">
                    <i class="fa-brands fa-whatsapp" style="color: #10b981; width: 20px; text-align: center; margin-right: 5px;"></i>
                    <strong>Contatos:</strong> ${telefonesText}
                </p>
                <p style="margin-bottom: 8px; font-size: 14px;">
                    <i class="fa-solid fa-broom" style="color: #8b5cf6; width: 20px; text-align: center; margin-right: 5px;"></i>
                    <strong>Secretária:</strong> ${m.secretaria || '<span style="color: #94a3b8;">Nenhuma</span>'}
                </p>
                <p style="margin-bottom: 12px; font-size: 14px;">
                    <i class="fa-solid fa-users" style="color: #10b981; width: 20px; text-align: center; margin-right: 5px;"></i>
                    <strong>Autorizados:</strong> ${m.visitantes || '<span style="color: #94a3b8;">Nenhum</span>'}
                </p>
                
                ${veiculosHtml}
                
                ${botoesHtml}
            </div>
        `;
    });

    conteudo.innerHTML = html;
    modal.style.display = 'flex';
}

function editarMoradorModal(id) {
    const m = moradoresGlobais.find(mor => mor.id === id);
    if (!m) return;

    document.getElementById('nome').value = m.nome;
    document.getElementById('apto').value = m.apto;
    document.getElementById('secretaria').value = m.secretaria || '';
    document.getElementById('visitantes').value = m.visitantes || '';

    // Repovoando os telefones
    const containerTel = document.getElementById('container-telefones');
    containerTel.innerHTML = '';
    if (m.telefones && m.telefones.length > 0) {
        m.telefones.forEach((tel, idx) => {
            if (idx === 0) {
                containerTel.innerHTML += `
                <div style="display: flex; gap: 10px; align-items: center;">
                    <input class="telefone-input" type="tel" value="${tel}" style="flex: 1; width: 100%; margin: 0;">
                    <button type="button" class="btn" onclick="adicionarCampoTelefone('container-telefones')" style="background: #10b981; margin: 0; padding: 0; width: 42px; height: 42px; flex: none; display: flex; align-items: center; justify-content: center; border-radius: 8px; font-size: 18px; transition: 0.2s;"><i class="fa-solid fa-plus"></i></button>
                </div>`;
            } else {
                const div = document.createElement('div');
                div.style.display = 'flex';
                div.style.gap = '10px';
                div.style.alignItems = 'center';
                div.innerHTML = `
                    <input class="telefone-input" type="tel" value="${tel}" style="flex: 1; width: 100%; margin: 0;">
                    <button type="button" class="btn" onclick="this.parentElement.remove()" style="background: #ef4444; margin: 0; padding: 0; width: 42px; height: 42px; flex: none; display: flex; align-items: center; justify-content: center; border-radius: 8px; font-size: 18px; transition: 0.2s;"><i class="fa-solid fa-minus"></i></button>
                `;
                containerTel.appendChild(div);
            }
        });
    } else {
        containerTel.innerHTML = `
        <div style="display: flex; gap: 10px; align-items: center;">
            <input class="telefone-input" type="tel" placeholder="WhatsApp / Telefone principal" style="flex: 1; width: 100%; margin: 0;">
            <button type="button" class="btn" onclick="adicionarCampoTelefone('container-telefones')" style="background: #10b981; margin: 0; padding: 0; width: 42px; height: 42px; flex: none; display: flex; align-items: center; justify-content: center; border-radius: 8px; font-size: 18px; transition: 0.2s;"><i class="fa-solid fa-plus"></i></button>
        </div>`;
    }

    idMoradorEditandoFirebase = m.id;
    
    const btnSalvar = document.getElementById('btnSalvarMorador');
    if (btnSalvar) {
        btnSalvar.innerHTML = "<i class='fa-solid fa-floppy-disk'></i> Salvar Alterações";
        btnSalvar.style.background = "#10b981"; 
    }

    fecharModalMorador();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function fecharModalMorador() {
    document.getElementById('modalMorador').style.display = 'none';
}

// ==========================================
// 🚨 LIXEIRA BLINDADA: NOVA FUNÇÃO DE EXCLUIR
// ==========================================
async function excluirMorador(id) {
    // 1. Fecha o modal da ficha para a pessoa ver o aviso
    fecharModalMorador();
    
    // 2. Se for Porteiro (Operacional), joga ele no novo fluxo de Arquivamento (do adm.js)
    if (window.isPorteiroLogado === true) {
        if(typeof solicitarArquivamentoRestrito === 'function') {
            solicitarArquivamentoRestrito("moradores", id);
        } else {
            alert("⚠️ Função de arquivamento restrito não encontrada. Recarregue a página.");
        }
        return; // Para a execução aqui, ele não deleta direto
    }

    // 3. Se for Gestão/Síndico, o fluxo original continua brutal (Apaga de vez)
    if(!confirm('🚨 EXCLUSÃO DEFINITIVA: Você está acessando como GESTÃO.\n\nTem certeza que deseja apagar este morador?\nIsso removerá a ficha e CORTARÁ O ACESSO dele ao aplicativo imediatamente!')) return;

    try {
        const m = moradoresGlobais.find(mor => mor.id === id);
        if(!m) return;

        // Apaga a ficha da tela de Moradores
        await db.collection("moradores").doc(id).delete();

        // Procura a conta de login dele (na coleção usuarios) e DELETA também!
        const snapUsuarios = await db.collection("usuarios")
            .where("condominioId", "==", m.condominioId)
            .where("nome", "==", m.nome)
            .get();

        if (!snapUsuarios.empty) {
            const batch = db.batch();
            snapUsuarios.forEach(doc => {
                batch.delete(doc.ref); // Apaga o perfil de acesso e derruba o login
            });
            await batch.commit();
        }

        alert("✅ Morador e acesso ao aplicativo excluídos definitivamente com sucesso!");

    } catch (error) {
        console.error("Erro ao excluir morador:", error);
        alert("❌ Erro ao tentar excluir do banco de dados: " + error.message);
    }
}

// ==========================================
// 5. PAINEL DE APROVAÇÃO E GERAÇÃO AUTOMÁTICA
// ==========================================
function iniciarRadarDeCadastros() {
    const condominioIdLogado = localStorage.getItem("condominioId");
    const badge = document.getElementById('badge-pendentes');
    
    if(!badge || !condominioIdLogado) return;

    db.collection("cadastrosPendentes")
      .where("condominioId", "==", condominioIdLogado)
      .where("status", "==", "Pendente")
      .onSnapshot((snapshot) => {
          if (snapshot.size > 0) {
              badge.innerText = snapshot.size;
              badge.style.display = 'block'; 
          } else {
              badge.style.display = 'none'; 
          }
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
        
        const emailLogin = `${condominioIdLogado.toLowerCase()}_${prefixoBloco}${dados.apto}@condoup.com.br`.replace(/\s+/g, '').normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const senhaGerada = `CondoUp@${dados.apto}`; 

        // 2. Criação na autenticação
        const userCredential = await secondaryAuth.createUserWithEmailAndPassword(emailLogin, senhaGerada);
        const novoUid = userCredential.user.uid;

        // 3. Salva Perfil de Usuário
        await db.collection("usuarios").doc(novoUid).set({
            nome: dados.nome,
            bloco: dados.bloco,
            apartamento: dados.apto,
            telefone: dados.celular,
            emailPessoal: dados.emailPessoal || dados.email || "", // Captura o e-mail real se existir
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
            const assuntoEmail = "Seus dados de acesso - CondoUp";
            const htmlDaMensagem = `
                <div style="font-family: Arial, sans-serif; color: #334155; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
                    <h2 style="color: #3b82f6; text-align: center;">Bem-vindo(a) ao CondoUp!</h2>
                    <p>Olá, <b>${dados.nome}</b>! 🎉</p>
                    <p>O seu cadastro foi <b>aprovado</b> pela administração do condomínio. Abaixo estão os seus dados oficiais para acessar o aplicativo da portaria:</p>
                    
                    <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px dashed #cbd5e1;">
                        <!-- 🚀 LINK DO E-MAIL ATUALIZADO AQUI -->
                        <p style="margin: 5px 0;"><b>📱 Aplicativo:</b> <a href="https://condoup.evoupi.com.br/" style="color: #3b82f6; text-decoration: none;">condoup.evoupi.com.br/</a></p>
                        <p style="margin: 5px 0;"><b>📧 E-mail (Login):</b> ${emailLogin}</p>
                        <p style="margin: 5px 0;"><b>🔑 Senha provisória:</b> ${senhaGerada}</p>
                    </div>
                    
                    <p style="font-size: 13px; color: #64748b;"><i>Recomendamos fortemente que você altere sua senha no seu primeiro acesso, acessando a aba "Meu Perfil" no menu do sistema.</i></p>
                </div>
            `;
            
            // Chama a função dispararEmail que está lá no adm.js e pega as chaves do cofre
            if(typeof dispararEmail === 'function') {
                dispararEmail(emailRealDoMorador, dados.nome, assuntoEmail, htmlDaMensagem);
            }
        }

        // ==========================================
        // 8. ENVIO VIA WHATSAPP (Abre a janela no PC/Celular)
        // ==========================================
        let numeroLimpo = dados.celular.replace(/\D/g, '');
        if (numeroLimpo.length === 10 || numeroLimpo.length === 11) { numeroLimpo = '55' + numeroLimpo; }

        // 🚀 LINK DO WHATSAPP ATUALIZADO AQUI
        const textoMsg = `Olá, ${dados.nome}! 🎉\n\nSeu acesso ao app da portaria foi *aprovado*.\n\n📱 *Link:* condoup.evoupi.com.br\n📧 *Login:* ${emailLogin}\n🔑 *Senha:* ${senhaGerada}\n\n_Recomendamos alterar sua senha no primeiro acesso!_`;
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
// 6. OUTRAS FUNÇÕES DE SUPORTE
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

function redirecionarParaVeiculo(idCarro) {
    const veiculos = JSON.parse(localStorage.getItem('veiculos')) || [];
    const carroClicado = veiculos.find(v => v.id === idCarro || v.idFirebase === idCarro);
    
    if (!carroClicado) {
        alert("Veículo não encontrado na base de dados!");
        return;
    }

    fecharModalMorador();
    if (typeof trocarTela === 'function') trocarTela('veiculos');

    const barraPesquisa = document.getElementById('pesquisaVeiculo');
    if (barraPesquisa) {
        barraPesquisa.value = carroClicado.placa;
        if (typeof mostrarVeiculos === 'function') mostrarVeiculos();
    }
}