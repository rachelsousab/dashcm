/* ==========================================================
   CLARO MÚSICA DASHBOARD
   ACTIONS MERGE MODULE

   Uma ação "original" (vinda de qualquer planilha de origem)
   pode ter uma ou mais ações "espelho" em Ações Manuais,
   criadas pela tela de edição quando o usuário adiciona um
   canal extra para a mesma ação (ex.: um post do Instagram
   que também foi para TV Corporativa).

   Este módulo funde essas linhas numa única "ação lógica"
   para fins de contagem/exibição em todo o dashboard (Metas,
   Overview, Análises, tela de edição), evitando duplicidade,
   mas mantendo as linhas originais acessíveis para drilldown.

   Chave de fusão: Data + Gravadora + Regional + Responsável +
   Resumo da ação (Detalhe NÃO entra na chave — é o campo que
   é unido/combinado entre as linhas fundidas).
========================================================== */

const ActionsMerge = {

    /* ======================================================
       ORIGEM DO ID

       "Ações Manuais" tem 2 formatos de ID coexistindo:
       linhas antigas usam prefixo "MANUAL-0001", linhas novas
       (vindas do formulário) usam UUID puro, gerado pelo
       Apps Script via Utilities.getUuid() — que já tem vários
       hifens, então não dá pra usar a mesma lógica de
       "prefixo antes do primeiro hífen" das outras 5 origens
       (RS-, C500-, CO-, BAN-, PUSH-) pra esse caso.
    ====================================================== */

    UUID_REGEX: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,

    isManualOrigin(row) {

        const id = String(row.id || "").trim();

        return this.UUID_REGEX.test(id) || /^MANUAL-/i.test(id);

    },

    getSourcePrefix(id) {

        if (!id) return null;

        const parts = String(id).split("-");

        return parts.length > 1 ? parts[0].trim().toUpperCase() : null;

    },

    getSourceLabel(id) {

        const trimmed = String(id || "").trim();

        if (this.UUID_REGEX.test(trimmed) || /^MANUAL-/i.test(trimmed)) {

            return "Ações Manuais";

        }

        const prefix = this.getSourcePrefix(id);

        if (!prefix) return null;

        return CONFIG.ID_SOURCE_PREFIXES[prefix] || prefix;

    },

    /* ======================================================
       CHAVE DE FUSÃO
    ====================================================== */

    getMergeKey(row) {

        const dateKey =
            row.proposalDate instanceof Date && !isNaN(row.proposalDate)
                ? row.proposalDate.toISOString().slice(0, 10)
                : "";

        return [
            dateKey,
            (row.label || "").trim().toLowerCase(),
            (row.regional || "").trim().toLowerCase(),
            (row.owner || "").trim().toLowerCase(),
            (row.summary || "").trim().toLowerCase()
        ].join("||");

    },

    /* ======================================================
       FUSÃO

       Retorna uma lista de "ações lógicas": uma linha
       representante por grupo, com:
       - detail: valores de Detalhe combinados (únicos, ", ")
       - _rows: todas as linhas originais do grupo (drilldown)
       - _statusesBySource: [{ source, status }] por linha
       - _merged: true se o grupo tem mais de 1 linha
    ====================================================== */

    getMergedRows(rows) {

        const untouched = [];

        const candidates = [];

        rows.forEach(row => {

            /* Fraseologias nunca são fundidas nem editáveis por
               aqui — servem só pra contabilizar totais enviados,
               cada linha continua contando como 1, individualmente. */
            if (typeof Metrics !== "undefined" && Metrics.isPhraseology(row)) {

                untouched.push(row);

                return;

            }

            candidates.push(row);

        });

        /* ==================================================
           ETAPA 1 — ID compartilhado

           Critério mais confiável de fusão (deliberado, sem
           risco de colisão por coincidência de texto). Duas
           linhas com o mesmo ID sempre se fundem. Linhas cujo
           ID não tem par (ou que não têm ID) sobram pra
           etapa 2, a fusão por texto (respaldo pra dados
           antigos que ainda não têm ID compartilhado).
        ================================================== */

        const idGroups = new Map();

        const leftovers = [];

        candidates.forEach(row => {

            const id = String(row.id || "").trim().toLowerCase();

            if (!id) {

                leftovers.push(row);

                return;

            }

            if (!idGroups.has(id)) {

                idGroups.set(id, []);

            }

            idGroups.get(id).push(row);

        });

        const groups = [];

        idGroups.forEach(groupRows => {

            if (groupRows.length === 1) {

                leftovers.push(groupRows[0]);

            } else {

                groups.push(groupRows);

            }

        });

        /* ==================================================
           ETAPA 2 — chave por texto (Data+Gravadora+Regional+
           Responsável+Resumo), só entre quem sobrou sem par
           por ID.
        ================================================== */

        const textGroups = new Map();

        leftovers.forEach(row => {

            const key = this.getMergeKey(row);

            if (!textGroups.has(key)) {

                textGroups.set(key, []);

            }

            textGroups.get(key).push(row);

        });

        textGroups.forEach(groupRows => groups.push(groupRows));

        const merged = untouched.map(row => ({
            ...row,
            _rows: [row],
            _statusesBySource: [{
                source: this.getSourceLabel(row.id) || "Ações Manuais",
                status: row.status
            }],
            _merged: false
        }));

        groups.forEach(groupRows => {

            if (groupRows.length === 1) {

                merged.push({
                    ...groupRows[0],
                    _rows: groupRows,
                    _statusesBySource: [{
                        source: this.getSourceLabel(groupRows[0].id) || "Ações Manuais",
                        status: groupRows[0].status
                    }],
                    _merged: false
                });

                return;

            }

            const manualRow =
                groupRows.find(r => this.isManualOrigin(r)) || groupRows[0];

            const details = [...new Set(
                groupRows
                    .map(r => r.detail)
                    .filter(Boolean)
            )];

            merged.push({
                ...manualRow,
                detail: details.join(", "),
                _rows: groupRows,
                _statusesBySource: groupRows.map(r => ({
                    source: this.getSourceLabel(r.id) || "Ações Manuais",
                    status: r.status
                })),
                _merged: true
            });

        });

        return merged;

    }

};
