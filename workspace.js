function openModal(id) {
  document.getElementById(id).classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeModal(id) {
  document.getElementById(id).classList.remove('open');
  document.body.style.overflow = '';
}
function notifyWorkspaceSyncState() {
  if (typeof notifyLexCiteSyncPayloadChanged === 'function') {
    notifyLexCiteSyncPayloadChanged();
  }
}
function syncWorkspaceGlobals() {
  window.savedCitations = savedCitations;
  window.projectMeta = projectMeta;
}
function refreshPricingSurvey() {
  if (typeof LexCitePricingSurvey !== 'undefined' && typeof LexCitePricingSurvey.render === 'function') {
    LexCitePricingSurvey.render();
  }
}
function maybeOpenPricingSurveyModal() {
  if (typeof LexCitePricingSurvey !== 'undefined' && typeof LexCitePricingSurvey.shouldShow === 'function' && LexCitePricingSurvey.shouldShow()) {
    if (typeof LexCitePricingSurvey.openModal === 'function') {
      LexCitePricingSurvey.openModal();
    } else if (typeof LexCitePricingSurvey.render === 'function') {
      LexCitePricingSurvey.render();
    }
  }
}
function toggleInfoTip(button) {
  const isOpen = button.classList.contains('active');
  document.querySelectorAll('.info-tip.active').forEach(el => {
    if (el !== button) {
      el.classList.remove('active');
      el.setAttribute('aria-expanded', 'false');
      const panel = el.parentElement?.nextElementSibling;
      if (panel && panel.classList.contains('info-inline')) panel.classList.remove('open');
    }
  });
  button.classList.toggle('active', !isOpen);
  button.setAttribute('aria-expanded', String(!isOpen));
  const panel = button.parentElement?.nextElementSibling;
  if (panel && panel.classList.contains('info-inline')) {
    panel.classList.toggle('open', !isOpen);
  }
}
document.addEventListener('click', (event) => {
  if (!event.target.closest('.info-tip')) {
    document.querySelectorAll('.info-tip.active').forEach(el => {
      el.classList.remove('active');
      el.setAttribute('aria-expanded', 'false');
      const panel = el.parentElement?.nextElementSibling;
      if (panel && panel.classList.contains('info-inline')) panel.classList.remove('open');
    });
  }
});
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', function(e) {
    if (e.target === this) closeModal(this.id);
  });
});



// ══════════════════════════════════════════════════════════════
//  DARK MODE
// ══════════════════════════════════════════════════════════════
function toggleDark() {
  const isDark = document.body.classList.toggle('dark');
  LexCiteStorage.setBoolFlag(LEXCITE_STORAGE_KEYS.darkMode, isDark);
  document.getElementById('darkToggle').textContent = isDark ? '☀️' : '🌙';
}
function applyDarkFromStorage() {
  const isDark = LexCiteStorage.getBoolFlag(LEXCITE_STORAGE_KEYS.darkMode);
  document.body.classList.toggle('dark', isDark);
  const btn = document.getElementById('darkToggle');
  if (btn) btn.textContent = isDark ? '☀️' : '🌙';
}
(function initDark() {
  if (LexCiteStorage.getBoolFlag(LEXCITE_STORAGE_KEYS.darkMode)) {
    document.body.classList.add('dark');
    document.addEventListener('DOMContentLoaded', () => {
      const btn = document.getElementById('darkToggle');
      if (btn) btn.textContent = '☀️';
    });
  }
})();

// ══════════════════════════════════════════════════════════════
//  MEINE QUELLEN / LITERATURVERZEICHNIS
// ══════════════════════════════════════════════════════════════

