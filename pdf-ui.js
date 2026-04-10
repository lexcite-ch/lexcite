// ══════════════════════════════════════════════════════════════
//  UI Helpers
// ══════════════════════════════════════════════════════════════

function fillAuthorBlocks(authorData, listId, filled, label = 'Autor(en)') {
  const list = document.getElementById(listId);
  if (!list) return;
  const blocks = list.querySelectorAll('.author-block');

  authorData.forEach((author, i) => {
    let block;
    if (i < blocks.length) {
      block = blocks[i];
    } else {
      // Add new block
      addAuthor(listId);
      const newBlocks = list.querySelectorAll('.author-block');
      block = newBlocks[newBlocks.length - 1];
    }
    const nn = block.querySelector('.nachname');
    const vn = block.querySelector('.vorname');
    if (nn && author.nachname) { nn.value = author.nachname; markAutofill(nn); }
    if (vn && author.vorname) { vn.value = author.vorname; markAutofill(vn); }
  });
  if (authorData.length) filled.push(label);
}

function markAutofill(el) {
  el.classList.add('autofilled');
  el.title = '🤖 Automatisch erkannt – bitte prüfen';
}

function showPdfStatus(type, msg) {
  const el = document.getElementById('pdfStatus');
  el.className = 'pdf-status ' + type;
  if (type === 'loading') {
    el.innerHTML = `<div class="spinner"></div> ${msg}`;
  } else {
    el.innerHTML = msg;
  }
}

function keyLabel(key) {
  const labels = {
    band:'Band', teil:'Teil', seite:'Seite', erwaegung:'Erwägung',
    geschaeft:'Geschäftsnummer', datum:'Datum',
    titel:'Titel', untertitel:'Untertitel', auflage:'Auflage',
    orte:'Ort', jahr:'Jahr', autor:'Autor',
    zeitschrift:'Zeitschrift', seite_start:'Anfangsseite',
    art_von:'Artikel', gesetz:'Gesetz', komm_name:'Kommentarname',
    teilband:'Teilband', sb_titel:'Sammelbandtitel',
    gericht:'Gericht', sr:'SR-Nr.', abk:'Abkürzung', url:'URL',
  };
  return labels[key] || key;
}

function isOptionalField(key) {
  return ['untertitel','band','auflage','erwaegung','stichwort','art_bis','teilband',
          'seite_konk','randnote','seite_start','seite'].includes(key);
}

function isHeadingWord(w) {
  const stop = ['THE','AND','FOR','VON','DES','DER','DIE','DAS','UND','ZUM','ZUR',
                'AUS','MIT','IN','IM','ART','ABS','OR','ZGB','OR','BGE','BGer'];
  return stop.includes(w.trim());
}

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function getJudikaturAutofillState(type) {
  const state = window.__lexciteLastDetection;
  if (!state || state.source !== 'pdf' || state.type !== type) return null;
  return state;
}

function formatJudikaturFieldList(keys = []) {
  return keys.map(keyLabel).join(', ');
}

function renderJudikaturAutofillHint(type) {
  const state = getJudikaturAutofillState(type);
  if (!state) return '';

  const fields = state.fields || {};
  if (type === 'bger') {
    const detected = [];
    const missing = [];
    if (fields.geschaeft) detected.push('Geschäftsnummer');
    else missing.push('Geschäftsnummer');
    if (fields.datum) detected.push('Datum');
    else missing.push('Datum');
    if (fields.erwaegung) detected.push('Erwägung');

    const tone = missing.length ? 'partial' : 'complete';
    const lead = missing.length
      ? 'LexCite hat den Entscheid als BGer erkannt. Bitte ergänze kurz die fehlenden Pflichtangaben, dann ist das Vollzitat sauber aufgebaut.'
      : 'LexCite hat Geschäftsnummer und Datum bereits erkannt. Prüfe die Angaben kurz und übernimm dann das Vollzitat direkt.';
    const detail = missing.length
      ? `Noch offen: ${formatJudikaturFieldList(missing)}. Erwägung ist optional, aber für einen punktgenauen Verweis sehr sinnvoll.`
      : fields.erwaegung
        ? 'Auch die Erwägung wurde erkannt. Das ist ideal für direkte Verweise in der Arbeit.'
        : 'Wenn du auf eine konkrete Stelle verweist, ergänze jetzt noch die Erwägung.';

    return `
      <div class="judikatur-autofill-box judikatur-autofill-${tone}">
        <div class="judikatur-autofill-eyebrow">PDF-Autofill · BGer</div>
        <div class="judikatur-autofill-copy">${lead}</div>
        <div class="judikatur-autofill-meta">
          ${detected.length ? `<span class="judikatur-autofill-chip ok">Erkannt: ${formatJudikaturFieldList(detected)}</span>` : ''}
          ${missing.length ? `<span class="judikatur-autofill-chip warn">Bitte ergänzen: ${formatJudikaturFieldList(missing)}</span>` : ''}
        </div>
        <div class="judikatur-autofill-note">${detail}</div>
      </div>
    `;
  }

  if (type === 'bge') {
    const detected = [];
    const missing = [];
    if (fields.band) detected.push('Band');
    else missing.push('Band');
    if (fields.teil) detected.push('Teil');
    else missing.push('Teil');
    if (fields.seite) detected.push('Anfangsseite');
    else missing.push('Anfangsseite');
    if (fields.erwaegung) detected.push('Erwägung');

    const tone = missing.length ? 'partial' : 'complete';
    const lead = missing.length
      ? 'LexCite hat den Entscheid als BGE erkannt. Ergänze kurz Band, Teil oder Anfangsseite, falls etwas noch fehlt.'
      : 'LexCite hat Band, Teil und Anfangsseite bereits erkannt. Prüfe sie kurz und übernimm dann das Vollzitat direkt.';
    const detail = fields.erwaegung
      ? 'Die Erwägung wurde ebenfalls erkannt und kann direkt für einen punktgenauen Verweis verwendet werden.'
      : 'Die Erwägung ist optional. Wenn du auf eine konkrete Stelle verweist, lohnt sich ein kurzer Ergänzungsblick.';

    return `
      <div class="judikatur-autofill-box judikatur-autofill-${tone}">
        <div class="judikatur-autofill-eyebrow">PDF-Autofill · BGE</div>
        <div class="judikatur-autofill-copy">${lead}</div>
        <div class="judikatur-autofill-meta">
          ${detected.length ? `<span class="judikatur-autofill-chip ok">Erkannt: ${formatJudikaturFieldList(detected)}</span>` : ''}
          ${missing.length ? `<span class="judikatur-autofill-chip warn">Bitte ergänzen: ${formatJudikaturFieldList(missing)}</span>` : ''}
        </div>
        <div class="judikatur-autofill-note">${detail}</div>
      </div>
    `;
  }

  return '';
}

function renderCommentaryAutofillHint() {
  const state = getJudikaturAutofillState('kommentar');
  if (!state) return '';

  const fields = state.fields || {};
  const detected = [];
  const missing = [];

  if (fields.nachnamen_raw?.length) detected.push('Autor/in');
  if (fields.art_von) detected.push('Artikel');
  else missing.push('Artikel');
  if (fields.gesetz) detected.push('Gesetz');
  else missing.push('Gesetz');
  if (fields.komm_name) detected.push('Kommentarwerk');
  else missing.push('Kommentarwerk');
  if (fields.orte) detected.push('Ort');
  else missing.push('Ort');
  if (fields.jahr) detected.push('Jahr');
  else missing.push('Jahr');
  if (fields.teilband_hint || fields.teilband) detected.push('Teilband');
  if (fields.auflage) detected.push('Auflage');
  if (fields.hrsg_raw?.length) detected.push('Herausgeber');

  const tone = missing.length ? 'partial' : 'complete';
  const lead = missing.length
    ? 'LexCite hat den Kommentar bereits als Werk erkannt und mehrere Vollzitat-Bausteine vorbereitet. Ergänze nur noch die wenigen offenen Stellen für den Verzeichniseintrag.'
    : 'LexCite hat die wichtigsten Vollzitat-Bausteine bereits erkannt. Prüfe den Verzeichniseintrag kurz und ergänze danach meist nur noch die Randnote.';
  const detail = missing.length
    ? `Noch offen: ${formatJudikaturFieldList(missing)}. Wenn Kommentarwerk, Teilband und Gesetz schon stimmen, ist der grösste Zeitfresser meist bereits erledigt.`
    : 'Für die Fussnote brauchst du danach in der Regel nur noch die konkrete Randnote.';

  return `
    <div class="judikatur-autofill-box judikatur-autofill-${tone}">
      <div class="judikatur-autofill-eyebrow">PDF-Autofill · Kommentar</div>
      <div class="judikatur-autofill-copy">${lead}</div>
      <div class="judikatur-autofill-meta">
        ${detected.length ? `<span class="judikatur-autofill-chip ok">Erkannt: ${formatJudikaturFieldList(detected)}</span>` : ''}
        ${missing.length ? `<span class="judikatur-autofill-chip warn">Bitte ergänzen: ${formatJudikaturFieldList(missing)}</span>` : ''}
      </div>
      <div class="judikatur-autofill-note">${detail}</div>
    </div>
  `;
}

