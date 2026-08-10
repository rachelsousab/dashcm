/**
 * ============================================================
 * DASHBOARD CM — AÇÕES MANUAIS (Apps Script Web App)
 * ------------------------------------------------------------
 * Recebe submissões do formulário "Adicionar/Editar ação" do
 * dashboard e grava/atualiza na aba "Ações Manuais" desta
 * planilha. Também sobe evidências (imagens) pra uma pasta do
 * Drive e grava os links no campo "Evidências".
 *
 * MODOS (payload.mode):
 * - ausente/"create" (padrão): cria uma linha nova. Se
 *   payload.id vier preenchido (ação "duplicada" a partir de
 *   uma ação de outra origem, pra linkar as duas pelo mesmo
 *   ID), usa esse ID em vez de gerar um novo UUID. Se não vier,
 *   gera um UUID novo (fluxo normal de "Adicionar nova ação").
 * - "update": SOBRESCREVE a linha existente cujo ID (coluna A)
 *   bate com payload.id. Não mexe no ID nem no Timestamp de
 *   criação originais — só nos demais campos.
 * ============================================================
 */

const SHEET_NAME = "Ações Manuais";
const EVIDENCE_FOLDER_ID = "1BdLkXeRLeViKBw0hiX4YgqLCHLDHRgw6";
const MAX_IMAGES = 3;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB

// Mesmo valor precisa estar no código do dashboard — não é
// segurança de verdade (fica visível no JS do site, igual a
// senha de acesso), só um filtro contra acesso casual/robôs
// que encontrem a URL por acaso.
const SHARED_SECRET = "DashCM2026FeitopelaRachel";

const REQUIRED_FIELDS = ["pais", "area", "detalhe", "dataProposta", "resumo", "gravadora", "regional", "status", "responsavel"];

// Ordem das colunas na aba (1-indexado). Se você reordenar
// colunas na planilha, atualize aqui também.
const COL = {
  ID: 1,
  TIMESTAMP: 2,
  PAIS: 3,
  AREA: 4,
  DETALHE: 5,
  DATA_PROPOSTA: 6,
  RESUMO: 7,
  GRAVADORA: 8,
  REGIONAL: 9,
  STATUS: 10,
  RESPONSAVEL: 11,
  INICIATIVA: 12,
  DATA_FINAL: 13,
  INFORMACOES_EXTRAS: 14,
  EVIDENCIAS: 15
};

function doPost(e) {

  try {

    const payload = JSON.parse(e.postData.contents);

    if (payload.token !== SHARED_SECRET) {
      return jsonResponse({ success: false, errors: ["Não autorizado."] });
    }

    const errors = validatePayload(payload);

    if (errors.length) {
      return jsonResponse({ success: false, errors: errors });
    }

    const evidenceLinks = uploadEvidenceImages(payload.imagens || []);

    const evidenciasFinal = [payload.evidenciasTexto || "", ...evidenceLinks]
      .filter(Boolean)
      .join("\n");

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);

    /* ============================================
       MODO "update" — sobrescreve linha existente
    ============================================ */

    if (payload.mode === "update") {

      if (!payload.id) {
        return jsonResponse({ success: false, errors: ["Modo update sem id."] });
      }

      const rowIndex = findRowById(sheet, payload.id);

      if (!rowIndex) {
        return jsonResponse({ success: false, errors: [`Nenhuma linha encontrada com ID ${payload.id}.`] });
      }

      // Não mexe em ID (COL.ID) nem em Timestamp de criação
      // (COL.TIMESTAMP) — só nos campos do formulário pra frente.
      sheet.getRange(rowIndex, COL.PAIS, 1, COL.EVIDENCIAS - COL.PAIS + 1).setValues([[
        joinMulti(payload.pais),
        payload.area,
        joinMulti(payload.detalhe),
        payload.dataProposta,
        payload.resumo,
        joinMulti(payload.gravadora),
        joinMulti(payload.regional),
        payload.status,
        joinMulti(payload.responsavel),
        payload.iniciativa || "",
        payload.dataFinal || "",
        payload.informacoesExtras || "",
        evidenciasFinal
      ]]);

      return jsonResponse({ success: true, id: payload.id, mode: "update" });

    }

    /* ============================================
       MODO "create" (padrão) — cria linha nova.
       Usa payload.id se vier (duplicação linkada a
       uma ação de outra origem), senão gera um UUID.
    ============================================ */

    const id = payload.id || Utilities.getUuid();

    sheet.appendRow([
      id,
      new Date(),
      joinMulti(payload.pais),
      payload.area,
      joinMulti(payload.detalhe),
      payload.dataProposta,
      payload.resumo,
      joinMulti(payload.gravadora),
      joinMulti(payload.regional),
      payload.status,
      joinMulti(payload.responsavel),
      payload.iniciativa || "",
      payload.dataFinal || "",
      payload.informacoesExtras || "",
      evidenciasFinal
    ]);

    return jsonResponse({ success: true, id: id, mode: "create" });

  } catch (error) {

    return jsonResponse({ success: false, errors: [String(error)] });

  }

}

/**
 * Acha a linha (1-indexada, pronta pra usar em getRange) cujo
 * ID (coluna A) bate com o id passado. Retorna null se não achar.
 */
function findRowById(sheet, id) {

  const ids = sheet.getRange(2, COL.ID, sheet.getLastRow() - 1, 1).getValues();

  for (let i = 0; i < ids.length; i++) {

    if (String(ids[i][0]).trim() === String(id).trim()) {
      return i + 2; // +2: pula o cabeçalho (linha 1) e corrige índice base-0 -> base-1
    }

  }

  return null;

}

function validatePayload(payload) {

  const errors = [];

  REQUIRED_FIELDS.forEach(field => {

    const value = payload[field];
    const isEmpty = value === undefined || value === null || value === "" ||
      (Array.isArray(value) && value.length === 0);

    if (isEmpty) errors.push(`Campo obrigatório ausente: ${field}`);

  });

  if (payload.status === "Concluída" && !payload.dataFinal) {
    errors.push("Data final é obrigatória quando o status é Concluída.");
  }

  if (Array.isArray(payload.imagens) && payload.imagens.length > MAX_IMAGES) {
    errors.push(`Máximo de ${MAX_IMAGES} imagens por ação.`);
  }

  return errors;

}

function uploadEvidenceImages(imagens) {

  const folder = DriveApp.getFolderById(EVIDENCE_FOLDER_ID);

  return imagens.slice(0, MAX_IMAGES).map(img => {

    const bytes = Utilities.base64Decode(img.base64);

    if (bytes.length > MAX_IMAGE_BYTES) {
      throw new Error(`Imagem "${img.filename}" excede 5MB.`);
    }

    const blob = Utilities.newBlob(bytes, img.mimeType, img.filename);
    const file = folder.createFile(blob);

    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    return file.getUrl();

  });

}

function joinMulti(value) {
  return Array.isArray(value) ? value.join(", ") : (value || "");
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// Abrir a URL do Web App direto no navegador deve responder
// isso — confirma que o deploy está no ar.
function doGet() {
  return jsonResponse({ status: "online", sheet: SHEET_NAME });
}
