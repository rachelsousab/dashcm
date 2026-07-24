/* ==========================================================
   CLARO MÚSICA DASHBOARD
   METRICS MODULE
   Part 1 / 3
========================================================== */

const Metrics = {

    isPhraseology(row) {

        const fields = [row && row.area, row && row.detail];

        return fields.some(value =>
            String(value || "").toLocaleLowerCase("pt-BR").includes("fraseolog")
        );

    },

    getNonPhraseologyRows(data) {

        return data.filter(row => !this.isPhraseology(row));

    },

    /* ======================================================
       BASIC KPIs
    ====================================================== */

    getTotal(data) {

        return this.getNonPhraseologyRows(data).length;

    },

    getCompleted(data) {

        return this.getNonPhraseologyRows(data).filter(

            row => row.status === CONFIG.STATUS.completed

        ).length;

    },

    getInProgress(data) {

        return this.getNonPhraseologyRows(data).filter(

            row => row.status === CONFIG.STATUS.inProgress

        ).length;

    },

    getStandby(data) {

        return this.getNonPhraseologyRows(data).filter(

            row => row.status === CONFIG.STATUS.standby

        ).length;

    },

    getCancelled(data) {

        return this.getNonPhraseologyRows(data).filter(

            row => row.status === CONFIG.STATUS.cancelled

        ).length;

    },

    /* ======================================================
       CONVERSION RATE
    ====================================================== */

    getConversionRate(data) {

        const total = this.getTotal(data);

        if (total === 0) return 0;

        const completed = this.getCompleted(data);

        return Number(

            ((completed / total) * 100).toFixed(1)

        );

    },

    /* ======================================================
       EXECUTION TIME
    ====================================================== */

    getAverageExecutionTime(data) {

        const values = this.getNonPhraseologyRows(data)

            .filter(row => row.executionDays !== null)

            .map(row => row.executionDays);

        if (!values.length) return 0;

        const total = values.reduce(

            (sum, value) => sum + value,

            0

        );

        return Math.round(

            total / values.length

        );

    },

    getMedianExecutionTime(data) {

        const values = this.getNonPhraseologyRows(data)

            .filter(row => row.executionDays !== null)

            .map(row => row.executionDays)

            .sort((a, b) => a - b);

        if (!values.length) return 0;

        const middle = Math.floor(values.length / 2);

        if (values.length % 2 === 0) {

            return Math.round(

                (

                    values[middle - 1] +

                    values[middle]

                ) / 2

            );

        }

        return values[middle];

    },

    /* ======================================================
       EXECUTION RANGE
    ====================================================== */

    getMinExecutionTime(data) {

        const values = this.getNonPhraseologyRows(data)

            .filter(row => row.executionDays !== null)

            .map(row => row.executionDays);

        if (!values.length) return 0;

        return Math.min(...values);

    },

    getMaxExecutionTime(data) {

        const values = this.getNonPhraseologyRows(data)

            .filter(row => row.executionDays !== null)

            .map(row => row.executionDays);

        if (!values.length) return 0;

        return Math.max(...values);

    },
    /* ======================================================
       GROUPING HELPERS
    ====================================================== */

    groupBy(data, field) {

        const result = {};

        data.forEach(row => {

            const key = row[field] || "Não informado";

            if (!result[key]) {

                result[key] = 0;

            }

            result[key]++;

        });

        return result;

    },

    /* ======================================================
       MONTHLY EVOLUTION
    ====================================================== */

    getMonthlySeries(data) {

        const months = new Array(12).fill(0);

        data.forEach(row => {

            if (!row.month) return;

            months[row.month - 1]++;

        });

        return {

            labels: CONFIG.DATE.shortMonths,

            values: months

        };

    },

    /* ======================================================
       COUNTRY
    ====================================================== */

    getCountrySeries(data) {

        return this.groupBy(

            data,

            "country"

        );

    },

    /* ======================================================
       AREA
    ====================================================== */

    getAreaSeries(data) {

        return this.groupBy(

            data,

            "area"

        );

    },

    /* ======================================================
       DETAIL
    ====================================================== */

    getDetailSeries(data) {

        return this.groupBy(

            data,

            "detail"

        );

    },

    /* ======================================================
       LABEL
    ====================================================== */

    getLabelSeries(data) {

        return this.groupBy(

            data,

            "label"

        );

    },

    /* ======================================================
       REGIONAL
    ====================================================== */

    getRegionalSeries(data) {

        return this.groupBy(

            data,

            "regional"

        );

    },

    /* ======================================================
       OWNER
    ====================================================== */

    getOwnerSeries(data) {

        return this.groupBy(

            data,

            "owner"

        );

    },

    /* ======================================================
       STATUS
    ====================================================== */

    getStatusSeries(data) {

        return this.groupBy(

            data,

            "status"

        );

    },

    /* ======================================================
       MONTHLY GROWTH
    ====================================================== */

    getMonthlyGrowth(data) {

        const months = this.getMonthlySeries(data).values;

        const growth = [];

        for (let i = 0; i < months.length; i++) {

            if (i === 0) {

                growth.push(0);

                continue;

            }

            const previous = months[i - 1];

            const current = months[i];

            if (previous === 0) {

                growth.push(0);

                continue;

            }

            growth.push(

                Number(

                    (

                        ((current - previous) / previous)

                        * 100

                    ).toFixed(1)

                )

            );

        }

        return growth;

    },

    /* ======================================================
       COUNTRY COMPARISON
    ====================================================== */

    getBrazilVsColombia(data) {

        return {

            Brasil:

                data.filter(

                    row =>

                        row.country

                        .toLowerCase()

                        .includes("br")

                ).length,

            Colômbia:

                data.filter(

                    row =>

                        row.country

                        .toLowerCase()

                        .includes("col")

                ).length

        };

    },

    /* ======================================================
       TOP N
    ====================================================== */

    topItems(series, limit = 10) {

        return Object.entries(series)

            .sort(

                (a, b) => b[1] - a[1]

            )

            .slice(0, limit);

    },
        /* ======================================================
       DETAIL MATRIX
       (Detalhe x País x Mês)
    ====================================================== */

    getDetailMatrix(data) {

        const matrix = {};

        data.forEach(row => {

            if (!row.detail || !row.month || !row.country)
                return;

            const detail = row.detail;
            const country = row.country;

            if (!matrix[detail]) {

                matrix[detail] = {};

            }

            if (!matrix[detail][country]) {

                matrix[detail][country] = {

                    monthly: new Array(12).fill(0),

                    total: 0

                };

            }

            matrix[detail][country].monthly[row.month - 1]++;

            matrix[detail][country].total++;

        });

        return matrix;

    },

    /* ======================================================
       GOAL PROGRESS
    ====================================================== */

    getGoalProgress(data) {

        const matrix = this.getDetailSeries(data);

        const goals = [];

        Object.entries(CONFIG.GOALS).forEach(([detail, goal]) => {

            const total = matrix[detail] || 0;

            const annual = goal.annual;

            const quarterly = goal.quarterly;

            const annualPct =
                annual === 0
                    ? 0
                    : Number(
                        (
                            (total / annual) * 100
                        ).toFixed(1)
                    );

            goals.push({

                detail,

                total,

                annual,

                quarterly,

                annualPct,

                annualCompleted:
                    total >= annual

            });

        });

        return goals;

    },

    /* ======================================================
       FORECAST
    ====================================================== */

    getForecast(data) {

        if (!data.length) return [];

        const currentYear = Math.max(

            ...data

                .filter(r => r.year)

                .map(r => r.year)

        );

        const currentMonth = new Date().getMonth() + 1;

        const goals = this.getGoalProgress(

            data.filter(

                row => row.year === currentYear

            )

        );

        return goals.map(goal => {

            const monthlyAverage =
                currentMonth === 0
                    ? 0
                    : goal.total / currentMonth;

            const forecast =
                Math.round(

                    monthlyAverage * 12

                );

            return {

                detail: goal.detail,

                current: goal.total,

                annualGoal: goal.annual,

                forecast,

                willAchieve:

                    forecast >= goal.annual

            };

        });

    },

    /* ======================================================
       EXECUTIVE SUMMARY
    ====================================================== */

    getExecutiveSummary(data) {

        const actionData = this.getNonPhraseologyRows(data);

        const total =
            this.getTotal(actionData);

        const completed =
            this.getCompleted(actionData);

        const conversion =
            this.getConversionRate(actionData);

        const average =
            this.getAverageExecutionTime(actionData);

        const country =
            this.getCountrySeries(actionData);

        const detail =
            this.topItems(

                this.getDetailSeries(actionData),

                1

            );

        let mainAction = "Nenhuma";

        if (detail.length) {

            mainAction = detail[0][0];

        }

        return `Foram registradas ${total} ações. ` +
            `${completed} foram concluídas (${conversion}%). ` +
            `O tempo médio de execução é de ${average} dias. ` +
            `A ação mais realizada é "${mainAction}". ` +
            `Distribuição por país: ${Object.entries(country).map(c => `${c[0]} (${c[1]})`).join(", ")}.`;

    }

};

/* ==========================================================
   END OF MODULE
========================================================== */

console.log(

    "✔ Metrics module loaded."

);
