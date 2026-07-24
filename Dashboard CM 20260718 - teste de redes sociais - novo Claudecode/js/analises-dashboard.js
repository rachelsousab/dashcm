/**
 * ==========================================================
 * ANÁLISES 360 — DASHBOARD
 * ----------------------------------------------------------
 * Orquestrador da aba "Análises". Mesmo padrão das outras
 * abas (social-dashboard.js / highlights-dashboard.js): liga
 * os filtros da sidebar e renderiza as 3 análises para cada
 * um dos mercados (Brasil / Colômbia).
 * ==========================================================
 */

const AnalisesDashboard = {

    initialized: false,

    filtersBound: false,

    MARKETS: [

        { nome: "Brasil", slug: "brasil" },

        { nome: "Colômbia", slug: "colombia" }

    ],

    filterSelects: {

        filterAnalisesYear: "ano",

        filterAnalisesQuarter: "trimestre",

        filterAnalisesLabel: "gravadora",

        filterAnalisesOwner: "responsavel"

    },

    async init() {

        if (!HighlightsData.isLoaded()) {

            await HighlightsData.load(CONFIG.HIGHLIGHTS_DATA.csvUrl);

        }

        if (!SocialData.isLoaded()) {

            await SocialData.load(CONFIG.SOCIAL_DATA.csvUrl);

        }

        if (this.initialized) {

            return this;

        }

        this.populateFilters();

        this.bindFilters();

        this.initialized = true;

        return this;

    },

    populateFilters() {

        this.fillSelect("filterAnalisesYear", AnalisesMetrics.getYears());

        this.fillSelect("filterAnalisesLabel", AnalisesMetrics.getGravadoras());

        this.fillSelect("filterAnalisesOwner", AnalisesMetrics.getResponsaveis());

        const quarterSelect = document.getElementById("filterAnalisesQuarter");

        if (quarterSelect && !quarterSelect.dataset.filled) {

            quarterSelect.innerHTML = `
                <option value="Todos">Todos</option>
                <option value="Q1">Q1 (Jan – Mar)</option>
                <option value="Q2">Q2 (Abr – Jun)</option>
                <option value="Q3">Q3 (Jul – Set)</option>
                <option value="Q4">Q4 (Out – Dez)</option>
            `;

            quarterSelect.dataset.filled = "1";

        }

    },

    fillSelect(id, values) {

        const select = document.getElementById(id);

        if (!select) return;

        select.innerHTML = "";

        const first = document.createElement("option");

        first.value = "Todos";
        first.textContent = "Todos";

        select.appendChild(first);

        values.forEach(value => {

            const option = document.createElement("option");

            option.value = value;
            option.textContent = value;

            select.appendChild(option);

        });

    },

    bindFilters() {

        if (this.filtersBound) return;

        this.filtersBound = true;

        Object.entries(this.filterSelects).forEach(([elementId, filterKey]) => {

            const element = document.getElementById(elementId);

            if (!element) return;

            element.addEventListener("change", (event) => {

                const value = event.target.value;

                AnalisesMetrics.setFilters({
                    [filterKey]: value === "Todos" ? "" : value
                });

                this.refresh();

            });

        });

    },

    refresh() {

        this.MARKETS.forEach(({ nome, slug }) => {

            this.renderProportionality(nome, slug);

            this.renderShareOfVoice(nome, slug);

        });

        return this;

    },

    /* ======================================================
       FORMATAÇÃO
    ====================================================== */

    fmt(n) {
        return Math.round(n || 0).toLocaleString("pt-BR");
    },

    fmtPct(n) {
        return `${Number(n || 0).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
    },

    fmtRatio(n) {

        if (n === null || n === undefined || !isFinite(n)) return "—";

        return `${Number(n).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}x`;

    },

    /* ======================================================
       DRILL-DOWNS (por célula — cada métrica abre a base certa)
    ====================================================== */

    openHighlightsDrilldown(nome, market) {

        const rows = AnalisesMetrics.getHighlightsRowsFor(nome, market);

        Dashboard.openDrilldown(rows, `Destaques editoriais: ${nome} (${market})`, HighlightsDashboard.drilldownColumns);

    },

    openMarketingDrilldown(nome, market, detailFilter = null, customTitle = null) {

        const rows = AnalisesMetrics.getMarketingRowsFor(nome, market, detailFilter);

        const title = customTitle || `Ações de marketing: ${nome} (${market})`;

        Dashboard.openDrilldown(rows, title, Dashboard.drilldownColumns);

    },

    openSocialDrilldown(nome, market, customTitle = null) {

        const rows = AnalisesMetrics.getSocialPostsFor(nome);

        const title = customTitle || `Posts sociais: ${nome} (${market})`;

        Dashboard.openDrilldown(rows, title, SocialDashboard.drilldownColumns);

    },

    /**
     * Sinal pequeno de oportunidade (emoji + tooltip) — não
     * precisa escrever "Oportunidade" por extenso na tabela.
     */
    renderOpportunityDot(r) {

        if (r.tipoOportunidade === "amplificacao") {

            return `<span class="analises-opp-dot" title="Oportunidade: baixa amplificação — destaque forte, pouca ação dedicada">🟡</span>`;

        }

        if (r.tipoOportunidade === "crescimento") {

            return `<span class="analises-opp-dot" title="Oportunidade: gravadora engajada — pouco destaque, já tem ação rodando">🟢</span>`;

        }

        return `<span class="analises-opp-dot analises-opp-dot--none" title="Sem oportunidade sinalizada">–</span>`;

    },

    /* ======================================================
       TABELA INTERATIVA GENÉRICA (ordenável + filtrável +
       cabeçalho fixo + clique por célula)
    ====================================================== */

    renderInteractiveTable({ container, columns, rows, searchPlaceholder }) {

        let sortKey = null;

        let sortDir = -1;

        let query = "";

        container.innerHTML = `
            <div class="analises-table-toolbar">
                <input type="search" class="analises-table-search" placeholder="${searchPlaceholder || "Buscar gravadora..."}">
            </div>
            <div class="hl-table-scroll">
                <table class="goals-table analises-interactive-table">
                    <thead><tr></tr></thead>
                    <tbody></tbody>
                </table>
            </div>
        `;

        const theadRow = container.querySelector("thead tr");

        const tbody = container.querySelector("tbody");

        const searchInput = container.querySelector(".analises-table-search");

        const getSortValue = (row, col) => col.sortValue ? col.sortValue(row) : row[col.key];

        const draw = () => {

            let filtered = rows;

            if (query) {

                const q = query.toLowerCase();

                filtered = rows.filter(r => String(r.nome || "").toLowerCase().includes(q));

            }

            if (sortKey) {

                const col = columns.find(c => c.key === sortKey);

                filtered = [...filtered].sort((a, b) => {

                    const x = getSortValue(a, col);
                    const y = getSortValue(b, col);

                    if (typeof x === "string" || typeof y === "string") {
                        return String(x).localeCompare(String(y), "pt-BR") * sortDir;
                    }

                    return ((x || 0) - (y || 0)) * sortDir;

                });

            }

            theadRow.innerHTML = columns.map(c => `
                <th data-key="${c.key}">${c.label} <span class="analises-sort-icon">${c.key === sortKey ? (sortDir === 1 ? "▲" : "▼") : "↕"}</span></th>
            `).join("");

            if (!filtered.length) {

                tbody.innerHTML = `<tr><td colspan="${columns.length}" class="analises-empty">Nenhum resultado para este filtro.</td></tr>`;

            }
            else {

                tbody.innerHTML = filtered.map(row => `
                    <tr>${columns.map(c => {

                        const cls = [c.onClick ? "analises-cell-link" : "", c.className || ""].filter(Boolean).join(" ");

                        return `<td class="${cls}">${c.render ? c.render(row) : (row[c.key] ?? "")}</td>`;

                    }).join("")}</tr>
                `).join("");

            }

            Array.from(theadRow.children).forEach(th => {

                th.addEventListener("click", () => {

                    const key = th.dataset.key;

                    if (sortKey === key) {
                        sortDir *= -1;
                    }
                    else {
                        sortKey = key;
                        sortDir = -1;
                    }

                    draw();

                });

            });

            Array.from(tbody.querySelectorAll("tr")).forEach((tr, index) => {

                const row = filtered[index];

                if (!row) return;

                columns.forEach((c, colIndex) => {

                    if (!c.onClick) return;

                    const td = tr.children[colIndex];

                    td.addEventListener("click", () => c.onClick(row));

                });

            });

        };

        searchInput.addEventListener("input", (event) => {

            query = event.target.value;

            draw();

        });

        draw();

    },

    /* ======================================================
       ANÁLISE 1 — PROPORCIONALIDADE (Destaques × Ações)
    ====================================================== */

    renderProportionality(market, slug) {

        const container = document.getElementById(`analises-prop-${slug}`);

        if (!container) return;

        const stats = AnalisesMetrics.getProportionalityStats(market);

        const hasSocial = stats.postsSociais !== undefined;

        container.innerHTML = `
            <p class="analises-caption">
                Compara o volume de destaques editoriais (capas/inclusões) recebidos por ${market} com o volume de ações de
                marketing dedicadas ao mercado. O índice mostra quantas ações existem pra cada destaque editorial — perto de
                1x é equilibrado; bem abaixo de 1x sugere menos esforço de marketing do que o peso editorial sugere; bem
                acima, o contrário.
            </p>
            <div class="analises-stat-row">
                <div class="analises-stat-card analises-clickable-stat" data-type="destaques">
                    <span>Destaques editoriais</span>
                    <h3>${this.fmt(stats.destaques)}</h3>
                </div>
                <div class="analises-stat-card analises-clickable-stat" data-type="acoes">
                    <span>Ações de marketing</span>
                    <h3>${this.fmt(stats.acoes)}</h3>
                </div>
                ${hasSocial ? `
                <div class="analises-stat-card analises-stat-card--muted">
                    <span>Posts sociais (Instagram)</span>
                    <h3>${this.fmt(stats.postsSociais)}</h3>
                    <small>Já contabilizados dentro das ações de marketing (Conteúdo para redes sociais)</small>
                </div>` : ""}
                <div class="analises-stat-card">
                    <span>Índice (ações por destaque)</span>
                    <h3>${this.fmtRatio(stats.indice)}</h3>
                </div>
            </div>
        `;

        const destaquesCard = container.querySelector('[data-type="destaques"]');

        const acoesCard = container.querySelector('[data-type="acoes"]');

        if (destaquesCard) {

            destaquesCard.addEventListener("click", () => {

                const rows = AnalisesMetrics.getHighlightsRows().filter(r => AnalisesMetrics.marketMatches(r.pais, market));

                Dashboard.openDrilldown(rows, `Destaques editoriais: ${market}`, HighlightsDashboard.drilldownColumns);

            });

        }

        if (acoesCard) {

            acoesCard.addEventListener("click", () => {

                const rows = AnalisesMetrics.getMarketingRows().filter(r => AnalisesMetrics.marketMatches(r.country, market));

                Dashboard.openDrilldown(rows, `Ações de marketing: ${market}`, Dashboard.drilldownColumns);

            });

        }

    },

    /* ======================================================
       ANÁLISE 2 — SHARE OF VOICE TOTAL POR GRAVADORA
    ====================================================== */

    buildBrasilSovColumns(market) {

        return [

            { key: "nome", label: "Gravadora", render: r => `<span class="action-name">${r.nome}</span>` },

            { key: "oportunidade", label: "", render: r => this.renderOpportunityDot(r), sortValue: r => r.oportunidadeScore, className: "analises-opp-cell" },

            { key: "destaques", label: "Destaques", render: r => this.fmt(r.destaques), onClick: r => this.openHighlightsDrilldown(r.nome, market) },

            { key: "acoes", label: "Ações de marketing / Posts sociais", render: r => this.fmt(r.acoes), onClick: r => this.openMarketingDrilldown(r.nome, market) },

            { key: "amplificacao", label: "Amplificação", render: r => this.fmtRatio(r.amplificacao), sortValue: r => r.amplificacao ?? -1 },

            { key: "alcanceMedio", label: "Alcance médio", render: r => this.fmt(r.alcanceMedio), onClick: r => this.openSocialDrilldown(r.nome, market, `Posts sociais (alcance): ${r.nome} (${market})`) },

            { key: "pctCollab", label: "% Collabs", render: r => this.fmtPct(r.pctCollab), onClick: r => this.openSocialDrilldown(r.nome, market, `Posts sociais (collab): ${r.nome} (${market})`) },

            { key: "engajamentoMedio", label: "Engajamento médio", render: r => this.fmtPct(r.engajamentoMedio), onClick: r => this.openSocialDrilldown(r.nome, market, `Posts sociais (engajamento): ${r.nome} (${market})`) },

            { key: "total", label: "Total (SOV)", render: r => this.fmt(r.total) },

            { key: "share", label: "% do share", render: r => this.fmtPct(r.share) },

            { key: "status", label: "Status", render: r => r.statusComment, className: "analises-status-cell" }

        ];

    },

    buildColombiaSovColumns(market) {

        const types = AnalisesMetrics.COLOMBIA_ACTION_TYPES;

        return [

            { key: "nome", label: "Gravadora", render: r => `<span class="action-name">${r.nome}</span>` },

            { key: "oportunidade", label: "", render: r => this.renderOpportunityDot(r), sortValue: r => r.oportunidadeScore, className: "analises-opp-cell" },

            { key: "destaques", label: "Destaques", render: r => this.fmt(r.destaques), onClick: r => this.openHighlightsDrilldown(r.nome, market) },

            { key: "streamToWin", label: types[0], render: r => this.fmt(r.acoesPorTipo[0]), sortValue: r => r.acoesPorTipo[0], onClick: r => this.openMarketingDrilldown(r.nome, market, types[0], `${types[0]}: ${r.nome} (${market})`) },

            { key: "saludoLanzamiento", label: types[1], render: r => this.fmt(r.acoesPorTipo[1]), sortValue: r => r.acoesPorTipo[1], onClick: r => this.openMarketingDrilldown(r.nome, market, types[1], `${types[1]}: ${r.nome} (${market})`) },

            { key: "artistaSemana", label: types[2], render: r => this.fmt(r.acoesPorTipo[2]), sortValue: r => r.acoesPorTipo[2], onClick: r => this.openMarketingDrilldown(r.nome, market, types[2], `${types[2]}: ${r.nome} (${market})`) },

            { key: "amplificacao", label: "Amplificação", render: r => this.fmtRatio(r.amplificacao), sortValue: r => r.amplificacao ?? -1 },

            { key: "total", label: "Total (SOV)", render: r => this.fmt(r.total) },

            { key: "share", label: "% do share", render: r => this.fmtPct(r.share) },

            { key: "status", label: "Status", render: r => r.statusComment, className: "analises-status-cell" }

        ];

    },

    renderShareOfVoice(market, slug) {

        const tableContainer = document.getElementById(`analises-sov-table-${slug}`);

        const chartId = `chart-analises-sov-${slug}`;

        if (!tableContainer) return;

        const { rows, columns } = AnalisesMetrics.getShareOfVoiceTable(market);

        if (!rows.length) {

            tableContainer.innerHTML = `<p class="analises-empty">Sem dados suficientes para ${market} neste recorte.</p>`;

            HighlightsCharts.destroy(chartId);

            return;

        }

        const colorMap = HighlightsCharts.getGravadoraColorMap();

        const top = rows.slice(0, 8);

        const wrap = document.getElementById(`wrap-${chartId}`);

        if (wrap) {

            wrap.style.height = `${Math.max(190, top.length * 27 + 40)}px`;

        }

        HighlightsCharts.horizontalBar(
            chartId,
            HighlightsCharts.buildChartData({

                labels: top.map(r => r.nome),

                datasets: [{

                    label: "Share of voice",
                    data: top.map(r => r.total),
                    backgroundColor: top.map(r => colorMap.get(r.nome) || HighlightsCharts.colors.gray),
                    borderRadius: 4,
                    maxBarThickness: 18

                }]

            }),
            {
                scales: {
                    x: { grid: { display: false }, beginAtZero: true },
                    y: { grid: { display: false } }
                },
                onClick: (event, elements) => {

                    if (!elements.length) return;

                    const nome = top[elements[0].index].nome;

                    this.openMarketingDrilldown(nome, market);

                }
            }
        );

        const cols = columns === "brasil"
            ? this.buildBrasilSovColumns(market)
            : this.buildColombiaSovColumns(market);

        const caption = columns === "brasil"
            ? `Cruza o volume de destaques editoriais (capas/inclusões) com o esforço de marketing dedicado a cada gravadora. <strong>Amplificação</strong> = ações de marketing / destaques editoriais recebidos (quanto menor, maior a oportunidade de dar mais apoio a quem já performa bem no editorial). Também sinalizamos o caminho oposto: gravadoras com pouco destaque editorial mas que já têm ações rodando: sinal de engajamento que pode render mais espaço editorial no futuro. A tabela já vem ordenada da maior pra menor oportunidade. É possível ordenar, também, dos maiores alcances e engajamento para os menores.`
            : `Cruza o volume de destaques editoriais (capas/inclusões) com o esforço de marketing dedicado a cada gravadora. <strong>Amplificação</strong> = ações de marketing / destaques editoriais recebidos (quanto menor, maior a oportunidade de dar mais apoio a quem já performa bem no editorial). Também sinalizamos o caminho oposto: gravadoras com pouco destaque editorial mas que já têm ações rodando: sinal de engajamento que pode render mais espaço editorial no futuro. A tabela já vem ordenada da maior pra menor oportunidade.`;

        tableContainer.innerHTML = `
            <p class="analises-caption">${caption}</p>
            <div class="analises-table-target"></div>
        `;

        this.renderInteractiveTable({

            container: tableContainer.querySelector(".analises-table-target"),
            columns: cols,
            rows,
            searchPlaceholder: "Buscar gravadora..."

        });

    }

};
