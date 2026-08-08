// ==========================================
// MÓDULO: PRESTADORES DE SERVIÇO
// ==========================================

// 1. Controle das Abas (No Prédio Agora vs Histórico)
function alternarAbaPrestadores(aba) {
    const btnAtivos = document.getElementById('btn-aba-ativos');
    const btnHistorico = document.getElementById('btn-aba-historico');
    const conteudoAtivos = document.getElementById('conteudo-ativos');
    const conteudoHistorico = document.getElementById('conteudo-historico');

    if (!btnAtivos || !btnHistorico || !conteudoAtivos || !conteudoHistorico) return;

    if (aba === 'ativos') {
        btnAtivos.style.background = '#6366f1';
        btnAtivos.style.color = 'white';
        btnAtivos.style.border = 'none';
        
        btnHistorico.style.background = '#f1f5f9';
        btnHistorico.style.color = '#475569';
        btnHistorico.style.border = '1px solid #cbd5e1';

        conteudoAtivos.style.display = 'block';
        conteudoHistorico.style.display = 'none';
        
        carregarPrestadoresAtivos();
    } else {
        btnHistorico.style.background = '#6366f1';
        btnHistorico.style.color = 'white';
        btnHistorico.style.border = 'none';
        
        btnAtivos.style.background = '#f1f5f9';
        btnAtivos.style.color = '#475569';
        btnAtivos.style.border = '1px solid #cbd5e1';

        conteudoHistorico.style.display = 'block';
        conteudoAtivos.style.display = 'none';

        buscarHistoricoPrestadores(); // Puxa o histórico ao clicar na aba
    }
}

// 2. Controle do Modal (Novo Acesso)
function abrirModalNovoPrestador() {
    const modal = document.getElementById('modalNovoPrestador');
    if (modal) {
        modal.style.display = 'flex';
        carregarAptosPrestadores();
    } else {
        console.error("ERRO: O modal com ID 'modalNovoPrestador' não foi encontrado no HTML.");
        alert("Erro técnico: Janela de cadastro não encontrada.");
    }
}

function fecharModalNovoPrestador() {
    const modal = document.getElementById('modalNovoPrestador');
    if (modal) {
        modal.style.display = 'none';
        document.getElementById('prestadorDoc').value = '';
        document.getElementById('prestadorDoc').style.borderColor = '#cbd5e1';
        document.getElementById('prestadorNome').value = '';
        document.getElementById('prestadorEmpresa').value = '';
        document.getElementById('prestadorApto').value = '';
    }
}

// ==========================================
// 3. FUNÇÕES DE BANCO DE DADOS (FIREBASE)
// ==========================================

async function carregarAptosPrestadores() {
    const condId = localStorage.getItem('condominioId');
    const selectApto = document.getElementById('prestadorApto');
    
    if (!condId || !selectApto) return;

    selectApto.innerHTML = '<option value="">⏳ Carregando...</option>';

    try {
        let listaAptos = [];
        const aptosUnicos = new Set();

        const snapApartamentos = await db.collection('apartamentos').where('condominioId', '==', condId).get();
        
        if (!snapApartamentos.empty) {
            snapApartamentos.forEach(doc => {
                const data = doc.data();
                const numero = data.numero || data.apto;
                const bloco = data.bloco || '';
                if (numero) {
                    const chave = `${bloco}-${numero}`;
                    if (!aptosUnicos.has(chave)) {
                        aptosUnicos.add(chave);
                        listaAptos.push({ numero: numero, bloco: bloco });
                    }
                }
            });
        } else {
            const snapMoradores = await db.collection('moradores').where('condominioId', '==', condId).get();
            snapMoradores.forEach(doc => {
                const data = doc.data();
                const numero = data.apto || data.numeroApto || data.numero; 
                const bloco = data.bloco || '';
                if (numero) {
                    const chave = `${bloco}-${numero}`;
                    if (!aptosUnicos.has(chave)) {
                        aptosUnicos.add(chave);
                        listaAptos.push({ numero: numero, bloco: bloco });
                    }
                }
            });
        }

        listaAptos.sort((a, b) => {
            const numA = String(a.numero);
            const numB = String(b.numero);
            return numA.localeCompare(numB, undefined, {numeric: true});
        });
        
        selectApto.innerHTML = '<option value="" disabled selected>🏢 Selecione o Apto...</option>';
        
        if (listaAptos.length === 0) {
            selectApto.innerHTML += '<option value="" disabled>Nenhum apto cadastrado no banco</option>';
            return;
        }

        listaAptos.forEach(apto => {
            const nomeBloco = apto.bloco ? ` (Bloco ${apto.bloco})` : '';
            selectApto.innerHTML += `<option value="${apto.numero}">Apto ${apto.numero}${nomeBloco}</option>`;
        });

    } catch (error) {
        console.error("Erro ao carregar aptos para prestadores:", error);
        selectApto.innerHTML = '<option value="">❌ Erro ao buscar dados</option>';
    }
}

