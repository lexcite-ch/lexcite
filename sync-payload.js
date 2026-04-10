const LEXCITE_SYNC_SCHEMA_VERSION = 1;

function lexCiteStableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map(lexCiteStableStringify).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${lexCiteStableStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function lexCiteHashString(input) {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function lexCiteNormalizeCitationForSync(item) {
  return {
    id: item?.id || null,
    type: item?.type || '',
    typeLabel: item?.typeLabel || '',
    fullText: item?.fullText || '',
    kurzText: item?.kurzText || '',
    stichwort: item?.stichwort || '',
    date: item?.date || '',
  };
}

function lexCiteGetWorkspaceSnapshot() {
  const citations = Array.isArray(window.savedCitations) ? window.savedCitations : [];
  const abbreviations = window.userAbbrMap && typeof window.userAbbrMap === 'object' ? window.userAbbrMap : {};
  const project = window.projectMeta && typeof window.projectMeta === 'object'
    ? window.projectMeta
    : { title: '', course: '', dueDate: '', notes: '' };
  const trackerCountsValue = window.citationCounts && typeof window.citationCounts === 'object' ? window.citationCounts : {};
  const trackedTextsValue = window.trackedTexts instanceof Set
    ? [...window.trackedTexts]
    : Array.isArray(window.trackedTexts) ? window.trackedTexts : [];
  const trackerGoalValue = typeof window.trackerGoal === 'number' ? window.trackerGoal : 10;

  return {
    citations: citations.map(lexCiteNormalizeCitationForSync),
    abbreviations: Object.keys(abbreviations).sort().reduce((acc, key) => {
      acc[key] = abbreviations[key];
      return acc;
    }, {}),
    project: {
      title: project.title || '',
      course: project.course || '',
      dueDate: project.dueDate || '',
      notes: project.notes || '',
    },
    tracker: {
      goal: trackerGoalValue,
      counts: trackerCountsValue,
      trackedTexts: trackedTextsValue,
    },
    preferences: {
      darkMode: typeof LexCiteStorage !== 'undefined'
        ? LexCiteStorage.getBoolFlag(LEXCITE_STORAGE_KEYS.darkMode)
        : false,
      onboarded: typeof LexCiteStorage !== 'undefined'
        ? LexCiteStorage.getBoolFlag(LEXCITE_STORAGE_KEYS.onboarded)
        : false,
    },
  };
}

const LexCiteSyncPayload = {
  build() {
    const snapshot = lexCiteGetWorkspaceSnapshot();
    const payloadData = {
      citations: snapshot.citations,
      abbreviations: snapshot.abbreviations,
      project: snapshot.project,
      tracker: snapshot.tracker,
      preferences: snapshot.preferences,
    };

    const serialized = lexCiteStableStringify(payloadData);
    const fingerprint = lexCiteHashString(serialized);

    return {
      schemaVersion: LEXCITE_SYNC_SCHEMA_VERSION,
      generatedAt: new Date().toISOString(),
      session: typeof LexCiteSession !== 'undefined' && LexCiteSession.getDebugInfo
        ? LexCiteSession.getDebugInfo()
        : { mode: 'guest', scope: 'guest:local', userId: null },
      backend: typeof LexCiteBackendConfig !== 'undefined'
        ? LexCiteBackendConfig.get()
        : { provider: 'none', baseUrl: '', projectRef: '', syncEnabled: false, authMode: 'guest-only' },
      summary: {
        citationCount: snapshot.citations.length,
        abbreviationCount: Object.keys(snapshot.abbreviations).length,
        hasProject: !!(snapshot.project.title || snapshot.project.course || snapshot.project.dueDate || snapshot.project.notes),
        trackerGoal: snapshot.tracker.goal,
        fingerprint,
      },
      data: payloadData,
    };
  },

  getSummaryLines(payload = this.build()) {
    return [
      `Schema: v${payload.schemaVersion}`,
      `Quellen: ${payload.summary.citationCount}`,
      `Abkürzungen: ${payload.summary.abbreviationCount}`,
      `Projekt: ${payload.summary.hasProject ? 'ja' : 'nein'}`,
      `Tracker-Ziel: ${payload.summary.trackerGoal}`,
      `Fingerprint: ${payload.summary.fingerprint}`,
    ];
  },
};

function notifyLexCiteSyncPayloadChanged() {
  if (typeof document === 'undefined' || !document.dispatchEvent || typeof CustomEvent === 'undefined') return;
  document.dispatchEvent(new CustomEvent('lexcite:sync-payload-change', {
    detail: LexCiteSyncPayload.build().summary,
  }));
}

window.notifyLexCiteSyncPayloadChanged = notifyLexCiteSyncPayloadChanged;
window.__lexciteSyncPayloadDebug = LexCiteSyncPayload;
