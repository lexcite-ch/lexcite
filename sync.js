const LexCiteSync = {
  status: {
    provider: 'none',
    syncEnabled: false,
    authMode: 'guest-only',
    remoteConfigured: false,
    state: 'local-only',
    lastSyncAt: null,
    message: 'Noch keine Backend-Verbindung konfiguriert.',
  },

  init() {
    this.refreshStatus();
  },

  refreshStatus() {
    const config = typeof LexCiteBackendConfig !== 'undefined'
      ? LexCiteBackendConfig.get()
      : { provider: 'none', syncEnabled: false, authMode: 'guest-only', baseUrl: '' };
    const remoteConfigured = typeof LexCiteBackendConfig !== 'undefined' && LexCiteBackendConfig.isRemoteConfigured();
    const authenticated = typeof LexCiteSession !== 'undefined' && LexCiteSession.isAuthenticated();

    let state = 'local-only';
    let message = 'Noch keine Backend-Verbindung konfiguriert.';

    if (remoteConfigured && !config.syncEnabled) {
      state = 'configured-paused';
      message = 'Backend ist vorbereitet, aber Synchronisierung ist noch deaktiviert.';
    } else if (remoteConfigured && config.syncEnabled && !authenticated) {
      state = 'awaiting-auth';
      message = 'Backend ist bereit. Für echten Sync fehlt nur noch der Login-Flow.';
    } else if (remoteConfigured && config.syncEnabled && authenticated) {
      state = 'ready-to-sync';
      message = 'Backend und Session sind bereit. Als Nächstes kann der echte Sync-Transport angebunden werden.';
    }

    this.status = {
      provider: config.provider,
      syncEnabled: !!config.syncEnabled,
      authMode: config.authMode,
      remoteConfigured,
      state,
      lastSyncAt: this.status.lastSyncAt,
      message,
    };

    this.render();
  },

  markSyncAttempt() {
    this.status.lastSyncAt = new Date().toISOString();
    this.render();
  },

  getStatusLabel() {
    const map = {
      'local-only': 'Nur lokal',
      'configured-paused': 'Backend vorbereitet',
      'awaiting-auth': 'Wartet auf Login',
      'ready-to-sync': 'Sync-ready',
    };
    return map[this.status.state] || 'Unbekannt';
  },

  getProviderLabel() {
    if (this.status.provider === 'none') return 'Provider: noch keiner';
    return `Provider: ${this.status.provider}`;
  },

  getLastSyncLabel() {
    if (!this.status.lastSyncAt) return 'Noch kein Sync-Versuch protokolliert';
    return `Letzter Sync-Versuch: ${new Date(this.status.lastSyncAt).toLocaleString('de-CH')}`;
  },

  render() {
    const chip = document.getElementById('syncStatusChip');
    const text = document.getElementById('syncStatusText');
    const provider = document.getElementById('syncProviderText');
    const profile = document.getElementById('syncProfileText');
    const auth = document.getElementById('syncAuthText');
    const lastSync = document.getElementById('syncLastSyncText');
    const payload = document.getElementById('syncPayloadText');
    const payloadMeta = document.getElementById('syncPayloadMeta');
    const transport = document.getElementById('syncTransportText');

    if (chip) {
      chip.textContent = this.getStatusLabel();
      chip.className = `account-mode-chip ${this.status.state === 'ready-to-sync' ? 'account' : 'guest'}`;
    }
    if (text) text.textContent = this.status.message;
    if (provider) provider.textContent = this.getProviderLabel();
    if (profile && typeof LexCiteBackendConfig !== 'undefined') profile.textContent = `Profil: ${LexCiteBackendConfig.getProfileLabel()}`;
    if (auth) auth.textContent = `Auth-Modus: ${this.status.authMode}`;
    if (lastSync) lastSync.textContent = this.getLastSyncLabel();
    if (payload && typeof LexCiteSyncPayload !== 'undefined') {
      payload.textContent = LexCiteSyncPayload.getSummaryLines().join(' · ');
    }
    if (payloadMeta) {
      payloadMeta.textContent = 'Die Sync-Payload ist provider-unabhängig modelliert: Quellen, Abkürzungen, Projekt, Tracker und Einstellungen.';
    }
    if (transport && typeof LexCiteRemoteAdapter !== 'undefined') {
      const status = LexCiteRemoteAdapter.getStatus();
      transport.textContent = status.transportReady
        ? 'Transport: bereit'
        : 'Transport: Platzhalter aktiv, push/pull noch nicht angebunden';
    }
  },

  simulateSupabaseConfig() {
    if (typeof LexCiteBackendConfig === 'undefined') return;
    LexCiteBackendConfig.applyProfileAndRender('supabase');
    this.markSyncAttempt();
    this.refreshStatus();
  },

  simulateCustomBackendConfig() {
    if (typeof LexCiteBackendConfig === 'undefined') return;
    LexCiteBackendConfig.applyProfileAndRender('custom');
    this.markSyncAttempt();
    this.refreshStatus();
  },

  resetConfig() {
    if (typeof LexCiteBackendConfig === 'undefined') return;
    LexCiteBackendConfig.save({ ...LEXCITE_BACKEND_DEFAULTS });
    this.refreshStatus();
  },

  simulatePush() {
    if (typeof LexCiteRemoteAdapter === 'undefined' || typeof LexCiteSyncPayload === 'undefined') return;
    const result = LexCiteRemoteAdapter.pushPayload(LexCiteSyncPayload.build());
    this.markSyncAttempt();
    this.status.message = result.message;
    this.render();
  },

  simulatePull() {
    if (typeof LexCiteRemoteAdapter === 'undefined') return;
    const result = LexCiteRemoteAdapter.pullPayload();
    this.markSyncAttempt();
    this.status.message = result.message;
    this.render();
  },
};

document.addEventListener('DOMContentLoaded', () => {
  LexCiteSync.init();
});

if (typeof document !== 'undefined' && document.addEventListener) {
  document.addEventListener('lexcite:session-change', () => {
    LexCiteSync.refreshStatus();
  });
  document.addEventListener('lexcite:backend-config-change', () => {
    LexCiteSync.refreshStatus();
  });
  document.addEventListener('lexcite:sync-payload-change', () => {
    LexCiteSync.render();
  });
}

window.__lexciteSyncDebug = LexCiteSync;
