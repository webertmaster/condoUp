// ==========================================
// EVO UPI - CONDO UP
// adm.js - Motor do Painel Master Global
// ==========================================

// ==========================================
// 🏢 PARTE 1: GESTÃO DE CONDOMÍNIOS
// ==========================================

async function salvarNovoCondominioSaaS() {
    const nomeInput = document.getElementById('novo-cond-nome');
    const idInput = document.getElementById('novo-cond-id');

    if (!nomeInput || !idInput) {
        alert("❌ Erro no HTML: Campos de cadastro de condomínio não encontrados.");
        return;
    }

    const nome = nomeInput.value.trim();
    const condominioId = idInput.value.trim().toLowerCase().replace(/\s+/g, '_');

    if (!nome || !condominioId) {
        alert("⚠️ Preencha o Nome e o ID Único do condomínio!");
        return;
    }

    try {
        const docExistente = await db.collection("condominios").doc(condominioId).get();
        if (docExistente.exists) {
            alert("❌ Esse ID Único já está sendo usado por outro condomínio. Escolha outro!");
            return;
        }

        await db.collection("condominios").doc(condominioId).set({
            nome: nome,
            condominioId: condominioId,
            dataCadastro: new Date().toISOString(),
            ativo: true
        });

        alert("✅ Condomínio cadastrado com sucesso!");
        nomeInput.value = '';
        idInput.value = '';

    } catch (error) {
        console.error("Erro ao cadastrar condomínio:", error);
        alert("❌ Erro ao salvar no banco de dados.");
    }
}

function carregarCondominiosSaaS() {
    const listaHtml = document.getElementById('lista-condominios-saas');
    if (!listaHtml) return;

    db.collection("condominios").onSnapshot((snapshot) => {
        listaHtml.innerHTML = ''; 

        if (snapshot.empty) {
            listaHtml.innerHTML = '<p style="text-align: center; margin: 20px 0; color: #94a3b8;">Nenhum condomínio cadastrado ainda.</p>';
            return;
        }

        let clientes = [];
        snapshot.forEach((doc) => {
            clientes.push(doc.data());
        });

        clientes.sort((a, b) => {
            const dataA = a.dataCadastro ? new Date(a.dataCadastro).getTime() : 0;
            const dataB = b.dataCadastro ? new Date(b.dataCadastro).getTime() : 0;
            return dataB - dataA;
        });

        clientes.forEach((cond) => {
            let dataFormatada = "Data desconhecida";
            if (cond.dataCadastro) {
                try {
                    dataFormatada = new Date(cond.dataCadastro).toLocaleDateString('pt-BR');
                } catch(e) {}
            }

            listaHtml.innerHTML += `
                <div style="background: white; border: 1px solid #cbd5e1; border-radius: 8px; padding: 15px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong style="color: #0f172a; font-size: 15px; display: block; text-transform: capitalize;">${cond.nome || 'Sem Nome'}</strong>
                        <span style="color: #3b82f6; font-size: 12px; font-family: monospace; background: #eff6ff; padding: 2px 6px; border-radius: 4px;">ID: ${cond.condominioId || 'Sem ID'}</span>
                    </div>
                    <div style="text-align: right;">
                        <span style="color: #10b981; font-size: 12px; font-weight: bold; display: block;"><i class="fa-solid fa-circle-check"></i> Ativo</span>
                        <span style="color: #64748b; font-size: 11px;">Desde ${dataFormatada}</span>
                    </div>
                </div>
            `;
        });
    }, (error) => {
        console.error("🚨 Erro ao carregar lista:", error);
        listaHtml.innerHTML = `<p style="color: #ef4444; text-align: center;">Erro na conexão com o banco de dados.</p>`;
    });
}

// ==========================================
// 👥 PARTE 2: FÁBRICA DE ACESSOS (SaaS)
// ==========================================

function carregarListaCondominios() {
    const select = document.getElementById('admFuncCondominio');
    if (!select) return;

    db.collection("condominios").onSnapshot((snapshot) => {
        select.innerHTML = '<option value="" disabled selected>Selecione o Condomínio...</option>';
        snapshot.forEach((doc) => {
            let c = doc.data();
            if(c.condominioId && c.nome) {
                select.innerHTML += `<option value="${c.condominioId}" style="text-transform: capitalize;">${c.nome}</option>`;
            }
        });
    });
}

