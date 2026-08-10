/**
 * ==========================================================
 * AÇÕES MANUAIS — "Editar ou Adicionar nova ação"
 * ----------------------------------------------------------
 * Botão na Área de Marketing que abre um formulário pop-up
 * pra registrar ações pontuais/manuais direto numa planilha
 * dedicada (via Apps Script Web App), sem precisar mexer na
 * planilha "Dados da área".
 *
 * Fase 1 (esta implementação): só "Adicionar nova ação".
 * "Editar ação existente" ainda não está disponível — o botão
 * já existe na tela, mas avisa que está em construção.
 * ==========================================================
 */

const ManualActionsForm = {

    initialized: false,

    submitting: false,

    detalheActiveTag: "todos",

    state: null,

    /* null (modo "Adicionar nova ação") ou
       { mode: "edit"|"duplicate", originId, warning } */
    editContext: null,

    emptyState() {

        return {

            pais: new Set(),
            area: "",
            detalhe: new Set(),
            dataProposta: "",
            resumo: "",
            gravadora: new Set(),
            gravadoraNaoSeAplica: false,
            regional: new Set(),
            regionalNaoSeAplica: false,
            status: "",
            responsavel: new Set(),
            dataFinal: "",
            informacoesExtras: "",
            evidenciasTexto: "",
            imagens: []

        };

    },

    /* ======================================================
       INIT — liga o botão e os modais (chamado uma vez)
    ====================================================== */

    init() {

        if (this.initialized) return this;

        this.state = this.emptyState();

        const openBtn = document.getElementById("manualActionsBtn");

        if (openBtn) {

            openBtn.addEventListener("click", () => this.openChoiceModal());

        }

        this.bindChoiceModal();
        this.bindFormModal();
        this.bindHistoryModal();
        this.bindEditListModal();

        this.initialized = true;

        return this;

    },

    /* ======================================================
       MODAL DE ESCOLHA (Editar existente / Adicionar nova)
    ====================================================== */

    bindChoiceModal() {

        const modal = document.getElementById("manualActionChoiceModal");

        if (!modal) return;

        modal.addEventListener("click", (event) => {
            if (event.target === modal) this.closeChoiceModal();
        });

        const closeBtn = document.getElementById("manualActionChoiceClose");
        if (closeBtn) closeBtn.addEventListener("click", () => this.closeChoiceModal());

        const addBtn = document.getElementById("manualActionChoiceAdd");
        if (addBtn) addBtn.addEventListener("click", () => {
            this.closeChoiceModal();
            this.openAddForm();
        });

        const editBtn = document.getElementById("manualActionChoiceEdit");
        if (editBtn) editBtn.addEventListener("click", () => {
            this.closeChoiceModal();
            this.openEditListModal();
        });

    },

    openChoiceModal() {

        const modal = document.getElementById("manualActionChoiceModal");
        if (!modal) return;

        modal.classList.add("open");
        document.body.classList.add("modal-open");

    },

    closeChoiceModal() {

        const modal = document.getElementById("manualActionChoiceModal");
        if (!modal) return;

        modal.classList.remove("open");
        document.body.classList.remove("modal-open");

    },

    /* ======================================================
       MODAL DO FORMULÁRIO — "Adicionar nova ação"
    ====================================================== */

    bindFormModal() {

        const modal = document.getElementById("manualActionFormModal");

        if (!modal) return;

        modal.addEventListener("click", (event) => {
            if (event.target === modal) this.confirmCloseForm();
        });

        const closeBtn = document.getElementById("manualActionFormClose");
        if (closeBtn) closeBtn.addEventListener("click", () => this.confirmCloseForm());

        const cancelBtn = document.getElementById("manualActionCancelBtn");
        if (cancelBtn) cancelBtn.addEventListener("click", () => this.confirmCloseForm());

        const backBtn = document.getElementById("manualActionFormBack");
        if (backBtn) backBtn.addEventListener("click", () => this.confirmBackToList());

        const submitBtn = document.getElementById("manualActionSubmitBtn");
        if (submitBtn) submitBtn.addEventListener("click", () => this.submit());

    },

    confirmCloseForm() {

        const hasContent = this.state.resumo || this.state.pais.size || this.state.detalhe.size;

        if (hasContent && !confirm("Fechar sem salvar? As informações preenchidas serão perdidas.")) {
            return;
        }

        this.closeAddForm();

    },

    confirmBackToList() {

        const hasContent = this.state.resumo || this.state.pais.size || this.state.detalhe.size;

        if (hasContent && !confirm("Tem certeza que deseja voltar? Suas alterações serão descartadas.")) {
            return;
        }

        this.closeAddForm();
        this.openEditListModal();

    },

    openAddForm() {

        this.state = this.emptyState();
        this.detalheActiveTag = "todos";
        this.editContext = null;

        const modal = document.getElementById("manualActionFormModal");
        if (!modal) return;

        const titleEl = document.getElementById("manualActionFormTitle");
        if (titleEl) titleEl.textContent = "Adicionar nova ação";

        const subtitleEl = document.getElementById("manualActionFormSubtitle");
        if (subtitleEl) subtitleEl.style.display = "none";

        const warningEl = document.getElementById("manualActionFormWarning");
        if (warningEl) warningEl.style.display = "none";

        const backBtn = document.getElementById("manualActionFormBack");
        if (backBtn) backBtn.style.display = "none";

        const submitBtn = document.getElementById("manualActionSubmitBtn");
        if (submitBtn) submitBtn.textContent = "Salvar ação";

        this.renderForm();

        modal.classList.add("open");
        document.body.classList.add("modal-open");

    },

    /* ======================================================
       BLOQUEIO DE CAMPOS NO MODO "DUPLICAR"

       Resumo, Gravadora, Regional e Responsável vêm da ação
       original e não podem ser alterados aqui — só dá pra
       ADICIONAR informação (Detalhe extra, evidências, texto),
       nunca mudar o que já existe. Isso deixa claro que estamos
       criando um espelho, não editando a ação original.
    ====================================================== */

    lockDuplicateFields() {

        const addLockedNote = (fieldEl, text) => {

            if (!fieldEl || fieldEl.querySelector(".maf-locked-note")) return;

            const note = document.createElement("small");
            note.className = "maf-locked-note";
            note.textContent = `🔒 ${text}`;

            fieldEl.appendChild(note);

        };

        // Resumo da ação
        const resumo = document.getElementById("maf-resumo");
        if (resumo) {
            resumo.readOnly = true;
            resumo.classList.add("maf-locked");
            addLockedNote(resumo.closest(".maf-field"), "Não editável — pertence à ação original.");
        }

        // Gravadora
        const gravadoraSearch = document.getElementById("maf-gravadora-search");
        const gravadoraNaoAplica = document.getElementById("maf-gravadora-nao-aplica");
        const gravadoraImusica = document.getElementById("maf-gravadora-imusica");
        const gravadoraList = document.getElementById("maf-gravadora-list");

        if (gravadoraSearch) gravadoraSearch.disabled = true;
        if (gravadoraNaoAplica) gravadoraNaoAplica.disabled = true;
        if (gravadoraImusica) gravadoraImusica.disabled = true;
        if (gravadoraList) {
            gravadoraList.classList.add("maf-disabled");
            Array.from(gravadoraList.querySelectorAll("input")).forEach(i => { i.disabled = true; });
        }
        addLockedNote(gravadoraSearch?.closest(".maf-field"), "Não editável — pertence à ação original.");

        // Regional
        const regionalNaoAplica = document.getElementById("maf-regional-nao-aplica");
        const regionalList = document.getElementById("maf-regional-list");

        if (regionalNaoAplica) regionalNaoAplica.disabled = true;
        if (regionalList) {
            regionalList.classList.add("maf-disabled");
            Array.from(regionalList.querySelectorAll("input")).forEach(i => { i.disabled = true; });
        }
        addLockedNote(regionalList?.closest(".maf-field"), "Não editável — pertence à ação original.");

        // Responsável
        const responsavelList = document.getElementById("maf-responsavel");
        if (responsavelList) {
            responsavelList.classList.add("maf-disabled");
            Array.from(responsavelList.querySelectorAll("input")).forEach(i => { i.disabled = true; });
        }
        addLockedNote(responsavelList?.closest(".maf-field"), "Não editável — pertence à ação original.");

    },

    /* ======================================================
       EDITAR AÇÃO EXISTENTE — LISTA
    ====================================================== */

    bindEditListModal() {

        const modal = document.getElementById("manualActionEditListModal");

        if (!modal) return;

        modal.addEventListener("click", (event) => {
            if (event.target === modal) this.closeEditListModal();
        });

        const closeBtn = document.getElementById("manualActionEditListClose");
        if (closeBtn) closeBtn.addEventListener("click", () => this.closeEditListModal());

        const searchEl = document.getElementById("manualActionEditListSearch");
        if (searchEl) searchEl.addEventListener("input", () => this.renderEditList());

    },

    openEditListModal() {

        const modal = document.getElementById("manualActionEditListModal");

        if (!modal) return;

        const notice = modal.querySelector(".maf-editlist-notice");
        if (notice) notice.textContent = CONFIG.MANUAL_ACTIONS.editListNotice || "";

        const subtitle = document.getElementById("manualActionEditListSubtitle");
        if (subtitle) subtitle.textContent = "";

        const searchEl = document.getElementById("manualActionEditListSearch");
        if (searchEl) searchEl.value = "";

        this.renderEditList();

        modal.classList.add("open");
        document.body.classList.add("modal-open");

    },

    closeEditListModal() {

        const modal = document.getElementById("manualActionEditListModal");
        if (!modal) return;

        modal.classList.remove("open");
        document.body.classList.remove("modal-open");

    },

    getEditableActionsList() {

        const rows = (typeof getMergedData === "function" ? getMergedData() : []);

        return rows
            .filter(row => !(typeof Metrics !== "undefined" && Metrics.isPhraseology(row)))
            .slice()
            .sort((a, b) => {
                const da = a.proposalDate ? a.proposalDate.getTime() : 0;
                const db = b.proposalDate ? b.proposalDate.getTime() : 0;
                return db - da;
            });

    },

    isDetailLocked(detail) {

        const rules = CONFIG.MANUAL_ACTIONS.detailEditRules || {};

        return splitMultiValue(detail).some(d => rules[d] && rules[d].locked);

    },

    /* Detalhes cujo STATUS especificamente não é editável por
       aqui (mesmo a ação em si continuando editável) — ex.:
       Saludo Lanzamiento / Artista de la semana, atualizados pela
       planilha da Colômbia. Retorna a mensagem do aviso, ou null
       se o status dessa ação não estiver travado. */
    getStatusLockMessage(detail) {

        const rules = CONFIG.MANUAL_ACTIONS.detailEditRules || {};

        const locked = splitMultiValue(detail).find(d => rules[d] && rules[d].statusLocked);

        return locked ? rules[locked].statusLockedMessage : null;

    },

    escapeAttr(text) {

        return String(text || "").replace(/"/g, "&quot;");

    },

    formatDateBR(date) {

        if (!date) return "—";

        return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });

    },

    renderEditList() {

        const body = document.getElementById("manualActionEditListBody");

        if (!body) return;

        const searchEl = document.getElementById("manualActionEditListSearch");

        const query = (searchEl?.value || "").toLowerCase().trim();

        const list = this.getEditableActionsList().filter(row => {

            if (!query) return true;

            const haystack = [row.summary, row.label, row.detail, row.owner, row.regional]
                .join(" ")
                .toLowerCase();

            return haystack.includes(query);

        });

        if (!list.length) {

            body.innerHTML = `<p class="maf-editlist-empty">Nenhuma ação encontrada.</p>`;

            return;

        }

        body.innerHTML = list.map((row, index) => {

            const locked = this.isDetailLocked(row.detail);

            const badge = row._merged
                ? `<span class="maf-editlist-badge">${row._rows.length} canais</span>`
                : "";

            const lockedBadge = locked
                ? `<span class="maf-editlist-badge maf-editlist-badge--locked">Não editável</span>`
                : "";

            const metaText = `${this.formatDateBR(row.proposalDate)} · ${row.status || "—"} · ${row.label || "—"} · ${row.regional || "—"} · ${row.owner || "—"} · ${row.detail || "—"}`;

            return `
                <div class="maf-editlist-row ${locked ? "maf-editlist-row--locked" : ""}" data-index="${index}">
                    <div class="maf-editlist-row-top">
                        <span title="${this.escapeAttr(row.summary || "(sem resumo)")}">${row.summary || "(sem resumo)"}</span>
                        <span>${badge}${lockedBadge}</span>
                    </div>
                    <div class="maf-editlist-row-meta" title="${this.escapeAttr(metaText)}">
                        ${metaText}
                    </div>
                </div>
            `;

        }).join("");

        Array.from(body.querySelectorAll(".maf-editlist-row:not(.maf-editlist-row--locked)")).forEach(el => {

            el.addEventListener("click", () => {

                const row = list[Number(el.dataset.index)];

                if (row._merged) {
                    this.renderEditListDrilldown(row);
                }
                else {
                    this.closeEditListModal();
                    this.openEditForm(row);
                }

            });

        });

    },

    /* Ação fundida: mostra as linhas originais separadas antes
       de escolher qual delas editar/duplicar. */
    renderEditListDrilldown(mergedRow) {

        const body = document.getElementById("manualActionEditListBody");

        if (!body) return;

        const rows = mergedRow._rows;

        body.innerHTML = `
            <button type="button" class="maf-editlist-back" id="maf-editlist-back">← Voltar pra lista</button>
            ${rows.map((row, index) => {

                const source = ActionsMerge.getSourceLabel(row.id) || "Ações Manuais";

                return `
                    <div class="maf-editlist-row" data-index="${index}">
                        <div class="maf-editlist-row-top">
                            <span>${row.detail || "(sem detalhe)"}</span>
                            <span class="maf-editlist-badge">${source}</span>
                        </div>
                        <div class="maf-editlist-row-meta">
                            Status: ${row.status || "—"}
                        </div>
                    </div>
                `;

            }).join("")}
        `;

        const backBtn = document.getElementById("maf-editlist-back");
        if (backBtn) backBtn.addEventListener("click", () => this.renderEditList());

        Array.from(body.querySelectorAll(".maf-editlist-row")).forEach(el => {

            el.addEventListener("click", () => {

                const row = rows[Number(el.dataset.index)];

                this.closeEditListModal();
                this.openEditForm(row);

            });

        });

    },

    /* ======================================================
       ABRIR FORMULÁRIO EM MODO EDIÇÃO / DUPLICAÇÃO
    ====================================================== */

    dateToInputValue(date) {

        if (!(date instanceof Date) || isNaN(date)) return "";

        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, "0");
        const d = String(date.getDate()).padStart(2, "0");

        return `${y}-${m}-${d}`;

    },

    buildStateFromRow(row) {

        const state = this.emptyState();

        splitMultiValue(row.country).forEach(v => state.pais.add(v));

        state.area = row.area || "";

        splitMultiValue(row.detail).forEach(v => state.detalhe.add(v));

        state.dataProposta = this.dateToInputValue(row.proposalDate);

        state.resumo = row.summary || "";

        const gravadoraValues = splitMultiValue(row.label);

        if (gravadoraValues.includes("Não se aplica") || !gravadoraValues.length) {
            state.gravadoraNaoSeAplica = true;
        }
        else {
            gravadoraValues.forEach(v => {
                if (v === "iMusica (ott)") state.gravadoraImusica = true;
                else state.gravadora.add(v);
            });
        }

        const regionalValues = splitMultiValue(row.regional);

        if (regionalValues.includes("Não se aplica") || !regionalValues.length) {
            state.regionalNaoSeAplica = true;
        }
        else {
            regionalValues.forEach(v => state.regional.add(v));
        }

        state.status = row.status || "";

        splitMultiValue(row.owner).forEach(v => state.responsavel.add(v));

        state.dataFinal = this.dateToInputValue(row.publishDate);

        state.informacoesExtras = row.extra || "";

        return state;

    },

    openEditForm(row) {

        const isManual = ActionsMerge.isManualOrigin(row);

        const rules = CONFIG.MANUAL_ACTIONS.detailEditRules || {};

        const warningRule = splitMultiValue(row.detail)
            .map(d => rules[d])
            .find(r => r && r.warning);

        this.state = this.buildStateFromRow(row);
        this.detalheActiveTag = "todos";

        this.editContext = isManual
            ? { mode: "edit", originId: row.id, warning: null, lockedDetails: [] }
            : { mode: "duplicate", originId: row.id, warning: warningRule ? warningRule.warning : null, lockedDetails: splitMultiValue(row.detail) };

        const modal = document.getElementById("manualActionFormModal");
        if (!modal) return;

        const titleEl = document.getElementById("manualActionFormTitle");
        if (titleEl) {
            titleEl.textContent = isManual ? "Editar ação" : "Adicionar canal a uma ação existente";
        }

        const subtitleEl = document.getElementById("manualActionFormSubtitle");
        if (subtitleEl) {
            const dateStr = this.formatDateBR(row.proposalDate);
            subtitleEl.textContent = `${row.summary || "(sem resumo)"} · ${dateStr}`;
            subtitleEl.title = subtitleEl.textContent;
            subtitleEl.style.display = "";
        }

        const backBtn = document.getElementById("manualActionFormBack");
        if (backBtn) backBtn.style.display = "";

        const warningEl = document.getElementById("manualActionFormWarning");
        if (warningEl) {

            if (this.editContext.warning) {

                warningEl.style.display = "";
                warningEl.textContent = this.editContext.warning;

            }
            else {

                warningEl.style.display = "none";

            }

        }

        const submitBtn = document.getElementById("manualActionSubmitBtn");
        if (submitBtn) {
            submitBtn.textContent = isManual ? "Salvar alterações" : "Salvar como novo canal";
        }

        this.renderForm();

        // Campos simples não são re-preenchidos pelo state
        // automaticamente no HTML — setamos o value direto.
        const setVal = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.value = value || "";
        };

        setVal("maf-data-proposta", this.state.dataProposta);
        setVal("maf-data-final", this.state.dataFinal);
        setVal("maf-resumo", this.state.resumo);
        setVal("maf-extra", this.state.informacoesExtras);

        const extraCount = document.getElementById("maf-extra-count");
        if (extraCount) extraCount.textContent = `${this.state.informacoesExtras.length} / ${CONFIG.MANUAL_ACTIONS.maxTextLength}`;

        const dataFinalRequired = document.getElementById("maf-data-final-required");
        if (dataFinalRequired) dataFinalRequired.style.display = this.state.status === "Concluída" ? "" : "none";

        if (this.editContext.mode === "duplicate") {

            const statusField = document.getElementById("maf-status");

            if (statusField && !document.getElementById("maf-status-duplicate-hint")) {

                const hint = document.createElement("small");

                hint.id = "maf-status-duplicate-hint";
                hint.className = "maf-hint";
                hint.style.display = "block";
                hint.style.marginTop = "6px";
                hint.textContent = "A mudança de status aqui irá refletir apenas no novo tipo de ação sendo criada. A ação original tem a lógica de status importada automaticamente.";

                statusField.parentElement.appendChild(hint);

            }

            this.lockDuplicateFields();

        }

        this.updateSubmitState();

        modal.classList.add("open");
        document.body.classList.add("modal-open");

    },

    closeAddForm() {

        const modal = document.getElementById("manualActionFormModal");
        if (!modal) return;

        modal.classList.remove("open");
        document.body.classList.remove("modal-open");

        this.editContext = null;

    },

    /* ======================================================
       RENDER GERAL DO FORMULÁRIO
    ====================================================== */

    renderForm() {

        const cfg = CONFIG.MANUAL_ACTIONS;

        const body = document.getElementById("manualActionFormBody");

        if (!body) return;

        body.innerHTML = `

            <div class="maf-field">
                <label class="maf-label">País <span class="maf-required">*</span></label>
                <div class="maf-chip-group" id="maf-pais"></div>
            </div>

            <div class="maf-field">
                <label class="maf-label">Área <span class="maf-required">*</span></label>
                <div class="maf-radio-group" id="maf-area"></div>
            </div>

            <div class="maf-field">
                <label class="maf-label">Detalhe <span class="maf-required">*</span></label>
                <div class="maf-selected-chips" id="maf-detalhe-selected"></div>
                <input type="search" class="maf-search" id="maf-detalhe-search" placeholder="Buscar detalhe...">
                <div class="maf-tag-chips" id="maf-detalhe-tags"></div>
                <div class="maf-checkbox-list" id="maf-detalhe-list"></div>
            </div>

            <div class="maf-field-row">

                <div class="maf-field">
                    <label class="maf-label">Data da proposta <span class="maf-required">*</span></label>
                    <input type="date" class="maf-input" id="maf-data-proposta" min="2025-01-01">
                </div>

                <div class="maf-field" id="maf-data-final-wrap">
                    <label class="maf-label">Data final / publicação <span class="maf-required" id="maf-data-final-required" style="display:none;">*</span></label>
                    <input type="date" class="maf-input" id="maf-data-final" min="2025-01-01">
                </div>

            </div>

            <div class="maf-field">
                <label class="maf-label">Resumo da ação <span class="maf-required">*</span></label>
                <small class="maf-hint">Descreva a ação brevemente, de forma facilmente identificável.</small>
                <input type="text" class="maf-input" id="maf-resumo">
            </div>

            <div class="maf-field">
                <label class="maf-label">Gravadora <span class="maf-required">*</span></label>
                <div class="maf-selected-chips" id="maf-gravadora-selected"></div>
                <input type="search" class="maf-search" id="maf-gravadora-search" placeholder="Buscar gravadora...">
                <div class="maf-checkbox-list" id="maf-gravadora-list"></div>
                <div class="maf-special-checks">
                    <label class="maf-check"><input type="checkbox" id="maf-gravadora-nao-aplica"> Não se aplica</label>
                    <label class="maf-check"><input type="checkbox" id="maf-gravadora-imusica"> iMusica (ott)</label>
                </div>
            </div>

            <div class="maf-field">
                <label class="maf-label">Regional <span class="maf-required">*</span></label>
                <div class="maf-special-checks">
                    <label class="maf-check"><input type="checkbox" id="maf-regional-nao-aplica"> Não se aplica</label>
                </div>
                <div class="maf-checkbox-list maf-checkbox-list--compact" id="maf-regional-list"></div>
            </div>

            <div class="maf-field">
                <label class="maf-label">Status <span class="maf-required">*</span></label>
                <div class="maf-radio-group" id="maf-status"></div>
            </div>

            <div class="maf-field">
                <label class="maf-label">Responsável <span class="maf-required">*</span></label>
                <div class="maf-checkbox-list maf-checkbox-list--compact" id="maf-responsavel"></div>
            </div>

            <div class="maf-field">
                <label class="maf-label">Informações extras</label>
                <textarea class="maf-textarea" id="maf-extra" maxlength="${cfg.maxTextLength}"></textarea>
                <small class="maf-charcount" id="maf-extra-count">0 / ${cfg.maxTextLength}</small>
            </div>

            <div class="maf-field">
                <label class="maf-label">Evidências</label>
                <textarea class="maf-textarea" id="maf-evidencias" maxlength="${cfg.maxTextLength}" placeholder="Cole links aqui, se tiver..."></textarea>
                <small class="maf-charcount" id="maf-evidencias-count">0 / ${cfg.maxTextLength}</small>
                <input type="file" id="maf-image-input" accept="image/*" multiple style="display:none;">
                <button type="button" class="data-table-csv-btn" id="maf-image-attach-btn">📎 Anexar imagem (até ${cfg.maxImages}, 5MB cada)</button>
                <div class="maf-image-previews" id="maf-image-previews"></div>
            </div>

            <div class="maf-errors" id="maf-errors" style="display:none;"></div>

        `;

        this.renderPais();
        this.renderArea();
        this.renderDetalheTags();
        this.renderDetalhe();
        this.renderGravadora();
        this.renderRegional();
        this.renderStatus();
        this.renderResponsavel();
        this.bindSimpleFields();
        this.bindImageUpload();
        this.updateSubmitState();

    },

    /* ======================================================
       PAÍS (chips multi-seleção)
    ====================================================== */

    renderPais() {

        const container = document.getElementById("maf-pais");

        if (!container) return;

        container.innerHTML = CONFIG.MANUAL_ACTIONS.countries.map(pais => `
            <button type="button" class="maf-chip ${this.state.pais.has(pais) ? "active" : ""}" data-value="${pais}">${pais}</button>
        `).join("");

        Array.from(container.children).forEach(btn => {

            btn.addEventListener("click", () => {

                const value = btn.dataset.value;

                if (this.state.pais.has(value)) {
                    this.state.pais.delete(value);
                }
                else {

                    this.state.pais.add(value);

                    // Escolheu um país que não é Brasil -> a lista de
                    // Detalhe já abre filtrada em "LatAm" (continua
                    // tudo clicável/adicionável, é só o ponto de
                    // partida que muda).
                    if (value !== "Brasil") {
                        this.detalheActiveTag = "latam";
                    }

                }

                btn.classList.toggle("active");

                this.renderDetalheTags();
                this.renderDetalhe();
                this.updateSubmitState();

            });

        });

    },

    /* ======================================================
       ÁREA (seleção única)
    ====================================================== */

    renderArea() {

        const container = document.getElementById("maf-area");

        if (!container) return;

        container.innerHTML = CONFIG.MANUAL_ACTIONS.areas.map(area => `
            <label class="maf-radio">
                <input type="radio" name="maf-area-radio" value="${area}" ${this.state.area === area ? "checked" : ""}>
                ${area}
            </label>
        `).join("");

        Array.from(container.querySelectorAll("input")).forEach(input => {

            input.addEventListener("change", () => {
                this.state.area = input.value;
                this.updateSubmitState();
            });

        });

    },

    /* ======================================================
       DETALHE (busca + tags de filtro + lista multi-seleção)
    ====================================================== */

    renderDetalheTags() {

        const container = document.getElementById("maf-detalhe-tags");

        if (!container) return;

        const cfg = CONFIG.MANUAL_ACTIONS;

        const hasNonBrasil = [...this.state.pais].some(p => p !== "Brasil");

        const tags = ["todos", "gravadora", "tv", "comunicacao", "regional", "licenciamento", "outros"];

        if (hasNonBrasil || this.state.pais.size === 0) tags.push("latam");

        container.innerHTML = tags.map(tag => `
            <button type="button" class="maf-tag-chip ${this.detalheActiveTag === tag ? "active" : ""}" data-tag="${tag}">
                ${tag === "todos" ? "Todos" : cfg.detailTagLabels[tag]}
            </button>
        `).join("");

        Array.from(container.children).forEach(btn => {

            btn.addEventListener("click", () => {

                this.detalheActiveTag = btn.dataset.tag;

                this.renderDetalheTags();
                this.renderDetalhe();

            });

        });

    },

    renderDetalhe() {

        const listEl = document.getElementById("maf-detalhe-list");
        const searchEl = document.getElementById("maf-detalhe-search");

        if (!listEl) return;

        const query = (searchEl?.value || "").toLowerCase().trim();

        // Ao CRIAR uma ação nova (sem editContext), os Detalhes que
        // são atualizados automaticamente por outras fontes (Canal
        // 500, redes sociais, Barker/Trilho/Banner/BG, postagens da
        // Colômbia) não aparecem como opção — só entram fundidos a
        // partir da ação original, via "Editar ação existente".
        const autoManagedDetails = Object.keys(CONFIG.MANUAL_ACTIONS.detailEditRules || {});

        const items = CONFIG.MANUAL_ACTIONS.details.filter(item => {

            if (!this.editContext && autoManagedDetails.includes(item.value)) return false;

            const matchesTag = this.detalheActiveTag === "todos" || item.tags.includes(this.detalheActiveTag);

            const matchesSearch = !query || item.value.toLowerCase().includes(query);

            return matchesTag && matchesSearch;

        });

        const lockedDetails = (this.editContext && this.editContext.mode === "duplicate")
            ? this.editContext.lockedDetails
            : [];

        listEl.innerHTML = items.length
            ? items.map(item => {

                const isLocked = lockedDetails.includes(item.value);

                return `
                    <label class="maf-check ${isLocked ? "maf-locked" : ""}">
                        <input type="checkbox" data-value="${item.value}" ${this.state.detalhe.has(item.value) ? "checked" : ""} ${isLocked ? "disabled" : ""}>
                        ${item.value}${isLocked ? " 🔒" : ""}
                    </label>
                `;

            }).join("")
            : `<p class="maf-empty">Nenhum resultado.</p>`;

        Array.from(listEl.querySelectorAll("input:not([disabled])")).forEach(input => {

            input.addEventListener("change", () => {

                if (input.checked) {
                    this.state.detalhe.add(input.dataset.value);
                }
                else {
                    this.state.detalhe.delete(input.dataset.value);
                }

                this.renderDetalheSelectedChips();
                this.updateSubmitState();

            });

        });

        this.renderDetalheSelectedChips();

        if (searchEl && !searchEl.dataset.bound) {

            searchEl.dataset.bound = "1";

            searchEl.addEventListener("input", () => this.renderDetalhe());

        }

    },

    renderDetalheSelectedChips() {

        const container = document.getElementById("maf-detalhe-selected");

        if (!container) return;

        if (!this.state.detalhe.size) {
            container.innerHTML = "";
            return;
        }

        const lockedDetails = (this.editContext && this.editContext.mode === "duplicate")
            ? this.editContext.lockedDetails
            : [];

        container.innerHTML = [...this.state.detalhe].map(value => {

            const isLocked = lockedDetails.includes(value);

            return `<span class="maf-selected-chip" data-value="${value}">${value} ${isLocked ? "🔒" : `<button type="button" aria-label="Remover">✕</button>`}</span>`;

        }).join("");

        Array.from(container.querySelectorAll("button")).forEach(btn => {

            btn.addEventListener("click", () => {

                const value = btn.parentElement.dataset.value;

                this.state.detalhe.delete(value);

                this.renderDetalhe();
                this.updateSubmitState();

            });

        });

    },

    /* ======================================================
       GRAVADORA (busca + lista + checkboxes especiais)
    ====================================================== */

    renderGravadora() {

        const listEl = document.getElementById("maf-gravadora-list");
        const searchEl = document.getElementById("maf-gravadora-search");
        const naoAplicaEl = document.getElementById("maf-gravadora-nao-aplica");
        const imusicaEl = document.getElementById("maf-gravadora-imusica");

        if (!listEl) return;

        const renderList = () => {

            const query = (searchEl.value || "").toLowerCase().trim();

            const items = CONFIG.MANUAL_ACTIONS.labels.filter(l => !query || l.toLowerCase().includes(query));

            listEl.innerHTML = items.map(label => `
                <label class="maf-check">
                    <input type="checkbox" data-value="${label}" ${this.state.gravadora.has(label) ? "checked" : ""}>
                    ${label}
                </label>
            `).join("");

            Array.from(listEl.querySelectorAll("input")).forEach(input => {

                input.addEventListener("change", () => {

                    if (input.checked) {
                        this.state.gravadora.add(input.dataset.value);
                    }
                    else {
                        this.state.gravadora.delete(input.dataset.value);
                    }

                    // Selecionar uma gravadora real desmarca "Não se aplica"
                    if (this.state.gravadora.size > 0) {

                        this.state.gravadoraNaoSeAplica = false;
                        naoAplicaEl.checked = false;

                    }

                    this.renderGravadoraSelectedChips();
                    this.setGravadoraListDisabled(this.state.gravadoraNaoSeAplica);
                    this.updateSubmitState();

                });

            });

        };

        renderList();

        this.renderGravadoraSelectedChips();

        if (!searchEl.dataset.bound) {

            searchEl.dataset.bound = "1";
            searchEl.addEventListener("input", renderList);

        }

        if (!naoAplicaEl.dataset.bound) {

            naoAplicaEl.dataset.bound = "1";

            naoAplicaEl.addEventListener("change", () => {

                this.state.gravadoraNaoSeAplica = naoAplicaEl.checked;

                if (naoAplicaEl.checked) {

                    // Mutuamente exclusivo com gravadoras reais e iMusica
                    this.state.gravadora.clear();
                    this.state.gravadoraImusica = false;
                    imusicaEl.checked = false;

                    renderList();

                }

                this.setGravadoraListDisabled(naoAplicaEl.checked);
                this.updateSubmitState();

            });

        }

        if (!imusicaEl.dataset.bound) {

            imusicaEl.dataset.bound = "1";

            imusicaEl.addEventListener("change", () => {

                this.state.gravadoraImusica = imusicaEl.checked;

                if (imusicaEl.checked && this.state.gravadoraNaoSeAplica) {

                    this.state.gravadoraNaoSeAplica = false;
                    naoAplicaEl.checked = false;
                    this.setGravadoraListDisabled(false);

                }

                this.renderGravadoraSelectedChips();
                this.updateSubmitState();

            });

        }

    },

    setGravadoraListDisabled(disabled) {

        const listEl = document.getElementById("maf-gravadora-list");
        const searchEl = document.getElementById("maf-gravadora-search");
        const imusicaEl = document.getElementById("maf-gravadora-imusica");

        if (listEl) listEl.classList.toggle("maf-disabled", disabled);
        if (searchEl) searchEl.disabled = disabled;
        if (imusicaEl) imusicaEl.disabled = disabled;

        Array.from(listEl.querySelectorAll("input")).forEach(i => { i.disabled = disabled; });

    },

    renderGravadoraSelectedChips() {

        const container = document.getElementById("maf-gravadora-selected");

        if (!container) return;

        const values = [...this.state.gravadora];

        if (this.state.gravadoraImusica) values.push("iMusica (ott)");
        if (this.state.gravadoraNaoSeAplica) values.push("Não se aplica");

        if (!values.length) {
            container.innerHTML = "";
            return;
        }

        container.innerHTML = values.map(v => `<span class="maf-selected-chip">${v}</span>`).join("");

    },

    /* ======================================================
       REGIONAL
    ====================================================== */

    renderRegional() {

        const listEl = document.getElementById("maf-regional-list");
        const naoAplicaEl = document.getElementById("maf-regional-nao-aplica");

        if (!listEl) return;

        listEl.innerHTML = CONFIG.MANUAL_ACTIONS.regionals.map(r => `
            <label class="maf-check">
                <input type="checkbox" data-value="${r}" ${this.state.regional.has(r) ? "checked" : ""}>
                ${r}
            </label>
        `).join("");

        Array.from(listEl.querySelectorAll("input")).forEach(input => {

            input.addEventListener("change", () => {

                if (input.checked) {
                    this.state.regional.add(input.dataset.value);
                }
                else {
                    this.state.regional.delete(input.dataset.value);
                }

                if (this.state.regional.size > 0) {

                    this.state.regionalNaoSeAplica = false;
                    naoAplicaEl.checked = false;

                }

                this.updateSubmitState();

            });

        });

        if (!naoAplicaEl.dataset.bound) {

            naoAplicaEl.dataset.bound = "1";

            naoAplicaEl.addEventListener("change", () => {

                this.state.regionalNaoSeAplica = naoAplicaEl.checked;

                if (naoAplicaEl.checked) {

                    this.state.regional.clear();
                    this.renderRegional();

                }

                const disabled = naoAplicaEl.checked;

                listEl.classList.toggle("maf-disabled", disabled);

                Array.from(listEl.querySelectorAll("input")).forEach(i => { i.disabled = disabled; });

                this.updateSubmitState();

            });

        }

    },

    /* ======================================================
       STATUS (seleção única)
    ====================================================== */

    renderStatus() {

        const container = document.getElementById("maf-status");

        if (!container) return;

        container.innerHTML = CONFIG.MANUAL_ACTIONS.statuses.map(status => `
            <label class="maf-radio">
                <input type="radio" name="maf-status-radio" value="${status}" ${this.state.status === status ? "checked" : ""}>
                ${status}
            </label>
        `).join("");

        Array.from(container.querySelectorAll("input")).forEach(input => {

            input.addEventListener("change", () => {

                this.state.status = input.value;

                const isConcluida = input.value === "Concluída";

                document.getElementById("maf-data-final-required").style.display = isConcluida ? "" : "none";

                this.updateSubmitState();

            });

        });

    },

    /* ======================================================
       RESPONSÁVEL
    ====================================================== */

    renderResponsavel() {

        const container = document.getElementById("maf-responsavel");

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
       CAMPOS SIMPLES (datas, textos)
    ====================================================== */

    bindSimpleFields() {

        const dataProposta = document.getElementById("maf-data-proposta");
        dataProposta.addEventListener("change", () => {
            this.state.dataProposta = dataProposta.value;
            this.updateSubmitState();
        });

        const dataFinal = document.getElementById("maf-data-final");
        dataFinal.addEventListener("change", () => {
            this.state.dataFinal = dataFinal.value;
            this.updateSubmitState();
        });

        const resumo = document.getElementById("maf-resumo");
        resumo.addEventListener("input", () => {
            this.state.resumo = resumo.value;
            this.updateSubmitState();
        });

        const extra = document.getElementById("maf-extra");
        const extraCount = document.getElementById("maf-extra-count");
        extra.addEventListener("input", () => {
            this.state.informacoesExtras = extra.value;
            extraCount.textContent = `${extra.value.length} / ${CONFIG.MANUAL_ACTIONS.maxTextLength}`;
        });

        const evidencias = document.getElementById("maf-evidencias");
        const evidenciasCount = document.getElementById("maf-evidencias-count");
        evidencias.addEventListener("input", () => {
            this.state.evidenciasTexto = evidencias.value;
            evidenciasCount.textContent = `${evidencias.value.length} / ${CONFIG.MANUAL_ACTIONS.maxTextLength}`;
        });

    },

    /* ======================================================
       UPLOAD DE IMAGENS (evidências)
    ====================================================== */

    bindImageUpload() {

        const attachBtn = document.getElementById("maf-image-attach-btn");
        const fileInput = document.getElementById("maf-image-input");

        attachBtn.addEventListener("click", () => fileInput.click());

        fileInput.addEventListener("change", async () => {

            const cfg = CONFIG.MANUAL_ACTIONS;

            const files = Array.from(fileInput.files || []);

            for (const file of files) {

                if (this.state.imagens.length >= cfg.maxImages) {

                    alert(`Máximo de ${cfg.maxImages} imagens por ação.`);
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

        });

    },

    fileToBase64(file) {

        return new Promise((resolve, reject) => {

            const reader = new FileReader();

            reader.onload = () => {

                const result = reader.result;

                // remove o prefixo "data:image/png;base64," antes de mandar
                const base64 = String(result).split(",")[1] || "";

                resolve(base64);

            };

            reader.onerror = reject;

            reader.readAsDataURL(file);

        });

    },

    renderImagePreviews() {

        const container = document.getElementById("maf-image-previews");

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

            });

        });

    },

    /* ======================================================
       VALIDAÇÃO
    ====================================================== */

    validate() {

        const errors = [];

        if (!this.state.pais.size) errors.push("Selecione ao menos um País.");
        if (!this.state.area) errors.push("Selecione uma Área.");
        if (!this.state.detalhe.size) errors.push("Selecione ao menos um Detalhe.");
        if (!this.state.dataProposta) errors.push("Preencha a Data da proposta.");
        if (!this.state.resumo || !this.state.resumo.trim()) errors.push("Preencha o Resumo da ação.");

        const hasGravadora = this.state.gravadora.size > 0 || this.state.gravadoraNaoSeAplica || this.state.gravadoraImusica;
        if (!hasGravadora) errors.push("Selecione ao menos uma Gravadora (ou \"Não se aplica\").");

        const hasRegional = this.state.regional.size > 0 || this.state.regionalNaoSeAplica;
        if (!hasRegional) errors.push("Selecione ao menos uma Regional (ou \"Não se aplica\").");

        if (!this.state.status) errors.push("Selecione o Status.");
        if (!this.state.responsavel.size) errors.push("Selecione ao menos um Responsável.");

        if (this.state.status === "Concluída" && !this.state.dataFinal) {
            errors.push("Data final / publicação é obrigatória quando o Status é Concluída.");
        }

        return errors;

    },

    updateSubmitState() {

        const submitBtn = document.getElementById("manualActionSubmitBtn");

        if (!submitBtn) return;

        const errors = this.validate();

        submitBtn.disabled = errors.length > 0 || this.submitting;

    },

    /* ======================================================
       ENVIO
    ====================================================== */

    async submit() {

        const errors = this.validate();

        const errorsEl = document.getElementById("maf-errors");

        if (errors.length) {

            errorsEl.style.display = "";
            errorsEl.innerHTML = errors.map(e => `<div>• ${e}</div>`).join("");

            return;

        }

        errorsEl.style.display = "none";

        this.submitting = true;

        this.updateSubmitState();

        const submitBtn = document.getElementById("manualActionSubmitBtn");

        const originalText = submitBtn.textContent;

        submitBtn.textContent = "Salvando...";

        const gravadoraValues = [...this.state.gravadora];

        if (this.state.gravadoraImusica) gravadoraValues.push("iMusica (ott)");

        /* Modo duplicar: os Detalhes travados (🔒) já existem na
           ação ORIGINAL — ficam marcados aqui só pra dar contexto
           visual, mas não podem ir de novo no envio, senão a fusão
           conta esse Detalhe duas vezes (original + espelho). Só
           manda a DIFERENÇA (o que foi adicionado de novo). */
        const detalheParaEnviar =
            this.editContext && this.editContext.mode === "duplicate"
                ? [...this.state.detalhe].filter(d => !this.editContext.lockedDetails.includes(d))
                : [...this.state.detalhe];

        const payload = {

            token: CONFIG.MANUAL_ACTIONS.sharedSecret,

            pais: [...this.state.pais],
            area: this.state.area,
            detalhe: detalheParaEnviar,
            dataProposta: this.formatDateForSheet(this.state.dataProposta),
            resumo: this.state.resumo,
            gravadora: this.state.gravadoraNaoSeAplica ? ["Não se aplica"] : gravadoraValues,
            regional: this.state.regionalNaoSeAplica ? ["Não se aplica"] : [...this.state.regional],
            status: this.state.status,
            responsavel: [...this.state.responsavel],
            dataFinal: this.formatDateForSheet(this.state.dataFinal),
            informacoesExtras: this.state.informacoesExtras,
            evidenciasTexto: this.state.evidenciasTexto,
            imagens: this.state.imagens.map(img => ({
                filename: img.filename,
                mimeType: img.mimeType,
                base64: img.base64
            }))

        };

        /* Modo edição/duplicação: manda o ID original no payload.
           - "edit": Apps Script SOBRESCREVE a linha com esse ID.
           - duplicação (default "create"): Apps Script cria uma
             linha NOVA, mas usando esse MESMO ID em vez de gerar
             um UUID novo — assim a ação nova já nasce linkada com
             a original, sem precisar igualar ID manualmente depois. */
        if (this.editContext) {

            payload.id = this.editContext.originId;

            if (this.editContext.mode === "edit") {
                payload.mode = "update";
            }

        }

        try {

            await this.sendPayload(payload);

            this.saveToHistory(payload);

            const successMsg = this.editContext && this.editContext.mode === "edit"
                ? "Alterações enviadas! Como o Google não permite confirmar o envio em tempo real por aqui, confira no detalhamento de ações propostas (clique no KPI \"Total de ações propostas\") em alguns minutos pra garantir que foram salvas."
                : this.editContext
                    ? "Novo canal enviado! Ele vai aparecer fundido com a ação original no detalhamento de ações propostas assim que a planilha sincronizar."
                    : "Ação enviada! Como o Google não permite confirmar o envio em tempo real por aqui, confira no detalhamento de ações propostas (clique no KPI \"Total de ações propostas\") em alguns minutos pra garantir que a ação foi criada certinho. Se não aparecer, você encontra essa ação em \"Últimas ações enviadas\" pra forçar o reenvio.";

            alert(successMsg);

            this.submitting = false;
            submitBtn.textContent = originalText;

            this.closeAddForm();

        }
        catch (error) {

            console.error(error);

            errorsEl.style.display = "";
            errorsEl.innerHTML = `<div>• Não foi possível conectar à planilha. A ação NÃO foi salva — verifique sua conexão e tente de novo. Se persistir, avise a Rachel.</div>`;

            this.submitting = false;
            submitBtn.textContent = originalText;
            this.updateSubmitState();

        }

    },

    /**
     * Envia o payload pro Apps Script. mode:"no-cors" é necessário:
     * a resposta do Apps Script passa por um redirecionamento
     * interno (pra googleusercontent.com) que não carrega
     * cabeçalho de CORS pro nosso domínio — em modo "cors" normal
     * o navegador bloqueia o fetch inteiro (nem chega a mandar),
     * mesmo a implantação estando 100% certa. Em "no-cors" o envio
     * funciona e a linha é gravada — só perdemos a capacidade de
     * LER a resposta de volta (resposta "opaca", sem status nem
     * corpo legível).
     */
    sendPayload(payload) {

        return fetch(CONFIG.MANUAL_ACTIONS.webAppUrl, {

            method: "POST",
            mode: "no-cors",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify(payload)

        });

    },

    /**
     * Muda o Status de uma ação direto pela mini-tabela ("Acontecendo
     * agora" / "Últimas ações concluídas" na Área de Marketing), sem
     * abrir o formulário inteiro — mesma ideia do status editável do
     * Canal 500. Como o Apps Script sobrescreve a linha inteira no
     * modo "update", reconstrói o estado completo a partir da linha
     * (igual o formulário de edição faz) e reenvia tudo, só trocando
     * o Status — assim nenhum outro campo se perde.
     */
    updateStatusQuick(row, newStatus) {

        if (row._merged) {
            return Promise.reject(new Error("Ação fundida — abra o detalhamento pra editar cada canal separadamente."));
        }

        if (this.isDetailLocked(row.detail) || (typeof Metrics !== "undefined" && Metrics.isPhraseology(row))) {
            return Promise.reject(new Error("Ação não editável por aqui."));
        }

        const statusLockMessage = this.getStatusLockMessage(row.detail);
        if (statusLockMessage) {
            return Promise.reject(new Error(statusLockMessage));
        }

        if (!row.id) {
            return Promise.reject(new Error("Essa linha não tem ID — não dá pra atualizar por aqui."));
        }

        const state = this.buildStateFromRow(row);

        state.status = newStatus;

        if (newStatus === "Concluída" && !state.dataFinal) {
            return Promise.reject(new Error("Ação sem Data final — abra \"Editar ação\" pra preencher a data de conclusão antes de marcar como Concluída."));
        }

        const gravadoraValues = [...state.gravadora];
        if (state.gravadoraImusica) gravadoraValues.push("iMusica (ott)");

        const payload = {

            token: CONFIG.MANUAL_ACTIONS.sharedSecret,

            pais: [...state.pais],
            area: state.area,
            detalhe: [...state.detalhe],
            dataProposta: this.formatDateForSheet(state.dataProposta),
            resumo: state.resumo,
            gravadora: state.gravadoraNaoSeAplica ? ["Não se aplica"] : gravadoraValues,
            regional: state.regionalNaoSeAplica ? ["Não se aplica"] : [...state.regional],
            status: state.status,
            responsavel: [...state.responsavel],
            dataFinal: this.formatDateForSheet(state.dataFinal),
            informacoesExtras: state.informacoesExtras,
            evidenciasTexto: state.evidenciasTexto,
            imagens: [],

            id: row.id,
            mode: "update"

        };

        return this.sendPayload(payload);

    },

    /**
     * yyyy-mm-dd (formato do <input type="date">) -> dd/mm/aaaa
     * (mesmo formato que o resto da planilha usa).
     */
    formatDateForSheet(value) {

        if (!value) return "";

        const [year, month, day] = value.split("-");

        return `${day}/${month}/${year}`;

    },

    /* ======================================================
       HISTÓRICO — "Últimas ações enviadas"
       ------------------------------------------------------
       Guardado no localStorage do navegador (só neste
       computador/navegador). Serve pra "forçar reenvio" se uma
       ação não aparecer na planilha depois de alguns minutos —
       reenvia o MESMO payload de novo. Cuidado: se a ação já
       tiver sido gravada, forçar reenvio cria uma linha
       duplicada na planilha.
    ====================================================== */

    HISTORY_KEY: "cm_manual_actions_history",

    HISTORY_MAX: 15,

    getHistory() {

        try {

            const raw = localStorage.getItem(this.HISTORY_KEY);

            const list = raw ? JSON.parse(raw) : [];

            return Array.isArray(list) ? list : [];

        }
        catch (error) {

            return [];

        }

    },

    setHistory(list) {

        try {
            localStorage.setItem(this.HISTORY_KEY, JSON.stringify(list));
        }
        catch (error) {
            console.error("Não foi possível salvar o histórico local:", error);
        }

    },

    saveToHistory(payload) {

        const entry = {

            id: (window.crypto?.randomUUID) ? crypto.randomUUID() : `local_${Date.now()}`,
            sentAt: new Date().toISOString(),
            lastResentAt: null,
            payload

        };

        const list = [entry, ...this.getHistory()].slice(0, this.HISTORY_MAX);

        this.setHistory(list);

    },

    bindHistoryModal() {

        const openBtn = document.getElementById("manualActionsHistoryBtn");

        if (openBtn) openBtn.addEventListener("click", () => this.openHistoryModal());

        const modal = document.getElementById("manualActionHistoryModal");

        if (!modal) return;

        modal.addEventListener("click", (event) => {
            if (event.target === modal) this.closeHistoryModal();
        });

        const closeBtn = document.getElementById("manualActionHistoryClose");

        if (closeBtn) closeBtn.addEventListener("click", () => this.closeHistoryModal());

    },

    openHistoryModal() {

        const modal = document.getElementById("manualActionHistoryModal");

        if (!modal) return;

        this.renderHistory();

        modal.classList.add("open");
        document.body.classList.add("modal-open");

    },

    closeHistoryModal() {

        const modal = document.getElementById("manualActionHistoryModal");

        if (!modal) return;

        modal.classList.remove("open");
        document.body.classList.remove("modal-open");

    },

    renderHistory() {

        const container = document.getElementById("manualActionHistoryBody");

        if (!container) return;

        const list = this.getHistory();

        if (!list.length) {

            container.innerHTML = `<p class="maf-empty">Nenhuma ação enviada por aqui ainda neste navegador.</p>`;

            return;

        }

        const fmtDateTime = iso => new Date(iso).toLocaleString("pt-BR");

        container.innerHTML = list.map(entry => {

            const p = entry.payload;

            const gravadora = (p.gravadora && p.gravadora.length) ? p.gravadora.join(", ") : "—";

            const resentLine = entry.lastResentAt
                ? `<small class="mah-resent">Reenviado em ${fmtDateTime(entry.lastResentAt)}</small>`
                : "";

            return `
                <div class="mah-item" data-id="${entry.id}">
                    <div class="mah-info">
                        <strong>${p.resumo || "(sem resumo)"}</strong>
                        <span>${(p.pais || []).join(", ")} · ${p.status || "—"} · ${gravadora}</span>
                        <small>Enviado em ${fmtDateTime(entry.sentAt)}</small>
                        ${resentLine}
                    </div>
                    <div class="mah-actions">
                        <button type="button" class="data-table-csv-btn mah-resend-btn" data-id="${entry.id}">↻ Forçar reenvio</button>
                        <button type="button" class="mah-remove-btn" data-id="${entry.id}" aria-label="Remover da lista">✕</button>
                    </div>
                </div>
            `;

        }).join("");

        Array.from(container.querySelectorAll(".mah-resend-btn")).forEach(btn => {

            btn.addEventListener("click", () => this.resendAction(btn.dataset.id, btn));

        });

        Array.from(container.querySelectorAll(".mah-remove-btn")).forEach(btn => {

            btn.addEventListener("click", () => {

                const list = this.getHistory().filter(e => e.id !== btn.dataset.id);

                this.setHistory(list);
                this.renderHistory();

            });

        });

    },

    async resendAction(id, btn) {

        const entry = this.getHistory().find(e => e.id === id);

        if (!entry) return;

        if (!confirm("Reenviar essa ação? Se ela já tiver sido gravada na planilha, isso vai criar uma linha duplicada — só force o reenvio se tiver certeza de que ela não foi salva.")) {
            return;
        }

        const originalText = btn.textContent;

        btn.textContent = "Reenviando...";
        btn.disabled = true;

        try {

            await this.sendPayload(entry.payload);

            entry.lastResentAt = new Date().toISOString();

            const list = this.getHistory().map(e => e.id === id ? entry : e);

            this.setHistory(list);

            this.renderHistory();

            alert("Reenviado! Confira a planilha em alguns minutos.");

        }
        catch (error) {

            console.error(error);

            alert("Não foi possível reenviar — verifique sua conexão e tente de novo.");

            btn.textContent = originalText;
            btn.disabled = false;

        }

    }

};
