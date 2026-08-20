/**
 * ==========================================================
 * CONSUMO DE PLAYLISTS — DADOS
 * ----------------------------------------------------------
 * Duas responsabilidades:
 * 1) Ler o arquivo Excel/CSV que a pessoa envia (client-side,
 *    via SheetJS) e normalizar as linhas (Data, ID Playlist,
 *    Nome da Playlist, Consumo).
 * 2) Carregar o histórico (CSV publicado da planilha de
 *    rastreamento que o Apps Script alimenta a cada envio).
 *
 * Este módulo NÃO desenha nada na tela — isso fica no
 * pivot-dashboard.js.
 * ==========================================================
 */

const PivotData = {

    historico: [],
    historicoLoaded: false,

    /* ======================================================
       HISTÓRICO
    ====================================================== */

    async loadHistorico(csvUrl = CONFIG.PIVOT_DATA.csvUrl) {

        if (!csvUrl) {

            this.historico = [];
            this.historicoLoaded = true;

            return this.historico;

        }

        return new Promise((resolve, reject) => {

            Papa.parse(csvUrl, {

                download: true,
                header: true,
                skipEmptyLines: true,

                complete: (results) => {

                    this.historico = results.data
                        .map(row => this.normalizeHistoricoRow(row))
                        .filter(row => row.idPlaylist || row.nomePlaylist);

                    this.historicoLoaded = true;

                    resolve(this.historico);

                },

                error: reject

            });

        });

    },

    normalizeHistoricoRow(row) {

        return {

            idPlaylist: this.toString(row["ID Playlist"]),
            nomePlaylist: this.toString(row["Nome da Playlist"]),

            dataInicio: this.parseDateBR(row["Data Início"]),
            dataFim: this.parseDateBR(row["Data Fim"]),

            entrada: this.parseDateBR(row["Entrada Destaque"]),
            saida: this.parseDateBR(row["Saída Destaque"]),

            consumoTotal: this.parseNumber(row["Consumo Total"]),
            consumoDestaque: this.parseNumber(row["Consumo Destaque"]),

            driveFileId: this.toString(row["Drive File ID"]),
            driveUrl: this.toString(row["Drive File URL"]),

            criadoEm: this.toString(row["Criado em"])

        };

    },

    toString(value) {

        return String(value === undefined || value === null ? "" : value).trim();

    },

    parseDateBR(value) {

        const text = this.toString(value);

        const partes = text.split("/");

        if (partes.length !== 3) return null;

        return new Date(Number(partes[2]), Number(partes[1]) - 1, Number(partes[0]));

    },

    parseNumber(value) {

        const text = this.toString(value).replace(/\./g, "").replace(",", ".");

        const n = Number(text);

        return isNaN(n) ? 0 : n;

    },

    /* ======================================================
       LEITURA DO ARQUIVO ENVIADO (client-side, via SheetJS)
    ====================================================== */

    parseFile(file) {

        return new Promise((resolve, reject) => {

            const reader = new FileReader();

            reader.onload = (event) => {

                try {

                    // raw:true (no read, não só no sheet_to_json) e
                    // cellDates:false evitam que o SheetJS tente
                    // adivinhar datas em texto (CSV) sozinho — sem
                    // isso, ele às vezes lê "01/08/2026" como MM/DD
                    // (americano) em vez de DD/MM, trocando mês e
                    // dia. Preferimos sempre o valor bruto (número =
                    // serial do Excel real, texto = dd/mm/aaaa do
                    // CSV) e convertemos nós mesmos, sem ambiguidade.
                    const workbook = XLSX.read(event.target.result, { type: "array", raw: true, cellDates: false });

                    const sheetName = workbook.SheetNames[0];
                    const sheet = workbook.Sheets[sheetName];

                    const json = XLSX.utils.sheet_to_json(sheet, { defval: "", raw: true });

                    const rows = this.normalizeRows(json);

                    if (!rows.length) {
                        reject(new Error("Nenhuma linha válida encontrada (confira se as colunas se chamam Data, ID Playlist, Nome da Playlist e Consumo)."));
                        return;
                    }

                    resolve(rows);

                }
                catch (error) {

                    reject(error);

                }

            };

            reader.onerror = () => reject(new Error("Não foi possível ler o arquivo."));

            reader.readAsArrayBuffer(file);

        });

    },

    normalizeRows(json) {

        return json
            .map(row => {

                const data = this.toDate(row["Data"]);

                return {
                    data,
                    idPlaylist: this.toString(row["ID Playlist"]),
                    nomePlaylist: this.toString(row["Nome da Playlist"]),
                    consumo: this.toNumber(row["Consumo"])
                };

            })
            .filter(row => row.data instanceof Date && !isNaN(row.data.getTime()));

    },

    toDate(value) {

        if (value instanceof Date) return value;

        if (typeof value === "number") {

            // Serial de data do Excel (fallback pra CSV sem formatação).
            return new Date(Math.round((value - 25569) * 86400 * 1000));

        }

        const text = this.toString(value);

        const partes = text.split("/");

        if (partes.length === 3) {
            return new Date(Number(partes[2]), Number(partes[1]) - 1, Number(partes[0]));
        }

        return null;

    },

    toNumber(value) {

        if (typeof value === "number") return value;

        const text = this.toString(value).replace(/\./g, "").replace(",", ".");

        const n = Number(text);

        return isNaN(n) ? 0 : n;

    },

    /* ======================================================
       AGRUPAMENTO — soma de Consumo por dia, ordem crescente
    ====================================================== */

    groupByDate(rows) {

        const map = new Map();

        rows.forEach(row => {

            const key = this.dateKey(row.data);

            map.set(key, (map.get(key) || 0) + row.consumo);

        });

        return [...map.entries()]
            .map(([key, total]) => ({ dateKey: key, date: this.dateFromKey(key), total }))
            .sort((a, b) => a.date - b.date);

    },

    dateKey(date) {

        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

    },

    dateFromKey(key) {

        const [y, m, d] = key.split("-").map(Number);

        return new Date(y, m - 1, d);

    },

    formatDateBR(date) {

        if (!date) return "";

        return date.toLocaleDateString("pt-BR");

    },

    isWithinRange(date, start, end) {

        if (!start || !end) return false;

        const d = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
        const s = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
        const e = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();

        return d >= s && d <= e;

    }

};
