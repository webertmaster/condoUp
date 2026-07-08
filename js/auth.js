// ==========================================
// CONDO UP - O SEGURANÇA DA PORTA
// auth.js - Controle de Acesso e Hierarquia
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    // 1. VERIFICA O CRACHÁ DE ACESSO
    const isLogado = localStorage.getItem("condoup_logado");
    const paginaAtual = window.location.pathname;

    // Se NÃO tem crachá e NÃO está na tela de login, chuta para fora!
    if (!isLogado && !paginaAtual.includes('login.html')) {
        window.location.href = 'login.html';
        return; // Trava a execução do resto da página na hora
    }

    // Se JÁ TEM crachá e tenta abrir a tela de login, joga direto pro painel
    if (isLogado && paginaAtual.includes('login.html')) {
        window.location.href = 'index.html';
        return;
    }

    // 2. SE ESTIVER DENTRO DO SISTEMA, APLICA AS REGRAS DE HIERARQUIA
    if (isLogado && !paginaAtual.includes('login.html')) {
        // Garantir que as variáveis de sincronia do ponto leiam as chaves corretas
        sincronizarChavesPonto();
        aplicarRegrasDeCargo();
        
        // Seta o nome do funcionário logado no topo da tela do Dashboard
        const nome = localStorage.getItem("usuario_nome") || localStorage.getItem("usuario_logado_nome");
        const elementoNome = document.getElementById('nomeFuncionarioLogado');
        if (elementoNome && nome) elementoNome.innerText = nome;
    }
});

// ==========================================
// 🚀 PONTE DE SEGURANÇA DO RELÓGIO DE PONTO
// ==========================================
function sincronizarChavesPonto() {
    // Pega as chaves antigas e espelha para as chaves novas do ponto.js
    const nome = localStorage.getItem("usuario_nome");
    const cargo = localStorage.getItem("usuario_cargo");
    
    if (nome) localStorage.setItem("usuario_logado_nome", nome);
    if (cargo) localStorage.setItem("usuario_cargo", cargo);
}

// ==========================================
// MÁGICA DA HIERARQUIA (SÍNDICO VS PORTEIRO VS ADM)
// ==========================================
function aplicarRegrasDeCargo() {
    const cargo = localStorage.getItem("usuario_cargo");
    
    // Captura os menus sensíveis
    const menuEquipe = document.getElementById('menu-equipe') || document.querySelector('[onclick*="equipe"]'); 
    const menuRelatorios = document.getElementById('menu-relatorios') || document.querySelector('[onclick*="relatorios"]'); 
    const menuPonto = document.getElementById('menu-ponto') || document.querySelector('[onclick*="ponto"]');

    // 🚨 1. REGRAS PARA O MÓDULO ADM INTERNO MASTER (Você)
    if (cargo === 'ADM' || cargo === 'admin-master') {
        console.log("👑 Acesso MASTER detectado: Carregando módulos administrativos exclusivos.");
        
        // Garante que todas as abas padrões estão visíveis
        if (menuEquipe) menuEquipe.style.display = 'block';
        if (menuRelatorios) menuRelatorios.style.display = 'block';
        
        // Renderiza dinamicamente as novas abas de gerenciamento global SaaS no menu se elas não existirem
        injetarAbasExclusivasADM();
        return;
    }

    // 🔒 2. REGRAS PARA MÓDULO OPERACIONAL (Porteiro)
    if (cargo === 'operacional' || cargo === 'Porteiro' || cargo === 'Porteiro Diurno' || cargo === 'Porteiro Noturno') {
        if (menuEquipe) menuEquipe.style.display = 'none';
        if (menuRelatorios) menuRelatorios.style.display = 'none';
        
        console.log("🔒 Modo Operacional ativado: Menus administrativos ocultados.");
    } 
    // 🔓 3. REGRAS PARA MÓDULO DE SÍNDICO E GERENTES
    else if (cargo === 'Síndico' || cargo === 'sindico' || cargo === 'Gerente' || cargo === 'Administrador(a)') {
        if (menuEquipe) menuEquipe.style.display = 'block';
        if (menuRelatorios) menuRelatorios.style.display = 'block';
        
        console.log("🔓 Modo Gestão Ativado: Visão de relatórios e equipe liberados.");
    }
}

// ==========================================
// 🛠️ INJEÇÃO DINÂMICA DO MENU MASTER SAA-S
// ==========================================
function injetarAbasExclusivasADM() {
    const menuLateral = document.querySelector('.sidebar .menu');
    if (!menuLateral) return;

    // Verifica se a aba secreta já foi injetada para não duplicar
    if (document.getElementById('menu-master-saaS')) return;

    // Cria a estrutura da gaveta administrativa
    const containerADM = document.createElement('div');
    containerADM.id = 'menu-master-saaS';
    containerADM.innerHTML = `
        <div style="font-size: 11px; font-weight: 800; color: #38bdf8; text-transform: uppercase; letter-spacing: 1.5px; padding: 18px 15px 6px 15px; border-top: 1px dashed rgba(56, 189, 248, 0.2); margin-top: 10px;">
            <i class="fa-solid fa-screwdriver-wrench"></i> Painel Master ADM
        </div>
        <button onclick="trocarTela('adm-condominios')" id="menu-adm-condominios" style="color: #38bdf8;"><i class="fa-solid fa-building"></i> Cadastrar Condomínio</button>
        <button onclick="trocarTela('adm-funcionarios')" id="menu-adm-funcionarios" style="color: #38bdf8;"><i class="fa-solid fa-user-tie"></i> Controle de Acessos</button>
    `;

    // Insere o bloco administrativo logo antes do botão Sair do sistema
    const botaoSair = document.getElementById('menu-sair');
    if (botaoSair) {
        menuLateral.insertBefore(containerADM, botaoSair.previousSibling);
    } else {
        menuLateral.appendChild(containerADM);
    }
}

// ==========================================
// BOTÃO DE SAIR (LOGOUT)
// ==========================================
function deslogarSistema() {
    if(confirm("Deseja realmente sair do sistema?")) {
        // Rasga o crachá e limpa a memória por completo
        localStorage.clear();
        sessionStorage.clear();

        // Chuta de volta pro Login
        window.location.href = 'login.html';
    }
}