// 🧠 Busca o Prestador pela Memória (Botão Lupa)
async function buscarPrestadorPorDoc() {
    const docInput = document.getElementById('prestadorDoc');
    if(!docInput) return;
    const doc = docInput.value.trim();
    if (!doc) return;
    
    const btnBusca = docInput.nextElementSibling;
    btnBusca.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    
    try {
        const snapshot = await db.collection('prestadores_memoria').doc(doc).get();
        if (snapshot.exists) {
            const dados = snapshot.data();
            document.getElementById('prestadorNome').value = dados.nome || '';
            document.getElementById('prestadorEmpresa').value = dados.empresa || '';
            docInput.style.borderColor = '#10b981'; // Fica verdinho para mostrar que achou
        } else {
            docInput.style.borderColor = '#cbd5e1'; // Volta ao normal se for um cara novo
        }
    } catch (error) {
        console.error("Erro ao buscar memória do prestador:", error);
    } finally {
        btnBusca.innerHTML = '<i class="fa-solid fa-magnifying-glass"></i>';
    }
}

async function salvarEntradaPrestador() {
    const docPrestador = document.getElementById('prestadorDoc').value.trim();
    const nome = document.getElementById('prestadorNome').value.trim();
    const empresa = document.getElementById('prestadorEmpresa').value.trim();
    const apto = document.getElementById('prestadorApto').value;
    const condId = localStorage.getItem('condominioId');
    const nomePorteiro = localStorage.getItem('nomeUsuario') || 'Portaria'; 

    if (!nome || !apto) {
        alert("⚠️ Por favor, preencha pelo menos o Nome do prestador e o Apartamento de destino.");
        return;
    }

    const btnSalvar = document.querySelector('#modalNovoPrestador .btn-salvar-entrada') || document.querySelector('#modalNovoPrestador button[onclick="salvarEntradaPrestador()"]');
    if(btnSalvar) {
        btnSalvar.disabled = true;
        btnSalvar.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Registrando...';
    }

    try {
        await db.collection('acessos_servico').add({
            condominioId: condId,
            documento: docPrestador,
            nome: nome,
            empresa: empresa,
            apto: apto,
            dataEntrada: firebase.firestore.FieldValue.serverTimestamp(),
            horaSaida: null, 
            status: 'ativo', 
            porteiroEntrada: nomePorteiro
        });

        if (docPrestador) {
            await db.collection('prestadores_memoria').doc(docPrestador).set({
                documento: docPrestador,
                nome: nome,
                empresa: empresa,
                ultimaVisita: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true }); 
        }

        alert("✅ Entrada liberada e registrada com sucesso!");
        fecharModalNovoPrestador();
        
        carregarPrestadoresAtivos(); 

    } catch (error) {
        console.error("Erro ao registrar entrada:", error);
        alert("❌ Erro ao salvar o registro. Tente novamente.");
    } finally {
        if(btnSalvar) {
            btnSalvar.disabled = false;
            btnSalvar.innerHTML = '<i class="fa-solid fa-check"></i> Liberar Entrada';
        }
    }
}