// Bekannte Abkürzungen für das Abkürzungsverzeichnis
const ABBR_MAP_BASE = {
  // Bundesrecht – Privatrecht & Verfahren
  'OR':    'Bundesgesetz betreffend die Ergänzung des Schweizerischen Zivilgesetzbuches (Obligationenrecht) vom 30. März 1911, SR 220',
  'ZGB':   'Schweizerisches Zivilgesetzbuch vom 10. Dezember 1907, SR 210',
  'ZPO':   'Schweizerische Zivilprozessordnung vom 19. Dezember 2008, SR 272',
  'SchKG': 'Bundesgesetz über Schuldbetreibung und Konkurs vom 11. April 1889, SR 281.1',
  'IPRG':  'Bundesgesetz über das Internationale Privatrecht vom 18. Dezember 1987, SR 291',
  // Öffentliches Recht & Verfahren
  'BV':    'Bundesverfassung der Schweizerischen Eidgenossenschaft vom 18. April 1999, SR 101',
  'BGG':   'Bundesgesetz über das Bundesgericht vom 17. Juni 2005, SR 173.110',
  'VwVG':  'Bundesgesetz über das Verwaltungsverfahren vom 20. Dezember 1968, SR 172.021',
  'AHV':   'Bundesgesetz über die Alters- und Hinterlassenenversicherung vom 20. Dezember 1946, SR 831.10',
  // Strafrecht & Strafprozess
  'StGB':  'Schweizerisches Strafgesetzbuch vom 21. Dezember 1937, SR 311.0',
  'StPO':  'Schweizerische Strafprozessordnung vom 5. Oktober 2007, SR 312.0',
  // Arbeitsrecht
  'ArG':   'Bundesgesetz über die Arbeit in Industrie, Gewerbe und Handel (Arbeitsgesetz) vom 13. März 1964, SR 822.11',
  'AVG':   'Bundesgesetz über die Arbeitsvermittlung und den Personalverleih vom 6. Oktober 1989, SR 823.11',
  // Handels- & Gesellschaftsrecht
  'FusG':  'Bundesgesetz über Fusion, Spaltung, Umwandlung und Vermögensübertragung vom 3. Oktober 2003, SR 221.301',
  'KAG':   'Bundesgesetz über die kollektiven Kapitalanlagen vom 23. Juni 2006, SR 951.31',
  // Datenschutz & Wettbewerb
  'DSG':   'Bundesgesetz über den Datenschutz vom 25. September 2020, SR 235.1',
  'UWG':   'Bundesgesetz gegen den unlauteren Wettbewerb vom 19. Dezember 1986, SR 241',
  'KG':    'Bundesgesetz über Kartelle und andere Wettbewerbsbeschränkungen vom 6. Oktober 1995, SR 251',
  // Immaterialgüterrecht
  'MSchG': 'Bundesgesetz über den Schutz von Marken und Herkunftsangaben vom 28. August 1992, SR 232.11',
  'URG':   'Bundesgesetz über das Urheberrecht und verwandte Schutzrechte vom 9. Oktober 1992, SR 231.1',
  'PatG':  'Bundesgesetz über die Erfindungspatente vom 25. Juni 1954, SR 232.14',
  // Steuerrecht
  'DBG':   'Bundesgesetz über die direkte Bundessteuer vom 14. Dezember 1990, SR 642.11',
  'MWSTG': 'Bundesgesetz über die Mehrwertsteuer vom 12. Juni 2009, SR 641.20',
  // Rechtsprechung
  'BGE':   'Entscheid des Schweizerischen Bundesgerichts (amtliche Sammlung)',
  'BGer':  'Schweizerisches Bundesgericht (nicht amtlich publizierter Entscheid)',
  // Zeitschriften
  'AJP':   'Aktuelle Juristische Praxis',
  'SJZ':   'Schweizerische Juristen-Zeitung',
  'ZBl':   'Schweizerisches Zentralblatt für Staats- und Verwaltungsrecht',
  'ZBJV':  'Zeitschrift des Bernischen Juristenvereins',
  'ZSR':   'Zeitschrift für Schweizerisches Recht',
  'ARV':   'Arbeitsrecht – Zeitschrift für schweizerisches Arbeitsrecht',
  'JAR':   'Jahrbuch des Schweizerischen Arbeitsrechts',
  'HAVE':  'Haftung und Versicherung',
  'GesKR': 'Gesellschafts- und Kapitalmarktrecht',
  'REPRAX':'Die Praxis des Handelsregisters',
  'recht': 'recht – Zeitschrift für juristische Weiterbildung und Praxis',
  'Jusletter': 'Jusletter – Online-Zeitschrift für Recht',
  'plädoyer':  'plädoyer – Magazin für Recht und Politik',
  'SZZP':  'Schweizerische Zeitschrift für Zivilprozessrecht',
  'BJM':   'Basler Juristische Mitteilungen',
  // Kommentare
  'BSK':   'Basler Kommentar',
  'BK':    'Berner Kommentar',
  'CHK':   'Handkommentar zum Schweizer Privatrecht',
  'SHK':   'Stämpflis Handkommentar',
  'OFK':   'Orell Füssli Kommentar',
  'ZK':    'Zürcher Kommentar',
  // Kantonsgerichte & Sammlungen
  'ZH':    'Kanton Zürich',
  'BE':    'Kanton Bern',
  'BS':    'Kanton Basel-Stadt',
  'GR':    'Kanton Graubünden',
  'AGer-Z':'Arbeitsgericht Zürich',
  'AGVE':  'Aargauische Gerichts- und Verwaltungsentscheide',
  'ZR':    'Blätter für zürcherische Rechtsprechung',
};

// Merge base map with user-added entries from storage backend
let userAbbrMap = LexCiteStorage.getJSON(LEXCITE_STORAGE_KEYS.customAbbr, {});
const ABBR_MAP  = { ...ABBR_MAP_BASE, ...userAbbrMap };

function addCustomAbbr() {
  const keyEl = document.getElementById('customAbbrKey');
  const valEl = document.getElementById('customAbbrVal');
  const key   = (keyEl?.value || '').trim();
  const val   = (valEl?.value || '').trim();
  if (!key || !val) { alert('Bitte Abkürzung und Bedeutung ausfüllen.'); return; }
  userAbbrMap[key] = val;
  ABBR_MAP[key]    = val;
  LexCiteStorage.setJSON(LEXCITE_STORAGE_KEYS.customAbbr, userAbbrMap);
  notifyWorkspaceSyncState();
  if (keyEl) keyEl.value = '';
  if (valEl) valEl.value = '';
  renderAbbrList();
}
function removeCustomAbbr(key) {
  delete userAbbrMap[key];
  delete ABBR_MAP[key];
  LexCiteStorage.setJSON(LEXCITE_STORAGE_KEYS.customAbbr, userAbbrMap);
  notifyWorkspaceSyncState();
  renderAbbrList();
}

const TYPE_COLORS = {
  bge:'#3B6FFF', bger:'#7C3AED', bvge:'#6D28D9', monographie:'#0891B2',
  zeitschrift:'#059669', kommentar:'#D97706', kantonal:'#DC2626',
  sammelband:'#16A34A', gesetz:'#4B5563', internet:'#DB2777',
  materialien:'#B45309', dissertation:'#0F766E',
};
const TYPE_LABELS = {
  bge:'BGE', bger:'BGer', bvge:'BVGE/BVGer', monographie:'Monographie', dissertation:'Dissertation',
  zeitschrift:'Zeitschrift', kommentar:'Kommentar', kantonal:'Kantonal',
  sammelband:'Sammelband', gesetz:'Gesetz/Erlass', internet:'Internet',
  materialien:'Materialien',
};

let savedCitations = LexCiteStorage.getJSON(LEXCITE_STORAGE_KEYS.savedCitations, []);
let projectMeta = LexCiteStorage.getJSON(LEXCITE_STORAGE_KEYS.projectMeta, { title: '', course: '', dueDate: '', notes: '' });
syncWorkspaceGlobals();

