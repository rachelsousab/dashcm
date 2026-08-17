/**
 * ==========================================================
 * CANAL 500 — "Registrar envio" / "Enviar evidência"
 * ----------------------------------------------------------
 * Formulário pop-up pra registrar um novo vídeo enviado pro
 * Canal 500 direto na planilha dedicada (via Apps Script Web
 * App próprio, separado do de Ações Manuais), e um formulário
 * menor pra anexar evidência numa linha já existente.
 * ==========================================================
 */

const Canal500Form = {

    initialized: false,

    submitting: false,

    parceiroActiveTag: "todos",

    // "email" (Enviar para Canal 500 -> time do Canal Like) ou
    // "manual" (Apenas registrar -> já foi enviado por e-mail).
    sendMode: "manual",

    // { id } quando o formulário está editando uma linha
    // existente (aberto via botão "Editar" na tabela); null
    // quando é um envio novo.
    editContext: null,

    state: null,

    evidenceState: null,

    emptyState() {

        return {

            acaoProspectada: "",
            artistas: "",
            parceiro: "",
            genero: "",
            entrada: "",
            saida: "",
            statusVeiculacao: "",
            responsavel: new Set(),
            programa: "",
            comentarios: "",
            evidenciasTexto: "",
            imagens: []

        };

    },

    emptyEvidenceState() {

        return {

            rowId: "",
            label: "",
            evidenciasTexto: "",
            imagens: []

        };

    },

    /* ======================================================
       INIT
    ====================================================== */

    init() {

        if (this.initialized) return this;

        this.state = this.emptyState();
        this.evidenceState = this.emptyEvidenceState();

        const openBtn = document.getElementById("canal500RegisterBtn");

        if (openBtn) openBtn.addEventListener("click", () => this.openChoice());

        this.bindChoiceModal();
        this.bindFormModal();
        this.bindEvidenceModal();

        this.initialized = true;

        return this;

    },

    /* ======================================================
       MODAL: ESCOLHA (Enviar pro Canal Like x Apenas registrar)
    ====================================================== */

    bindChoiceModal() {

        const modal = document.getElementById("canal500ChoiceModal");

        if (!modal) return;

        modal.addEventListener("click", (event) => {
            if (event.target === modal) this.closeChoice();
        });

        const closeBtn = document.getElementById("canal500ChoiceClose");
        if (closeBtn) closeBtn.addEventListener("click", () => this.closeChoice());

        const emailBtn = document.getElementById("canal500ChoiceEmail");
        if (emailBtn) emailBtn.addEventListener("click", () => {
            this.closeChoice();
            this.sendMode = "email";
            this.openForm();
        });

        const manualBtn = document.getElementById("canal500ChoiceManual");
        if (manualBtn) manualBtn.addEventListener("click", () => {
            this.closeChoice();
            this.sendMode = "manual";
            this.openForm();
        });

    },

    openChoice() {

        const modal = document.getElementById("canal500ChoiceModal");
        if (!modal) return;

        modal.classList.add("open");
        document.body.classList.add("modal-open");

    },

    closeChoice() {

        const modal = document.getElementById("canal500ChoiceModal");
        if (!modal) return;

        modal.classList.remove("open");
        document.body.classList.remove("modal-open");

    },

    /* ======================================================
       MODAL: REGISTRAR ENVIO
    ====================================================== */

    bindFormModal() {

        const modal = document.getElementById("canal500FormModal");

        if (!modal) return;

        modal.addEventListener("click", (event) => {
            if (event.target === modal) this.confirmClose();
        });

        const closeBtn = document.getElementById("canal500FormClose");
        if (closeBtn) closeBtn.addEventListener("click", () => this.confirmClose());

    },

    confirmClose() {

        const hasContent = this.state.acaoProspectada || this.state.artistas || this.state.parceiro;

        if (hasContent && !confirm("Fechar sem salvar? As informações preenchidas serão perdidas.")) {
            return;
        }

        this.closeForm();

    },

    /* (Re)constrói o rodapé padrão Cancelar/Salvar — precisa ser
       chamado a cada abertura porque o passo de e-mail (depois
       de um envio bem-sucedido no modo "email") troca o rodapé
       por um botão "Fechar" só. */
    resetFormFooter() {

        const footer = document.querySelector("#canal500FormModal .maf-form-footer");
        if (!footer) return;

        footer.innerHTML = `
            <button type="button" id="canal500CancelBtn" class="data-table-csv-btn">Cancelar</button>
            <button type="button" id="canal500SubmitBtn" class="data-table-link-btn" disabled>Salvar envio</button>
        `;

        document.getElementById("canal500CancelBtn").addEventListener("click", () => this.confirmClose());
        document.getElementById("canal500SubmitBtn").addEventListener("click", () => this.submit());

    },

    openForm() {

        this.state = this.emptyState();
        this.parceiroActiveTag = "todos";
        this.editContext = null;

        if (this.sendMode === "email") {
            this.state.statusVeiculacao = "Enviado";
        }

        const modal = document.getElementById("canal500FormModal");
        if (!modal) return;

        const title = document.getElementById("canal500FormTitle");
        if (title) {
            title.textContent = this.sendMode === "email"
                ? "Enviar para Canal 500"
                : "Registrar envio — Canal 500";
        }

        this.resetFormFooter();
        this.renderForm();

        modal.classList.add("open");
        document.body.classList.add("modal-open");

    },

    /* ======================================================
       EDITAR AÇÃO EXISTENTE (linha com ID real)
    ====================================================== */

    buildStateFromRow(row) {

        const state = this.emptyState();

        state.acaoProspectada = row.acaoProspectada || "";
        state.artistas = row.artistas || "";
        state.parceiro = row.parceiro || "";
        state.genero = row.genero || "";
        state.entrada = this.dateToInputValue(row.entrada);
        state.saida = this.dateToInputValue(row.saida);
        state.statusVeiculacao = row.statusVeiculacao || "";
        state.responsavel = new Set(
            (row.responsavel || "").split(",").map(s => s.trim()).filter(Boolean)
        );
        state.programa = row.programa || "";
        state.comentarios = row.comentarios || "";
        state.evidenciasTexto = row.evidencias || "";

        return state;

    },

    dateToInputValue(date) {

        if (!date) return "";

        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, "0");
        const d = String(date.getDate()).padStart(2, "0");

        return `${y}-${m}-${d}`;

    },

    openEditForm(row) {

        if (!row.id) {

            alert("Essa linha ainda não tem um ID (foi cadastrada manualmente antes do formulário existir), então não dá pra editar direto por aqui. Peça pra Rachel adicionar o ID dela na planilha.");
            return;

        }

        // Edição usa sempre o conjunto completo de campos (Status
        // de Veiculação + Comentários) — não faz sentido passar
        // pelo fluxo de e-mail pra corrigir uma linha já existente.
        this.sendMode = "manual";
        this.state = this.buildStateFromRow(row);
        this.parceiroActiveTag = "todos";
        this.editContext = { id: row.id };

        const modal = document.getElementById("canal500FormModal");
        if (!modal) return;

        const title = document.getElementById("canal500FormTitle");
        if (title) title.textContent = "Editar ação — Canal 500";

        this.resetFormFooter();

        const submitBtn = document.getElementById("canal500SubmitBtn");
        if (submitBtn) submitBtn.textContent = "Salvar alterações";

        this.renderForm();

        // Campos simples não são re-preenchidos pelo state
        // automaticamente no HTML — setamos o value direto.
        const setVal = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.value = value || "";
        };

        setVal("c500-acao", this.state.acaoProspectada);
        setVal("c500-artistas", this.state.artistas);
        setVal("c500-entrada", this.state.entrada);
        setVal("c500-saida", this.state.saida);
        setVal("c500-programa", this.state.programa);
        setVal("c500-comentarios", this.state.comentarios);
        setVal("c500-evidencias", this.state.evidenciasTexto);

        const comentariosCount = document.getElementById("c500-comentarios-count");
        if (comentariosCount) comentariosCount.textContent = `${this.state.comentarios.length} / ${CONFIG.CANAL500_FORM.maxTextLength}`;

        const evidenciasCount = document.getElementById("c500-evidencias-count");
        if (evidenciasCount) evidenciasCount.textContent = `${this.state.evidenciasTexto.length} / ${CONFIG.CANAL500_FORM.maxTextLength}`;

        this.updateSubmitState();

        modal.classList.add("open");
        document.body.classList.add("modal-open");

    },

    closeForm() {

        const modal = document.getElementById("canal500FormModal");
        if (!modal) return;

        modal.classList.remove("open");
        document.body.classList.remove("modal-open");

        this.editContext = null;

    },

    /* ======================================================
       RENDER DO FORMULÁRIO
    ====================================================== */

    renderForm() {

        const cfg = CONFIG.CANAL500_FORM;

        const body = document.getElementById("canal500FormBody");

        if (!body) return;

        const isEmailMode = this.sendMode === "email";

        const evidenciasField = `
            <div class="maf-field">
                <label class="maf-label">${isEmailMode ? "Link do material" : "Link do material / Evidências"} <span class="maf-required">*</span></label>
                <textarea class="maf-textarea" id="c500-evidencias" maxlength="${cfg.maxTextLength}" placeholder="Cole links aqui..."></textarea>
                <small class="maf-charcount" id="c500-evidencias-count">0 / ${cfg.maxTextLength}</small>
                ${isEmailMode ? "" : `
                    <input type="file" id="c500-image-input" accept="image/*" multiple style="display:none;">
                    <button type="button" class="data-table-csv-btn" id="c500-image-attach-btn">📎 Anexar imagem (até ${cfg.maxImages}, 5MB cada)</button>
                    <div class="maf-image-previews" id="c500-image-previews"></div>
                `}
            </div>
        `;

        const statusField = isEmailMode ? "" : `
            <div class="maf-field">
                <label class="maf-label">Status de Veiculação <span class="maf-required">*</span></label>
                <div class="maf-radio-group" id="c500-status-veiculacao"></div>
            </div>
        `;

        const comentariosField = isEmailMode ? "" : `
            <div class="maf-field">
                <label class="maf-label">Comentários</label>
                <textarea class="maf-textarea" id="c500-comentarios" maxlength="${cfg.maxTextLength}"></textarea>
                <small class="maf-charcount" id="c500-comentarios-count">0 / ${cfg.maxTextLength}</small>
            </div>
        `;

        body.innerHTML = `

            <div class="maf-field">
                <label class="maf-label">Ação Prospectada${isEmailMode ? " / Título do e-mail" : ""} <span class="maf-required">*</span></label>
                ${isEmailMode ? `
                    <div class="maf-prefixed-input">
                        <span class="maf-input-prefix">Claro música | Canal 500 -</span>
                        <input type="text" class="maf-input maf-prefixed-input-field" id="c500-acao">
                    </div>
                ` : `
                    <input type="text" class="maf-input" id="c500-acao">
                `}
            </div>

            ${isEmailMode ? evidenciasField : ""}

            <div class="maf-field">
                <label class="maf-label">Artistas <span class="maf-required">*</span></label>
                <input type="text" class="maf-input" id="c500-artistas" placeholder="Separe por vírgula se for mais de um">
            </div>

            <div class="maf-field">
                <label class="maf-label">Parceiro <span class="maf-required">*</span></label>
                <div class="maf-tag-chips" id="c500-parceiro-tags"></div>
                <input type="search" class="maf-search" id="c500-parceiro-search" placeholder="Buscar gravadora ou regional...">
                <div class="maf-checkbox-list" id="c500-parceiro-list"></div>
            </div>

            <div class="maf-field">
                <label class="maf-label">Gênero <span class="maf-required">*</span></label>
                <input type="search" class="maf-search" id="c500-genero-search" placeholder="Buscar gênero...">
                <div class="maf-checkbox-list maf-checkbox-list--compact" id="c500-genero-list"></div>
            </div>

            <div class="maf-field-row">

                <div class="maf-field">
                    <label class="maf-label">Entrada <span class="maf-required">*</span></label>
                    <input type="date" class="maf-input" id="c500-entrada">
                </div>

                <div class="maf-field">
                    <label class="maf-label">Saída <span class="maf-required">*</span></label>
                    <input type="date" class="maf-input" id="c500-saida">
                </div>

            </div>

            ${statusField}

            <div class="maf-field">
                <label class="maf-label">Responsável <span class="maf-required">*</span></label>
                <div class="maf-checkbox-list maf-checkbox-list--compact" id="c500-responsavel"></div>
            </div>

            <div class="maf-field">
                <label class="maf-label">Programa <small class="maf-hint">(em caso de inclusão em programa)</small></label>
                <input type="text" class="maf-input" id="c500-programa">
            </div>

            ${comentariosField}

            ${isEmailMode ? "" : evidenciasField}

            <div class="maf-errors" id="c500-errors" style="display:none;"></div>

        `;

        this.renderParceiroTags();
        this.renderParceiro();
        this.renderGenero();
        if (!isEmailMode) this.renderStatusVeiculacao();
        this.renderResponsavel();
        this.bindSimpleFields();
        if (!isEmailMode) this.bindImageUpload();
        this.updateSubmitState();

    },

    /* ======================================================
       PARCEIRO (gravadora OU regional — valor único)
    ====================================================== */

    renderParceiroTags() {

        const container = document.getElementById("c500-parceiro-tags");

        if (!container) return;

        const tags = [
            { key: "todos", label: "Todos" },
            { key: "gravadora", label: "Gravadoras" },
            { key: "regional", label: "Regionais" }
        ];

        container.innerHTML = tags.map(tag => `
            <button type="button" class="maf-tag-chip ${this.parceiroActiveTag === tag.key ? "active" : ""}" data-tag="${tag.key}">
                ${tag.label}
            </button>
        `).join("");

        Array.from(container.children).forEach(btn => {

            btn.addEventListener("click", () => {

                this.parceiroActiveTag = btn.dataset.tag;

                this.renderParceiroTags();
                this.renderParceiro();

            });

        });

    },

    getParceiroOptions() {

        const gravadoras = CONFIG.MANUAL_ACTIONS.labels.map(v => ({ value: v, tag: "gravadora" }));

        const especiais = CONFIG.MANUAL_ACTIONS.labelSpecialOptions.map(o => ({ value: o.value, tag: "gravadora" }));

        const regionais = CONFIG.MANUAL_ACTIONS.regionals.map(v => ({ value: v, tag: "regional" }));

        return [...gravadoras, ...especiais, ...regionais];

    },

    renderParceiro() {

        const listEl = document.getElementById("c500-parceiro-list");
        const searchEl = document.getElementById("c500-parceiro-search");

        if (!listEl) return;

        const query = (searchEl?.value || "").toLowerCase().trim();

        const items = this.getParceiroOptions().filter(item => {

            const matchesTag = this.parceiroActiveTag === "todos" || item.tag === this.parceiroActiveTag;

            const matchesSearch = !query || item.value.toLowerCase().includes(query);

            return matchesTag && matchesSearch;

        });

        listEl.innerHTML = items.length
            ? items.map(item => `
                <label class="maf-check">
                    <input type="radio" name="c500-parceiro-radio" data-value="${item.value}" ${this.state.parceiro === item.value ? "checked" : ""}>
                    ${item.value}
                </label>
            `).join("")
            : `<p class="maf-empty">Nenhum resultado.</p>`;

        Array.from(listEl.querySelectorAll("input")).forEach(input => {

            input.addEventListener("change", () => {

                this.state.parceiro = input.dataset.value;

                this.updateSubmitState();

            });

        });

        if (searchEl && !searchEl.dataset.bound) {

            searchEl.dataset.bound = "1";

            searchEl.addEventListener("input", () => this.renderParceiro());

        }

    },

    /* ======================================================
       GÊNERO (lista fixa, busca + seleção única — não aceita
       texto fora das opções oferecidas)
    ====================================================== */

    renderGenero() {

        const listEl = document.getElementById("c500-genero-list");
        const searchEl = document.getElementById("c500-genero-search");

        if (!listEl) return;

        const renderList = () => {

            const query = (searchEl.value || "").toLowerCase().trim();

            const items = CONFIG.CANAL500_FORM.generos.filter(g => !query || g.toLowerCase().includes(query));

            listEl.innerHTML = items.length
                ? items.map(g => `
                    <label class="maf-check">
                        <input type="radio" name="c500-genero-radio" data-value="${g}" ${this.state.genero === g ? "checked" : ""}>
                        ${g}
                    </label>
                `).join("")
                : `<p class="maf-empty">Nenhum resultado.</p>`;

            Array.from(listEl.querySelectorAll("input")).forEach(input => {

                input.addEventListener("change", () => {

                    this.state.genero = input.dataset.value;

                    this.updateSubmitState();

                });

            });

        };

        renderList();

        if (searchEl && !searchEl.dataset.bound) {

            searchEl.dataset.bound = "1";

            searchEl.addEventListener("input", renderList);

        }

    },

    /* ======================================================
       STATUS DE VEICULAÇÃO
    ====================================================== */

    renderStatusVeiculacao() {

        const container = document.getElementById("c500-status-veiculacao");

        if (!container) return;

        container.innerHTML = CONFIG.CANAL500_FORM.statusVeiculacao.map(status => `
            <label class="maf-radio">
                <input type="radio" name="c500-status-radio" value="${status}" ${this.state.statusVeiculacao === status ? "checked" : ""}>
                ${status}
            </label>
        `).join("");

        Array.from(container.querySelectorAll("input")).forEach(input => {

            input.addEventListener("change", () => {

                this.state.statusVeiculacao = input.value;

                this.updateSubmitState();

            });

        });

    },

    /* ======================================================
       RESPONSÁVEL
    ====================================================== */

    renderResponsavel() {

        const container = document.getElementById("c500-responsavel");

        if (!container) return;

        container.innerHTML = CONFIG.MANUAL_ACTIONS.owners.map(owner => `
            <label class="maf-check">
                <input type="checkbox" data-value="${owner}" ${this.state.responsavel.has(owner) ? "checked" : ""}>
                ${owner}
            </label>
        `).join("");

        Array.from(container.querySelectorAll("input")).forEach(input => {

            input.addEventListener("change", () => {

                if (input.checked) {
                    this.state.responsavel.add(input.dataset.value);
                }
                else {
                    this.state.responsavel.delete(input.dataset.value);
                }

                this.updateSubmitState();

            });

        });

    },

    /* ======================================================
       CAMPOS SIMPLES
    ====================================================== */

    bindSimpleFields() {

        const acao = document.getElementById("c500-acao");
        acao.addEventListener("input", () => {
            this.state.acaoProspectada = acao.value;
            this.updateSubmitState();
        });

        const artistas = document.getElementById("c500-artistas");
        artistas.addEventListener("input", () => {
            this.state.artistas = artistas.value;
            this.updateSubmitState();
        });

        const entrada = document.getElementById("c500-entrada");
        entrada.addEventListener("change", () => {
            this.state.entrada = entrada.value;
            this.updateSubmitState();
        });

        const saida = document.getElementById("c500-saida");
        saida.addEventListener("change", () => {
            this.state.saida = saida.value;
            this.updateSubmitState();
        });

        const programa = document.getElementById("c500-programa");
        programa.addEventListener("input", () => {
            this.state.programa = programa.value;
        });

        const comentarios = document.getElementById("c500-comentarios");
        const comentariosCount = document.getElementById("c500-comentarios-count");
        if (comentarios) {
            comentarios.addEventListener("input", () => {
                this.state.comentarios = comentarios.value;
                comentariosCount.textContent = `${comentarios.value.length} / ${CONFIG.CANAL500_FORM.maxTextLength}`;
            });
        }

        const evidencias = document.getElementById("c500-evidencias");
        const evidenciasCount = document.getElementById("c500-evidencias-count");
        evidencias.addEventListener("input", () => {
            this.state.evidenciasTexto = evidencias.value;
            evidenciasCount.textContent = `${evidencias.value.length} / ${CONFIG.CANAL500_FORM.maxTextLength}`;
            this.updateSubmitState();
        });

    },

    /* ======================================================
       UPLOAD DE IMAGENS (só no modo "Apenas registrar" — o modo
       "email" não pede imagem, só o link do material)
    ====================================================== */

    bindImageUpload() {

        const attachBtn = document.getElementById("c500-image-attach-btn");
        const fileInput = document.getElementById("c500-image-input");

        if (!attachBtn || !fileInput) return;

        attachBtn.addEventListener("click", () => fileInput.click());

        fileInput.addEventListener("change", async () => {

            const cfg = CONFIG.CANAL500_FORM;

            const files = Array.from(fileInput.files || []);

            for (const file of files) {

                if (this.state.imagens.length >= cfg.maxImages) {

                    alert(`Máximo de ${cfg.maxImages} imagens.`);
                    break;

                }

                if (file.size > cfg.maxImageBytes) {

                    alert(`"${file.name}" passa de 5MB e não foi anexada.`);
                    continue;

                }

                const base64 = await this.fileToBase64(file);

                this.state.imagens.push({
                    filename: file.name,
                    mimeType: file.type,
                    base64,
                    previewUrl: URL.createObjectURL(file)
                });

            }

            fileInput.value = "";

            this.renderImagePreviews();

            this.updateSubmitState();

        });

    },

    renderImagePreviews() {

        const container = document.getElementById("c500-image-previews");

        if (!container) return;

        container.innerHTML = this.state.imagens.map((img, index) => `
            <div class="maf-image-preview">
                <img src="${img.previewUrl}" alt="${img.filename}">
                <button type="button" data-index="${index}" aria-label="Remover imagem">✕</button>
            </div>
        `).join("");

        Array.from(container.querySelectorAll("button")).forEach(btn => {

            btn.addEventListener("click", () => {

                const index = Number(btn.dataset.index);
                this.state.imagens.splice(index, 1);
                this.renderImagePreviews();
                this.updateSubmitState();

            });

        });

    },

    /* ======================================================
       IMAGENS (compartilhado com o modal de "Enviar evidência")
    ====================================================== */

    fileToBase64(file) {

        return new Promise((resolve, reject) => {

            const reader = new FileReader();

            reader.onload = () => {
                const base64 = String(reader.result).split(",")[1] || "";
                resolve(base64);
            };

            reader.onerror = reject;

            reader.readAsDataURL(file);

        });

    },

    /* ======================================================
       VALIDAÇÃO
    ====================================================== */

    validate() {

        const errors = [];

        if (!this.state.acaoProspectada.trim()) errors.push("Preencha a Ação Prospectada.");
        if (!this.state.artistas.trim()) errors.push("Preencha os Artistas.");
        if (!this.state.parceiro) errors.push("Selecione o Parceiro.");
        if (!this.state.genero.trim()) errors.push("Preencha o Gênero.");
        if (!this.state.entrada) errors.push("Preencha a data de Entrada.");
        if (!this.state.saida) errors.push("Preencha a data de Saída.");
        if (!this.state.statusVeiculacao) errors.push("Selecione o Status de Veiculação.");
        if (!this.state.responsavel.size) errors.push("Selecione ao menos um Responsável.");

        const hasEvidencia = this.state.evidenciasTexto.trim() || this.state.imagens.length;
        if (!hasEvidencia) {
            errors.push(this.sendMode === "email"
                ? "Preencha o Link do material."
                : "Inclua ao menos uma evidência (texto ou imagem).");
        }

        return errors;

    },

    updateSubmitState() {

        const submitBtn = document.getElementById("canal500SubmitBtn");

        if (!submitBtn) return;

        submitBtn.disabled = this.validate().length > 0 || this.submitting;

    },

    /* ======================================================
       ENVIO
    ====================================================== */

    async submit() {

        const errors = this.validate();

        const errorsEl = document.getElementById("c500-errors");

        if (errors.length) {

            errorsEl.style.display = "";
            errorsEl.innerHTML = errors.map(e => `<div>• ${e}</div>`).join("");
            return;

        }

        errorsEl.style.display = "none";

        this.submitting = true;
        this.updateSubmitState();

        const submitBtn = document.getElementById("canal500SubmitBtn");
        const originalText = submitBtn.textContent;
        submitBtn.textContent = "Salvando...";

        const payload = {

            token: CONFIG.CANAL500_FORM.sharedSecret,
            acaoProspectada: this.state.acaoProspectada,
            artistas: this.state.artistas,
            parceiro: this.state.parceiro,
            genero: this.state.genero,
            entrada: this.formatDateForSheet(this.state.entrada),
            saida: this.formatDateForSheet(this.state.saida),
            statusVeiculacao: this.state.statusVeiculacao,
            responsavel: [...this.state.responsavel],
            programa: this.state.programa,
            comentarios: this.state.comentarios,
            evidenciasTexto: this.state.evidenciasTexto,
            imagens: this.state.imagens.map(img => ({
                filename: img.filename,
                mimeType: img.mimeType,
                base64: img.base64
            }))

        };

        // Edição de linha existente: sobrescreve em vez de criar.
        if (this.editContext) {
            payload.id = this.editContext.id;
            payload.mode = "update";
        }

        try {

            await this.sendPayload(payload);

            this.submitting = false;

            if (this.editContext) {

                submitBtn.textContent = originalText;
                alert("Alterações enviadas! Confira na página em alguns minutos para garantir que foram salvas.");
                this.closeForm();

            }
            else if (this.sendMode === "email") {

                this.renderEmailStep();

            }
            else {

                submitBtn.textContent = originalText;
                alert("Envio registrado! Confira na página em alguns minutos para garantir que foi salvo.");
                this.closeForm();

            }

        }
        catch (error) {

            console.error(error);

            errorsEl.style.display = "";
            errorsEl.innerHTML = `<div>• Não foi possível conectar. O envio NÃO foi salvo — verifique sua conexão e tente de novo.</div>`;

            this.submitting = false;
            submitBtn.textContent = originalText;
            this.updateSubmitState();

        }

    },

    /* ======================================================
       PASSO PÓS-ENVIO (só no modo "email"): troca o corpo do
       modal por um resumo + botão pra abrir o Gmail já com o
       e-mail pro Canal Like pronto (assunto, corpo e
       destinatários preenchidos, editável antes de mandar).
    ====================================================== */

    renderEmailStep() {

        const body = document.getElementById("canal500FormBody");
        const footer = document.querySelector("#canal500FormModal .maf-form-footer");

        if (!body || !footer) return;

        body.innerHTML = `
            <div class="maf-email-step">
                <p class="maf-email-step-msg">✅ Envio registrado! Agora, formalize a solicitação para a equipe do Canal Like.</p>
                <button type="button" class="data-table-link-btn maf-email-step-btn" id="c500-send-email-btn">✉️ Enviar e-mail para Canal Like</button>
            </div>
        `;

        footer.innerHTML = `
            <button type="button" id="canal500EmailDoneBtn" class="data-table-csv-btn">Fechar</button>
        `;

        document.getElementById("c500-send-email-btn").addEventListener("click", () => this.openGmailCompose());
        document.getElementById("canal500EmailDoneBtn").addEventListener("click", () => this.closeForm());

    },

    openGmailCompose() {

        const to = "henrique@canallike.com.br";

        const cc = [
            "Jeanine Brandão <jeanine@canallike.com.br>",
            "CRISTIANE CAROLINE TRAVAGIM <cristiane.travagim@claro.com.br>",
            "Myriam Porto <myriam@canallike.com.br>",
            "Mariana Lopes <mariana.lopes@canallike.com.br>",
            "Marketing <marketing@imusica.com.br>"
        ].join(",");

        const subject = `Claro música | Canal 500 - ${this.state.acaoProspectada}`;

        const body = `Oi, Henrique! Tudo bem? \n\nPoderia incluir na programação do Canal 500 entre ${this.formatDateForSheet(this.state.entrada)} e ${this.formatDateForSheet(this.state.saida)}, por favor?\n\n \nLink do material: ${this.state.evidenciasTexto}\n\nAbraços!`;

        const url = `https://mail.google.com/mail/?view=cm&fs=1`
            + `&to=${encodeURIComponent(to)}`
            + `&cc=${encodeURIComponent(cc)}`
            + `&su=${encodeURIComponent(subject)}`
            + `&body=${encodeURIComponent(body)}`;

        window.open(url, "_blank");

    },

    sendPayload(payload) {

        return fetch(CONFIG.CANAL500_FORM.webAppUrl, {

            method: "POST",
            mode: "no-cors",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify(payload)

        });

    },

    /* Muda o Status de Veiculação de uma linha já existente (só
       funciona pra linhas com ID real). "no-cors" não deixa a
       gente confirmar de verdade que salvou — a UI já atualiza
       otimista assim que o fetch não estoura erro de rede. */
    updateStatus(row, newStatus) {

        return this.sendPayload({
            token: CONFIG.CANAL500_FORM.sharedSecret,
            mode: "updateStatus",
            id: row.id,
            statusVeiculacao: newStatus
        });

    },

    formatDateForSheet(value) {

        if (!value) return "";

        const [year, month, day] = value.split("-");

        return `${day}/${month}/${year}`;

    },

    /* ======================================================
       MODAL: ENVIAR EVIDÊNCIA (linha já existente)
    ====================================================== */

    bindEvidenceModal() {

        const modal = document.getElementById("canal500EvidenceModal");

        if (!modal) return;

        modal.addEventListener("click", (event) => {
            if (event.target === modal) this.closeEvidenceForm();
        });

        const closeBtn = document.getElementById("canal500EvidenceClose");
        if (closeBtn) closeBtn.addEventListener("click", () => this.closeEvidenceForm());

        const cancelBtn = document.getElementById("canal500EvidenceCancelBtn");
        if (cancelBtn) cancelBtn.addEventListener("click", () => this.closeEvidenceForm());

        const submitBtn = document.getElementById("canal500EvidenceSubmitBtn");
        if (submitBtn) submitBtn.addEventListener("click", () => this.submitEvidence());

    },

    openEvidenceForm(row) {

        if (!row.id) {

            alert("Essa linha ainda não tem um ID (foi cadastrada manualmente antes do formulário existir), então não dá pra anexar evidência direto por aqui. Peça pra Rachel adicionar o ID dela na planilha.");
            return;

        }

        this.evidenceState = this.emptyEvidenceState();
        this.evidenceState.rowId = row.id;
        this.evidenceState.label = row.acaoProspectada;

        const modal = document.getElementById("canal500EvidenceModal");
        if (!modal) return;

        const subtitle = document.getElementById("canal500EvidenceSubtitle");
        if (subtitle) subtitle.textContent = row.acaoProspectada;

        const cfg = CONFIG.CANAL500_FORM;

        const body = document.getElementById("canal500EvidenceBody");

        body.innerHTML = `
            <div class="maf-field">
                <label class="maf-label">Evidências</label>
                <textarea class="maf-textarea" id="c500-ev-texto" maxlength="${cfg.maxTextLength}" placeholder="Cole links aqui, se tiver..."></textarea>
                <input type="file" id="c500-ev-image-input" accept="image/*" multiple style="display:none;">
                <button type="button" class="data-table-csv-btn" id="c500-ev-attach-btn">📎 Anexar imagem (até ${cfg.maxImages}, 5MB cada)</button>
                <div class="maf-image-previews" id="c500-ev-previews"></div>
            </div>
            <div class="maf-errors" id="c500-ev-errors" style="display:none;"></div>
        `;

        const textoEl = document.getElementById("c500-ev-texto");
        textoEl.addEventListener("input", () => {
            this.evidenceState.evidenciasTexto = textoEl.value;
            this.updateEvidenceSubmitState();
        });

        const attachBtn = document.getElementById("c500-ev-attach-btn");
        const fileInput = document.getElementById("c500-ev-image-input");

        attachBtn.addEventListener("click", () => fileInput.click());

        fileInput.addEventListener("change", async () => {

            const files = Array.from(fileInput.files || []);

            for (const file of files) {

                if (this.evidenceState.imagens.length >= cfg.maxImages) {
                    alert(`Máximo de ${cfg.maxImages} imagens.`);
                    break;
                }

                if (file.size > cfg.maxImageBytes) {
                    alert(`"${file.name}" passa de 5MB e não foi anexada.`);
                    continue;
                }

                const base64 = await this.fileToBase64(file);

                this.evidenceState.imagens.push({
                    filename: file.name,
                    mimeType: file.type,
                    base64,
                    previewUrl: URL.createObjectURL(file)
                });

            }

            fileInput.value = "";
            this.renderEvidenceImagePreviews();
            this.updateEvidenceSubmitState();

        });

        this.updateEvidenceSubmitState();

        modal.classList.add("open");
        document.body.classList.add("modal-open");

    },

    renderEvidenceImagePreviews() {

        const container = document.getElementById("c500-ev-previews");

        if (!container) return;

        container.innerHTML = this.evidenceState.imagens.map((img, index) => `
            <div class="maf-image-preview">
                <img src="${img.previewUrl}" alt="${img.filename}">
                <button type="button" data-index="${index}" aria-label="Remover imagem">✕</button>
            </div>
        `).join("");

        Array.from(container.querySelectorAll("button")).forEach(btn => {

            btn.addEventListener("click", () => {
                const index = Number(btn.dataset.index);
                this.evidenceState.imagens.splice(index, 1);
                this.renderEvidenceImagePreviews();
                this.updateEvidenceSubmitState();
            });

        });

    },

    updateEvidenceSubmitState() {

        const submitBtn = document.getElementById("canal500EvidenceSubmitBtn");

        if (!submitBtn) return;

        const hasEvidencia = this.evidenceState.evidenciasTexto.trim() || this.evidenceState.imagens.length;

        submitBtn.disabled = !hasEvidencia;

    },

    closeEvidenceForm() {

        const modal = document.getElementById("canal500EvidenceModal");
        if (!modal) return;

        modal.classList.remove("open");
        document.body.classList.remove("modal-open");

    },

    async submitEvidence() {

        const errorsEl = document.getElementById("c500-ev-errors");

        const submitBtn = document.getElementById("canal500EvidenceSubmitBtn");

        const originalText = submitBtn.textContent;

        submitBtn.textContent = "Enviando...";
        submitBtn.disabled = true;

        const payload = {

            token: CONFIG.CANAL500_FORM.sharedSecret,
            mode: "attachEvidence",
            id: this.evidenceState.rowId,
            evidenciasTexto: this.evidenceState.evidenciasTexto,
            imagens: this.evidenceState.imagens.map(img => ({
                filename: img.filename,
                mimeType: img.mimeType,
                base64: img.base64
            }))

        };

        try {

            await this.sendPayload(payload);

            alert("Evidência enviada! Confira na planilha em alguns minutos.");

            submitBtn.textContent = originalText;

            this.closeEvidenceForm();

        }
        catch (error) {

            console.error(error);

            errorsEl.style.display = "";
            errorsEl.innerHTML = `<div>• Não foi possível conectar. Tente de novo.</div>`;

            submitBtn.textContent = originalText;
            submitBtn.disabled = false;

        }

    }

};
