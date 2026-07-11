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
        
        // 🚀 GATILHO DO CRACHÁ: Chama a função para desenhar o badge na tela
        renderizarBadgeSeguro();
        
        // Seta o nome do funcionário logado no topo da tela do Dashboard
        const nome = localStorage.getItem("usuario_nome") || localStorage.getItem("usuario_logado_nome");
        const elementoNome = document.getElementById('nomeFuncionarioLogado');
        if (elementoNome && nome) elementoNome.innerText = nome;

        // 👁️ VERIFICAÇÃO DO MODO FANTASMA ATIVO
        const fantasma = localStorage.getItem("condominio_fantasma");
        if (fantasma) {
            const aviso = document.getElementById('aviso-modo-fantasma');
            if (aviso) {
                aviso.style.display = 'block';
                const elNomeFantasma = document.getElementById('fantasma-nome');
                if (elNomeFantasma) elNomeFantasma.innerText = localStorage.getItem("condominio_fantasma_nome");
            }
        }
    }
});

// ==========================================
// 🚀 PONTE DE SEGURANÇA DO RELÓGIO DE PONTO
// ==========================================
function sincronizarChavesPonto() {
    const nome = localStorage.getItem("usuario_nome");
    const cargo = localStorage.getItem("usuario_cargo");
    
    if (nome) localStorage.setItem("usuario_logado_nome", nome);
    if (cargo) localStorage.setItem("usuario_cargo", cargo);
}

// ==========================================
// MÁGICA DA HIERARQUIA E SEGURANÇA VISUAL
// ==========================================
function aplicarRegrasDeCargo() {
    const cargo = localStorage.getItem("usuario_cargo");
    
    // Captura os menus sensíveis normais
    const menuEquipe = document.getElementById('menu-equipe') || document.querySelector('[onclick*="equipe"]'); 
    const menuRelatorios = document.getElementById('menu-relatorios') || document.querySelector('[onclick*="relatorios"]'); 
    
    // Captura o Bloco inteiro das GAVETAS DO MASTER (Escondido por padrão no CSS)
    const blocoMasterSaaS = document.getElementById('secao-master-saas');

    // 👑 1. REGRAS PARA O MÓDULO ADM INTERNO MASTER (Você/Dono)
    if (cargo === 'ADM' || cargo === 'admin-master') {
        console.log("👑 Acesso MASTER detectado: Destrancando Gavetas Administrativas.");
        
        // Libera tudo
        if (menuEquipe) menuEquipe.style.display = 'block';
        if (menuRelatorios) menuRelatorios.style.display = 'block';
        
        // 🔓 DESTRANCA AS GAVETAS DO MASTER
        if (blocoMasterSaaS) blocoMasterSaaS.style.display = 'block';
        
        return;
    }

    // Se NÃO FOR ADM Master, GARANTE que as gavetas continuam trancadas e invisíveis!
    if (blocoMasterSaaS) {
        blocoMasterSaaS.style.display = 'none';
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

// ==========================================
// RENDERIZA O CRACHÁ VIRTUAL (BADGE DE ACESSO)
// ==========================================
function renderizarBadgeSeguro() {
    const cargo = localStorage.getItem("usuario_cargo") || "Porteiro";
    const badge = document.getElementById('badge-acesso-virtual');
    
    // Se não achou o espaço do crachá na tela, não faz nada
    if (!badge) return;

    // Faz o crachá aparecer
    badge.style.display = 'inline-flex';

    // Pinta a cor e o ícone de acordo com o nível
    if (cargo === 'ADM' || cargo === 'admin-master') {
        badge.innerHTML = '<i class="fa-solid fa-crown"></i> ADM MASTER';
        badge.style.background = 'rgba(56, 189, 248, 0.15)';
        badge.style.color = '#38bdf8';
        badge.style.border = '1px solid rgba(56, 189, 248, 0.3)';
    } 
    else if (cargo === 'Síndico' || cargo === 'sindico' || cargo === 'Gerente' || cargo === 'Administrador(a)') {
        badge.innerHTML = '<i class="fa-solid fa-user-shield"></i> GESTÃO';
        badge.style.background = 'rgba(16, 185, 129, 0.15)';
        badge.style.color = '#10b981';
        badge.style.border = '1px solid rgba(16, 185, 129, 0.3)';
    } 
    else {
        badge.innerHTML = '<i class="fa-solid fa-id-badge"></i> PORTARIA';
        badge.style.background = 'rgba(148, 163, 184, 0.15)';
        badge.style.color = '#94a3b8';
        badge.style.border = '1px solid rgba(148, 163, 184, 0.3)';
    }
}

// ==========================================
// 👁️ ENCERRAMENTO DO MODO FANTASMA
// ==========================================
function sairDoModoFantasma() {
    if(confirm("Deseja encerrar a sessão remota e voltar para o seu Painel Master?")) {
        localStorage.removeItem("condominio_fantasma");
        localStorage.removeItem("condominio_fantasma_nome");
        window.location.href = 'index.html';
    }
}
