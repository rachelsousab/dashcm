/**
 * ==========================================================
 * REDES SOCIAIS — "ÚLTIMAS POSTAGENS"
 * ----------------------------------------------------------
 * Tabela compacta (mesmo formato das mini-tabelas de Ações e
 * Canal 500 — cabeçalho fixo, scroll pra ver mais linhas) com
 * TODOS os posts, mais recente primeiro, independente dos
 * filtros da sidebar — é uma visão geral de "o que falta
 * preencher", não um recorte por período.
 *
 * Campos que vêm automaticamente da API do Instagram não são
 * editáveis por aqui. Os campos manuais (Formato, Tipo,
 * Resumo, Responsável, Gravadora, Collab, Gênero, Reposts,
 * Começaram a seguir), quando vazios, mostram um indicativo
 * vermelho "Informação faltante" com o campo de preenchimento
 * já embutido na própria célula.
 * ==========================================================
 */

const SocialRecentTable = {

    _posts: [],

    render() {

        const container = document.getElementById("socialRecentPostsBox");

        if (!container) return;

        this._posts = [...SocialData.getPosts()].sort((a, b) => b.timestamp - a.timestamp);

        const missingCount = this._posts.filter(post => this.getMissingFields(post).length > 0).length;

        this.renderMissingNotice(missingCount);

        if (!this._posts.length) {
            container.innerHTML = "<p class='maf-empty'>Nenhum post carregado.</p>";
            return;
        }

        const headerHtml =
            "<th>Data</th>" +
            "<th>Resumo da ação</th>" +
            "<th>Formato</th>" +
            "<th>Tipo</th>" +
            "<th>Gravadora</th>" +
            "<th>Responsável</th>" +
            "<th>Collab</th>" +
            "<th>Gênero</th>" +
            "<th>Reposts</th>" +
            "<th>Começaram a seguir</th>";

        const bodyHtml = this._posts.map((post, index) => `
            <tr>
                <td>${post.data ? post.data.toLocaleDateString(CONFIG.DATE.locale) : "—"}</td>
                <td>${this.renderResumoCell(post, index)}</td>
                <td>${this.renderSelectCell(post, index, "formato", CONFIG.SOCIAL_FORM.formatos)}</td>
                <td>${this.renderSelectCell(post, index, "tipo", CONFIG.SOCIAL_FORM.tipos)}</td>
                <td>${this.renderMultiSelectCell(post, index, "gravadora", this.getGravadoraOptions())}</td>
                <td>${this.renderMultiSelectCell(post, index, "responsavel", CONFIG.SOCIAL_FORM.responsaveis)}</td>
                <td>${this.renderMultiSelectCell(post, index, "collab", CONFIG.SOCIAL_FORM.collabs)}</td>
                <td>${this.renderMultiSelectCell(post, index, "genero", CONFIG.SOCIAL_FORM.generos)}</td>
                <td>${this.renderNumberCell(post, index, "reposts")}</td>
                <td>${this.renderNumberCell(post, index, "seguidores")}</td>
            </tr>
        `).join("");

        container.innerHTML =
            `<table class="drilldown-table social-recent-table">` +
            `<thead><tr>${headerHtml}</tr></thead>` +
            `<tbody>${bodyHtml}</tbody>` +
            `</table>`;

        this.bindEvents(container);

    },

    getGravadoraOptions() {

        const gravadoras = CONFIG.MANUAL_ACTIONS.labels;

        const especiais = CONFIG.MANUAL_ACTIONS.labelSpecialOptions.map(o => o.value);

        return [...gravadoras, ...especiais];

    },

    /* Campos considerados "faltando" pra fins do aviso e do
       indicativo vermelho — Reposts/Começaram a seguir contam
       como faltando quando estão em 0 (a planilha não distingue
       "zero de verdade" de "ainda não preenchido" por aqui). */
    getMissingFields(post) {

        const missing = [];

        if (!post.formato) missing.push("formato");
        if (!post.tipo) missing.push("tipo");
        if (!post.resumo) missing.push("resumo");
        if (!post.responsavel) missing.push("responsavel");
        if (!post.gravadora) missing.push("gravadora");
        if (!post.collab) missing.push("collab");
        if (!post.genero) missing.push("genero");
        if (!post.reposts) missing.push("reposts");
        if (!post.seguidores) missing.push("seguidores");

        return missing;

    },

    renderMissingNotice(count) {

        const el = document.getElementById("socialMissingNotice");

        if (!el) return;

        if (!count) {
            el.style.display = "none";
            return;
        }

        el.style.display = "";
        el.textContent = `${count} ${count === 1 ? "ação" : "ações"} com informações faltantes. O Instagram não consegue importar todas automaticamente. Favor adicionar de forma manual.`;

    },

    /* ======================================================
       RESUMO — botão "Gerar resumo" (escreve a fórmula =AI(...)
       na planilha via Apps Script) quando ainda está vazio.
    ====================================================== */
    renderResumoCell(post, index) {

        if (post.resumo) {
            return this.escapeHtml(post.resumo);
        }

        if (post._resumoPending) {
            return `<span class="social-missing-badge">Solicitado — confira na planilha em alguns minutos.</span>`;
        }

        return `
            <span class="social-missing-badge">Informação faltante</span>
            <button type="button" class="mini-edit-btn social-generate-resumo-btn" data-index="${index}" title="Gerar resumo">✨ Gerar resumo</button>
        `;

    },

    /* ======================================================
       CAMPO ÚNICO (Formato / Tipo)
    ====================================================== */
    renderSelectCell(post, index, field, options) {

        const value = post[field];

        if (value) {
            return this.escapeHtml(value);
        }

        return `
            <span class="social-missing-badge">Informação faltante</span>
            <select class="social-field-select" data-index="${index}" data-field="${field}">
                <option value="" disabled selected>Selecione...</option>
                ${options.map(o => `<option value="${this.escapeAttr(o)}">${this.escapeHtml(o)}</option>`).join("")}
            </select>
        `;

    },

    /* ======================================================
       CAMPO DE MÚLTIPLA SELEÇÃO (Responsável / Gravadora /
       Collab / Gênero)
    ====================================================== */
    renderMultiSelectCell(post, index, field, options) {

        const value = post[field];

        if (value) {
            return this.escapeHtml(value);
        }

        const uid = `sm-${index}-${field}`;

        return `
            <span class="social-missing-badge">Informação faltante</span>
            <div class="social-multiselect-dropdown" data-uid="${uid}">
                <button type="button" class="social-multiselect-toggle" data-uid="${uid}">Selecionar ▾</button>
                <div class="social-multiselect-panel" data-uid="${uid}" style="display:none;">
                    <div class="social-multiselect-options">
                        ${options.map((o, i) => `
                            <label class="social-multiselect-option">
                                <input type="checkbox" value="${this.escapeAttr(o)}" data-uid="${uid}">
                                ${this.escapeHtml(o)}
                            </label>
                        `).join("")}
                    </div>
                    <button type="button" class="data-table-csv-btn social-multiselect-save-btn" data-index="${index}" data-field="${field}" data-uid="${uid}">Salvar</button>
                </div>
            </div>
        `;

    },

    /* ======================================================
       CAMPO NUMÉRICO (Reposts / Começaram a seguir)
    ====================================================== */
    renderNumberCell(post, index, field) {

        if (post[field]) {
            return Number(post[field]).toLocaleString("pt-BR");
        }

        return `
            <span class="social-missing-badge">Informação faltante</span>
            <input type="number" min="0" class="social-field-number" data-index="${index}" data-field="${field}" placeholder="0">
        `;

    },

    /* ======================================================
       EVENTOS
    ====================================================== */
    bindEvents(container) {

        Array.from(container.querySelectorAll(".social-generate-resumo-btn")).forEach(btn => {

            btn.addEventListener("click", () => {

                const post = this._posts[Number(btn.dataset.index)];

                btn.disabled = true;
                btn.textContent = "Gerando...";

                SocialForm.generateResumo(post).then(() => {

                    post._resumoPending = true;
                    this.render();

                });

            });

        });

        Array.from(container.querySelectorAll(".social-field-select")).forEach(select => {

            select.addEventListener("change", () => {

                const post = this._posts[Number(select.dataset.index)];
                const field = select.dataset.field;
                const value = select.value;

                select.disabled = true;

                SocialForm.updateField(post, field, value)
                    .then(() => {
                        post[field] = value;
                        this.render();
                    })
                    .catch(error => {
                        console.error(error);
                        alert("Não foi possível salvar. Tente de novo.");
                        select.disabled = false;
                    });

            });

        });

        /* Dropdown compacto: fechado por padrão, abre/fecha ao
           clicar no botão, fecha ao clicar fora. */
        Array.from(container.querySelectorAll(".social-multiselect-toggle")).forEach(toggle => {

            toggle.addEventListener("click", (event) => {

                event.stopPropagation();

                const uid = toggle.dataset.uid;
                const panel = container.querySelector(`.social-multiselect-panel[data-uid="${uid}"]`);

                const isOpen = panel.style.display !== "none";

                // Fecha qualquer outro painel aberto antes de abrir este.
                Array.from(container.querySelectorAll(".social-multiselect-panel")).forEach(p => p.style.display = "none");

                panel.style.display = isOpen ? "none" : "block";

            });

        });

        if (!this._docCloseBound) {

            this._docCloseBound = true;

            document.addEventListener("click", () => {
                Array.from(document.querySelectorAll(".social-multiselect-panel")).forEach(p => p.style.display = "none");
            });

        }

        Array.from(container.querySelectorAll(".social-multiselect-panel")).forEach(panel => {
            panel.addEventListener("click", (event) => event.stopPropagation());
        });

        Array.from(container.querySelectorAll(".social-multiselect-save-btn")).forEach(btn => {

            btn.addEventListener("click", () => {

                const index = Number(btn.dataset.index);
                const field = btn.dataset.field;
                const post = this._posts[index];
                const uid = btn.dataset.uid;

                const checked = Array.from(container.querySelectorAll(`input[type="checkbox"][data-uid="${uid}"]:checked`));

                const values = checked.map(c => c.value);

                if (!values.length) {
                    alert("Selecione ao menos uma opção.");
                    return;
                }

                btn.disabled = true;

                SocialForm.updateField(post, field, values)
                    .then(() => {
                        post[field] = values.join(", ");
                        this.render();
                    })
                    .catch(error => {
                        console.error(error);
                        alert("Não foi possível salvar. Tente de novo.");
                        btn.disabled = false;
                    });

            });

        });

        Array.from(container.querySelectorAll(".social-field-number")).forEach(input => {

            const save = () => {

                const index = Number(input.dataset.index);
                const field = input.dataset.field;
                const post = this._posts[index];

                const value = Number(input.value);

                if (!value || value <= 0) return;

                input.disabled = true;

                SocialForm.updateField(post, field, value)
                    .then(() => {
                        post[field] = value;
                        this.render();
                    })
                    .catch(error => {
                        console.error(error);
                        alert("Não foi possível salvar. Tente de novo.");
                        input.disabled = false;
                    });

            };

            input.addEventListener("blur", save);

            input.addEventListener("keydown", (event) => {
                if (event.key === "Enter") {
                    event.preventDefault();
                    save();
                }
            });

        });

    },

    escapeHtml(text) {

        return String(text || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");

    },

    escapeAttr(text) {

        return this.escapeHtml(text).replace(/"/g, "&quot;");

    }

};
