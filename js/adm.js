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
            const isAtivo = cond.ativo !== false;
            const id = cond.condominioId;
            const nomeCond = cond.nome || 'Sem Nome';

            /// Cálculos para o Dashboard Master
            if (isAtivo) {
                qtdAtivos++;
                totalAptos += (cond.aptos || 0);
                totalReceita += (cond.valorPlano || 0);
            } else {
                qtdSuspensos++;
            }

            // Formatação Visual da Tabela
            const statusBadge = isAtivo 
                ? `<span style="background: #dcfce7; color: #16a34a; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: bold;"><i class="fa-solid fa-circle-check"></i> ATIVO</span>` 
                : `<span style="background: #fee2e2; color: #dc2626; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: bold;"><i class="fa-solid fa-ban"></i> SUSPENSO</span>`;

            const valorFormatado = (cond.valorPlano || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            const aptosFormatado = cond.aptos ? `${cond.aptos} aptos` : 'N/D';

            listaHtml.innerHTML += `
                <tr style="border-bottom: 1px solid #f1f5f9; transition: background 0.2s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='transparent'">
                    <td style="padding: 15px 20px;">
                        <strong style="color: #0f172a; display: block; text-transform: capitalize;">${nomeCond}</strong>
                        <span style="color: #64748b; font-size: 12px; font-family: monospace;">ID: ${id || 'Sem ID'}</span>
                    </td>
                    <td style="padding: 15px 20px; color: #475569;">
                        <strong style="display: block;">${valorFormatado}</strong>
                        <span style="font-size: 12px;"><i class="fa-solid fa-door-closed" style="color: #94a3b8;"></i> ${aptosFormatado}</span>
                    </td>
                    <td style="padding: 15px 20px;">${statusBadge}</td>
                    <td style="padding: 15px 20px; text-align: right;">
                        <div style="display: flex; justify-content: flex-end; gap: 5px;">
                            <button onclick="entrarComoCondominio('${id}', '${nomeCond}')" style="background: #10b981; color: white; border: none; padding: 8px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: bold;" title="Acessar Sistema">
                                <i class="fa-solid fa-right-to-bracket"></i>
                            </button>
                            <button onclick="abrirModalEditarSaaS('${id}', '${nomeCond}', ${cond.aptos || 0}, ${cond.valorPlano || 0}, ${isAtivo})" style="background: #e2e8f0; color: #475569; border: 1px solid #cbd5e1; padding: 8px 12px; border-radius: 6px; cursor: pointer; font-size: 12px;" title="Editar Plano">
                                <i class="fa-solid fa-pen"></i>
                            </button>
                            <button onclick="gerarQrCodeConvite('${id}')" style="background: #8b5cf6; color: white; border: none; padding: 8px 12px; border-radius: 6px; cursor: pointer; font-size: 12px;" title="QR Code e Link de Convite">
                                <i class="fa-solid fa-qrcode"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });

        // Atualiza os números nos cards lá em cima
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

// 👁️ MODO FANTASMA
function entrarComoCondominio(condId, nome) {
    if (confirm(`🚨 MODO FANTASMA 🚨\n\nVocê vai acessar o painel de "${nome}" exatamente como o Síndico deles vê.\n\nDeseja continuar?`)) {
        localStorage.setItem("condominio_fantasma", condId);
        localStorage.setItem("condominio_fantasma_nome", nome);
        window.location.href = 'index.html';
    }
}

// 🛠️ EDICAO SaaS: FUNÇÃO QUE ABRE O MODAL PREENCHIDO
function abrirModalEditarSaaS(id, nome, aptos, valor, ativo) {
    document.getElementById('edit-cond-id').value = id;
    document.getElementById('edit-cond-nome').value = nome;
    document.getElementById('edit-cond-aptos').value = aptos;
    document.getElementById('edit-cond-valor').value = valor;
    document.getElementById('edit-cond-status').value = ativo ? "true" : "false";
    
    document.getElementById('modalEditarCondominio').style.display = 'flex';
}

function fecharModalEditarSaaS() {
    document.getElementById('modalEditarCondominio').style.display = 'none';
}

async function salvarEdicaoCondominioSaaS() {
    const id = document.getElementById('edit-cond-id').value;
    const nome = document.getElementById('edit-cond-nome').value.trim();
    const aptos = parseInt(document.getElementById('edit-cond-aptos').value) || 0;
    const valorPlano = parseFloat(document.getElementById('edit-cond-valor').value) || 0;
    const statusAtivo = document.getElementById('edit-cond-status').value === "true";

    if (!nome) {
        alert("⚠️ O nome do condomínio não pode ficar vazio!");
        return;
    }

    try {
        await db.collection("condominios").doc(id).update({
            nome: nome,
            aptos: aptos,
            valorPlano: valorPlano,
            ativo: statusAtivo
        });

        alert("✅ Dados do condomínio atualizados com sucesso!");
        fecharModalEditarSaaS();

    } catch (error) {
        console.error("Erro ao atualizar condomínio:", error);
        alert("❌ Erro ao atualizar os dados no banco.");
    }
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

// ---------------------------------------------------------
// 🚀 MOTOR DE E-MAILS (BUSCA AS CHAVES NO FIREBASE)
// ---------------------------------------------------------
async function dispararEmail(destinatarioEmail, destinatarioNome, assunto, conteudoHTML) {
    
    // 1. Busca a configuração salva na sua aba de "Configurações"
    const configDoc = await db.collection("configuracoes").doc("smtp").get();
    
    // 2. Trava de segurança: Se a aba estiver vazia, cancela
    if (!configDoc.exists) {
        alert("❌ Erro de Sistema: Configure o SMTP na aba de Configurações do painel Master antes de enviar e-mails!");
        return false;
    }

    // 3. Puxa os dados direto do banco
    const config = configDoc.data(); 
    const CHAVE_API_BREVO = config.pass; 
    const REMETENTE_EMAIL = config.user; 

    const url = "https://api.brevo.com/v3/smtp/email";

    const dadosDoEmail = {
        sender: { name: "CondoUp - Portaria Inteligente", email: REMETENTE_EMAIL },
        to: [{ email: destinatarioEmail, name: destinatarioNome }],
        subject: assunto,
        htmlContent: conteudoHTML
    };

    try {
        const resposta = await fetch(url, {
            method: "POST",
            headers: {
                "accept": "application/json",
                "api-key": CHAVE_API_BREVO, 
                "content-type": "application/json"
            },
            body: JSON.stringify(dadosDoEmail)
        });

        if (resposta.ok) {
            console.log("🚀 E-mail disparado com as credenciais do banco!");
            return true;
        } else {
            console.error("❌ Erro da Brevo:", await resposta.text());
            return false;
        }
    } catch (erro) {
        console.error("❌ Falha na conexão:", erro);
        return false;
    }
}
// ---------------------------------------------------------

// ---------------------------------------------------------
// NOVA FUNÇÃO: CRIA USUÁRIO NO FIREBASE E MANDA O E-MAIL
// ---------------------------------------------------------
async function criarUsuarioPeloADM() {
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

    // Mudando o botão para o modo "Carregando"
    const btn = document.querySelector('button[onclick="criarUsuarioPeloADM()"]');
    const textoOriginal = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Criando e Enviando E-mail...';
    btn.disabled = true;

    try {
        // 1. Cria o usuário usando SecondaryApp (Para não deslogar o Admin)
        const secondaryApp = firebase.initializeApp(firebaseConfig, "SecondaryApp");
        const userCredential = await secondaryApp.auth().createUserWithEmailAndPassword(email, senha);
        const uid = userCredential.user.uid;

        // 2. Salva no banco de dados (Firestore)
        await db.collection("usuarios").doc(uid).set({
            nome: nome,
            email: email,
            cargo: cargo,
            condominioId: condominioId,
            criadoEm: new Date().toISOString()
        });

        // 3. Desloga do SecondaryApp e limpa ele
        await secondaryApp.auth().signOut();
        await secondaryApp.delete();

        // 4. Monta o E-mail Premium
        const htmlDoEmail = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
                <div style="background-color: #0F172A; padding: 25px; text-align: center;">
                    <h2 style="color: #38bdf8; margin: 0; font-size: 24px; letter-spacing: 1px;">CONDO UP</h2>
                </div>
                <div style="padding: 30px; background-color: #ffffff; color: #334155;">
                    <h3 style="color: #1e293b; font-size: 20px; margin-top: 0;">Olá, ${nome}!</h3>
                    <p style="font-size: 15px; line-height: 1.6;">Seu acesso ao sistema da portaria inteligente foi criado com sucesso. O seu perfil registrado é de <strong>${cargo}</strong>.</p>
                    
                    <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; border-left: 4px solid #38bdf8; margin: 25px 0;">
                        <p style="margin: 0 0 10px 0; font-size: 15px;"><b>E-mail de acesso:</b> ${email}</p>
                        <p style="margin: 0; font-size: 15px;"><b>Senha provisória:</b> <span style="background: #e2e8f0; padding: 3px 8px; border-radius: 4px; font-family: monospace;">${senha}</span></p>
                    </div>
                    
                    <p style="font-size: 15px;">Acesse o painel pelo link abaixo para iniciar o seu trabalho:</p>
                    <div style="text-align: center; margin-top: 25px;">
                        <a href="https://app.condoup.com.br" style="display: inline-block; background-color: #3b82f6; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">Acessar o Sistema</a>
                    </div>
                    
                    <hr style="border: none; border-top: 1px dashed #cbd5e1; margin: 30px 0;">
                    <p style="margin: 0; font-size: 12px; color: #94a3b8; text-align: center;">Por segurança, recomendamos que você altere sua senha no primeiro acesso através da aba "Meu Perfil".</p>
                </div>
            </div>
        `;

        // 5. Dispara o E-mail!
        const emailEnviado = await dispararEmail(email, nome, "Seus dados de acesso - CondoUp", htmlDoEmail);

        if(emailEnviado) {
            alert(`✅ Sucesso! Login de ${nome} (${cargo}) criado e E-MAIL ENVIADO.`);
        } else {
            alert(`⚠️ O Login foi criado, mas houve falha ao enviar o e-mail via Brevo.`);
        }

        // 6. Limpa as caixas da tela
        document.getElementById('admFuncNome').value = '';
        document.getElementById('admFuncEmail').value = '';
        document.getElementById('admFuncSenha').value = '';

    } catch (error) {
        console.error("Erro no processo:", error);
        alert("❌ Erro ao criar login: " + error.message);
        
        // Tenta limpar o secondaryApp se der erro no meio do caminho
        try { if(firebase.apps.length > 1) { await firebase.app("SecondaryApp").delete(); } } catch(e) {}
    } finally {
        // Volta o botão ao normal
        btn.innerHTML = textoOriginal;
        btn.disabled = false;
    }
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
// 🔗 MÓDULO DE QR CODE E LINK DE CONVITE
// ==========================================
function gerarQrCodeConvite(condominioId) {
    if (!condominioId) {
        alert("Erro: ID do condomínio não encontrado.");
        return;
    }

    // 🔥 AQUI ESTÁ A MÁGICA: Fixamos o seu domínio oficial!
    const baseUrl = "https://condoup.evoupi.com.br"; 
    const linkOficial = `${baseUrl}/cadastro-morador.html?cond=${condominioId}`;

    // Atualiza o input com o link
    document.getElementById('input-link-convite').value = linkOficial;

    // Gera o QR Code dinâmico usando uma API gratuita rápida
    const urlQrCode = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(linkOficial)}&margin=10`;
    document.getElementById('img-qrcode-convite').src = urlQrCode;

    // Abre o Modal na tela
    document.getElementById('modalQRCodeConvite').style.display = 'flex';
}

function copiarLinkConvite() {
    const inputLink = document.getElementById('input-link-convite');
    inputLink.select();
    inputLink.setSelectionRange(0, 99999); // Ajuste para funcionar 100% no celular

    navigator.clipboard.writeText(inputLink.value).then(() => {
        alert("✅ Link copiado com sucesso! Agora é só colar no WhatsApp do morador.");
    }).catch(err => {
        console.error('Erro ao copiar: ', err);
    });
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