function saveCurrentCitation() {
  const vollPlainEl = document.getElementById('vollPlain');
  const vollOutputEl = document.getElementById('vollOutput');
  const displayedFullText = vollPlainEl.textContent.trim();
  const fullText = (vollPlainEl.dataset.directoryEntry || displayedFullText).trim();
  const fullHtml = (vollOutputEl.dataset.directoryHtml || vollOutputEl.innerHTML).trim();
  const kurzText = document.getElementById('kurzPlain').textContent.trim();
  const kurzHtml = document.getElementById('kurzOutput').innerHTML;
  const type     = document.getElementById('sourceType').value;
  if (!fullText || !type) return;

  if (type === 'gesetz') {
    const abk = val('abk');
    if (abk) {
      userAbbrMap[abk] = fullText.replace(/\.$/, '');
      ABBR_MAP[abk] = userAbbrMap[abk];
      LexCiteStorage.setJSON(LEXCITE_STORAGE_KEYS.customAbbr, userAbbrMap);
      syncWorkspaceGlobals();
      notifyWorkspaceSyncState();
      refreshPricingSurvey();
      renderAbbrList();
      switchPage('quellen');
      switchTab('abkurz');
      flashSaveBtn('✅ Im Abkürzungsverzeichnis gespeichert');
    }
    return;
  }

  if (type === 'materialien' && /^Amtl\. Bull\./.test(displayedFullText)) {
    flashSaveBtn('✅ Fussnotenzitat erzeugt');
    return;
  }

  // Duplikat-Check
  if (savedCitations.some(c => c.fullText.trim().toLowerCase() === fullText.toLowerCase())) {
    flashSaveBtn('⚠️ Bereits gespeichert'); return;
  }

  const item = {
    id: Date.now(),
    type,
    typeLabel: TYPE_LABELS[type] || type,
    fullText,
    fullHtml,
    kurzText: kurzText || '',
    kurzHtml: kurzHtml || '',
    stichwort: val('stichwort') || '',
    date: new Date().toLocaleDateString('de-CH'),
  };
  savedCitations.push(item);
  LexCiteStorage.setJSON(LEXCITE_STORAGE_KEYS.savedCitations, savedCitations);
  if (typeof LexCiteUsage !== 'undefined') {
    LexCiteUsage.trackCitationSave(type);
  }
  syncWorkspaceGlobals();
  notifyWorkspaceSyncState();
  refreshPricingSurvey();
  maybeOpenPricingSurveyModal();

  const targetTab = isJudikatur(type) ? 'jud' : isMaterial(type) ? 'mat' : 'lit';
  const tabLabel  = isJudikatur(type) ? 'Judikaturverzeichnis' : isMaterial(type) ? 'Materialienverzeichnis' : 'Literaturverzeichnis';
  flashSaveBtn(`✅ Gespeichert im ${tabLabel}`);
  updateSourcesBadge();
  renderSavedCitations();
  renderAbbrList();

  // Zur Quellen-Seite wechseln und richtigen Tab öffnen
  switchPage('quellen');
  switchTab(targetTab);
}

function flashSaveBtn(msg) {
  const btn = document.getElementById('btnSaveCitation');
  btn.textContent = msg;
  btn.style.opacity = '0.85';
  setTimeout(() => { btn.textContent = '💾 In Verzeichnis speichern'; btn.style.opacity = ''; }, 2500);
}

function deleteSavedCitation(id) {
  savedCitations = savedCitations.filter(c => c.id !== id);
  LexCiteStorage.setJSON(LEXCITE_STORAGE_KEYS.savedCitations, savedCitations);
  syncWorkspaceGlobals();
  notifyWorkspaceSyncState();
  refreshPricingSurvey();
  updateSourcesBadge();
  renderSavedCitations();
  renderAbbrList();
}

// Typen die ins Judikaturverzeichnis gehören
const JUDIKATUR_TYPES = new Set(['bge', 'bger', 'bvge', 'kantonal']);
const MATERIAL_TYPES = new Set(['materialien']);

function isJudikatur(type) { return JUDIKATUR_TYPES.has(type); }
function isMaterial(type) { return MATERIAL_TYPES.has(type); }

function getTrustMeta(issueCount, warningCount) {
  if (issueCount === 0) return { level: 'high', label: 'hoch' };
  if (warningCount >= 2 || issueCount >= 3) return { level: 'low', label: 'prüfen' };
  return { level: 'medium', label: 'teilweise' };
}

function getCitationTrustState(citation) {
  try {
    const formatSel = 'verz';
    const issues = getIssues(citation.fullText || '', citation.type, formatSel) || [];
    const warningCount = issues.filter(i => i.includes('⚠️')).length;
    return getTrustMeta(issues.length, warningCount);
  } catch (err) {
    return { level: 'medium', label: 'prüfen' };
  }
}

function clearList(which) {
  const label = which === 'lit' ? 'Literaturverzeichnis' : which === 'jud' ? 'Judikaturverzeichnis' : 'Materialienverzeichnis';
  if (!confirm(`${label} löschen?`)) return;
  savedCitations = savedCitations.filter(c => {
    if (which === 'lit') return isJudikatur(c.type) || isMaterial(c.type);
    if (which === 'jud') return !isJudikatur(c.type);
    return !isMaterial(c.type);
  });
  LexCiteStorage.setJSON(LEXCITE_STORAGE_KEYS.savedCitations, savedCitations);
  syncWorkspaceGlobals();
  notifyWorkspaceSyncState();
  refreshPricingSurvey();
  updateSourcesBadge();
  renderCitationList('lit');
  renderCitationList('jud');
  renderCitationList('mat');
  renderAbbrList();
}

function copySingleCitation(id) {
  const item = savedCitations.find(c => c.id === id);
  if (!item) return;
  navigator.clipboard.writeText(item.fullText);
}

function copyKurzzitat(id) {
  const item = savedCitations.find(c => c.id === id);
  if (!item || !item.kurzText) return;
  navigator.clipboard.writeText(item.kurzText);
  // Brief flash on the button
  const btn = document.querySelector(`[onclick="copyKurzzitat(${id})"]`);
  if (btn) { const orig = btn.textContent; btn.textContent = '✓'; setTimeout(() => btn.textContent = orig, 1200); }
}

let _editingId = null;
function openEditModal(id) {
  const item = savedCitations.find(c => c.id === id);
  if (!item) return;
  _editingId = id;
  document.getElementById('editFullText').value = item.fullText;
  document.getElementById('editKurzText').value = item.kurzText || '';
  document.getElementById('editModal').style.display = 'flex';
}
function closeEditModal() {
  document.getElementById('editModal').style.display = 'none';
  _editingId = null;
}
function saveEditModal() {
  if (!_editingId) return;
  const idx = savedCitations.findIndex(c => c.id === _editingId);
  if (idx === -1) return;
  const newFull = document.getElementById('editFullText').value.trim();
  const newKurz = document.getElementById('editKurzText').value.trim();
  if (!newFull) { alert('Vollzitat darf nicht leer sein.'); return; }
  savedCitations[idx] = { ...savedCitations[idx], fullText: newFull, fullHtml: esc(newFull), kurzText: newKurz, kurzHtml: esc(newKurz) };
  LexCiteStorage.setJSON(LEXCITE_STORAGE_KEYS.savedCitations, savedCitations);
  syncWorkspaceGlobals();
  notifyWorkspaceSyncState();
  refreshPricingSurvey();
  closeEditModal();
  renderSavedCitations();
  renderAbbrList();
}

