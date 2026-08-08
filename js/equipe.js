// ==========================================
// EVO UPI - CONRUJA
// equipe.js - Gestão de Equipe na Nuvem Automatizada
// ==========================================

let equipeGlobais = [];
let idFuncionarioEditando = null;

let canvas, ctx, desenhando = false;

window.addEventListener('DOMContentLoaded', () => {
    canvas = document.getElementById('quadroAssinatura');
    if(canvas) {
        canvas.width = 600; 
        canvas.height = 150;
        ctx = canvas.getContext('2d');
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#0f172a';

        const getPos = (e) => {
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
        };

        const start = (e) => { e.preventDefault(); desenhando = true; const {x,y} = getPos(e); ctx.beginPath(); ctx.moveTo(x, y); };
        const draw = (e) => { e.preventDefault(); if(!desenhando) return; const {x,y} = getPos(e); ctx.lineTo(x, y); ctx.stroke(); };
        const stop = (e) => { e.preventDefault(); desenhando = false; };

        canvas.addEventListener('mousedown', start);
        canvas.addEventListener('mousemove', draw);
        canvas.addEventListener('mouseup', stop);
        canvas.addEventListener('mouseout', stop);

        canvas.addEventListener('touchstart', start, {passive: false});
        canvas.addEventListener('touchmove', draw, {passive: false});
        canvas.addEventListener('touchend', stop);
    }

    const meuCondominio = localStorage.getItem("condominioId");
    if (!meuCondominio) return;

    if (typeof db !== 'undefined') {
        db.collection("equipe").where("condominioId", "==", meuCondominio).onSnapshot((snapshot) => {
            equipeGlobais = [];
            snapshot.forEach((doc) => {
                let func = doc.data();
                func.id = doc.id;
                equipeGlobais.push(func);
            });
            equipeGlobais.sort((a, b) => a.nome.localeCompare(b.nome));
            localStorage.setItem('equipe', JSON.stringify(equipeGlobais));
            atualizarListaEquipe();
            if(typeof atualizarSelectsEquipe === 'function') atualizarSelectsEquipe();
            if(typeof atualizarDashboard === 'function') atualizarDashboard();
        });
    }
});

function limparAssinatura() { if(ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height); }
function isCanvasBlank(canvas) {
    const blank = document.createElement('canvas'); blank.width = canvas.width; blank.height = canvas.height;
    return canvas.toDataURL() === blank.toDataURL();
}

