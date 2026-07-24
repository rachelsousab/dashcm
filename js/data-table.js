/**
 * ==========================================================
 * DATA TABLE
 * ----------------------------------------------------------
 * Componente genérico de tabela: paginação, ordenação por
 * clique no cabeçalho e exportação CSV. Sem acoplamento de
 * domínio — pode ser reaproveitado por qualquer aba.
 *
 * Uso:
 *   const table = DataTable.create(container, columns, getRows, options);
 *   table.render();      // redesenha (chamar sempre que os filtros mudarem)
 *   table.setPage(1);     // volta pra primeira página
 *
 * columns: [{ key, label, num?: bool, render?: (value, row) => html }]
 * getRows: () => array de objetos (já filtrados)
 * options: {
 *   pageSize?: number,
 *   csvName?: string,
 *   csvExport?: boolean (default true),
 *   linkButton?: { label, url } — botão extra que abre um link em
 *                                 nova aba (ex.: planilha de origem),
 *   emptyMessage?: string
 * }
 * ==========================================================
 */

const DataTable = {

    create(container, columns, getRows, options = {}) {

        const pageSize = options.pageSize || 25;

        const csvName = options.csvName || "dados";

        const emptyMessage = options.emptyMessage || "Nenhum registro para os filtros atuais.";

        let page = 1;

        let sortKey = null;

        let sortDir = 1;

        container.innerHTML = "";

        const card = document.createElement("div");

        card.className = "data-table-card";

        const head = document.createElement("div");

        head.className = "data-table-head";

        const count = document.createElement("span");

        count.className = "data-table-count";

        const csvExport = options.csvExport !== false;

        const csvBtn = document.createElement("button");

        csvBtn.type = "button";

        csvBtn.className = "data-table-csv-btn";

        csvBtn.textContent = "⬇ Exportar CSV";

        head.appendChild(count);

        if (csvExport) {

            head.appendChild(csvBtn);

        }

        if (options.linkButton) {

            const linkBtn = document.createElement("a");

            linkBtn.className = "data-table-link-btn";

            linkBtn.href = options.linkButton.url;

            linkBtn.target = "_blank";

            linkBtn.rel = "noopener";

            linkBtn.textContent = options.linkButton.label;

            head.appendChild(linkBtn);

        }

        const scroll = document.createElement("div");

        scroll.className = "data-table-scroll";

        const table = document.createElement("table");

        table.className = "data-table";

        const thead = document.createElement("thead");

        const trh = document.createElement("tr");

        columns.forEach(col => {

            const th = document.createElement("th");

            th.innerHTML = `${col.label} <span class="data-table-sort-icon">↕</span>`;

            th.addEventListener("click", () => {

                if (sortKey === col.key) {
                    sortDir *= -1;
                } else {
                    sortKey = col.key;
                    sortDir = 1;
                }

                page = 1;

                render();

            });

            trh.appendChild(th);

        });

        thead.appendChild(trh);

        table.appendChild(thead);

        const tbody = document.createElement("tbody");

        table.appendChild(tbody);

        scroll.appendChild(table);

        const pager = document.createElement("div");

        pager.className = "data-table-pager";

        const prevBtn = document.createElement("button");

        prevBtn.type = "button";

        prevBtn.textContent = "‹ Anterior";

        const info = document.createElement("span");

        info.className = "data-table-pager-info";

        const nextBtn = document.createElement("button");

        nextBtn.type = "button";

        nextBtn.textContent = "Próxima ›";

        prevBtn.addEventListener("click", () => {
            if (page > 1) { page--; render(); }
        });

        nextBtn.addEventListener("click", () => {
            page++; render();
        });

        pager.appendChild(prevBtn);
        pager.appendChild(info);
        pager.appendChild(nextBtn);

        card.appendChild(head);
        card.appendChild(scroll);
        card.appendChild(pager);
        container.appendChild(card);

        function currentRows() {

            let rows = getRows().slice();

            if (sortKey) {

                rows.sort((a, b) => {

                    let x = a[sortKey];
                    let y = b[sortKey];

                    if (x instanceof Date || y instanceof Date) {

                        x = x ? x.getTime() : 0;
                        y = y ? y.getTime() : 0;

                    } else {

                        const nx = parseFloat(x);
                        const ny = parseFloat(y);

                        if (!isNaN(nx) && !isNaN(ny) && x !== "" && y !== "") {
                            x = nx; y = ny;
                        }

                    }

                    if (x == null) x = "";
                    if (y == null) y = "";

                    return (x < y ? -1 : x > y ? 1 : 0) * sortDir;

                });

            }

            return rows;

        }

        function render() {

            const rows = currentRows();

            const pages = Math.max(1, Math.ceil(rows.length / pageSize));

            if (page > pages) page = pages;

            count.textContent = `${rows.length.toLocaleString("pt-BR")} registros`;

            tbody.innerHTML = "";

            const slice = rows.slice((page - 1) * pageSize, page * pageSize);

            if (!slice.length) {

                const tr = document.createElement("tr");

                tr.innerHTML = `<td colspan="${columns.length}"><div class="data-table-empty">${emptyMessage}</div></td>`;

                tbody.appendChild(tr);

            } else {

                slice.forEach(row => {

                    const tr = document.createElement("tr");

                    columns.forEach(col => {

                        const td = document.createElement("td");

                        const value = row[col.key];

                        td.innerHTML = col.render ? col.render(value, row) : (value == null ? "" : value);

                        if (col.num) td.className = "num";

                        tr.appendChild(td);

                    });

                    tbody.appendChild(tr);

                });

            }

            info.textContent = `Página ${page} de ${pages}`;

            prevBtn.disabled = page <= 1;

            nextBtn.disabled = page >= pages;

        }

        if (csvExport) csvBtn.addEventListener("click", () => {

            const rows = currentRows();

            const esc = v => {

                v = v == null ? "" : String(v);

                return /[",;\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;

            };

            let csv = columns.map(c => esc(c.label)).join(";") + "\n";

            rows.forEach(row => {

                csv += columns.map(c => esc(row[c.key])).join(";") + "\n";

            });

            const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });

            const a = document.createElement("a");

            a.href = URL.createObjectURL(blob);

            a.download = `${csvName}.csv`;

            a.click();

            URL.revokeObjectURL(a.href);

        });

        return {

            render,

            setPage(p) { page = p; }

        };

    }

};
