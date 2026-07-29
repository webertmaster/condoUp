// ==========================================
// EVO UPI - CONDO UP
// financeiro.js - Motor Financeiro e Receita MRR (SaaS)
// ==========================================

let faturasGlobais = [];
let condominiosAtivosMRR = [];

window.addEventListener('DOMContentLoaded', () => {
    // Dá um pequeno delay para garantir que o Firebase já inicializou
    setTimeout(() => {
        if(typeof db !== 'undefined') {
            carregarFaturas();
            carregarCondominiosParaMRR();
            
            // Listener pro filtro de status das faturas
            const filtroStatus = document.getElementById('filtroStatusFatura');
            if(filtroStatus) filtroStatus.addEventListener('change', renderizarFaturas);
        }
    }, 1500);
});

// ==========================================
// 1. CARREGAR DADOS DOS PLANOS (MRR PREVISTO)
// ==========================================
function carregarCondominiosParaMRR() {
    db.collection("condominios").where("ativo", "==", true).onSnapshot(snap => {
        condominiosAtivosMRR = [];
        let mrrPrevisto = 0;
        
        snap.forEach(doc => {
            const c = doc.data();
            condominiosAtivosMRR.push(c);
            mrrPrevisto += (c.valorPlano || 0);
        });
        
        const elPrevisto = document.getElementById('mrr-total-previsto');
        if(elPrevisto) elPrevisto.innerText = mrrPrevisto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        
        calcularSaudeFinanceira(); 
    });
}

// ==========================================
// 2. CARREGAR E OUVIR FATURAS DO BANCO
// ==========================================
function carregarFaturas() {
    db.collection("faturas").onSnapshot(snap => {
        faturasGlobais = [];
        snap.forEach(doc => {
            let f = doc.data();
            f.id = doc.id;
            faturasGlobais.push(f);
        });
        
        // Ordena por vencimento (mais recente/futuro primeiro)
        faturasGlobais.sort((a, b) => new Date(b.vencimento) - new Date(a.vencimento));
        
        renderizarFaturas();
        calcularSaudeFinanceira();
    });
}

