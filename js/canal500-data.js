/**
 * ==========================================================
 * CANAL 500 DATA
 * ----------------------------------------------------------
 * Carrega e normaliza a planilha ORIGINAL do Canal 500 (não a
 * consolidada de ações da área — essa aqui tem os campos
 * operacionais: quem tá no ar agora, quando entra/sai, etc.).
 * ==========================================================
 */

const Canal500Data = {

    csvUrl: "",

    rawData: [],

    rows: [],

    loaded: false,

    async load(csvUrl = this.csvUrl) {

        if (!csvUrl) {
            throw new Error("CSV URL do Canal 500 não definida.");
        }

        this.csvUrl = csvUrl;

        return new Promise((resolve, reject) => {

            Papa.parse(csvUrl, {

                download: true,

                header: true,

                skipEmptyLines: true,

                complete: (results) => {

                    this.rawData = results.data;

                    this.rows = this.normalize(results.data);

                    this.loaded = true;

                    console.log("✔", this.rows.length, "vídeos de Canal 500 carregados.");

                    resolve(this.rows);

                },

                error: reject

            });

        });

    },

    isLoaded() {

        return this.loaded;

    },

    parseDate(value) {

        if (!value) return null;

        const text = String(value).trim();

        const parts = text.split("/");

        if (parts.length !== 3) return null;

        const day = Number(parts[0]);
        const month = Number(parts[1]) - 1;
        const year = Number(parts[2]);

        const date = new Date(year, month, day);

        return isNaN(date.getTime()) ? null : date;

    },

    normalize(rows) {

        return rows.map((row, index) => ({

            rowIndex: index,

            id: (row["ID"] || "").trim(),

            timestamp: (row["Timestamp de criação"] || "").trim(),

            acaoProspectada: (row["Ação Prospectada"] || "").trim(),

            artistas: (row["Artistas"] || "").trim(),

            parceiro: (row["Parceiro"] || "").trim(),

            genero: (row["Gênero"] || "").trim(),

            status: (row["Status"] || "").trim(),

            entrada: this.parseDate(row["Entrada"]),

            saida: this.parseDate(row["Saída"]),

            statusVeiculacao: (row["Status de Veiculação"] || "").trim(),

            responsavel: (row["Responsável"] || "").trim(),

            programa: (row["Programa (em caso de inclusão em programa)"] || "").trim(),

            comentarios: (row["Comentários"] || "").trim(),

            evidencias: (row["Evidências"] || "").trim()

        }));

    },

    /* ======================================================
       CONSULTAS
    ====================================================== */

    getByStatusVeiculacao(status) {

        return this.rows.filter(row => row.statusVeiculacao === status);

    },

    getTotalEnviadoNoAno(year = new Date().getFullYear()) {

        return this.rows.filter(row => row.entrada && row.entrada.getFullYear() === year).length;

    },

    getEmVeiculacaoCount() {

        return this.getByStatusVeiculacao("Em veiculação").length;

    },

    /* Progresso da veiculação: 0% no dia da Entrada, 100% no dia
       da Saída (ou depois). Usado na barra de "quanto falta pra
       sair do ar". */
    getProgress(row) {

        if (!row.entrada || !row.saida) return null;

        const now = new Date();

        const total = row.saida.getTime() - row.entrada.getTime();

        if (total <= 0) return 100;

        const elapsed = now.getTime() - row.entrada.getTime();

        return Math.max(0, Math.min(100, Math.round((elapsed / total) * 100)));

    },

    getDaysRemaining(row) {

        if (!row.saida) return null;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const saida = new Date(row.saida);
        saida.setHours(0, 0, 0, 0);

        const diffMs = saida.getTime() - today.getTime();

        return Math.round(diffMs / (1000 * 60 * 60 * 24));

    }

};
