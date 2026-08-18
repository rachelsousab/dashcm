const SocialDashboard = {

    filters: {},

    context: null,

    initialized: false,

    filtersBound: false,

    kpiDrilldownsBound: false,

    periodBound: false,

    periodMode: "month",

    detailTable: null,

    filterSelects: {

        filterSocialYear: "ano",

        filterSocialMonth: "mes",

        filterSocialGenre: "genero",

        filterSocialLabel: "gravadora",

        filterSocialCollab: "collab",

        filterSocialOwner: "responsavel",

        filterSocialType: "tipo"

    },

    config: {

        tableContainer: "monthly-table"

    },

    /**
     * Colunas do drill-down (KPIs, gráficos e tabela de
     * detalhamento usam todas o mesmo esquema).
     */
    drilldownColumns: [

        {
            key: "data",
            label: "Data",
            render: v => v ? v.toLocaleDateString(CONFIG.DATE.locale) : "—"
        },

        { key: "formato", label: "Formato" },

        { key: "tipo", label: "Tipo" },

        { key: "resumo", label: "Resumo" },

        { key: "responsavel", label: "Responsável" },

        { key: "gravadora", label: "Gravadora" },

        { key: "genero", label: "Gênero" },

        { key: "collab", label: "Collab" },

        { key: "alcance", label: "Alcance", render: v => (v || 0).toLocaleString("pt-BR") },

        { key: "interacoes", label: "Interações", render: v => (v || 0).toLocaleString("pt-BR") },

        { key: "curtidas", label: "Curtidas", render: v => (v || 0).toLocaleString("pt-BR") },

        { key: "seguidores", label: "Novos seguidores", render: v => (v || 0).toLocaleString("pt-BR") }

    ],

    async init(config = {}) {

        this.config = {

            ...this.config,

            ...config

        };

if (!SocialData.isLoaded()) {

    await SocialData.load(
        CONFIG.SOCIAL_DATA.csvUrl
    );

}

if (this.initialized) {

    return this;

}

        SocialTable.init(

            this.config.tableContainer

        );

        this.populateFilters();

        this.bindFilters();

        this.bindKpiDrilldowns();

        this.bindPeriodToggle();

        this.applyDefaultPeriod();

        this.initialized = true;

        return this;

    },

    /**
     * ======================================================
     * Preenche os selects do menu de filtros com os valores
     * únicos de cada campo (já considerando campos de
     * múltipla seleção, como Responsável).
     * ======================================================
     */
    populateFilters() {

        this.fillSelect(
            "filterSocialYear",
            SocialData.getYears()
        );

        this.fillSelect(
            "filterSocialMonth",
            SocialData.getMonths(),
            month => SocialData.getMonthName(month)
        );

        this.fillSelect(
            "filterSocialGenre",
            SocialData.getGenres()
        );

        this.fillSelect(
            "filterSocialLabel",
            SocialData.getLabels()
        );

        this.fillSelect(
            "filterSocialCollab",
            SocialData.getCollabs()
        );

        this.fillSelect(
            "filterSocialOwner",
            SocialData.getOwners()
        );

        this.fillSelect(
            "filterSocialType",
            SocialData.getTypes()
        );

    },

    /**
     * ======================================================
     * Preenche um único <select> com a opção "Todos" +
     * os valores informados.
     * ======================================================
     */
    fillSelect(id, values, labelFn) {

        const select = document.getElementById(id);

        if (!select) {
            return;
        }

        select.innerHTML = "";

        const first = document.createElement("option");

        first.value = "Todos";
        first.textContent = "Todos";

        select.appendChild(first);

        values.forEach(value => {

            const option = document.createElement("option");

            option.value = value;
            option.textContent = labelFn ? labelFn(value) : value;

            select.appendChild(option);

        });

    },

    /**
     * ======================================================
     * Liga os eventos de mudança dos filtros de Redes Sociais.
     * ======================================================
     */
    bindFilters() {

        if (this.filtersBound) {
            return;
        }

        this.filtersBound = true;

        Object.entries(this.filterSelects).forEach(([elementId, filterKey]) => {

            const element = document.getElementById(elementId);

            if (!element) {
                return;
            }

            element.addEventListener("change", (event) => {

                const value = event.target.value;

                this.filters = {
                    ...this.filters,
                    [filterKey]: value === "Todos" ? "" : value
                };

                if (filterKey === "ano" || filterKey === "mes") {

                    this.syncPeriodToggleUI();

                }

                this.refresh();

            });

        });

    },

    /**
     * ======================================================
     * TOGGLE "MÊS ATUAL / ANO ATUAL / TODOS"

     * Mesma lógica do Marketing/Visão Geral: controla o MESMO
     * estado dos filtros Ano/Mês da sidebar (não é uma camada
     * separada) — assim eles nunca entram em contradição.
     * ======================================================
     */
    bindPeriodToggle() {

        if (this.periodBound) return;

        this.periodBound = true;

        const monthBtn = document.getElementById("socialPeriodMonth");

        const yearBtn = document.getElementById("socialPeriodYear");

        const totalBtn = document.getElementById("socialPeriodTotal");

        if (monthBtn) monthBtn.addEventListener("click", () => this.setPeriod("month"));

        if (yearBtn) yearBtn.addEventListener("click", () => this.setPeriod("year"));

        if (totalBtn) totalBtn.addEventListener("click", () => this.setPeriod("total"));

    },

    /**
     * Define o estado inicial (Mês atual) sem disparar
     * refresh() — quem chama init() é responsável por
     * renderizar uma vez só, evitando render duplicado.
     */
    applyDefaultPeriod() {

        const now = new Date();

        this.periodMode = "month";

        this.filters = {
            ...this.filters,
            ano: String(now.getFullYear()),
            mes: String(now.getMonth() + 1)
        };

        this.syncPeriodSelects();

        this.syncPeriodToggleUI();

    },

    setPeriod(mode) {

        this.periodMode = mode;

        const now = new Date();

        const currentYear = String(now.getFullYear());

        const currentMonth = String(now.getMonth() + 1);

        if (mode === "month") {

            this.filters = { ...this.filters, ano: currentYear, mes: currentMonth };

        } else if (mode === "year") {

            this.filters = { ...this.filters, ano: currentYear, mes: "" };

        } else {

            this.filters = { ...this.filters, ano: "", mes: "" };

        }

        this.syncPeriodSelects();

        this.syncPeriodToggleUI();

        this.refresh();

    },

    syncPeriodSelects() {

        const yearSelect = document.getElementById("filterSocialYear");

        const monthSelect = document.getElementById("filterSocialMonth");

        if (yearSelect) yearSelect.value = this.filters.ano || "Todos";

        if (monthSelect) monthSelect.value = this.filters.mes || "Todos";

    },

    syncPeriodToggleUI() {

        const monthBtn = document.getElementById("socialPeriodMonth");

        const yearBtn = document.getElementById("socialPeriodYear");

        const totalBtn = document.getElementById("socialPeriodTotal");

        const now = new Date();

        const currentYear = String(now.getFullYear());

        const currentMonth = String(now.getMonth() + 1);

        const ano = this.filters.ano || "";

        const mes = this.filters.mes || "";

        const isMonth = ano === currentYear && mes === currentMonth;

        const isYear = ano === currentYear && !mes;

        const isTotal = !ano && !mes;

        if (monthBtn) monthBtn.classList.toggle("active", isMonth);

        if (yearBtn) yearBtn.classList.toggle("active", isYear && !isMonth);

        if (totalBtn) totalBtn.classList.toggle("active", isTotal);

    },

    /**
     * ======================================================
     * KPIs clicáveis — mesmo padrão das outras abas: abrem o
     * modal de drill-down com a lista de posts por trás do
     * número. Dados lidos de this._... no momento do clique
     * (recalculados a cada renderKPIs()).
     * ======================================================
     */
    bindKpiDrilldowns() {

        if (this.kpiDrilldownsBound) return;

        this.kpiDrilldownsBound = true;

        const map = {

            socialPosts: () => ({ rows: this._posts, title: "Posts" }),

            socialReach: () => ({ rows: this._posts, title: "Alcance" }),

            socialViews: () => ({ rows: this._posts, title: "Visualizações" }),

            socialInteractions: () => ({ rows: this._posts, title: "Interações" }),

            socialEngagement: () => ({ rows: this._posts, title: "Engajamento" }),

            socialFollowers: () => ({ rows: this._posts, title: "Novos seguidores a partir de conteúdo" }),

            socialCollabPosts: () => ({ rows: this._collabPosts, title: "Posts em collab" })

        };

        Object.entries(map).forEach(([id, getPayload]) => {

            const el = document.getElementById(id);

            if (!el) return;

            const card = el.closest(".kpi-card") || el;

            card.classList.add("clickable-kpi");

            card.addEventListener("click", () => {

                const payload = getPayload();

                Dashboard.openDrilldown(payload.rows || [], payload.title, this.drilldownColumns);

            });

        });

    },

    setFilters(filters = {}) {

        this.filters = {

            ...filters

        };

        SocialMetrics.setFilters(filters);

        return this;

    },

    clearFilters() {

        this.filters = {};

        SocialMetrics.clearFilters();

        return this;

    },

refresh() {

    if (!this.initialized) {

        return this;

    }

SocialMetrics.setFilters(this.filters);

const posts = SocialMetrics.getPosts();

    const context = {

        posts,

        kpis: SocialMetrics.getKPIs()

    };

    this.renderKPIs(context);

    this.renderTable(context);

    this.renderCharts();

    this.renderCollabTable();

    this.renderDetailTable();

    SocialRecentTable.render();

    return this;

},
    /**
     * A tabela Evolução Mensal é fixa: sempre representa o ano
     * corrente (não muda com o toggle Mês atual/Ano atual/Todos
     * nem com o filtro de Ano da sidebar), respeitando só os
     * outros filtros (Gênero, Gravadora, Collab, Responsável,
     * Tipo).
     */
    renderTable() {

        const currentYear = String(new Date().getFullYear());

        const tableFilters = { ...this.filters, ano: currentYear, mes: "" };

        const tablePosts = SocialMetrics.getPostsWithFilters(tableFilters);

        SocialTable.monthlyData = SocialMetrics.getMonthlyMetrics(tablePosts);

        SocialTable.annualData = SocialMetrics.getKPIs(tablePosts);

        SocialTable.sourcePosts = tablePosts;

        SocialTable.drilldownColumns = this.drilldownColumns;

        SocialTable.render();

    },

renderKPIs(context) {

    const kpis = context.kpis;

    this._posts = context.posts;

    this._collabPosts = SocialMetrics.getCollabPosts();

    document.getElementById("socialPosts").textContent =
        kpis.posts ?? 0;

    document.getElementById("socialReach").textContent =
        (kpis.alcance ?? 0).toLocaleString("pt-BR");

    document.getElementById("socialViews").textContent =
        (kpis.visualizacoes ?? 0).toLocaleString("pt-BR");

    document.getElementById("socialInteractions").textContent =
        (kpis.interacoes ?? 0).toLocaleString("pt-BR");

    document.getElementById("socialEngagement").textContent =
        `${(kpis.taxaEngajamento ?? 0).toFixed(2)}%`;

    document.getElementById("socialFollowers").textContent =
        (kpis.seguidores ?? 0).toLocaleString("pt-BR");

    document.getElementById("socialCollabPosts").textContent =
        this._collabPosts.length.toLocaleString("pt-BR");

},

    /* ======================================================
       GRÁFICOS DE ANÁLISE
    ====================================================== */

    renderCharts() {

        const genero = SocialMetrics.groupBySplit("genero");

        // Engajamento por gênero
        const byEngajamento = [...genero].sort((a, b) => b.taxaEngajamento - a.taxaEngajamento);

        this.renderBarWithOverflow({
            canvasId: "chart-social-engajamento-genero",
            items: byEngajamento,
            valueKey: "taxaEngajamento",
            label: "Engajamento (%)",
            color: SocialCharts.colors.green,
            formatValue: v => `${Number(v || 0).toFixed(2)}%`,
            chartValue: g => Number(g.taxaEngajamento.toFixed(2)),
            onItemClick: g => {
                const rows = SocialMetrics.getRowsForSplitGroup("genero", g.nome);
                Dashboard.openDrilldown(rows, `Engajamento por gênero: ${g.nome}`, this.drilldownColumns);
            }
        });

        // Novos seguidores por gênero
        const bySeguidores = [...genero].sort((a, b) => b.seguidores - a.seguidores);

        this.renderBarWithOverflow({
            canvasId: "chart-social-seguidores-genero",
            items: bySeguidores,
            valueKey: "seguidores",
            label: "Novos seguidores",
            color: SocialCharts.colors.blue,
            onItemClick: g => {
                const rows = SocialMetrics.getRowsForSplitGroup("genero", g.nome);
                Dashboard.openDrilldown(rows, `Novos seguidores por gênero: ${g.nome}`, this.drilldownColumns);
            }
        });

        // Maiores alcances (top posts)
        const topAlcance = SocialMetrics
            .getTopPosts("alcance", 20)
            .map(post => ({ nome: (post.resumo || "Sem resumo"), alcance: post.alcance, _post: post }));

        this.renderBarWithOverflow({
            canvasId: "chart-social-maiores-alcances",
            items: topAlcance,
            valueKey: "alcance",
            label: "Alcance",
            color: SocialCharts.colors.yellow,
            truncateLabel: 28,
            onItemClick: item => {
                Dashboard.openDrilldown([item._post], item._post.resumo || "Post", this.drilldownColumns);
            }
        });

        // Interações por gênero
        const byInteracoes = [...genero].sort((a, b) => b.interacoes - a.interacoes);

        this.renderBarWithOverflow({
            canvasId: "chart-social-interacoes-genero",
            items: byInteracoes,
            valueKey: "interacoes",
            label: "Interações",
            color: SocialCharts.colors.purple,
            onItemClick: g => {
                const rows = SocialMetrics.getRowsForSplitGroup("genero", g.nome);
                Dashboard.openDrilldown(rows, `Interações por gênero: ${g.nome}`, this.drilldownColumns);
            }
        });

        // Média de curtidas por tipo de conteúdo
        const tipo = SocialMetrics.groupBySplit("tipo").sort((a, b) => b.mediaCurtidas - a.mediaCurtidas);

        this.renderBarWithOverflow({
            canvasId: "chart-social-curtidas-tipo",
            items: tipo,
            valueKey: "mediaCurtidas",
            label: "Média de curtidas",
            color: SocialCharts.colors.orange,
            chartValue: g => Math.round(g.mediaCurtidas),
            formatValue: v => Math.round(v || 0).toLocaleString("pt-BR"),
            onItemClick: g => {
                const rows = SocialMetrics.getRowsForSplitGroup("tipo", g.nome);
                Dashboard.openDrilldown(rows, `Tipo de conteúdo: ${g.nome}`, this.drilldownColumns);
            }
        });

        // Ações por gravadora — mesmas cores usadas nas outras abas
        const gravadora = SocialMetrics.groupBySplit("gravadora").sort((a, b) => b.posts - a.posts);

        const colorMap = HighlightsCharts.getGravadoraColorMap();

        SocialCharts.doughnut(
            "chart-social-gravadora",
            SocialCharts.buildChartData({

                labels: gravadora.map(g => g.nome),

                datasets: [{

                    data: gravadora.map(g => g.posts),
                    backgroundColor: gravadora.map(g => colorMap.get(g.nome) || SocialCharts.colors.gray)

                }]

            }),
            {
                plugins: { legend: { display: false } },
                onClick: (event, elements) => {

                    if (!elements.length) return;

                    const nome = gravadora[elements[0].index].nome;

                    const rows = SocialMetrics.getRowsForSplitGroup("gravadora", nome);

                    Dashboard.openDrilldown(rows, `Ações por gravadora: ${nome}`, this.drilldownColumns);

                }
            }
        );

        this.renderGravadoraLegend(gravadora, colorMap);

        // Posts em collab com artista, por gravadora — mesmas cores
        // de gravadora usadas em toda a dashboard.
        const collabArtistaPosts = SocialMetrics.getPosts().filter(post =>
            splitMultiValue(post.collab).includes("Collab artista")
        );

        const collabArtistaByGravadora = {};

        collabArtistaPosts.forEach(post => {

            splitMultiValue(post.gravadora).forEach(nome => {
                collabArtistaByGravadora[nome] = (collabArtistaByGravadora[nome] || 0) + 1;
            });

        });

        const collabArtistaGroups = Object.entries(collabArtistaByGravadora)
            .map(([nome, posts]) => ({ nome, posts }))
            .sort((a, b) => b.posts - a.posts);

        this.renderBarWithOverflow({
            canvasId: "chart-social-collab-artista-gravadora",
            items: collabArtistaGroups,
            valueKey: "posts",
            label: "Posts em collab com artista",
            color: item => colorMap.get(item.nome) || SocialCharts.colors.gray,
            onItemClick: g => {
                const rows = SocialMetrics.getPosts().filter(post =>
                    splitMultiValue(post.gravadora).includes(g.nome) &&
                    splitMultiValue(post.collab).includes("Collab artista")
                );
                Dashboard.openDrilldown(rows, `Collab com artista: ${g.nome}`, this.drilldownColumns);
            }
        });

        // Distribuição de posts por responsável
        const responsavelGroups = SocialMetrics.groupBySplit("responsavel").sort((a, b) => b.posts - a.posts);

        this.renderBarWithOverflow({
            canvasId: "chart-social-responsavel",
            items: responsavelGroups,
            valueKey: "posts",
            label: "Posts",
            color: SocialCharts.colors.red,
            onItemClick: g => {
                const rows = SocialMetrics.getRowsForSplitGroup("responsavel", g.nome);
                Dashboard.openDrilldown(rows, `Responsável: ${g.nome}`, this.drilldownColumns);
            }
        });

    },

    /**
     * ======================================================
     * Gráfico de barras horizontais que sempre mostra TODAS
     * as legendas dos itens visíveis (topN), dimensionando a
     * altura do canvas de acordo com a quantidade de barras.
     * O restante (cauda longa) fica numa lista "Ver mais",
     * também clicável, abrindo o mesmo drill-down.
     * ======================================================
     */
    renderBarWithOverflow(config) {

        const {
            canvasId,
            items,
            valueKey,
            label,
            color,
            onItemClick,
            topN = 8,
            chartValue = item => item[valueKey],
            formatValue = v => Number(v || 0).toLocaleString("pt-BR"),
            truncateLabel = null
        } = config;

        const top = items.slice(0, topN);
        const rest = items.slice(topN);

        const wrap = document.getElementById(`wrap-${canvasId}`);

        if (wrap) {
            const barHeight = 34;
            wrap.style.height = `${Math.max(220, top.length * barHeight + 50)}px`;
        }

        const barLabel = item => truncateLabel
            ? String(item.nome).slice(0, truncateLabel)
            : item.nome;

        const backgroundColor = typeof color === "function"
            ? top.map(color)
            : color;

        SocialCharts.horizontalBar(
            canvasId,
            SocialCharts.buildChartData({

                labels: top.map(barLabel),

                datasets: [{

                    label,
                    data: top.map(chartValue),
                    backgroundColor,
                    borderRadius: 5

                }]

            }),
            {
                onClick: (event, elements) => {

                    if (!elements.length) return;

                    onItemClick(top[elements[0].index]);

                }
            }
        );

        this.renderChartMoreList(canvasId, rest, chartValue, formatValue, onItemClick);

    },

    renderChartMoreList(canvasId, rest, chartValue, formatValue, onItemClick) {

        const listEl = document.getElementById(`more-${canvasId}`);
        const toggleEl = document.getElementById(`toggle-${canvasId}`);

        if (!listEl || !toggleEl) return;

        if (!rest.length) {

            listEl.style.display = "none";
            toggleEl.style.display = "none";
            listEl.innerHTML = "";

            return;

        }

        toggleEl.style.display = "";
        toggleEl.textContent = `Ver mais (+${rest.length})`;
        listEl.style.display = "none";

        listEl.innerHTML = rest.map((item, index) => `
            <div class="chart-more-item" data-index="${index}">
                <span class="chart-more-label">${item.nome}</span>
                <span class="chart-more-value">${formatValue(chartValue(item))}</span>
            </div>
        `).join("");

        Array.from(listEl.children).forEach((row, index) => {

            row.addEventListener("click", () => onItemClick(rest[index]));

        });

        toggleEl.onclick = () => {

            const expanded = listEl.style.display !== "none";

            listEl.style.display = expanded ? "none" : "block";
            toggleEl.textContent = expanded ? `Ver mais (+${rest.length})` : "Ver menos";

        };

    },

    renderGravadoraLegend(groups, colorMap) {

        const container = document.getElementById("legend-social-gravadora");

        if (!container) return;

        const total = groups.reduce((sum, g) => sum + g.posts, 0);

        const top = groups.slice(0, 10);

        const rest = groups.slice(10);

        let html = top.map(g => {

            const pct = total ? ((g.posts / total) * 100).toFixed(1) : "0.0";

            const color = colorMap.get(g.nome) || SocialCharts.colors.gray;

            return `
                <div class="chart-legend-item">
                    <span class="chart-legend-dot" style="background:${color}"></span>
                    <span class="chart-legend-label">${g.nome}</span>
                    <span class="chart-legend-value">${pct}%</span>
                </div>
            `;

        }).join("");

        if (rest.length) {

            html += `<div class="chart-legend-item chart-legend-more">+${rest.length} outras gravadoras</div>`;

        }

        container.innerHTML = html;

    },

    /* ======================================================
       TABELA: Quantidade/interações/alcance/engajamento por
       tipo de collab
    ====================================================== */

    renderCollabTable() {

        const container = document.getElementById("socialCollabTable");

        if (!container) return;

        const groups = SocialMetrics.groupBySplit("collab").sort((a, b) => b.posts - a.posts);

        const fmt = n => Math.round(n || 0).toLocaleString("pt-BR");

        const fmtPct = n => `${(n || 0).toFixed(2)}%`;

        const totals = groups.reduce((acc, g) => {

            acc.posts += g.posts;
            acc.interacoes += g.interacoes;
            acc.alcance += g.alcance;

            return acc;

        }, { posts: 0, interacoes: 0, alcance: 0 });

        const totalEngajamento = totals.alcance ? (totals.interacoes / totals.alcance) * 100 : 0;

        const body = groups.map(g => `
            <tr>
                <td class="action-name">${g.nome}</td>
                <td>${fmt(g.posts)}</td>
                <td>${fmt(g.interacoes)}</td>
                <td>${fmt(g.mediaInteracoes)}</td>
                <td>${fmt(g.alcance)}</td>
                <td>${fmt(g.mediaAlcance)}</td>
                <td>${fmtPct(g.taxaEngajamento)}</td>
            </tr>
        `).join("");

        container.innerHTML = `
            <table class="goals-table">
                <thead>
                    <tr>
                        <th>Tipo de collab</th>
                        <th>Posts</th>
                        <th>Interações totais</th>
                        <th>Média de interações</th>
                        <th>Alcance total</th>
                        <th>Média de alcance</th>
                        <th>Engajamento médio</th>
                    </tr>
                </thead>
                <tbody>
                    ${body}
                    <tr class="summary-row">
                        <td class="action-name">Total geral</td>
                        <td>${fmt(totals.posts)}</td>
                        <td>${fmt(totals.interacoes)}</td>
                        <td>${fmt(totals.posts ? totals.interacoes / totals.posts : 0)}</td>
                        <td>${fmt(totals.alcance)}</td>
                        <td>${fmt(totals.posts ? totals.alcance / totals.posts : 0)}</td>
                        <td>${fmtPct(totalEngajamento)}</td>
                    </tr>
                </tbody>
            </table>
        `;

        Array.from(container.querySelectorAll("tbody tr:not(.summary-row)")).forEach((tr, index) => {

            tr.style.cursor = "pointer";

            tr.addEventListener("click", () => {

                const nome = groups[index].nome;

                const rows = SocialMetrics.getRowsForSplitGroup("collab", nome);

                Dashboard.openDrilldown(rows, `Collab: ${nome}`, this.drilldownColumns);

            });

        });

    },

    /* ======================================================
       TABELA DE DETALHAMENTO
    ====================================================== */

    renderDetailTable() {

        const container = document.getElementById("socialDetailTable");

        if (!container) return;

        if (!this.detailTable) {

            this.detailTable = DataTable.create(

                container,
                this.drilldownColumns,
                () => SocialMetrics.getPosts(),
                { csvName: "redes_sociais" }

            );

        }

        this.detailTable.setPage(1);

        this.detailTable.render();

    }

};
