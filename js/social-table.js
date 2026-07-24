const SocialTable = {

    container: null,

    monthlyData: [],

    annualData: {},

    rows: [

        {
            label: "Posts",
            field: "posts",
            type: "total"
        },

        {
            label: "Alcance",
            children: [

                {
                    field: "alcance",
                    type: "total",
                    label: "Total"
                },

                {
                    field: "mediaAlcance",
                    type: "average",
                    label: "Média/Post"
                }

            ]
        },

        {
            label: "Visualizações",
            children: [

                {
                    field: "visualizacoes",
                    type: "total",
                    label: "Total"
                },

                {
                    field: "mediaVisualizacoes",
                    type: "average",
                    label: "Média/Post"
                }

            ]
        },

        {
            label: "Interações",
            children: [

                {
                    field: "interacoes",
                    type: "total",
                    label: "Total"
                },

                {
                    field: "mediaInteracoes",
                    type: "average",
                    label: "Média/Post"
                }

            ]
        },

        {
            label: "Curtidas",
            children: [

                {
                    field: "curtidas",
                    type: "total",
                    label: "Total"
                },

                {
                    field: "mediaCurtidas",
                    type: "average",
                    label: "Média/Post"
                }

            ]
        },

        {
            label: "Comentários",
            children: [

                {
                    field: "comentarios",
                    type: "total",
                    label: "Total"
                },

                {
                    field: "mediaComentarios",
                    type: "average",
                    label: "Média/Post"
                }

            ]
        },

        {
            label: "Reposts",
            children: [

                {
                    field: "reposts",
                    type: "total",
                    label: "Total"
                },

                {
                    field: "mediaReposts",
                    type: "average",
                    label: "Média/Post"
                }

            ]
        },

        {
            label: "Compartilhamentos",
            children: [

                {
                    field: "compartilhamentos",
                    type: "total",
                    label: "Total"
                },

                {
                    field: "mediaCompartilhamentos",
                    type: "average",
                    label: "Média/Post"
                }

            ]
        },

        {
            label: "Salvamentos",
            children: [

                {
                    field: "salvamentos",
                    type: "total",
                    label: "Total"
                },

                {
                    field: "mediaSalvamentos",
                    type: "average",
                    label: "Média/Post"
                }

            ]
        },

        {
            label: "Seguidores",
            children: [

                {
                    field: "seguidores",
                    type: "total",
                    label: "Total"
                },

                {
                    field: "mediaSeguidores",
                    type: "average",
                    label: "Média/Post"
                }

            ]
        },

        {
            label: "Taxa de Engajamento",
            field: "taxaEngajamento",
            type: "percent"
        }

    ],

    init(containerId) {

        this.container = document.getElementById(containerId);

        return this;

    },

render() {

    if (!this.container) {

        return this;

    }

    this.container.innerHTML = `

        <table class="social-table">

            ${this.renderHeader()}

            ${this.renderBody()}

        </table>

    `;

    return this;

},

renderHeader() {

    const months = [

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

    ];

    return `

        <thead>

            <tr>

                <th>Métrica</th>

                <th>Tipo</th>

                ${months.map(month => `<th>${month}</th>`).join("")}

                <th>Total/Ano</th>

            </tr>

        </thead>

    `;

},

renderBody() {

    let html = "<tbody>";

    this.rows.forEach(row => {

        html += this.renderRow(row);

    });

    html += "</tbody>";

    return html;

},

renderRow(row) {

    // Linhas simples (Posts e Taxa de Engajamento)

    if (!row.children) {

        return `

            <tr>

                <td>${row.label}</td>

                <td class="metric-type">-</td>

                ${this.renderCell(row.field)}

            </tr>

        `;

    }

    let html = "";

    row.children.forEach((child, index) => {

        html += "<tr>";

        if (index === 0) {

            html += `

                <td rowspan="${row.children.length}">

                    ${row.label}

                </td>

            `;

        }

        html += `

            <td class="metric-type">${child.label}</td>

            ${this.renderCell(child.field)}

        `;

        html += "</tr>";

    });

    return html;

},

renderCell(field) {

    let html = "";

    const kpis = this.annualData || {};

    const fieldMap = {

        posts: "posts",

        alcance: "alcance",

        visualizacoes: "visualizacoes",

        interacoes: "interacoes",

        curtidas: "curtidas",

        comentarios: "comentarios",

        reposts: "reposts",

        compartilhamentos: "compartilhamentos",

        salvamentos: "salvamentos",

        seguidores: "seguidores",

        mediaAlcance: "mediaAlcance",

        mediaVisualizacoes: "mediaVisualizacoes",

        mediaInteracoes: "mediaInteracoes",

        mediaCurtidas: "mediaCurtidas",

        mediaComentarios: "mediaComentarios",

        mediaReposts: "mediaReposts",

        mediaCompartilhamentos: "mediaCompartilhamentos",

        mediaSalvamentos: "mediaSalvamentos",

        mediaSeguidores: "mediaSeguidores",

        taxaEngajamento: "taxaEngajamento"

    };

    this.monthlyData.forEach((month, index) => {

        const value = month[field] || 0;

        const previous = index > 0
            ? this.monthlyData[index - 1][field]
            : null;

        html += `

            <td><span class="metric-value">${field === "taxaEngajamento"

                        ? this.formatPercent(value)

                        : this.formatNumber(value)}</span>${this.renderVariation(value, previous)}</td>

        `;

    });

    const annual = kpis[fieldMap[field]] ?? 0;

    html += `

        <td class="annual">

            ${field === "taxaEngajamento"

                ? this.formatPercent(annual)

                : this.formatNumber(annual)}

        </td>

    `;

    return html;

},

    renderVariation(current, previous) {

    if (previous === null || previous === undefined) {

        return "";

    }

    const variation = SocialMetrics.variation(

        current,

        previous

    );

    if (variation === null) {

        return "";

    }

    let icon = "►";

    let css = "neutral";

    if (variation > 0.01) {

        icon = "▲";

        css = "positive";

    }

    else if (variation < -0.01) {

        icon = "▼";

        css = "negative";

    }

    // Só a seta fica visível; a porcentagem (número inteiro, sem
    // decimais) aparece só como tooltip ao passar o mouse.
    return `

        <div class="variation ${css}" data-tooltip="${this.formatPercentWhole(Math.abs(variation))}">

            ${icon}

        </div>

    `;

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

    return `${

        Number(value || 0).toLocaleString(

            "pt-BR",

            {

                minimumFractionDigits: 2,

                maximumFractionDigits: 2

            }

        )

    }%`;

},

formatPercentWhole(value) {

    return `${

        Number(value || 0).toLocaleString(

            "pt-BR",

            {

                maximumFractionDigits: 0

            }

        )

    }%`;

},

};