/* ==========================================================
   CLARO MÚSICA DASHBOARD
   APP MODULE
   Part 1 / 3
========================================================== */

const Dashboard = {

    initialized: false,

    /* ======================================================
       INITIALIZATION
    ====================================================== */

    /* ======================================================
       BOOTSTRAP

       Chamado pelo auth.js depois do login (ou de cara, se a
       sessão já estiver autenticada). Carrega as 3 bases em
       paralelo — assim a Visão Geral já nasce com números
       reais, e trocar de aba depois é instantâneo.
    ====================================================== */

    async bootstrap() {

        this.showLoading();

        try {

            // Destaques de gravadoras (36 mil+ linhas) NÃO entra aqui —
            // carrega sob demanda só quando a aba é aberta (ver
            // setActivePage). Marketing e Redes Sociais são pequenos e
            // entram de cara pra Visão Geral já nascer com números reais.
            await Promise.all([
                dataLoader.init(),
                SocialDashboard.init()
            ]);

            this.init();

            // restoreActiveTab() já dispara o refresh da aba certa
            // (Visão Geral, Marketing, Destaques ou Redes Sociais) — não
            // chamar OverviewDashboard.refresh() de novo aqui, senão os
            // gráficos são recriados duas vezes e a animação de entrada
            // não chega a aparecer.
            this.restoreActiveTab();

        }

        catch (error) {

            console.error(error);

            this.showError("Erro ao iniciar o Dashboard.");

        }

        this.hideLoading();

        console.log("✔ Dashboard carregado com sucesso.");

    },

    async init() {

        console.log("Inicializando dashboard...");

        this.bindGlobalEvents();

        this.bindPageNavigation();

        this.bindKpiDrilldowns();

        const phraseologyCard = document.getElementById("kpiPhraseologies")
            ?.closest(".kpi-card");

        if (phraseologyCard && phraseologyCard.parentElement) {

            phraseologyCard.parentElement.appendChild(phraseologyCard);

        }

        this.bindDrilldownModalEvents();

        // Liga o clique nas tabelas de país (Goals) ao modal
        Goals.onDrilldownRequest = (rows, title) => {

            this.openDrilldown(rows, title);

        };

        this.bindMarketingPeriodToggle();

        this.setDefaultYearFilter();

        this.updateLastRefresh();

        this.initialized = true;

        this.refresh();

    },

    /* ======================================================
       MARKETING: TOGGLE "ANO ATUAL / TOTAL"

       Mesma lógica do toggle "Mês atual/Total" da Visão Geral:
       controla o MESMO estado que o filtro "Ano" da sidebar
       (não é uma camada de filtro separada) — assim os dois
       nunca entram em contradição um com o outro.
    ====================================================== */

    bindMarketingPeriodToggle() {

        const yearBtn = document.getElementById("summaryYear");

        const totalBtn = document.getElementById("summaryTotal");

        const yearSelect = document.getElementById("filterYear");

        const applyYear = (value) => {

            APP.filters.year = value;

            if (yearSelect) yearSelect.value = value;

            dataLoader.applyFilters();

            this.syncYearToggleUI();

            this.refresh();

        };

        if (yearBtn) {

            yearBtn.addEventListener("click", () => {

                applyYear(String(new Date().getFullYear()));

            });

        }

        if (totalBtn) {

            totalBtn.addEventListener("click", () => {

                applyYear("Todos");

            });

        }

        // Se o filtro Ano da sidebar for trocado direto, mantém os
        // botões sincronizados com o que está realmente filtrado.
        if (yearSelect) {

            yearSelect.addEventListener("change", () => {

                this.syncYearToggleUI();

            });

        }

    },

    /* ======================================================
       MARKETING: ESTADO INICIAL DO FILTRO ANO

       "Ano Atual" só vira o padrão se o ano corrente já tiver
       dados (funciona sozinho nos próximos anos, conforme mais
       dados forem entrando); senão cai em "Total".
    ====================================================== */

    setDefaultYearFilter() {

        const currentYear = String(new Date().getFullYear());

        const available = dataLoader.getAvailableYears().map(String);

        const yearSelect = document.getElementById("filterYear");

        const value = available.includes(currentYear) ? currentYear : "Todos";

        APP.filters.year = value;

        if (yearSelect) yearSelect.value = value;

        this.syncYearToggleUI();

    },

    syncYearToggleUI() {

        const yearBtn = document.getElementById("summaryYear");

        const totalBtn = document.getElementById("summaryTotal");

        const currentYear = String(new Date().getFullYear());

        const value = APP.filters.year;

        if (yearBtn) yearBtn.classList.toggle("active", value === currentYear);

        if (totalBtn) totalBtn.classList.toggle("active", value === "Todos");

    },

/* ======================================================
   PAGE NAVIGATION

   Cada aba tem seu próprio grupo de filtros na sidebar
   (ou nenhum, no caso da Visão Geral). A aba ativa é
   salva na sessionStorage pra sobreviver a um F5.
====================================================== */

setActivePage(page) {

    const sidebar = document.querySelector(".sidebar");
    const main = document.querySelector("main");

    const filterGroups = {

        marketing: document.getElementById("marketingFilterGroup"),
        social: document.getElementById("socialFilterGroup"),
        labels: document.getElementById("highlightsFilterGroup"),
        analises: document.getElementById("analisesFilterGroup")

    };

    if (filterGroups[page]) {

        sidebar.style.display = "";

        main.classList.remove("full-width");

        Object.entries(filterGroups).forEach(([groupPage, group]) => {

            if (group) group.style.display = (groupPage === page) ? "" : "none";

        });

    } else {

        sidebar.style.display = "none";

        main.classList.add("full-width");

    }

    document.querySelectorAll(".page-tab").forEach(tab => {

        tab.classList.toggle("active", tab.dataset.page === page);

    });

    document.querySelectorAll(".page").forEach(pageElement => {

        pageElement.classList.toggle("active", pageElement.id === `page-${page}`);

    });

    if (page === "social") {

        SocialDashboard
            .init()
            .then(() => SocialDashboard.refresh())
            .catch(console.error);

    }

    if (page === "labels") {

        HighlightsDashboard
            .init()
            .then(() => HighlightsDashboard.refresh())
            .catch(console.error);

    }

    if (page === "overview") {

        OverviewDashboard.refresh().catch(console.error);

    }

    if (page === "analises") {

        AnalisesDashboard
            .init()
            .then(() => AnalisesDashboard.refresh())
            .catch(console.error);

    }

    if (page === "report") {

        ReportDashboard
            .init()
            .then(() => ReportDashboard.refresh())
            .catch(console.error);

    }

    sessionStorage.setItem("cm_active_tab", page);

},

bindPageNavigation() {

    document.querySelectorAll(".page-tab").forEach(button => {

        button.addEventListener("click", () => {

            this.setActivePage(button.dataset.page);

        });

    });

},

/* ======================================================
   RESTAURA A ÚLTIMA ABA ATIVA (sessionStorage)
====================================================== */

restoreActiveTab() {

    const stored = sessionStorage.getItem("cm_active_tab") || "overview";

    const exists = document.querySelector(`.page-tab[data-page="${stored}"]`);

    this.setActivePage(exists ? stored : "overview");

},

    /* ======================================================
       REFRESH
    ====================================================== */

    refresh() {

    if (!this.initialized) return;

    console.log("Atualizando dashboard...");

    const data = getData();

    this.updateKPIs(data);

    this.updateSummary(data);

    /* ===============================
       GESTÃO DE METAS
    =============================== */

    Goals.init(data);

    Goals.render();

    /* ===============================
       GRÁFICOS
    =============================== */

    this.updateCharts(data);

},

    /* ======================================================
       KPI UPDATE
    ====================================================== */

    updateKPIs(data) {

        const total = Metrics.getTotal(data);

const completed = Metrics.getCompleted(data);

const inProgress = Metrics.getInProgress(data);

const standby = Metrics.getStandby(data);

const cancelled = Metrics.getCancelled(data);

const phraseologies = data.filter(
    row => Metrics.isPhraseology(row) && row.status === CONFIG.STATUS.completed
).length;

        document.getElementById("kpiTotal").textContent =
            total.toLocaleString("pt-BR");

        document.getElementById("kpiDone").textContent =
            completed.toLocaleString("pt-BR");

        document.getElementById("kpiProgress").textContent =
            inProgress.toLocaleString("pt-BR");

        document.getElementById("kpiStandby").textContent =
            standby.toLocaleString("pt-BR");

        document.getElementById("kpiCanceled").textContent =
            cancelled.toLocaleString("pt-BR");

        document.getElementById("kpiPhraseologies").textContent =
            phraseologies.toLocaleString("pt-BR");

        // Os próximos KPIs serão calculados
        // em metrics.js

       document.getElementById("kpiConversion").textContent =
        Metrics.getConversionRate(data) + "%";

        document.getElementById("kpiTime").textContent =
        Metrics.getAverageExecutionTime(data) + " dias";

    },

    /* ======================================================
       DRILL-DOWN: DEFINIÇÃO DAS COLUNAS

       As mesmas colunas aparecem tanto no clique dos KPIs
       quanto no clique de um tipo de ação nas tabelas de país.
       "hideIfNotApplicable" faz a célula ficar em branco (em
       vez de mostrar o texto "Não se aplica") — de forma
       genérica, sem depender de uma lista fixa de gravadoras
       ou regionais.
    ====================================================== */

    drilldownColumns: [

        { key: "country", label: "País" },

        { key: "area", label: "Área" },

        { key: "detail", label: "Detalhe" },

        { key: "proposalDate", label: "Data da proposta", type: "date" },

        { key: "summary", label: "Resumo da ação" },

        { key: "label", label: "Gravadora", hideIfNotApplicable: true },

        { key: "regional", label: "Regional", hideIfNotApplicable: true },

        { key: "status", label: "Status" },

        { key: "owner", label: "Responsável" },

        { key: "initiative", label: "Iniciativa" },

        { key: "publishDate", label: "Data final / publicação", type: "date" },

        { key: "extra", label: "Informações extras" }

    ],

    /* ======================================================
       DRILL-DOWN: HELPERS
    ====================================================== */

    isNotApplicable(value) {

        if (!value) {

            return false;

        }

        const normalized = String(value)
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim()
            .toLowerCase();

        return normalized === "nao se aplica";

    },

    formatDrilldownValue(row, column) {

        const value = row[column.key];

        if (column.render) {

            return column.render(value, row);

        }

        if (column.type === "date") {

            if (!value) {

                return "—";

            }

            return value.toLocaleDateString(
                CONFIG.DATE.locale
            );

        }

        if (!value) {

            return "—";

        }

        if (column.hideIfNotApplicable && this.isNotApplicable(value)) {

            return "";

        }

        return value;

    },

    /* ======================================================
       DRILL-DOWN: ABRIR MODAL
    ====================================================== */

    openDrilldown(rows, title, columns = this.drilldownColumns) {

        const modal = document.getElementById("drilldownModal");

        const titleEl = document.getElementById("drilldownTitle");

        const countEl = document.getElementById("drilldownCount");

        const tableWrapper = document.getElementById("drilldownTableWrapper");

        if (!modal || !titleEl || !tableWrapper) {

            console.warn("Modal de drill-down não encontrado no HTML.");

            return;

        }

        titleEl.textContent = title;

        countEl.textContent =
            `${rows.length} ${rows.length === 1 ? "ação encontrada" : "ações encontradas"}`;

        if (!rows.length) {

            tableWrapper.innerHTML =
                "<p>Nenhuma ação encontrada para este recorte.</p>";

        }
        else {

            tableWrapper.innerHTML = this.buildDrilldownTable(rows, columns);

        }

        modal.classList.add("open");

        document.body.classList.add("modal-open");

    },

    /* ======================================================
       DRILL-DOWN: MONTAR TABELA
    ====================================================== */

    buildDrilldownTable(rows, columns = this.drilldownColumns) {

        const headerHtml = columns
            .map(column => `<th>${column.label}</th>`)
            .join("");

        const bodyHtml = rows.map(row => {

            const cells = columns
                .map(column => `<td>${this.formatDrilldownValue(row, column)}</td>`)
                .join("");

            return `<tr>${cells}</tr>`;

        }).join("");

        return (
            `<table class="drilldown-table">` +
            `<thead><tr>${headerHtml}</tr></thead>` +
            `<tbody>${bodyHtml}</tbody>` +
            `</table>`
        );

    },

    /* ======================================================
       DRILL-DOWN: FECHAR MODAL
    ====================================================== */

    closeDrilldown() {

        const modal = document.getElementById("drilldownModal");

        if (!modal) return;

        modal.classList.remove("open");

        document.body.classList.remove("modal-open");

    },

    /* ======================================================
       DRILL-DOWN: MAPA DE KPIs CLICÁVEIS
    ====================================================== */

    kpiDrilldownMap: {

        kpiTotal: {

            title: "Total de ações propostas",

            filter: data => data

        },

        kpiDone: {

            title: "Ações finalizadas/concluídas",

            filter: data => data.filter(
                row => row.status === CONFIG.STATUS.completed
            )

        },

        kpiProgress: {

            title: "Ações em andamento",

            filter: data => data.filter(
                row => row.status === CONFIG.STATUS.inProgress
            )

        },

        kpiStandby: {

            title: "Ações em standby",

            filter: data => data.filter(
                row => row.status === CONFIG.STATUS.standby
            )

        },

        kpiCanceled: {

            title: "Ações canceladas",

            filter: data => data.filter(
                row => row.status === CONFIG.STATUS.cancelled
            )

        }

        ,

        kpiPhraseologies: {

            title: "Fraseologias feitas",

            filter: data => data.filter(
                row => Metrics.isPhraseology(row) && row.status === CONFIG.STATUS.completed
            )

        }

    },

    /* ======================================================
       DRILL-DOWN: LIGAR CLIQUES NOS KPIs
    ====================================================== */

    bindKpiDrilldowns() {

        Object.entries(this.kpiDrilldownMap).forEach(([cardId, config]) => {

            const card = document.getElementById(cardId);

            if (!card) return;

            const clickable = card.closest(".kpi-card") || card;

            clickable.classList.add("clickable-kpi");

            clickable.addEventListener("click", () => {

                const rows = config.filter(getData());

                this.openDrilldown(rows, config.title);

            });

        });

    },

    /* ======================================================
       DRILL-DOWN: LIGAR FECHAMENTO DO MODAL
    ====================================================== */

    bindDrilldownModalEvents() {

        const modal = document.getElementById("drilldownModal");

        if (!modal) return;

        const closeButton = document.getElementById("drilldownClose");

        if (closeButton) {

            closeButton.addEventListener("click", () => {

                this.closeDrilldown();

            });

        }

        modal.addEventListener("click", (event) => {

            if (event.target === modal) {

                this.closeDrilldown();

            }

        });

        document.addEventListener("keydown", (event) => {

            if (
                event.key === "Escape" &&
                modal.classList.contains("open")
            ) {

                this.closeDrilldown();

            }

        });

    },

    /* ======================================================
       SUMMARY
    ====================================================== */

    updateSummary(data) {

        const total = data.length;

        const completed = data.filter(
            row => row.status === CONFIG.STATUS.completed
        ).length;

        const text = Metrics.getExecutiveSummary(data);

        document.getElementById(
            "summaryText"
        ).textContent = text;

    },
        /* ======================================================
       CHARTS
    ====================================================== */

    updateCharts(data) {

        // Enquanto charts.js não existir,
        // evitamos erro.

        if (typeof Charts === "undefined") {

            console.log("Charts module ainda não carregado.");

            return;

        }

        Charts.renderAll(data);

    },

    /* ======================================================
       LAST UPDATE
    ====================================================== */

    updateLastRefresh() {

        const element =
            document.getElementById("last-update");

        if (!element) return;

        const now = new Date();

        element.textContent =
            "Atualizado em " +
            now.toLocaleDateString(
                CONFIG.DATE.locale
            ) +
            " às " +
            now.toLocaleTimeString(
                CONFIG.DATE.locale,
                {
                    hour: "2-digit",
                    minute: "2-digit"
                }
            );

    },

    /* ======================================================
       BUTTONS
    ====================================================== */

    bindGlobalEvents() {

        const refreshButton =
            document.getElementById(
                "refreshButton"
            );

        if (refreshButton) {

            refreshButton.addEventListener(
                "click",

                async () => {

                    refreshButton.disabled = true;

                    refreshButton.textContent =
                        "Atualizando...";

                    try {

                        await reloadData();

                        this.updateLastRefresh();

                        this.refresh();

                    }

                    catch (error) {

                        console.error(error);

                    }

                    refreshButton.disabled = false;

                    refreshButton.textContent =
                        "Atualizar";

                }

            );

        }

    },

    /* ======================================================
       LOADING
    ====================================================== */

    showLoading() {

        document.body.classList.add(
            "loading"
        );

    },

    hideLoading() {

        document.body.classList.remove(
            "loading"
        );

    },

    /* ======================================================
       ERRORS
    ====================================================== */

    showError(message) {

        console.error(message);

        alert(message);

    },

    /* ======================================================
       INFO
    ====================================================== */

    log() {

        console.log(
            "[Dashboard]",
            ...arguments
        );

    },
        /* ======================================================
       START
    ====================================================== */

    start() {

        this.log("Dashboard iniciado.");

        this.refresh();

    }

};



/* ==========================================================
   APPLICATION BOOTSTRAP
========================================================== */

document.addEventListener(

    "DOMContentLoaded",

    () => {

        // A trava de login chama Dashboard.bootstrap() assim que
        // a senha for validada (ou de cara, se a sessão já
        // estiver autenticada).
        Auth.init(() => {

            Dashboard.bootstrap();

        });

    }

);
