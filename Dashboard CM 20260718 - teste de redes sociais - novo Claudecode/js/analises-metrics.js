/**
 * ==========================================================
 * ANÁLISES 360 — MÉTRICAS
 * ----------------------------------------------------------
 * Cruza os dados já carregados sem duplicar nada: lê sempre
 * os dados BRUTOS (dataLoader.rows, HighlightsData.rows) e
 * aplica seu PRÓPRIO estado de filtros — nunca o de outra
 * aba — pra não interferir no que o usuário tiver selecionado
 * em Marketing/Destaques/Redes sociais.
 *
 * Fraseologias NÃO entram em nenhuma métrica desta página
 * (mesma regra usada nos KPIs de Marketing/Visão Geral).
 *
 * A base de "ações de marketing" já inclui o detalhe
 * "Conteúdo para redes sociais" — por isso as análises de
 * volume usam só essa base (evita contar o mesmo post duas
 * vezes). A base de Redes sociais (SocialData) só entra como
 * fonte de métricas de QUALIDADE (alcance médio, % de collab,
 * engajamento médio) no Share of voice do Brasil — é a única
 * base com esse tipo de dado, e só existe pro Brasil.
 *
 * Este módulo NÃO renderiza nada.
 * ==========================================================
 */

const AnalisesMetrics = {

    filters: {
        ano: "",
        trimestre: "",
        gravadora: "",
        responsavel: ""
    },

    MONTHS_LOWER: CONFIG.DATE.months.map(m => m.toLowerCase()),

    COLOMBIA_ACTION_TYPES: ["Stream to Win", "Saludo Lanzamiento", "Artista de la semana"],

    setFilters(filters = {}) {

        this.filters = { ...this.filters, ...filters };

    },

    clearFilters() {

        this.filters = { ano: "", trimestre: "", gravadora: "", responsavel: "" };

    },

    /* ======================================================
       HELPERS DE DATA / TRIMESTRE
    ====================================================== */

    monthIndexFromName(name) {

        if (!name) return null;

        const idx = this.MONTHS_LOWER.indexOf(String(name).trim().toLowerCase());

        return idx === -1 ? null : idx + 1;

    },

    quarterOfMonth(month) {

        if (!month) return null;

        return Math.floor((month - 1) / 3) + 1;

    },

    matchesQuarter(month) {

        if (!this.filters.trimestre) return true;

        if (!month) return false;

        return this.quarterOfMonth(month) === Number(String(this.filters.trimestre).replace("Q", ""));

    },

    /* ======================================================
       HELPERS DE TEXTO / PAÍS
    ====================================================== */

    normalizeText(value) {

        return String(value || "")
            .normalize("NFD")
            .replace(/[̀-ͯ]/g, "")
            .trim()
            .toLowerCase();

    },

    normalizeCountry(value) {

        const v = this.normalizeText(value);

        if (v === "brasil" || v === "brazil" || v === "br") return "Brasil";

        if (v === "colombia" || v === "co") return "Colômbia";

        return String(value || "").trim();

    },

    marketMatches(country, market) {

        const c = this.normalizeCountry(country);

        if (!c) return false;

        return c === market;

    },

    /* ======================================================
       DADOS BASE, JÁ FILTRADOS
       (Ano / Trimestre / Gravadora / Responsável — cada
       dataset ignora silenciosamente os filtros que não fazem
       sentido pra ele, ex.: Destaques não tem Responsável)
    ====================================================== */

    getMarketingRows() {

        if (typeof dataLoader === "undefined" || !dataLoader.rows) return [];

        return dataLoader.rows.filter(row => {

            if (typeof Metrics !== "undefined" && Metrics.isPhraseology(row)) return false;

            // Análises só considera ações CONCLUÍDAS, sempre — não
            // entram em andamento/standby/canceladas neste recorte.
            if (row.status !== CONFIG.STATUS.completed) return false;

            if (this.filters.ano && String(row.year) !== String(this.filters.ano)) return false;

            if (!this.matchesQuarter(row.month)) return false;

            if (this.filters.gravadora && !splitMultiValue(row.label).includes(this.filters.gravadora)) return false;

            if (this.filters.responsavel && !splitMultiValue(row.owner).includes(this.filters.responsavel)) return false;

            return true;

        });

    },

    getHighlightsRows() {

        if (typeof HighlightsData === "undefined" || !HighlightsData.rows) return [];

        return HighlightsData.rows.filter(row => {

            if (this.filters.ano && String(row.ano) !== String(this.filters.ano)) return false;

            if (!this.matchesQuarter(this.monthIndexFromName(row.mes))) return false;

            if (this.filters.gravadora && row.disquera !== this.filters.gravadora) return false;

            return true;

        });

    },

    /**
     * Só usado pra métricas de QUALIDADE do Brasil (alcance,
     * % collab, engajamento) — não entra em volume/contagem.
     */
    getSocialPosts() {

        if (typeof SocialData === "undefined" || !SocialData.posts) return [];

        return SocialData.posts.filter(post => {

            if (this.filters.ano && String(post.ano) !== String(this.filters.ano)) return false;

            if (!this.matchesQuarter(post.mes)) return false;

            if (this.filters.gravadora && !splitMultiValue(post.gravadora).includes(this.filters.gravadora)) return false;

            if (this.filters.responsavel && !splitMultiValue(post.responsavel).includes(this.filters.responsavel)) return false;

            return true;

        });

    },

    /* ======================================================
       OPÇÕES DOS FILTROS (união das bases)
    ====================================================== */

    getYears() {

        const years = new Set();

        (typeof dataLoader !== "undefined" ? dataLoader.rows : []).forEach(r => r.year && years.add(r.year));

        (typeof HighlightsData !== "undefined" ? HighlightsData.rows : []).forEach(r => r.ano && years.add(r.ano));

        return [...years].sort((a, b) => a - b);

    },

    getGravadoras() {

        const names = new Set();

        (typeof dataLoader !== "undefined" ? dataLoader.rows : []).forEach(r => splitMultiValue(r.label).forEach(n => names.add(n)));

        (typeof HighlightsData !== "undefined" ? HighlightsData.rows : []).forEach(r => r.disquera && names.add(r.disquera));

        return [...names]
            .filter(n => this.normalizeText(n) !== "nao se aplica")
            .sort((a, b) => a.localeCompare(b, "pt-BR", { sensitivity: "base" }));

    },

    getResponsaveis() {

        const names = new Set();

        (typeof dataLoader !== "undefined" ? dataLoader.rows : []).forEach(r => splitMultiValue(r.owner).forEach(n => names.add(n)));

        return [...names].sort((a, b) => a.localeCompare(b, "pt-BR", { sensitivity: "base" }));

    },

    /* ======================================================
       HELPERS DE LINHAS BRUTAS (drill-down por célula)
    ====================================================== */

    getHighlightsRowsFor(nome, market) {

        return this.getHighlightsRows().filter(r =>
            this.marketMatches(r.pais, market) && (r.disquera || "Não informado") === nome
        );

    },

    getMarketingRowsFor(nome, market, detailFilter = null) {

        return this.getMarketingRows().filter(r => {

            if (!this.marketMatches(r.country, market)) return false;

            if (!splitMultiValue(r.label).includes(nome)) return false;

            if (detailFilter) {

                const details = splitMultiValue(r.detail).map(d => this.normalizeText(d));

                if (!details.includes(this.normalizeText(detailFilter))) return false;

            }

            return true;

        });

    },

    /**
     * Posts sociais de uma gravadora específica — usado pelo
     * drill-down das colunas de qualidade (Alcance médio, %
     * Collabs, Engajamento médio) no Share of voice do Brasil.
     */
    getSocialPostsFor(nome) {

        return this.getSocialPosts().filter(post =>
            splitMultiValue(post.gravadora).includes(nome)
        );

    },

    /* ======================================================
       MEDIANA (utilitário)
    ====================================================== */

    median(values) {

        if (!values.length) return 0;

        const sorted = [...values].sort((a, b) => a - b);

        const mid = Math.floor(sorted.length / 2);

        return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;

    },

    /**
     * Comentário de status sempre preenchido (nunca vazio) —
     * usado tanto na análise de sub-representação quanto no
     * Share of voice.
     */
    buildBalanceComment(destaques, esforco, medianRatio) {

        if (!destaques && !esforco) {
            return "Sem volume suficiente neste recorte.";
        }

        if (!destaques && esforco > 0) {
            return "Gravadora engajada nas ações, mas ainda sem destaque editorial.";
        }

        if (destaques > 0 && !esforco) {
            return "Tem destaque editorial, mas nenhuma ação dedicada.";
        }

        const ratio = esforco / destaques;

        if (medianRatio > 0 && ratio > medianRatio * 1.6) {
            return "Muitas ações em relação aos destaques recebidos.";
        }

        if (medianRatio > 0 && ratio < medianRatio * 0.5) {
            return "Muito destaque editorial, pouca ação dedicada.";
        }

        return "Bom equilíbrio entre destaques e ações.";

    },

    /**
     * Classifica cada linha em um dos dois tipos de
     * oportunidade e calcula a "amplificação" — reaproveitado
     * pelo Share of voice (a tabela dedicada de sub-representação
     * foi removida por ser redundante com o SOV, que já cruza
     * os mesmos dados de forma mais completa).
     *
     * - "amplificacao": já tem bastante destaque editorial mas
     *   pouco esforço de marketing dedicado — dá pra amplificar
     *   quem já performa bem no editorial.
     * - "crescimento": tem pouco (ou nenhum) destaque editorial
     *   mas já tem esforço de marketing rodando — gravadora
     *   engajada, candidata a ganhar mais espaço editorial.
     */
    classifyOpportunity(rows, effortKey) {

        if (!rows.length) return rows;

        rows.forEach(r => {
            r.amplificacao = r.destaques ? r[effortKey] / r.destaques : null;
        });

        const withEditorial = rows.filter(r => r.destaques > 0);

        const medianDestaques = this.median(withEditorial.map(r => r.destaques));

        const medianAmplificacao = this.median(withEditorial.map(r => r.amplificacao));

        rows.forEach(r => {

            r.tipoOportunidade = null;

            if (r.destaques > 0 && r.destaques >= medianDestaques && (r.amplificacao ?? 0) <= medianAmplificacao) {

                r.tipoOportunidade = "amplificacao";

            }
            else if (r[effortKey] > 0 && (r.destaques === 0 || r.destaques < medianDestaques)) {

                r.tipoOportunidade = "crescimento";

            }

            if (r.tipoOportunidade === "amplificacao") {

                r.statusComment = "Destaque editorial forte, pouca ação de marketing dedicada — dá pra amplificar.";

                r.oportunidadeScore = r.destaques * 2 - (r.amplificacao || 0) * r.destaques;

            }
            else if (r.tipoOportunidade === "crescimento") {

                r.statusComment = "Já tem ação de marketing rodando com pouco destaque editorial — potencial pra crescer no editorial.";

                r.oportunidadeScore = r[effortKey];

            }
            else {

                r.oportunidadeScore = -1;

            }

        });

        return rows;

    },

    /* ======================================================
       ANÁLISE 2 — PROPORCIONALIDADE (Destaques × Ações)

       Com só Brasil e Colômbia na página, cada mercado já é
       um recorte único — não faz sentido comparar "% do total
       geral" entre países. O que importa é a proporção DENTRO
       do próprio mercado: quantas ações de marketing existem
       pra cada destaque editorial recebido.
    ====================================================== */

    getProportionalityStats(market) {

        const marketing = this.getMarketingRows().filter(r => this.marketMatches(r.country, market));

        const highlights = this.getHighlightsRows().filter(r => this.marketMatches(r.pais, market));

        const destaques = highlights.length;

        const acoes = marketing.length;

        const indice = destaques ? acoes / destaques : null;

        const stats = { market, destaques, acoes, indice };

        if (market === "Brasil") {

            stats.postsSociais = this.getSocialPosts().length;

        }

        return stats;

    },

    /* ======================================================
       ANÁLISE 3 — SHARE OF VOICE TOTAL POR GRAVADORA
    ====================================================== */

    getShareOfVoiceTable(market) {

        const marketing = this.getMarketingRows().filter(r => this.marketMatches(r.country, market));

        const highlights = this.getHighlightsRows().filter(r => this.marketMatches(r.pais, market));

        const dest = {};

        highlights.forEach(r => {

            const name = r.disquera || "Não informado";

            dest[name] = (dest[name] || 0) + 1;

        });

        if (market === "Brasil") {

            return this.buildBrasilSov(dest, marketing);

        }

        return this.buildColombiaSov(dest, marketing);

    },

    buildBrasilSov(dest, marketing) {

        const acao = {};

        marketing.forEach(r => {

            splitMultiValue(r.label).forEach(name => {
                acao[name] = (acao[name] || 0) + 1;
            });

        });

        const socialPosts = this.getSocialPosts();

        const postCount = {}, alcanceSum = {}, engSum = {}, collabCount = {};

        socialPosts.forEach(p => {

            splitMultiValue(p.gravadora).forEach(name => {

                postCount[name] = (postCount[name] || 0) + 1;

                alcanceSum[name] = (alcanceSum[name] || 0) + (p.alcance || 0);

                engSum[name] = (engSum[name] || 0) + (p.taxaEngajamento || 0);

                if (typeof SocialMetrics !== "undefined" && SocialMetrics.isCollabPost(p)) {
                    collabCount[name] = (collabCount[name] || 0) + 1;
                }

            });

        });

        const names = new Set([...Object.keys(dest), ...Object.keys(acao)]);

        let rows = [...names].map(nome => {

            const destaques = dest[nome] || 0;

            const acoes = acao[nome] || 0;

            const posts = postCount[nome] || 0;

            const alcanceMedio = posts ? alcanceSum[nome] / posts : 0;

            const pctCollab = posts ? ((collabCount[nome] || 0) / posts) * 100 : 0;

            const engajamentoMedio = posts ? engSum[nome] / posts : 0;

            const total = destaques + acoes;

            return { nome, destaques, acoes, alcanceMedio, pctCollab, engajamentoMedio, total };

        }).filter(r => r.total > 0);

        return this.finalizeSov(rows, "brasil");

    },

    buildColombiaSov(dest, marketing) {

        const counters = this.COLOMBIA_ACTION_TYPES.map(() => ({}));

        marketing.forEach(r => {

            const details = splitMultiValue(r.detail).map(d => this.normalizeText(d));

            this.COLOMBIA_ACTION_TYPES.forEach((type, i) => {

                if (details.includes(this.normalizeText(type))) {

                    splitMultiValue(r.label).forEach(name => {
                        counters[i][name] = (counters[i][name] || 0) + 1;
                    });

                }

            });

        });

        const names = new Set([
            ...Object.keys(dest),
            ...counters.flatMap(c => Object.keys(c))
        ]);

        let rows = [...names].map(nome => {

            const destaques = dest[nome] || 0;

            const acoesPorTipo = counters.map(c => c[nome] || 0);

            const totalAcoes = acoesPorTipo.reduce((s, v) => s + v, 0);

            const total = destaques + totalAcoes;

            return { nome, destaques, acoesPorTipo, totalAcoes, total };

        }).filter(r => r.total > 0);

        return this.finalizeSov(rows, "colombia");

    },

    finalizeSov(rows, columns) {

        // "Não se aplica" não é uma gravadora de verdade — não faz
        // sentido aparecer num ranking de share of voice.
        rows = rows.filter(r => this.normalizeText(r.nome) !== "nao se aplica");

        const grandTotal = rows.reduce((s, r) => s + r.total, 0);

        const effortKey = columns === "brasil" ? "acoes" : "totalAcoes";

        const esforcoOf = r => r[effortKey];

        const ratios = rows
            .filter(r => r.destaques > 0 && esforcoOf(r) > 0)
            .map(r => esforcoOf(r) / r.destaques);

        const medianRatio = this.median(ratios);

        rows.forEach(r => {

            r.share = grandTotal ? (r.total / grandTotal) * 100 : 0;

            r.statusComment = this.buildBalanceComment(r.destaques, esforcoOf(r), medianRatio);

        });

        this.classifyOpportunity(rows, effortKey);

        rows.sort((a, b) => b.oportunidadeScore - a.oportunidadeScore || b.total - a.total);

        return { rows, columns };

    }

};