function carregarPrestadoresAtivos() {
    const condId = localStorage.getItem('condominioId');
    const tbody = document.getElementById('lista-prestadores-ativos');
    
    if (!condId || !tbody) return;

    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 30px; color: #94a3b8;"><i class="fa-solid fa-spinner fa-spin"></i> Puxando da portaria...</td></tr>';

    db.collection('acessos_servico')
        .where('condominioId', '==', condId)
        .where('status', '==', 'ativo')
        .onSnapshot(snapshot => {
            if (snapshot.empty) {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 30px; color: #94a3b8;">Nenhum prestador no prédio no momento.</td></tr>';
                return;
            }

            let acessos = [];
            snapshot.forEach(doc => {
                acessos.push({ id: doc.id, ...doc.data() });
            });

            acessos.sort((a, b) => {
                const tempoA = a.dataEntrada ? a.dataEntrada.toMillis() : 0;
                const tempoB = b.dataEntrada ? b.dataEntrada.toMillis() : 0;
                return tempoB - tempoA; 
            });

            let html = '';
            acessos.forEach(acesso => {
                let horaEntrada = "Agora";
                if (acesso.dataEntrada) {
                    const data = acesso.dataEntrada.toDate();
                    horaEntrada = data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                }

                // Campos Separados
                const nomeDisplay = `<strong>${acesso.nome}</strong>`;
                const empresaDisplay = acesso.empresa || '--';
                const docDisplay = acesso.documento || '--';

                html += `
                    <tr style="border-bottom: 1px solid #e2e8f0; transition: background 0.2s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='transparent'">
                        <td style="padding: 15px 20px;">${nomeDisplay}</td>
                        <td style="padding: 15px 20px; color: #475569;">${docDisplay}</td>
                        <td style="padding: 15px 20px;">
                            <span style="background: #e0f2fe; color: #0284c7; padding: 4px 10px; border-radius: 6px; font-weight: bold; font-size: 13px;">
                                Apto ${acesso.apto}
                            </span>
                        </td>
                        <td style="padding: 15px 20px; font-weight: bold; color: #10b981;">
                            <i class="fa-regular fa-clock" style="margin-right: 5px;"></i> ${horaEntrada}
                        </td>
                        <td style="padding: 15px 20px; color: #475569; font-weight: 500;">${empresaDisplay}</td>
                        <td style="padding: 15px 20px; text-align: right;">
                            <button onclick="registrarSaidaPrestador('${acesso.id}')" style="background: #ef4444; color: white; border: none; padding: 8px 15px; border-radius: 6px; font-weight: bold; cursor: pointer; transition: 0.2s; font-size: 13px;">
                                <i class="fa-solid fa-person-walking-arrow-right"></i> Registrar Saída
                            </button>
                        </td>
                    </tr>
                `;
            });

            tbody.innerHTML = html;
        }, error => {
            console.error("Erro ao puxar acessos ativos:", error);
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 30px; color: #ef4444;">Erro ao buscar dados de acesso.</td></tr>';
        });
}

