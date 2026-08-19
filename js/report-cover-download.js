/**
 * ==========================================================
 * DOWNLOAD DE CAPAS (Gerador de Reporte) — EM TESTE
 * ----------------------------------------------------------
 * Ao clicar em "Download capas (em teste)", pega os destaques
 * de tipo CAPA já filtrados na tela (Semana/Território/
 * Gravadora — respeitando Brasil/LatAm/Todos e a gravadora
 * selecionada) e manda pro Apps Script buscar os arquivos
 * correspondentes no Drive (mesma lógica de grupo de países
 * do scratch-code-gs-capas.gs), mostra uma prévia (nome do
 * arquivo + miniatura) e libera o download de tudo zipado.
 *
 * webAppUrl ainda não está preenchida em
 * CONFIG.COVERS_DOWNLOAD.webAppUrl — enquanto isso, o botão
 * avisa que a busca ainda não está configurada.
 * ==========================================================
 */

const ReportCoverDownload = {

    _rows: [],
    _formatCountry: (pais) => pais,
    _meta: {},
    _zipUrl: "",
    _bound: false,

    open(rows, formatCountry, meta) {

        this._rows = rows;
        this._formatCountry = formatCountry || ((pais) => pais);
        this._meta = meta || {};
        this._zipUrl = "";

        this.bindEvents();

        const modal = document.getElementById("reportCoverDownloadModal");
        const subtitle = document.getElementById("reportCoverDownloadSubtitle");
        const zipBtn = document.getElementById("reportCoverDownloadZipBtn");

        if (subtitle) subtitle.textContent = `${rows.length} ${rows.length === 1 ? "capa" : "capas"}`;

        if (zipBtn) zipBtn.disabled = true;

        this.renderLoading();

        modal.classList.add("open");

        this.fetchCovers();

    },

    close() {

        const modal = document.getElementById("reportCoverDownloadModal");

        if (modal) modal.classList.remove("open");

    },

    bindEvents() {

        if (this._bound) return;

        this._bound = true;

        document.getElementById("reportCoverDownloadClose").addEventListener("click", () => this.close());
        document.getElementById("reportCoverDownloadCancelBtn").addEventListener("click", () => this.close());

        document.getElementById("reportCoverDownloadModal").addEventListener("click", (event) => {

            if (event.target.id === "reportCoverDownloadModal") this.close();

        });

        document.getElementById("reportCoverDownloadZipBtn").addEventListener("click", () => {

            if (this._zipUrl) window.open(this._zipUrl, "_blank");

        });

    },

    renderLoading() {

        const body = document.getElementById("reportCoverDownloadBody");

        if (!body) return;

        body.innerHTML = `<p class="cover-download-status">Procurando as capas no Drive — isso pode levar um minuto...</p>`;

    },

    fetchCovers() {

        const body = document.getElementById("reportCoverDownloadBody");

        if (!CONFIG.COVERS_DOWNLOAD.webAppUrl) {

            if (body) {
                body.innerHTML = `<p class="cover-download-status cover-download-error">A busca de capas ainda não está configurada (CONFIG.COVERS_DOWNLOAD.webAppUrl vazia).</p>`;
            }

            return;

        }

        const payload = this._rows.map(row => ({
            pais: row.pais,
            playlist: row.playlist,
            artist: row.artist,
            semana: row.semana
        }));

        const url = `${CONFIG.COVERS_DOWNLOAD.webAppUrl}?action=buscarCapas&rows=${encodeURIComponent(JSON.stringify(payload))}&zipName=${encodeURIComponent(this.buildZipName())}`;

        fetch(url)
            .then(response => response.json())
            .then(data => this.render(data))
            .catch(error => {

                console.error("[ReportCoverDownload]", error);

                if (body) {
                    body.innerHTML = `<p class="cover-download-status cover-download-error">Não foi possível buscar as capas agora. Tente de novo em instantes.</p>`;
                }

            });

    },

    render(data) {

        const body = document.getElementById("reportCoverDownloadBody");
        const zipBtn = document.getElementById("reportCoverDownloadZipBtn");
        const subtitle = document.getElementById("reportCoverDownloadSubtitle");

        if (!body) return;

        if (!data || !data.success) {

            body.innerHTML = `<p class="cover-download-status cover-download-error">${this.escapeHtml((data && data.errors && data.errors[0]) || "Erro ao buscar as capas.")}</p>`;

            return;

        }

        const found = data.found || [];
        const notFound = data.notFound || [];

        this._zipUrl = data.zipUrl || "";

        if (subtitle) {
            subtitle.textContent = `${found.length} encontrada${found.length === 1 ? "" : "s"} de ${this._rows.length}`;
        }

        if (zipBtn) {
            zipBtn.disabled = !this._zipUrl || !found.length;
        }

        let html = "";

        if (found.length) {

            html += `<div class="cover-download-grid">`;

            html += found.map(item => `
                <div class="cover-download-card">
                    <img src="https://drive.google.com/thumbnail?id=${encodeURIComponent(item.fileId)}&sz=w300" alt="" loading="lazy">
                    <div class="cover-download-card-info">
                        <strong>${this.escapeHtml(this._formatCountry(item.pais))}</strong>
                        <span>${this.escapeHtml(item.playlist)}</span>
                        <span class="cover-download-card-artist">${this.escapeHtml(item.artist || "")}</span>
                        <span class="cover-download-card-filename">${this.escapeHtml(item.fileName)}</span>
                    </div>
                </div>
            `).join("");

            html += `</div>`;

        }

        if (notFound.length) {

            html += `<div class="cover-download-missing">`;
            html += `<p class="cover-download-missing-title">${notFound.length} não encontrada${notFound.length === 1 ? "" : "s"} automaticamente:</p>`;
            html += `<ul>`;

            html += notFound.map(item => `
                <li>${this.escapeHtml(this._formatCountry(item.pais))} — ${this.escapeHtml(item.playlist)} (${this.escapeHtml(item.motivo || "não encontrada")})</li>
            `).join("");

            html += `</ul></div>`;

        }

        if (!found.length && !notFound.length) {
            html = `<p class="cover-download-status">Nenhum resultado retornado.</p>`;
        }

        body.innerHTML = html;

    },

    /**
     * "Território - Gravadora - Semana" (ex.: "LatAm - ONErpm -
     * 14-08-2026") — sem barra na data (Windows não aceita "/"
     * em nome de arquivo) e sem outros caracteres especiais que
     * possam vir da gravadora (ex.: "DMusic / AWAL").
     */
    buildZipName() {

        const { territorio, gravadora, semana } = this._meta;

        const semanaSlug = String(semana || "").replace(/\//g, "-");

        const raw = `${territorio || ""} - ${gravadora || "Todas"} - ${semanaSlug}`;

        return raw
            .replace(/[\\/:*?"<>|]/g, "")
            .replace(/\s+/g, " ")
            .trim();

    },

    escapeHtml(text) {

        return String(text || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");

    }

};
