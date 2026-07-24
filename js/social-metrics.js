/**
 * ==========================================================
 * SOCIAL METRICS
 * ----------------------------------------------------------
 * Responsável por:
 * - Aplicar filtros
 * - Calcular indicadores
 * - Gerar estatísticas
 * - Agrupar informações
 *
 * Este módulo NÃO desenha gráficos.
 * Este módulo NÃO monta tabelas.
 * ==========================================================
 */

const SocialMetrics = {

    /**
     * -----------------------------------------
     * Filtros ativos
     * -----------------------------------------
     */
    filters: {

        ano: "",

        mes: "",

        formato: "",

        tipo: "",

        gravadora: "",

        genero: "",

        responsavel: "",

        collab: ""

    },

    /**
     * -----------------------------------------
     * Atualiza filtros
     * -----------------------------------------
     */
    setFilters(filters = {}) {

        this.filters = {

            ...this.filters,

            ...filters

        };

    },

    /**
     * -----------------------------------------
     * Remove todos os filtros
     * -----------------------------------------
     */
    clearFilters() {

        this.filters = {

            ano: "",

            mes: "",

            formato: "",

            tipo: "",

            gravadora: "",

            genero: "",

            responsavel: "",

            collab: ""

        };

    },

    /**
     * -----------------------------------------
     * Retorna os filtros atuais
     * -----------------------------------------
     */
    getFilters() {

        return {

            ...this.filters

        };

    },

    /**
     * -----------------------------------------
     * Retorna os posts considerando os filtros
     * -----------------------------------------
     */
    getPosts() {

        return SocialData.getFilteredPosts(

            this.filters

        );

    },

    /**
     * -----------------------------------------
     * Posts considerando um conjunto de filtros
     * arbitrário, sem tocar no estado global de
     * filtros (usado pela tabela Evolução Mensal,
     * que ignora o filtro de Mês).
     * -----------------------------------------
     */
    getPostsWithFilters(filters) {

        return SocialData.getFilteredPosts(filters);

    },

    /**
     * -----------------------------------------
     * Quantidade de posts
     * -----------------------------------------
     */
    getPostCount() {

        return this.getPosts().length;

    },

    /**
     * -----------------------------------------
     * Soma uma propriedade
     * -----------------------------------------
     */
    sum(field) {

        return this.getPosts()

            .reduce((total, post) => {

                return total + (post[field] || 0);

            }, 0);

    },

    /**
     * -----------------------------------------
     * Média de uma propriedade
     * -----------------------------------------
     */
    average(field) {

        const posts = this.getPosts();

        if (!posts.length) {

            return 0;

        }

        return this.sum(field) / posts.length;

    },

    /**
     * -----------------------------------------
     * Maior valor
     * -----------------------------------------
     */
    max(field) {

        const posts = this.getPosts();

        if (!posts.length) {

            return 0;

        }

        return Math.max(

            ...posts.map(post => post[field] || 0)

        );

    },

    /**
     * -----------------------------------------
     * Menor valor
     * -----------------------------------------
     */
    min(field) {

        const posts = this.getPosts();

        if (!posts.length) {

            return 0;

        }

        return Math.min(

            ...posts.map(post => post[field] || 0)

        );

    },

    /**
     * -----------------------------------------
     * Retorna um post pelo maior valor
     * -----------------------------------------
     */
    getTopPost(field) {

        const posts = this.getPosts();

        if (!posts.length) {

            return null;

        }

        return posts.reduce((best, current) =>

            current[field] > best[field]

                ? current

                : best

        );

    },

    /**
     * -----------------------------------------
     * Retorna um post pelo menor valor
     * -----------------------------------------
     */
    getBottomPost(field) {

        const posts = this.getPosts();

        if (!posts.length) {

            return null;

        }

        return posts.reduce((worst, current) =>

            current[field] < worst[field]

                ? current

                : worst

        );

    },

    /**
 * -----------------------------------------
 * Retorna todos os KPIs do dashboard.
 * -----------------------------------------
 */
getKPIs(posts = this.getPosts()) {


    const totalPosts = posts.length;

    const totalAlcance = this.sum("alcance");

    const totalVisualizacoes = this.sum("visualizacoes");

    const totalInteracoes = this.sum("interacoes");

    const totalCurtidas = this.sum("curtidas");

    const totalComentarios = this.sum("comentarios");

    const totalReposts = this.sum("reposts");

    const totalCompartilhamentos = this.sum("compartilhamentos");

    const totalSalvamentos = this.sum("salvamentos");

    const totalSeguidores = this.sum("seguidores");

    return {

        //----------------------------------
        // Totais
        //----------------------------------

        posts: totalPosts,

        alcance: totalAlcance,

        visualizacoes: totalVisualizacoes,

        interacoes: totalInteracoes,

        curtidas: totalCurtidas,

        comentarios: totalComentarios,

        reposts: totalReposts,

        compartilhamentos: totalCompartilhamentos,

        salvamentos: totalSalvamentos,

        seguidores: totalSeguidores,

        //----------------------------------
        // Médias
        //----------------------------------

        mediaAlcance:

            totalPosts

                ? totalAlcance / totalPosts

                : 0,

        mediaVisualizacoes:

            totalPosts

                ? totalVisualizacoes / totalPosts

                : 0,

        mediaInteracoes:

            totalPosts

                ? totalInteracoes / totalPosts

                : 0,

        mediaCurtidas:

            totalPosts

                ? totalCurtidas / totalPosts

                : 0,

        mediaComentarios:

            totalPosts

                ? totalComentarios / totalPosts

                : 0,

        mediaReposts:

            totalPosts

                ? totalReposts / totalPosts

             : 0,

        mediaCompartilhamentos:

            totalPosts

                ? totalCompartilhamentos / totalPosts

                : 0,

        mediaSalvamentos:

            totalPosts

                ? totalSalvamentos / totalPosts

                : 0,

        mediaSeguidores:

            totalPosts

                ? totalSeguidores / totalPosts

                : 0,

        //----------------------------------
        // Taxa de engajamento
        //----------------------------------

        taxaEngajamento:

            totalAlcance

                ? (totalInteracoes / totalAlcance) * 100

                : 0

    };

},

/**
 * ----------------------------------------------------------
 * Retorna as métricas agrupadas por mês.
 * Utilizado pela tabela de Evolução Mensal.
 * ----------------------------------------------------------
 */
getMonthlyMetrics(posts = this.getPosts()) {

    const months = {};

    // Inicializa os 12 meses
    for (let month = 1; month <= 12; month++) {

        months[month] = {

            mes: month,

            nome: SocialData.getMonthName(month),

            posts: 0,

            alcance: 0,

            visualizacoes: 0,

            interacoes: 0,

            curtidas: 0,

            comentarios: 0,

            reposts: 0,

            compartilhamentos: 0,

            salvamentos: 0,

            seguidores: 0

        };

    }

    // Soma os valores de cada mês
    posts.forEach(post => {

        if (!post.mes) {
            return;
        }

        const month = months[post.mes];

        month.posts++;

        month.alcance += post.alcance;

        month.visualizacoes += post.visualizacoes;

        month.interacoes += post.interacoes;

        month.curtidas += post.curtidas;

        month.comentarios += post.comentarios;

        month.reposts += post.reposts;

        month.compartilhamentos += post.compartilhamentos;

        month.salvamentos += post.salvamentos;

        month.seguidores += post.seguidores;

    });

    // Calcula médias e taxa de engajamento
    Object.values(months).forEach(month => {

        const posts = month.posts;

        month.mediaAlcance =
            posts ? month.alcance / posts : 0;

        month.mediaVisualizacoes =
            posts ? month.visualizacoes / posts : 0;

        month.mediaInteracoes =
            posts ? month.interacoes / posts : 0;

        month.mediaCurtidas =
            posts ? month.curtidas / posts : 0;

        month.mediaComentarios =
            posts ? month.comentarios / posts : 0;

        month.mediaReposts =
            posts ? month.reposts / posts : 0;

        month.mediaCompartilhamentos =
            posts ? month.compartilhamentos / posts : 0;

        month.mediaSalvamentos =
            posts ? month.salvamentos / posts : 0;

        month.mediaSeguidores =
            posts ? month.seguidores / posts : 0;

        month.taxaEngajamento =
            month.alcance
                ? (month.interacoes / month.alcance) * 100
                : 0;

    });

    return Object.values(months);

},

/**
 * ----------------------------------------------------------
 * Retorna os posts ordenados por um campo.
 * ----------------------------------------------------------
 */
sortBy(field, order = "desc") {

    const posts = [...this.getPosts()];

    posts.sort((a, b) => {

        const valueA = a[field] || 0;
        const valueB = b[field] || 0;

        if (order === "asc") {
            return valueA - valueB;
        }

        return valueB - valueA;

    });

    return posts;

},

/**
 * ----------------------------------------------------------
 * Retorna os melhores posts.
 * ----------------------------------------------------------
 */
getTopPosts(field, limit = 5) {

    return this
        .sortBy(field, "desc")
        .slice(0, limit);

},

/**
 * ----------------------------------------------------------
 * Retorna os piores posts.
 * ----------------------------------------------------------
 */
getBottomPosts(field, limit = 5) {

    return this
        .sortBy(field, "asc")
        .slice(0, limit);

},

/**
 * ----------------------------------------------------------
 * Melhor post para uma métrica.
 * ----------------------------------------------------------
 */
getBest(field) {

    const posts = this.getTopPosts(field, 1);

    return posts.length
        ? posts[0]
        : null;

},

/**
 * ----------------------------------------------------------
 * Pior post para uma métrica.
 * ----------------------------------------------------------
 */
getWorst(field) {

    const posts = this.getBottomPosts(field, 1);

    return posts.length
        ? posts[0]
        : null;

},

/**
 * ----------------------------------------------------------
 * Agrupa os posts por um campo.
 * Exemplo:
 * gravadora
 * genero
 * responsavel
 * collab
 * tipo
 * formato
 * ----------------------------------------------------------
 */
groupBy(field) {

    const METRIC_FIELDS = [
  "alcance",
  "visualizacoes",
  "interacoes",
  "curtidas",
  "comentarios",
  "reposts",
  "compartilhamentos",
  "salvamentos",
  "seguidores"
];

    const groups = {};

    this.getPosts().forEach(post => {

        const key = post[field] || "Não informado";

        if (!groups[key]) {

            groups[key] = {

                nome: key,

                posts: 0,

                alcance: 0,

                visualizacoes: 0,

                interacoes: 0,

                curtidas: 0,

                comentarios: 0,

                reposts: 0,

                compartilhamentos: 0,

                salvamentos: 0,

                seguidores: 0

            };

        }

        const group = groups[key];

        group.posts++;

        group.alcance += post.alcance;

        group.visualizacoes += post.visualizacoes;

        group.interacoes += post.interacoes;

        group.curtidas += post.curtidas;

        group.comentarios += post.comentarios;

        group.reposts += post.reposts;

        group.compartilhamentos += post.compartilhamentos;

        group.salvamentos += post.salvamentos;

        group.seguidores += post.seguidores;

    });

    Object.values(groups).forEach(group => {

        group.mediaAlcance =
            group.posts ? group.alcance / group.posts : 0;

        group.mediaVisualizacoes =
            group.posts ? group.visualizacoes / group.posts : 0;

        group.mediaInteracoes =
            group.posts ? group.interacoes / group.posts : 0;

        group.mediaCurtidas =
            group.posts ? group.curtidas / group.posts : 0;

        group.mediaComentarios =
            group.posts ? group.comentarios / group.posts : 0;

        group.mediaReposts =
            group.posts ? group.reposts / group.posts : 0;

        group.mediaCompartilhamentos =
            group.posts ? group.compartilhamentos / group.posts : 0;

        group.mediaSalvamentos =
            group.posts ? group.salvamentos / group.posts : 0;

        group.mediaSeguidores =
            group.posts ? group.seguidores / group.posts : 0;

        group.taxaEngajamento =
            group.alcance
                ? (group.interacoes / group.alcance) * 100
                : 0;

    });

    return Object.values(groups);

},

/**
 * ----------------------------------------------------------
 * Um post está "em collab" se o campo Collab tiver algum
 * valor além de vazio/"Sem collab" — não importa quantos
 * tipos de collab ele tenha, conta como 1 post.
 * ----------------------------------------------------------
 */
isCollabPost(post) {

    const value = (post.collab || "").trim().toLowerCase();

    return value !== "" && value !== "sem collab";

},

getCollabPosts() {

    return this.getPosts().filter(post => this.isCollabPost(post));

},

/**
 * ----------------------------------------------------------
 * Igual ao groupBy(), mas quebra campos de múltipla seleção
 * (genero, gravadora, collab, responsavel, tipo) em valores
 * únicos antes de agrupar — assim um post com "Collab fã
 * clube, Collab colaborador" soma nos dois grupos, e não vira
 * um grupo combinado à parte.
 * ----------------------------------------------------------
 */
groupBySplit(field) {

    const groups = {};

    this.getPosts().forEach(post => {

        const rawValue = post[field];

        const keys = splitMultiValue(rawValue);

        const list = keys.length ? keys : ["Não informado"];

        list.forEach(key => {

            if (!groups[key]) {

                groups[key] = {

                    nome: key,

                    posts: 0,

                    alcance: 0,

                    visualizacoes: 0,

                    interacoes: 0,

                    curtidas: 0,

                    comentarios: 0,

                    reposts: 0,

                    compartilhamentos: 0,

                    salvamentos: 0,

                    seguidores: 0

                };

            }

            const group = groups[key];

            group.posts++;

            group.alcance += post.alcance;

            group.visualizacoes += post.visualizacoes;

            group.interacoes += post.interacoes;

            group.curtidas += post.curtidas;

            group.comentarios += post.comentarios;

            group.reposts += post.reposts;

            group.compartilhamentos += post.compartilhamentos;

            group.salvamentos += post.salvamentos;

            group.seguidores += post.seguidores;

        });

    });

    Object.values(groups).forEach(group => {

        group.mediaAlcance = group.posts ? group.alcance / group.posts : 0;
        group.mediaVisualizacoes = group.posts ? group.visualizacoes / group.posts : 0;
        group.mediaInteracoes = group.posts ? group.interacoes / group.posts : 0;
        group.mediaCurtidas = group.posts ? group.curtidas / group.posts : 0;
        group.mediaComentarios = group.posts ? group.comentarios / group.posts : 0;
        group.mediaReposts = group.posts ? group.reposts / group.posts : 0;
        group.mediaCompartilhamentos = group.posts ? group.compartilhamentos / group.posts : 0;
        group.mediaSalvamentos = group.posts ? group.salvamentos / group.posts : 0;
        group.mediaSeguidores = group.posts ? group.seguidores / group.posts : 0;

        group.taxaEngajamento = group.alcance
            ? (group.interacoes / group.alcance) * 100
            : 0;

    });

    return Object.values(groups);

},

/**
 * ----------------------------------------------------------
 * Linhas (posts) de um grupo específico de um campo
 * multi-valorado — usado pro drill-down ao clicar num
 * gráfico agrupado por gênero/gravadora/collab/tipo.
 * ----------------------------------------------------------
 */
getRowsForSplitGroup(field, value) {

    return this.getPosts().filter(post =>
        splitMultiValue(post[field]).includes(value)
    );

},

/**
 * ----------------------------------------------------------
 * Calcula a variação percentual.
 * ----------------------------------------------------------
 */
variation(current, previous) {

    if (!previous) {

        return null;

    }

    return ((current - previous) / previous) * 100;

},

/**
 * ----------------------------------------------------------
 * Compara um mês com o anterior.
 * ----------------------------------------------------------
 */
compareMonths(currentMonth, previousMonth) {

    const comparison = {};

    const metrics = [

        "posts",

        "alcance",

        "visualizacoes",

        "interacoes",

        "curtidas",

        "comentarios",

        "reposts",

        "compartilhamentos",

        "salvamentos",

        "seguidores",

        "taxaEngajamento"

    ];

    metrics.forEach(metric => {

        comparison[metric] = this.variation(

            currentMonth[metric],

            previousMonth[metric]

        );

    });

    return comparison;

},

/**
 * ----------------------------------------------------------
 * Compara dois períodos.
 * ----------------------------------------------------------
 */
comparePeriods(current, previous) {

    const comparison = {};

    Object.keys(current).forEach(key => {

        if (typeof current[key] !== "number") {

            return;

        }

        comparison[key] = this.variation(

            current[key],

            previous[key]

        );

    });

    return comparison;

},

/**
 * ----------------------------------------------------------
 * Todos os agrupamentos utilizados pelo dashboard.
 * ----------------------------------------------------------
 */
getGroups() {

    return {

        gravadoras:

            this.groupBy("gravadora"),

        generos:

            this.groupBy("genero"),

        responsaveis:

            this.groupBy("responsavel"),

        collabs:

            this.groupBy("collab"),

        formatos:

            this.groupBy("formato"),

        tipos:

            this.groupBy("tipo")

    };

}

};