/**
 * ==========================================================
 * OVERVIEW DASHBOARD (Visão Geral)
 * ----------------------------------------------------------
 * Panorama consolidado das 3 frentes (Marketing, Destaques de
 * gravadoras, Redes sociais). Tem um alternador "Mês atual" /
 * "Total": em "Mês atual" cada base é recortada pelo mês/ano
 * corrente do acesso; em "Total" mostra tudo, sem recorte de
 * data. O indicador de cumprimento de metas é sempre anual —
 * não faz sentido "meta do mês", então ele ignora esse
 * alternador e usa sempre o ano corrente (Goals.currentYear).
 *
 * KPIs e gráficos são clicáveis (igual ao Marketing): abrem o
 * mesmo modal de drill-down (Dashboard.openDrilldown), cada um
 * com a lista de ações/posts que compõem aquele número.
 * ==========================================================
 */

const OverviewDashboard = {

    periodMode: "month",

    bound: false,

    /**
     * Colunas do drill-down para linhas de Redes Sociais
     * (esquema diferente do dataset principal de Marketing).
     */
    socialDrilldownColumns: [

        { key: "data", label: "Data", type: "date" },
        { key: "formato", label: "Formato" },
        { key: "tipo", label: "Tipo" },
        { key: "resumo", label: "Resumo" },
        { key: "responsavel", label: "Responsável" },
        { key: "gravadora", label: "Gravadora" },
        { key: "genero", label: "Gênero" },
        { key: "alcance", label: "Alcance" },
        { key: "interacoes", label: "Interações" }

    ],

    countBy(rows, field) {

        const map = new Map();

        rows.forEach(row => {

            const key = row[field] || "Não informado";

            map.set(key, (map.get(key) || 0) + 1);

        });

        return [...map.entries()]
            .map(([nome, total]) => ({ nome, total }))
            .sort((a, b) => b.total - a.total);

    },

    /**
     * -----------------------------------------
     * Mês/ano corrente do acesso (data real de hoje).
     * -----------------------------------------
     */
    getPeriodBounds() {

        const now = new Date();

        return { year: now.getFullYear(), month: now.getMonth() };

    },

    periodLabel() {

        return this.periodMode === "month" ? "mês atual" : "total";

    },

    filterMarketingByPeriod(rows) {

        if (this.periodMode === "total") return rows;

        const { year, month } = this.getPeriodBounds();

        return rows.filter(row =>
            row.publishDate &&
            row.publishDate.getFullYear() === year &&
            row.publishDate.getMonth() === month
        );

    },

    filterHighlightsByPeriod(rows) {

        if (this.periodMode === "total") return rows;

        const { year, month } = this.getPeriodBounds();

        const key = `${year}-${String(month + 1).padStart(2, "0")}`;

        return rows.filter(row => row.mesKey === key);

    },

    filterPostsByPeriod(posts) {

        if (this.periodMode === "total") return posts;

        const { year, month } = this.getPeriodBounds();

        return posts.filter(post => post.ano === year && post.mes === month + 1);

    },

    /**
     * -----------------------------------------
     * Ações concluídas, excluindo fraseologias — mesma regra
     * do KPI "Ações finalizadas/concluídas" do Marketing
     * (Metrics.getCompleted), mas retornando as LINHAS, não
     * só a contagem, pra alimentar o drill-down.
     * -----------------------------------------
     */
    getCompletedNonPhraseologyRows(rows) {

        return Metrics.getNonPhraseologyRows(rows).filter(
            row => row.status === CONFIG.STATUS.completed
        );

    },

    /**
     * -----------------------------------------
     * Linhas CONCLUÍDAS cujo campo Detalhe (multi-valorado)
     * inclui algum dos nomes dados — já aplicando o mapeamento
     * de nomes do Goals (ex.: "Barker: Seção de Música" ->
     * "Barker").
     * -----------------------------------------
     */
    filterCompletedByDetail(rows, detailNames) {

        return rows.filter(row => {

            if (row.status !== CONFIG.STATUS.completed) {
                return false;
            }

            const items = splitMultiValue(row.detail).map(value =>
                (CONFIG.GOAL_MAPPING && CONFIG.GOAL_MAPPING[value]) || value
            );

            return detailNames.some(name => items.includes(name));

        });

    },

    /**
     * -----------------------------------------
     * % de cumprimento de metas do ano: soma o realizado
     * e a meta anual de todas as categorias de CONFIG.GOALS
     * (todos os países) e tira a razão. Sempre anual.
     * -----------------------------------------
     */
    getAnnualGoalCompletion() {

        const names = CONFIG.GOALS ? Object.keys(CONFIG.GOALS) : [];

        let achieved = 0;

        let target = 0;

        names.forEach(name => {

            const goal = CONFIG.GOALS[name];

            if (!goal || !goal.annual) return;

            achieved += Goals.getTotalAllCountries(name);

            target += goal.annual;

        });

        return target ? (achieved / target) * 100 : 0;

    },

    /**
     * -----------------------------------------
     * Linhas concluídas no ano corrente cuja(s) ação(ões)
     * têm meta definida em CONFIG.GOALS — o "detalhamento"
     * por trás do % de cumprimento de metas.
     * -----------------------------------------
     */
    getGoalTrackedRows() {

        const goalNames = new Set(CONFIG.GOALS ? Object.keys(CONFIG.GOALS) : []);

        return getRawData().filter(row => {

            if (!Goals.isCompleted(row)) return false;

            if (!row.publishDate || row.publishDate.getFullYear() !== Goals.currentYear) {
                return false;
            }

            return Goals.getRowActions(row).some(action => goalNames.has(action));

        });

    },

    /**
     * -----------------------------------------
     * Linhas concluídas no ano corrente atribuídas a uma área
     * (Label Relations / Licenciamento / Marketing / TV), pelo
     * mesmo critério da tabela de metas (Goals.getActionArea).
     * -----------------------------------------
     */
    getAreaRows(area) {

        return getRawData().filter(row => {

            if (!Goals.isCompleted(row)) return false;

            if (!row.publishDate || row.publishDate.getFullYear() !== Goals.currentYear) {
                return false;
            }

            return Goals.getRowActions(row).some(
                action => Goals.getActionArea(action) === area
            );

        });

    },

    /**
     * -----------------------------------------
     * Cor "conditional formatting" vermelho -> verde,
     * em tom pastel (opacidade clara).
     * -----------------------------------------
     */
    pctToColor(pct) {

        const ratio = Math.max(0, Math.min(1, pct / 100));

        const hue = ratio * 120;

        return {

            background: `hsl(${hue}, 70%, 91%)`,

            color: `hsl(${hue}, 60%, 30%)`

        };

    },

    /**
     * -----------------------------------------
     * Liga (uma única vez) o alternador Mês atual/Total e os
     * cliques dos KPIs.
     * -----------------------------------------
     */
    bindOnce() {

        if (this.bound) return;

        this.bound = true;

        const monthBtn = document.getElementById("overviewMonthly");

        const totalBtn = document.getElementById("overviewTotal");

        if (monthBtn) {

            monthBtn.addEventListener("click", () => this.setPeriod("month"));

        }

        if (totalBtn) {

            totalBtn.addEventListener("click", () => this.setPeriod("total"));

        }

        this.bindKpiDrilldowns();

    },

    /**
     * -----------------------------------------
     * KPIs clicáveis — abrem o mesmo modal de drill-down do
     * Marketing, com a lista de linhas por trás de cada número.
     * Os dados são sempre lidos de this._... no momento do
     * clique (recalculados a cada renderKPIs()), nunca ficam
     * "presos" num estado antigo.
     * -----------------------------------------
     */
    bindKpiDrilldowns() {

        const map = {

            ovKpiAcoes: () => ({
                rows: this._concluidasRows,
                title: `Ações concluídas — ${this.periodLabel()}`
            }),

            ovKpiCanal500: () => ({
                rows: this._canal500Rows,
                title: `Canal 500 — ${this.periodLabel()}`
            }),

            ovKpiBanners: () => ({
                rows: this._bannersRows,
                title: `Banners — ${this.periodLabel()}`
            }),

            ovKpiPosts: () => ({
                rows: this._postsRows,
                title: `Posts Instagram — ${this.periodLabel()}`,
                columns: this.socialDrilldownColumns
            }),

            ovKpiGoalCard: () => ({
                rows: this._goalRows,
                title: `Ações contabilizadas nas metas — ${Goals.currentYear}`
            })

        };

        Object.entries(map).forEach(([id, getPayload]) => {

            const el = document.getElementById(id);

            if (!el) return;

            const card = el.classList.contains("kpi-card")
                ? el
                : (el.closest(".kpi-card") || el);

            card.classList.add("clickable-kpi");

            card.addEventListener("click", () => {

                const payload = getPayload();

                Dashboard.openDrilldown(payload.rows || [], payload.title, payload.columns);

            });

        });

    },

    setPeriod(mode) {

        this.periodMode = mode;

        const monthBtn = document.getElementById("overviewMonthly");

        const totalBtn = document.getElementById("overviewTotal");

        if (monthBtn) monthBtn.classList.toggle("active", mode === "month");

        if (totalBtn) totalBtn.classList.toggle("active", mode === "total");

        this.renderKPIs();

        this.renderCharts();

    },

    async refresh() {

        // Nenhum KPI/gráfico da Visão Geral usa mais a base de Destaques
        // de gravadoras (36 mil+ linhas) — só a de Redes Sociais, que é
        // pequena. Carregar a de Destaques aqui era peso morto travando
        // a primeira renderização da página inteira.
        if (!SocialData.isLoaded()) {

            await SocialData.load(CONFIG.SOCIAL_DATA.csvUrl);

        }

        this.renderKPIs();

        this.renderCharts();

        this.bindOnce();

    },

    renderKPIs() {

        const marketing = this.filterMarketingByPeriod(getRawData());

        const highlights = this.filterHighlightsByPeriod(HighlightsData.rows);

        const posts = this.filterPostsByPeriod(SocialData.getPosts());

        // Guarda pra renderCharts()/cliques reaproveitarem sem refiltrar.
        this._marketing = marketing;
        this._highlights = highlights;
        this._posts = posts;

        const concluidasRows = this.getCompletedNonPhraseologyRows(marketing);

        const canal500Rows = this.filterCompletedByDetail(marketing, ["Canal 500"]);

        const bannersRows = this.filterCompletedByDetail(marketing, [
            "Banner: Seção da Home",
            "Banner: Seção de Música"
        ]);

        const goalRows = this.getGoalTrackedRows();

        this._concluidasRows = concluidasRows;
        this._canal500Rows = canal500Rows;
        this._bannersRows = bannersRows;
        this._postsRows = posts;
        this._goalRows = goalRows;

        const set = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
        };

        set("ovKpiAcoes", concluidasRows.length.toLocaleString("pt-BR"));

        set("ovKpiPosts", posts.length.toLocaleString("pt-BR"));

        set("ovKpiCanal500", canal500Rows.length.toLocaleString("pt-BR"));

        set("ovKpiBanners", bannersRows.length.toLocaleString("pt-BR"));

        const goalPct = this.getAnnualGoalCompletion();

        set("ovKpiGoalPct", `${goalPct.toFixed(0)}%`);

        const card = document.getElementById("ovKpiGoalCard");

        const valueEl = document.getElementById("ovKpiGoalPct");

        if (card && valueEl) {

            const colors = this.pctToColor(goalPct);

            card.style.background = colors.background;

            valueEl.style.color = colors.color;

        }

    },

    renderCharts() {

        const marketing = this._marketing || this.filterMarketingByPeriod(getRawData());

        // Ações de marketing por status
        const statusOrder = [
            CONFIG.STATUS.completed,
            CONFIG.STATUS.inProgress,
            CONFIG.STATUS.standby,
            CONFIG.STATUS.cancelled
        ];

        const statusColors = {
            [CONFIG.STATUS.completed]: CONFIG.KPI.completed,
            [CONFIG.STATUS.inProgress]: CONFIG.KPI.inProgress,
            [CONFIG.STATUS.standby]: CONFIG.KPI.standby,
            [CONFIG.STATUS.cancelled]: CONFIG.KPI.cancelled
        };

        // Mesma regra do Marketing: Metrics.getCompleted/getInProgress/
        // getStandby/getCancelled já excluem fraseologias.
        const statusNonPhraseologyRows = Metrics.getNonPhraseologyRows(marketing);

        const statusCountFns = {
            [CONFIG.STATUS.completed]: Metrics.getCompleted,
            [CONFIG.STATUS.inProgress]: Metrics.getInProgress,
            [CONFIG.STATUS.standby]: Metrics.getStandby,
            [CONFIG.STATUS.cancelled]: Metrics.getCancelled
        };

        HighlightsCharts.horizontalBar(
            "chart-ov-marketing-status",
            HighlightsCharts.buildChartData({

                labels: statusOrder,

                datasets: [{

                    label: "Ações",

                    data: statusOrder.map(s => statusCountFns[s].call(Metrics, marketing)),

                    backgroundColor: statusOrder.map(s => statusColors[s]),

                    borderRadius: 5

                }]

            }),
            {
                onClick: (event, elements) => {

                    if (!elements.length) return;

                    const status = statusOrder[elements[0].index];

                    const rows = statusNonPhraseologyRows.filter(row => row.status === status);

                    Dashboard.openDrilldown(rows, `Ações ${status} — ${this.periodLabel()}`);

                }
            }
        );

        // Volume por área (Label Relations / Licenciamento / Marketing / TV),
        // atribuída pelo mesmo critério da tabela de metas
        // (Goals.getActionArea), mas contando cada LINHA uma única vez
        // (não por ação) — assim a altura da barra sempre bate com o
        // número de linhas que aparecem ao clicar nela.
        const areaOrder = CONFIG.AREA_ORDER || ["Label Relations", "Licenciamento", "Marketing", "TV"];

        const areaRowsByArea = new Map(areaOrder.map(area => [area, this.getAreaRows(area)]));

        HighlightsCharts.bar(
            "chart-ov-volume-area",
            HighlightsCharts.buildChartData({

                labels: areaOrder,

                datasets: [{

                    label: `Ações concluídas em ${Goals.currentYear || ""}`,

                    data: areaOrder.map(area => areaRowsByArea.get(area).length),

                    backgroundColor: HighlightsCharts.getColors(areaOrder.length),

                    borderRadius: 5,

                    maxBarThickness: 30

                }]

            }),
            {
                onClick: (event, elements) => {

                    if (!elements.length) return;

                    const area = areaOrder[elements[0].index];

                    const rows = areaRowsByArea.get(area);

                    Dashboard.openDrilldown(rows, `${area} — ações concluídas em ${Goals.currentYear}`);

                }
            }
        );

    }

};
