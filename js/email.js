// Função Universal para disparar e-mails usando a Brevo
async function dispararEmail(destinatarioEmail, destinatarioNome, assunto, conteudoHTML) {
    
    // NOTA: Em um cenário real, você puxaria essa chave do Firebase (onde a aba Configurações salvou).
    // Aqui estou colocando direto para você testar agora mesmo.
    const CHAVE_API_BREVO = "COLE_SUA_CHAVE_GIGANTE_AQUI"; 
    const REMETENTE_EMAIL = "nao-responda@evoupi.com.br"; // Seu domínio verificado
    const REMETENTE_NOME = "CondoUp - Portaria Inteligente";

    const url = "https://api.brevo.com/v3/smtp/email";

    const dadosDoEmail = {
        sender: { 
            name: REMETENTE_NOME, 
            email: REMETENTE_EMAIL 
        },
        to: [
            { 
                email: destinatarioEmail, 
                name: destinatarioNome 
            }
        ],
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
            console.log("🚀 E-mail disparado com sucesso para:", destinatarioEmail);
            return true;
        } else {
            const erro = await resposta.json();
            console.error("❌ Erro ao enviar e-mail:", erro);
            return false;
        }
    } catch (erro) {
        console.error("❌ Falha na conexão com a Brevo:", erro);
        return false;
    }
}