/**
 * ==========================================================
 * HIGHLIGHTS DASHBOARD (Destaques de gravadoras)
 * ----------------------------------------------------------
 * Orquestrador: carrega os dados, liga os filtros da sidebar
 * e renderiza KPIs, tabelas, gráficos e a tabela de
 * detalhamento. Mesmo padrão do social-dashboard.js.
 *
 * KPIs e gráficos (donuts + barras de owner/major) são
 * clicáveis — abrem o mesmo modal de drill-down usado no
 * Marketing e na Visão Geral (Dashboard.openDrilldown), com
 * as colunas do esquema de Destaques de gravadoras.
 * ==========================================================
 */

const HighlightsDashboard = {

    filters: {},

    initialized: false,

    filtersBound: false,

    kpiDrilldownsBound: false,

    detailTable: null,

    /**
     * Colunas do drill-down (KPIs, gráficos e tabela de
     * detalhamento usam todas o mesmo esquema).
     */
    drilldownColumns: [

        { key: "pais", label: "País" },

        {
            key: "destaque",
            label: "Destaque",
            render: v => {

                const cls = v === "CAPA" ? "capa" : (v === "INSTAGRAM" ? "instagram" : "inclusao");

                return `<span class="badge ${cls}">${v}</span>`;

            }
        },

        { key: "playlist", label: "Playlist" },

        { key: "artist", label: "Artist" },

        { key: "contenido", label: "Conteúdo" },

        { key: "disquera", label: "Disquera" },

        { key: "ownerMajor", label: "Owner / Major" },

        {
            key: "data",
            label: "Semana",
            render: v => v ? v.toLocaleDateString(CONFIG.DATE.locale) : "—"
        }

    ],

    filterSelects: {

        filterHighlightsPais: "pais",

        filterHighlightsMes: "mes",

        filterHighlightsAno: "ano",

        filterHighlightsSemana: "semana",

        filterHighlightsDisquera: "disquera"

    },

    async init() {

        if (!HighlightsData.isLoaded()) {

            await HighlightsData.load(CONFIG.HIGHLIGHTS_DATA.csvUrl);

        }

        if (this.initialized) {

            return this;

        }

        this.populateFilters();

        this.bindFilters();

        this.bindKpiDrilldowns();

        // Redimensionar a janela muda a largura disponível (e a
        // largura da barra de rolagem some/aparece) — realinha as
        // colunas da tabela de Relação de destaques quando isso
        // acontecer.
        let resizeTimer;

        window.addEventListener("resize", () => {

            clearTimeout(resizeTimer);

            resizeTimer = setTimeout(() => {

                const container = document.getElementById("hlDisqueraTable");

                if (container) this.alignTotalTableColumns(container);

            }, 150);

        });

        this.initialized = true;

        return this;

    },

    populateFilters() {

        this.fillSelect("filterHighlightsPais", HighlightsData.getPaises());

        this.fillSelect("filterHighlightsMes", HighlightsData.getMeses());

        this.fillSelect("filterHighlightsAno", HighlightsData.getAnos());

        this.fillSelect("filterHighlightsSemana", HighlightsData.getSemanas());

        this.fillSelect("filterHighlightsDisquera", HighlightsData.getDisqueras());

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

                this.filters = {
                    ...this.filters,
                    [filterKey]: value === "Todos" ? "" : value
                };

                this.refresh();

            });

        });

        const search = document.getElementById("filterHighlightsSearch");

        if (search) {

            let timer;

            search.addEventListener("input", () => {

                clearTimeout(timer);

                timer = setTimeout(() => {

                    this.filters = {
                        ...this.filters,
                        q: search.value.trim().toLowerCase()
                    };

                    this.refresh();

                }, 200);

            });

        }

        const clearBtn = document.getElementById("filterHighlightsClear");

        if (clearBtn) {

            clearBtn.addEventListener("click", () => {

                Object.keys(this.filterSelects).forEach(id => {

                    const el = document.getElementById(id);

                    if (el) el.value = "Todos";

                });

                if (search) search.value = "";

                this.filters = {};

                this.refresh();

            });

        }

    },

    /**
     * -----------------------------------------
     * KPIs clicáveis — mesmo padrão da Visão Geral. Os dados
     * são lidos de this._... no momento do clique (recalculados
     * a cada renderKPIs()), nunca ficam presos num estado velho.
     * -----------------------------------------
     */
    bindKpiDrilldowns() {

        if (this.kpiDrilldownsBound) return;

        this.kpiDrilldownsBound = true;

        const map = {

            hlKpiTotal: () => ({ rows: this._totalRows, title: "Total de destaques" }),

            hlKpiCapas: () => ({ rows: this._capasRows, title: "Capas" }),

            hlKpiInclusoes: () => ({ rows: this._inclusoesRows, title: "Inclusões" }),

            hlKpiInstagram: () => ({ rows: this._instagramRows, title: "Destaques no Instagram" })

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

    refresh() {

        if (!this.initialized) return this;

        // Sempre parte do zero e reaplica this.filters — assim um
        // filtro removido (ex.: "Limpar filtros") realmente some,
        // em vez de ficar "grudado" pela mesclagem do setFilters.
        HighlightsMetrics.clearFilters();

        HighlightsMetrics.setFilters(this.filters);

        this.renderKPIs();

        this.renderDisqueraTable();

        this.renderPaisPivot();

        this.renderFixedDonuts();

        this.renderEvolucao();

        this.renderOwnerMajorCharts();

        this.renderDetailTable();

        return this;

    },

    /* ======================================================
       KPIs
    ====================================================== */

    renderKPIs() {

        const k = HighlightsMetrics.getKPIs();

        const rows = HighlightsMetrics.getRows();

        this._totalRows = rows;
        this._capasRows = rows.filter(r => HighlightsMetrics.isCapa(r));
        this._inclusoesRows = rows.filter(r => HighlightsMetrics.isInclusao(r));
        this._instagramRows = rows.filter(r => HighlightsMetrics.isInstagram(r));

        const set = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
        };

        set("hlKpiTotal", k.total.toLocaleString("pt-BR"));
        set("hlKpiCapas", k.capas.toLocaleString("pt-BR"));
        set("hlKpiInclusoes", k.inclusoes.toLocaleString("pt-BR"));
        set("hlKpiInstagram", k.instagram.toLocaleString("pt-BR"));

    },

    /* ======================================================
       TABELA: Relação de destaques (Disquera × Inclusão/Capa)

       Só as linhas de disquera ficam num scroll (~5 linhas
       visíveis); "Total geral" fica sempre visível, fora do
       scroll, com destaque visual mais escuro.
    ====================================================== */

    renderDisqueraTable() {

        const container = document.getElementById("hlDisqueraTable");

        if (!container) return;

        const { rows, totals } = HighlightsMetrics.getDisqueraTable();

        const fmt = n => n.toLocaleString("pt-BR");

        const body = rows.map(row => `
            <tr>
                <td class="action-name">${row.disquera}</td>
                <td>${fmt(row.inclusao)}</td>
                <td>${fmt(row.capa)}</td>
                <td><strong>${fmt(row.total)}</strong></td>
            </tr>
        `).join("");

        container.innerHTML = `
            <div class="hl-table-scroll">
                <table class="goals-table">
                    <thead>
                        <tr>
                            <th>Disquera</th>
                            <th>Inclusão</th>
                            <th>Capa</th>
                            <th>Total geral</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${body}
                    </tbody>
                </table>
            </div>
            <table class="goals-table hl-total-table">
                <tbody>
                    <tr class="hl-total-row">
                        <td class="action-name">Total geral</td>
                        <td>${fmt(totals.inclusao)}</td>
                        <td>${fmt(totals.capa)}</td>
                        <td><strong>${fmt(totals.total)}</strong></td>
                    </tr>
                </tbody>
            </table>
        `;

        this.alignTotalTableColumns(container);

    },

    /**
     * -----------------------------------------
     * A tabela de Total geral é uma <table> separada da tabela
     * com scroll (pra poder congelar o cabeçalho e fixar o
     * total embaixo) — % de largura via CSS não fica
     * pixel-a-pixel igual entre as duas (barra de rolagem,
     * arredondamento etc.). Em vez de tentar acertar isso só
     * com CSS, mede a largura REAL de cada coluna no cabeçalho
     * (referência) e força os mesmos pixels nas duas tabelas.
     * -----------------------------------------
     */
    alignTotalTableColumns(container) {

        const scrollTable = container.querySelector(".hl-table-scroll table");

        const headerCells = container.querySelectorAll(".hl-table-scroll thead th");

        const bodyCells = container.querySelectorAll(".hl-table-scroll tbody tr:first-child td");

        const totalTable = container.querySelector(".hl-total-table");

        const totalCells = container.querySelectorAll(".hl-total-table tbody td");

        if (!headerCells.length || !totalCells.length) return;

        // Em table-layout:fixed, se a LARGURA DA TABELA não bater com
        // a soma das larguras das colunas, o navegador redistribui a
        // sobra proporcionalmente — e como a tabela de baixo não tem
        // barra de rolagem (é ~15-17px mais larga que a de cima), as
        // colunas "esticam" e desalinham mesmo com a mesma largura
        // pedida por coluna. Trava a largura da tabela também.
        if (totalTable && scrollTable) {

            totalTable.style.width = `${scrollTable.getBoundingClientRect().width}px`;

        }

        headerCells.forEach((th, index) => {

            const width = `${th.getBoundingClientRect().width}px`;

            th.style.width = width;

            if (bodyCells[index]) bodyCells[index].style.width = width;

            if (totalCells[index]) totalCells[index].style.width = width;

        });

    },

    /* ======================================================
       TABELA PIVOT: Destaques por país (Inclusão/Capa × País)
    ====================================================== */

    renderPaisPivot() {

        const container = document.getElementById("hlPaisPivotTable");

        if (!container) return;

        const { paises, rows } = HighlightsMetrics.getPaisPivot();

        const fmt = n => n.toLocaleString("pt-BR");

        if (!paises.length) {

            container.innerHTML = `<p>Nenhum registro para os filtros atuais.</p>`;

            return;

        }

        const headerCols = paises.map(p => `<th>${p}</th>`).join("");

        const body = rows.map(row => `
            <tr>
                <td class="action-name">${row.destaque}</td>
                ${paises.map(p => `<td>${fmt(row.values[p] || 0)}</td>`).join("")}
                <td><strong>${fmt(row.total)}</strong></td>
            </tr>
        `).join("");

        container.innerHTML = `
            <table class="goals-table">
                <thead>
                    <tr>
                        <th>Destaque</th>
                        ${headerCols}
                        <th>Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${body}
                </tbody>
            </table>
        `;

    },

    /* ======================================================
       6 DONUTS FIXOS: Destaques/Capas por gravadora
       (Brasil / Colômbia / 14 países) — não reagem aos
       filtros da sidebar, só ao dataset completo. Clicáveis:
       cada fatia abre o drill-down daquela gravadora no
       recorte fixo daquele donut. Cor: mapa global
       (HighlightsCharts.getGravadoraColorMap) — mesma cor de
       uma gravadora em qualquer gráfico do dashboard.
    ====================================================== */

    renderFixedDonuts() {

        const colorMap = HighlightsCharts.getGravadoraColorMap();

        const combos = [

            { pais: "Brasil", onlyCapa: false, chart: "chart-hl-destaques-brasil", legend: "legend-hl-destaques-brasil" },
            { pais: "Brasil", onlyCapa: true, chart: "chart-hl-capas-brasil", legend: "legend-hl-capas-brasil" },
            { pais: "Colombia", onlyCapa: false, chart: "chart-hl-destaques-colombia", legend: "legend-hl-destaques-colombia" },
            { pais: "Colombia", onlyCapa: true, chart: "chart-hl-capas-colombia", legend: "legend-hl-capas-colombia" },
            { pais: null, onlyCapa: false, chart: "chart-hl-destaques-total", legend: "legend-hl-destaques-total" },
            { pais: null, onlyCapa: true, chart: "chart-hl-capas-total", legend: "legend-hl-capas-total" }

        ];

        combos.forEach(combo => {

            const groups = HighlightsMetrics.getFixedGravadoraDistribution(combo.pais, combo.onlyCapa);

            const data = HighlightsCharts.buildChartData({

                labels: groups.map(g => g.nome),

                datasets: [{

                    data: groups.map(g => g.total),

                    backgroundColor: groups.map(g => colorMap.get(g.nome) || HighlightsCharts.colors.gray)

                }]

            });

            HighlightsCharts.doughnut(combo.chart, data, {

                onClick: (event, elements) => {

                    if (!elements.length) return;

                    const gravadora = groups[elements[0].index].nome;

                    const rows = HighlightsData.rows.filter(row => {

                        if (combo.pais && row.pais !== combo.pais) return false;

                        if (combo.onlyCapa && !HighlightsMetrics.isCapa(row)) return false;

                        return row.disquera === gravadora;

                    });

                    const scopeLabel = combo.pais || "14 países";

                    const tipoLabel = combo.onlyCapa ? "Capas" : "Destaques";

                    Dashboard.openDrilldown(rows, `${gravadora} — ${tipoLabel} (${scopeLabel})`, this.drilldownColumns);

                }

            });

            this.renderDonutLegend(combo.legend, groups, colorMap);

        });

    },

    renderDonutLegend(containerId, groups, colorMap) {

        const container = document.getElementById(containerId);

        if (!container) return;

        const total = groups.reduce((sum, g) => sum + g.total, 0);

        const top = groups.slice(0, 10);

        const rest = groups.slice(10);

        let html = top.map(g => {

            const pct = total ? ((g.total / total) * 100).toFixed(1) : "0.0";

            const color = colorMap.get(g.nome) || HighlightsCharts.colors.gray;

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
       EVOLUÇÃO MENSAL POR PAÍS (linha) — design mais discreto:
       linhas finas, pontos pequenos, curva suave.
    ====================================================== */

    renderEvolucao() {

        const { labels, series } = HighlightsMetrics.getMonthlySeriesByPais();

        const datasets = series.map((serie, index) => ({

            label: serie.pais,
            data: serie.data,
            borderColor: HighlightsCharts.getColor(index),
            backgroundColor: HighlightsCharts.getColor(index),
            tension: 0.4,
            borderWidth: 1.5,
            pointRadius: 1.5,
            pointHoverRadius: 4

        }));

        HighlightsCharts.line(

            "chart-hl-evolucao",

            HighlightsCharts.buildChartData({ labels, datasets })

        );

    },

    /* ======================================================
       BARRAS: Destaques/Capas por Owner/Major — clicáveis.
       Mesma cor por gravadora do resto do dashboard (mapa
       global — "Sony Music" etc. têm a cor idêntica à dos
       donuts de Disquera).
    ====================================================== */

    renderOwnerMajorCharts() {

        const destaques = HighlightsMetrics.getOwnerMajorGroups({ onlyCapa: false, limit: 10 });

        const capas = HighlightsMetrics.getOwnerMajorGroups({ onlyCapa: true, limit: 10 });

        const colorMap = HighlightsCharts.getGravadoraColorMap();

        HighlightsCharts.horizontalBar(
            "chart-hl-owner-destaques",
            HighlightsCharts.buildChartData({

                labels: destaques.map(g => g.nome),

                datasets: [{

                    label: "Destaques",
                    data: destaques.map(g => g.total),
                    backgroundColor: destaques.map(g => colorMap.get(g.nome) || HighlightsCharts.colors.gray),
                    borderRadius: 5,
                    maxBarThickness: 30

                }]

            }),
            {
                onClick: (event, elements) => {

                    if (!elements.length) return;

                    const nome = destaques[elements[0].index].nome;

                    const rows = HighlightsMetrics.getRows().filter(row => row.ownerMajor === nome);

                    Dashboard.openDrilldown(rows, `Owner/Major: ${nome} — Destaques`, this.drilldownColumns);

                }
            }
        );

        HighlightsCharts.horizontalBar(
            "chart-hl-owner-capas",
            HighlightsCharts.buildChartData({

                labels: capas.map(g => g.nome),

                datasets: [{

                    label: "Capas",
                    data: capas.map(g => g.total),
                    backgroundColor: capas.map(g => colorMap.get(g.nome) || HighlightsCharts.colors.gray),
                    borderRadius: 5,
                    maxBarThickness: 30

                }]

            }),
            {
                onClick: (event, elements) => {

                    if (!elements.length) return;

                    const nome = capas[elements[0].index].nome;

                    const rows = HighlightsMetrics.getRows().filter(
                        row => row.ownerMajor === nome && HighlightsMetrics.isCapa(row)
                    );

                    Dashboard.openDrilldown(rows, `Owner/Major: ${nome} — Capas`, this.drilldownColumns);

                }
            }
        );

    },

    /* ======================================================
       TABELA DE DETALHAMENTO
    ====================================================== */

    renderDetailTable() {

        const container = document.getElementById("hlDetailTable");

        if (!container) return;

        if (!this.detailTable) {

            this.detailTable = DataTable.create(

                container,
                this.drilldownColumns,
                () => HighlightsMetrics.getRows(),
                {
                    csvExport: false,
                    linkButton: {
                        label: "Planilha Reporte",
                        url: "https://docs.google.com/spreadsheets/d/1NUvJnfy87IaLB8usWQnsefQeQY5C0WlSKceroLMHG5c/edit?usp=sharing"
                    }
                }

            );

        }

        this.detailTable.setPage(1);

        this.detailTable.render();

    }

};
