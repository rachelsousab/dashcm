/* ==========================================================
   CLARO MÚSICA DASHBOARD
   DATA MODULE
   Part 1 / 3
========================================================== */

/* ==========================================================
   SPLIT DE CAMPOS COM MÚLTIPLOS VALORES

   Algumas colunas do Sheets (Detalhe, Responsável) são campos
   de múltipla seleção. Em CSV, os valores escolhidos vêm
   concatenados numa única string separada por vírgula
   (ex.: "Fulano, Beltrano"). Esta função quebra isso em
   valores individuais e limpos.
========================================================== */

function splitMultiValue(value) {

    if (!value) {

        return [];

    }

    return String(value)
        .split(",")
        .map(item => item.trim())
        .filter(item => item !== "");

}

class DataLoader {

    constructor() {

        this.rows = [];

        this.loaded = false;

    }

    /* ======================================================
       PUBLIC
    ====================================================== */

    async load() {

        try {

            const data = await this.loadGoogleSheet();

            this.rows = this.normalize(data);

            APP.rawData = this.rows;

            APP.filteredData = [...this.rows];

            this.loaded = true;

            console.log(
                "✔",
                this.rows.length,
                "ações carregadas."
            );

            return this.rows;

        }

        catch (error) {

            console.error(error);

            alert(
                "Não foi possível carregar o Google Sheets."
            );

            return [];

        }

    }

    /* ======================================================
       GOOGLE SHEETS
    ====================================================== */

    async loadGoogleSheet() {

        return new Promise((resolve, reject) => {

            Papa.parse(

                CONFIG.DATA.csvUrl,

                {

                    download: true,

                    header: true,

                    skipEmptyLines: true,

                    complete: (result) => {

                        resolve(result.data);

                    },

                    error: reject

                }

            );

        });

    }

    /* ======================================================
       CSV LOCAL
    ====================================================== */

    async loadLocalFile(file) {

        return new Promise((resolve, reject) => {

            Papa.parse(

                file,

                {

                    header: true,

                    skipEmptyLines: true,

                    complete: (result) => {

                        resolve(

                            this.normalize(result.data)

                        );

                    },

                    error: reject

                }

            );

        });

    }


    /* ======================================================
       NORMALIZATION
    ====================================================== */

    normalize(rows) {

        return rows.map(row => {

            const proposalDate = this.parseDate(

                row[CONFIG.COLUMNS.proposalDate]

            );

            const publishDate = this.parseDate(

                row[CONFIG.COLUMNS.publishDate]

            );

            const status = this.clean(
                row[CONFIG.COLUMNS.status]
            );

            const executionDays = this.calculateExecutionDays(

                proposalDate,

                publishDate,

                status

            );

            const effectiveDate = this.computeEffectiveDate(

                status,

                proposalDate,

                publishDate

            );

            return {

country: this.normalizeCountry(

    this.clean(

        row[CONFIG.COLUMNS.country]

    )

),

                area:

                    this.clean(

                        row[CONFIG.COLUMNS.area]

                    ),

                detail:

                    this.clean(

                        row[CONFIG.COLUMNS.detail]

                    ),

                summary:

                    this.clean(

                        row[CONFIG.COLUMNS.summary]

                    ),

                label:

                    this.clean(

                        row[CONFIG.COLUMNS.label]

                    ),

                regional:

                    this.clean(

                        row[CONFIG.COLUMNS.regional]

                    ),

                owner:

                    this.clean(

                        row[CONFIG.COLUMNS.owner]

                    ),

                status,

                initiative:

                    this.clean(

                        row[CONFIG.COLUMNS.initiative]

                    ),

                extra:

                    this.clean(

                        row[CONFIG.COLUMNS.extra]

                    ),

                proposalDate,

                publishDate,

                executionDays,

                year: effectiveDate ? effectiveDate.getFullYear() : null,

                month:

                    effectiveDate
                        ? effectiveDate.getMonth() + 1
                        : null,

                quarter:

                    effectiveDate
                        ? Math.floor(
                            effectiveDate.getMonth() / 3
                        ) + 1
                        : null

            };

        });

    }

