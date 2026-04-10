function computeWordDiff(orig, corr) {
  const tokA = orig.match(/[^\s]+|\s+/g) || [];
  const tokB = corr.match(/[^\s]+|\s+/g) || [];
  const n = tokA.length, m = tokB.length;
  const dp = Array.from({length: n + 1}, () => new Int32Array(m + 1));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      dp[i][j] = tokA[i] === tokB[j] ? dp[i+1][j+1] + 1 : Math.max(dp[i+1][j], dp[i][j+1]);
  const result = [];
  let i = 0, j = 0;
  while (i < n || j < m) {
    if (i < n && j < m && tokA[i] === tokB[j]) {
      result.push({t:'eq', s: tokA[i]}); i++; j++;
    } else if (j < m && (i >= n || dp[i][j+1] >= (i < n ? dp[i+1][j] : 0))) {
      result.push({t:'ins', s: tokB[j]}); j++;
    } else {
      result.push({t:'del', s: tokA[i]}); i++;
    }
  }
  return result;
}

function renderDiffHtml(diff) {
  return diff.map(d => {
    const e = esc(d.s);
    if (d.t === 'eq')  return `<span>${e}</span>`;
    if (d.t === 'ins') return `<span class="diff-ins">${e}</span>`;
    return `<span class="diff-del">${e}</span>`;
  }).join('');
}

// ── Main checker function ─────────────────────────────────────
// Step 1: detect type, show confirmation card
function checkCitation() {
  const input = (document.getElementById('checkerInput').value || '').trim();
  if (!input) { alert('Bitte zuerst ein Zitat einfügen.'); return; }

  const typeSel = document.getElementById('checkerTypeSelect').value;
  const type    = typeSel === 'auto' ? detectTypeFromText(input) : typeSel;
  const isAuto  = typeSel === 'auto';
  const color   = TYPE_COLORS[type] || '#888';

  // If type was manually selected OR auto-detect is certain (BGE/BGer), skip confirmation
  const certainTypes = new Set(['bge','bger']);
  if (!isAuto || certainTypes.has(type)) {
    runCheck(type);
    return;
  }

  // Show confirmation step
  const resultDiv = document.getElementById('checkerResult');
  resultDiv.innerHTML = `
    <div class="checker-confirm-card">
      <div class="checker-confirm-title">Erkannter Typ</div>
      <div class="checker-confirm-row">
        <span class="checker-type-badge" style="background:${color}18;color:${color};border-color:${color}55">
          ${TYPE_LABELS[type] || type}
        </span>
        <span class="checker-confirm-hint">Stimmt das?</span>
      </div>
      <div class="checker-confirm-actions">
        <button class="btn-check" onclick="runCheck('${type}')">✅ Ja, Prüfen →</button>
        <select id="checkerConfirmOverride" style="flex:1;padding:8px 10px;font-size:0.83em;border:1.5px solid var(--border);border-radius:var(--radius-sm);background:var(--surface);color:var(--text)">
          <option value="">Nein, Typ korrigieren…</option>
          <option value="bge">BGE</option>
          <option value="bger">BGer</option>
          <option value="bvge">BVGE / BVGer</option>
          <option value="kantonal">Kantonal</option>
          <option value="monographie">Monographie</option>
          <option value="dissertation">Dissertation</option>
          <option value="zeitschrift">Zeitschrift</option>
          <option value="kommentar">Kommentar</option>
          <option value="sammelband">Sammelband</option>
          <option value="materialien">Materialien</option>
          <option value="gesetz">Gesetz / Erlass</option>
          <option value="internet">Internet</option>
        </select>
        <button class="btn-check" style="background:var(--muted)" onclick="confirmOverride()">Trotzdem prüfen →</button>
      </div>
    </div>`;
  resultDiv.style.display = 'block';
}

function confirmOverride() {
  const sel = document.getElementById('checkerConfirmOverride');
  const override = sel ? sel.value : '';
  const typeSel = document.getElementById('checkerTypeSelect').value;
  const input   = (document.getElementById('checkerInput').value || '').trim();
  const fallback = typeSel === 'auto' ? detectTypeFromText(input) : typeSel;
  runCheck(override || fallback);
}

