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
        sincronizarChavesPonto();
        aplicarRegrasDeCargo();
        
        // GATILHO DO CRACHÁ: Chama a função para desenhar o badge na tela
        renderizarBadgeSeguro();
        
        // Seta o nome do funcionário logado no topo da tela do Dashboard
        const nome = localStorage.getItem("usuario_nome") || localStorage.getItem("usuario_logado_nome");
        const elementoNome = document.getElementById('nomeFuncionarioLogado');
        if (elementoNome && nome) elementoNome.innerText = nome;

        // VERIFICAÇÃO DO MODO FANTASMA ATIVO
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
// PONTE DE SEGURANÇA DO RELÓGIO DE PONTO
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
    const cargo = localStorage.getItem("usuario_cargo") || "";
    const exigePonto = localStorage.getItem("usuario_batePonto") === 'true'; // Lê se o síndico marcou a caixinha
    
    // Captura os menus e botões sensíveis
    const menuEquipe = document.getElementById('menu-equipe') || document.querySelector('[onclick*="equipe"]'); 
    const menuRelatorios = document.getElementById('menu-relatorios') || document.querySelector('[onclick*="relatorios"]'); 
    const menuPonto = document.getElementById('menu-ponto');
    const blocoMasterSaaS = document.getElementById('secao-master-saas');

    // 👑 1. REGRAS PARA O MÓDULO ADM INTERNO MASTER (Você/Dono)
    if (cargo === 'ADM' || cargo === 'admin-master') {
        console.log("👑 Acesso MASTER detectado.");
        window.isPorteiroLogado = false; // Variável global para outros arquivos lerem
        
        if (menuEquipe) menuEquipe.style.display = 'block';
        if (menuRelatorios) menuRelatorios.style.display = 'block';
        if (blocoMasterSaaS) blocoMasterSaaS.style.display = 'block';
        if (menuPonto) menuPonto.style.display = 'none'; // Master não bate ponto
        
        // Garante que o form de comunicados aparece
        document.getElementById('btnSalvarComunicado') && (document.getElementById('btnSalvarComunicado').style.display = 'block');
        return;
    }

    // Se NÃO FOR ADM Master, GARANTE que as gavetas do SaaS continuam trancadas
    if (blocoMasterSaaS) blocoMasterSaaS.style.display = 'none';

    // 🔒 2. REGRAS PARA MÓDULO OPERACIONAL (Porteiro, Zelador)
    const isOperacional = cargo.toLowerCase().includes('porteiro') || 
                          cargo.toLowerCase().includes('funcionário') ||
                          cargo.toLowerCase().includes('zelador') ||
                          cargo === 'operacional';

    if (isOperacional) {
        window.isPorteiroLogado = true; // Avisa o resto do sistema que é Porteiro
        
        if (menuEquipe) menuEquipe.style.display = 'none';
        if (menuRelatorios) menuRelatorios.style.display = 'none';
        
        // 🚀 DESTRÓI O FORMULÁRIO DE COMUNICADOS PARA O PORTEIRO
        const camposComunicado = [
            'tipoComunicado', 'statusComunicado', 'tituloComunicado', 
            'dataComunicado', 'horaComunicado', 'localComunicado', 
            'mensagemComunicado', 'btnSalvarComunicado'
        ];
        
        camposComunicado.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.style.display = 'none';
                // Se o campo estiver dentro de uma div organizadora (flex), esconde a div também
                if (el.parentElement && el.parentElement.tagName === 'DIV' && el.parentElement.className !== 'box') {
                    el.parentElement.style.display = 'none';
                }
            }
        });
        
        // Exibe a aba de Ponto APENAS se estiver liberado no cadastro dele
        if (menuPonto) {
            menuPonto.style.display = exigePonto ? 'flex' : 'none';
        }
        
        console.log("🔒 Modo Operacional ativado. Formulários bloqueados.");
    } 
    // 🔓 3. REGRAS PARA MÓDULO DE SÍNDICO E GERENTES
    else if (cargo.toLowerCase().includes('síndico') || cargo.toLowerCase().includes('sindico') || cargo.toLowerCase().includes('gerente') || cargo.toLowerCase().includes('administrador')) {
        window.isPorteiroLogado = false; 
        
        if (menuEquipe) menuEquipe.style.display = 'block';
        if (menuRelatorios) menuRelatorios.style.display = 'block';
        if (menuPonto) menuPonto.style.display = 'none'; // Síndico não bate ponto
        
        document.getElementById('btnSalvarComunicado') && (document.getElementById('btnSalvarComunicado').style.display = 'block');
        console.log("🔓 Modo Gestão Ativado.");
    }
}

// ==========================================
// BOTÃO DE SAIR (LOGOUT)
// ==========================================
function deslogarSistema() {
    if(confirm("Deseja realmente sair do sistema?")) {
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = 'login.html';
    }
}

// ==========================================
// RENDERIZA O CRACHÁ VIRTUAL (BADGE DE ACESSO)
// ==========================================
function renderizarBadgeSeguro() {
    const cargo = localStorage.getItem("usuario_cargo") || "Porteiro";
    const badge = document.getElementById('badge-acesso-virtual');
    
    if (!badge) return;

    badge.style.display = 'inline-flex';

    if (cargo === 'ADM' || cargo === 'admin-master') {
        badge.innerHTML = '<i class="fa-solid fa-crown"></i> ADM MASTER';
        badge.style.background = 'rgba(56, 189, 248, 0.15)';
        badge.style.color = '#38bdf8';
        badge.style.border = '1px solid rgba(56, 189, 248, 0.3)';
    } 
    else if (cargo.toLowerCase().includes('síndico') || cargo.toLowerCase().includes('sindico') || cargo.toLowerCase().includes('gerente') || cargo.toLowerCase().includes('administrador')) {
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
// ENCERRAMENTO DO MODO FANTASMA
// ==========================================
function sairDoModoFantasma() {
    if(confirm("Deseja encerrar a sessão remota e voltar para o seu Painel Master?")) {
        localStorage.removeItem("condominio_fantasma");
        localStorage.removeItem("condominio_fantasma_nome");
        window.location.href = 'index.html';
    }
}