    /* ======================================================
       HELPERS
    ====================================================== */

    clean(value) {

        if (!value) return "";

        return String(value).trim();

    }

    clean(value) {

    if (!value) return "";

    return String(value).trim();

}

/* ======================================================
   COUNTRY NORMALIZATION
====================================================== */

normalizeCountry(value) {

    if (!value) return "";

    const country = value
        .trim()
        .toLowerCase();

    if (
        country.includes("brasil") ||
        country === "br" ||
        country === "brazil"
    ) {
        return "Brasil";
    }

    if (
        country.includes("colômbia") ||
        country.includes("colombia") ||
        country === "co"
    ) {
        return "Colômbia";
    }

    return value.trim();

}

    /* ======================================================
       DATE PARSER
    ====================================================== */

    parseDate(value) {

        if (!value) return null;

        value = String(value).trim();

        if (value === "") return null;

        // yyyy-mm-dd

        if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {

            return new Date(value);

        }

        // dd/mm/yyyy

        if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {

            const parts = value.split("/");

            return new Date(

                Number(parts[2]),

                Number(parts[1]) - 1,

                Number(parts[0])

            );

        }

        // dd-mm-yyyy

        if (/^\d{2}-\d{2}-\d{4}$/.test(value)) {

            const parts = value.split("-");

            return new Date(

                Number(parts[2]),

                Number(parts[1]) - 1,

                Number(parts[0])

            );

        }

        // fallback

        const d = new Date(value);

        if (isNaN(d)) return null;

        return d;

    }
        /* ======================================================
       EXECUTION TIME
    ====================================================== */

    calculateExecutionDays(
        proposalDate,
        publishDate,
        status
    ) {

        if (!proposalDate) return null;

        if (!publishDate) return null;

if (
    String(status).trim().toLowerCase() !==
    CONFIG.STATUS.completed.toLowerCase()
) {
    return null;
}

        const diff =
            publishDate.getTime() -
            proposalDate.getTime();

        return Math.round(
            diff / 86400000
        );

    }

    /* ======================================================
       DATA EFETIVA DE UMA AÇÃO (ano, mês E trimestre)

       Não é sempre a data da proposta — senão uma ação
       proposta no Q4/2025 mas só concluída em 2026 ficaria
       marcada como "Q4" mesmo filtrando o ano/trimestre certo
       de 2026:
       - Concluída  -> data da CONCLUSÃO (Data final/publicação).
         Uma ação começada em 2025 mas concluída em 2026 conta
         como ação de 2026 (ano, mês e trimestre da conclusão).
       - Cancelada  -> data da conclusão, se tivermos essa data;
         senão a data de início (proposta).
       - Em andamento / Standby -> sempre HOJE, até a ação ser
         concluída ou cancelada — assim ela nunca "some" num
         ano/mês passado enquanto ainda está rolando.
    ====================================================== */

    computeEffectiveDate(status, proposalDate, publishDate) {

        const normalized = String(status || "").trim().toLowerCase();

        const isCompleted =
            normalized === CONFIG.STATUS.completed.toLowerCase();

        const isCancelled =
            normalized === CONFIG.STATUS.cancelled.toLowerCase();

        if (isCompleted || isCancelled) {

            return publishDate || proposalDate || null;

        }

        return new Date();

    }

    /* ======================================================
       AVAILABLE YEARS
    ====================================================== */

    getAvailableYears() {

        const years = new Set();

        this.rows.forEach(row => {

            if (row.year) {

                years.add(row.year);

            }

        });

        return [...years].sort();

    }

    /* ======================================================
       FILTER OPTIONS
    ====================================================== */

    getUniqueValues(field) {

        const isMultiValue =
            CONFIG.MULTI_VALUE_FIELDS &&
            CONFIG.MULTI_VALUE_FIELDS.includes(field);

        const values = new Set();

        this.rows.forEach(row => {

            if (!row[field] || row[field] === "") {

                return;

            }

            if (isMultiValue) {

                splitMultiValue(row[field]).forEach(item => {

                    values.add(item);

                });

            }
            else {

                values.add(row[field]);

            }

        });

        return [...values].sort();

    }

