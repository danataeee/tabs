/**
 * House Finance — N-person backend
 * Tabs required (created automatically on first save if missing):
 *   Config    : key | value            (stores the people roster as JSON)
 *   Ledger    : id | item | price | who | note | participants | settled
 *   Recurring : id | item | price | who | note | participants | paidMonth
 * participants is stored as a comma-separated list of names.
 */

const T_CONFIG = 'Config';
const T_LEDGER = 'Ledger';
const T_RECUR  = 'Recurring';

function ss_() { return SpreadsheetApp.getActiveSpreadsheet(); }

function tab_(name, headers) {
  const s = ss_();
  let sh = s.getSheetByName(name);
  if (!sh) {
    sh = s.insertSheet(name);
    sh.appendRow(headers);
  }
  return sh;
}

function ensureTabs_() {
  tab_(T_CONFIG, ['key', 'value']);
  tab_(T_LEDGER, ['id', 'item', 'price', 'who', 'note', 'participants', 'settled']);
  tab_(T_RECUR,  ['id', 'item', 'price', 'who', 'note', 'participants', 'paidMonth']);
}

function doGet() {
  ensureTabs_();
  return json_({
    config: readConfig_(),
    ledger: readLedger_(),
    recurring: readRecurring_()
  });
}

function doPost(e) {
  ensureTabs_();
  // Read the body robustly. When the browser omits Content-Type (to avoid a CORS
  // preflight), the payload still arrives in e.postData.contents.
  var raw = (e && e.postData && e.postData.contents) ? e.postData.contents : '{}';
  const req = JSON.parse(raw);
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    switch (req.action) {
      case 'saveConfig':      saveConfig_(req.config); break;
      case 'resetConfig':     saveConfigRaw_(''); break;
      case 'add':             addRow_(T_LEDGER, req.item, false); break;
      case 'update':          setField_(T_LEDGER, req.id, 7, req.settled); break; // col G settled
      case 'delete':          deleteRow_(T_LEDGER, req.id); break;
      case 'addRecurring':    addRow_(T_RECUR, req.item, true); break;
      case 'payRecurring':    setField_(T_RECUR, req.id, 7, req.paidMonth); break; // col G paidMonth
      case 'deleteRecurring': deleteRow_(T_RECUR, req.id); break;
      case 'settleAll':       settleAll_(req.month); break;
    }
    return json_({ ok: true });
  } finally {
    lock.releaseLock();
  }
}

/* ---------- Config ---------- */
function readConfig_() {
  const sh = tab_(T_CONFIG, ['key', 'value']);
  const rows = sh.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === 'people' && rows[i][1]) {
      try { return { people: JSON.parse(rows[i][1]) }; } catch (err) { return { people: [] }; }
    }
  }
  return { people: [] };
}
function saveConfig_(config) { saveConfigRaw_(JSON.stringify(config.people)); }
function saveConfigRaw_(jsonStr) {
  const sh = tab_(T_CONFIG, ['key', 'value']);
  const rows = sh.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === 'people') { sh.getRange(i + 1, 2).setValue(jsonStr); return; }
  }
  sh.appendRow(['people', jsonStr]);
}

/* ---------- Ledger / Recurring read ---------- */
function readLedger_() {
  const sh = tab_(T_LEDGER, ['id', 'item', 'price', 'who', 'note', 'participants', 'settled']);
  return sh.getDataRange().getValues().slice(1).filter(r => r[0] !== '').map(r => ({
    id: r[0], item: r[1], price: Number(r[2]) || 0, who: r[3], note: r[4],
    participants: splitList_(r[5]),
    settled: r[6] === true || r[6] === 'TRUE'
  }));
}
function readRecurring_() {
  const sh = tab_(T_RECUR, ['id', 'item', 'price', 'who', 'note', 'participants', 'paidMonth']);
  return sh.getDataRange().getValues().slice(1).filter(r => r[0] !== '').map(r => ({
    id: r[0], item: r[1], price: Number(r[2]) || 0, who: r[3], note: r[4],
    participants: splitList_(r[5]),
    paidMonth: r[6] ? String(r[6]) : ''
  }));
}
function splitList_(v) {
  if (!v) return [];
  return String(v).split(',').map(s => s.trim()).filter(Boolean);
}

/* ---------- Writes ---------- */
function addRow_(tab, item, isRecurring) {
  const sh = ss_().getSheetByName(tab);
  const parts = (item.participants || []).join(', ');
  const lastCol = isRecurring ? (item.paidMonth || '') : (item.settled || false);
  sh.appendRow([item.id, item.item, item.price, item.who, item.note, parts, lastCol]);
}
function setField_(tab, id, col, value) {
  const sh = ss_().getSheetByName(tab);
  const row = findRow_(sh, id);
  if (row) sh.getRange(row, col).setValue(value);
}
function deleteRow_(tab, id) {
  const sh = ss_().getSheetByName(tab);
  const row = findRow_(sh, id);
  if (row) sh.deleteRow(row);
}
function settleAll_(month) {
  const L = ss_().getSheetByName(T_LEDGER);
  let last = L.getLastRow();
  for (let r = 2; r <= last; r++) {
    if (L.getRange(r, 1).getValue() !== '') L.getRange(r, 7).setValue(true);
  }
  const R = ss_().getSheetByName(T_RECUR);
  last = R.getLastRow();
  for (let r = 2; r <= last; r++) {
    if (R.getRange(r, 1).getValue() !== '') R.getRange(r, 7).setValue(month);
  }
}

function findRow_(sh, id) {
  const ids = sh.getRange(1, 1, sh.getLastRow(), 1).getValues();
  for (let i = 1; i < ids.length; i++) {
    if (String(ids[i][0]) === String(id)) return i + 1;
  }
  return null;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