// ══════════════════════════════════════════════════════════════
//  Form Management
// ══════════════════════════════════════════════════════════════

function onTypeChange() {
  if (typeof LexCiteUsage !== 'undefined') {
    const type = document.getElementById('sourceType')?.value;
    if (type) LexCiteUsage.trackSourceType(type);
  }
  window.__lexciteLastDetection = null;
  document.getElementById('autofillLegend').classList.remove('visible');
  document.getElementById('outputSection').classList.remove('visible');
  document.getElementById('pdfStatus').className = 'pdf-status';
  renderForm();
}

// Pflichtfelder pro Quellentyp
const REQUIRED = {
  monographie:  ['titel','orte','jahr'],
  dissertation: ['titel','uni_ort','orte','jahr'],
  zeitschrift:  ['titel','zeitschrift','jahr','seite_start'],
  sammelband:   ['titel','sb_titel','orte','jahr'],
  kommentar:    ['art_von','gesetz','komm_name','orte','jahr'],
  bge:          ['band','teil','seite'],
  bger:         ['geschaeft','datum'],
  kantonal:     ['gericht','datum'],
  gesetz:       ['titel','sr','abk'],
  internet:     ['titel','url','datum'],
};

function renderForm() {
  const type = document.getElementById('sourceType').value;
  const formDiv = document.getElementById('dynamicForm');
  if (!type || !FORMS[type]) {
    formDiv.innerHTML = `
      <div class="empty-state empty-state-compact">
        <div class="icon">📚</div>
        <div class="empty-state-copy">
          <strong>Noch kein Quellentyp gewählt</strong>
          <p>Starte mit einem Entscheid-PDF oder wähle direkt unten den passenden Quellentyp.</p>
        </div>
      </div>
    `;
    updateOutputLabels(type);
    return;
  }
  formDiv.innerHTML = FORMS[type].html();
  updateOutputLabels(type);
  // Pflichtfelder markieren
  const required = REQUIRED[type] || [];
  required.forEach(id => {
    const input = document.getElementById(id);
    if (input) {
      input.classList.add('required-field');
      // Label eine Zeile darüber finden und required-Klasse geben
      const label = input.closest('.form-group')?.querySelector('.form-label');
      if (label) label.classList.add('required');
    }
  });
}

function generate() {
  const type = document.getElementById('sourceType').value;
  updateOutputLabels(type);
  if (type && FORMS[type]) FORMS[type].generate();
}

// ══════════════════════════════════════════════════════════════
//  Output Helpers
// ══════════════════════════════════════════════════════════════

function val(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : '';
}

function getAuthors(listId = 'authorsList') {
  const blocks = document.querySelectorAll(`#${listId} .author-block`);
  const out = [];
  blocks.forEach(b => {
    const nn = b.querySelector('.nachname').value.trim();
    const vn = b.querySelector('.vorname').value.trim();
    if (nn) out.push({ nachname: nn, vorname: vn });
  });
  return out;
}

function authorsFullHtml(a) {
  if (!a.length) return '';
  const fmt = x => { const vn = esc(x.vorname); return `<span class="smallcaps">${esc(x.nachname.toUpperCase())}</span>${vn ? ' ' + vn : ''}`; };
  if (a.length >= 4) return `${fmt(a[0])} u.a.`;
  return a.map(fmt).join('/');
}
function authorsShortHtml(a) {
  if (!a.length) return '';
  if (a.length >= 4) return `<span class="smallcaps">${esc(a[0].nachname.toUpperCase())}</span> u.a.`;
  return a.map(x => `<span class="smallcaps">${esc(x.nachname.toUpperCase())}</span>`).join('/');
}
function authorsFullText(a) {
  if (!a.length) return '';
  const fmt = x => { const vn = x.vorname; return x.nachname.toUpperCase() + (vn ? ' ' + vn : ''); };
  if (a.length >= 4) return `${fmt(a[0])} u.a.`;
  return a.map(fmt).join('/');
}
function authorsShortText(a) {
  if (!a.length) return '';
  if (a.length >= 4) return `${a[0].nachname.toUpperCase()} u.a.`;
  return a.map(x => x.nachname.toUpperCase()).join('/');
}
function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function normalizeWhitespace(s) {
  return String(s || '').replace(/\s+/g, ' ').trim();
}

function stripTrailingPeriod(s) {
  return normalizeWhitespace(s).replace(/\.+$/, '');
}

function ensurePeriod(s) {
  const base = stripTrailingPeriod(s);
  return base ? `${base}.` : '';
}