    /* ======================================================
       POPULATE SELECT
    ====================================================== */

    fillSelect(id, values) {

        const select =
            document.getElementById(id);

        if (!select) return;

        select.innerHTML = "";

        const first =
            document.createElement("option");

        first.value = "Todos";

        first.textContent = "Todos";

        select.appendChild(first);

        values.forEach(value => {

            const option =
                document.createElement("option");

            option.value = value;

            option.textContent = value;

            select.appendChild(option);

        });

    }

    /* ======================================================
       BUILD FILTERS
    ====================================================== */

    buildFilters() {

        this.fillSelect(

            "filterYear",

            this.getAvailableYears()

        );

        this.fillSelect(

            "filterCountry",

            this.getUniqueValues("country")

        );

        this.fillSelect(

            "filterArea",

            this.getUniqueValues("area")

        );

        this.fillSelect(

            "filterDetail",

            this.getUniqueValues("detail")

        );

        this.fillSelect(

            "filterLabel",

            this.getUniqueValues("label")

        );

        this.fillSelect(

            "filterRegional",

            this.getUniqueValues("regional")

        );

        this.fillSelect(

            "filterOwner",

            this.getUniqueValues("owner")

        );

        this.fillSelect(

            "filterStatus",

            this.getUniqueValues("status")

        );

    }

    /* ======================================================
       FILTER DATA
    ====================================================== */

    applyFilters() {

        APP.filteredData =
            APP.rawData.filter(row => {

                if (
                    APP.filters.year !== "Todos" &&
                    Number(APP.filters.year) !== row.year
                ) {
                    return false;
                }

                if (
                    APP.filters.country !== "Todos" &&
                    APP.filters.country !== row.country
                ) {
                    return false;
                }

                if (
                    APP.filters.area !== "Todos" &&
                    APP.filters.area !== row.area
                ) {
                    return false;
                }

                if (
                    APP.filters.detail !== "Todos" &&
                    !splitMultiValue(row.detail).includes(APP.filters.detail)
                ) {
                    return false;
                }

                if (
                    APP.filters.label !== "Todos" &&
                    !splitMultiValue(row.label).includes(APP.filters.label)
                ) {
                    return false;
                }

                if (
                    APP.filters.regional !== "Todos" &&
                    APP.filters.regional !== row.regional
                ) {
                    return false;
                }

                if (
                    APP.filters.owner !== "Todos" &&
                    !splitMultiValue(row.owner).includes(APP.filters.owner)
                ) {
                    return false;
                }

                if (
                    APP.filters.status !== "Todos" &&
                    APP.filters.status !== row.status
                ) {
                    return false;
                }

                return true;

            });

        return APP.filteredData;

    }
        /* ======================================================
       EVENTS
    ====================================================== */

    bindEvents() {

        const map = {

            filterYear: "year",

            filterCountry: "country",

            filterArea: "area",

            filterDetail: "detail",

            filterLabel: "label",

            filterRegional: "regional",

            filterOwner: "owner",

            filterStatus: "status"

        };

        Object.entries(map).forEach(([elementId, filterKey]) => {

            const element = document.getElementById(elementId);

            if (!element) return;

            element.addEventListener("change", (event) => {

                APP.filters[filterKey] = event.target.value;

                this.applyFilters();

                // Atualiza dashboard
                if (typeof Dashboard !== "undefined") {
                    Dashboard.refresh();
                }

            });

        });

    }

    /* ======================================================
       INITIALIZATION
    ====================================================== */

    async init() {

        await this.load();

        this.buildFilters();

        this.bindEvents();

        return this.rows;

    }

}

/* ==========================================================
   GLOBAL INSTANCE
========================================================== */

const dataLoader = new DataLoader();

/* ==========================================================
   HELPERS
========================================================== */

function getData() {

    return APP.filteredData;

}

function getRawData() {

    return APP.rawData;

}

function reloadData() {

    return dataLoader.init();

}
