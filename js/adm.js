// ==========================================
// MÓDULO ADM: FÁBRICA DE ACESSOS (SaaS)
// ==========================================

// 1. Carrega os condomínios na lista do painel ADM ao abrir a tela
function carregarListaCondominios() {
    const select = document.getElementById('admFuncCondominio');
    if (!select) return;

    db.collection("condominios").get().then((snapshot) => {
        select.innerHTML = '<option value="" disabled selected>Selecione o Condomínio...</option>';
        snapshot.forEach((doc) => {
            let c = doc.data();
            select.innerHTML += `<option value="${doc.id}">${c.nome}</option>`;
        });
    });
}

// 2. A Função que cria o login E salva o perfil no banco
function criarUsuarioPeloADM() {
    const email = document.getElementById('admFuncEmail').value;
    const senha = document.getElementById('admFuncSenha').value;
    const nome = document.getElementById('admFuncNome').value;
    const cargo = document.getElementById('admFuncCargo').value;
    const condominioId = document.getElementById('admFuncCondominio').value;

    if(!email || !senha || !nome || !cargo || !condominioId) {
        alert("Preencha todos os campos!");
        return;
    }

    // Cria o usuário no Auth do Firebase
    auth.createUserWithEmailAndPassword(email, senha)
    .then((userCredential) => {
        const uid = userCredential.user.uid;

        // Salva o perfil na coleção "usuarios" (Onde vinculamos o Condomínio)
        db.collection("usuarios").doc(uid).set({
            nome: nome,
            email: email,
            cargo: cargo,
            condominioId: condominioId,
            criadoEm: new Date()
        }).then(() => {
            alert(`Sucesso! ${nome} criado como ${cargo} com acesso ao condomínio selecionado.`);
            
            // Limpa o formulário
            document.getElementById('admFuncNome').value = '';
            document.getElementById('admFuncEmail').value = '';
            document.getElementById('admFuncSenha').value = '';
        });
    })
    .catch((error) => {
        console.error("Erro no Firebase:", error);
        alert("Erro ao criar usuário: " + error.message);
    });
}

// 3. Gatilho para carregar condomínios quando abrir a tela de controle de acessos
document.querySelector('button[onclick="trocarTela(\'adm-funcionarios\')"]').addEventListener('click', () => {
    carregarListaCondominios();
});