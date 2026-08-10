/* ==========================================================
   GOALS.JS
   Dashboard Claro Música
   Gestão de Metas
========================================================== */

const Goals = {

    rawData: [],

    countries: [],

    actions: [],

    currentYear: null,

    currentMonth: null,

    currentQuarter: null,

    /* ==========================================================
       HOOK DE DRILL-DOWN

       app.js define esta função para abrir o modal com o
       detalhamento das ações. Se ninguém definir, o clique
       simplesmente não faz nada (evita erros).
    ========================================================== */

    onDrilldownRequest(rows, title) {

        console.warn(
            "Goals: onDrilldownRequest não foi configurado pelo app.js.",
            title,
            rows
        );

    },

    monthNames: [
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
    ],

    /* ==========================================================
       QUARTERS
    ========================================================== */

    quarters: [

        { label: "T1", months: [0, 1, 2] },

        { label: "T2", months: [3, 4, 5] },

        { label: "T3", months: [6, 7, 8] },

        { label: "T4", months: [9, 10, 11] }

    ],

    /* ==========================================================
       INIT
    ========================================================== */

    init(data) {

        this.rawData = Array.isArray(data)
            ? data
            : [];

        this.currentMonth =
            new Date().getMonth();

        this.currentQuarter =
            Math.floor(this.currentMonth / 3);

        this.currentYear =
            this.currentYear && this.getAvailableYears().includes(this.currentYear)
                ? this.currentYear
                : this.getDefaultYear();

        this.buildIndexes();

    },

    /* ==========================================================
       ANOS DISPONÍVEIS (aba "Metas do ano")

       Baseado na data de FINALIZAÇÃO das ações já concluídas,
       igual ao detectLatestYear() — só que retorna a lista
       inteira de anos com dado, não só o mais recente. O botão
       de cada ano só aparece se existir ação concluída naquele
       ano.
    ========================================================== */

    getAvailableYears() {

        return [...(CONFIG.GOALS_AVAILABLE_YEARS || [])].sort((a, b) => a - b);

    },

    /* Ano padrão ao abrir a aba: o ano-calendário REAL de hoje,
       se já tiver dado; senão, o ano mais recente disponível. */
    getDefaultYear() {

        const years = this.getAvailableYears();

        const nowYear = new Date().getFullYear();

        if (years.includes(nowYear)) {

            return nowYear;

        }

        return years.length ? Math.max(...years) : nowYear;

    },

    setYear(year) {

        this.currentYear = year;

        this.render();

    },

    /* ==========================================================
       STATUS "CONCLUÍDA"
    ========================================================== */

    isCompleted(row) {

        if (!row || !row.status) {

            return false;

        }

        return (
            String(row.status).trim().toLowerCase() ===
            String(CONFIG.STATUS.completed).trim().toLowerCase()
        );

    },

    /* ==========================================================
       QUEBRA O CAMPO "DETALHE" EM VALORES INDIVIDUAIS
       (o Detalhe é um menu de múltipla seleção do Sheets;
       em CSV vem tudo numa string separada por vírgula)
    ========================================================== */

    splitDetail(detail) {

        if (!detail) {

            return [];

        }

        return String(detail)
            .split(",")
            .map(item => item.trim())
            .filter(item => item !== "");

    },

    /* ==========================================================
       NORMALIZA UM VALOR INDIVIDUAL DE AÇÃO
    ========================================================== */

    normalizeAction(item) {

        if (!item) {

            return "";

        }

        const value = String(item).trim();

        if (
            CONFIG.GOAL_MAPPING &&
            CONFIG.GOAL_MAPPING[value]
        ) {

            return CONFIG.GOAL_MAPPING[value];

        }

        return value;

    },

    /* ==========================================================
       LISTA DE AÇÕES (NORMALIZADAS E ÚNICAS) DE UMA LINHA
    ========================================================== */

    getRowActions(row) {

        if (!row || !row.detail) {

            return [];

        }

        const items = this.splitDetail(row.detail)
            .map(item => this.normalizeAction(item));

        return [...new Set(items)]
            .filter(item => item !== "");

    },

    /* ==========================================================
       INDEXAÇÃO GERAL
       (países e ações únicas, considerando QUALQUER status —
       usados apenas para saber o que é relevante mostrar)
    ========================================================== */

    buildIndexes() {

        this.countries = [];

        this.actions = [];

        this.rawData.forEach(row => {

            if (
                row.country &&
                !this.countries.includes(row.country)
            ) {

                this.countries.push(row.country);

            }

            this.getRowActions(row).forEach(action => {

                if (!this.actions.includes(action)) {

                    this.actions.push(action);

                }

            });

        });

        this.countries.sort();

        this.actions.sort();

    },

    /* ==========================================================
       GETTERS BÁSICOS
    ========================================================== */

    getCountries() {

        return [...this.countries];

    },

    getActions() {

        return [...this.actions];

    },

    /* ==========================================================
       A AÇÃO JÁ FOI MENCIONADA NESSE PAÍS?
       (qualquer status — só para decidir relevância/exibição)
    ========================================================== */

    countryMentionsAction(country, action) {

        return this.rawData.some(row => {

            return (
                row.country === country &&
                this.getRowActions(row).includes(action)
            );

        });

    },

    /* ==========================================================
       AÇÃO BLOQUEADA PARA ESSE PAÍS?
       (CONFIG.ACTION_EXCLUDED_COUNTRIES — usado quando uma ação
       típica de um país acaba lançada por engano em outro)
    ========================================================== */

    isActionExcludedForCountry(action, country) {

        const excluded =
            CONFIG.ACTION_EXCLUDED_COUNTRIES &&
            CONFIG.ACTION_EXCLUDED_COUNTRIES[action];

        return Array.isArray(excluded) && excluded.includes(country);

    },

    /* ==========================================================
       LISTA DE AÇÕES DE UM PAÍS
       (metas primeiro — sempre fixas, mesmo com 0 no ano —
       seguidas das ações sem meta, mas só as que já tiveram ao
       menos UMA ocorrência concluída nesse país neste ano)
    ========================================================== */

    getCountryActions(country) {

        const goalNames = CONFIG.GOALS
            ? Object.keys(CONFIG.GOALS)
            : [];

        // Metas são fixas para o(s) país(es) configurado(s) em
        // CONFIG.GOALS[...].countries — independente de já terem
        // acontecido ou não no ano.
        const goalActions = goalNames.filter(name => {

            const goal = CONFIG.GOALS[name];

            const countries = (goal && goal.countries) || [];

            return (
                countries.includes(country) &&
                !this.isActionExcludedForCountry(name, country)
            );

        });

        // Ações sem meta só aparecem se já tiveram alguma ação
        // CONCLUÍDA de fato nesse país neste ano (não basta ter
        // sido apenas proposta/cancelada/em standby).
        const nonGoalActions = this.actions
            .filter(action => !this.hasGoalForCountry(action, country))
            .filter(action =>
                !(country === "Brasil" || this.isCountrySummaryGoal(country)) ||
                !this.isPhraseology({ detail: action })
            )
            .filter(action => !this.isActionExcludedForCountry(action, country))
            .filter(action => {

                const total = this.getSeriesTotal(
                    this.getMonthlySeries(country, action)
                );

                return total > 0;

            })
            .sort();

        return {

            goalActions,

            nonGoalActions

        };

    },

    /* ==========================================================
       LINHAS DE UM PAÍS QUE CONTÊM UMA AÇÃO
       (apenas CONCLUÍDAS, no ano corrente, pela data de
       finalização)
    ========================================================== */

    getActionRows(country, action) {

        return this.rawData.filter(row => {

            if (
                row.country !== country ||
                !this.isCompleted(row) ||
                !row.publishDate
            ) {

                return false;

            }

            if (row.publishDate.getFullYear() !== this.currentYear) {

                return false;

            }

            return this.getRowActions(row).includes(action);

        });

    },

    /* ==========================================================
       TODAS AS LINHAS CONCLUÍDAS DE UM PAÍS
       (independente do tipo de ação — usado na linha-resumo,
       ex.: "Ações Colômbia")
    ========================================================== */

    getCountryCompletedRows(country) {

        return this.rawData.filter(row => {

            const isEligibleForSummary =
                !this.isCountrySummaryGoal(country) ||
                (
                    !this.isPhraseology(row) &&
                    !this.getRowActions(row).some(action =>
                        this.hasGoalForCountry(action, country)
                    )
                );

            return (
                row.country === country &&
                this.isCompleted(row) &&
                row.publishDate &&
                row.publishDate.getFullYear() === this.currentYear &&
                isEligibleForSummary
            );

        });

    },

    /* ==========================================================
       CONTAGEM POR MÊS (de uma ação específica)
    ========================================================== */

    countMonth(country, action, month) {

        return this.getActionRows(country, action)
            .filter(row => row.publishDate.getMonth() === month)
            .length;

    },

    /* ==========================================================
       SÉRIE MENSAL DE UMA AÇÃO (12 posições)
    ========================================================== */

    getMonthlySeries(country, action) {

        const series = [];

        for (let month = 0; month < 12; month++) {

            series.push(
                this.countMonth(country, action, month)
            );

        }

        return series;

    },

    /* ==========================================================
       SÉRIE MENSAL "RESUMO" DE UM PAÍS
       (soma de TODAS as ações concluídas naquele país,
       contando cada linha uma única vez, sem multiplicar por
       tag)
    ========================================================== */

    getCountrySummarySeries(country) {

        const series = new Array(12).fill(0);

        this.getCountryCompletedRows(country).forEach(row => {

            series[row.publishDate.getMonth()]++;

        });

        return series;

    },

    /* ==========================================================
       TOTAL DE UM TRIMESTRE (a partir de uma série já pronta)
    ========================================================== */

    getQuarterTotal(series, quarterIndex) {

        const months = this.quarters[quarterIndex].months;

        return months.reduce(

            (sum, monthIndex) => sum + series[monthIndex],

            0

        );

    },

    /* ==========================================================
       TOTAL ANUAL (a partir de uma série já pronta)
    ========================================================== */

    getSeriesTotal(series) {

        return series.reduce((sum, value) => sum + value, 0);

    },

    /* ==========================================================
       TOTAL DE UMA AÇÃO SOMANDO TODOS OS PAÍSES
    ========================================================== */

    getTotalAllCountries(action) {

        return this.countries.reduce(

            (sum, country) =>
                sum + this.getSeriesTotal(
                    this.getMonthlySeries(country, action)
                ),

            0

        );

    },

    /* ==========================================================
       TOTAL DE UM TRIMESTRE SOMANDO TODOS OS PAÍSES
    ========================================================== */

    getQuarterTotalAllCountries(action, quarterIndex) {

        return this.countries.reduce(

            (sum, country) => {

                const series = this.getMonthlySeries(country, action);

                return sum + this.getQuarterTotal(series, quarterIndex);

            },

            0

        );

    },

    /* ==========================================================
       META
    ========================================================== */

    getGoal(action) {

        if (!CONFIG.GOALS) {

            return null;

        }

        return CONFIG.GOALS[action] || null;

    },

    hasGoal(action) {

        return this.getGoal(action) !== null;

    },

    hasGoalForCountry(action, country) {

        const goal = this.getGoal(action);

        return Boolean(
            goal &&
            Array.isArray(goal.countries) &&
            goal.countries.includes(country)
        );

    },

    isCountrySummaryGoal(country) {

        return Boolean(
            CONFIG.COUNTRY_SUMMARY_GOALS &&
            CONFIG.COUNTRY_SUMMARY_GOALS[country]
        );

    },

    /* ==========================================================
       STATUS DE UMA META (a partir do %)
    ========================================================== */

    getGoalStatus(pct) {

        if (pct >= 100) {

            return {
                className: "success",
                label: "Dentro da meta",
                icon: "🟢"
            };

        }

        if (pct >= 60) {

            return {
                className: "warning",
                label: "Atenção",
                icon: "🟡"
            };

        }

        return {
            className: "danger",
            label: "Abaixo da meta",
            icon: "🔴"
        };

    },

    /* ==========================================================
       FORMATAÇÃO NUMÉRICA (padrão pt-BR, ex.: 2,25)
    ========================================================== */

    formatNumber(value) {

        return Number(value).toLocaleString("pt-BR", {

            maximumFractionDigits: 2

        });

    },

    /* ==========================================================
       SETA DE TENDÊNCIA (mês atual vs. mês anterior)
    ========================================================== */

    getTrend(current, previous) {

        if (previous === undefined || previous === null) {

            return { symbol: "", className: "" };

        }

        if (current > previous) {

            return { symbol: "▲", className: "trend-up" };

        }

        if (current < previous) {

            return { symbol: "▼", className: "trend-down" };

        }

        return { symbol: "—", className: "trend-flat" };

    },

    /* ==========================================================
       RENDER
    ========================================================== */

    render() {

        this.renderByCountry();

        this.renderPhraseologies();

        this.renderByType();

        this.renderYearSwitch();

        this.renderGoalsCompletionIndicator();

        this.renderCriticalAreas();

    },

    /* ==========================================================
       RESUMO ANUAL DE METAS (aba "Metas do ano")

       Junta todas as ações COM meta definida, dos dois países,
       incluindo a meta-resumo do país (ex.: "Ações Colômbia").
       Retorna o % geral (atingido/meta, no MÁXIMO 100% por
       ação — uma ação muito acima da meta não "compensa" outra
       abaixo) e a lista ordenada da mais crítica (menor %) pra
       mais próxima da meta.
    ========================================================== */

    getAnnualGoalSummary() {

        const countriesToShow = ["Brasil", "Colômbia"];

        const items = [];

        countriesToShow.forEach(country => {

            const { goalActions } = this.getCountryActions(country);

            goalActions.forEach(action => {

                const goal = this.getGoal(action);

                if (!goal || !goal.annual) return;

                const total = this.getSeriesTotal(
                    this.getMonthlySeries(country, action)
                );

                const pct = Math.round((total / goal.annual) * 100);

                items.push({
                    country,
                    action,
                    area: this.getActionArea(action),
                    total,
                    goal: goal.annual,
                    pct
                });

            });

            const summaryConfig =
                CONFIG.COUNTRY_SUMMARY_GOALS &&
                CONFIG.COUNTRY_SUMMARY_GOALS[country];

            if (summaryConfig && summaryConfig.annual) {

                const total = this.getSeriesTotal(
                    this.getCountrySummarySeries(country)
                );

                const pct = Math.round((total / summaryConfig.annual) * 100);

                items.push({
                    country,
                    action: summaryConfig.label,
                    area: country,
                    total,
                    goal: summaryConfig.annual,
                    pct
                });

            }

        });

        const overallPct = items.length
            ? Math.round(
                items.reduce((sum, item) => sum + Math.min(item.pct, 100), 0) / items.length
              )
            : 0;

        const critical = [...items].sort((a, b) => a.pct - b.pct);

        return { overallPct, items, critical };

    },

    /* ==========================================================
       TROCA DE ANO (aba "Metas do ano")
    ========================================================== */

    renderYearSwitch() {

        const container = document.getElementById("goalsYearSwitch");

        if (!container) return;

        const years = this.getAvailableYears();

        if (!years.length) {

            container.innerHTML = "";
            return;

        }

        container.innerHTML = years.map(year => `
            <button type="button" class="summary-button ${year === this.currentYear ? "active" : ""}" data-year="${year}">
                ${year}
            </button>
        `).join("");

        Array.from(container.querySelectorAll("button")).forEach(btn => {

            btn.addEventListener("click", () => {

                this.setYear(Number(btn.dataset.year));

            });

        });

    },

    /* ==========================================================
       INDICADOR DE % DE METAS BATIDAS
    ========================================================== */

    renderGoalsCompletionIndicator() {

        const container = document.getElementById("goalsCompletionIndicator");

        if (!container) return;

        const { overallPct } = this.getAnnualGoalSummary();

        const status = this.getGoalStatus(overallPct);

        container.innerHTML = `
            <div class="goals-completion-card ${status.className}">
                <span class="goals-completion-label">% de metas batidas em ${this.currentYear}</span>
                <span class="goals-completion-value">${status.icon} ${overallPct}%</span>
            </div>
        `;

    },

    /* ==========================================================
       ÁREAS MAIS CRÍTICAS (mais longe da meta)
    ========================================================== */

    renderCriticalAreas() {

        const container = document.getElementById("criticalAreasContainer");

        if (!container) return;

        const { critical } = this.getAnnualGoalSummary();

        const worst = critical.filter(item => item.pct < 100).slice(0, 5);

        if (!worst.length) {

            container.innerHTML = "<p class='maf-empty'>Nenhuma meta pendente — tudo dentro do esperado neste ano.</p>";
            return;

        }

        container.innerHTML = `
            <ul class="critical-areas-list">
                ${worst.map(item => `
                    <li>
                        <span class="critical-areas-name">${item.action} <small>(${item.country})</small></span>
                        <span class="critical-areas-bar-wrap">
                            <span class="critical-areas-bar" style="width:${Math.min(item.pct, 100)}%"></span>
                        </span>
                        <span class="critical-areas-pct">${item.pct}%</span>
                    </li>
                `).join("")}
            </ul>
        `;

    },

    /* ==========================================================
       RENDER: EVOLUÇÃO MENSAL/TRIMESTRAL POR PAÍS
    ========================================================== */

    renderByCountry() {

        const container = document.getElementById("goalsContainer");

        if (!container) {

            console.warn("Goals.render(): #goalsContainer não encontrado.");

            return;

        }

        container.innerHTML = "";

        if (!this.countries.length) {

            container.innerHTML =
                "<p>Nenhum dado disponível para metas.</p>";

            return;

        }

        const countriesToShow = ["Brasil", "Colômbia"];

        countriesToShow.forEach(country => {

            container.appendChild(
                this.buildCountryBlock(country)
            );

        });

    },

    /* ==========================================================
       BLOCO DE UM PAÍS (título + tabela)
    ========================================================== */

    buildCountryBlock(country) {

        const wrapper = document.createElement("div");

        wrapper.className = "country-card";

        const title = document.createElement("h3");

        title.className = "country-title";

        title.textContent = `Gestão de Metas — ${country}`;

        wrapper.appendChild(title);

        wrapper.appendChild(
            this.buildCountryTable(country)
        );

        return wrapper;

    },

    /* ==========================================================
       TABELA DE UM PAÍS
    ========================================================== */

    buildCountryTable(country) {

        if (country === "Brasil") {

            return this.buildBrazilCountryTable(country);

        }

        const table = document.createElement("table");

        table.className = "goals-table";

        table.appendChild(
            this.buildCountryTableHead()
        );

        const tbody = document.createElement("tbody");

        const summaryConfig =
            CONFIG.COUNTRY_SUMMARY_GOALS &&
            CONFIG.COUNTRY_SUMMARY_GOALS[country];

        if (summaryConfig) {

            tbody.innerHTML +=
                this.buildCountrySummaryRow(country, summaryConfig);

        }

        const { goalActions, nonGoalActions } =
            this.getCountryActions(country);

        goalActions
            .sort((first, second) => first.localeCompare(second, "pt-BR"))
            .forEach(action => {

            tbody.innerHTML +=
                this.buildCountryActionRow(country, action);

            });

        if (goalActions.length && nonGoalActions.length) {

            tbody.innerHTML += this.buildSubgroupHeaderRow(
                "Sem meta definida"
            );

        }

        nonGoalActions.forEach(action => {

            tbody.innerHTML +=
                this.buildCountryActionRow(country, action);

        });

        if (
            !summaryConfig &&
            !goalActions.length &&
            !nonGoalActions.length
        ) {

            tbody.innerHTML =
                `<tr><td colspan="21">Nenhuma ação concluída registrada para ${country} em ${this.currentYear}.</td></tr>`;

        }

        table.appendChild(tbody);

        this.bindDrilldownEvents(tbody);

        return table;

    },

    /* ==========================================================
       LINHA SEPARADORA ENTRE GRUPOS
    ========================================================== */

    buildSubgroupHeaderRow(label) {

        return `<tr class="subgroup-row">` +
            `<td colspan="21">${label}</td>` +
            `</tr>`;

    },

    /* ==========================================================
       CABEÇALHO DA TABELA POR PAÍS
    ========================================================== */

    buildCountryTableHead() {

        const thead = document.createElement("thead");

        const row1 = document.createElement("tr");

        row1.innerHTML =
            `<th rowspan="2">Ação</th>` +
            this.quarters
                .map(q => `<th colspan="4" class="quarter-header">${q.label}</th>`)
                .join("") +
            `<th colspan="4" class="quarter-header annual-header">Resultado anual</th>`;

        const row2 = document.createElement("tr");

        row2.innerHTML =
            this.quarters
                .map(q => {

                    const monthHeaders = q.months
                        .map(m => `<th>${this.monthNames[m]}</th>`)
                        .join("");

                    return monthHeaders + `<th class="q-total-header">${q.label} Tot.</th>`;

                })
                .join("") +
            `<th class="annual-subheader">Total</th>` +
            `<th class="annual-subheader">Meta Anual</th>` +
            `<th class="annual-subheader">%</th>` +
            `<th class="annual-subheader">Status</th>`;

        thead.appendChild(row1);

        thead.appendChild(row2);

        return thead;

    },

    /* ==========================================================
       FRASEOLOGIAS: tabela consolidada, uma linha para cada país
    ========================================================== */

    isPhraseology(row) {

        return Metrics.isPhraseology(row);

    },

    getPhraseologyRows(country) {

        return this.rawData.filter(row =>
            row.country === country &&
            this.isCompleted(row) &&
            row.publishDate &&
            row.publishDate.getFullYear() === this.currentYear &&
            this.isPhraseology(row)
        );

    },

    getPhraseologySeries(country) {

        const series = new Array(12).fill(0);

        this.getPhraseologyRows(country).forEach(row => {
            series[row.publishDate.getMonth()]++;
        });

        return series;

    },

    renderPhraseologies() {

        const container = document.getElementById("phraseologiesContainer");

        if (!container) return;

        container.innerHTML = "";

        const countries = this.countries.filter(country =>
            this.rawData.some(row =>
                row.country === country && this.isPhraseology(row)
            )
        );

        if (!countries.length) {
            container.innerHTML = "<p>Nenhuma fraseologia concluída registrada para o ano selecionado.</p>";
            return;
        }

        const wrapper = document.createElement("div");
        wrapper.className = "country-card";
        const table = document.createElement("table");
        table.className = "goals-table";
        table.appendChild(this.buildPhraseologyCompactTableHead());

        const tbody = document.createElement("tbody");
        countries.forEach(country => {
            tbody.innerHTML += this.buildPhraseologyRow(country);
        });
        tbody.innerHTML += this.buildPhraseologyTotalRow(countries);

        table.appendChild(tbody);
        this.bindDrilldownEvents(tbody);
        wrapper.appendChild(table);
        container.appendChild(wrapper);

    },

    buildPhraseologyTableHead() {

        const thead = this.buildCountryTableHead();
        thead.querySelector("th").textContent = "País";
        return thead;

    },

    buildPhraseologyRow(country) {

        const series = this.getPhraseologySeries(country);
        const total = this.getSeriesTotal(series);
        let row = `<tr data-drill="phraseology" data-country="${country}">` +
            `<td class="action-name drill-trigger">${country}</td>`;

        this.quarters.forEach((quarter, quarterIndex) => {
            quarter.months.forEach(monthIndex => {
                row += `<td>${series[monthIndex]}</td>`;
            });
            row += `<td class="q-total-cell">${this.getQuarterTotal(series, quarterIndex)}</td>`;
        });

        return row +
            `<td class="drill-trigger">${total}</td>` +
            `<td>—</td><td>—</td><td>—</td></tr>`;

    },

    /* ==========================================================
       LINHA-RESUMO DE UM PAÍS
       (ex.: "Ações Colômbia" — soma de todas as ações
       concluídas no país, independente do tipo)
    ========================================================== */

    buildCountrySummaryRow(country, summaryConfig) {

        const series = this.getCountrySummarySeries(country);

        const total = this.getSeriesTotal(series);

        const goalAnnual = summaryConfig.annual;

        const annualAchieved = goalAnnual ? total >= goalAnnual : false;

        let row =
            `<tr class="summary-row" data-drill="country-summary" data-country="${country}">` +
            `<td class="action-name drill-trigger">${summaryConfig.label}</td>`;

        this.quarters.forEach((quarter, quarterIndex) => {

            quarter.months.forEach(monthIndex => {

                const value = series[monthIndex];

                const previous =
                    monthIndex === 0
                        ? undefined
                        : series[monthIndex - 1];

                const trend = this.getTrend(value, previous);

                row +=
                    `<td>${value}` +
                    (trend.symbol
                        ? ` <span class="${trend.className}">${trend.symbol}</span>`
                        : "") +
                    `</td>`;

            });

            const quarterTotal = this.getQuarterTotal(series, quarterIndex);

            const quarterGoal = goalAnnual / 4;

            const quarterPct = quarterGoal
                ? Math.round((quarterTotal / quarterGoal) * 100)
                : 0;

            const cellClass = annualAchieved
                ? "goal-achieved"
                : this.getGoalStatus(quarterPct).className;

            const title = annualAchieved
                ? `Meta anual já atingida (${this.formatNumber(goalAnnual)})`
                : `${quarterPct}% da meta trimestral (${this.formatNumber(quarterGoal)})`;

            row +=
                `<td class="q-total-cell ${cellClass}" title="${title}">` +
                `${quarterTotal}</td>`;

        });

        const pct = goalAnnual
            ? Math.round((total / goalAnnual) * 100)
            : 0;

        const status = this.getGoalStatus(pct);

        row +=
            `<td class="drill-trigger">${total}</td>` +
            `<td>${goalAnnual}</td>` +
            `<td>${pct}%</td>` +
            `<td><span class="badge ${status.className}">${status.icon} ${status.label}</span></td>` +
            `</tr>`;

        return row;

    },

    /* ==========================================================
       LINHA DE UMA AÇÃO NA TABELA POR PAÍS
    ========================================================== */

    buildCountryActionRow(country, action, includeArea = false) {

        const series = this.getMonthlySeries(country, action);

        const total = this.getSeriesTotal(series);

        const goal = this.getGoal(action);

        const annualAchieved =
            goal && goal.annual
                ? total >= goal.annual
                : false;

        const rowClass = annualAchieved ? " goal-achieved-row" : "";

        let row =
            `<tr class="${rowClass}" data-drill="action" data-country="${country}" data-action="${action}">` +
            (includeArea ? `<td class="area-name">${this.getActionArea(action)}</td>` : "") +
            `<td class="action-name drill-trigger">${action}</td>`;

        this.quarters.forEach((quarter, quarterIndex) => {

            quarter.months.forEach(monthIndex => {

                const value = series[monthIndex];

                const previous =
                    monthIndex === 0
                        ? undefined
                        : series[monthIndex - 1];

                const trend = this.getTrend(value, previous);

                row +=
                    `<td>${value}` +
                    (trend.symbol
                        ? ` <span class="${trend.className}">${trend.symbol}</span>`
                        : "") +
                    `</td>`;

            });

            const quarterTotal = this.getQuarterTotal(series, quarterIndex);

            if (goal && goal.annual) {

                const quarterGoal = goal.annual / 4;

                const quarterPct = Math.round(
                    (quarterTotal / quarterGoal) * 100
                );

                const cellClass = annualAchieved
                    ? "goal-achieved"
                    : this.getGoalStatus(quarterPct).className;

                const title = annualAchieved
                    ? `Meta anual já atingida (${this.formatNumber(goal.annual)})`
                    : `${quarterPct}% da meta trimestral (${this.formatNumber(quarterGoal)})`;

                row +=
                    `<td class="q-total-cell ${cellClass}" title="${title}">` +
                    `${quarterTotal}</td>`;

            }
            else {

                row += `<td class="q-total-cell">${quarterTotal}</td>`;

            }

        });

        if (goal) {

            const pct =
                goal.annual === 0
                    ? 0
                    : Math.round((total / goal.annual) * 100);

            const status = this.getGoalStatus(pct);

            row +=
                `<td class="drill-trigger">${total}</td>` +
                `<td>${goal.annual}</td>` +
                `<td>${pct}%</td>` +
                `<td><span class="badge ${status.className}">${status.icon} ${status.label}</span></td>`;

        }
        else {

            row +=
                `<td class="drill-trigger">${total}</td>` +
                `<td>—</td>` +
                `<td>—</td>` +
                `<td>—</td>`;

        }

        row += "</tr>";

        return row;

    },

    /* ==========================================================
       DELEGAÇÃO DE CLIQUE (DRILL-DOWN)
    ========================================================== */

    bindDrilldownEvents(tbody) {

        tbody.addEventListener("click", (event) => {

            const trigger = event.target.closest(".drill-trigger");

            if (!trigger) {

                return;

            }

            const tr = trigger.closest("tr");

            if (!tr) {

                return;

            }

            const type = tr.dataset.drill;

            const country = tr.dataset.country;

            if (type === "country-summary") {

                const rows = this.getCountryCompletedRows(country);

                const summaryConfig =
                    CONFIG.COUNTRY_SUMMARY_GOALS[country];

                this.onDrilldownRequest(
                    rows,
                    `${summaryConfig.label} — ${this.currentYear}`
                );

                return;

            }

            if (type === "action") {

                const action = tr.dataset.action;

                const rows = this.getActionRows(country, action);

                this.onDrilldownRequest(
                    rows,
                    `${action} — ${country} — ${this.currentYear}`
                );

            }

            if (type === "phraseology") {

                const rows = this.getPhraseologyRows(country);

                this.onDrilldownRequest(
                    rows,
                    `Fraseologias — ${country} — ${this.currentYear}`
                );

            }

        });

    },

    /* ==========================================================
       RENDER: RESUMO CONSOLIDADO POR TIPO DE AÇÃO
    ========================================================== */

    renderByType() {

        const container = document.getElementById("goalsByTypeContainer");

        if (!container) {

            console.warn("Goals.render(): #goalsByTypeContainer não encontrado.");

            return;

        }

        container.innerHTML = "";

        const goalNames = CONFIG.GOALS
            ? Object.keys(CONFIG.GOALS)
            : [];

        const nonGoalActions = this.actions
            .filter(action => !this.hasGoal(action))
            .sort();

        if (!goalNames.length && !nonGoalActions.length) {

            container.innerHTML =
                "<p>Nenhum dado disponível para metas.</p>";

            return;

        }

        container.appendChild(
            this.buildGoalsByTypeTable(goalNames, nonGoalActions)
        );

    },

    /* ==========================================================
       TABELA CONSOLIDADA POR TIPO DE AÇÃO
    ========================================================== */

    buildGoalsByTypeTable(goalNames, nonGoalActions) {

        const table = document.createElement("table");

        table.className = "goals-table";

        const currentQuarterLabel =
            this.quarters[this.currentQuarter].label;

        table.innerHTML =
            "<thead><tr>" +
            "<th>Ação</th>" +
            `<th>${currentQuarterLabel} (todos os países)</th>` +
            "<th>Meta Trimestral</th>" +
            "<th>Total Anual (todos os países)</th>" +
            "<th>Meta Anual</th>" +
            "<th>% Atingido</th>" +
            "<th>Status</th>" +
            "</tr></thead>";

        const tbody = document.createElement("tbody");

        goalNames.forEach(action => {

            tbody.innerHTML +=
                this.buildGoalTypeRow(action);

        });

        if (goalNames.length && nonGoalActions.length) {

            tbody.innerHTML += this.buildSubgroupHeaderRow(
                "Sem meta definida"
            ).replace('colspan="21"', 'colspan="7"');

        }

        nonGoalActions.forEach(action => {

            tbody.innerHTML +=
                this.buildGoalTypeRow(action);

        });

        table.appendChild(tbody);

        return table;

    },

    /* ==========================================================
       LINHA CONSOLIDADA DE UMA AÇÃO
    ========================================================== */

    buildGoalTypeRow(action) {

        const total = this.getTotalAllCountries(action);

        const quarterTotal = this.getQuarterTotalAllCountries(

            action,

            this.currentQuarter

        );

        const goal = this.getGoal(action);

        let row = `<tr><td class="action-name">${action}</td>`;

        if (goal) {

            const quarterGoal = goal.annual / 4;

            const quarterPct = quarterGoal
                ? Math.round((quarterTotal / quarterGoal) * 100)
                : 0;

            const annualPct =
                goal.annual === 0
                    ? 0
                    : Math.round((total / goal.annual) * 100);

            const annualAchieved = total >= goal.annual;

            const quarterCellClass = annualAchieved
                ? "goal-achieved"
                : this.getGoalStatus(quarterPct).className;

            const annualStatus = this.getGoalStatus(annualPct);

            row +=
                `<td class="q-total-cell ${quarterCellClass}">${quarterTotal}</td>` +
                `<td>${this.formatNumber(quarterGoal)}</td>` +
                `<td>${total}</td>` +
                `<td>${goal.annual}</td>` +
                `<td>${annualPct}%</td>` +
                `<td><span class="badge ${annualStatus.className}">${annualStatus.icon} ${annualStatus.label}</span></td>`;

        }
        else {

            row +=
                `<td>${quarterTotal}</td>` +
                "<td>—</td>" +
                `<td>${total}</td>` +
                "<td>—</td>" +
                "<td>—</td>" +
                "<td>—</td>";

        }

        row += "</tr>";

        return row;

    },

    /* Tabela de fraseologias: somente volumes, sem campos de metas. */
    buildPhraseologyCompactTableHead() {

        const thead = document.createElement("thead");
        const row1 = document.createElement("tr");
        const row2 = document.createElement("tr");

        row1.innerHTML =
            `<th rowspan="2">País</th>` +
            this.quarters
                .map(q => `<th colspan="4" class="quarter-header">${q.label}</th>`)
                .join("") +
            `<th class="quarter-header annual-header">Resultado anual</th>`;

        row2.innerHTML =
            this.quarters
                .map(q => q.months
                    .map(m => `<th>${this.monthNames[m]}</th>`)
                    .join("") + `<th class="q-total-header">${q.label} Tot.</th>`
                )
                .join("") +
            `<th class="annual-subheader">Total</th>`;

        thead.appendChild(row1);
        thead.appendChild(row2);

        return thead;

    },

    buildPhraseologyTotalRow(countries) {

        const series = new Array(12).fill(0);

        countries.forEach(country => {
            this.getPhraseologySeries(country).forEach((value, month) => {
                series[month] += value;
            });
        });

        let row = `<tr class="summary-row">` +
            `<td class="action-name">Total de todos os países</td>`;

        this.quarters.forEach((quarter, quarterIndex) => {
            quarter.months.forEach(monthIndex => {
                row += `<td>${series[monthIndex]}</td>`;
            });

            row += `<td class="q-total-cell">${this.getQuarterTotal(series, quarterIndex)}</td>`;
        });

        return row + `<td>${this.getSeriesTotal(series)}</td></tr>`;

    },

    buildPhraseologyRow(country) {

        const series = this.getPhraseologySeries(country);
        const total = this.getSeriesTotal(series);
        let row = `<tr data-drill="phraseology" data-country="${country}">` +
            `<td class="action-name drill-trigger">${country}</td>`;

        this.quarters.forEach((quarter, quarterIndex) => {
            quarter.months.forEach(monthIndex => {
                row += `<td>${series[monthIndex]}</td>`;
            });

            row += `<td class="q-total-cell">${this.getQuarterTotal(series, quarterIndex)}</td>`;
        });

        return row + `<td class="drill-trigger">${total}</td></tr>`;

    },

    getActionArea(action) {

        if (CONFIG.ACTION_AREAS && CONFIG.ACTION_AREAS[action]) {

            return CONFIG.ACTION_AREAS[action];

        }

        const normalized = String(action || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase();

        if (normalized.includes("conteudo") && normalized.includes("redes")) {

            return "Label Relations";

        }

        if (normalized.includes("contrato") && normalized.includes("ott")) {

            return "Licenciamento";

        }

        if (normalized.includes("youtube") && normalized.includes("claro")) {

            return "Marketing";

        }

        return "Não informada";

    },

    sortActionsByArea(actions) {

        return [...actions].sort((first, second) => {

            const areaCompare = this.getActionArea(first).localeCompare(
                this.getActionArea(second),
                "pt-BR"
            );

            return areaCompare || first.localeCompare(second, "pt-BR");

        });

    },

    buildBrazilCountryTable(country) {

        const table = document.createElement("table");
        table.className = "goals-table";
        table.appendChild(this.buildBrazilTableHead());

        const tbody = document.createElement("tbody");
        const { goalActions, nonGoalActions } = this.getCountryActions(country);

        tbody.innerHTML += this.buildBrazilAreaGroupRows(country, goalActions);

        if (goalActions.length && nonGoalActions.length) {
            tbody.innerHTML += this.buildBrazilSubgroupHeaderRow("Ações sem meta definida");
        }

        tbody.innerHTML += this.buildBrazilAreaGroupRows(country, nonGoalActions);

        if (!goalActions.length && !nonGoalActions.length) {
            tbody.innerHTML =
                `<tr><td colspan="22">Nenhuma ação concluída registrada para ${country} em ${this.currentYear}.</td></tr>`;
        }

        table.appendChild(tbody);
        this.bindDrilldownEvents(tbody);

        return table;

    },

    buildBrazilSubgroupHeaderRow(label) {

        return `<tr class="subgroup-row"><td colspan="22">${label}</td></tr>`;

    },

    buildBrazilAreaGroupRows(country, actions) {

        const groups = new Map();

        this.sortActionsByArea(actions).forEach(action => {

            const area = this.getActionArea(action);

            if (!groups.has(area)) {

                groups.set(area, []);

            }

            groups.get(area).push(action);

        });

        return [...groups.entries()].map(([area, areaActions]) => {

            return areaActions.map((action, index) => {

                const row = this.buildCountryActionRow(country, action);

                if (index !== 0) {

                    return row;

                }

                return row.replace(
                    /(<tr[^>]*>)/,
                    `$1<td class="area-name" rowspan="${areaActions.length}">${area}</td>`
                );

            }).join("");

        }).join("");

    },

    buildBrazilTableHead() {

        const thead = document.createElement("thead");
        const row1 = document.createElement("tr");
        const row2 = document.createElement("tr");

        row1.innerHTML =
            `<th rowspan="2">Área</th><th rowspan="2">Ação</th>` +
            this.quarters
                .map(q => `<th colspan="4" class="quarter-header">${q.label}</th>`)
                .join("") +
            `<th colspan="4" class="quarter-header annual-header">Resultado anual</th>`;

        row2.innerHTML =
            this.quarters
                .map(q => q.months
                    .map(month => `<th>${this.monthNames[month]}</th>`)
                    .join("") + `<th class="q-total-header">${q.label} Tot.</th>`
                )
                .join("") +
            `<th class="annual-subheader">Total</th>` +
            `<th class="annual-subheader">Meta Anual</th>` +
            `<th class="annual-subheader">%</th>` +
            `<th class="annual-subheader">Status</th>`;

        thead.appendChild(row1);
        thead.appendChild(row2);

        return thead;

    }

};

window.Goals = Goals;