// Step 2: run actual check with confirmed type
function runCheck(type) {
  const input     = (document.getElementById('checkerInput').value || '').trim();
  if (!input) return;
  const formatSel = document.getElementById('checkerFormatSelect').value;
  const rule      = GUIDE_RULES[type];
  const typeLabel = TYPE_LABELS[type] || type;
  const color     = TYPE_COLORS[type] || '#888';
  const isAuto    = document.getElementById('checkerTypeSelect').value === 'auto';

  // Try to regenerate a corrected version for rule-driven citation types
  let corrected = null;
  if (rule?.regenerate) corrected = rule.regenerate(input, formatSel);
  else if (type === 'bge') corrected = regenerateBGE(input);
  else if (type === 'bger') corrected = regenerateBGer(input);
  else if (type === 'bvge') corrected = regenerateBVGE(input);

  const template = rule?.template ? rule.template(formatSel) : ((FORMAT_TEMPLATES[type] || {})[formatSel] || '—');
  const issues   = getIssues(input, type, formatSel);

  // Diff: against re-generated version (BGE/BGer) or template (others)
  const diffTarget = corrected || template;
  const diff       = computeWordDiff(input, diffTarget);
  const hasDiff    = diff.some(d => d.t !== 'eq');

  const issuesHtml = issues.length
    ? `<div class="checker-issues">${issues.map(i => `<div class="checker-issue">${i}</div>`).join('')}</div>`
    : `<div class="checker-ok">✅ Keine offensichtlichen Formatfehler erkannt.</div>`;

  const correctedHtml = corrected
    ? `<div class="checker-col">
        <div class="checker-col-label">Korrekte Version</div>
        <div class="checker-text template">${esc(corrected)}</div>
       </div>`
    : `<div class="checker-col">
        <div class="checker-col-label">Format-Schema (${formatSel === 'voll' ? 'Vollzitat' : formatSel === 'kurz' ? 'Kurzzitat' : 'Verzeichnis'})</div>
        <div class="checker-text template">${esc(template)}</div>
       </div>`;

  const diffHtml = hasDiff ? `
    <div class="checker-diff-wrap">
      <div class="checker-col-label" style="margin-bottom:6px">Diff: dein Zitat vs. ${corrected ? 'korrekte Version' : 'Format-Schema'}</div>
      <div class="checker-diff">${renderDiffHtml(diff)}</div>
      <div class="checker-diff-legend">
        <span class="diff-ins-sample">grün = erwartet, bei dir fehlend</span>
        <span class="diff-del-sample">rot = bei dir vorhanden, nicht erwartet</span>
      </div>
    </div>` : '';

  const copyTarget = corrected || template;

  document.getElementById('checkerResult').style.display = 'block';
  document.getElementById('checkerResult').innerHTML = `
    <div class="checker-detected">
      <span class="checker-type-badge" style="background:${color}18;color:${color};border-color:${color}55">${typeLabel}</span>
      <span class="checker-detected-label">${isAuto ? 'automatisch erkannt' : 'manuell gewählt'}</span>
    </div>
    <div class="checker-compare">
      <div class="checker-col">
        <div class="checker-col-label">Dein Zitat</div>
        <div class="checker-text original">${esc(input)}</div>
      </div>
      ${correctedHtml}
    </div>
    ${issuesHtml}
    ${diffHtml}
    <button class="btn-checker-copy" onclick="copyCheckerResult()"
      data-copy="${esc(copyTarget).replace(/"/g,'&quot;')}">
      📋 ${corrected ? 'Korrekte Version kopieren' : 'Format-Schema kopieren'}
    </button>
  `;
  // Scroll into view smoothly
  document.getElementById('checkerResult').scrollIntoView({behavior:'smooth', block:'nearest'});
}

function copyCheckerResult() {
  const btn = document.querySelector('.btn-checker-copy');
  if (!btn) return;
  // Decode HTML entities for clipboard
  const tmp = document.createElement('textarea');
  tmp.innerHTML = btn.dataset.copy;
  navigator.clipboard.writeText(tmp.value);
  const orig = btn.textContent;
  btn.textContent = '✅ Kopiert!';
  setTimeout(() => btn.textContent = orig, 2000);
}