function updateSourcesBadge() {
  const count = savedCitations.length;
  // Nav badge (top navigation)
  const navBadge = document.getElementById('navBadge');
  if (navBadge) {
    navBadge.textContent = count;
    navBadge.classList.toggle('zero', count === 0);
  }
  // Legacy badge inside sources panel header (kept for compatibility)
  const badge = document.getElementById('sourcesBadge');
  if (badge) badge.textContent = count;
}

// ── Top-level page navigation ─────────────────────────────────
function switchPage(page) {
  if (typeof LexCiteUsage !== 'undefined') {
    LexCiteUsage.trackPage(page);
  }
  const pages = ['zitieren', 'pruefen', 'quellen', 'tracker'];
  pages.forEach(p => {
    const sec = document.getElementById('page-' + p);
    const nav = document.getElementById('nav-' + p);
    if (sec) sec.classList.toggle('active', p === page);
    if (nav) nav.classList.toggle('active', p === page);
  });
  // Scroll to top of container on page switch
  const nav = document.getElementById('pageNav');
  if (nav) nav.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Legacy no-op (was collapsible toggle — panel no longer exists)
function toggleSourcesPanel() {}
function toggleChecker() {}

function switchTab(tab) {
  document.getElementById('tabLitBody').style.display    = tab === 'lit'    ? '' : 'none';
  document.getElementById('tabJudBody').style.display    = tab === 'jud'    ? '' : 'none';
  document.getElementById('tabMatBody').style.display    = tab === 'mat'    ? '' : 'none';
  document.getElementById('tabAbkurzBody').style.display = tab === 'abkurz' ? '' : 'none';
  document.getElementById('tabLit').classList.toggle('active',    tab === 'lit');
  document.getElementById('tabJud').classList.toggle('active',    tab === 'jud');
  document.getElementById('tabMat').classList.toggle('active',    tab === 'mat');
  document.getElementById('tabAbkurz').classList.toggle('active', tab === 'abkurz');
}

function renderCitationList(which) {
  const searchId = which === 'jud' ? 'judSearch' : which === 'mat' ? 'matSearch' : 'litSearch';
  const listId   = which === 'jud' ? 'judCitationsList' : which === 'mat' ? 'matCitationsList' : 'litCitationsList';
  const exportId = which === 'jud' ? 'judExportBar' : which === 'mat' ? 'matExportBar' : 'litExportBar';
  const emptyMsg = which === 'jud'
    ? '⚖️ Noch keine Gerichtsentscheide gespeichert.<br>BGE, BGer und kantonale Entscheide landen hier.'
    : which === 'mat'
    ? '🧾 Noch keine Materialien gespeichert.<br>Botschaften und ähnliche Materialien landen hier.'
    : '📚 Noch keine Literatur gespeichert.<br>Monographien, Zeitschriften, Kommentare etc. landen hier.';

  const query   = (document.getElementById(searchId)?.value || '').toLowerCase();
  const list    = document.getElementById(listId);
  const exportB = document.getElementById(exportId);

  const group = savedCitations.filter(c => {
    if (which === 'jud') return isJudikatur(c.type);
    if (which === 'mat') return isMaterial(c.type);
    return !isJudikatur(c.type) && !isMaterial(c.type);
  });
  const filtered = group.filter(c =>
    !query || c.fullText.toLowerCase().includes(query) || c.typeLabel.toLowerCase().includes(query)
  );
  const sorted = [...filtered].sort((a, b) => a.fullText.localeCompare(b.fullText, 'de', { sensitivity: 'base' }));

  if (sorted.length === 0) {
    list.innerHTML = `<div class="sources-empty-state">${group.length === 0 ? emptyMsg : '🔍 Keine Treffer.'}</div>`;
    exportB.style.display = 'none';
    return;
  }

  // Guide S. 25: (zit. Stichwort) bei mehreren Werken desselben Autors
  // Nachnamen-Extraktion: erster Grossbuchstaben-Block im fullText
  const authorCounts = {};
  sorted.forEach(c => { const k = getAuthorGroupKey(c); if (k) authorCounts[k] = (authorCounts[k] || 0) + 1; });

  list.innerHTML = sorted.map(c => {
    const color = TYPE_COLORS[c.type] || '#888';
    const ak = getAuthorGroupKey(c);
    const needsZit = ak && authorCounts[ak] > 1 && c.stichwort;
    const zitSuffix = needsZit ? ` <span style="color:var(--warning-text);font-style:italic">(zit. ${c.stichwort})</span>` : '';
    const trust = getCitationTrustState(c);
    return `<div class="saved-citation-item">
      <div class="saved-citation-dot" style="background:${color}"></div>
      <div class="saved-citation-body">
        <div class="saved-citation-type">${c.typeLabel}<span class="trust-badge ${trust.level}">${trust.label}</span></div>
        <div class="saved-citation-text">${c.fullHtml}${zitSuffix}</div>
        <div class="saved-citation-date">${c.date}</div>
      </div>
      <div class="saved-citation-actions">
        ${c.kurzText ? `<button class="btn-cite-copy btn-cite-kurz" onclick="copyKurzzitat(${c.id})" title="Kurzzitat kopieren">Kz</button>` : ''}
        <button class="btn-cite-copy" onclick="copySingleCitation(${c.id})" title="Vollzitat kopieren">📋</button>
        <button class="btn-cite-edit" onclick="openEditModal(${c.id})" title="Bearbeiten">✏️</button>
        <button class="btn-cite-del"  onclick="deleteSavedCitation(${c.id})" title="Löschen">✕</button>
      </div>
    </div>`;
  }).join('');
  exportB.style.display = 'flex';
}

// Wrapper für DOMContentLoaded-Init
function renderSavedCitations() {
  renderCitationList('lit');
  renderCitationList('jud');
  renderCitationList('mat');
  const consistencyResult = document.getElementById('consistencyResult');
  if (consistencyResult && consistencyResult.style.display === 'block') runConsistencyAudit();
  updateTrackerDisplay(); // keep tracker in sync with saved citations
}

function renderAbbrList() {
  const container = document.getElementById('abbrList');
  const empty     = document.getElementById('abbrEmpty');
  const exportB   = document.getElementById('abbrExportBar');
  if (!container) return;

  // Auto-detected: scan citation text for known base abbreviations
  const allText = savedCitations.map(c => c.fullText).join(' ');
  const autoFound = new Set(
    Object.keys(ABBR_MAP_BASE).filter(k => new RegExp(`\\b${k}\\b`).test(allText))
  );

  // User-added: always show regardless of text match
  const userKeys = Object.keys(userAbbrMap);

  // Merge: user-added first, then auto; deduplicated, sorted
  const allKeys = [...new Set([...userKeys, ...autoFound])].sort();

  if (allKeys.length === 0) {
    container.innerHTML = ''; empty.style.display = ''; exportB.style.display = 'none'; return;
  }
  empty.style.display = 'none'; exportB.style.display = 'flex';

  container.innerHTML = allKeys.map(k => {
    const isUser = !!userAbbrMap[k];
    const val    = ABBR_MAP[k] || '';
    const delBtn = isUser
      ? `<button class="abbr-del" onclick="removeCustomAbbr('${k}')" title="Entfernen">✕</button>`
      : '';
    return `<div class="abbr-item${isUser ? ' user-added' : ''}">
      <span class="abbr-key">${k}</span>
      <span class="abbr-val">${val}</span>
      ${delBtn}
    </div>`;
  }).join('');
}

function getListText(which) {
  return [...savedCitations]
    .filter(c => {
      if (which === 'jud') return isJudikatur(c.type);
      if (which === 'mat') return isMaterial(c.type);
      return !isJudikatur(c.type) && !isMaterial(c.type);
    })
    .sort((a, b) => a.fullText.localeCompare(b.fullText, 'de', { sensitivity: 'base' }))
    .map(c => c.fullText).join('\n\n');
}

function copyList(which) { navigator.clipboard.writeText(getListText(which)); }
async function exportList(which) {
  const title  = which === 'jud' ? 'Judikaturverzeichnis' : which === 'mat' ? 'Materialienverzeichnis' : 'Literaturverzeichnis';
  const fname  = which === 'jud' ? 'Judikaturverzeichnis.docx' : which === 'mat' ? 'Materialienverzeichnis.docx' : 'Literaturverzeichnis.docx';

  // Fallback to .txt if docx library hasn't loaded yet
  if (typeof window.docx === 'undefined') {
    downloadTxt(title + '\n' + '='.repeat(40) + '\n\n' + getListText(which),
                fname.replace('.docx', '.txt'));
    return;
  }

  const { Document, Packer, Paragraph, TextRun, Footer, AlignmentType, BorderStyle } = window.docx;

  // Converts a citation's HTML (with <span class="smallcaps">) into docx TextRun[]
  function htmlToRuns(html) {
    const div = document.createElement('div');
    div.innerHTML = html;
    const runs = [];
    function walk(node) {
      if (node.nodeType === 3) { // plain text node
        if (node.textContent) runs.push(new TextRun({ text: node.textContent, font: 'Times New Roman', size: 24 }));
      } else if (node.nodeType === 1) {
        if (node.classList && node.classList.contains('smallcaps')) {
          runs.push(new TextRun({ text: node.textContent, smallCaps: true, font: 'Times New Roman', size: 24 }));
        } else {
          for (const child of node.childNodes) walk(child);
        }
      }
    }
    for (const child of div.childNodes) walk(child);
    return runs.length ? runs : [new TextRun({ text: '' })];
  }

  const citations = [...savedCitations]
    .filter(c => {
      if (which === 'jud') return isJudikatur(c.type);
      if (which === 'mat') return isMaterial(c.type);
      return !isJudikatur(c.type) && !isMaterial(c.type);
    })
    .sort((a, b) => a.fullText.localeCompare(b.fullText, 'de', { sensitivity: 'base' }));

  const today = new Date().toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const children = [
    // Title with bottom border rule
    new Paragraph({
      children: [new TextRun({ text: title, bold: true, size: 32, font: 'Times New Roman' })],
      spacing: { after: 80 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '1B2E5A', space: 4 } },
    }),
    // Subtitle: date
    new Paragraph({
      children: [new TextRun({ text: `Stand: ${today}`, size: 18, color: '888888', font: 'Times New Roman', italics: true })],
      spacing: { after: 400 },
    }),
  ];

  if (citations.length === 0) {
    children.push(new Paragraph({
      children: [new TextRun({ text: 'Keine Einträge vorhanden.', italics: true, size: 24, color: '888888', font: 'Times New Roman' })],
    }));
  } else {
    citations.forEach(c => {
      children.push(new Paragraph({
        children: htmlToRuns(c.fullHtml),
        spacing: { after: 200 },
        indent: { left: 720, hanging: 720 }, // standard bibliography hanging indent (0.5 in)
      }));
    });
  }

  const doc = new Document({
    styles: {
      default: { document: { run: { font: 'Times New Roman', size: 24 } } },
    },
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838 }, // A4
          margin: { top: 1418, right: 1418, bottom: 1418, left: 1701 }, // ~2.5 cm top/right, ~3 cm left
        },
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            children: [new TextRun({ text: 'Generiert mit LexCite', size: 18, color: '999999', font: 'Times New Roman', italics: true })],
            alignment: AlignmentType.RIGHT,
          })],
        }),
      },
      children,
    }],
  });

  try {
    const blob = await Packer.toBlob(doc);
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = fname;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Word-Export Fehler:', err);
    downloadTxt(title + '\n' + '='.repeat(40) + '\n\n' + getListText(which), fname.replace('.docx', '.txt'));
  }
}

