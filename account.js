const LexCiteAccount = {
  storageAdapterMode: 'local',

  init() {
    this.syncStorageAdapter();
    this.render();
  },

  syncStorageAdapter() {
    this.storageAdapterMode = LexCiteSession?.isAuthenticated?.() ? 'cloud-ready' : 'local';
  },

  getMode() {
    return LexCiteSession?.isAuthenticated?.() ? 'account' : 'guest';
  },

  getModeLabel() {
    return this.getMode() === 'account' ? 'Nutzerkonto aktiv' : 'Gastmodus aktiv';
  },

  getModeDescription() {
    if (this.getMode() === 'account') {
      return 'Deine Daten sind bereits an ein Nutzerprofil gebunden. Als Nächstes könnte LexCite sie später serverseitig synchronisieren.';
    }
    return 'Aktuell läuft LexCite lokal im Browser. Deine Daten bleiben auf diesem Gerät, bis wir Cloud-Sync und Login anbinden.';
  },

  getScopeLabel() {
    const scope = LexCiteSession?.getScope?.() || 'guest:local';
    return scope === 'guest:local' ? 'Scope: Gast · nur dieses Gerät' : `Scope: ${scope}`;
  },

  getStorageLabel() {
    const info = typeof LexCiteStorage !== 'undefined' && LexCiteStorage.getAdapterInfo
      ? LexCiteStorage.getAdapterInfo()
      : { mode: this.storageAdapterMode };
    return info.mode === 'cloud-ready-local-fallback'
      ? 'Speicheradapter: cloud-ready, aktuell noch lokal gespiegelt'
      : 'Speicheradapter: lokal im Browser';
  },

  getRoadmapLabel() {
    return this.getMode() === 'account'
      ? 'Nächster technischer Schritt: echtes Backend und Synchronisierung aktivieren.'
      : 'Später möglich: Magic Link oder Google/Apple Login mit geräteübergreifenden Projekten.';
  },

  render() {
    const modeChip = document.getElementById('accountModeChip');
    const modeText = document.getElementById('accountModeText');
    const scopeText = document.getElementById('accountScopeText');
    const storageText = document.getElementById('accountStorageText');
    const roadmapText = document.getElementById('accountRoadmapText');
    const guestBtn = document.getElementById('accountGuestBtn');

    if (modeChip) {
      modeChip.textContent = this.getModeLabel();
      modeChip.className = `account-mode-chip ${this.getMode() === 'account' ? 'account' : 'guest'}`;
    }
    if (modeText) modeText.textContent = this.getModeDescription();
    if (scopeText) scopeText.textContent = this.getScopeLabel();
    if (storageText) storageText.textContent = this.getStorageLabel();
    if (roadmapText) roadmapText.textContent = this.getRoadmapLabel();
    if (guestBtn) guestBtn.disabled = this.getMode() === 'guest';
  },

  activateGuestMode() {
    LexCiteSession.setGuestMode();
    this.syncStorageAdapter();
    this.render();
    if (typeof renderProjectMeta === 'function') renderProjectMeta();
    if (typeof renderSavedCitations === 'function') renderSavedCitations();
    if (typeof renderAbbrList === 'function') renderAbbrList();
    if (typeof updateTrackerDisplay === 'function') updateTrackerDisplay();
  },

  simulateAccountMode() {
    LexCiteSession.setUser({
      id: 'demo-user',
      email: 'demo@lexcite.local',
      provider: 'prototype',
    });
    this.syncStorageAdapter();
    this.render();
    if (typeof renderProjectMeta === 'function') renderProjectMeta();
    if (typeof renderSavedCitations === 'function') renderSavedCitations();
    if (typeof renderAbbrList === 'function') renderAbbrList();
    if (typeof updateTrackerDisplay === 'function') updateTrackerDisplay();
  },
};

document.addEventListener('DOMContentLoaded', () => {
  LexCiteAccount.init();
});

if (typeof document !== 'undefined' && document.addEventListener) {
  document.addEventListener('lexcite:session-change', () => {
    LexCiteAccount.syncStorageAdapter();
    LexCiteAccount.render();
  });
}

window.__lexciteAccountDebug = LexCiteAccount;
