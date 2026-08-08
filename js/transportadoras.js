// ==========================================
// ZERO LABS - CONRUJA
// transportadoras.js - Motor de Busca Inteligente de Logotipos
// ==========================================

const dominiosConhecidos = {
    'correios': 'correios.com.br',
    'jadlog': 'jadlog.com.br',
    'loggi': 'loggi.com',
    'fedex': 'fedex.com',
    'amazon': 'amazon.com.br',
    'mercado livre': 'mercadolivre.com.br',
    'shopee': 'shopee.com.br',
    'aliexpress': 'aliexpress.com',
    'shein': 'shein.com',
    'temu': 'temu.com',
    'magazine luiza': 'magazineluiza.com.br',
    'magalu': 'magazineluiza.com.br',
    'americanas': 'americanas.com.br',
    'casas bahia': 'casasbahia.com.br'
};

function obterFavicon(nomeEmpresa) {
    const nomeLower = nomeEmpresa.toLowerCase().trim();
    let dominio = dominiosConhecidos[nomeLower];
    
    if (!dominio) {
        const nomeLimpo = nomeLower
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]/g, '');
        dominio = `${nomeLimpo}.com.br`;
    }
    return `https://www.google.com/s2/favicons?domain=${dominio}&sz=64`;
}

function toggleDropdown() {
    const dropdown = document.getElementById('transportadoraDropdown');
    const arrow = document.querySelector('.dropdown-arrow');
    if(dropdown && arrow) {
        dropdown.classList.toggle('show');
        arrow.classList.toggle('open');
    }
}

function mostrarDropdown() {
    const dropdown = document.getElementById('transportadoraDropdown');
    const arrow = document.querySelector('.dropdown-arrow');
    if(dropdown && arrow) {
        dropdown.classList.add('show');
        arrow.classList.add('open');
        filtrarTransportadoras();
    }
}

function filtrarTransportadoras() {
    const searchEl = document.getElementById('transportadoraSearch');
    if (!searchEl) return;
    
    const searchTerm = searchEl.value.toLowerCase();
    const categorias = document.querySelectorAll('.dropdown-category');
    const items = document.querySelectorAll('.dropdown-item:not(.personalizada)');
    
    items.forEach(item => {
        const texto = item.textContent.toLowerCase();
        if (texto.includes(searchTerm) || searchTerm === '') {
            item.classList.remove('hidden');
        } else {
            item.classList.add('hidden');
        }
    });
    
    categorias.forEach(categoria => {
        let proximoItem = categoria.nextElementSibling;
        let temItemVisivel = false;
        
        while (proximoItem && !proximoItem.classList.contains('dropdown-category') && !proximoItem.classList.contains('personalizada')) {
            if (!proximoItem.classList.contains('hidden')) {
                temItemVisivel = true;
                break;
            }
            proximoItem = proximoItem.nextElementSibling;
        }
        
        if (!temItemVisivel) {
            categoria.classList.add('hidden');
        } else {
            categoria.classList.remove('hidden');
        }
    });
}

function selecionarTransportadora(nome) {
    const searchInput = document.getElementById('transportadoraSearch');
    const logoImg = document.getElementById('selectedLogo');
    const hiddenInput = document.getElementById('transportadoraSelecionada');
    
    if(!searchInput || !logoImg || !hiddenInput) return;

    searchInput.value = nome;
    hiddenInput.value = nome;
    
    const faviconUrl = obterFavicon(nome);
    logoImg.src = faviconUrl;
    logoImg.style.display = 'block';
    logoImg.classList.add('loading-logo');
    
    logoImg.onload = function() {
        logoImg.classList.remove('loading-logo');
    };
    
    logoImg.onerror = function() {
        const inicial = nome.charAt(0).toUpperCase();
        const svgString = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><rect width="24" height="24" rx="4" fill="#3b82f6"/><text x="12" y="16" text-anchor="middle" fill="white" font-size="12" font-family="Arial" font-weight="bold">${inicial}</text></svg>`;
        logoImg.src = 'data:image/svg+xml,' + encodeURIComponent(svgString);
        logoImg.classList.remove('loading-logo');
    };
    
    const dropdown = document.getElementById('transportadoraDropdown');
    const arrow = document.querySelector('.dropdown-arrow');
    if(dropdown && arrow) {
        dropdown.classList.remove('show');
        arrow.classList.remove('open');
    }
}

function buscarOutraEmpresa() {
    const nomeEmpresa = prompt('Digite o nome da empresa/transportadora:');
    if (nomeEmpresa && nomeEmpresa.trim()) {
        const nome = nomeEmpresa.trim();
        selecionarTransportadora(nome);
    }
}

// INICIALIZADOR SEGURO (Previne crash no carregamento)
document.addEventListener('DOMContentLoaded', () => {
    const searchContainer = document.querySelector('.transportadora-search-container');
    const searchInput = document.getElementById('transportadoraSearch');

    if (!searchContainer || !searchInput) return;

    // Fechar ao clicar fora
    document.addEventListener('click', (event) => {
        if (!searchContainer.contains(event.target)) {
            const dropdown = document.getElementById('transportadoraDropdown');
            const arrow = document.querySelector('.dropdown-arrow');
            if(dropdown && arrow) {
                dropdown.classList.remove('show');
                arrow.classList.remove('open');
            }
        }
    });

    // Submeter com Enter
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const searchTerm = searchInput.value.trim();
            if (searchTerm) selecionarTransportadora(searchTerm);
        }
    });
});