function getAbbrText() {
  const allText = savedCitations.map(c => c.fullText).join(' ');
  const found = Object.keys(ABBR_MAP).filter(k => new RegExp(`\\b${k}\\b`).test(allText)).sort();
  return found.map(k => `${k.padEnd(12)} ${ABBR_MAP[k]}`).join('\n');
}

function copyAbbrList() { navigator.clipboard.writeText(getAbbrText()); }
function exportAbbrList() {
  downloadTxt('Abkürzungsverzeichnis\n' + '='.repeat(40) + '\n\n' + getAbbrText(), 'Abkuerzungsverzeichnis.txt');
}

function downloadTxt(content, filename) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

function downloadJson(obj, filename) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

function setBackupStatus(kind, text) {
  const el = document.getElementById('backupStatus');
  if (!el) return;
  el.className = `backup-status visible ${kind}`;
  el.textContent = text;
}

function buildWorkspaceBackup() {
  const storageInfo = typeof LexCiteStorage !== 'undefined' && LexCiteStorage.getAdapterInfo
    ? LexCiteStorage.getAdapterInfo()
    : { mode: 'unknown', capabilities: [] };
  return {
    app: 'LexCite',
    version: 1,
    exportedAt: new Date().toISOString(),
    session: typeof LexCiteSession !== 'undefined' && LexCiteSession.getDebugInfo
      ? LexCiteSession.getDebugInfo()
      : { mode: 'guest', scope: 'guest:local', user: null },
    storage: storageInfo,
    data: {
      savedCitations,
      customAbbreviations: userAbbrMap,
      trackerGoal,
      trackerCounts: citationCounts,
      trackedTexts: [...trackedTexts],
      darkMode: LexCiteStorage.getBoolFlag(LEXCITE_STORAGE_KEYS.darkMode),
      projectMeta,
    },
  };
}

