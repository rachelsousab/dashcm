/**
 * ==========================================================
 * CONSUMO DE PLAYLISTS — ORQUESTRADOR
 * ----------------------------------------------------------
 * Upload do arquivo -> prévia instantânea (tabela + KPIs +
 * gráfico, tudo calculado no navegador) -> "Gerar planilha e
 * enviar pro Drive" manda os dados brutos pro Apps Script, que
 * cria a Google Sheet de verdade (aba Dados + aba Tabela
 * Dinâmica com pivot table e gráfico nativos) e registra no
 * histórico. O histórico é lido de volta via CSV publicado.
 * ==========================================================
 */

const PivotDashboard = {

    initialized: false,
    bound: false,

    chart: null,

    _rows: [],
    _grouped: [],
    _idPlaylist: "",
    _nomePlaylist: "",

    _historyFiltered: [],
    _activeHistoryRow: null,

    async init() {

        this.bindEvents();

        if (!PivotData.historicoLoaded) {

            try {
                await PivotData.loadHistorico();
            }
            catch (error) {
                console.error("[PivotDashboard]", error);
            }

        }

        this.renderHistoryList(PivotData.historico);

        this.initialized = true;

        return this;

    },

    bindEvents() {

        if (this.bound) return;

        this.bound = true;

        document.getElementById("pivotFileInput").addEventListener("change", (event) => {

            const file = event.target.files[0];

            if (file) this.handleFileSelected(file);

        });

        document.getElementById("pivotEntradaInput").addEventListener("change", () => this.renderAll());
        document.getElementById("pivotSaidaInput").addEventListener("change", () => this.renderAll());

        document.getElementById("pivotSubmitBtn").addEventListener("click", () => this.submit());

        document.getElementById("pivotHistorySearch").addEventListener("input", (event) => {

            this.filterHistory(event.target.value);

        });

        document.getElementById("pivotHistoryModalClose").addEventListener("click", () => this.closeHistoryModal());

        document.getElementById("pivotHistoryModal").addEventListener("click", (event) => {

            if (event.target.id === "pivotHistoryModal") this.closeHistoryModal();

        });


    },

    /* ======================================================
       UPLOAD + PRÉVIA (100% no navegador)
    ====================================================== */

    handleFileSelected(file) {

        const status = document.getElementById("pivotUploadStatus");

        status.textContent = "Lendo arquivo...";
        status.classList.remove("pivot-upload-error");

        PivotData.parseFile(file)
            .then(rows => {

                this._rows = rows;
                this._idPlaylist = rows[0].idPlaylist;
                this._nomePlaylist = rows[0].nomePlaylist;

                this._grouped = PivotData.groupByDate(rows);

                status.textContent = `${rows.length} linhas lidas — ${this._nomePlaylist} (ID ${this._idPlaylist}).`;

                document.getElementById("pivotResult").style.display = "";

                this.renderAll();

            })
            .catch(error => {

                console.error("[PivotDashboard]", error);

                status.textContent = error.message || "Não foi possível ler o arquivo.";
                status.classList.add("pivot-upload-error");

                document.getElementById("pivotResult").style.display = "none";

            });

    },

    getEntradaSaida() {

        const entradaValue = document.getElementById("pivotEntradaInput").value;
        const saidaValue = document.getElementById("pivotSaidaInput").value;

        const entrada = entradaValue ? this.parseDateInput(entradaValue) : null;
        const saida = saidaValue ? this.parseDateInput(saidaValue) : null;

        return { entrada, saida };

    },

    parseDateInput(value) {

        // <input type="date"> devolve sempre "yyyy-mm-dd"
        const [y, m, d] = value.split("-").map(Number);

        return new Date(y, m - 1, d);

    },

    renderAll() {

        if (!this._grouped.length) return;

        this.renderKPIs();
        this.renderTable();
        this.renderChart();

    },

    renderKPIs() {

        const { entrada, saida } = this.getEntradaSaida();

        const total = this._rows.reduce((sum, row) => sum + row.consumo, 0);

        const destaque = this._rows
            .filter(row => PivotData.isWithinRange(row.data, entrada, saida))
            .reduce((sum, row) => sum + row.consumo, 0);

        document.getElementById("pivotKpiTotal").textContent = total.toLocaleString("pt-BR");
        document.getElementById("pivotKpiDestaque").textContent = destaque.toLocaleString("pt-BR");

        this.renderVariacaoKPIs(entrada, saida);

    },

    /**
     * Duas métricas só fazem sentido com entrada/saída preenchidas
     * (e pelo menos 1 dia de dado no período de comparação —
     * senão ficam "—", em vez de dividir por zero):
     *
     * - "% variação no consumo": média diária DURANTE o destaque
     *   vs. média diária ANTES da entrada.
     * - "% variação após término": média diária DEPOIS da saída
     *   vs. média diária DURANTE o destaque.
     */
    renderVariacaoKPIs(entrada, saida) {

        const elDestaque = document.getElementById("pivotKpiVariacaoDestaque");
        const elPos = document.getElementById("pivotKpiVariacaoPosDestaque");

        if (!entrada || !saida) {
            elDestaque.textContent = "—";
            elPos.textContent = "—";
            return;
        }

        const antes = this._grouped.filter(item => item.date < entrada);
        const durante = this._grouped.filter(item => PivotData.isWithinRange(item.date, entrada, saida));
        const depois = this._grouped.filter(item => item.date > saida);

        const media = (items) => items.length
            ? items.reduce((sum, item) => sum + item.total, 0) / items.length
            : null;

        const mediaAntes = media(antes);
        const mediaDurante = media(durante);
        const mediaDepois = media(depois);

        elDestaque.textContent = this.formatVariacao(mediaAntes, mediaDurante);
        elPos.textContent = this.formatVariacao(mediaDurante, mediaDepois);

    },

    formatVariacao(base, comparado) {

        if (!base || comparado === null) return "—";

        const variacao = ((comparado - base) / base) * 100;

        const sinal = variacao > 0 ? "+" : "";

        return `${sinal}${variacao.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;

    },

    renderTable() {

        const container = document.getElementById("pivotTableContainer");

        const { entrada, saida } = this.getEntradaSaida();

        const totalGeral = this._grouped.reduce((sum, item) => sum + item.total, 0);

        const body = this._grouped.map(item => {

            const destacado = PivotData.isWithinRange(item.date, entrada, saida);

            return `
                <tr class="${destacado ? "pivot-row-destaque" : ""}">
                    <td>${PivotData.formatDateBR(item.date)}</td>
                    <td>${Math.round(item.total).toLocaleString("pt-BR")}</td>
                </tr>
            `;

        }).join("");

        container.innerHTML = `
            <table class="goals-table">
                <thead>
                    <tr>
                        <th>Data</th>
                        <th>Soma de Consumo</th>
                    </tr>
                </thead>
                <tbody>
                    ${body}
                    <tr class="summary-row">
                        <td>Total geral</td>
                        <td>${Math.round(totalGeral).toLocaleString("pt-BR")}</td>
                    </tr>
                </tbody>
            </table>
        `;

    },

    renderChart() {

        const canvas = document.getElementById("pivotChart");

        const { entrada, saida } = this.getEntradaSaida();

        const labels = this._grouped.map(item => PivotData.formatDateBR(item.date));

        const consumo = this._grouped.map(item => item.total);

        const consumoDestaque = this._grouped.map(item =>
            PivotData.isWithinRange(item.date, entrada, saida) ? item.total : null
        );

        if (this.chart) {
            this.chart.destroy();
        }

        this.chart = new Chart(canvas, {

            type: "line",

            data: {

                labels,

                datasets: [

                    {
                        label: "Consumo",
                        data: consumo,
                        borderColor: "#999999",
                        backgroundColor: "transparent",
                        tension: 0.2,
                        pointRadius: 2
                    },

                    {
                        label: "Consumo durante o destaque",
                        data: consumoDestaque,
                        borderColor: "#E30613",
                        backgroundColor: "transparent",
                        borderWidth: 4,
                        tension: 0.2,
                        pointRadius: 3,
                        spanGaps: false
                    }

                ]

            },

            options: {

                responsive: true,
                maintainAspectRatio: false,

                plugins: {
                    legend: { position: "bottom" }
                },

                scales: {
                    y: { beginAtZero: true }
                }

            }

        });

    },

    /* ======================================================
       ENVIO — gera a Sheet de verdade via Apps Script
    ====================================================== */

    submit() {

        const status = document.getElementById("pivotSubmitStatus");
        const btn = document.getElementById("pivotSubmitBtn");

        if (!this._rows.length) {

            alert("Envie um arquivo antes.");
            return;

        }

        if (!CONFIG.PIVOT_UPLOAD.webAppUrl) {

            status.textContent = "Geração ainda não configurada (CONFIG.PIVOT_UPLOAD.webAppUrl vazia).";
            return;

        }

        const { entrada, saida } = this.getEntradaSaida();

        const payload = {

            token: CONFIG.PIVOT_UPLOAD.sharedSecret,

            idPlaylist: this._idPlaylist,
            nomePlaylist: this._nomePlaylist,

            entrada: entrada ? PivotData.dateKey(entrada) : "",
            saida: saida ? PivotData.dateKey(saida) : "",

            rows: this._rows.map(row => ({
                data: PivotData.dateKey(row.data),
                idPlaylist: row.idPlaylist,
                nomePlaylist: row.nomePlaylist,
                consumo: row.consumo
            }))

        };

        btn.disabled = true;

        status.textContent = "Gerando planilha no Drive — isso pode levar um minuto...";

        fetch(CONFIG.PIVOT_UPLOAD.webAppUrl, {

            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify(payload)

        })
            .then(response => response.json())
            .then(data => {

                btn.disabled = false;

                if (!data.success) {

                    status.textContent = (data.errors && data.errors[0]) || "Erro ao gerar a planilha.";
                    return;

                }

                status.textContent = "✔ Planilha gerada e enviada pro Drive!";

                return PivotData.loadHistorico().then(() => {
                    this.renderHistoryList(PivotData.historico);
                });

            })
            .catch(error => {

                console.error("[PivotDashboard]", error);

                btn.disabled = false;

                status.textContent = "Não foi possível gerar a planilha agora. Tente de novo.";

            });

    },

    /* ======================================================
       HISTÓRICO
    ====================================================== */

    filterHistory(query) {

        const normalized = String(query || "").trim().toLowerCase();

        const filtered = !normalized
            ? PivotData.historico
            : PivotData.historico.filter(row =>
                row.idPlaylist.toLowerCase().includes(normalized) ||
                row.nomePlaylist.toLowerCase().includes(normalized)
            );

        this.renderHistoryList(filtered);

    },

    renderHistoryList(rows) {

        this._historyFiltered = rows;

        const container = document.getElementById("pivotHistoryList");

        if (!rows.length) {

            container.innerHTML = `<p class="analises-empty">Nenhuma planilha no histórico ainda.</p>`;
            return;

        }

        const sorted = [...rows].sort((a, b) => (b.dataInicio || 0) - (a.dataInicio || 0));

        container.innerHTML = sorted.map((row, index) => `
            <div class="pivot-history-item" data-index="${index}">
                <div class="pivot-history-item-main">
                    <strong>${this.escapeHtml(row.nomePlaylist)}</strong>
                    <span class="pivot-history-item-id">ID ${this.escapeHtml(row.idPlaylist)}</span>
                </div>
                <div class="pivot-history-item-period">
                    ${PivotData.formatDateBR(row.dataInicio)} – ${PivotData.formatDateBR(row.dataFim)}
                </div>
                <div class="pivot-history-item-consumo">
                    Total: ${Math.round(row.consumoTotal).toLocaleString("pt-BR")} · Destaque: ${Math.round(row.consumoDestaque).toLocaleString("pt-BR")}
                </div>
            </div>
        `).join("");

        Array.from(container.querySelectorAll(".pivot-history-item")).forEach((el, index) => {

            el.addEventListener("click", () => this.openHistoryModal(sorted[index]));

        });

    },

    openHistoryModal(row) {

        this._activeHistoryRow = row;

        document.getElementById("pivotHistoryModalTitle").textContent = row.nomePlaylist;

        document.getElementById("pivotHistoryModalSubtitle").textContent =
            `ID ${row.idPlaylist} · ${PivotData.formatDateBR(row.dataInicio)} a ${PivotData.formatDateBR(row.dataFim)}` +
            (row.entrada && row.saida ? ` · Destaque: ${PivotData.formatDateBR(row.entrada)} a ${PivotData.formatDateBR(row.saida)}` : "");

        document.getElementById("pivotHistoryKpiTotal").textContent = Math.round(row.consumoTotal).toLocaleString("pt-BR");
        document.getElementById("pivotHistoryKpiDestaque").textContent = Math.round(row.consumoDestaque).toLocaleString("pt-BR");

        document.getElementById("pivotHistoryKpiVariacaoDestaque").textContent = this.formatVariacaoValue(row.variacaoDestaque);
        document.getElementById("pivotHistoryKpiVariacaoPosDestaque").textContent = this.formatVariacaoValue(row.variacaoPosDestaque);

        document.getElementById("pivotHistoryOpenDrive").href = row.driveUrl || "#";

        document.getElementById("pivotHistoryDownload").href = row.driveFileId
            ? `https://docs.google.com/spreadsheets/d/${row.driveFileId}/export?format=xlsx`
            : "#";

        // A troca de aba via URL (#gid=...) não é confiável dentro
        // de um iframe já carregado do Sheets — em vez de tentar
        // forçar isso, mostramos a planilha completa (com as
        // próprias abas do Sheets visíveis) e quem usa troca de
        // aba clicando direto nelas, dentro do embed mesmo.
        document.getElementById("pivotHistoryIframe").src = row.driveFileId
            ? `https://docs.google.com/spreadsheets/d/${row.driveFileId}/edit?rm=minimal`
            : "";

        document.getElementById("pivotHistoryModal").classList.add("open");

    },

    closeHistoryModal() {

        document.getElementById("pivotHistoryModal").classList.remove("open");

        document.getElementById("pivotHistoryIframe").src = "";

    },

    formatVariacaoValue(value) {

        const numero = Number(value);

        if (value === "" || value === undefined || value === null || isNaN(numero)) return "—";

        const sinal = numero > 0 ? "+" : "";

        return `${sinal}${numero.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;

    },

    escapeHtml(text) {

        return String(text || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");

    }

};