function escapeRegExp(s) {
  return String(s || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function shouldShowEdition(aufl) {
  const num = parseInt(aufl, 10);
  return !!aufl && !isNaN(num) && num > 1;
}

function formatCommentaryCitation(data, variant = 'full') {
  const authorsFull = authorsFullText(data.authors || []);
  const authorsShort = authorsShortText(data.authors || []);
  const editors = (data.editors || []).map(x => `${x.nachname} ${x.vorname}`).join('/');
  const artRange = data.artBis ? `${data.artPrefix} ${data.artVon}–${data.artBis}` : `${data.artPrefix} ${data.artVon}`;
  const showAufl = shouldShowEdition(data.auflage);

  if (variant === 'short') {
    let out = `${authorsShort}, ${artRange} ${data.gesetz}`;
    if (data.randnote) out += ` N ${data.randnote}`;
    return ensurePeriod(out);
  }

  let out = '';
  // Guide S. 7–8: kein «Kommentar zu» Präfix; bei Hrsg. → «in:» (unselbständig); ohne Hrsg. → direkt Kommentarname (selbständig)
  if (data.editors && data.editors.length) {
    out = `${authorsFull}, in: ${editors} (Hrsg.), ${data.kommName}`;
  } else {
    out = `${authorsFull}, ${data.kommName}`;
  }
  if (data.teilband) out += `, ${data.teilband}`;
  if (showAufl) out += `, ${data.auflage}. Aufl.`;
  out += `, ${data.orte} ${data.jahr}`;
  if (variant === 'full' && data.randnote) out += `, ${artRange} ${data.gesetz} N ${data.randnote}`;
  return ensurePeriod(out);
}

function formatBGECitation(data, variant = 'full') {
  let out = `BGE ${data.band} ${data.teil} ${data.seite}`;
  if (variant === 'short') {
    if (data.erwaegung) out += ` E. ${data.erwaegung}`;
    else if (data.seiteKonk) out += `, ${data.seiteKonk}`;
    return ensurePeriod(out);
  }
  if (data.erwaegung) out += ` E. ${data.erwaegung}`;
  else out += ' ff.';
  return ensurePeriod(out);
}

function formatBGerCitation(data) {
  let out = `BGer ${normalizeBGerCaseNumber(data.geschaeft)}`;
  if (data.datum) out += ` vom ${data.datum}`;
  if (data.erwaegung) out += ` E. ${data.erwaegung}`;
  return ensurePeriod(out);
}

function formatBVGECitation(data) {
  let out = '';
  if (data.art === 'BVGE') {
    out = `BVGE ${data.geschaeft}`;
  } else {
    out = `BVGer ${data.geschaeft}`;
    if (data.datum) out += ` vom ${data.datum}`;
  }
  if (data.erwaegung) out += ` E. ${data.erwaegung}`;
  return ensurePeriod(out);
}

function formatMaterialCitation(data, variant = 'full') {
  const art = data.art || '';
  if (art.startsWith('Amtl. Bull.')) {
    let out = `${art} ${data.abJahr} ${data.abSpalte}`;
    if (data.abVotant) out += ` (${data.abVotant})`;
    return ensurePeriod(out);
  }

  if (variant === 'short') {
    let out = `${art} ${data.stichwort || data.titel}`;
    if (data.seite) out += `, S. ${data.seite}`;
    return ensurePeriod(out);
  }

  let out = `${art} ${data.titel} vom ${data.datum}`;
  if (data.bblJahr && data.bblSeite) out += `, BBl ${data.bblJahr} S. ${data.bblSeite} ff.`;
  else if (data.bblJahr) out += `, BBl ${data.bblJahr}`;
  if (data.stichwort) out += ` (zit. ${data.stichwort})`;
  return ensurePeriod(out);
}

function formatLawCitation(data, variant = 'full') {
  if (variant === 'short') {
    return ensurePeriod(data.art || data.abk);
  }
  let title = stripTrailingPeriod(data.titel);
  if (data.abk && !new RegExp(`\\b${escapeRegExp(data.abk)}\\b`).test(title)) {
    title += ` (${data.abk})`;
  }
  return ensurePeriod(`${title}, ${data.sr}`);
}

function parseBGECitation(text) {
  const clean = stripTrailingPeriod(text);
  const m = clean.match(/^BGE\s+(\d+)\s+(I{1,3}|IV|VI{0,3}|V)\s+(\d+)(?:\s+E\.\s*([\dA-Za-z.]+)|,\s*(\d+)|\s+ff\.)?$/i);
  if (!m) return null;
  return {
    band: m[1],
    teil: m[2].toUpperCase(),
    seite: m[3],
    erwaegung: m[4] || '',
    seiteKonk: m[5] || '',
  };
}

function parseBGerCitation(text) {
  const clean = stripTrailingPeriod(text);
  const m = clean.match(/^BGer\s+(\d+[A-Z]+[._]\d+\/\d{4})(?:\s+vom\s+(\d{1,2}\.\d{1,2}\.\d{4}))?(?:\s+E\.\s*([\dA-Za-z.]+))?$/i);
  if (!m) return null;
  return {
    geschaeft: normalizeBGerCaseNumber(m[1]),
    datum: m[2] || '',
    erwaegung: m[3] || '',
  };
}

function parseBVGECitation(text) {
  const clean = stripTrailingPeriod(text);
  const bvge = clean.match(/^BVGE\s+(\d+(?:\/\d+)?)(?:\s+E\.\s*([\dA-Za-z.]+))?$/i);
  if (bvge) {
    return { art: 'BVGE', geschaeft: bvge[1], datum: '', erwaegung: bvge[2] || '' };
  }
  const bvger = clean.match(/^BVGer\s+([A-Z]-\d+\/\d{4})(?:\s+vom\s+(\d{1,2}\.\d{1,2}\.\d{4}))?(?:\s+E\.\s*([\dA-Za-z.]+))?$/i);
  if (bvger) {
    return { art: 'BVGer', geschaeft: bvger[1], datum: bvger[2] || '', erwaegung: bvger[3] || '' };
  }
  return null;
}

function parseMaterialCitation(text) {
  const clean = stripTrailingPeriod(text);
  const ab = clean.match(/^Amtl\.\s*Bull\.\s*(NR|SR)\s+(\d{4})\s+(\d+)(?:\s*\(([^)]+)\))?$/i);
  if (ab) {
    return {
      art: `Amtl. Bull. ${ab[1].toUpperCase()}`,
      abJahr: ab[2],
      abSpalte: ab[3],
      abVotant: ab[4] || '',
    };
  }
  const m = clean.match(/^(Botschaft|Bericht|Vernehmlassung)\s+(.+?)\s+vom\s+([^,]+)(?:,\s*BBl\s+(\d{4})(?:\s+S\.\s*(\d+)\s*ff\.)?)?(?:\s*\(zit\.\s*([^)]+)\))?$/i);
  if (!m) return null;
  return {
    art: m[1],
    titel: normalizeWhitespace(m[2]),
    datum: normalizeWhitespace(m[3]),
    bblJahr: m[4] || '',
    bblSeite: m[5] || '',
    stichwort: m[6] || '',
    seite: '',
  };
}

function parseLawCitation(text) {
  const clean = stripTrailingPeriod(text);
  const short = clean.match(/^(Art\.\s*\d+[a-z]?(?:\s*Abs\.\s*\d+[a-z]?)?(?:\s*lit\.\s*[a-z])?\s+[A-Z]{2,})$/i);
  if (short) return { art: short[1], mode: 'short' };
  const full = clean.match(/^(.+),\s*((?:SR|LS|SAR|BSG)\s*[\d.]+)$/i);
  if (!full) return null;
  const title = normalizeWhitespace(full[1]);
  const abkMatch = title.match(/\((?:[^()]*,\s*)?([A-Z]{2,})\)$/);
  return {
    titel: title,
    sr: normalizeWhitespace(full[2]),
    abk: abkMatch ? abkMatch[1] : '',
    mode: 'full',
  };
}

function showOutput(fullHtml, fullText, kurzHtml, kurzText) {
  updateOutputLabels(document.getElementById('sourceType').value);
  const vollOutput = document.getElementById('vollOutput');
  const kurzOutput = document.getElementById('kurzOutput');
  const vollPlain = document.getElementById('vollPlain');
  const kurzPlain = document.getElementById('kurzPlain');
  vollOutput.innerHTML = fullHtml;
  kurzOutput.innerHTML = kurzHtml;
  vollPlain.textContent = fullText;
  kurzPlain.textContent = kurzText;
  delete vollPlain.dataset.directoryEntry;
  delete vollOutput.dataset.directoryHtml;
  const sec = document.getElementById('outputSection');
  sec.classList.add('visible');
  sec.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  // Zitat im Tracker registrieren (nur wenn noch nicht gezählt)
  const type = document.getElementById('sourceType').value;
  if (type) trackCitation(type, fullText);
}

function updateOutputLabels(type) {
  const vollLabel = document.getElementById('vollLabel');
  const kurzLabel = document.getElementById('kurzLabel');
  if (!vollLabel || !kurzLabel) return;

  if (isJudikatur(type)) {
    vollLabel.textContent = '⚖️ Entscheidzitat — Judikaturverzeichniseintrag';
    kurzLabel.textContent = '🔖 Kurzangabe — Fussnote';
    return;
  }
  if (isMaterial(type)) {
    vollLabel.textContent = '🧾 Vollzitat — Materialienverzeichniseintrag';
    kurzLabel.textContent = '🔖 Kurzangabe — Fussnote';
    return;
  }
  if (type === 'gesetz') {
    vollLabel.textContent = '📘 Verzeichniseintrag — Abkürzungsverzeichnis';
    kurzLabel.textContent = '🔖 Kurzangabe — Fussnote';
    return;
  }
  vollLabel.textContent = '📖 Vollzitat — Literaturverzeichniseintrag';
  kurzLabel.textContent = '🔖 Kurzangabe — Fussnote';
}

function copyText(spanId, btn) {
  const text = document.getElementById(spanId).textContent;
  navigator.clipboard.writeText(text).then(() => {
    btn.textContent = '✓ Kopiert!';
    btn.classList.add('copied');
    setTimeout(() => { btn.textContent = '📋 Kopieren'; btn.classList.remove('copied'); }, 2000);
  });
}

// ══════════════════════════════════════════════════════════════
//  Author Block HTML
// ══════════════════════════════════════════════════════════════

function matArtChanged() {
  const art = (document.getElementById('mat_art') || {}).value || '';
  const isAB = art.startsWith('Amtl. Bull.');
  const def = document.getElementById('matFieldsDefault');
  const ab  = document.getElementById('matFieldsAB');
  if (def) def.style.display = isAB ? 'none' : '';
  if (ab)  ab.style.display  = isAB ? '' : 'none';
}