function renderProjectMeta() {
  const titleEl = document.getElementById('projectTitle');
  const courseEl = document.getElementById('projectCourse');
  const dueDateEl = document.getElementById('projectDueDate');
  const notesEl = document.getElementById('projectNotes');
  if (titleEl) titleEl.value = projectMeta.title || '';
  if (courseEl) courseEl.value = projectMeta.course || '';
  if (dueDateEl) dueDateEl.value = projectMeta.dueDate || '';
  if (notesEl) notesEl.value = projectMeta.notes || '';
  updateProjectStatus();
}

function updateProjectStatus(saved = true) {
  const el = document.getElementById('projectStatus');
  const chip = document.getElementById('projectDeadlineChip');
  if (!el) return;
  const liveMeta = saved ? projectMeta : {
    title: (document.getElementById('projectTitle')?.value || '').trim(),
    course: (document.getElementById('projectCourse')?.value || '').trim(),
    dueDate: (document.getElementById('projectDueDate')?.value || '').trim(),
    notes: (document.getElementById('projectNotes')?.value || '').trim(),
  };
  updateProjectDeadlineChip(chip, liveMeta.dueDate);
  if (!liveMeta.title && !liveMeta.course && !liveMeta.dueDate && !liveMeta.notes) {
    el.textContent = 'Noch keine Projektdaten gespeichert.';
    return;
  }
  const parts = [];
  if (liveMeta.title) parts.push(`Projekt: ${liveMeta.title}`);
  if (liveMeta.course) parts.push(`Modul: ${liveMeta.course}`);
  if (liveMeta.dueDate) parts.push(`Abgabe: ${liveMeta.dueDate}`);
  el.textContent = (saved ? 'Gespeichert' : 'Aktuell im Formular') + ' — ' + parts.join(' · ');
}

function updateProjectDeadlineChip(chip, dueDate) {
  if (!chip) return;
  chip.className = 'project-deadline-chip';
  if (!dueDate) {
    chip.textContent = 'Noch kein Abgabedatum gesetzt';
    return;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate + 'T00:00:00');
  if (Number.isNaN(due.getTime())) {
    chip.textContent = 'Abgabedatum konnte nicht gelesen werden';
    chip.classList.add('warn');
    return;
  }

  const diffDays = Math.round((due.getTime() - today.getTime()) / 86400000);
  if (diffDays > 7) {
    chip.textContent = `Noch ${diffDays} Tage bis zur Abgabe`;
    return;
  }
  if (diffDays >= 0) {
    chip.textContent = diffDays === 0 ? 'Abgabe ist heute' : `Nur noch ${diffDays} Tage bis zur Abgabe`;
    chip.classList.add(diffDays <= 3 ? 'danger' : 'warn');
    return;
  }

  chip.textContent = `Abgabe war vor ${Math.abs(diffDays)} Tagen`;
  chip.classList.add('danger');
}

function saveProjectMeta() {
  projectMeta = {
    title: (document.getElementById('projectTitle')?.value || '').trim(),
    course: (document.getElementById('projectCourse')?.value || '').trim(),
    dueDate: (document.getElementById('projectDueDate')?.value || '').trim(),
    notes: (document.getElementById('projectNotes')?.value || '').trim(),
  };
  LexCiteStorage.setJSON(LEXCITE_STORAGE_KEYS.projectMeta, projectMeta);
  syncWorkspaceGlobals();
  notifyWorkspaceSyncState();
  updateProjectStatus(true);
}

function exportWorkspaceBackup() {
  const stamp = new Date().toISOString().slice(0, 10);
  downloadJson(buildWorkspaceBackup(), `LexCite-Backup-${stamp}.json`);
  setBackupStatus('success', 'Backup exportiert. Bewahre die JSON-Datei am besten in iCloud, Dropbox oder auf deinem Desktop auf.');
}

function openBackupImport(mode) {
  const input = document.getElementById('backupFileInput');
  if (!input) return;
  input.dataset.mode = mode || 'merge';
  input.click();
}

function rebuildTrackerFromSaved() {
  citationCounts = {};
  trackedTexts = new Set();
  savedCitations.forEach(c => {
    const key = normalizeCitation(c.fullText || '');
    if (key) trackedTexts.add(key);
    if (c.type) citationCounts[c.type] = (citationCounts[c.type] || 0) + 1;
  });
  LexCiteStorage.setJSON(LEXCITE_STORAGE_KEYS.trackerCounts, citationCounts);
  LexCiteStorage.setJSON(LEXCITE_STORAGE_KEYS.trackerTexts, [...trackedTexts]);
  syncWorkspaceGlobals();
  notifyWorkspaceSyncState();
}

function normalizeImportedCitation(c, fallbackId) {
  return {
    id: c?.id || fallbackId,
    type: c?.type || 'monographie',
    typeLabel: c?.typeLabel || (TYPE_LABELS[c?.type] || c?.type || 'Quelle'),
    fullText: c?.fullText || '',
    fullHtml: c?.fullHtml || esc(c?.fullText || ''),
    kurzText: c?.kurzText || '',
    kurzHtml: c?.kurzHtml || esc(c?.kurzText || ''),
    stichwort: c?.stichwort || '',
    date: c?.date || new Date().toLocaleDateString('de-CH'),
  };
}

