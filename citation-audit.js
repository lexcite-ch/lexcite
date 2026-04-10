// ══════════════════════════════════════════════════════════════
//  ZITAT-PRÜFER
// ══════════════════════════════════════════════════════════════

function getSuggestedFormatForType(type) {
  if (type === 'gesetz' || type === 'materialien') return 'verz';
  return 'voll';
}

function getCorrectedCitation(text, type, formatSel) {
  const rule = GUIDE_RULES[type];
  if (rule?.regenerate) return rule.regenerate(text, formatSel);
  if (type === 'bge') return regenerateBGE(text);
  if (type === 'bger') return regenerateBGer(text);
  if (type === 'bvge') return regenerateBVGE(text);
  return null;
}

function analyzeCitationText(text, forcedType, forcedFormat) {
  const citation = (text || '').trim();
  const type = forcedType || detectTypeFromText(citation);
  const formatSel = forcedFormat || getSuggestedFormatForType(type);
  const corrected = getCorrectedCitation(citation, type, formatSel);
  const issues = getIssues(citation, type, formatSel) || [];
  const warningCount = issues.filter(i => i.includes('⚠️')).length;
  const trust = getTrustMeta(issues.length, warningCount);
  return { citation, type, formatSel, corrected, issues, warningCount, trust };
}

let lastBulkCheckResults = [];

function parseBulkFootnotes(raw) {
  const source = (raw || '').replace(/\r/g, '').trim();
  if (!source) return [];

  if (/\n\s*\n/.test(source)) {
    return source
      .split(/\n\s*\n+/)
      .map(chunk => chunk.replace(/^\s*(?:\d+[\)\].:-]?\s+)?/, '').replace(/\s*\n\s*/g, ' ').trim())
      .filter(Boolean);
  }

  const lines = source.split('\n').map(line => line.trim()).filter(Boolean);
  const items = [];
  let current = '';

  lines.forEach(line => {
    const numbered = line.match(/^\s*(?:\d+[\)\].:-]|[\u2022\-])\s+(.*)$/);
    if (numbered) {
      if (current) items.push(current.trim());
      current = numbered[1].trim();
      return;
    }
    if (!current) {
      current = line;
    } else {
      current += ' ' + line;
    }
  });

  if (current) items.push(current.trim());
  return items.filter(Boolean);
}

function loadBulkCheckerExample() {
  const el = document.getElementById('bulkCheckerInput');
  if (!el) return;
  el.value = [
    '1. BGer 9C_355/2023 vom 07.09.2023',
    '2. KOLLER Alfred, Schweizerisches Obligationenrecht, Bern 2017, S. 44.',
    '3. Botschaft zur Volksinitiative «Gegen neue Kampfflugzeuge» vom 26. August 2009, BBl 2009 S. 5975 ff.'
  ].join('\n');
}

function clearBulkChecker() {
  const input = document.getElementById('bulkCheckerInput');
  const result = document.getElementById('bulkCheckerResult');
  if (input) input.value = '';
  if (result) {
    result.style.display = 'none';
    result.innerHTML = '';
  }
  lastBulkCheckResults = [];
  const copyBtn = document.getElementById('bulkCopyBtn');
  const applyBtn = document.getElementById('bulkApplyBtn');
  if (copyBtn) copyBtn.disabled = true;
  if (applyBtn) applyBtn.disabled = true;
}