function addAuthor(listId = 'authorsList', l1 = 'Nachname', l2 = 'Vorname') {
  const list = document.getElementById(listId);
  if (!list) return;
  const d = document.createElement('div');
  d.className = 'author-block';
  d.innerHTML = `<div class="author-inner">
    <div class="fields">
      <div class="form-group"><div class="form-label">${l1}</div><input type="text" class="nachname" placeholder=""></div>
      <div class="form-group"><div class="form-label">${l2}</div><input type="text" class="vorname" placeholder=""></div>
    </div>
    <button class="btn-remove-author" onclick="this.closest('.author-block').remove()" title="Entfernen">×</button>
  </div>`;
  list.appendChild(d);
}

function authorBlockHtml(l1='Nachname', l2='Vorname', ph1='', ph2='') {
  return `<div class="author-block"><div class="author-inner">
    <div class="fields">
      <div class="form-group"><div class="form-label">${l1}</div><input type="text" class="nachname" placeholder="${ph1}"></div>
      <div class="form-group"><div class="form-label">${l2}</div><input type="text" class="vorname" placeholder="${ph2}"></div>
    </div>
    <div style="width:30px;flex-shrink:0"></div>
  </div></div>`;
}

// ══════════════════════════════════════════════════════════════
//  Form Definitions
// ══════════════════════════════════════════════════════════════
const FORMS = {

  // ── Dissertation / Habilitation ────────────────────────────────
  // ZitierGuide S. 5–6: NACHNAME VORNAME, Titel[, Untertitel], Diss./Habil. Uni-Ort, Erscheinungsort Jahr.
  // Schriftenreihe wird NICHT angegeben (ZitierGuide S. 6).
  dissertation: {
    html: () => `
      <div class="authors-section">
        <div class="form-label">Autor(in)</div>
        <div id="authorsList">${authorBlockHtml('Nachname','Vorname','z.B. Wellerdieck','z.B. Max')}</div>
        <button class="btn-add" onclick="addAuthor()">+ Weiteren Autor</button>
      </div>
      <div class="section-divider"></div>
      <div class="form-group"><div class="form-label">Titel</div>
        <input type="text" id="titel" placeholder="z.B. Die Selbsthilfe zum Schutz des privaten Parkplatzes"></div>
      <div class="form-group"><div class="form-label">Untertitel <span class="optional">(optional)</span></div>
        <input type="text" id="untertitel" placeholder="z.B. Eine rechtsvergleichende und -ökonomische Sichtweise…"></div>
      <div class="section-divider"></div>
      <div class="row">
        <div class="form-group"><div class="form-label">Art</div>
          <select id="diss_art" style="padding:8px 10px;border-radius:8px;border:1.5px solid var(--border);background:var(--bg);color:var(--text);font-size:0.95em;width:100%">
            <option value="Diss.">Diss. (Dissertation)</option>
            <option value="Habil.">Habil. (Habilitation)</option>
            <option value="Masterarbeit">Masterarbeit</option>
            <option value="Bachelorarbeit">Bachelorarbeit</option>
          </select></div>
        <div class="form-group"><div class="form-label">Universitätsort</div>
          <input type="text" id="uni_ort" placeholder="z.B. St. Gallen"></div>
      </div>
      <div class="form-info" style="font-size:0.8em;color:var(--muted);margin:-8px 0 10px;padding:8px 12px;background:var(--bg);border-radius:8px;border-left:3px solid var(--primary)">
        ℹ️ Die Schriftenreihe (z.B. SGRW, ZStP) wird gemäss ZitierGuide S. 6 <strong>nicht</strong> angegeben.
      </div>
      <div class="row">
        <div class="form-group"><div class="form-label">Erscheinungsort(e)</div>
          <input type="text" id="orte" placeholder="z.B. Zürich/St. Gallen"></div>
        <div class="form-group"><div class="form-label">Erscheinungsjahr</div>
          <input type="text" id="jahr" placeholder="z.B. 2024"></div>
      </div>
      <div class="section-divider"></div>
      <div class="section-title">Für Fussnote</div>
      <div class="row">
        <div class="form-group"><div class="form-label">Stichwort <span class="optional">(nur bei mehreren Werken desselben Autors)</span></div>
          <input type="text" id="stichwort" placeholder="z.B. Parkplatz"></div>
        <div class="form-group"><div class="form-label">Seite / Randnote</div>
          <input type="text" id="seite" placeholder="z.B. 45 oder N 12"></div>
      </div>
      <button class="btn-generate" onclick="generate()">Zitat generieren</button>
      <p class="required-legend"><span>*</span> Pflichtfeld</p>`,
    generate: () => {
      const a        = getAuthors();
      const titel    = val('titel');
      const ut       = val('untertitel');
      const dissArt  = val('diss_art') || 'Diss.';
      const uniOrt   = val('uni_ort');
      const orte     = val('orte');
      const jahr     = val('jahr');
      const sw       = val('stichwort');
      const seite    = val('seite');
      if (!a.length || !titel || !uniOrt || !orte || !jahr) {
        alert('Bitte Autor, Titel, Universitätsort, Erscheinungsort und Jahr ausfüllen.'); return;
      }
      // Vollzitat: NACHNAME VORNAME, Titel[, Untertitel], Diss./Habil. Uni-Ort, Orte Jahr.
      let fH = authorsFullHtml(a) + `, ${esc(titel)}`;
      if (ut)  fH += `, ${esc(ut)}`;
      fH += `, ${esc(dissArt)} ${esc(uniOrt)}, ${esc(orte)} ${esc(jahr)}${sw?' (zit. '+authorsShortText(a)+', '+esc(sw)+')':''}.`;
      let fT = authorsFullText(a) + `, ${titel}`;
      if (ut)  fT += `, ${ut}`;
      fT += `, ${dissArt} ${uniOrt}, ${orte} ${jahr}${sw?` (zit. ${authorsShortText(a)}, ${sw})`:''}.`;
      // Kurzzitat: NACHNAME[, Stichwort], S. X.
      let kH = authorsShortHtml(a);
      if (sw) kH += `, ${esc(sw)}`;
      kH += seite ? (seite.startsWith('N') ? `, ${esc(seite)}.` : `, S. ${esc(seite)}.`) : '.';
      let kT = authorsShortText(a);
      if (sw) kT += `, ${sw}`;
      kT += seite ? (seite.startsWith('N') ? `, ${seite}.` : `, S. ${seite}.`) : '.';
      showOutput(fH, fT, kH, kT);
    }
  },

  // ── Monographie ────────────────────────────────────────────────
  monographie: {
    html: () => `
      <div class="authors-section">
        <div class="form-label">Autor(en)</div>
        <div id="authorsList">${authorBlockHtml('Nachname','Vorname','z.B. Koller','z.B. Alfred')}</div>
        <button class="btn-add" onclick="addAuthor()">+ Weiteren Autor</button>
      </div>
      <div class="section-divider"></div>
      <div class="form-group"><div class="form-label">Titel</div>
        <input type="text" id="titel" placeholder="z.B. Schweizerisches Obligationenrecht, Allgemeiner Teil"></div>
      <div class="form-group"><div class="form-label">Untertitel <span class="optional">(optional)</span></div>
        <input type="text" id="untertitel" placeholder=""></div>
      <div class="row">
        <div class="form-group"><div class="form-label">Band <span class="optional">(opt.)</span></div>
          <input type="text" id="band" placeholder="z.B. Bd. I"></div>
        <div class="form-group"><div class="form-label">Auflage <span class="optional">(1. Aufl. = leer)</span></div>
          <input type="text" id="auflage" placeholder="z.B. 4"></div>
      </div>
      <div class="row">
        <div class="form-group"><div class="form-label">Erscheinungsort(e)</div>
          <input type="text" id="orte" placeholder="z.B. Bern oder Basel/Frankfurt a.M."></div>
        <div class="form-group"><div class="form-label">Erscheinungsjahr</div>
          <input type="text" id="jahr" placeholder="z.B. 2017"></div>
      </div>
      <div class="section-divider"></div>
      <div class="section-title">Für Fussnote</div>
      <div class="row">
        <div class="form-group"><div class="form-label">Stichwort <span class="optional">(nur bei mehreren Werken desselben Autors)</span></div>
          <input type="text" id="stichwort" placeholder="z.B. OR AT"></div>
        <div class="form-group"><div class="form-label">Seite / Randnote</div>
          <input type="text" id="seite" placeholder="z.B. 124 oder N 12"></div>
      </div>
      <button class="btn-generate" onclick="generate()">Zitat generieren</button>
      <p class="required-legend"><span>*</span> Pflichtfeld</p>`,
    generate: () => {
      const a = getAuthors(); const titel=val('titel'); const ut=val('untertitel');
      const bd=val('band'); const aufl=val('auflage'); const orte=val('orte');
      const jahr=val('jahr'); const sw=val('stichwort'); const seite=val('seite');
      if (!a.length||!titel||!orte||!jahr) { alert('Bitte Autor, Titel, Ort und Jahr ausfüllen.'); return; }
      // Guide S. 6: Erste Auflage wird nicht angegeben
      const auflN = parseInt(aufl);
      const showAufl = aufl && !isNaN(auflN) && auflN > 1;
      let fH=authorsFullHtml(a)+`, ${esc(titel)}`;
      // Guide S. 6: Band mit «Bd.»-Präfix wenn nicht bereits enthalten
      const bdFormatted = bd ? (bd.startsWith('Bd.') ? bd : `Bd. ${bd}`) : '';
      if (ut) fH+=`, ${esc(ut)}`; if (bdFormatted) fH+=`, ${esc(bdFormatted)}`; if (showAufl) fH+=`, ${esc(aufl)}. Aufl.`;
      fH+=`, ${esc(orte)} ${esc(jahr)}${sw?` (zit. ${authorsShortText(a)}, ${esc(sw)})`:''}.`;
      let fT=authorsFullText(a)+`, ${titel}`;
      if (ut) fT+=`, ${ut}`; if (bdFormatted) fT+=`, ${bdFormatted}`; if (showAufl) fT+=`, ${aufl}. Aufl.`;
      fT+=`, ${orte} ${jahr}${sw?` (zit. ${authorsShortText(a)}, ${sw})`:''}.`;
      let kH=authorsShortHtml(a); if(sw) kH+=`, ${esc(sw)}`;
      kH+= seite ? (seite.startsWith('N') ? `, ${esc(seite)}.` : `, S. ${esc(seite)}.`) : '.';
      let kT=authorsShortText(a); if(sw) kT+=`, ${sw}`;
      kT+= seite ? (seite.startsWith('N') ? `, ${seite}.` : `, S. ${seite}.`) : '.';
      showOutput(fH,fT,kH,kT);
    }
  },

  // ── Zeitschrift ────────────────────────────────────────────────
  zeitschrift: {
    html: () => `
      <div class="authors-section">
        <div class="form-label">Autor(en)</div>
        <div id="authorsList">${authorBlockHtml('Nachname','Vorname','z.B. Portmann','z.B. Wolfgang')}</div>
        <button class="btn-add" onclick="addAuthor()">+ Weiteren Autor</button>
      </div>
      <div class="section-divider"></div>
      <div class="form-group"><div class="form-label">Titel des Aufsatzes</div>
        <input type="text" id="titel" placeholder="z.B. Die Abgrenzung zwischen Leistungslohn und Gratifikation"></div>
      <div class="row">
        <div class="form-group"><div class="form-label">Zeitschrift (Abk.)</div>
          <input type="text" id="zeitschrift" placeholder="z.B. AJP, SJZ, ZBl, ARV"></div>
        <div class="form-group"><div class="form-label">Jahr</div>
          <input type="text" id="jahr" placeholder="z.B. 2015"></div>
      </div>
      <div class="row">
        <div class="form-group"><div class="form-label">Anfangsseite des Aufsatzes</div>
          <input type="text" id="seite_start" placeholder="z.B. 93"></div>
        <div class="form-group"><div class="form-label">Stichwort <span class="optional">(nur bei Mehrfachzitierung)</span></div>
          <input type="text" id="stichwort" placeholder=""></div>
      </div>
      <div class="section-divider"></div>
      <div class="section-title">Für Fussnote</div>
      <div class="form-group"><div class="form-label">Konkrete Seite</div>
        <input type="text" id="seite_konk" placeholder="z.B. 97"></div>
      <button class="btn-generate" onclick="generate()">Zitat generieren</button>
      <p class="required-legend"><span>*</span> Pflichtfeld</p>`,
    generate: () => {
      const a=getAuthors(); const t=val('titel'); const z=val('zeitschrift');
      const j=val('jahr'); const ss=val('seite_start'); const sk=val('seite_konk'); const sw=val('stichwort');
      if (!a.length||!t||!z||!j||!ss) { alert('Bitte alle Pflichtfelder ausfüllen.'); return; }
      // Guide S. 5: (zit. Stichwort) ans Ende des Verzeichniseintrags; Punkt nach «)»
      const zitSufH = sw ? ` (zit. ${authorsShortText(a)}, ${esc(sw)}).` : '';
      const zitSufT = sw ? ` (zit. ${authorsShortText(a)}, ${sw}).` : '';
      const fH=`${authorsFullHtml(a)}, ${esc(t)}, ${esc(z)} ${esc(j)} S. ${esc(ss)} ff.${zitSufH}`;
      const fT=`${authorsFullText(a)}, ${t}, ${z} ${j} S. ${ss} ff.${zitSufT}`;
      let kH=`${authorsShortHtml(a)}`; if(sw) kH+=`, ${esc(sw)}`; kH+=`, S. ${esc(sk||ss)}.`;
      let kT=`${authorsShortText(a)}`; if(sw) kT+=`, ${sw}`; kT+=`, S. ${sk||ss}.`;
      showOutput(fH,fT,kH,kT);
    }
  },

  // ── Sammelband ─────────────────────────────────────────────────
  sammelband: {
    html: () => `
      <div class="authors-section">
        <div class="form-label">Autor(en) des Beitrags</div>
        <div id="authorsList">${authorBlockHtml('Nachname','Vorname','z.B. Hunger','z.B. Patrick')}</div>
        <button class="btn-add" onclick="addAuthor()">+ Weiteren Autor</button>
      </div>
      <div class="section-divider"></div>
      <div class="form-group"><div class="form-label">Titel des Beitrags</div>
        <input type="text" id="titel" placeholder="z.B. Erlöschen von Obligationen (§ 6)"></div>
      <div class="section-divider"></div>
      <div class="section-title">Herausgeber</div>
      <div id="hrsgList">${authorBlockHtml('Nachname (Hrsg.)','Vorname (Hrsg.)','z.B. Böhringer','z.B. Peter')}</div>
      <button class="btn-add" onclick="addAuthor('hrsgList','Nachname (Hrsg.)','Vorname (Hrsg.)')">+ Weiteren Herausgeber</button>
      <div class="section-divider"></div>
      <div class="form-group"><div class="form-label">Titel des Sammelbandes</div>
        <input type="text" id="sb_titel" placeholder="z.B. Prinzipien des Vertragsrechts"></div>
      <div class="row">
        <div class="form-group"><div class="form-label">Auflage <span class="optional">(opt.)</span></div>
          <input type="text" id="auflage" placeholder="z.B. 4"></div>
        <div class="form-group"><div class="form-label">Erscheinungsort</div>
          <input type="text" id="orte" placeholder="z.B. Zürich"></div>
        <div class="form-group"><div class="form-label">Jahr</div>
          <input type="text" id="jahr" placeholder="z.B. 2020"></div>
      </div>
      <div class="row">
        <div class="form-group"><div class="form-label">Anfangsseite des Beitrags</div>
          <input type="text" id="seite_start" placeholder="z.B. 97"></div>
        <div class="form-group"><div class="form-label">Stichwort <span class="optional">(opt.)</span></div>
          <input type="text" id="stichwort" placeholder=""></div>
      </div>
      <div class="section-divider"></div>
      <div class="section-title">Für Fussnote</div>
      <div class="form-group"><div class="form-label">Konkrete Seite</div>
        <input type="text" id="seite_konk" placeholder="z.B. 100"></div>
      <button class="btn-generate" onclick="generate()">Zitat generieren</button>
      <p class="required-legend"><span>*</span> Pflichtfeld</p>`,
    generate: () => {
      const a=getAuthors('authorsList'); const t=val('titel');
      const h=getAuthors('hrsgList'); const sbt=val('sb_titel');
      const aufl=val('auflage'); const orte=val('orte'); const j=val('jahr');
      const ss=val('seite_start'); const sk=val('seite_konk'); const sw=val('stichwort');
      if (!a.length||!t||!h.length||!sbt||!orte||!j||!ss) { alert('Bitte alle Pflichtfelder ausfüllen.'); return; }
      // Guide S. 6: Erste Auflage wird nicht angegeben
      const auflN=parseInt(aufl); const showAufl=aufl&&!isNaN(auflN)&&auflN>1;
      // Guide S. 7: Herausgeber werden NICHT in Kapitälchen gesetzt
      const hrsgH=h.map(x=>`${esc(x.nachname)} ${esc(x.vorname)}`).join('/');
      const hrsgT=h.map(x=>`${x.nachname} ${x.vorname}`).join('/');
      const zitSufH=sw?` (zit. ${authorsShortText(a)}, ${esc(sw)}).`:'';
      const zitSufT=sw?` (zit. ${authorsShortText(a)}, ${sw}).`:'';
      let fH=`${authorsFullHtml(a)}, ${esc(t)}, in: ${hrsgH} (Hrsg.), ${esc(sbt)}`;
      if(showAufl) fH+=`, ${esc(aufl)}. Aufl.`; fH+=`, ${esc(orte)} ${esc(j)}, S. ${esc(ss)} ff.${zitSufH}`;
      let fT=`${authorsFullText(a)}, ${t}, in: ${hrsgT} (Hrsg.), ${sbt}`;
      if(showAufl) fT+=`, ${aufl}. Aufl.`; fT+=`, ${orte} ${j}, S. ${ss} ff.${zitSufT}`;
      let kH=`${authorsShortHtml(a)}`; if(sw) kH+=`, ${esc(sw)}`; kH+=`, S. ${esc(sk||ss)}.`;
      let kT=`${authorsShortText(a)}`; if(sw) kT+=`, ${sw}`; kT+=`, S. ${sk||ss}.`;
      showOutput(fH,fT,kH,kT);
    }
  },

  // ── Kommentar ──────────────────────────────────────────────────
  kommentar: {
    html: () => `
      ${renderCommentaryAutofillHint()}
      <div class="authors-section">
        <div class="form-label">Autor/Autorin des Kommentarteils</div>
        <div id="authorsList">${authorBlockHtml('Nachname','Vorname','z.B. Portmann','z.B. Wolfgang')}</div>
        <button class="btn-add" onclick="addAuthor()">+ Weiteren Autor</button>
      </div>
      <div class="section-divider"></div>
      <div class="row">
        <div class="form-group"><div class="form-label">Art./§</div>
          <select id="art_prefix" style="padding:8px 10px;border-radius:8px;border:1.5px solid var(--border);background:var(--bg);color:var(--text);font-size:0.95em;width:100%">
            <option value="Art.">Art.</option>
            <option value="§">§</option>
          </select></div>
        <div class="form-group"><div class="form-label">Nummer von</div>
          <input type="text" id="art_von" placeholder="z.B. 322d"></div>
        <div class="form-group"><div class="form-label">bis <span class="optional">(opt.)</span></div>
          <input type="text" id="art_bis" placeholder="z.B. 322e"></div>
        <div class="form-group"><div class="form-label">Gesetz (Abk.)</div>
          <input type="text" id="gesetz" placeholder="z.B. OR"></div>
      </div>
      <div class="section-divider"></div>
      <div class="section-title">Kommentarwerk</div>
      <div class="form-label" style="margin-bottom:8px">Herausgeber <span class="optional">(leer lassen wenn kein separater Hrsg.)</span></div>
      <div id="hrsgList">${authorBlockHtml('Nachname (Hrsg.)','Vorname (Hrsg.)','z.B. Widmer Lüchinger','z.B. Corinne')}</div>
      <button class="btn-add" onclick="addAuthor('hrsgList','Nachname (Hrsg.)','Vorname (Hrsg.)')">+ Weiteren Hrsg.</button>
      <div class="form-group" style="margin-top:14px"><div class="form-label">Bezeichnung des Kommentars</div>
        <input type="text" id="komm_name" placeholder="z.B. Basler Kommentar"></div>
      <div class="form-group"><div class="form-label">Teilband <span class="optional">(opt., z.B. «Obligationenrecht I, Art. 1–529 OR»)</span></div>
        <input type="text" id="teilband" placeholder="z.B. Obligationenrecht I, Art. 1–529 OR"></div>
      <div class="row">
        <div class="form-group"><div class="form-label">Auflage <span class="optional">(1. Aufl. = leer)</span></div>
          <input type="text" id="auflage" placeholder="z.B. 7"></div>
        <div class="form-group"><div class="form-label">Erscheinungsort</div>
          <input type="text" id="orte" placeholder="z.B. Basel"></div>
        <div class="form-group"><div class="form-label">Jahr</div>
          <input type="text" id="jahr" placeholder="z.B. 2019"></div>
      </div>
      <div class="section-divider"></div>
      <div class="section-title">Für Fussnote</div>
      <div class="form-group"><div class="form-label">Randnote (N)</div>
        <input type="text" id="randnote" placeholder="z.B. 12"></div>
      <button class="btn-generate" onclick="generate()">Zitat generieren</button>
      <p class="required-legend"><span>*</span> Pflichtfeld</p>`,
    generate: () => {
      const a=getAuthors('authorsList'); const av=val('art_von'); const ab=val('art_bis');
      const apfx=val('art_prefix')||'Art.';
      const g=val('gesetz'); const h=getAuthors('hrsgList'); const kn=val('komm_name');
      const tb=val('teilband'); const aufl=val('auflage'); const orte=val('orte');
      const j=val('jahr'); const rn=val('randnote');
      if (!a.length||!av||!g||!kn||!orte||!j) { alert('Bitte alle Pflichtfelder ausfüllen.'); return; }
      const data = {
        authors: a,
        artPrefix: apfx,
        artVon: av,
        artBis: ab,
        gesetz: g,
        editors: h,
        kommName: kn,
        teilband: tb,
        auflage: aufl,
        orte,
        jahr: j,
        randnote: rn,
      };
      const vT = formatCommentaryCitation(data, 'verz');
      const kT = formatCommentaryCitation(data, 'short');
      showOutput(esc(vT), vT, esc(kT), kT);
      document.getElementById('vollPlain').dataset.directoryEntry = vT;
      document.getElementById('vollOutput').dataset.directoryHtml = esc(vT);
    }
  },

  // ── BGE ────────────────────────────────────────────────────────
  bge: {
    html: () => `
      ${renderJudikaturAutofillHint('bge')}
      <p style="font-size:0.85em;color:var(--muted);margin-bottom:18px;background:#f0ede5;padding:10px 14px;border-radius:7px;">
        Publizierte BGE: Band arabisch, Teil römisch. Keine «S.» vor der Seitenzahl.
      </p>
      <div class="row">
        <div class="form-group"><div class="form-label">Band (arabisch)</div>
          <input type="text" id="band" placeholder="z.B. 129"></div>
        <div class="form-group"><div class="form-label">Teil (römisch)</div>
          <input type="text" id="teil" placeholder="z.B. III"></div>
        <div class="form-group"><div class="form-label">Anfangsseite</div>
          <input type="text" id="seite" placeholder="z.B. 276"></div>
      </div>
      <div class="row">
        <div class="form-group"><div class="form-label">Erwägung (E.) <span class="optional">(opt.)</span></div>
          <input type="text" id="erwaegung" placeholder="z.B. 3a oder 2.1"></div>
        <div class="form-group"><div class="form-label">Weitere Seite für Fussnote <span class="optional">(opt.)</span></div>
          <input type="text" id="seite_konk" placeholder="z.B. 280"></div>
      </div>
      <button class="btn-generate" onclick="generate()">Zitat generieren</button>
      <p class="required-legend"><span>*</span> Pflichtfeld</p>`,
    generate: () => {
      const bd=val('band'); const tl=val('teil'); const s=val('seite');
      const e=val('erwaegung'); const sk=val('seite_konk');
      if (!bd||!tl||!s) { alert('Bitte Band, Teil und Anfangsseite ausfüllen.'); return; }
      const data = { band: bd, teil: tl.toUpperCase(), seite: s, erwaegung: e, seiteKonk: sk };
      const fT = formatBGECitation(data, 'full');
      const kT = formatBGECitation(data, 'short');
      const fH = esc(fT);
      const kH = esc(kT);
      showOutput(fH,fT,kH,kT);
    }
  },

  // ── BGer ───────────────────────────────────────────────────────
  bger: {
    html: () => `
      ${renderJudikaturAutofillHint('bger')}
      <p style="font-size:0.85em;color:var(--muted);margin-bottom:18px;background:#f0ede5;padding:10px 14px;border-radius:7px;">
        Nicht amtlich publizierte Entscheide: Geschäftsnummer + Datum + Erwägung. «BGer» statt «BGE».
      </p>
      <div class="form-group"><div class="form-label">Geschäftsnummer</div>
        <input type="text" id="geschaeft" placeholder="z.B. 9C_355/2023"></div>
      <div class="row">
        <div class="form-group"><div class="form-label">Datum des Entscheids</div>
          <input type="text" id="datum" placeholder="z.B. 15.03.2021"></div>
        <div class="form-group"><div class="form-label">Erwägung (E.)</div>
          <input type="text" id="erwaegung" placeholder="z.B. 3.2"></div>
      </div>
      <button class="btn-generate" onclick="generate()">Zitat generieren</button>
      <p class="required-legend"><span>*</span> Pflichtfeld</p>`,
    generate: () => {
      const g=val('geschaeft'); const d=val('datum'); const e=val('erwaegung');
      if (!g||!d) { alert('Bitte Geschäftsnummer und Datum ausfüllen.'); return; }
      const c = formatBGerCitation({ geschaeft: g, datum: d, erwaegung: e });
      showOutput(esc(c),c,esc(c),c);
    }
  },

  // ── BVGE / BVGer ───────────────────────────────────────────────
  bvge: {
    html: () => `
      <p style="font-size:0.85em;color:var(--muted);margin-bottom:18px;background:#f0ede5;padding:10px 14px;border-radius:7px;">
        Amtlich publiziert (BVGE): Jahrgang + Fallnummer. Nicht publiziert (BVGer): Geschäftsnummer + Datum.
      </p>
      <div class="row">
        <div class="form-group"><div class="form-label">Art</div>
          <select id="bvge_art" style="padding:8px 10px;border-radius:8px;border:1.5px solid var(--border);background:var(--bg);color:var(--text);font-size:0.95em;width:100%">
            <option value="BVGE">BVGE (amtlich publiziert)</option>
            <option value="BVGer">BVGer (nicht amtlich publiziert)</option>
          </select></div>
      </div>
      <div class="row">
        <div class="form-group"><div class="form-label">Geschäftsnummer</div>
          <input type="text" id="geschaeft" placeholder="z.B. A-1234/2020 oder 2020 I 1"></div>
        <div class="form-group"><div class="form-label">Datum des Entscheids</div>
          <input type="text" id="datum" placeholder="z.B. 15.03.2021"></div>
        <div class="form-group"><div class="form-label">Erwägung (E.) <span class="optional">(opt.)</span></div>
          <input type="text" id="erwaegung" placeholder="z.B. 3.2"></div>
      </div>
      <button class="btn-generate" onclick="generate()">Zitat generieren</button>
      <p class="required-legend"><span>*</span> Pflichtfeld</p>`,
    generate: () => {
      const art=val('bvge_art')||'BVGer'; const g=val('geschaeft');
      const d=val('datum'); const e=val('erwaegung');
      if (!g) { alert('Bitte Geschäftsnummer bzw. BVGE-Referenz ausfüllen.'); return; }
      if (art === 'BVGer' && !d) { alert('Bitte für BVGer zusätzlich das Datum ausfüllen.'); return; }
      const c = formatBVGECitation({ art, geschaeft: g, datum: d, erwaegung: e });
      showOutput(esc(c),c,esc(c),c);
    }
  },

  // ── Kantonal ───────────────────────────────────────────────────
  kantonal: {
    html: () => `
      <p style="font-size:0.85em;color:var(--muted);margin-bottom:18px;background:#f0ede5;padding:10px 14px;border-radius:7px;">
        Gericht mit Kantonskürzel (z.B. BezGer ZH, OGer ZH, AppGer BS, KGer GR, AGer-Z).
      </p>
      <div class="row">
        <div class="form-group"><div class="form-label">Gericht</div>
          <input type="text" id="gericht" placeholder="z.B. BezGer ZH"></div>
        <div class="form-group"><div class="form-label">Datum</div>
          <input type="text" id="datum" placeholder="z.B. 27.09.2001"></div>
      </div>
      <div class="row">
        <div class="form-group"><div class="form-label">Zeitschrift (Abk.) <span class="optional">(falls publiziert)</span></div>
          <input type="text" id="zeitschrift" placeholder="z.B. ZR, SJZ, AGer-Z"></div>
        <div class="form-group"><div class="form-label">Jahr</div>
          <input type="text" id="jahr" placeholder="z.B. 2015"></div>
        <div class="form-group"><div class="form-label">Seite</div>
          <input type="text" id="seite" placeholder="z.B. 95"></div>
        <div class="form-group"><div class="form-label">Erwägung <span class="optional">(opt.)</span></div>
          <input type="text" id="erwaegung" placeholder="z.B. 5a"></div>
      </div>
      <button class="btn-generate" onclick="generate()">Zitat generieren</button>
      <p class="required-legend"><span>*</span> Pflichtfeld</p>`,
    generate: () => {
      const gr=val('gericht'); const d=val('datum'); const z=val('zeitschrift');
      const j=val('jahr'); const s=val('seite'); const e=val('erwaegung');
      if (!gr||!d) { alert('Bitte Gericht und Datum ausfüllen.'); return; }
      let c=`${gr}, Entscheid vom ${d}`;
      if(z&&j&&s) c+=`, ${z} ${j} S. ${s} ff.`; if(e) c+=` E. ${e}`; c+='.';
      showOutput(esc(c),c,esc(c),c);
    }
  },

  // ── Materialien ────────────────────────────────────────────────
  // ZitierGuide S. 19–20: Botschaften, Berichte, Parlamentsprotokolle → Materialienverzeichnis
  // Format: Botschaft [Titel] vom [Datum], BBl [Jahr] S. [Seite] ff. (zit. [Stichwort])
  materialien: {
    html: () => `
      <p style="font-size:0.85em;color:var(--muted);margin-bottom:18px;background:#f0ede5;padding:10px 14px;border-radius:7px;">
        Materialien (Botschaften, Berichte etc.) gehören ins <strong>Materialienverzeichnis</strong>, nicht ins Literaturverzeichnis (ZitierGuide S. 19–20).
      </p>
      <div class="form-group"><div class="form-label required">Art</div>
        <select id="mat_art" onchange="matArtChanged()" style="padding:8px 10px;border-radius:8px;border:1.5px solid var(--border);background:var(--bg);color:var(--text);font-size:0.95em;width:100%">
          <option value="Botschaft">Botschaft</option>
          <option value="Bericht">Bericht</option>
          <option value="Vernehmlassung">Vernehmlassung</option>
          <option value="Amtl. Bull. NR">Amtliches Bulletin NR</option>
          <option value="Amtl. Bull. SR">Amtliches Bulletin SR</option>
        </select>
      </div>
      <!-- Botschaft/Bericht/Vernehmlassung fields -->
      <div id="matFieldsDefault">
        <div class="form-group"><div class="form-label required">Titel</div>
          <input type="text" id="titel" placeholder="z.B. zur Volksinitiative «Gegen neue Kampfflugzeuge»"></div>
        <div class="row">
          <div class="form-group"><div class="form-label required">Datum (ausgeschrieben)</div>
            <input type="text" id="datum" placeholder="z.B. 26. August 2009"></div>
          <div class="form-group"><div class="form-label">BBl-Jahr <span class="optional">(opt.)</span></div>
            <input type="text" id="bbl_jahr" placeholder="z.B. 2009"></div>
          <div class="form-group"><div class="form-label">BBl-Seite <span class="optional">(opt.)</span></div>
            <input type="text" id="bbl_seite" placeholder="z.B. 5975"></div>
        </div>
        <div class="section-divider"></div>
        <div class="section-title">Für Fussnote</div>
        <div class="row">
          <div class="form-group"><div class="form-label required">Stichwort (Kurzzitat)</div>
            <input type="text" id="stichwort" placeholder="z.B. Kampfflugzeuge"></div>
          <div class="form-group"><div class="form-label">Konkrete Seite</div>
            <input type="text" id="seite" placeholder="z.B. 5980"></div>
        </div>
      </div>
      <!-- Amtliches Bulletin (AB) fields -->
      <div id="matFieldsAB" style="display:none">
        <p style="font-size:0.82em;color:var(--muted);background:#f0ede5;padding:10px 14px;border-radius:7px;margin-bottom:12px">
          Format: <strong>Amtl. Bull. NR 2009 1234 (Votant).</strong> — Amtliches Bulletin erscheint nicht im Materialienverzeichnis, sondern nur in der Fussnote.
        </p>
        <div class="row">
          <div class="form-group"><div class="form-label required">Jahr der Session</div>
            <input type="text" id="ab_jahr" placeholder="z.B. 2009"></div>
          <div class="form-group"><div class="form-label required">Spalte / Seite</div>
            <input type="text" id="ab_spalte" placeholder="z.B. 1234"></div>
        </div>
        <div class="form-group"><div class="form-label">Votant (Redner/Rednerin)</div>
          <input type="text" id="ab_votant" placeholder="z.B. Müller"></div>
      </div>
      <button class="btn-generate" onclick="generate()">Zitat generieren</button>
      <p class="required-legend"><span>*</span> Pflichtfeld</p>`,
    generate: () => {
      const art=val('mat_art');
      const isAB = art.startsWith('Amtl. Bull.');
      if (isAB) {
        const abJahr=val('ab_jahr'); const abSpalte=val('ab_spalte'); const abVotant=val('ab_votant');
        if (!abJahr||!abSpalte) { alert('Bitte Jahr und Spalte/Seite ausfüllen.'); return; }
        const fT = formatMaterialCitation({ art, abJahr, abSpalte, abVotant }, 'full');
        showOutput(esc(fT),fT,esc(fT),fT);
      } else {
        const titel=val('titel'); const datum=val('datum');
        const bblJ=val('bbl_jahr'); const bblS=val('bbl_seite');
        const sw=val('stichwort'); const seite=val('seite');
        if (!titel||!datum) { alert('Bitte Titel und Datum ausfüllen.'); return; }
        const data = { art, titel, datum, bblJahr: bblJ, bblSeite: bblS, stichwort: sw, seite };
        const fT = formatMaterialCitation(data, 'full');
        const kT = formatMaterialCitation(data, 'short');
        const fH=esc(fT);
        showOutput(fH,fT,esc(kT),kT);
      }
    }
  },

  // ── Gesetz ─────────────────────────────────────────────────────
  gesetz: {
    html: () => `
      <p style="font-size:0.85em;color:var(--muted);margin-bottom:18px;background:#f0ede5;padding:10px 14px;border-radius:7px;">
        Gesetze erscheinen im Abkürzungsverzeichnis (nicht im Literaturverzeichnis).
      </p>
      <div class="form-group"><div class="form-label">Vollständiger Titel des Erlasses</div>
        <input type="text" id="titel" placeholder="z.B. Bundesgesetz betreffend die Ergänzung des Schweizerischen Zivilgesetzbuches vom 30. März 1911 (Fünfter Teil: Obligationenrecht, OR)"></div>
      <div class="row">
        <div class="form-group"><div class="form-label">SR-Nummer</div>
          <input type="text" id="sr" placeholder="z.B. SR 220"></div>
        <div class="form-group"><div class="form-label">Abkürzung (Kurztitel)</div>
          <input type="text" id="abk" placeholder="z.B. OR"></div>
      </div>
      <div class="form-group"><div class="form-label">Artikel-Angabe für Fussnote</div>
        <input type="text" id="art" placeholder="z.B. Art. 322d Abs. 2 OR"></div>
      <button class="btn-generate" onclick="generate()">Zitat generieren</button>
      <p class="required-legend"><span>*</span> Pflichtfeld</p>`,
    generate: () => {
      const t=val('titel'); const sr=val('sr'); const abk=val('abk'); const art=val('art');
      if (!t||!sr||!abk) { alert('Bitte Titel, SR-Nummer und Abkürzung ausfüllen.'); return; }
      const data = { titel: t, sr, abk, art };
      const fT = formatLawCitation(data, 'full');
      const kT = formatLawCitation(data, 'short');
      showOutput(esc(fT), fT, esc(kT), kT);
    }
  },

  // ── Internet ───────────────────────────────────────────────────
  internet: {
    html: () => `
      <p style="font-size:0.85em;color:var(--muted);margin-bottom:18px;background:#f0ede5;padding:10px 14px;border-radius:7px;">
        Inhalte auf <strong>Swisslex</strong> oder <strong>Legalis</strong>, die auch als Druckausgabe existieren (Zeitschriften, BGE), werden als Zeitschrift resp. BGE zitiert — nicht als Internetquelle. Dieser Typ gilt nur für Webinhalte ohne Printpendant.
      </p>
      <div class="authors-section">
        <div class="form-label">Autor(en) <span class="optional">(falls vorhanden)</span></div>
        <div id="authorsList">${authorBlockHtml('Nachname','Vorname','','')}</div>
        <button class="btn-add" onclick="addAuthor()">+ Weiteren Autor</button>
      </div>
      <div class="section-divider"></div>
      <div class="form-group"><div class="form-label">Titel</div>
        <input type="text" id="titel" placeholder="z.B. Kommentar zum Arbeitsrecht, Art. 322d OR"></div>
      <div class="form-group"><div class="form-label">URL</div>
        <input type="text" id="url" placeholder="z.B. https://www.bger.ch/..."></div>
      <div class="row">
        <div class="form-group"><div class="form-label">Veröffentlichungsdatum <span class="optional">(opt.)</span></div>
          <input type="text" id="pub_datum" placeholder="z.B. 15.01.2024"></div>
        <div class="form-group"><div class="form-label">Datum des Abrufs</div>
          <input type="text" id="datum" placeholder="z.B. 01.03.2025"></div>
      </div>
      <div class="section-divider"></div>
      <div class="section-title">Für Fussnote</div>
      <div class="row">
        <div class="form-group"><div class="form-label">Stichwort <span class="optional">(opt., bei Mehrfachzitierung)</span></div>
          <input type="text" id="stichwort" placeholder="z.B. Müller, Arbeitsrecht online"></div>
        <div class="form-group"><div class="form-label">Seite / Randnote <span class="optional">(opt.)</span></div>
          <input type="text" id="seite" placeholder="z.B. 3 oder N 12"></div>
      </div>
      <button class="btn-generate" onclick="generate()">Zitat generieren</button>
      <p class="required-legend"><span>*</span> Pflichtfeld</p>`,
    generate: () => {
      const a=getAuthors(); const t=val('titel'); const u=val('url');
      const d=val('datum'); const pd=val('pub_datum'); const sw=val('stichwort'); const seite=val('seite');
      if (!t||!u||!d) { alert('Bitte Titel, URL und Abrufdatum ausfüllen.'); return; }
      let fH=a.length?`${authorsFullHtml(a)}, `:'';
      // Guide S. 23: Komma vor «besucht am:», kein Klammern; Veröffentlichungsdatum vor URL
      fH+=`${esc(t)}`;
      if(pd) fH+=`, ${esc(pd)}`;
      fH+=`, ${esc(u)}, besucht am: ${esc(d)}.`;
      let fT=a.length?`${authorsFullText(a)}, `:'';
      fT+=`${t}`;
      if(pd) fT+=`, ${pd}`;
      fT+=`, ${u}, besucht am: ${d}.`;
      // Kurzzitat: AUTOR[, Stichwort/Titel][, S. X] — URL gehört NICHT ins Kurzzitat
      let kH=a.length?`${authorsShortHtml(a)}`:'';
      const kLabel=sw?esc(sw):(a.length?'':esc(t));
      if(kLabel) kH+=(kH?', ':'')+kLabel;
      if(seite) kH+=seite.startsWith('N')?`, ${esc(seite)}`:`, S. ${esc(seite)}`;
      kH+='.';
      let kT=a.length?`${authorsShortText(a)}`:'';
      const kLabelT=sw||(!a.length?t:'');
      if(kLabelT) kT+=(kT?', ':'')+kLabelT;
      if(seite) kT+=seite.startsWith('N')?`, ${seite}`:`, S. ${seite}`;
      kT+='.';
      showOutput(fH,fT,kH,kT);
    }
  }
};