async function handleBackupImport(event) {
  const input = event.target;
  const file = input?.files?.[0];
  const mode = input?.dataset?.mode || 'merge';
  if (!file) return;

  try {
    const raw = await file.text();
    const parsed = JSON.parse(raw);
    const payload = parsed?.data || {};
    const importedCitations = Array.isArray(payload.savedCitations) ? payload.savedCitations : [];
    const importedAbbr = payload.customAbbreviations && typeof payload.customAbbreviations === 'object' ? payload.customAbbreviations : {};
    const importedProjectMeta = payload.projectMeta && typeof payload.projectMeta === 'object' ? payload.projectMeta : null;

    if (parsed?.app !== 'LexCite' || typeof parsed?.version !== 'number') {
      throw new Error('Datei ist kein gueltiges LexCite-Backup.');
    }

    if (mode === 'replace') {
      savedCitations = importedCitations.map((c, idx) => normalizeImportedCitation(c, Date.now() + idx));
      userAbbrMap = { ...importedAbbr };
      trackerGoal = Math.max(1, parseInt(payload.trackerGoal, 10) || 10);
      projectMeta = importedProjectMeta || { title: '', course: '', dueDate: '', notes: '' };
      LexCiteStorage.set(LEXCITE_STORAGE_KEYS.trackerGoal, String(trackerGoal));
      LexCiteStorage.setBoolFlag(LEXCITE_STORAGE_KEYS.darkMode, !!payload.darkMode);
    } else {
      const seen = new Set(savedCitations.map(c => normalizeCitation(c.fullText || '')));
      const merged = [...savedCitations];
      importedCitations.forEach((c, idx) => {
        const key = normalizeCitation(c.fullText || '');
        if (!key || seen.has(key)) return;
        seen.add(key);
        merged.push(normalizeImportedCitation(c, Date.now() + idx));
      });
      savedCitations = merged;
      userAbbrMap = { ...userAbbrMap, ...importedAbbr };
      if (importedProjectMeta) projectMeta = { ...projectMeta, ...importedProjectMeta };
    }

    Object.keys(ABBR_MAP).forEach(k => {
      if (!ABBR_MAP_BASE[k]) delete ABBR_MAP[k];
    });
    Object.assign(ABBR_MAP, ABBR_MAP_BASE, userAbbrMap);

    LexCiteStorage.setJSON(LEXCITE_STORAGE_KEYS.savedCitations, savedCitations);
    LexCiteStorage.setJSON(LEXCITE_STORAGE_KEYS.customAbbr, userAbbrMap);
    LexCiteStorage.setJSON(LEXCITE_STORAGE_KEYS.projectMeta, projectMeta);
    syncWorkspaceGlobals();
    notifyWorkspaceSyncState();
    refreshPricingSurvey();
    rebuildTrackerFromSaved();

    const goalInput = document.getElementById('goalInput');
    if (goalInput) goalInput.value = trackerGoal;
    applyDarkFromStorage();
    updateSourcesBadge();
    renderSavedCitations();
    renderAbbrList();
    renderProjectMeta();
    updateTrackerDisplay();
    setBackupStatus(
      mode === 'replace' ? 'warn' : 'success',
      mode === 'replace'
        ? `Backup importiert und bestehende Daten ersetzt. Aktuell gespeichert: ${savedCitations.length} Quellen.`
        : `Backup importiert und zusammengeführt. Aktuell gespeichert: ${savedCitations.length} Quellen.`
    );
    switchPage('quellen');
  } catch (err) {
    console.error(err);
    setBackupStatus('error', 'Import fehlgeschlagen. Bitte eine echte LexCite-Backup-Datei verwenden.');
  } finally {
    if (input) input.value = '';
  }
}

// Init
document.addEventListener('DOMContentLoaded', () => {
  if (typeof LexCiteAccount !== 'undefined' && LexCiteAccount.render) LexCiteAccount.render();
  updateSourcesBadge();
  renderSavedCitations();
  renderAbbrList();
  renderProjectMeta();
  renderReferenceCases();
  syncWorkspaceGlobals();
  notifyWorkspaceSyncState();
  refreshPricingSurvey();
  maybeShowOnboarding();
  // Extension-Import aus URL-Parametern (LexCite Chrome Extension)
  handleExtensionImport();
});

/**
 * Liest URL-Parameter aus einem Extension-Import (?ext=1&type=...&gericht=...&datum=...&dok=...)
 * und füllt das Zitier-Formular automatisch vor.
 */
