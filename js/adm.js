// ==========================================
// EVO UPI - CONRUJA
// adm.js - Motor do Painel Master Global e Permissões
// ==========================================

// Variáveis Universais para Controle de Permissões
let perfilUsuarioLogado = "Desconhecido"; // Ex: Porteiro, Síndico, Master
let isMasterSupremo = false;
let isGestorZeroLabs = false; // 🚀 Adicionada a variável global para o Técnico

// 🚀 FUNÇÃO DE CENSURA FINANCEIRA INDEPENDENTE
function formatarMoedaCensurada(valorReal) {
    // Agora sim, puxando a chave correta: 'usuario_cargo'
    const cargoSalvo = (localStorage.getItem('usuario_cargo') || '').toLowerCase();
    
    // Verifica se é a equipe técnica
    const ehTecnico = cargoSalvo.includes('gestor') || cargoSalvo.includes('tecnico') || cargoSalvo.includes('técnico') || cargoSalvo.includes('gestão técnica');

    if (ehTecnico) {
        return 'R$ ****,**'; // Mostra os asteriscos
    } else {
        return parseFloat(valorReal || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }
}

// ============================================================================
// 🔒 MÓDULO DE PERMISSÕES E AUDITORIA (RESTRIÇÕES PARA PORTARIA E GESTOR)
// ============================================================================

// Esta função é chamada logo após o login no auth.js para aplicar as regras visuais
function aplicarPermissoesPorCargo(dadosUsuario) {
    console.log("🚀 CARGO DO USUÁRIO LOGADO:", dadosUsuario.cargo);
    
    perfilUsuarioLogado = dadosUsuario.cargo || "Desconhecido";
    
    // 🚀 SALVA O CARGO NA MEMÓRIA INSTANTÂNEA PARA A TABELA NÃO SE PERDER
    localStorage.setItem('meuCargoAtualizado', perfilUsuarioLogado);
    
    const cargoLower = perfilUsuarioLogado.toLowerCase();
    
    const isOperacional = cargoLower.includes('porteiro') || cargoLower.includes('funcionário') || cargoLower.includes('zelador');
    
    // Define a variável global do técnico
    isGestorZeroLabs = cargoLower.includes('gestor') || cargoLower.includes('tecnico') || cargoLower.includes('técnico') || cargoLower.includes('gestão técnica'); 
    
    isMasterSupremo = cargoLower.includes('master') || cargoLower.includes('adm') || cargoLower.includes('síndico') || cargoLower.includes('administradora');

    if (isOperacional) {
        const btnNovoComunicado = document.getElementById('btnSalvarComunicado');
        if (btnNovoComunicado) btnNovoComunicado.style.display = 'none';
        
        document.getElementById('tituloComunicado') && (document.getElementById('tituloComunicado').style.display = 'none');
        document.getElementById('mensagemComunicado') && (document.getElementById('mensagemComunicado').style.display = 'none');
        document.getElementById('localComunicado') && (document.getElementById('localComunicado').style.display = 'none');
        
        const menuPonto = document.getElementById('menu-ponto');
        if (menuPonto) {
            menuPonto.style.display = dadosUsuario.batePonto === true ? 'flex' : 'none';
        }
    } else if (isMasterSupremo || isGestorZeroLabs) {
        const btnNovoComunicado = document.getElementById('btnSalvarComunicado');
        if (btnNovoComunicado) btnNovoComunicado.style.display = 'flex';
        
        const menuPonto = document.getElementById('menu-ponto');
        if (menuPonto) menuPonto.style.display = 'none';
    }

    if (isGestorZeroLabs) {
        const btnGavetaFinanceiro = document.querySelector('button[onclick="toggleGaveta(\'gaveta-financeiro\')"]');
        const gavetaFinanceiro = document.getElementById('gaveta-financeiro');
        if (btnGavetaFinanceiro) btnGavetaFinanceiro.style.display = 'none';
        if (gavetaFinanceiro) gavetaFinanceiro.style.display = 'none';
    }

    // 🚀 O GRANDE TRUQUE: Agora que sabemos quem é, manda a tabela desenhar de novo IMEDIATAMENTE!
    if (document.getElementById('lista-condominios-saas')) {
        carregarCondominiosSaaS();
    }
}
// -------------------------------------------------------------
// 🗑️ MOTOR INTELIGENTE DE EXCLUSÃO / ARQUIVAMENTO
// As outras abas (encomendas.js, moradores.js) vão usar essa função
// -------------------------------------------------------------
function solicitarArquivamentoRestrito(colecao, idDoDocumento) {
    if (isMasterSupremo) {
        // Se for chefe, apaga direto e sem choro!
        if (confirm("Tem certeza que deseja excluir/arquivar este registro definitivamente?")) {
            executarArquivamentoNoBanco(colecao, idDoDocumento, "Exclusão Direta pela Gestão", "");
        }
    } else {
        // Se for porteiro/funcionário, abre o MODAL DE JUSTIFICATIVA!
        document.getElementById('justificativaItemId').value = idDoDocumento;
        document.getElementById('justificativaColecao').value = colecao;
        document.getElementById('modalJustificativaArquivamento').style.display = 'flex';
    }
}

// Botão "Arquivar" dentro do Modal de Justificativa
async function confirmarArquivamentoComJustificativa() {
    const id = document.getElementById('justificativaItemId').value;
    const colecao = document.getElementById('justificativaColecao').value;
    const motivo = document.getElementById('motivoArquivamento').value;
    const detalhes = document.getElementById('detalhesArquivamento').value;
    const condId = localStorage.getItem("condominioId");

    const btn = document.querySelector('button[onclick="confirmarArquivamentoComJustificativa()"]');
    const textoBotaoOriginal = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Arquivando...';
    btn.disabled = true;

    try {
        // 1. Salva a auditoria (Fofoca para a gestão saber quem apagou)
        await db.collection("auditoria_arquivamentos").add({
            condominioId: condId,
            colecaoAfetada: colecao,
            documentoId: id,
            motivoPrincipal: motivo,
            detalhes: detalhes,
            quemApagou: document.getElementById('nomeFuncionarioLogado').innerText,
            dataHora: new Date().toISOString()
        });

        // 2. Executa a exclusão lógica no banco (coloca uma tag de excluido=true ou deleta)
        await executarArquivamentoNoBanco(colecao, id, motivo, detalhes);
        
        document.getElementById('modalJustificativaArquivamento').style.display = 'none';
        document.getElementById('detalhesArquivamento').value = ''; // Limpa pra próxima
        alert("✅ Registro arquivado com sucesso e notificado à gestão!");

    } catch (error) {
        console.error("Erro ao arquivar com justificativa:", error);
        alert("❌ Ocorreu um erro ao tentar arquivar o registro.");
    } finally {
        btn.innerHTML = textoBotaoOriginal;
        btn.disabled = false;
    }
}

// Função que efetivamente faz o "Delete" ou "Update excluido:true" lá no Firebase
async function executarArquivamentoNoBanco(colecao, id, motivo, detalhes) {
    try {
        // Nós usamos "Exclusão Lógica" (update excluido:true) para não perder histórico
        await db.collection(colecao).doc(id).update({
            excluido: true,
            arquivadoEm: new Date().toISOString(),
            motivoArquivamento: motivo
        });
    } catch (error) {
        // Se a coleção não aceitar update, a gente força o Delete
        await db.collection(colecao).doc(id).delete();
    }
}


// ==========================================
// 🏢 PARTE 1: GESTÃO DE CONDOMÍNIOS
// ==========================================

async function salvarNovoCondominioSaaS() {
    const nomeInput = document.getElementById('novo-cond-nome');
    const idInput = document.getElementById('novo-cond-id');
    const cnpjInput = document.getElementById('novo-cond-cnpj');
    const emailInput = document.getElementById('novo-cond-email');
    const telefoneInput = document.getElementById('novo-cond-telefone'); // 👈 Novo Campo WhatsApp
    const aptosInput = document.getElementById('novo-cond-aptos');
    const valorInput = document.getElementById('novo-cond-valor');
    const vencimentoInput = document.getElementById('novo-cond-vencimento');
    const periodoInput = document.getElementById('novo-cond-periodo');
    const logoInput = document.getElementById('novo-cond-logo');

    const nome = nomeInput.value.trim();
    const condominioId = idInput.value.trim().toLowerCase().replace(/\s+/g, '_');
    const cnpj = cnpjInput ? cnpjInput.value.trim() : '';
    const emailContato = emailInput ? emailInput.value.trim() : '';
    // Pegamos o telefone limpo de espaços para o banco
    const telefoneContato = telefoneInput ? telefoneInput.value.replace(/\D/g, '') : ''; 
    const aptos = parseInt(aptosInput.value) || 0;
    
    // Converte vírgula para ponto se o usuário digitar assim
    let valorTexto = valorInput.value || "0";
    if (typeof valorTexto === 'string') valorTexto = valorTexto.replace(',', '.');
    const valor = parseFloat(valorTexto) || 0;
    
    const periodo = parseInt(periodoInput.value) || 12;

    // 🚀 CORREÇÃO DO VENCIMENTO: Tira a palavra "Dia" e manda só o número pro Asaas
    let diaVencimento = 10;
    if (vencimentoInput && vencimentoInput.value) {
        const apenasNumeros = vencimentoInput.value.replace(/\D/g, ''); 
        if (apenasNumeros) diaVencimento = parseInt(apenasNumeros);
    }

    if (!nome || !condominioId || !cnpj || !emailContato) {
        alert("⚠️ Preencha o Nome, ID Único, CNPJ e E-mail do condomínio!");
        return;
    }

    const btn = document.querySelector('button[onclick="salvarNovoCondominioSaaS()"]');
    const textoOriginal = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Cadastrando e Preparando Asaas...';
    btn.disabled = true;

    // 🚀 TRAVA DA IMAGEM PESADA
    let logoBase64 = null;
    if (logoInput && logoInput.files.length > 0) {
        const file = logoInput.files[0];
        if (file.size > 800000) { // Limite de 800kb
            alert("⚠️ A imagem do logo é muito pesada (maior que 800KB). O banco de dados não aceita. Escolha uma imagem menor ou deixe sem logo.");
            btn.innerHTML = textoOriginal;
            btn.disabled = false;
            return;
        }
        logoBase64 = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(file);
        });
    }

    try {
        const docExistente = await db.collection("condominios").doc(condominioId).get();
        if (docExistente.exists) {
            alert("❌ Esse ID Único já está sendo usado. Escolha outro!");
            btn.innerHTML = textoOriginal;
            btn.disabled = false;
            return;
        }

        // 🚀 A MÁGICA FINAL ACONTECE AQUI: O BANCO RECEBE O CELULAR!
        await db.collection("condominios").doc(condominioId).set({
            nome: nome,
            condominioId: condominioId,
            cnpj: cnpj,                  
            email: emailContato, // Adequado para o CRM e o Asaas
            mobilePhone: telefoneContato, // 👈 ENVIANDO O ZAP PARA O ASAAS!
            vencimento: diaVencimento,  
            statusAsaas: "pendente",     
            aptos: aptos,
            valor: valor, 
            periodo: periodo, 
            logoSistema: logoBase64,
            criadoEm: new Date().toISOString(), 
            status: true // Ativo
        });

        alert("✅ Condomínio cadastrado com sucesso! A cobrança via WhatsApp será gerada automaticamente.");
        
        // Limpa os campos da tela
        nomeInput.value = ''; idInput.value = ''; if(cnpjInput) cnpjInput.value = '';
        if(emailInput) emailInput.value = ''; if(telefoneInput) telefoneInput.value = '';
        aptosInput.value = ''; valorInput.value = ''; if(logoInput) logoInput.value = '';
        document.getElementById('box-cad-condominio').style.display = 'none';

        // Atualiza a tabela de contratos do CRM na hora se ela estiver aberta!
        if (typeof carregarContratosCRM === 'function') carregarContratosCRM();

    } catch (error) {
        console.error("Erro ao cadastrar condomínio:", error);
        alert("❌ Erro ao salvar no banco de dados. " + error.message);
    } finally {
        btn.innerHTML = textoOriginal;
        btn.disabled = false;
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
            const dataA = a.criadoEm ? new Date(a.criadoEm).getTime() : 0;
            const dataB = b.criadoEm ? new Date(b.criadoEm).getTime() : 0;
            return dataB - dataA;
        });

        clientes.forEach((cond) => {
            const isAtivo = cond.status !== false && cond.status !== "false";
            const id = cond.condominioId;
            const nomeCond = cond.nome || 'Sem Nome';

            /// Cálculos para o Dashboard Master
            if (isAtivo) {
                qtdAtivos++;
                totalAptos += (cond.aptos || 0);
                totalReceita += (cond.valor || 0); // Ajustado para ler "valor"
            } else {
                qtdSuspensos++;
            }

            // Formatação Visual da Tabela
            const statusBadge = isAtivo 
                ? `<span style="background: #dcfce7; color: #16a34a; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: bold;"><i class="fa-solid fa-circle-check"></i> ATIVO</span>` 
                : `<span style="background: #fee2e2; color: #dc2626; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: bold;"><i class="fa-solid fa-ban"></i> SUSPENSO</span>`;

            // 🚀 AQUI A MÁGICA ACONTECE NA TELA: Muda a cor e esconde o valor
            const valorFormatado = formatarMoedaCensurada(cond.valor);
            const corValor = isGestorZeroLabs ? '#94a3b8' : '#0f172a';
            
            const aptosFormatado = cond.aptos ? `${cond.aptos} aptos` : 'N/D';

            // 🔥 BOTOES DE ACAO (Mantidos idênticos ao seu original)
            const botoesAcao = `
                <div style="display: flex; justify-content: flex-end; gap: 6px; align-items: center;">
                    <button onclick="entrarComoCondominio('${id}', '${nomeCond}')" style="background: #10b981; color: white; border: none; padding: 8px 10px; border-radius: 6px; cursor: pointer; font-size: 13px;" title="Acessar Sistema"><i class="fa-solid fa-right-to-bracket"></i></button>
                    <button onclick="abrirModalEditarSaaS('${id}', '${nomeCond}', ${cond.aptos || 0}, ${cond.valor || 0}, ${isAtivo}, ${cond.periodo || 12})" style="background: #e2e8f0; color: #475569; border: 1px solid #cbd5e1; padding: 8px 10px; border-radius: 6px; cursor: pointer; font-size: 13px;" title="Editar Plano"><i class="fa-solid fa-pen"></i></button>
                    <button onclick="gerarQrCodeConvite('${id}')" style="background: #8b5cf6; color: white; border: none; padding: 8px 10px; border-radius: 6px; cursor: pointer; font-size: 13px;" title="QR Code Convite"><i class="fa-solid fa-qrcode"></i></button>
                    
                    <div style="width: 1px; height: 20px; background: #cbd5e1; margin: 0 2px;"></div>

                    <button onclick="alternarStatusCondominio('${id}', ${isAtivo}, '${nomeCond}')" style="background: ${isAtivo ? '#10b981' : '#64748b'}; color: white; border: none; padding: 8px 10px; border-radius: 6px; cursor: pointer; font-size: 13px;" title="${isAtivo ? 'Desativar/Bloquear' : 'Ativar/Desbloquear'}">
                        <i class="fa-solid ${isAtivo ? 'fa-toggle-on' : 'fa-toggle-off'}"></i>
                    </button>
                    
                    <button onclick="excluirCondominioSaaS('${id}', '${nomeCond}')" style="background: #ef4444; color: white; border: none; padding: 8px 10px; border-radius: 6px; cursor: pointer; font-size: 13px;" title="Excluir Definitivamente">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                    
                    <div style="position: relative;" onmouseover="this.querySelector('.dropdown-acoes').style.display='block'" onmouseout="this.querySelector('.dropdown-acoes').style.display='none'">
                        <button style="background: #3b82f6; color: white; border: none; padding: 8px 12px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: bold; display: flex; align-items: center; gap: 5px;">
                            Ações <i class="fa-solid fa-caret-down"></i>
                        </button>
                        <div class="dropdown-acoes" style="display: none; position: absolute; right: 0; top: 100%; background: white; border: 1px solid #cbd5e1; box-shadow: 0 10px 25px rgba(0,0,0,0.1); border-radius: 8px; min-width: 170px; z-index: 100; overflow: hidden; padding: 5px 0;">
                            <a href="#" onclick="event.preventDefault(); abrirRenovacao('${id}', '${nomeCond}')" style="display: flex; align-items: center; gap: 8px; padding: 10px 15px; color: #1e293b; text-decoration: none; font-size: 13px; transition: 0.2s;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='transparent'">
                                <i class="fa-solid fa-file-contract" style="color: #8b5cf6;"></i> Renovar Contrato
                            </a>
                        </div>
                    </div>
                </div>
            `;

            listaHtml.innerHTML += `
                <tr style="border-bottom: 1px solid #f1f5f9; transition: background 0.2s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='transparent'">
                    <td style="padding: 15px 20px;">
                        <strong style="color: #0f172a; display: block; text-transform: capitalize;">${nomeCond}</strong>
                        <span style="color: #64748b; font-size: 12px; font-family: monospace;">ID: ${id || 'Sem ID'}</span>
                    </td>
                    <td style="padding: 15px 20px; color: #475569;">
                        <strong style="display: block; color: ${corValor};">${valorFormatado}</strong>
                        <span style="font-size: 12px;"><i class="fa-solid fa-door-closed" style="color: #94a3b8;"></i> ${aptosFormatado}</span>
                    </td>
                    <td style="padding: 15px 20px;">${statusBadge}</td>
                    <td style="padding: 15px 20px; text-align: right; overflow: visible;">
                        ${botoesAcao}
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

    if(elReceita) {
        // 🔒 Mascara o painel MRR com padrão bancário para gestor usando a função nova
        elReceita.innerText = formatarMoedaCensurada(receita);
    }
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

function abrirModalEditarSaaS(id, nome, aptos, valor, ativo, contratoMeses) {
    // 🔒 Puxa direto da memória raiz usando a chave correta
    const cargoSalvo = (localStorage.getItem('usuario_cargo') || '').toLowerCase();
    const ehTecnicoModal = cargoSalvo.includes('gestor') || cargoSalvo.includes('tecnico') || cargoSalvo.includes('técnico') || cargoSalvo.includes('gestão técnica');
    
    document.getElementById('edit-cond-id').value = id;
    document.getElementById('edit-cond-nome').value = nome;
    document.getElementById('edit-cond-aptos').value = aptos;
    
    // 🔒 Bloqueia edição de valor se for Gestor Técnico
    const inputValor = document.getElementById('edit-cond-valor');
    if (ehTecnicoModal) {
        inputValor.value = "";
        inputValor.disabled = true;
        inputValor.placeholder = "Bloqueado (Gestor Técnico)";
    } else {
        inputValor.value = valor;
        inputValor.disabled = false;
        inputValor.placeholder = "Valor (R$)";
    }

    document.getElementById('edit-cond-status').value = ativo ? "true" : "false";
    
    const selPeriodo = document.getElementById('edit-cond-periodo');
    if(selPeriodo) selPeriodo.value = contratoMeses || 12;
    
    document.getElementById('modalEditarCondominio').style.display = 'flex';
}

async function salvarEdicaoCondominioSaaS() {
    const id = document.getElementById('edit-cond-id').value;
    const nome = document.getElementById('edit-cond-nome').value.trim();
    const aptos = parseInt(document.getElementById('edit-cond-aptos').value) || 0;
    
    // O gestor não consegue mandar o valor, então não atualizamos o valor se ele estiver bloqueado
    const inputValor = document.getElementById('edit-cond-valor');
    let valor = 0;
    if (!inputValor.disabled) {
        // Converte vírgula para ponto se houver
        let vText = inputValor.value || "0";
        if (typeof vText === 'string') vText = vText.replace(',', '.');
        valor = parseFloat(vText) || 0;
    }

    const statusAtivo = document.getElementById('edit-cond-status').value === "true";
    
    const periodoInput = document.getElementById('edit-cond-periodo');
    const periodo = periodoInput ? (parseInt(periodoInput.value) || 12) : 12;
    
    const logoInput = document.getElementById('edit-cond-logo');

    if (!nome) {
        alert("⚠️ O nome do condomínio não pode ficar vazio!");
        return;
    }

    let dadosUpdate = {
        nome: nome,
        aptos: aptos,
        status: statusAtivo,
        periodo: periodo // Corrigido para 'periodo'
    };

    if (!inputValor.disabled) {
        dadosUpdate.valor = valor; // Corrigido para 'valor'
    }

    if (logoInput && logoInput.files.length > 0) {
        const file = logoInput.files[0];
        dadosUpdate.logoSistema = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(file);
        });
    }

    try {
        await db.collection("condominios").doc(id).update(dadosUpdate);
        alert("✅ Dados do condomínio atualizados com sucesso!");
        fecharModalEditarSaaS();
        
        // Atualiza a tabela de contratos para refletir as mudanças
        if (typeof carregarContratosCRM === 'function') {
            carregarContratosCRM();
        }
    } catch (error) {
        console.error("Erro ao atualizar condomínio:", error);
        alert("❌ Erro ao atualizar os dados no banco.");
    }
}

// ==========================================
// 👥 PARTE 2: FÁBRICA DE ACESSOS (SaaS)
// ==========================================

function carregarListaCondominios() {
    const selectCriar = document.getElementById('admFuncCondominio');
    const selectFiltro = document.getElementById('filtroCondominioGeral');
    const selectEdit = document.getElementById('editUserCondominio');

    db.collection("condominios").onSnapshot((snapshot) => {
        if(selectCriar) {
            selectCriar.innerHTML = '<option value="" disabled selected>Selecione o Condomínio...</option>';
            // 🚀 INJETANDO A OPÇÃO GLOBAL VIA CÓDIGO
            selectCriar.innerHTML += '<option value="GLOBAL">🌐 ACESSO GLOBAL (Mestre / Gestor)</option>';
        }
        
        if(selectFiltro) selectFiltro.innerHTML = '<option value="">🏢 Todos os Condomínios</option>';
        
        if(selectEdit) {
            selectEdit.innerHTML = '<option value="" disabled>Selecione...</option>';
            // 🚀 INJETANDO A OPÇÃO GLOBAL NO MODAL DE EDIÇÃO TAMBÉM
            selectEdit.innerHTML += '<option value="GLOBAL">🌐 ACESSO GLOBAL (Mestre / Gestor)</option>';
        }

        snapshot.forEach((doc) => {
            let c = doc.data();
            if(c.condominioId && c.nome) {
                const opt = `<option value="${c.condominioId}" style="text-transform: capitalize;">${c.nome}</option>`;
                if(selectCriar) selectCriar.innerHTML += opt;
                if(selectFiltro) selectFiltro.innerHTML += opt;
                if(selectEdit) selectEdit.innerHTML += opt;
            }
        });
    });
}
// ---------------------------------------------------------
// 🚀 MOTOR DE E-MAILS (BUSCA AS CHAVES NO FIREBASE)
// ---------------------------------------------------------
async function dispararEmail(destinatarioEmail, destinatarioNome, assunto, conteudoHTML) {
    
    const configDoc = await db.collection("configuracoes").doc("smtp").get();
    
    if (!configDoc.exists) {
        alert("❌ Erro de Sistema: Configure o SMTP na aba de Configurações do painel Master antes de enviar e-mails!");
        return false;
    }

    const config = configDoc.data(); 
    const CHAVE_API_BREVO = config.pass; 
    const REMETENTE_EMAIL = config.user; 

    const url = "https://api.brevo.com/v3/smtp/email";

    const dadosDoEmail = {
        sender: { name: "CONRUJA - Portaria Inteligente", email: REMETENTE_EMAIL },
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

    const btn = document.querySelector('button[onclick="criarUsuarioPeloADM()"]');
    const textoOriginal = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Criando e Enviando E-mail...';
    btn.disabled = true;

    try {
        const secondaryApp = firebase.initializeApp(firebaseConfig, "SecondaryApp");
        const userCredential = await secondaryApp.auth().createUserWithEmailAndPassword(email, senha);
        const uid = userCredential.user.uid;

        await db.collection("usuarios").doc(uid).set({
            nome: nome,
            email: email,
            cargo: cargo,
            condominioId: condominioId,
            criadoEm: new Date().toISOString()
        });

        await secondaryApp.auth().signOut();
        await secondaryApp.delete();

        const htmlDoEmail = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
                <div style="background-color: #0F172A; padding: 25px; text-align: center;">
                    <h2 style="color: #38bdf8; margin: 0; font-size: 24px; letter-spacing: 1px;">CONRUJA</h2>
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
                        <a href="https://app.conruja.com.br/" style="display: inline-block; background-color: #3b82f6; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">Acessar o Sistema</a>
                    </div>
                    
                    <hr style="border: none; border-top: 1px dashed #cbd5e1; margin: 30px 0;">
                    <p style="margin: 0; font-size: 12px; color: #94a3b8; text-align: center;">Por segurança, recomendamos que você altere sua senha no primeiro acesso através da aba "Meu Perfil".</p>
                </div>
            </div>`;

        const emailEnviado = await dispararEmail(email, nome, "Seus dados de acesso - CONRUJA", htmlDoEmail);

        if(emailEnviado) {
            alert(`✅ Sucesso! Login de ${nome} (${cargo}) criado e E-MAIL ENVIADO.`);
        } else {
            alert(`⚠️ O Login foi criado, mas houve falha ao enviar o e-mail via Brevo.`);
        }

        document.getElementById('admFuncNome').value = '';
        document.getElementById('admFuncEmail').value = '';
        document.getElementById('admFuncSenha').value = '';

    } catch (error) {
        console.error("Erro no processo:", error);
        alert("❌ Erro ao criar login: " + error.message);
        try { if(firebase.apps.length > 1) { await firebase.app("SecondaryApp").delete(); } } catch(e) {}
    } finally {
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

    const baseUrl = "https://app.conruja.com.br"; 
    const linkOficial = `${baseUrl}/cadastro-morador.html?cond=${condominioId}`;

    document.getElementById('input-link-convite').value = linkOficial;

    const urlQrCode = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(linkOficial)}&margin=10`;
    document.getElementById('img-qrcode-convite').src = urlQrCode;

    document.getElementById('modalQRCodeConvite').style.display = 'flex';
}

function copiarLinkConvite() {
    const inputLink = document.getElementById('input-link-convite');
    inputLink.select();
    inputLink.setSelectionRange(0, 99999); 

    navigator.clipboard.writeText(inputLink.value).then(() => {
        alert("✅ Link copiado com sucesso! Agora é só colar no WhatsApp do morador.");
    }).catch(err => {
        console.error('Erro ao copiar: ', err);
    });
}

// ==========================================
// 🛠️ FUNÇÕES DOS NOVOS BOTÕES (Toggle, Excluir, Renovar)
// ==========================================

async function alternarStatusCondominio(id, statusAtual, nome) {
    const acao = statusAtual ? "BLOQUEAR / SUSPENDER" : "ATIVAR / DESBLOQUEAR";
    if(!confirm(`Deseja ${acao} o condomínio "${nome}"?\n\nIsso altera o status de acesso deles.`)) return;
    
    try {
        // 🔥 GOLPE DUPLO: Altera tanto 'ativo' quanto 'status' para garantir que o login.html tranque a porta
        await db.collection("condominios").doc(id).update({ 
            ativo: !statusAtual,
            status: !statusAtual 
        });
        
        // Dá um pequeno alerta silencioso na tela só para confirmar que foi
        console.log(`Status alterado com sucesso para: ${!statusAtual}`);
    } catch(e) { 
        alert("Erro ao alterar status: " + e); 
    }
}

function abrirRenovacao(id, nome) {
    let modal = document.getElementById('modalRenovacaoDinamico');
    if(!modal) {
        document.body.insertAdjacentHTML('beforeend', `
        <div id="modalRenovacaoDinamico" class="modal-overlay" style="display: none; align-items: center; justify-content: center; z-index: 10000; background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(4px);">
            <div class="modal-content" style="max-width: 400px; width: 90%; background: #fff; border-top: 5px solid #3b82f6; border-radius: 12px; padding: 25px;">
                <h3 style="margin: 0 0 15px 0; color: #0f172a; font-size: 18px;"><i class="fa-solid fa-file-signature" style="color: #3b82f6;"></i> Renovar Contrato</h3>
                <p id="nomeCondRenovacao" style="color: #64748b; font-size: 14px; margin-bottom: 20px; font-weight: bold;"></p>
                <input type="hidden" id="idCondRenovacao">
                
                <label style="font-size: 12px; font-weight: bold; color: #475569; margin-bottom: 5px; display: block;">Período de Renovação</label>
                <select id="periodoRenovacao" style="width: 100%; margin-bottom: 20px; border: 1px solid #cbd5e1; padding: 12px; border-radius: 8px; outline: none; background: #f8fafc;">
                    <option value="1">1 Ano (12 meses)</option>
                    <option value="2">2 Anos (24 meses)</option>
                    <option value="3">3 Anos (36 meses)</option>
                </select>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    <button onclick="document.getElementById('modalRenovacaoDinamico').style.display='none'" style="background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; padding: 12px; border-radius: 8px; font-weight: bold; cursor: pointer;">Cancelar</button>
                    <button onclick="confirmarRenovacaoMestre()" style="background: #3b82f6; color: white; border: none; padding: 12px; border-radius: 8px; font-weight: bold; cursor: pointer;"><i class="fa-solid fa-check"></i> Confirmar</button>
                </div>
            </div>
        </div>`);
        modal = document.getElementById('modalRenovacaoDinamico');
    }
    
    document.getElementById('idCondRenovacao').value = id;
    document.getElementById('nomeCondRenovacao').innerText = "Cliente: " + nome;
    modal.style.display = 'flex';
}

async function confirmarRenovacaoMestre() {
    const id = document.getElementById('idCondRenovacao').value;
    const anos = parseInt(document.getElementById('periodoRenovacao').value);
    
    try {
        await db.collection("condominios").doc(id).update({
            contratoRenovadoEm: new Date().toISOString(),
            contratoAnosValidade: anos
        });
        alert(`✅ Sucesso! Contrato renovado por mais ${anos} ano(s)!`);
        document.getElementById('modalRenovacaoDinamico').style.display = 'none';
    } catch(e) { alert("Erro ao renovar: " + e); }
}


// ==========================================
// 🛡️ GUARDA-COSTAS (SISTEMA DE BLOQUEIO DE INADIMPLENTES)
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
    // Dá um tempinho para o sistema carregar o localStorage após o login
    setTimeout(() => {
        const meuCond = localStorage.getItem("condominioId");
        if (!meuCond || typeof db === 'undefined') return;

        const isFantasma = localStorage.getItem("condominio_fantasma") !== null;
        
        // Verifica se a aba Master está visível na tela (Se estiver, ele é o Dono do Sistema)
        const menuMaster = document.getElementById('secao-master-saas');
        const isMaster = menuMaster && menuMaster.style.display !== 'none';

        // Se for o Dono da plataforma e NÃO estiver no modo fantasma, ele NUNCA é bloqueado!
        if (isMaster && !isFantasma) return; 

        // Acorda o vigilante que fica olhando para a nuvem 24 horas
        db.collection("condominios").doc(meuCond).onSnapshot((doc) => {
            if (doc.exists) {
                const dados = doc.data();
                // Se a chavinha de ATIVO for para FALSE, levanta o escudo!
                if (dados.ativo === false) {
                    bloquearTelaCONRUJA(isFantasma);
                } else {
                    desbloquearTelaCONRUJA();
                }
            }
        });
    }, 2000); 
});

function bloquearTelaCONRUJA(isFantasma) {
    // 1. Esconde a interface inteira do sistema
    const sidebar = document.querySelector('.sidebar');
    const content = document.querySelector('.content');
    if (sidebar) sidebar.style.display = 'none';
    if (content) content.style.display = 'none';

    // 2. Cria a tela do Cadeado se ela não existir
    let tela = document.getElementById('tela-inadimplencia-CONRUJA');
    if (!tela) {
        tela = document.createElement('div');
        tela.id = 'tela-inadimplencia-CONRUJA';
        tela.style.cssText = 'position:fixed; top:0; left:0; width:100vw; height:100vh; background:linear-gradient(135deg, #0f172a 0%, #1e293b 100%); z-index:999999; display:flex; flex-direction:column; align-items:center; justify-content:center; color:white; text-align:center; padding: 20px;';
        document.body.appendChild(tela);
    }

    let btnHTML = `<button onclick="deslogarSistema()" style="background: #ef4444; color: white; border: none; padding: 15px 30px; font-size: 16px; border-radius: 8px; cursor: pointer; font-weight: bold; box-shadow: 0 4px 15px rgba(239, 68, 68, 0.4);"><i class="fa-solid fa-right-from-bracket"></i> Sair do Sistema</button>`;
    
    if (isFantasma) {
        btnHTML = `<button onclick="sairDoModoFantasma()" style="background: #3b82f6; color: white; border: none; padding: 15px 30px; font-size: 16px; border-radius: 8px; cursor: pointer; font-weight: bold; box-shadow: 0 4px 15px rgba(59, 130, 246, 0.4);"><i class="fa-solid fa-ghost"></i> Voltar para o Painel Master</button>`;
    }

    tela.innerHTML = `
        <i class="fa-solid fa-lock" style="font-size: 90px; color: #ef4444; margin-bottom: 25px; filter: drop-shadow(0 0 20px rgba(239,68,68,0.5));"></i>
        <h1 style="font-size: 36px; margin-bottom: 15px; color: #f8fafc; letter-spacing: 1px;">Acesso Suspenso</h1>
        <p style="font-size: 16px; color: #94a3b8; max-width: 500px; line-height: 1.6; margin-bottom: 35px;">
            O sistema de portaria e gestão deste condomínio encontra-se temporariamente indisponível.<br><br>
            Por favor, entre em contato com a administração da <strong>CONRUJA</strong> para verificar a situação do seu plano.
        </p>
        ${btnHTML}
    `;
    tela.style.display = 'flex';
}

function desbloquearTelaCONRUJA() {
    const tela = document.getElementById('tela-inadimplencia-CONRUJA');
    if (tela) tela.style.display = 'none';

    const sidebar = document.querySelector('.sidebar');
    const content = document.querySelector('.content');
    if (sidebar) sidebar.style.display = '';
    if (content) content.style.display = '';
}

// ==========================================
// 🚀 INICIALIZAÇÃO BLINDADA DO PAINEL MASTER
// ==========================================
const ligarMotorADM = setInterval(() => {
    const listaNaTela = document.getElementById('lista-condominios-saas');
    
    if (listaNaTela && typeof db !== 'undefined') {
        console.log("🚀 Motor ADM Ligado! Puxando dados em tempo real...");
        carregarCondominiosSaaS();
        carregarListaCondominios();
        
        if (typeof carregarUsuariosGeral === 'function') carregarUsuariosGeral(); 
        
        clearInterval(ligarMotorADM); 
    }
}, 500);

// ==========================================
// 👥 CONTROLE GERAL DE USUÁRIOS
// ==========================================

function carregarUsuariosGeral() {
    const listaHtml = document.getElementById('lista-usuarios-geral');
    if (!listaHtml) return;

    db.collection("usuarios").onSnapshot((snapshot) => {
        listaHtml.innerHTML = '';
        
        if(snapshot.empty) {
            listaHtml.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px; color: #94a3b8;">Nenhum usuário encontrado.</td></tr>';
            return;
        }

        snapshot.forEach((doc) => {
            const user = doc.data();
            const id = doc.id;
            
            const nome = user.nome || "Sem Nome";
            const email = user.email || "Sem E-mail";
            const cargo = user.cargo || "Sem Cargo";
            const condId = user.condominioId || "";
            
            let condominioVisu = condId ? condId.replace(/_/g, ' ') : "Acesso Global / Master";
            
            const badgeCargo = (cargo === 'Master' || cargo === 'ADM' || cargo === 'admin-master' || cargo.toLowerCase().includes('gestor'))
                ? `<span style="background: #1e293b; color: #fff; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: bold;"><i class="fa-solid fa-crown"></i> MESTRE/GESTOR</span>`
                : `<span style="background: #e0e7ff; color: #3b82f6; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: bold;">${cargo}</span>`;

            listaHtml.innerHTML += `
                <tr class="linha-usuario-geral" data-condominio="${condId}" style="border-bottom: 1px solid #f1f5f9; transition: background 0.2s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='transparent'">
                    <td style="padding: 15px 20px;">
                        <strong style="display: block; color: #0f172a;">${nome}</strong>
                        <span style="font-size: 12px; color: #64748b;">${email}</span>
                    </td>
                    <td style="padding: 15px 20px; color: #475569; text-transform: capitalize;">
                        <i class="fa-solid fa-building" style="color: #cbd5e1; margin-right: 5px;"></i> ${condominioVisu}
                    </td>
                    <td style="padding: 15px 20px;">${badgeCargo}</td>
                    <td style="padding: 15px 20px; text-align: right;">
                        <div style="display: flex; justify-content: flex-end; gap: 5px;">
                            <button onclick="abrirModalEditarUsuarioGeral('${id}', '${nome}', '${email}', '${cargo}', '${condId}')" style="background: #f1f5f9; color: #3b82f6; border: 1px solid #bfdbfe; padding: 8px 12px; border-radius: 6px; cursor: pointer; font-size: 13px;" title="Editar Perfil / Recuperar Senha">
                                <i class="fa-solid fa-pen"></i>
                            </button>
                            <button onclick="excluirUsuarioMestre('${id}', '${nome}')" style="background: #fef2f2; color: #ef4444; border: 1px solid #fecaca; padding: 8px 12px; border-radius: 6px; cursor: pointer; font-size: 13px;" title="Remover Acesso Permanente">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });
        
        filtrarUsuariosGeral();
    });
}

