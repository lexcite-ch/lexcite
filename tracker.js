// ══════════════════════════════════════════════════════════════
//  QUELLENTRACKER
// ══════════════════════════════════════════════════════════════

const TRACKER_TYPES = [
  { key: 'bge',         label: 'BGE',          color: '#3B6FFF' },
  { key: 'bger',        label: 'BGer',          color: '#7C3AED' },
  { key: 'monographie',  label: 'Monographie',   color: '#0891B2' },
  { key: 'dissertation', label: 'Dissertation',  color: '#0E7490' },
  { key: 'zeitschrift',  label: 'Zeitschrift',   color: '#059669' },
  { key: 'kommentar',   label: 'Kommentar',     color: '#D97706' },
  { key: 'kantonal',    label: 'Kantonal',      color: '#DC2626' },
  { key: 'sammelband',  label: 'Sammelband',    color: '#16A34A' },
  { key: 'gesetz',      label: 'Gesetz/Erlass', color: '#4B5563' },
  { key: 'internet',    label: 'Internet',      color: '#DB2777' },
];

// Zähler + bereits gezählte Zitate aus Storage laden
let citationCounts  = LexCiteStorage.getJSON(LEXCITE_STORAGE_KEYS.trackerCounts, {});
let trackedTexts    = new Set(LexCiteStorage.getJSON(LEXCITE_STORAGE_KEYS.trackerTexts, []));
let trackerGoal     = LexCiteStorage.getNumber(LEXCITE_STORAGE_KEYS.trackerGoal, 10);

// Normalisiert einen Zitattext als eindeutigen Schlüssel
function normalizeCitation(text) {
  return text.trim().replace(/\s+/g, ' ').toLowerCase();
}

function getAuthorGroupKey(citation) {
  return (String(citation?.fullText || '').match(/^([A-ZÄÖÜ][A-ZÄÖÜ\s]+?)(?:\s[A-Z][a-z]|\s+u\.a\.|,)/) || [])[1]?.trim() || '';
}

