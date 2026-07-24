const SocialInsights = {

    filters: {},

    insights: [],

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

    generate(filters = null) {

        if (filters) {

            this.setFilters(filters);

        }

        this.insights = [];

        this.generateKPIs();

        this.generateRankings();

        this.generateMonthly();

        this.sort();

return this;

    },

    getAll() {

        return this.insights;

    },

    getByType(type) {

        return this.insights.filter(

            insight => insight.type === type

        );

    },

    add({

    type,

    category = "general",

    level = "info",

    priority = 0,

    icon = "",

    title = "",

    message = "",

    metric = "",

    value = null,

    variation = null,

    data = null

}) {

    this.insights.push({

        id: crypto.randomUUID(),

        type,

        category,

        level,

        priority,

        icon,

        title,

        message,

        metric,

        value,

        variation,

        data

    });

},

    getTop(limit = 5) {

    return [...this.insights]

        .sort((a, b) => b.priority - a.priority)

        .slice(0, limit);

},

getWarnings() {

    return this.insights.filter(

        insight =>

            insight.level === "warning" ||

            insight.level === "danger"

    );

},

getByCategory(category) {

    return this.insights.filter(

        insight =>

            insight.category === category

    );

},

generateKPIs() {

    const kpis = SocialMetrics.getKPIs();

    //-------------------------------------------------
    // Volume de publicações
    //-------------------------------------------------

    this.add(

        "kpi",

        "Publicações",

        `Foram publicados ${kpis.posts} posts no período analisado.`,

        "info",

        {

            posts: kpis.posts

        }

    );

    //-------------------------------------------------
    // Alcance
    //-------------------------------------------------

    this.add(

        "kpi",

        "Alcance Total",

        `As publicações alcançaram ${this.formatNumber(kpis.alcance)} contas.`,

        "success",

        {

            alcance: kpis.alcance

        }

    );

    //-------------------------------------------------
    // Visualizações
    //-------------------------------------------------

    this.add(

        "kpi",

        "Visualizações",

        `Foram registradas ${this.formatNumber(kpis.visualizacoes)} visualizações.`,

        "info",

        {

            visualizacoes: kpis.visualizacoes

        }

    );

    //-------------------------------------------------
    // Interações
    //-------------------------------------------------

    this.add(

        "kpi",

        "Interações",

        `O conteúdo gerou ${this.formatNumber(kpis.interacoes)} interações.`,

        "success",

        {

            interacoes: kpis.interacoes

        }

    );

    //-------------------------------------------------
    // Engajamento
    //-------------------------------------------------

    let level = "warning";

    if (kpis.taxaEngajamento >= 5) {

        level = "success";

    }

    else if (kpis.taxaEngajamento >= 3) {

        level = "info";

    }

    this.add(

        "kpi",

        "Taxa de Engajamento",

        `A taxa média de engajamento foi de ${this.formatPercent(kpis.taxaEngajamento)}.`,

        level,

        {

            taxaEngajamento: kpis.taxaEngajamento

        }

    );

    //-------------------------------------------------
    // Seguidores
    //-------------------------------------------------

    if (kpis.seguidores > 0) {

        this.add(

            "kpi",

            "Novos Seguidores",

            `As publicações geraram ${this.formatNumber(kpis.seguidores)} novos seguidores.`,

            "success",

            {

                seguidores: kpis.seguidores

            }

        );

    }

},

generateRankings() {

    const kpis = SocialMetrics.getKPIs();

    //-------------------------------------------------
    // Maior alcance
    //-------------------------------------------------

    const maiorAlcance = SocialMetrics.getBest("alcance");

    if (maiorAlcance) {

        const participacao = kpis.alcance
            ? (maiorAlcance.alcance / kpis.alcance) * 100
            : 0;

        this.add(

            "ranking",

            "Maior Alcance",

            `"${maiorAlcance.resumo}" alcançou ${this.formatNumber(maiorAlcance.alcance)} contas (${this.formatPercent(participacao)} do alcance do período).`,

            "success",

            maiorAlcance

        );

    }

    //-------------------------------------------------
    // Melhor engajamento
    //-------------------------------------------------

    const melhorEngajamento = SocialMetrics.getBest("taxaEngajamento");

    if (melhorEngajamento) {

        const fator = kpis.taxaEngajamento
            ? melhorEngajamento.taxaEngajamento / kpis.taxaEngajamento
            : 0;

        this.add(

            "ranking",

            "Maior Taxa de Engajamento",

            `"${melhorEngajamento.resumo}" registrou ${this.formatPercent(melhorEngajamento.taxaEngajamento)}, equivalente a ${fator.toFixed(1)}x a média do período.`,

            "success",

            melhorEngajamento

        );

    }

    //-------------------------------------------------
    // Mais visualizações
    //-------------------------------------------------

    const maisViews = SocialMetrics.getBest("visualizacoes");

    if (maisViews) {

        this.add(

            "ranking",

            "Maior Número de Visualizações",

            `"${maisViews.resumo}" obteve ${this.formatNumber(maisViews.visualizacoes)} visualizações.`,

            "info",

            maisViews

        );

    }

    //-------------------------------------------------
    // Mais compartilhamentos
    //-------------------------------------------------

    const maisCompartilhado = SocialMetrics.getBest("compartilhamentos");

    if (maisCompartilhado) {

        this.add(

            "ranking",

            "Post Mais Compartilhado",

            `"${maisCompartilhado.resumo}" foi compartilhado ${this.formatNumber(maisCompartilhado.compartilhamentos)} vezes.`,

            "info",

            maisCompartilhado

        );

    }

    //-------------------------------------------------
    // Mais salvamentos
    //-------------------------------------------------

    const maisSalvo = SocialMetrics.getBest("salvamentos");

    if (maisSalvo) {

        this.add(

            "ranking",

            "Post Mais Salvo",

            `"${maisSalvo.resumo}" recebeu ${this.formatNumber(maisSalvo.salvamentos)} salvamentos.`,

            "info",

            maisSalvo

        );

    }

    //-------------------------------------------------
    // Top 5
    //-------------------------------------------------

    const top5 = SocialMetrics.getTopPosts("interacoes", 5);

    if (top5.length) {

        const totalTop = top5.reduce(

            (sum, post) => sum + post.interacoes,

            0

        );

        const percentual = kpis.interacoes
            ? (totalTop / kpis.interacoes) * 100
            : 0;

        this.add(

            "ranking",

            "Concentração das Interações",

            `Os 5 posts com maior desempenho responderam por ${this.formatPercent(percentual)} de todas as interações do período.`,

            "info",

            {

                posts: top5,

                percentual

            }

        );

    }

},

generateMonthly() {

    const months = SocialMetrics.getMonthlyMetrics();

    const validMonths = months.filter(month => month.posts > 0);

    if (validMonths.length < 2) {

        return;

    }

    //-------------------------------------------------
    // Melhor mês em alcance
    //-------------------------------------------------

    const melhorAlcance = [...validMonths].sort(

        (a, b) => b.alcance - a.alcance

    )[0];

    this.add(

        "monthly",

        "Melhor mês em alcance",

        `${melhorAlcance.nome} apresentou o maior alcance do período, com ${this.formatNumber(melhorAlcance.alcance)} contas alcançadas.`,

        "success",

        melhorAlcance

    );

    //-------------------------------------------------
    // Melhor mês em engajamento
    //-------------------------------------------------

    const melhorEngajamento = [...validMonths].sort(

        (a, b) => b.taxaEngajamento - a.taxaEngajamento

    )[0];

    this.add(

        "monthly",

        "Maior taxa de engajamento",

        `${melhorEngajamento.nome} registrou uma taxa de engajamento de ${this.formatPercent(melhorEngajamento.taxaEngajamento)}.`,

        "success",

        melhorEngajamento

    );

    //-------------------------------------------------
    // Crescimento entre os dois últimos meses
    //-------------------------------------------------

    const atual = validMonths[validMonths.length - 1];

    const anterior = validMonths[validMonths.length - 2];

    const variacaoAlcance = SocialMetrics.variation(

        atual.alcance,

        anterior.alcance

    );

    if (variacaoAlcance !== null) {

        const direcao = variacaoAlcance >= 0 ? "▲" : "▼";

        const level = variacaoAlcance >= 0

            ? "success"

            : "warning";

        this.add(

            "trend",

            "Variação de alcance",

            `${direcao} O alcance variou ${this.formatPercent(Math.abs(variacaoAlcance))} em relação ao mês anterior.`,

            level,

            {

                atual,

                anterior,

                variacao: variacaoAlcance

            }

        );

    }

    //-------------------------------------------------
    // Crescimento de interações
    //-------------------------------------------------

    const variacaoInteracoes = SocialMetrics.variation(

        atual.interacoes,

        anterior.interacoes

    );

    if (variacaoInteracoes !== null) {

        const direcao = variacaoInteracoes >= 0 ? "▲" : "▼";

        const level = variacaoInteracoes >= 0

            ? "success"

            : "warning";

        this.add(

            "trend",

            "Variação de interações",

            `${direcao} As interações variaram ${this.formatPercent(Math.abs(variacaoInteracoes))} em relação ao mês anterior.`,

            level,

            {

                atual,

                anterior,

                variacao: variacaoInteracoes

            }

        );

    }

    //-------------------------------------------------
    // Tendência de publicações
    //-------------------------------------------------

    const variacaoPosts = SocialMetrics.variation(

        atual.posts,

        anterior.posts

    );

    if (variacaoPosts !== null) {

        const direcao = variacaoPosts >= 0 ? "▲" : "▼";

        const level = variacaoPosts >= 0

            ? "info"

            : "warning";

        this.add(

            "trend",

            "Volume de publicações",

            `${direcao} Foram publicados ${atual.posts} posts em ${atual.nome}, contra ${anterior.posts} em ${anterior.nome}.`,

            level,

            {

                atual,

                anterior,

                variacao: variacaoPosts

            }

        );

    }

    //-------------------------------------------------
    // Melhor média de alcance
    //-------------------------------------------------

    const melhorMedia = [...validMonths].sort(

        (a, b) => b.mediaAlcance - a.mediaAlcance

    )[0];

    this.add(

        "monthly",

        "Maior alcance médio por publicação",

        `${melhorMedia.nome} apresentou média de ${this.formatNumber(melhorMedia.mediaAlcance)} contas alcançadas por publicação.`,

        "info",

        melhorMedia

    );

},

    formatNumber(value) {

    return Number(value || 0).toLocaleString(

        "pt-BR",

        {

            maximumFractionDigits: 0

        }

    );

},

formatPercent(value) {

    return Number(value || 0).toLocaleString(

        "pt-BR",

        {

            minimumFractionDigits: 2,

            maximumFractionDigits: 2

        }

    ) + "%";

},

calculatePriority(metric, variation = null, value = null) {

    let priority = 50;

    switch (metric) {

        case "alcance":
        case "interacoes":
        case "visualizacoes":
            priority = 70;
            break;

        case "taxaEngajamento":
            priority = 80;
            break;

        case "seguidores":
            priority = 60;
            break;

        default:
            priority = 50;

    }

    if (variation !== null) {

        const absVariation = Math.abs(variation);

        if (absVariation >= 30) {

            priority += 30;

        } else if (absVariation >= 20) {

            priority += 20;

        } else if (absVariation >= 10) {

            priority += 10;

        }

    }

    if (value !== null) {

        if (metric === "taxaEngajamento") {

            if (value >= 10) {

                priority += 10;

            }

        }

    }

    return Math.min(priority, 100);

},

sort() {

    this.insights.sort((a, b) => {

        if (b.priority !== a.priority) {

            return b.priority - a.priority;

        }

        return a.title.localeCompare(b.title);

    });

    return this;

},

getTop(limit = 5) {

    return [...this.insights]

        .sort((a, b) => b.priority - a.priority)

        .slice(0, limit);

},

getWarnings() {

    return this.insights.filter(

        insight =>

            insight.level === "warning" ||

            insight.level === "danger"

    );

},

getByCategory(category) {

    return this.insights.filter(

        insight =>

            insight.category === category

    );

},

    
};