function criarUsuarioPeloADM() {
    const email = document.getElementById('admFuncEmail').value.trim();
    const senha = document.getElementById('admFuncSenha').value.trim();
    const nome = document.getElementById('admFuncNome').value.trim();
    const cargo = document.getElementById('admFuncCargo').value;
    const condominioId = document.getElementById('admFuncCondominio').value;

    if(!email || !senha || !nome || !cargo || !condominioId) {
        alert("⚠️ Preencha todos os campos!");
        return;
    }

    if (senha.length < 6) {
        alert("⚠️ A senha precisa ter pelo menos 6 caracteres.");
        return;
    }

    const secondaryApp = firebase.initializeApp(firebaseConfig, "SecondaryApp");

    secondaryApp.auth().createUserWithEmailAndPassword(email, senha)
    .then((userCredential) => {
        const uid = userCredential.user.uid;

        db.collection("usuarios").doc(uid).set({
            nome: nome,
            email: email,
            cargo: cargo,
            condominioId: condominioId,
            criadoEm: new Date().toISOString()
        }).then(() => {
            alert(`✅ Sucesso! Login de ${nome} (${cargo}) criado e vinculado ao prédio.`);
            
            document.getElementById('admFuncNome').value = '';
            document.getElementById('admFuncEmail').value = '';
            document.getElementById('admFuncSenha').value = '';
            
            secondaryApp.auth().signOut().then(() => {
                secondaryApp.delete();
            });
        });
    })
    .catch((error) => {
        console.error("Erro no Firebase:", error);
        alert("❌ Erro ao criar login: " + error.message);
        secondaryApp.delete(); 
    });
}

// ==========================================
// 📢 MEGAFONE: DISPARO VIA ROBÔ DA NUVEM (MÚLTIPLOS TENANTS)
// ==========================================
async function dispararMegafoneGlobal() {
    const campoTitulo = document.getElementById('megaTitulo');
    const campoMensagem = document.getElementById('megaMensagem');

    // 🚨 DIAGNÓSTICO DE SEGURANÇA: Se a caixinha sumir do HTML, o sistema avisa amigavelmente em vez de travar tudo!
    if (!campoTitulo || !campoMensagem) {
        alert("❌ ERRO CRÍTICO: Os campos visuais do Megafone não foram localizados na tela. Verifique se o código do index.html foi salvo corretamente!");
        return;
    }

    const titulo = campoTitulo.value.trim();
    const messageText = campoMensagem.value.trim();

    if (!titulo || !messageText) {
        alert("⚠️ Preencha o Título e a Mensagem do aviso global!");
        return;
    }

    const confirmar = confirm(`🚨 ATENÇÃO MASTER 🚨\n\nIsso vai disparar uma notificação Push e preencher o Mural de Comunicados de ABSOLUTAMENTE TODOS os condomínios ativos na plataforma.\n\nTítulo: ${titulo}\n\nTem certeza absoluta que deseja propagar o aviso?`);
    if (!confirmar) return;

    try {
        const snapshot = await db.collection("condominios").get();

        if (snapshot.empty) {
            alert("Nenhum condomínio ativo foi localizado no banco de dados.");
            return;
        }

        const timestampDisparo = new Date().toISOString();
        const promessasDeInjecao = [];

        // 🚀 O SEGREDO DO SUCESSO: Replica o formato exato que o seu robô da nuvem lê para disparar o Push!
        snapshot.forEach((doc) => {
            const predio = doc.data();
            if (predio.condominioId) {
                
                // 1. Injeta na coleção "comunicados" para acordar o Robô Push da Nuvem
                const acaoMural = db.collection("comunicados").add({
                    tipo: "📢 Geral",
                    status: "🟡 Pendente",
                    titulo: `📢 AVISO GLOBAL: ${titulo}`,
                    dataEvento: "",
                    horaEvento: "",
                    local: "Geral",
                    mensagem: messageText,
                    condominioId: predio.condominioId,
                    dataRegistro: timestampDisparo,
                    excluido: false
                });
                
                // 2. Injeta na coleção "notificacoes" para acionar o sininho interno também
                const acaoSino = db.collection("notificacoes").add({
                    titulo: `📢 Alerta Geral: ${titulo}`,
                    mensagem: messageText,
                    tipo: "comunicado",
                    lida: false,
                    condominioId: predio.condominioId,
                    timestamp: new Date().getTime()
                });

                promessasDeInjecao.push(acaoMural, acaoSino);
            }
        });

        await Promise.all(promessasDeInjecao);

        alert(`🚀 MEGAFONE PROPAGADO COM SUCESSO!\nO aviso foi injetado em todos os condomínios e o seu robô da nuvem já está entregando os Pushs.`);
        
        campoTitulo.value = '';
        campoMensagem.value = '';

    } catch (error) {
        console.error("Falha na execução do Megafone Global:", error);
        alert("❌ Erro ao processar o disparo em massa na base de dados.");
    }
}

// ==========================================
// 🚀 INICIALIZAÇÃO BLINDADA (MOTOR V8.3)
// ==========================================
const ligarMotorADM = setInterval(() => {
    const listaNaTela = document.getElementById('lista-condominios-saas');
    
    if (listaNaTela && typeof db !== 'undefined') {
        console.log("🚀 Motor ADM Ligado! Puxando dados em tempo real...");
        carregarCondominiosSaaS();
        carregarListaCondominios();
        clearInterval(ligarMotorADM); 
    }
}, 500);