function handleExtensionImport() {
  const p = new URLSearchParams(window.location.search);
  if (p.get('ext') !== '1') return;

  const type    = p.get('type')    || 'kantonal';
  const gericht = p.get('gericht') || '';
  const datum   = p.get('datum')   || '';
  const dok     = p.get('dok')     || '';
  const pub     = p.get('pub')     || '';
  const autor   = p.get('autor')   || '';
  const titel   = p.get('titel')   || '';
  const srcUrl  = p.get('src')     || '';

  // Zur Zitieren-Seite wechseln
  switchPage('zitieren');

  // Quellentyp setzen und Formular laden
  const sel = document.getElementById('sourceType');
  if (!sel) return;
  sel.value = type;
  if (typeof onTypeChange === 'function') onTypeChange();

  // Nach kurzem Delay Felder befüllen (Formular muss gerendert sein)
  setTimeout(() => {
    function setField(id, v) {
      const el = document.getElementById(id);
      if (el && v) { el.value = v; el.dispatchEvent(new Event('input')); }
    }

    if (type === 'kantonal') {
      // Felder: gericht, datum, zeitschrift, jahr, seite
      setField('gericht', gericht);
      setField('datum', datum);
      // dok kann sein:
      //   "ARV 2023 S. 111"                 → einfaches Format
      //   "PKG 2022 Nr. 4"                  → Nr.-Format
      //   "NZZ Nr. 51 03.03.2025, S. 12"    → NZZ-Format mit Datum
      //   "NZZ Nr. 93 22.04.2022, S. 11"    → gleich
      if (dok) {
        // 1) Zeitschrift = erstes Wort
        const abk = dok.match(/^(\S+)/);
        if (abk) setField('zeitschrift', abk[1]);

        // 2) Jahr = erste 4-stellige Jahreszahl (auch innerhalb Datum DD.MM.YYYY)
        const jahrM = dok.match(/\b(20\d{2}|19\d{2})\b/);
        if (jahrM) setField('jahr', jahrM[1]);

        // 3) Seite = letztes "S. N" im String (bevorzugt vor "Nr. N")
        const allS = [...dok.matchAll(/S\.\s*(\d+)/g)];
        if (allS.length > 0) {
          setField('seite', allS[allS.length - 1][1]);
        } else {
          const nrM = dok.match(/Nr\.\s*(\d+)/);
          if (nrM) setField('seite', nrM[1]);
        }
      }

    } else if (type === 'bge') {
      // Felder: band, teil, seite
      // dok = "BGE 150 IV 384"
      const m = dok.match(/^BGE\s+(\d+)\s+(I{1,3}V?|VI|IV|V)\s+(\d+)/i);
      if (m) {
        setField('band',  m[1]);
        setField('teil',  m[2].toUpperCase());
        setField('seite', m[3]);
      }

    } else if (type === 'bger') {
      // Felder: geschaeft, datum
      // dok = "9C_355/2023" | "BGer 9C_355/2023"
      const geschaeft = dok.replace(/^BGer\s+/i, '').trim();
      setField('geschaeft', geschaeft || dok);
      setField('datum', datum);

    } else if (type === 'bvge') {
      // Felder: bvge_art (select), geschaeft, datum
      const artEl = document.getElementById('bvge_art');
      if (artEl) {
        artEl.value = /^BVGE/i.test(dok) ? 'BVGE' : 'BVGer';
        artEl.dispatchEvent(new Event('change'));
      }
      const geschaeft = dok.replace(/^BVGE\s+|^BVGer\s+/i, '').trim();
      setField('geschaeft', geschaeft || dok);
      setField('datum', datum);

    } else if (type === 'zeitschrift') {
      // Felder: authorsList (.nachname/.vorname), titel, zeitschrift, jahr, seite_start
      //
      // Autoren-Format aus Swisslex: "Müller Roland, Pärli Kurt, Caroni Andrea"
      // Jeder Autor: NACHNAME Vorname (letztes Wort = Vorname, Rest = Nachname)
      if (autor) {
        const authorStrings = autor.split(/,\s+/);
        const list = document.getElementById('authorsList');
        if (list) {
          authorStrings.forEach((authorStr, i) => {
            const parts  = authorStr.trim().split(/\s+/);
            const vn     = parts.pop() || '';
            const nn     = parts.join(' ');
            let block;
            if (i === 0) {
              block = list.querySelector('.author-block');
            } else {
              block = document.createElement('div');
              block.className = 'author-block';
              block.innerHTML = `<div class="author-inner"><div class="fields">
                <div class="form-group"><div class="form-label">Nachname</div>
                  <input type="text" class="nachname"></div>
                <div class="form-group"><div class="form-label">Vorname</div>
                  <input type="text" class="vorname"></div>
              </div><button class="btn-remove-author" onclick="this.closest('.author-block').remove()" title="Entfernen">×</button></div>`;
              list.appendChild(block);
            }
            if (block) {
              const nnEl = block.querySelector('.nachname');
              const vnEl = block.querySelector('.vorname');
              if (nnEl) nnEl.value = nn;
              if (vnEl) vnEl.value = vn;
            }
          });
        }
      }

      // Titel des Aufsatzes
      setField('titel', titel);

      // dok = "AJP 2020 S. 875" → zeitschrift=AJP, jahr=2020, seite_start=875
      if (dok) {
        const abk   = (dok.match(/^(\S+)/) || [])[1] || '';
        const jahrM = (dok.match(/\b(20\d{2}|19\d{2})\b/) || [])[1] || '';
        const allS  = [...dok.matchAll(/S\.\s*(\d+)/g)];
        const seite = allS.length > 0
          ? allS[allS.length - 1][1]
          : ((dok.match(/Nr\.\s*(\d+)/) || [])[1] || '');
        if (abk)   setField('zeitschrift', abk);
        if (jahrM) setField('jahr',        jahrM);
        if (seite) setField('seite_start', seite);
      }
    }

    // Import-Banner anzeigen
    const bannerGericht = type === 'zeitschrift' ? (autor || dok) : gericht;
    showExtensionImportBanner(bannerGericht, datum, dok, srcUrl);

    // URL säubern (damit Browser-Refresh nicht nochmals importiert)
    const cleanUrl = window.location.pathname;
    window.history.replaceState({}, '', cleanUrl);
  }, 150);
}

/** Zeigt ein kleines Banner über dem Formular: «Importiert von Quelle» */
function showExtensionImportBanner(gericht, datum, dok, srcUrl) {
  const formDiv = document.getElementById('dynamicForm');
  if (!formDiv) return;

  const existing = document.getElementById('extensionImportBanner');
  if (existing) existing.remove();

  const label = [dok, gericht, datum].filter(Boolean).join(' · ');
  const sourceLabel = srcUrl && /legalis\.ch/i.test(srcUrl)
    ? 'Legalis'
    : (srcUrl && /swisslex\.ch/i.test(srcUrl) ? 'Swisslex' : 'externer Quelle');
  const banner = document.createElement('div');
  banner.id = 'extensionImportBanner';
  banner.style.cssText = `
    display:flex; align-items:center; gap:10px;
    background:#f0f9f0; border:1.5px solid #7cb87c;
    border-radius:8px; padding:9px 12px; margin-bottom:14px;
    font-size:12px; color:#2e6b2e; line-height:1.4;
  `;
  banner.innerHTML = `
    <span style="font-size:18px; flex-shrink:0;">✅</span>
    <span>
      <strong>Von ${sourceLabel} importiert</strong><br>
      <span style="color:#555;">${label || 'Metadaten wurden vorausgefüllt'}</span>
      ${srcUrl ? `· <a href="${srcUrl}" target="_blank" style="color:#2e6b2e;">Quelle ↗</a>` : ''}
    </span>
    <button onclick="this.parentElement.remove()" style="margin-left:auto;background:none;border:none;cursor:pointer;color:#888;font-size:16px;">×</button>
  `;
  formDiv.insertBefore(banner, formDiv.firstChild);
}
