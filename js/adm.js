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
    const aptosInput = document.getElementById('novo-cond-aptos');
    const valorInput = document.getElementById('novo-cond-valor');

    const nome = nomeInput.value.trim();
    const condominioId = idInput.value.trim().toLowerCase().replace(/\s+/g, '_');
    const aptos = parseInt(aptosInput.value) || 0;
    const valorPlano = parseFloat(valorInput.value) || 0;

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
            aptos: aptos,
            valorPlano: valorPlano,
            dataCadastro: new Date().toISOString(),
            ativo: true
        });

        alert("✅ Condomínio cadastrado com sucesso!");
        
        nomeInput.value = '';
        idInput.value = '';
        aptosInput.value = '';
        valorInput.value = '';
        document.getElementById('box-cad-condominio').style.display = 'none';

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

        let totalAptos = 0;
        let totalReceita = 0;
        let qtdAtivos = 0;
        let qtdSuspensos = 0;

        if (snapshot.empty) {
            listaHtml.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px; color: #94a3b8;">Nenhum condomínio cadastrado ainda.</td></tr>';
            atualizarCardsMaster(0, 0, 0, 0);
            return;
        }

        let clientes = [];
        snapshot.forEach((doc) => {
            clientes.push(doc.data());
        });

        // Ordena por data (mais novo primeiro)
        clientes.sort((a, b) => {
            const dataA = a.dataCadastro ? new Date(a.dataCadastro).getTime() : 0;
            const dataB = b.dataCadastro ? new Date(b.dataCadastro).getTime() : 0;
            return dataB - dataA;
        });

        clientes.forEach((cond) => {
            // Cálculos para o Dashboard
            if (cond.ativo !== false) { // Ativo por padrão
                qtdAtivos++;
                totalAptos += (cond.aptos || 0);
                totalReceita += (cond.valorPlano || 0);
            } else {
                qtdSuspensos++;
            }

            // Formatação Visual da Tabela
            const statusBadge = cond.ativo !== false 
                ? `<span style="background: #dcfce7; color: #16a34a; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: bold;"><i class="fa-solid fa-circle-check"></i> ATIVO</span>` 
                : `<span style="background: #fee2e2; color: #dc2626; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: bold;"><i class="fa-solid fa-ban"></i> SUSPENSO</span>`;

            const valorFormatado = (cond.valorPlano || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            const aptosFormatado = cond.aptos ? `${cond.aptos} aptos` : 'N/D';

            listaHtml.innerHTML += `
                <tr style="border-bottom: 1px solid #f1f5f9; transition: background 0.2s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='transparent'">
                    <td style="padding: 15px 20px;">
                        <strong style="color: #0f172a; display: block; text-transform: capitalize;">${cond.nome || 'Sem Nome'}</strong>
                        <span style="color: #64748b; font-size: 12px; font-family: monospace;">ID: ${cond.condominioId || 'Sem ID'}</span>
                    </td>
                    <td style="padding: 15px 20px; color: #475569;">
                        <strong style="display: block;">${valorFormatado}</strong>
                        <span style="font-size: 12px;"><i class="fa-solid fa-door-closed" style="color: #94a3b8;"></i> ${aptosFormatado}</span>
                    </td>
                    <td style="padding: 15px 20px;">${statusBadge}</td>
                    <td style="padding: 15px 20px; text-align: right; gap: 8px;">
                        <button class="btn" style="background: #3b82f6; margin: 0; padding: 6px 12px; font-size: 12px;" onclick="alert('Funcionalidade Impersonate (Fantasma) em construção!')">
                            <i class="fa-solid fa-eye"></i> Entrar
                        </button>
                        <button class="btn" style="background: #f1f5f9; color: #64748b; border: 1px solid #cbd5e1; margin: 0; padding: 6px 12px; font-size: 12px;" onclick="alert('Edição em breve!')">
                            <i class="fa-solid fa-pen"></i>
                        </button>
                    </td>
                </tr>
            `;
        });

        // Atualiza os números nos cards vermelhos/verdes lá em cima
        atualizarCardsMaster(totalReceita, totalAptos, qtdAtivos, qtdSuspensos);

    }, (error) => {
        console.error("🚨 Erro ao carregar lista:", error);
        listaHtml.innerHTML = `<tr><td colspan="4" style="color: #ef4444; text-align: center; padding: 20px;">Erro na conexão com o banco de dados.</td></tr>`;
    });
}

function atualizarCardsMaster(receita, aptos, ativos, suspensos) {
    const elReceita = document.getElementById('master-mrr');
    const elAptos = document.getElementById('master-aptos');
    const elAtivos = document.getElementById('master-ativos');
    const elSuspensos = document.getElementById('master-suspensos');

    if(elReceita) elReceita.innerText = receita.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    if(elAptos) elAptos.innerText = aptos;
    if(elAtivos) elAtivos.innerText = ativos;
    if(elSuspensos) elSuspensos.innerText = suspensos;
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
// 📢 MEGAFONE: DISPARO VIA ROBÔ DA NUVEM
// ==========================================
async function dispararMegafoneGlobal() {
    const campoTitulo = document.getElementById('megaTitulo');
    const campoMensagem = document.getElementById('megaMensagem');

    if (!campoTitulo || !campoMensagem) {
        alert("❌ ERRO CRÍTICO: Os campos visuais do Megafone não foram localizados na tela.");
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

        snapshot.forEach((doc) => {
            const predio = doc.data();
            if (predio.condominioId) {
                const acaoMural = db.collection("comunicados").add({
                    tipo: "📢 Geral", status: "🟡 Pendente",
                    titulo: `📢 AVISO GLOBAL: ${titulo}`,
                    dataEvento: "", horaEvento: "", local: "Geral",
                    mensagem: messageText, condominioId: predio.condominioId,
                    dataRegistro: timestampDisparo, excluido: false
                });
                
                const acaoSino = db.collection("notificacoes").add({
                    titulo: `📢 Alerta Geral: ${titulo}`,
                    mensagem: messageText, tipo: "comunicado",
                    lida: false, condominioId: predio.condominioId,
                    timestamp: new Date().getTime()
                });

                promessasDeInjecao.push(acaoMural, acaoSino);
            }
        });

        await Promise.all(promessasDeInjecao);

        alert(`🚀 MEGAFONE PROPAGADO COM SUCESSO!\nO aviso foi injetado em todos os condomínios.`);
        campoTitulo.value = ''; campoMensagem.value = '';

    } catch (error) {
        console.error("Falha na execução do Megafone Global:", error);
        alert("❌ Erro ao processar o disparo em massa na base de dados.");
    }
}

// ==========================================
// 🚀 INICIALIZAÇÃO BLINDADA
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