async function addFuncionario() {
    const nome = document.getElementById('funcNome').value.trim();
    const cargo = document.getElementById('funcCargo').value;
    const cpfEl = document.getElementById('funcCpf');
    const cpf = cpfEl ? cpfEl.value.trim() : "";
    const emailEl = document.getElementById('funcEmail');
    const email = emailEl ? emailEl.value.trim() : "";
    
    // 🔥 Captura a marcação do Checkbox do Ponto!
    const exigePontoEl = document.getElementById('funcExigePonto');
    const exigePonto = exigePontoEl ? exigePontoEl.checked : true;

    if (!nome || !cargo || !cpf) { alert('⚠️ Nome, Cargo e CPF são obrigatórios!'); return; }

    let assinaturaBase64 = null;
    if (canvas && !isCanvasBlank(canvas)) { assinaturaBase64 = canvas.toDataURL("image/png"); } 
    else if (!idFuncionarioEditando) { alert('⚠️ Por favor, peça para o funcionário assinar no quadro antes de salvar o cadastro.'); return; }

    const meuCondominio = localStorage.getItem("condominioId");
    const btnSalvar = document.getElementById('btnSalvarEquipe');
    const textoOriginal = btnSalvar ? btnSalvar.innerHTML : "Cadastrar Funcionário";

    if (btnSalvar) { btnSalvar.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Criando Acesso e Enviando...'; btnSalvar.style.pointerEvents = 'none'; }

    try {
        if (idFuncionarioEditando) {
            let dadosUpdate = { nome: nome, cargo: cargo, cpf: cpf, exigePonto: exigePonto };
            if (email) dadosUpdate.email = email;
            if (assinaturaBase64) dadosUpdate.assinatura = assinaturaBase64;

            await db.collection("equipe").doc(idFuncionarioEditando).update(dadosUpdate);
            
            // Tenta atualizar a flag exigePonto no banco de usuários também
            const snapUsu = await db.collection("usuarios").where("condominioId","==",meuCondominio).where("nome","==",nome).get();
            if(!snapUsu.empty) { await db.collection("usuarios").doc(snapUsu.docs[0].id).update({ exigePonto: exigePonto }); }

            resetarFormulario();
            alert('✅ Ficha atualizada com sucesso!');
        } else {
            if (!email) {
                alert("⚠️ O E-mail é obrigatório para criar o acesso do funcionário!");
                if(btnSalvar) { btnSalvar.innerHTML = textoOriginal; btnSalvar.style.pointerEvents = 'auto'; }
                return;
            }

            const senhaGerada = "CONRUJA@" + Math.floor(1000 + Math.random() * 9000);
            const secondaryApp = firebase.initializeApp(firebaseConfig, "AppEquipe_" + Date.now());
            const userCredential = await secondaryApp.auth().createUserWithEmailAndPassword(email, senhaGerada);
            const novoUid = userCredential.user.uid;

            await db.collection("usuarios").doc(novoUid).set({
                nome: nome, emailAcesso: email, cpf: cpf, cargo: cargo, 
                exigePonto: exigePonto, // Salva se ele precisa bater ponto ou não
                condominioId: meuCondominio, dataCadastro: new Date().toISOString()
            });

            await db.collection("equipe").add({
                uidLogin: novoUid, nome: nome, cargo: cargo, cpf: cpf, email: email, 
                exigePonto: exigePonto, assinatura: assinaturaBase64, 
                dataCadastro: new Date().toISOString(), condominioId: meuCondominio, excluido: false
            });

            await secondaryApp.auth().signOut(); await secondaryApp.delete();

            const htmlDoEmail = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
                    <div style="background-color: #0F172A; padding: 25px; text-align: center;">
                        <h2 style="color: #38bdf8; margin: 0; font-size: 24px; letter-spacing: 1px;">CONRUJA</h2>
                    </div>
                    <div style="padding: 30px; background-color: #ffffff; color: #334155;">
                        <h3 style="color: #1e293b; font-size: 20px; margin-top: 0;">Bem-vindo(a) à equipe, ${nome}!</h3>
                        <p style="font-size: 15px; line-height: 1.6;">O seu cadastro como <strong>${cargo}</strong> foi finalizado pela administração.</p>
                        <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; border-left: 4px solid #38bdf8; margin: 25px 0;">
                            <p style="margin: 0 0 10px 0; font-size: 15px;"><b>E-mail de acesso:</b> ${email}</p>
                            <p style="margin: 0; font-size: 15px;"><b>Senha provisória:</b> <span style="background: #e2e8f0; padding: 3px 8px; border-radius: 4px; font-family: monospace;">${senhaGerada}</span></p>
                        </div>
                        <div style="text-align: center; margin-top: 25px;">
                            <a href="https://app.conruja.com.br" style="display: inline-block; background-color: #3b82f6; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">Acessar o Sistema</a>
                        </div>
                    </div>
                </div>`;

            if(typeof dispararEmail === 'function') { await dispararEmail(email, nome, "Seus dados de acesso - CONRUJA", htmlDoEmail); }

            resetarFormulario();
            alert('🚀 Funcionário cadastrado na base, login ativado e E-mail enviado com sucesso!');
        }
    } catch (error) {
        console.error("Erro ao processar:", error);
        alert("❌ Ocorreu um erro no processo: " + error.message);
        try { if(firebase.apps.length > 1) { await firebase.app("AppEquipe_" + Date.now()).delete(); } } catch(e) {}
    } finally {
        if (btnSalvar) { btnSalvar.innerHTML = textoOriginal; btnSalvar.style.pointerEvents = 'auto'; }
    }
}

function resetarFormulario() {
    idFuncionarioEditando = null;
    document.getElementById('funcNome').value = '';
    document.getElementById('funcCargo').value = '';
    if(document.getElementById('funcCpf')) document.getElementById('funcCpf').value = '';
    if(document.getElementById('funcEmail')) document.getElementById('funcEmail').value = '';
    if(document.getElementById('funcExigePonto')) document.getElementById('funcExigePonto').checked = true;
    limparAssinatura(); 
    const btnSalvar = document.getElementById('btnSalvarEquipe');
    if (btnSalvar) { btnSalvar.innerHTML = "<i class='fa-solid fa-plus'></i> Cadastrar Funcionário"; btnSalvar.style.background = "#3b82f6"; }
}

function carregarFuncionarioParaEdicao(index) {
    let func = equipeGlobais[index];
    idFuncionarioEditando = func.id;
    document.getElementById('funcNome').value = func.nome;
    document.getElementById('funcCargo').value = func.cargo;
    if(document.getElementById('funcCpf')) document.getElementById('funcCpf').value = func.cpf || '';
    if(document.getElementById('funcEmail')) document.getElementById('funcEmail').value = func.email || '';
    
    const chkPonto = document.getElementById('funcExigePonto');
    if (chkPonto) chkPonto.checked = func.exigePonto !== false; // Padrão é true se não existir

    limparAssinatura(); 
    const btnSalvar = document.getElementById('btnSalvarEquipe');
    if (btnSalvar) { btnSalvar.innerHTML = "<i class='fa-solid fa-floppy-disk'></i> Salvar Alterações"; btnSalvar.style.background = "#10b981"; }
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function atualizarListaEquipe() {
    const lista = document.getElementById('listaEquipe');
    if (!lista) return;
    lista.innerHTML = '';
    if (equipeGlobais.length === 0) {
        lista.innerHTML = '<div style="text-align: center; grid-column: 1 / -1; padding: 40px; background: white; border-radius: 12px; border: 1px dashed #cbd5e1; color: #64748b;"><i class="fa-solid fa-users-slash" style="font-size: 30px; margin-bottom: 10px; opacity: 0.5;"></i><p>Nenhum funcionário cadastrado.</p></div>';
        return;
    }

    const cargoUsuario = localStorage.getItem("usuario_cargo");
    const categorias = {
        "Administração": ['Síndico', 'Gerente', 'Admin', 'Sub-síndico', 'Administrador(a)'],
        "Portaria e Segurança": ['Porteiro', 'Segurança', 'Vigilante', 'Porteiro Diurno', 'Porteiro Noturno'],
        "Manutenção e Limpeza": ['Zelador', 'Limpeza', 'Faxina', 'Manutenção', 'Auxiliar de Limpeza']
    };

    const grupos = {};
    equipeGlobais.forEach((func, index) => {
        let catEncontrada = "Outros";
        for (let cat in categorias) {
            if (categorias[cat].some(palavraChave => func.cargo.includes(palavraChave))) { catEncontrada = cat; break; }
        }
        if (!grupos[catEncontrada]) grupos[catEncontrada] = [];
        grupos[catEncontrada].push({ func, index });
    });

    const ordemExibicao = ["Administração", "Portaria e Segurança", "Manutenção e Limpeza", "Outros"];

    ordemExibicao.forEach(nomeGrupo => {
        if (grupos[nomeGrupo] && grupos[nomeGrupo].length > 0) {
            // Título do Grupo
            const tituloSessao = document.createElement('h2');
            tituloSessao.style.cssText = "grid-column: 1 / -1; margin-top: 25px; margin-bottom: 15px; font-size: 18px; color: #475569; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; display: flex; align-items: center; gap: 8px;";
            
            let iconTitulo = 'fa-users';
            if(nomeGrupo === "Administração") iconTitulo = 'fa-building-user';
            if(nomeGrupo === "Portaria e Segurança") iconTitulo = 'fa-shield-halved';
            if(nomeGrupo === "Manutenção e Limpeza") iconTitulo = 'fa-toolbox';
            
            tituloSessao.innerHTML = `<i class="fa-solid ${iconTitulo}" style="color: #94a3b8;"></i> ${nomeGrupo}`;
            lista.appendChild(tituloSessao);

            // Container Grid Inteligente (Lado a Lado)
            const gridSessao = document.createElement('div');
            gridSessao.style.cssText = "display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; grid-column: 1 / -1; margin-bottom: 30px;";

            grupos[nomeGrupo].forEach(item => {
                const func = item.func;
                const index = item.index;

                // Cores baseadas no grupo
                let corBadge = '#3b82f6', icone = 'fa-user';
                if (nomeGrupo === "Portaria e Segurança") { corBadge = '#10b981'; icone = 'fa-user-shield'; }
                else if (nomeGrupo === "Manutenção e Limpeza") { corBadge = '#f59e0b'; icone = 'fa-broom'; }
                else if (nomeGrupo === "Administração") { corBadge = '#8b5cf6'; icone = 'fa-user-tie'; }

                // Foto do Firebase (ou iniciais)
                let primeiroNome = func.nome ? func.nome.split(" ")[0] : "Funcionario";
                let fotoAvatar = func.fotoPerfil ? func.fotoPerfil : `https://ui-avatars.com/api/?name=${primeiroNome}&background=f1f5f9&color=475569&size=150`;

                // Badges de Status (Assinatura e Ponto)
                let assinaturaBadge = func.assinatura 
                    ? `<span style="color: #10b981; font-weight: bold;" title="Assinatura Salva"><i class="fa-solid fa-file-signature"></i></span>` 
                    : `<span style="color: #ef4444; font-weight: bold;" title="Sem Assinatura"><i class="fa-solid fa-file-signature"></i></span>`;

                let pontoBadge = func.exigePonto !== false 
                    ? `<span style="color: #3b82f6; font-weight: bold;" title="Bate Ponto"><i class="fa-solid fa-clock"></i></span>`
                    : `<span style="color: #94a3b8; font-weight: bold;" title="Isento"><i class="fa-solid fa-eye-slash"></i></span>`;

                // Botões de Gestão
                let botoesGestaoHtml = '';
                if (cargoUsuario === 'operacional') {
                    botoesGestaoHtml = `<button onclick="carregarFuncionarioParaEdicao(${index})" style="width: 100%; background: #eff6ff; color: #3b82f6; border: none; padding: 10px; border-radius: 8px; font-weight: bold; cursor: pointer; transition: 0.2s;"><i class="fa-solid fa-pen"></i> Editar</button>`;
                } else {
                    botoesGestaoHtml = `
                        <button onclick="carregarFuncionarioParaEdicao(${index})" style="flex: 1; background: #eff6ff; color: #3b82f6; border: none; padding: 10px; border-radius: 8px; font-weight: bold; cursor: pointer; transition: 0.2s;"><i class="fa-solid fa-pen"></i> Editar</button>
                        <button onclick="excluirFuncionario('${func.id}', '${func.nome}')" style="flex: 1; background: #fef2f2; color: #ef4444; border: none; padding: 10px; border-radius: 8px; font-weight: bold; cursor: pointer; transition: 0.2s;"><i class="fa-solid fa-trash-can"></i> Remover</button>
                    `;
                }

                // Criação do CRACHÁ
                const cracha = document.createElement('div');
                cracha.style.cssText = `background: white; border-radius: 16px; padding: 25px 20px; border: 1px solid #e2e8f0; border-top: 5px solid ${corBadge}; box-shadow: 0 4px 15px rgba(0,0,0,0.03); display: flex; flex-direction: column; align-items: center; text-align: center; transition: 0.2s;`;
                cracha.onmouseover = function() { this.style.transform = 'translateY(-5px)'; };
                cracha.onmouseout = function() { this.style.transform = 'translateY(0)'; };

                cracha.innerHTML = `
                    <div style="position: absolute; top: 15px; right: 15px; display: flex; gap: 8px; font-size: 14px;">
                        ${assinaturaBadge}
                        ${pontoBadge}
                    </div>

                    <img src="${fotoAvatar}" style="width: 75px; height: 75px; border-radius: 50%; object-fit: cover; border: 3px solid #f8fafc; box-shadow: 0 4px 10px rgba(0,0,0,0.05); margin-bottom: 12px; margin-top: 10px;">
                    
                    <h4 style="margin: 0 0 6px 0; font-size: 17px; color: #0f172a; font-weight: 800; text-transform: capitalize;">${func.nome}</h4>
                    <span style="background: ${corBadge}15; color: ${corBadge}; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: bold; margin-bottom: 18px; display: inline-flex; align-items: center; gap: 4px;"><i class="fa-solid ${icone}"></i> ${func.cargo}</span>
                    
                    <div style="width: 100%; text-align: left; font-size: 12px; color: #475569; background: #f8fafc; padding: 12px 15px; border-radius: 12px; margin-bottom: 20px; border: 1px solid #f1f5f9;">
                        <div style="margin-bottom: 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${func.email || 'Não informado'}">
                            <i class="fa-regular fa-envelope" style="color: #94a3b8; width: 16px;"></i> ${func.email || 'N/A'}
                        </div>
                        <div>
                            <i class="fa-regular fa-address-card" style="color: #94a3b8; width: 16px;"></i> CPF: ${func.cpf || 'N/A'}
                        </div>
                    </div>
                    
                    <div style="display: flex; gap: 8px; width: 100%; margin-top: auto;">
                        ${botoesGestaoHtml}
                    </div>
                `;
                
                gridSessao.appendChild(cracha);
            });
            lista.appendChild(gridSessao);
        }
    });
}

// 🔥 EXCLUSÃO DEFINITIVA DO FUNCIONÁRIO (Igual fizemos com Morador!)
async function excluirFuncionario(id, nome) {
    if(!confirm(`🚨 EXCLUSÃO DEFINITIVA: Tem certeza que deseja demitir/apagar ${nome}?\n\nIsso removerá a ficha e CORTARÁ O ACESSO ao aplicativo imediatamente!`)) return;

    try {
        const f = equipeGlobais.find(func => func.id === id);
        if(!f) return;

        // 1. Apaga a ficha da tela de Equipe
        await db.collection("equipe").doc(id).delete();

        // 2. Procura a conta de login (na coleção usuarios) e DELETA também!
        const snapUsuarios = await db.collection("usuarios")
            .where("condominioId", "==", f.condominioId)
            .where("nome", "==", f.nome)
            .get();

        if (!snapUsuarios.empty) {
            const batch = db.batch();
            snapUsuarios.forEach(doc => { batch.delete(doc.ref); });
            await batch.commit();
        }

        alert("✅ Funcionário e acessos excluídos com sucesso!");

    } catch (error) {
        console.error("Erro ao excluir:", error);
        alert("❌ Erro ao tentar excluir: " + error.message);
    }
}
