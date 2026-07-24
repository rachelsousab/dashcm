/**
 * ==========================================================
 * AUTH
 * ----------------------------------------------------------
 * Trava de acesso simples: pede uma senha fixa antes de
 * inicializar o dashboard. NÃO é autenticação real — a senha
 * fica em CONFIG.AUTH.password, em texto puro no código-
 * fonte, visível a quem inspecionar a página. Serve só para
 * afastar acesso casual, não protege dados sensíveis.
 *
 * Persistência: sessionStorage — pede a senha de novo a cada
 * nova sessão do navegador (fechar e reabrir a aba/janela),
 * mas não pede de novo só por atualizar (F5) a página.
 * ==========================================================
 */

const Auth = {

    storageKey: "cm_auth_ok",

    onSuccess: null,

    isAuthenticated() {

        return sessionStorage.getItem(this.storageKey) === "1";

    },

    init(onSuccess) {

        this.onSuccess = onSuccess;

        if (this.isAuthenticated()) {

            this.hideOverlay();

            onSuccess();

            return;

        }

        this.showOverlay();

        this.bindEvents();

    },

    showOverlay() {

        const overlay = document.getElementById("authOverlay");

        if (overlay) overlay.classList.add("open");

        document.body.classList.add("auth-locked");

        const input = document.getElementById("authPassword");

        if (input) {

            setTimeout(() => input.focus(), 50);

        }

    },

    hideOverlay() {

        const overlay = document.getElementById("authOverlay");

        if (overlay) overlay.classList.remove("open");

        document.body.classList.remove("auth-locked");

    },

    bindEvents() {

        const form = document.getElementById("authForm");

        if (!form) return;

        form.addEventListener("submit", (event) => {

            event.preventDefault();

            this.attempt();

        });

    },

    attempt() {

        const input = document.getElementById("authPassword");

        const errorEl = document.getElementById("authError");

        const value = input ? input.value : "";

        if (value && value === CONFIG.AUTH.password) {

            sessionStorage.setItem(this.storageKey, "1");

            if (errorEl) errorEl.textContent = "";

            if (input) input.value = "";

            this.hideOverlay();

            if (this.onSuccess) this.onSuccess();

        } else {

            if (errorEl) errorEl.textContent = "Senha incorreta. Tente novamente.";

            if (input) {

                input.value = "";

                input.focus();

            }

        }

    }

};