// 🔥 Filtro Inteligente (Busca de Texto + Dropdown do Condomínio)
function filtrarUsuariosGeral() {
    const termo = document.getElementById('pesquisaUserGeral').value.toLowerCase();
    const filtroCond = document.getElementById('filtroCondominioGeral').value;
    const linhas = document.querySelectorAll('.linha-usuario-geral');
    
    linhas.forEach(linha => {
        const texto = linha.innerText.toLowerCase();
        const condLinha = linha.getAttribute('data-condominio');
        
        const bateuTexto = texto.includes(termo);
        const bateuCond = (filtroCond === "") || (condLinha === filtroCond);

        if (bateuTexto && bateuCond) {
            linha.style.display = '';
        } else {
            linha.style.display = 'none';
        }
    });
}

async function excluirUsuarioMestre(uid, nome) {
    if(!confirm(`🚨 ALERTA 🚨\n\nTem certeza que deseja EXCLUIR DEFINITIVAMENTE o acesso de ${nome}?`)) return;
    try {
        await db.collection("usuarios").doc(uid).delete();
        alert("✅ Usuário removido com sucesso!");
    } catch(e) { alert("❌ Erro: " + e); }
}

// ==========================================
// ✏️ FUNÇÕES DO MODAL DE EDIÇÃO
// ==========================================
function abrirModalEditarUsuarioGeral(uid, nome, email, cargo, condId) {
    document.getElementById('editUserId').value = uid;
    document.getElementById('editUserNome').value = nome;
    document.getElementById('editUserEmail').value = email;
    
    const selectCargo = document.getElementById('editUserCargo');
    if(Array.from(selectCargo.options).some(opt => opt.value === cargo)) {
        selectCargo.value = cargo;
    }
    
    document.getElementById('editUserCondominio').value = condId || "";

    document.getElementById('modalEditarUsuarioGeral').style.display = 'flex';
}