// ==========================================
// 3. RENDERIZAR NA TELA (COM INTELIGÊNCIA DE VENCIMENTO)
// ==========================================
function renderizarFaturas() {
    const lista = document.getElementById('lista-faturas-saas');
    const filtro = document.getElementById('filtroStatusFatura')?.value || 'todas';
    if(!lista) return;

    lista.innerHTML = '';
    const hoje = new Date().toISOString().split('T')[0];

    // Aplica o filtro selecionado
    let filtradas = faturasGlobais.filter(f => {
        let statusReal = f.status;
        
        // Inteligência: Se tá pendente e já passou de hoje, a fatura VENCEU
        if (statusReal === 'Pendente' && f.vencimento < hoje) {
            statusReal = 'Vencida';
        }

        if (filtro === 'todas') return true;
        if (filtro === 'vencida') return statusReal === 'Vencida';
        return statusReal.toLowerCase() === filtro.toLowerCase();
    });

    if (filtradas.length === 0) {
        lista.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 30px; color: #94a3b8;">Nenhuma fatura encontrada.</td></tr>';
        return;
    }

    filtradas.forEach(f => {
        let statusReal = f.status;
        if (statusReal === 'Pendente' && f.vencimento < hoje) statusReal = 'Vencida';

        let badge = '';
        let btnAcao = '';

        if (statusReal === 'Paga') {
            badge = `<span style="background: #dcfce7; color: #16a34a; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: bold;"><i class="fa-solid fa-check-double"></i> PAGA</span>`;
            btnAcao = `<button class="btn" style="background: #f1f5f9; color: #64748b; border: 1px solid #cbd5e1; margin: 0; padding: 6px 12px; font-size: 12px;" onclick="estornarFatura('${f.id}')" title="Desfazer e voltar para Pendente"><i class="fa-solid fa-rotate-left"></i></button>`;
        } else if (statusReal === 'Vencida') {
            badge = `<span style="background: #fee2e2; color: #dc2626; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: bold;"><i class="fa-solid fa-triangle-exclamation"></i> VENCIDA</span>`;
            btnAcao = `
                <button class="btn" style="background: #10b981; color: white; margin: 0; padding: 6px 12px; font-size: 12px;" onclick="darBaixaFatura('${f.id}')" title="Confirmar Recebimento"><i class="fa-solid fa-hand-holding-dollar"></i> Pagar</button>
                <button class="btn" style="background: #ef4444; color: white; margin: 0; padding: 6px 12px; font-size: 12px;" onclick="apagarFatura('${f.id}')" title="Excluir"><i class="fa-solid fa-trash"></i></button>
            `;
        } else {
            badge = `<span style="background: #fef3c7; color: #d97706; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: bold;"><i class="fa-regular fa-clock"></i> PENDENTE</span>`;
            btnAcao = `
                <button class="btn" style="background: #10b981; color: white; margin: 0; padding: 6px 12px; font-size: 12px;" onclick="darBaixaFatura('${f.id}')" title="Confirmar Recebimento"><i class="fa-solid fa-hand-holding-dollar"></i> Pagar</button>
                <button class="btn" style="background: #ef4444; color: white; margin: 0; padding: 6px 12px; font-size: 12px;" onclick="apagarFatura('${f.id}')" title="Excluir"><i class="fa-solid fa-trash"></i></button>
            `;
        }

        const dataFormatada = f.vencimento.split('-').reverse().join('/');
        const valorFormatado = (f.valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

        lista.innerHTML += `
            <tr style="border-bottom: 1px solid #f1f5f9; transition: background 0.2s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='transparent'">
                <td style="padding: 15px 20px;"><strong style="color: #0f172a; text-transform: capitalize;">${f.condominioNome}</strong></td>
                <td style="padding: 15px 20px; color: #475569;"><i class="fa-regular fa-calendar" style="color: #94a3b8; margin-right: 5px;"></i> ${dataFormatada}</td>
                <td style="padding: 15px 20px; color: #0f172a; font-weight: bold;">${valorFormatado}</td>
                <td style="padding: 15px 20px;">${badge}</td>
                <td style="padding: 15px 20px; text-align: right; display: flex; justify-content: flex-end; gap: 5px;">${btnAcao}</td>
            </tr>
        `;
    });
}

// ==========================================
// 4. CALCULAR SAÚDE FINANCEIRA (DASHBOARD)
// ==========================================
function calcularSaudeFinanceira() {
    const hoje = new Date();
    const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
    const dataHojeIso = hoje.toISOString().split('T')[0];

    let recebidoMes = 0;
    let totalVencido = 0;

    faturasGlobais.forEach(f => {
        // Recebido (Faturas Pagas que venciam ou foram pagas neste mês)
        if (f.status === 'Paga' && f.vencimento.startsWith(mesAtual)) {
            recebidoMes += (f.valor || 0);
        }

        // Inadimplência (Pendentes que já passaram do dia de hoje)
        if (f.status === 'Pendente' && f.vencimento < dataHojeIso) {
            totalVencido += (f.valor || 0);
        }
    });

    const elRecebido = document.getElementById('mrr-total-recebido');
    const elVencido = document.getElementById('mrr-total-vencido');

    if(elRecebido) elRecebido.innerText = recebidoMes.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    if(elVencido) elVencido.innerText = totalVencido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// ==========================================
// 5. AÇÕES DOS BOTÕES DAS FATURAS
// ==========================================
async function darBaixaFatura(id) {
    if(!confirm('💰 Confirmar o recebimento desta fatura? O condomínio ficará em dia!')) return;
    try {
        await db.collection("faturas").doc(id).update({
            status: 'Paga',
            dataPagamento: new Date().toISOString()
        });
    } catch(e) { alert("Erro ao baixar fatura: " + e); }
}

async function estornarFatura(id) {
    if(!confirm('🔄 Deseja desfazer o pagamento e voltar a fatura para Pendente?')) return;
    try {
        await db.collection("faturas").doc(id).update({
            status: 'Pendente',
            dataPagamento: null
        });
    } catch(e) { alert("Erro ao estornar fatura: " + e); }
}

async function apagarFatura(id) {
    if(!confirm('🗑️ Tem certeza que deseja apagar esta cobrança do sistema?')) return;
    try {
        await db.collection("faturas").doc(id).delete();
    } catch(e) { alert("Erro ao apagar fatura: " + e); }
}

// ==========================================
// 6. ROBÔ DE GERAÇÃO EM LOTE 🤖
// ==========================================
async function gerarFaturasDoMes() {
    if (condominiosAtivosMRR.length === 0) {
        alert('⚠️ Você ainda não tem nenhum condomínio ativo para faturar.');
        return;
    }

    // Pede para você confirmar o vencimento. Sugere o dia de hoje como padrão.
    const hoje = new Date().toISOString().split('T')[0];
    const vencimento = prompt('📅 Qual será a Data de Vencimento de todas as faturas?\n\nDigite no formato AAAA-MM-DD\n(Exemplo: 2026-08-10)', hoje);
    
    if(!vencimento) return;

    // Validação de formato (Obrigatório colocar os tracinhos)
    const regexData = /^\d{4}-\d{2}-\d{2}$/;
    if(!regexData.test(vencimento)) {
        alert('❌ Formato de data inválido. Use AAAA-MM-DD com os traços.');
        return;
    }

    if(!confirm(`🚀 Automação SaaS: Isso vai gerar ${condominiosAtivosMRR.length} faturas automaticamente com o valor do plano de cada cliente.\n\nVencimento definido para: ${vencimento.split('-').reverse().join('/')}.\n\nDeseja continuar?`)) return;

    const btn = document.querySelector('button[onclick="gerarFaturasDoMes()"]');
    const txtOriginal = btn ? btn.innerHTML : "Gerar Fatura";
    if(btn) { btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Gerando...'; btn.style.pointerEvents = 'none'; }

    try {
        // Usa o "Batch" do Firebase para inserir dezenas de faturas de uma vez só!
        const batch = db.batch();
        let qtdCriadas = 0;

        for (const c of condominiosAtivosMRR) {
            if (c.valorPlano && c.valorPlano > 0) {
                const novaRef = db.collection("faturas").doc();
                batch.set(novaRef, {
                    condominioId: c.condominioId,
                    condominioNome: c.nome,
                    valor: c.valorPlano,
                    vencimento: vencimento,
                    status: 'Pendente',
                    dataGeracao: new Date().toISOString()
                });
                qtdCriadas++;
            }
        }

        if(qtdCriadas > 0) {
            await batch.commit(); // Salva todas de vez
            alert(`✅ Sucesso! A máquina gerou ${qtdCriadas} faturas. Acompanhe a lista de cobranças.`);
        } else {
            alert(`⚠️ Nenhuma fatura gerada. Verifique se os seus clientes têm um 'Valor de Plano' preenchido no cadastro.`);
        }

    } catch(e) {
        console.error(e);
        alert("❌ Erro ao gerar faturas em lote: " + e.message);
    } finally {
        if(btn) { btn.innerHTML = txtOriginal; btn.style.pointerEvents = 'auto'; }
    }
}