function getLooseCitationKey(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/\(zit\.[^)]+\)/g, '')
    .replace(/\bff?\.\b/g, '')
    .replace(/[.,;:()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Ziel-Input auf gespeicherten Wert setzen
document.addEventListener('DOMContentLoaded', () => {
  const gi = document.getElementById('goalInput');
  if (gi) { gi.value = trackerGoal; }
  updateTrackerDisplay();
});

const TRACKER_PAGE_LABELS = {
  zitieren: 'Zitieren',
  prüfen: 'Prüfen',
  quellen: 'Quellen',
  tracker: 'Tracker',
};

const TRACKER_SOURCE_LABELS = {
  bge: 'BGE',
  bger: 'BGer',
  bvge: 'BVGE / BVGer',
  kommentar: 'Kommentar',
  materialien: 'Materialien',
  gesetz: 'Gesetz / Erlass',
  monographie: 'Monographie',
  dissertation: 'Dissertation',
  zeitschrift: 'Zeitschrift',
  sammelband: 'Sammelband',
  internet: 'Internet',
  kantonal: 'Kantonal',
};

function getTopEntry(record = {}) {
  const entries = Object.entries(record).sort((a, b) => b[1] - a[1]);
  return entries[0] || null;
}

function getSavedTypeCounts() {
  return savedCitations.reduce((acc, citation) => {
    const type = citation?.type || '';
    if (type) acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});
}

function formatSurveyAnswerLabel(value) {
  if (!value) return 'Noch keine Antworten';
  return `${value} CHF / Semester`;
}

function formatStudyProgramLabel(value) {
  if (!value) return 'Noch keine Angabe';
  if (value === 'wirtschaftsrecht') return 'Wirtschaftsrecht';
  if (value === 'angewandtes_recht') return 'Angewandtes Recht';
  if (value === 'anderes') return 'Andere Richtung';
  return value;
}

function formatUsageEventLabel(event, meta = {}) {
  if (event === 'page_switch') return `Seitenwechsel: ${TRACKER_PAGE_LABELS[meta.page] || meta.page || 'Unbekannt'}`;
  if (event === 'pdf_upload') return 'PDF hochgeladen';
  if (event === 'source_type_select') return `Quellentyp: ${TRACKER_SOURCE_LABELS[meta.type] || meta.type || 'Unbekannt'}`;
  if (event === 'citation_save') return `Gespeichert: ${TRACKER_SOURCE_LABELS[meta.type] || meta.type || 'Quelle'}`;
  if (event === 'bulk_check') return `Mehrfach-Prüfung (${meta.count || 0})`;
  if (event === 'survey_show') return 'Preisfrage gezeigt';
  if (event === 'survey_answer') return `Semesterpass: ${meta.answer || 'Antwort'}`;
  if (event === 'survey_study_program') return `Studiengang: ${formatStudyProgramLabel(meta.program || '')}`;
  if (event === 'survey_dismiss') return 'Preisfrage geschlossen';
  return event;
}

function formatUsageEventTime(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' });
}

function updateFounderInsights() {
  const wrap = document.getElementById('founderInsights');
  if (!wrap) return;
  const usage = typeof LexCiteUsage !== 'undefined' ? LexCiteUsage.getSnapshot() : null;
  const topPage = getTopEntry(usage?.pageViews || {});
  const topSourceType = getTopEntry(usage?.sourceTypes || {});
  const topSurvey = getTopEntry(usage?.surveyAnswers || {});
  const topStudyProgram = getTopEntry(usage?.studyPrograms || {});
  const savedTypeCounts = getSavedTypeCounts();
  const topSavedType = getTopEntry(savedTypeCounts);
  const totalSaved = savedCitations.length;
  const pdfUploads = usage?.counts?.pdf_upload || 0;
  const saveEvents = usage?.counts?.citation_save || 0;

  const topPageEl = document.getElementById('insightTopPage');
  const topSourceEl = document.getElementById('insightTopSourceType');
  const savesEl = document.getElementById('insightCitationSaves');
  const surveyEl = document.getElementById('insightSurveyTop');
  const studyProgramEl = document.getElementById('insightStudyProgramTop');
  const valueTypeEl = document.getElementById('insightValueType');
  const pdfUsageEl = document.getElementById('insightPdfUsage');
  const pageListEl = document.getElementById('insightPageList');
  const sourceTypeListEl = document.getElementById('insightSourceTypeList');
  const recentListEl = document.getElementById('insightRecentList');
  const interpretationEl = document.getElementById('insightInterpretation');

  if (topPageEl) {
    topPageEl.textContent = topPage
      ? `${TRACKER_PAGE_LABELS[topPage[0]] || topPage[0]} · ${topPage[1]}`
      : 'Noch keine Daten';
  }
  if (topSourceEl) {
    topSourceEl.textContent = topSourceType
      ? `${TRACKER_SOURCE_LABELS[topSourceType[0]] || topSourceType[0]} · ${topSourceType[1]}`
      : 'Noch keine Daten';
  }
  if (savesEl) {
    savesEl.textContent = String(usage?.counts?.citation_save || 0);
  }
  if (surveyEl) {
    surveyEl.textContent = topSurvey
      ? `${formatSurveyAnswerLabel(topSurvey[0])} · ${topSurvey[1]}`
      : 'Noch keine Antworten';
  }
  if (studyProgramEl) {
    studyProgramEl.textContent = topStudyProgram
      ? `${formatStudyProgramLabel(topStudyProgram[0])} · ${topStudyProgram[1]}`
      : 'Noch keine Angaben';
  }
  if (valueTypeEl) {
    valueTypeEl.textContent = topSavedType
      ? `${TRACKER_SOURCE_LABELS[topSavedType[0]] || topSavedType[0]} · ${topSavedType[1]} gespeichert`
      : 'Noch keine Daten';
  }
  if (pdfUsageEl) {
    pdfUsageEl.textContent = pdfUploads > 0
      ? `${pdfUploads} Uploads · ${saveEvents} Saves`
      : 'Bisher ohne PDF-Upload';
  }

  if (pageListEl) {
    const topPages = Object.entries(usage?.pageViews || {})
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);
    pageListEl.innerHTML = topPages.length
      ? topPages.map(([page, count]) => `
          <div class="founder-insights-list-item">
            <strong>${TRACKER_PAGE_LABELS[page] || page}</strong>
            <span class="meta">${count}</span>
          </div>`).join('')
      : '<div class="founder-insights-empty">Sobald du die Bereiche nutzt, siehst du hier, wo LexCite am meisten Wert stiftet.</div>';
  }

  if (sourceTypeListEl) {
    const topSavedTypes = Object.entries(savedTypeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);
    sourceTypeListEl.innerHTML = topSavedTypes.length
      ? topSavedTypes.map(([type, count]) => {
          const pct = totalSaved > 0 ? Math.round((count / totalSaved) * 100) : 0;
          return `
            <div class="founder-insights-list-item">
              <strong>${TRACKER_SOURCE_LABELS[type] || type}</strong>
              <span class="meta">${count} · ${pct}%</span>
            </div>`;
        }).join('')
      : '<div class="founder-insights-empty">Sobald Quellen gespeichert werden, siehst du hier, welche Typen tatsächlich Usage erzeugen.</div>';
  }

  if (recentListEl) {
    const recentEvents = (usage?.recent || []).slice(0, 4);
    recentListEl.innerHTML = recentEvents.length
      ? recentEvents.map(item => `
          <div class="founder-insights-list-item">
            <span>${formatUsageEventLabel(item.event, item.meta || {})}</span>
            <span class="meta">${formatUsageEventTime(item.at)}</span>
          </div>`).join('')
      : '<div class="founder-insights-empty">Noch keine Signale vorhanden. Nach ein paar Klicks wird dieser Bereich automatisch gefüllt.</div>';
  }

  if (interpretationEl) {
    if (topSavedType && totalSaved >= 3) {
      interpretationEl.innerHTML = `<strong>${TRACKER_SOURCE_LABELS[topSavedType[0]] || topSavedType[0]}</strong> ist aktuell dein stärkster Use Case. Das ist ein gutes Signal dafür, wo du zuerst weiter schärfen und testen solltest.`;
    } else if (topSurvey) {
      interpretationEl.innerHTML = `Die häufigste Preisantwort ist aktuell <strong>${formatSurveyAnswerLabel(topSurvey[0])}</strong>. Beobachte, wie sich das verändert, wenn du Vertrauens- und Produkttexte weiter schärfst.`;
    } else if (pdfUploads > 0 && saveEvents === 0) {
      interpretationEl.innerHTML = 'Es gibt bereits PDF-Nutzung, aber noch keine gespeicherten Zitate. Das deutet eher auf Exploration als auf klaren Produkt-Value hin.';
    } else {
      interpretationEl.innerHTML = 'Sobald echte Nutzung zusammenkommt, siehst du hier, welche Fälle wirklich ziehen und was du als Nächstes priorisieren solltest.';
    }
  }
}

function toggleFounderInsights(forceState) {
  const wrap = document.getElementById('founderInsights');
  if (!wrap) return;
  const shouldOpen = typeof forceState === 'boolean' ? forceState : !wrap.classList.contains('open');
  wrap.classList.toggle('open', shouldOpen);
  if (shouldOpen) updateFounderInsights();
}

function resetFounderInsights() {
  if (typeof LexCiteUsage === 'undefined') return;
  if (!confirm('Founder-Insights wirklich zurücksetzen?')) return;
  LexCiteUsage.reset();
  updateFounderInsights();
}

function trackCitation(type, citationText) {
  const key = normalizeCitation(citationText || '');

  // Duplikat-Schutz: gleiches Zitat nicht nochmals zählen
  if (key && trackedTexts.has(key)) {
    // Kurz visuelles Feedback: Tracker kurz aufleuchten lassen
    const wrap = document.getElementById('trackerWrap');
    wrap.style.transition = 'box-shadow 0.2s';
    wrap.style.boxShadow = '0 0 0 3px rgba(217,119,6,0.35)';
    setTimeout(() => { wrap.style.boxShadow = ''; }, 600);
    showDuplicateHint();
    return;
  }

  // Neu: Zitat registrieren
  if (key) {
    trackedTexts.add(key);
    LexCiteStorage.setJSON(LEXCITE_STORAGE_KEYS.trackerTexts, [...trackedTexts]);
  }
  citationCounts[type] = (citationCounts[type] || 0) + 1;
  LexCiteStorage.setJSON(LEXCITE_STORAGE_KEYS.trackerCounts, citationCounts);
  if (typeof notifyLexCiteSyncPayloadChanged === 'function') notifyLexCiteSyncPayloadChanged();
  hideDuplicateHint();
  updateTrackerDisplay();
  // No auto-navigation — user stays on current page; tracker tab shows updated count
}

function showDuplicateHint() {
  let hint = document.getElementById('trackerDupHint');
  if (!hint) {
    hint = document.createElement('div');
    hint.id = 'trackerDupHint';
    hint.style.cssText = 'font-size:0.8em;color:#92600A;background:#FFFBEB;border:1px solid #FDE68A;border-radius:7px;padding:7px 12px;margin-bottom:12px;display:flex;align-items:center;gap:7px;';
    hint.innerHTML = '⚠️ Dieses Zitat wurde bereits gezählt und wird nicht doppelt erfasst.';
    document.getElementById('trackerWrap').insertBefore(hint, document.getElementById('trackerBanner'));
  }
  hint.style.display = 'flex';
  clearTimeout(hint._timer);
  hint._timer = setTimeout(() => { hint.style.display = 'none'; }, 3500);
}

function hideDuplicateHint() {
  const hint = document.getElementById('trackerDupHint');
  if (hint) hint.style.display = 'none';
}

function resetTracker() {
  if (!confirm('Quellentracker zurücksetzen?')) return;
  citationCounts = {};
  trackedTexts   = new Set();
  LexCiteStorage.remove(LEXCITE_STORAGE_KEYS.trackerCounts);
  LexCiteStorage.remove(LEXCITE_STORAGE_KEYS.trackerTexts);
  if (typeof notifyLexCiteSyncPayloadChanged === 'function') notifyLexCiteSyncPayloadChanged();
  hideDuplicateHint();
  updateTrackerDisplay();
}

function updateTrackerDisplay() {
  // Ziel aktualisieren
  const gi = document.getElementById('goalInput');
  trackerGoal = Math.max(1, parseInt(gi?.value) || 10);
  LexCiteStorage.set(LEXCITE_STORAGE_KEYS.trackerGoal, String(trackerGoal));
  if (typeof notifyLexCiteSyncPayloadChanged === 'function') notifyLexCiteSyncPayloadChanged();

  // Zähle aus gespeicherten Quellen (nicht aus Generierungen)
  const savedCounts = {};
  savedCitations.forEach(c => { savedCounts[c.type] = (savedCounts[c.type] || 0) + 1; });
  const total    = savedCitations.length;
  const maxCount = Math.max(...Object.values(savedCounts), 1);
  const pct      = Math.min(100, (total / trackerGoal) * 100);
  const complete = total >= trackerGoal;

  // Progress bar
  const fill = document.getElementById('trackerFill');
  const text = document.getElementById('trackerText');
  fill.style.width = pct + '%';
  fill.classList.toggle('complete', complete);
  text.textContent = `${total} / ${trackerGoal} gespeicherte Quellen`;
  text.classList.toggle('complete', complete);

  // Ziel-Banner
  const banner = document.getElementById('trackerBanner');
  document.getElementById('bannerCount').textContent = total;
  banner.classList.toggle('visible', complete);

  // Leer-Hinweis
  document.getElementById('trackerEmpty').classList.toggle('visible', total === 0);

  // Typ-Kacheln rendern
  const container = document.getElementById('trackerTypes');
  container.innerHTML = TRACKER_TYPES.map(({ key, label, color }) => {
    const count  = savedCounts[key] || 0;
    const barPct = Math.round((count / maxCount) * 100);
    const isActive = count > 0;
    return `
      <div class="tracker-type-row ${isActive ? 'active' : ''}" style="--type-color:${color}">
        <div class="tracker-type-dot"></div>
        <span class="tracker-type-name">${label}</span>
        <div class="tracker-type-bar-wrap">
          <div class="tracker-type-bar-fill" style="width:${barPct}%"></div>
        </div>
        <span class="tracker-type-count">${count > 0 ? count : '–'}</span>
      </div>`;
  }).join('');

  // Quellenvielfalt-Warnung (ebenfalls auf savedCounts basierend)
  updateDiversityWarning(total, savedCounts);
  updateFounderInsights();
}

function updateDiversityWarning(total, counts) {
  counts = counts || {};
  let warn = document.getElementById('diversityWarning');
  if (!warn) {
    warn = document.createElement('div');
    warn.id = 'diversityWarning';
    warn.className = 'diversity-warning';
    document.getElementById('trackerWrap').appendChild(warn);
  }
  if (total < 3) { warn.classList.remove('visible'); return; }

  const usedTypes = Object.keys(counts).filter(k => counts[k] > 0);
  const dominant  = usedTypes.sort((a,b) => counts[b]-counts[a])[0];
  const domCount  = counts[dominant] || 0;
  const domPct    = Math.round((domCount / total) * 100);
  const hasSecLit = (counts['monographie']||0) + (counts['dissertation']||0) + (counts['zeitschrift']||0) + (counts['sammelband']||0) + (counts['kommentar']||0);
  const hasCaseLaw= (counts['bge']||0) + (counts['bger']||0) + (counts['kantonal']||0);

  let msg = '';
  if (domPct >= 70) {
    msg = `⚠️ <strong>${domPct}% deiner Quellen sind ${TYPE_LABELS[dominant] || dominant}.</strong> Prüfe ob du genug Vielfalt hast — die meisten Arbeiten erwarten eine Mischung aus Rechtsprechung und Literatur.`;
  } else if (total >= 5 && hasSecLit === 0) {
    msg = '📚 <strong>Noch keine Sekundärliteratur</strong> (Monographien, Zeitschriften, Kommentare). Viele Arbeiten verlangen mindestens einige Literaturquellen neben der Rechtsprechung.';
  } else if (total >= 5 && hasCaseLaw === 0) {
    msg = '⚖️ <strong>Noch keine Rechtsprechung</strong> (BGE, BGer, Kantonal). Eine juristische Arbeit stützt sich typischerweise auch auf Entscheide.';
  }

  if (msg) { warn.innerHTML = msg; warn.classList.add('visible'); }
  else { warn.classList.remove('visible'); }
}

// ── Onboarding Modal ─────────────────────────────────────────────────────────
function closeOnboarding() {
  LexCiteStorage.setBoolFlag(LEXCITE_STORAGE_KEYS.onboarded, true);
  const el = document.getElementById('onboardingModal');
  if (el) {
    el.style.transition = 'opacity 0.3s';
    el.style.opacity = '0';
    setTimeout(() => { el.style.display = 'none'; el.style.opacity = ''; el.style.transition = ''; }, 300);
  }
}

function maybeShowOnboarding() {
  if (!LexCiteStorage.getBoolFlag(LEXCITE_STORAGE_KEYS.onboarded)) {
    const el = document.getElementById('onboardingModal');
    if (el) {
      el.style.display = 'flex';
      el.style.opacity = '0';
      requestAnimationFrame(() => {
        el.style.transition = 'opacity 0.35s';
        el.style.opacity = '1';
        setTimeout(() => { el.style.transition = ''; }, 400);
      });
    }
  }
}