function fecharModalEditarUsuarioGeral() {
    document.getElementById('modalEditarUsuarioGeral').style.display = 'none';
}

async function salvarEdicaoUsuarioGeral() {
    const uid = document.getElementById('editUserId').value;
    const nome = document.getElementById('editUserNome').value.trim();
    const cargo = document.getElementById('editUserCargo').value;
    const condId = document.getElementById('editUserCondominio').value;

    if (!nome) { alert("O nome não pode ficar vazio!"); return; }

    try {
        await db.collection("usuarios").doc(uid).update({
            nome: nome,
            cargo: cargo,
            condominioId: condId
        });
        alert("✅ Perfil atualizado com sucesso!");
        fecharModalEditarUsuarioGeral();
    } catch(e) { alert("Erro ao atualizar: " + e); }
}

// 📧 Envio automático do Firebase para Recuperação de Senha
function enviarRedefinicaoSenhaGeral() {
    const email = document.getElementById('editUserEmail').value;
    if(!email) return;
    
    if(confirm(`Deseja enviar um e-mail de redefinição de senha para ${email}?`)) {
        firebase.auth().sendPasswordResetEmail(email)
            .then(() => {
                alert(`✅ Sucesso! O link de redefinição foi enviado direto para a caixa de entrada de ${email}.`);
            })
            .catch((error) => {
                alert(`❌ Falha ao enviar o e-mail: ${error.message}`);
            });
    }
}// ==========================================
// EXCLUIR CONDOMÍNIO (SAAS)
// ==========================================
function excluirCondominioSaaS(id, nomeCondominio) {
    if (confirm(`🚨 ATENÇÃO EXTREMA: Tem certeza que deseja excluir o condomínio "${nomeCondominio}"?\n\nIsso removerá o cliente definitivamente do banco de dados.`)) {
        db.collection('condominios').doc(id).delete()
        .then(() => {
            alert("✅ Condomínio excluído com sucesso!");
        })
        .catch(error => {
            console.error("Erro ao excluir condomínio:", error);
            alert("❌ Erro ao excluir o condomínio. Verifique sua conexão e tente novamente.");
        });
    }
}
