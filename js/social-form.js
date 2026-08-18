/**
 * ==========================================================
 * REDES SOCIAIS — EDIÇÃO DE CAMPOS MANUAIS
 * ----------------------------------------------------------
 * A maioria dos campos dos posts vem automaticamente da API
 * do Instagram, mas alguns têm que ser preenchidos à mão
 * (Formato, Tipo, Resumo, Responsável, Gravadora, Collab,
 * Gênero, Reposts, Começaram a seguir). Esse módulo grava
 * essas edições feitas direto na tabela "Últimas postagens"
 * na planilha de origem, via Apps Script Web App.
 *
 * webAppUrl ainda não está preenchida em
 * CONFIG.SOCIAL_FORM.webAppUrl — enquanto isso, os campos já
 * ficam editáveis e a tela já atualiza (otimista), mas nada é
 * de fato salvo na planilha até a Rachel implantar o Apps
 * Script e a gente colar a URL aqui.
 * ==========================================================
 */

const SocialForm = {

    /**
     * Muda um campo manual de um post (Formato, Tipo,
     * Responsável, Gravadora, Collab, Gênero, Reposts,
     * Começaram a seguir). value pode ser string (campo único)
     * ou array (campo de múltipla seleção — vai concatenado
     * por vírgula, igual o resto da planilha).
     */
    updateField(post, field, value) {

        const payload = {

            token: CONFIG.SOCIAL_FORM.sharedSecret,
            mode: "updateField",
            postId: post.postId,
            field,
            value: Array.isArray(value) ? value.join(", ") : value

        };

        return this.sendPayload(payload);

    },

    /**
     * Envia o payload pro Apps Script (mesmo padrão "no-cors"
     * usado em Ações Manuais e Canal 500). Se a URL ainda não
     * foi configurada, não tenta mandar nada — só avisa no
     * console, pra não travar a edição enquanto o backend não
     * está pronto.
     */
    sendPayload(payload) {

        if (!CONFIG.SOCIAL_FORM.webAppUrl) {

            console.warn("[SocialForm] webAppUrl ainda não configurada — edição não foi salva na planilha:", payload);
            return Promise.resolve();

        }

        return fetch(CONFIG.SOCIAL_FORM.webAppUrl, {

            method: "POST",
            mode: "no-cors",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify(payload)

        });

    }

};