function runBulkFootnoteCheck() {
  const input = document.getElementById('bulkCheckerInput');
  const result = document.getElementById('bulkCheckerResult');
  const lines = parseBulkFootnotes(input?.value || '');

  if (!lines.length) {
    alert('Bitte zuerst eine oder mehrere Fussnoten eingeben.');
    return;
  }

  if (typeof LexCiteUsage !== 'undefined') {
    LexCiteUsage.trackBulkCheck(lines.length);
  }

  const analyses = lines.slice(0, 20).map((line, index) => ({ index: index + 1, ...analyzeCitationText(line) }));
  lastBulkCheckResults = analyses;
  const high = analyses.filter(x => x.trust.level === 'high').length;
  const medium = analyses.filter(x => x.trust.level === 'medium').length;
  const low = analyses.filter(x => x.trust.level === 'low').length;
  const correctedCount = analyses.filter(x => x.corrected && x.corrected !== x.citation).length;
  const copyBtn = document.getElementById('bulkCopyBtn');
  const applyBtn = document.getElementById('bulkApplyBtn');
  if (copyBtn) copyBtn.disabled = correctedCount === 0;
  if (applyBtn) applyBtn.disabled = correctedCount === 0;

  result.style.display = 'block';
  result.innerHTML = `
    <div class="bulk-checker-summary">
      ${analyses.length} Fussnote(n) geprüft. ${high} wirken stabil, ${medium} sollten kurz geprüft werden und ${low} brauchen eher eine manuelle Kontrolle. Für ${correctedCount} Fussnote(n) gibt es einen direkten Korrekturvorschlag.
    </div>
    <div class="bulk-checker-list">
      ${analyses.map(item => {
        const typeLabel = TYPE_LABELS[item.type] || item.type;
        const boxClass = item.trust.level === 'high' ? 'ok' : item.trust.level === 'low' ? 'danger' : 'warn';
        const issueHtml = item.issues.length
          ? `<div class="bulk-checker-item-list">${item.issues.slice(0, 4).map(issue => `<div>${issue}</div>`).join('')}</div>`
          : `<div class="bulk-checker-item-list"><div>Keine offensichtlichen Formatprobleme erkannt.</div></div>`;
        const correctedHtml = item.corrected && item.corrected !== item.citation
          ? `<div class="checker-col-label" style="margin-top:10px">Korrekturvorschlag</div><div class="checker-text template">${esc(item.corrected)}</div>`
          : '';
        return `<div class="bulk-checker-item ${boxClass}">
          <div class="bulk-checker-item-head">
            <div class="bulk-checker-item-title">Fussnote ${item.index} · ${typeLabel}</div>
            <span class="trust-badge ${item.trust.level}">${item.trust.label}</span>
          </div>
          <div class="bulk-checker-item-meta">Empfohlene Ansicht: ${item.formatSel === 'verz' ? 'Verzeichniseintrag' : item.formatSel === 'kurz' ? 'Kurzzitat' : 'Vollzitat / Fussnote'}</div>
          <div class="bulk-checker-item-text">${esc(item.citation)}</div>
          ${issueHtml}
          ${correctedHtml}
        </div>`;
      }).join('')}
    </div>
  `;
  result.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function getBulkCorrectedText() {
  if (!lastBulkCheckResults.length) return '';
  return lastBulkCheckResults
    .map(item => item.corrected && item.corrected !== item.citation ? item.corrected : item.citation)
    .join('\n');
}

function copyBulkCheckerResults() {
  const text = getBulkCorrectedText();
  if (!text) return;
  navigator.clipboard.writeText(text);
  const btn = document.getElementById('bulkCopyBtn');
  if (!btn) return;
  const orig = btn.textContent;
  btn.textContent = 'Kopiert!';
  setTimeout(() => { btn.textContent = orig; }, 1400);
}

function applyBulkCheckerResults() {
  const input = document.getElementById('bulkCheckerInput');
  const text = getBulkCorrectedText();
  if (!input || !text) return;
  input.value = text;
  input.focus();
}

function runConsistencyAudit() {
  const result = document.getElementById('consistencyResult');
  if (!result) return;

  if (!savedCitations.length) {
    result.style.display = 'block';
    result.innerHTML = `
      <div class="consistency-summary">Noch keine gespeicherten Quellen vorhanden. Speichere zuerst ein paar Zitate, damit LexCite die Arbeit auf Konsistenz prüfen kann.</div>
      <div class="consistency-list">
        <div class="consistency-item ok">
          <div class="consistency-item-head"><div class="consistency-item-title">Bereit für den Audit</div></div>
          <div class="consistency-item-text">Sobald du Quellen speicherst, prüft dieser Bereich doppelte Einträge, fehlende Erwägungen, fehlende Stichwörter und weitere typische Schwachstellen.</div>
        </div>
      </div>
    `;
    return;
  }

  const findings = [];
  const normMap = new Map();
  const looseMap = new Map();
  savedCitations.forEach(c => {
    const key = normalizeCitation(c.fullText || '');
    const looseKey = getLooseCitationKey(c.fullText || '');
    if (!key) return;
    if (!normMap.has(key)) normMap.set(key, []);
    normMap.get(key).push(c);
    if (looseKey) {
      if (!looseMap.has(looseKey)) looseMap.set(looseKey, []);
      looseMap.get(looseKey).push(c);
    }
  });
  const duplicates = [...normMap.values()].filter(group => group.length > 1);
  if (duplicates.length) {
    findings.push({
      level: 'danger',
      title: 'Doppelte Quellen gespeichert',
      text: `${duplicates.length} Zitat(e) sind mehrfach im Workspace vorhanden.`,
      items: duplicates.slice(0, 4).map(group => group[0].fullText),
    });
  }

  const looseDuplicates = [...looseMap.values()].filter(group => {
    if (group.length < 2) return false;
    const exactKeys = new Set(group.map(item => normalizeCitation(item.fullText || '')));
    return exactKeys.size > 1;
  });
  if (looseDuplicates.length) {
    findings.push({
      level: 'warn',
      title: 'Mögliche Dubletten mit leicht anderer Schreibweise',
      text: 'Einige Quellen sehen inhaltlich gleich aus, unterscheiden sich aber nur in Details wie Zeichensetzung, ff.-Angaben oder zit.-Zusätzen.',
      items: looseDuplicates.slice(0, 4).map(group => group.map(item => item.fullText).join('  |  ')),
    });
  }

  const literature = savedCitations.filter(c => !isJudikatur(c.type) && !isMaterial(c.type));
  const authorCounts = {};
  literature.forEach(c => {
    const key = getAuthorGroupKey(c);
    if (!key) return;
    authorCounts[key] = (authorCounts[key] || 0) + 1;
  });
  const missingStichwort = literature.filter(c => {
    const key = getAuthorGroupKey(c);
    return key && authorCounts[key] > 1 && !c.stichwort;
  });
  if (missingStichwort.length) {
    findings.push({
      level: 'warn',
      title: 'Mehrere Werke derselben Autorenschaft ohne Stichwort',
      text: 'Bei mehreren Werken derselben Autorenschaft wird ein zit. Stichwort wichtig, damit Folgefussnoten konsistent bleiben.',
      items: missingStichwort.slice(0, 4).map(c => c.fullText),
    });
  }

  const missingErwaegung = savedCitations.filter(c =>
    isJudikatur(c.type) &&
    !/\bE\.\s*\d/i.test(`${c.fullText} ${c.kurzText || ''}`)
  );
  if (missingErwaegung.length) {
    findings.push({
      level: 'warn',
      title: 'Judikatur ohne erkennbare Erwägung',
      text: 'Wenn du auf eine konkrete Stelle eines Entscheids verweist, sollte eine Erwägung angegeben sein.',
      items: missingErwaegung.slice(0, 4).map(c => c.fullText),
    });
  }

  const weakMaterials = savedCitations.filter(c =>
    c.type === 'materialien' &&
    !/\(zit\./i.test(c.fullText) &&
    !/^Amtl\.\s*Bull\./i.test(c.fullText)
  );
  if (weakMaterials.length) {
    findings.push({
      level: 'warn',
      title: 'Materialien ohne zit. Stichwort',
      text: 'Bei Botschaften und Berichten erhöht ein zit. Stichwort die Konsistenz in Folgefussnoten deutlich.',
      items: weakMaterials.slice(0, 4).map(c => c.fullText),
    });
  }

  const lowTrust = savedCitations
    .map(c => ({ citation: c, trust: getCitationTrustState(c) }))
    .filter(x => x.trust.level !== 'high');
  if (lowTrust.length) {
    findings.push({
      level: 'warn',
      title: 'Quellen mit mittlerem oder niedrigem Vertrauensstand',
      text: 'Diese Einträge solltest du kurz gegen den Guide oder das Original prüfen.',
      items: lowTrust.slice(0, 5).map(x => `${x.citation.typeLabel}: ${x.citation.fullText}`),
    });
  }

  const mixedAuthorGroups = Object.entries(authorCounts)
    .filter(([, count]) => count > 1)
    .map(([author]) => {
      const entries = literature.filter(c => getAuthorGroupKey(c) === author);
      const withStichwort = entries.filter(c => !!c.stichwort).length;
      return { author, entries, withStichwort };
    })
    .filter(group => group.withStichwort > 0 && group.withStichwort < group.entries.length);
  if (mixedAuthorGroups.length) {
    findings.push({
      level: 'warn',
      title: 'Stichwörter innerhalb derselben Autorenschaft uneinheitlich',
      text: 'Bei mehreren Werken derselben Autorenschaft sollten die zit. Stichwörter konsequent verwendet werden, nicht nur bei einzelnen Einträgen.',
      items: mixedAuthorGroups.slice(0, 4).map(group => `${group.author}: ${group.entries.map(entry => entry.stichwort ? `${entry.stichwort}` : 'ohne Stichwort').join(', ')}`),
    });
  }

  const weakLaws = savedCitations.filter(c =>
    c.type === 'gesetz' &&
    !/(SR|LS|SAR|BSG)\s*\d/.test(`${c.fullText} ${c.kurzText || ''}`)
  );
  if (weakLaws.length) {
    findings.push({
      level: 'warn',
      title: 'Gesetze ohne erkennbare systematische Nummer',
      text: 'Bei vollständigen Gesetzesangaben sollte die systematische Nummer wie SR, LS, SAR oder BSG vorhanden sein.',
      items: weakLaws.slice(0, 4).map(c => c.fullText),
    });
  }

  const weakInternet = savedCitations.filter(c =>
    c.type === 'internet' &&
    (!/besucht am/i.test(c.fullText || '') || !/(https?:\/\/|www\.)/.test(c.fullText || ''))
  );
  if (weakInternet.length) {
    findings.push({
      level: 'warn',
      title: 'Internetquellen mit unvollständigem Vollzitat',
      text: 'Internetfundstellen sollten im Vollzitat sowohl URL als auch Besuchsdatum enthalten.',
      items: weakInternet.slice(0, 4).map(c => c.fullText),
    });
  }

  const weakShortForms = savedCitations.filter(c => {
    if (!c.kurzText) return false;
    if (c.type === 'kommentar') return !/\bN\s*\d+/.test(c.kurzText);
    if (c.type === 'internet') return !/\b(N\s*\d+|S\.\s*\d+|Ziff\.\s*\d+|Kapitel|Abschnitt)\b/i.test(c.kurzText);
    if (c.type === 'bger' || c.type === 'bvge' || c.type === 'kantonal') return !/\bE\.\s*[\dA-Za-z.]+/.test(c.kurzText);
    return false;
  });
  if (weakShortForms.length) {
    findings.push({
      level: 'warn',
      title: 'Kurzangaben mit schwacher Fundstelle',
      text: 'Einige gespeicherte Kurzangaben sind für Folgefussnoten noch zu unpräzise und sollten nachgeschärft werden.',
      items: weakShortForms.slice(0, 5).map(c => `${c.typeLabel}: ${c.kurzText}`),
    });
  }

  const suspiciousJournalTitles = savedCitations.filter(c =>
    c.type === 'zeitschrift' &&
    !/\b(AJP|ZSR|ZBJV|SJZ|BJM|HAVE|Jusletter|plädoyer|ZBl|recht|SZZP|ZZZ)\b/.test(c.fullText || '')
  );
  if (suspiciousJournalTitles.length) {
    findings.push({
      level: 'warn',
      title: 'Zeitschriften ohne klare Abkürzung',
      text: 'Bei Zeitschriftenartikeln sollte die in der juristischen Praxis übliche Zeitschriftenabkürzung erkennbar sein.',
      items: suspiciousJournalTitles.slice(0, 4).map(c => c.fullText),
    });
  }

  const dueDate = projectMeta?.dueDate ? new Date(projectMeta.dueDate + 'T00:00:00') : null;
  if (dueDate && !Number.isNaN(dueDate.getTime())) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.round((dueDate.getTime() - today.getTime()) / 86400000);
    if (diffDays < 0) {
      findings.push({
        level: 'danger',
        title: 'Abgabedatum liegt bereits in der Vergangenheit',
        text: 'Das gespeicherte Projekt ist überfällig. Prüfe, ob das Datum noch stimmt oder ob LexCite auf ein neues Projekt umgestellt werden sollte.',
        items: [`Projekt: ${projectMeta.title || 'ohne Titel'} — Abgabe: ${projectMeta.dueDate}`],
      });
    } else if (diffDays <= 7) {
      findings.push({
        level: 'warn',
        title: 'Abgabe in den nächsten 7 Tagen',
        text: 'Kurz vor der Abgabe steigt das Risiko, dass uneinheitliche Kurzformen oder fehlende Details unbemerkt bleiben.',
        items: [`Noch ${diffDays} Tag${diffDays === 1 ? '' : 'e'} bis zur Abgabe (${projectMeta.dueDate})`],
      });
    }
  }

  if (!findings.length) {
    result.style.display = 'block';
    result.innerHTML = `
      <div class="consistency-summary">Starker Zwischenstand: Die gespeicherten Quellen zeigen aktuell keine offensichtlichen Konsistenzprobleme.</div>
      <div class="consistency-list">
        <div class="consistency-item ok">
          <div class="consistency-item-head"><div class="consistency-item-title">Audit bestanden</div></div>
          <div class="consistency-item-text">Keine offensichtlichen Doppelungen, keine sofort sichtbaren Schwachstellen bei Stichwörtern oder Erwägungen. Genau dieser Kontroll-Layer ist später ein echter Produktvorteil.</div>
        </div>
      </div>
    `;
    return;
  }

  result.style.display = 'block';
  result.innerHTML = `
    <div class="consistency-summary">
      ${findings.length} Bereich(e) sollten geprüft werden. Das ist nicht schlimm, sondern genau der Mehrwert eines späteren Abgabe-Sicherheits-Workflows.
    </div>
    <div class="consistency-list">
      ${findings.map(item => `
        <div class="consistency-item ${item.level}">
          <div class="consistency-item-head">
            <div class="consistency-item-title">${esc(item.title)}</div>
          </div>
          <div class="consistency-item-text">${esc(item.text)}</div>
          <div class="consistency-item-list">
            ${item.items.map(entry => `<div>${esc(entry)}</div>`).join('')}
          </div>
        </div>
      `).join('')}
    </div>
  `;
}


// ── Type detection from pasted text ──────────────────────────
