const SocialCharts = {

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

                position: "bottom"

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

    "#2563eb",

    "#16a34a",

    "#ea580c",

    "#7c3aed",

    "#dc2626",

    "#ca8a04",

    "#0891b2",

    "#4f46e5",

    "#9333ea",

    "#15803d",

    "#b45309",

    "#475569"

],

    destroy(id) {

        if (this.charts[id]) {

            this.charts[id].destroy();

            delete this.charts[id];

        }

    },

    destroyAll() {

        Object.keys(this.charts).forEach(id => {

            this.destroy(id);

        });

    },

    getColor(index) {

    return this.palette[

        index % this.palette.length

    ];

},

getColors(total) {

    return Array.from(

        { length: total },

        (_, index) => this.getColor(index)

    );

},

buildDataset({

    label,

    values,

    color = this.colors.blue,

    fill = false,

    tension = .3

}) {

    return {

        label,

        data: values,

        borderColor: color,

        backgroundColor: color,

        fill,

        tension

    };

},

buildChartData({

    labels,

    datasets

}) {

    return {

        labels,

        datasets

    };

},

    createChart(id, config) {

    this.destroy(id);

    const canvas = document.getElementById(id);

    console.log("Canvas:", id, canvas);

    if (!canvas) {

        console.error("Canvas não encontrado:", id);

        return null;

    }

    const chart = new Chart(canvas, config);

    console.log("Chart criado:", chart);

    this.charts[id] = chart;

    return chart;

},

    line(id, data, options = {}) {

    return this.createChart(id, {

        type: "line",

        data,

        options: {

            ...this.defaults,

            interaction: {

                mode: "index",

                intersect: false

            },

            ...options

        }

    });

},

  bar(id, data, options = {}) {

    const { plugins: pluginsOverride, ...restOptions } = options;

    return this.createChart(id, {

        type: "bar",

        data,

        options: {

            ...this.defaults,

            plugins: { ...this.defaults.plugins, legend: { display: false }, ...pluginsOverride },

            // Barra nasce do zero e cresce até o valor.
            animations: { y: { from: 0 } },

            ...restOptions

        }

    });

},

horizontalBar(id, data, options = {}) {

    const { plugins: pluginsOverride, ...restOptions } = options;

    return this.createChart(id, {

        type: "bar",

        data,

        options: {

            indexAxis: "y",

            ...this.defaults,

            plugins: { ...this.defaults.plugins, legend: { display: false }, ...pluginsOverride },

            // Barra nasce do zero e cresce até o valor.
            animations: { x: { from: 0 } },

            ...restOptions

        }

    });

},

  doughnut(id, data, options = {}) {

    return this.createChart(id, {

        type: "doughnut",

        data,

        options: {

            ...this.defaults,

            cutout: "65%",

            ...options

        }

    });

},

radar(id, data, options = {}) {

    return this.createChart(id, {

        type: "radar",

        data,

        options: {

            ...this.defaults,

            ...options

        }

    });

},

renderGroupedChart({

    canvasId,

    groups,

    metric = "alcance",

    label = "Alcance",

    chart = "bar",

    horizontal = false,

    limit = 10,

    sort = "desc"

}) {

    groups = [...groups];

groups.sort((a,b)=>{

    if(sort==="asc"){

        return a[metric]-b[metric];

    }

    return b[metric]-a[metric];

});

    groups = groups.slice(0, limit);

    const labels = groups.map(item => item.nome);

    const values = groups.map(item => item[metric]);

    const data = this.buildChartData({

        labels,

        datasets: [

            {

                label,

                data: values,

                backgroundColor: this.getColors(labels.length)

            }

        ]

    });

    if (horizontal) {

        return this.horizontalBar(

            canvasId,

            data

        );

    }

    if (chart === "doughnut") {

        return this.doughnut(

            canvasId,

            data

        );

    }

    if (chart === "radar") {

        return this.radar(

            canvasId,

            data

        );

    }

    return this.bar(

        canvasId,

        data

    );

},


};