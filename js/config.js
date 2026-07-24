/* ==========================================================
   CLARO MÚSICA DASHBOARD
   Configuration File
   Version 1.0
========================================================== */

const CONFIG = {

    /* ==========================================
       DATA SOURCE
    ========================================== */

    DATA: {

        csvUrl:
            "https://docs.google.com/spreadsheets/d/e/2PACX-1vSKDQN4Tmp5zJyV3r69Sf2ck1JNpMtxvavsX8Iw1gZyZtQ6lKkHwfX_SSIZv0uctby2LGd_Cas0BDRi/pub?gid=1359106749&single=true&output=csv",

        autoRefresh: false,

        refreshIntervalMinutes: 10

    },

    SOCIAL_DATA: {

    csvUrl:
        "https://docs.google.com/spreadsheets/d/e/2PACX-1vSZgH0XiA52taz7aY8xqvz9s1YVuiiFgAKODPYq_jQfBODPv6SeYfOfrIZk2e77tSXBMsiHENUK5XJW/pub?gid=40752348&single=true&output=csv",

    autoRefresh: false,

    refreshIntervalMinutes: 10

},

    HIGHLIGHTS_DATA: {

    csvUrl:
        "https://docs.google.com/spreadsheets/d/e/2PACX-1vSGDwZ-s5BGVF5fxOECsPxVNMTcOYjH3LUBb2khyXbjoN-z8TqJOgt_Os75XwW5uTSqJv1ZIK-3wMhM/pub?gid=2044463510&single=true&output=csv",

    autoRefresh: false,

    refreshIntervalMinutes: 10

},

    /* ==========================================
       AUTENTICAÇÃO

       Trava simples de acesso, NÃO é autenticação
       real: a senha fica em texto puro no código-
       fonte, visível a quem inspecionar a página.
       Serve só para afastar acesso casual.
    ========================================== */

    AUTH: {

        password: "LabelRelations2026#@CM"

    },

    /* ==========================================
       COMPANY
    ========================================== */

    COMPANY: {

        name: "Claro música",

        dashboardName: "Label Relations Dashboard",

        version: "1.0.0"

    },

    /* ==========================================
       DATE SETTINGS
    ========================================== */

    DATE: {

        locale: "pt-BR",

        months: [

            "Janeiro",
            "Fevereiro",
            "Março",
            "Abril",
            "Maio",
            "Junho",
            "Julho",
            "Agosto",
            "Setembro",
            "Outubro",
            "Novembro",
            "Dezembro"

        ],

        shortMonths: [

            "Jan",
            "Fev",
            "Mar",
            "Abr",
            "Mai",
            "Jun",
            "Jul",
            "Ago",
            "Set",
            "Out",
            "Nov",
            "Dez"

        ]

    },

    /* ==========================================
       STATUS
    ========================================== */

    STATUS: {

        completed: "Concluída",

        inProgress: "Em andamento",

        cancelled: "Cancelada",

        standby: "Standby"

    },

    /* ==========================================
       COLORS
    ========================================== */

    COLORS: {

        primary: "#E30613",

        green: "#2EAD61",

        yellow: "#F5B301",

        red: "#E53935",

        blue: "#3A7AFE",

        gray: "#808080",

        background: "#F6F7FB"

    },

    /* ==========================================
       KPI COLORS
    ========================================== */

    KPI: {

        completed: "#2EAD61",

        inProgress: "#3A7AFE",

        standby: "#F5B301",

        cancelled: "#E53935",

        total: "#E30613"

    },

    /* ==========================================
       METAS
    ========================================== */

   /* "countries" define em quais países essa meta é FIXA na
      tabela (aparece sempre, mesmo com 0 ocorrências no ano).
      Hoje todas as metas por tipo de ação são do Brasil; a
      Colômbia usa apenas a meta-resumo em COUNTRY_SUMMARY_GOALS.
      Para uma meta valer para mais de um país, basta listar
      mais nomes aqui — nenhuma outra mudança de código é
      necessária. */

   GOALS: {

    "Parcerias com Rádios": {
        annual: 1,
        countries: ["Brasil"]
    },

    "Canal 500": {
        annual: 72,
        countries: ["Brasil"]
    },

    "Barker": {
        annual: 12,
        countries: ["Brasil"]
    },

    "Trilho": {
        annual: 12,
        countries: ["Brasil"]
    },

    "BG": {
        annual: 4,
        countries: ["Brasil"]
    },

    "Papo Claro música": {
        annual: 9,
        countries: ["Brasil"]
    },

    "Conteúdo para redes sociais": {
        annual: 72,
        countries: ["Brasil"]
    },

    "TV Corporativa": {
        annual: 4,
        countries: ["Brasil"]
    },

    "E-mail Marketing (Endomarketing)": {
        annual: 4,
        countries: ["Brasil"]
    },

    "Site Bora": {
        annual: 4,
        countries: ["Brasil"]
    },

    "LinkedIn (Claro)": {
        annual: 4,
        countries: ["Brasil"]
    },

    "Eventos institucionais/Patrocínio": {
        annual: 12,
        countries: ["Brasil"]
    },

    "Evento Prêmio Claro Música": {
        annual: 1,
        countries: ["Brasil"]
    },

    "Vídeo institucional": {
        annual: 4,
        countries: ["Brasil"]
    },

    "Ativação JB FM": {
        annual: 1,
        countries: ["Brasil"]
    },

    "Banner: Seção da Home": {
        annual: 48,
        countries: ["Brasil"]
    },

    "Banner: Seção de Música": {
        annual: 144,
        countries: ["Brasil"]
    },

    "Stream to Win": {
        annual: 2,
        countries: ["Colômbia"]
    },

    "Artista de la semana": {
        annual: 48,
        countries: ["Colômbia"]
    }

},

ACTION_AREAS: {

    "Canal 500": "Label Relations",
    "Papo Claro música": "Label Relations",
    "Conteúdo para redes sociais": "Label Relations",
    "Evento Prêmio Claro Música": "Label Relations",
    "Playlist personalizada": "Label Relations",
    "Vídeo Insertoras (TV Latam)": "Label Relations",
    "Audição": "Label Relations",
    "Café Claro": "Label Relations",
    "Íntimos Claro música": "Label Relations",
    "Micrófono": "Label Relations",
    "Te Lo Dice Cuervo": "Label Relations",
    "Stream to Win": "Label Relations",
    "Artista de la semana": "Label Relations",

    "E-mail Marketing (Endomarketing)": "Marketing",
    "Site Bora": "Marketing",
    "LinkedIn (Claro)": "Marketing",
    "Eventos institucionais/Patrocínio": "Marketing",
    "Push Notification": "Marketing",
    "Ad no APP": "Marketing",
    "Youtube Claro": "Marketing",
    "Youtube da Claro": "Marketing",
    "TV Corporativa": "Marketing",
    "Vídeo institucional": "Marketing",

    "Parcerias com Rádios": "Licenciamento",
    "Ativação JB FM": "Licenciamento",
    "Novo contrato (OTT)": "Licenciamento",

    "Barker": "TV",
    "Trilho": "TV",
    "BG": "TV",
    "Banner: Seção da Home": "TV",
    "Banner: Seção de Música": "TV"

},

AREA_ORDER: [

    "Label Relations",

    "Licenciamento",

    "Marketing",

    "TV"

],

/* GOAL_MAPPING: só precisa de entradas onde o valor bruto da
   coluna "Detalhe" (no Sheets) é DIFERENTE do nome da meta.
   Ex.: a planilha guarda "Barker: Seção de Música", mas a meta
   se chama apenas "Barker". Itens que já batem exatamente com
   o nome da meta (ex.: "Canal 500") não precisam de mapeamento. */

GOAL_MAPPING: {

    "Barker: Seção de Música": "Barker",

    "Trilho: Seção de Música": "Trilho",

    "BG: Seção de Música": "BG",

    "Negociação Rádios Zero Ratio": "Parcerias com Rádios"

},

/* METAS-RESUMO POR PAÍS
   Linha extra, fixa no topo da tabela do país, somando TODAS
   as ações concluídas no ano naquele país (independente do
   tipo). Hoje só a Colômbia tem essa meta consolidada; para
   adicionar outro país no futuro, basta incluir uma entrada
   aqui — nenhum código precisa mudar. */

COUNTRY_SUMMARY_GOALS: {

    "Colômbia": {

        label: "Ações Colômbia",

        annual: 96

    }

},

    /* ==========================================
       CHART SETTINGS
    ========================================== */

    CHARTS: {

        animation: true,

        responsive: true,

        maintainAspectRatio: false,

        borderWidth: 2,

        borderRadius: 8

    },

    /* ==========================================
       CSV COLUMN NAMES
       (centralizado para facilitar mudanças)
    ========================================== */

    COLUMNS: {

        country: "País",

        area: "Área",

        detail: "Detalhe",

        proposalDate: "Data da proposta",

        summary: "Resumo da ação",

        label: "Gravadora",

        regional: "Regional",

        status: "Status",

        owner: "Responsável",

        initiative: "Iniciativa",

        publishDate: "Data final / publicação",

        extra: "Informações extras"

    },

    /* ==========================================
       CAMPOS DE MÚLTIPLOS VALORES
       (colunas onde o Sheets guarda mais de um
       valor separado por vírgula numa única
       célula — usado pelos filtros e pelo Goals)
    ========================================== */

    MULTI_VALUE_FIELDS: [

        "detail",

        "owner",

        "label"

    ]

};


/* ==========================================================
   GLOBAL STATE
========================================================== */

const APP = {

    rawData: [],

    filteredData: [],

    charts: {},

    filters: {

        year: "Todos",

        month: "Todos",

        country: "Todos",

        area: "Todos",

        detail: "Todos",

        label: "Todos",

        regional: "Todos",

        owner: "Todos",

        status: "Todos"

    }

};