// 🗄️ Histórico Completo
async function buscarHistoricoPrestadores() {
    const condId = localStorage.getItem('condominioId');
    const tbody = document.getElementById('lista-prestadores-historico');
    let dataFiltro = document.getElementById('filtro-data-historico').value;
    
    if (!condId || !tbody) return;

    // Se a caixinha de data estiver vazia, ele força a data de HOJE automaticamente
    if (!dataFiltro) {
        const hoje = new Date();
        // Corrige o fuso horário para o Brasil antes de extrair a data
        const tzOffset = hoje.getTimezoneOffset() * 60000;
        const localISOTime = (new Date(hoje - tzOffset)).toISOString().split('T')[0];
        dataFiltro = localISOTime;
        document.getElementById('filtro-data-historico').value = dataFiltro;
    }

    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 30px; color: #94a3b8;"><i class="fa-solid fa-spinner fa-spin"></i> Buscando histórico no sistema...</td></tr>';

    try {
        // Puxa todos finalizados do condomínio (Filtro JS para evitar erro de índice no Firebase)
        const snapshot = await db.collection('acessos_servico')
            .where('condominioId', '==', condId)
            .where('status', '==', 'finalizado')
            .get();

        let historico = [];
        snapshot.forEach(doc => {
            const dados = doc.data();
            if (dados.dataEntrada) {
                const dataDoc = dados.dataEntrada.toDate();
                // Ajusta a formatação para bater com o padrão yyyy-mm-dd
                const dataFormatada = dataDoc.toLocaleDateString('en-CA'); 
                
                if (dataFormatada === dataFiltro) {
                    historico.push(dados);
                }
            }
        });

        historico.sort((a, b) => {
            const tempoA = a.horaSaida ? a.horaSaida.toMillis() : 0;
            const tempoB = b.horaSaida ? b.horaSaida.toMillis() : 0;
            return tempoB - tempoA; // Os que saíram por último ficam no topo
        });

        if (historico.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 30px; color: #94a3b8;">Nenhum histórico encontrado para o dia <strong>${dataFiltro.split('-').reverse().join('/')}</strong>.</td></tr>`;
            return;
        }

        let html = '';
        historico.forEach(acesso => {
            let dataAcesso = "--/--/----";
            let horaEntrada = "--:--";
            let horaSaida = "--:--";

            if (acesso.dataEntrada) {
                const d = acesso.dataEntrada.toDate();
                dataAcesso = d.toLocaleDateString('pt-BR');
                horaEntrada = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            }
            if (acesso.horaSaida) {
                const s = acesso.horaSaida.toDate();
                horaSaida = s.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            }

            html += `
                <tr style="border-bottom: 1px solid #e2e8f0; transition: background 0.2s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='transparent'">
                    <td style="padding: 15px 20px; font-weight: bold; color: #64748b;">${dataAcesso}</td>
                    <td style="padding: 15px 20px;"><strong>${acesso.nome}</strong></td>
                    <td style="padding: 15px 20px; color: #475569;">${acesso.empresa || '--'}</td>
                    <td style="padding: 15px 20px;">
                        <span style="background: #e0f2fe; color: #0284c7; padding: 4px 10px; border-radius: 6px; font-weight: bold; font-size: 13px;">
                            Apto ${acesso.apto}
                        </span>
                    </td>
                    <td style="padding: 15px 20px; color: #10b981; font-weight: bold;"><i class="fa-solid fa-arrow-right-to-bracket"></i> ${horaEntrada}</td>
                    <td style="padding: 15px 20px; color: #ef4444; font-weight: bold;"><i class="fa-solid fa-arrow-right-from-bracket"></i> ${horaSaida}</td>
                </tr>
            `;
        });

        tbody.innerHTML = html;

    } catch (error) {
        console.error("Erro ao buscar histórico:", error);
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 30px; color: #ef4444;">Erro ao carregar histórico da nuvem.</td></tr>';
    }
}

function registrarSaidaPrestador(id) {
    if(confirm("Confirmar a saída deste prestador do condomínio?")) {
        db.collection('acessos_servico').doc(id).update({
            horaSaida: firebase.firestore.FieldValue.serverTimestamp(),
            status: 'finalizado' // Tira ele da tela principal e manda pro histórico
        }).then(() => {
            console.log("Saída registrada com sucesso.");
        }).catch(err => {
            console.error("Erro ao registrar saída:", err);
            alert("Erro ao registrar saída. Verifique a internet e tente novamente.");
        });
    }
}