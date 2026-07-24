/**
 * ==========================================================
 * HIGHLIGHTS METRICS (Destaques de gravadoras)
 * ----------------------------------------------------------
 * Responsável por:
 * - Aplicar filtros
 * - Calcular KPIs
 * - Montar as tabelas e agrupamentos usados pelos gráficos
 *
 * Mesmo padrão do social-metrics.js. Este módulo NÃO desenha
 * gráficos e NÃO monta HTML.
 * ==========================================================
 */

const HighlightsMetrics = {

    filters: {

        pais: "",

        disquera: "",

        ownerMajor: "",

        mes: "",

        q: ""

    },

    setFilters(filters = {}) {

        this.filters = {

            ...this.filters,

            ...filters

        };

    },

    clearFilters() {

        this.filters = {

            pais: "",

            disquera: "",

            ownerMajor: "",

            mes: "",

            q: ""

        };

    },

    getFilters() {

        return { ...this.filters };

    },

    /**
     * -----------------------------------------
     * Linhas considerando os filtros ativos
     * -----------------------------------------
     */
    getRows() {

        return HighlightsData.getFilteredRows(this.filters);

    },

    isCapa(row) {
        return row.destaque === "CAPA";
    },

    isInclusao(row) {
        return row.destaque === "INCLUSÃO";
    },

    isInstagram(row) {
        return row.destaque === "INSTAGRAM";
    },

    /**
     * -----------------------------------------
     * KPIs gerais (respeitam os filtros ativos)
     * -----------------------------------------
     */
    getKPIs() {

        const rows = this.getRows();

        const capas = rows.filter(r => this.isCapa(r)).length;

        const inclusoes = rows.filter(r => this.isInclusao(r)).length;

        const instagram = rows.filter(r => this.isInstagram(r)).length;

        return {

            total: rows.length,

            capas,

            inclusoes,

            instagram,

            paises: new Set(rows.map(r => r.pais)).size,

            disqueras: new Set(rows.map(r => r.disquera)).size,

            artistas: new Set(rows.map(r => r.artist).filter(Boolean)).size

        };

    },

    /**
     * -----------------------------------------
     * Tabela: Disquera × (Inclusão / Capa / Instagram / Total)
     * -----------------------------------------
     */
    getDisqueraTable() {

        const rows = this.getRows();

        const map = new Map();

        rows.forEach(row => {

            const key = row.disquera || "Não informado";

            if (!map.has(key)) {

                map.set(key, { disquera: key, inclusao: 0, capa: 0, instagram: 0, total: 0 });

            }

            const entry = map.get(key);

            if (this.isCapa(row)) entry.capa++;
            else if (this.isInstagram(row)) entry.instagram++;
            else entry.inclusao++;

            entry.total++;

        });

        const list = [...map.values()].sort((a, b) => b.total - a.total);

        const totals = list.reduce((acc, entry) => {

            acc.inclusao += entry.inclusao;
            acc.capa += entry.capa;
            acc.instagram += entry.instagram;
            acc.total += entry.total;

            return acc;

        }, { disquera: "Total geral", inclusao: 0, capa: 0, instagram: 0, total: 0 });

        return { rows: list, totals };

    },

    /**
     * -----------------------------------------
     * Pivot: Destaque (Inclusão/Capa/Instagram) × País
     * -----------------------------------------
     */
    getPaisPivot() {

        const rows = this.getRows();

        const paises = HighlightsData.uniqueSorted(rows.map(r => r.pais));

        const tipos = [
            { key: "INCLUSÃO", label: "INCLUSÃO", test: r => this.isInclusao(r) },
            { key: "CAPA", label: "CAPA", test: r => this.isCapa(r) }
        ];

        const pivotRows = tipos.map(tipo => {

            const values = {};

            let total = 0;

            paises.forEach(pais => {

                const count = rows.filter(r => r.pais === pais && tipo.test(r)).length;

                values[pais] = count;

                total += count;

            });

            return { destaque: tipo.label, values, total };

        });

        return { paises, rows: pivotRows };

    },

    /**
     * -----------------------------------------
     * Agrupamento genérico (conta linhas por campo)
     * -----------------------------------------
     */
    groupBy(field, rows = null) {

        const source = rows || this.getRows();

        const map = new Map();

        source.forEach(row => {

            const key = row[field] || "Não informado";

            map.set(key, (map.get(key) || 0) + 1);

        });

        return [...map.entries()]
            .map(([nome, total]) => ({ nome, total }))
            .sort((a, b) => b.total - a.total);

    },

    topN(groups, n) {

        return groups.slice(0, n);

    },

    /**
     * -----------------------------------------
     * Distribuição fixa por gravadora (Disquera), usada
     * pelos 6 donuts "Destaques/Capas por gravadora".
     * NÃO reage aos filtros da sidebar — sempre olha o
     * dataset completo, recortado só por país fixo.
     * -----------------------------------------
     */
    getFixedGravadoraDistribution(paisFiltro, onlyCapa) {

        const all = HighlightsData.rows.filter(row => {

            if (paisFiltro && row.pais !== paisFiltro) return false;

            if (onlyCapa) return this.isCapa(row);

            return true;

        });

        return this.groupBy("disquera", all);

    },

    /**
     * -----------------------------------------
     * Série mensal por país (para o gráfico de evolução)
     * -----------------------------------------
     */
    getMonthlySeriesByPais(limitPaises = 14) {

        const rows = this.getRows();

        const meses = [...new Set(rows.map(r => r.mesKey).filter(Boolean))].sort();

        const paisesRanking = this.groupBy("pais", rows).slice(0, limitPaises).map(g => g.nome);

        const series = paisesRanking.map(pais => {

            const data = meses.map(mesKey =>
                rows.filter(r => r.pais === pais && r.mesKey === mesKey).length
            );

            return { pais, data };

        });

        const labels = meses.map(mesKey => {

            const [ano, mes] = mesKey.split("-");

            return `${CONFIG.DATE.shortMonths[Number(mes) - 1]}/${ano.slice(2)}`;

        });

        return { labels, series };

    },

    /**
     * -----------------------------------------
     * Top N por Owner/Major (Destaques ou só Capas)
     * -----------------------------------------
     */
    getOwnerMajorGroups({ onlyCapa = false, limit = 10 } = {}) {

        const rows = this.getRows().filter(r => onlyCapa ? this.isCapa(r) : true);

        return this.topN(this.groupBy("ownerMajor", rows), limit);

    },

};
