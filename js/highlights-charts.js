/**
 * ==========================================================
 * HIGHLIGHTS CHARTS (Destaques de gravadoras)
 * ----------------------------------------------------------
 * Fábrica de gráficos Chart.js. Mesmo padrão do
 * social-charts.js.
 *
 * getGravadoraColorMap() é global e reaproveitável por
 * qualquer página/módulo: dá a MESMA cor pra uma gravadora
 * em qualquer gráfico do dashboard (donuts e barras de
 * owner/major hoje; qualquer gráfico futuro por gravadora
 * também pode chamar esse mesmo método).
 * ==========================================================
 */

const HighlightsCharts = {

    charts: {},

    defaults: {

        responsive: true,

        maintainAspectRatio: false,

        animation: {

            duration: 900,

            easing: "easeOutQuart"

        },

        plugins: {

            legend: {

                display: true,

                position: "bottom",

                labels: {

                    boxWidth: 10,

                    boxHeight: 10,

                    font: { size: 10.5 }

                }

            }

        }

    },

    colors: {

        blue: "#2563eb",
        green: "#16a34a",
        orange: "#ea580c",
        purple: "#7c3aed",
        red: "#dc2626",
        yellow: "#ca8a04",
        gray: "#6b7280"

    },

    palette: [

        "#2563eb", "#16a34a", "#ea580c", "#7c3aed", "#dc2626",
        "#ca8a04", "#0891b2", "#4f46e5", "#9333ea", "#15803d",
        "#b45309", "#475569", "#db2777", "#0d9488", "#65a30d",
        "#c026d3", "#4338ca", "#b91c1c", "#0ea5e9", "#84cc16",
        "#f97316", "#a855f7", "#ef4444", "#eab308", "#06b6d4",
        "#6366f1", "#d946ef", "#22c55e", "#f59e0b", "#64748b",
        "#ec4899", "#14b8a6", "#a3e635", "#e879f9", "#3730a3",
        "#991b1b"

    ],

    destroy(id) {

        if (this.charts[id]) {

            this.charts[id].destroy();

            delete this.charts[id];

        }

    },

    destroyAll() {

        Object.keys(this.charts).forEach(id => this.destroy(id));

    },

    getColor(index) {

        return this.palette[index % this.palette.length];

    },

    getColors(total) {

        return Array.from({ length: total }, (_, index) => this.getColor(index));

    },

    /**
     * -----------------------------------------
     * Mapa global gravadora -> cor. Uma gravadora tem sempre a
     * mesma cor onde quer que apareça (donuts por Disquera,
     * barras por Owner/Major, ou qualquer gráfico futuro) —
     * inclusive quando o mesmo nome aparece nos dois campos
     * (ex.: "Sony Music" é tanto Disquera quanto Owner/Major).
     *
     * Ordena pelo volume geral de destaques (maiores primeiro)
     * pra que as gravadoras mais relevantes fiquem com as
     * cores mais distintas da paleta; o resto entra em ordem
     * alfabética. Cacheado — só recalcula se pedirem.
     * -----------------------------------------
     */
    getGravadoraColorMap(forceRebuild = false) {

        if (this._gravadoraColorMap && !forceRebuild) {
            return this._gravadoraColorMap;
        }

        const names = new Set();

        let ranking = [];

        if (typeof HighlightsData !== "undefined" && HighlightsData.rows && HighlightsData.rows.length) {

            ranking = typeof HighlightsMetrics !== "undefined"
                ? HighlightsMetrics.groupBy("disquera", HighlightsData.rows).map(g => g.nome)
                : [];

            HighlightsData.getDisqueras().forEach(n => names.add(n));

            HighlightsData.getOwnerMajors().forEach(n => names.add(n));

        }

        if (typeof dataLoader !== "undefined" && typeof dataLoader.getUniqueValues === "function") {

            dataLoader.getUniqueValues("label").forEach(n => names.add(n));

        }

        const rest = [...names]
            .filter(n => n && !ranking.includes(n))
            .sort((a, b) => a.localeCompare(b, "pt-BR", { sensitivity: "base" }));

        const orderedNames = [...ranking, ...rest];

        const map = new Map();

        orderedNames.forEach(name => {

            if (!map.has(name)) {
                map.set(name, this.getColor(map.size));
            }

        });

        this._gravadoraColorMap = map;

        return map;

    },

    getGravadoraColor(name) {

        return this.getGravadoraColorMap().get(name) || this.colors.gray;

    },

    createChart(id, config) {

        this.destroy(id);

        const canvas = document.getElementById(id);

        if (!canvas) {

            console.error("Canvas não encontrado:", id);

            return null;

        }

        const chart = new Chart(canvas, config);

        this.charts[id] = chart;

        return chart;

    },

    line(id, data, options = {}) {

        return this.createChart(id, {

            type: "line",

            data,

            options: {

                ...this.defaults,

                interaction: { mode: "index", intersect: false },

                scales: { y: { beginAtZero: true } },

                ...options

            }

        });

    },

    bar(id, data, options = {}) {

        return this.createChart(id, {

            type: "bar",

            data,

            options: {

                ...this.defaults,

                plugins: { ...this.defaults.plugins, legend: { display: false } },

                scales: { y: { beginAtZero: true } },

                // Barra nasce do zero e cresce até o valor.
                animations: { y: { from: 0 } },

                ...options

            }

        });

    },

    horizontalBar(id, data, options = {}) {

        return this.createChart(id, {

            type: "bar",

            data,

            options: {

                indexAxis: "y",

                ...this.defaults,

                plugins: { ...this.defaults.plugins, legend: { display: false } },

                scales: { x: { beginAtZero: true } },

                // Barra nasce do zero e cresce até o valor.
                animations: { x: { from: 0 } },

                ...options

            }

        });

    },

    doughnut(id, data, options = {}) {

        const { plugins: pluginsOverride, ...restOptions } = options;

        return this.createChart(id, {

            type: "doughnut",

            data,

            options: {

                ...this.defaults,

                cutout: "60%",

                plugins: {

                    ...this.defaults.plugins,

                    legend: { display: false },

                    tooltip: {

                        callbacks: {

                            label(context) {

                                const value = context.parsed || 0;

                                const total = context.dataset.data.reduce((a, b) => a + b, 0);

                                const pct = total ? ((value / total) * 100).toFixed(1) : 0;

                                return ` ${context.label}: ${value.toLocaleString("pt-BR")} (${pct}%)`;

                            }

                        }

                    },

                    ...pluginsOverride

                },

                ...restOptions

            }

        });

    },

    buildChartData({ labels, datasets }) {

        return { labels, datasets };

    },

    /**
     * -----------------------------------------
     * Gráfico de barra/donut a partir de um array
     * [{nome,total}] já ordenado/limitado.
     * -----------------------------------------
     */
    renderGroupedChart({

        canvasId,
        groups,
        label = "",
        chart = "bar",
        horizontal = false

    }) {

        const labels = groups.map(g => g.nome);

        const values = groups.map(g => g.total);

        const data = this.buildChartData({

            labels,

            datasets: [{

                label,

                data: values,

                backgroundColor: this.getColors(labels.length),

                borderRadius: 5,

                maxBarThickness: 30

            }]

        });

        if (chart === "doughnut") {

            return this.doughnut(canvasId, data);

        }

        if (horizontal) {

            return this.horizontalBar(canvasId, data);

        }

        return this.bar(canvasId, data);

    }

};
