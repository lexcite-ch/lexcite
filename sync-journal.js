const LEXCITE_SYNC_JOURNAL_KEY = 'lexcite_sync_journal';
const LEXCITE_SYNC_JOURNAL_LIMIT = 12;

const LexCiteSyncJournal = {
  read() {
    try {
      const raw = localStorage.getItem(LEXCITE_SYNC_JOURNAL_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.warn('LexCiteSyncJournal: read failed', error);
      return [];
    }
  },

  write(entries) {
    localStorage.setItem(LEXCITE_SYNC_JOURNAL_KEY, JSON.stringify(entries.slice(0, LEXCITE_SYNC_JOURNAL_LIMIT)));
    this.render();
  },

  add(entry) {
    const nextEntry = {
      at: new Date().toISOString(),
      action: entry?.action || 'unknown',
      provider: entry?.provider || 'none',
      status: entry?.status || 'info',
      message: entry?.message || '',
      fingerprint: entry?.fingerprint || '',
    };
    this.write([nextEntry, ...this.read()]);
  },

  clear() {
    localStorage.removeItem(LEXCITE_SYNC_JOURNAL_KEY);
    this.render();
  },

  render() {
    const root = document.getElementById('syncJournalList');
    if (!root) return;
    const entries = this.read();
    if (!entries.length) {
      root.innerHTML = '<div class="sync-journal-empty">Noch keine Sync-Ereignisse protokolliert.</div>';
      return;
    }

    root.innerHTML = entries.map(entry => `
      <div class="sync-journal-item">
        <div class="sync-journal-top">
          <strong>${entry.action}</strong>
          <span>${new Date(entry.at).toLocaleString('de-CH')}</span>
        </div>
        <div class="sync-journal-meta">${entry.provider} · ${entry.status}${entry.fingerprint ? ` · ${entry.fingerprint}` : ''}</div>
        <div class="sync-journal-message">${entry.message}</div>
      </div>
    `).join('');
  },
};

document.addEventListener('DOMContentLoaded', () => {
  LexCiteSyncJournal.render();
});

window.__lexciteSyncJournalDebug = LexCiteSyncJournal;
