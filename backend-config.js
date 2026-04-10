const LEXCITE_BACKEND_DEFAULTS = {
  provider: 'none',
  baseUrl: '',
  projectRef: '',
  publishableKey: '',
  syncEnabled: false,
  authMode: 'guest-only',
};

const LEXCITE_BACKEND_PROFILES = {
  none: {
    label: 'Kein Backend',
    provider: 'none',
    baseUrl: '',
    projectRef: '',
    publishableKey: '',
    syncEnabled: false,
    authMode: 'guest-only',
  },
  supabase: {
    label: 'Supabase',
    provider: 'supabase',
    baseUrl: 'https://demo-project.supabase.co',
    projectRef: 'demo-project',
    publishableKey: 'sb_publishable_demo',
    syncEnabled: true,
    authMode: 'magic-link',
  },
  custom: {
    label: 'Eigenes Backend',
    provider: 'custom',
    baseUrl: 'https://api.lexcite.local',
    projectRef: 'lexcite-app',
    publishableKey: 'public-demo-key',
    syncEnabled: true,
    authMode: 'session-token',
  },
};

const LexCiteBackendConfig = {
  key: 'lexcite_backend_config',
  config: { ...LEXCITE_BACKEND_DEFAULTS },

  load() {
    try {
      const raw = localStorage.getItem(this.key);
      if (!raw) return this.config;
      const parsed = JSON.parse(raw);
      this.config = { ...LEXCITE_BACKEND_DEFAULTS, ...(parsed || {}) };
    } catch (error) {
      console.warn('LexCiteBackendConfig: load failed', error);
      this.config = { ...LEXCITE_BACKEND_DEFAULTS };
    }
    return this.config;
  },

  save(nextConfig) {
    this.config = { ...LEXCITE_BACKEND_DEFAULTS, ...(nextConfig || {}) };
    localStorage.setItem(this.key, JSON.stringify(this.config));
    this.emitChange();
  },

  get() {
    return { ...this.config };
  },

  setProvider(provider, options = {}) {
    this.save({
      ...this.config,
      provider,
      ...options,
    });
  },

  applyProfile(profileKey) {
    const profile = LEXCITE_BACKEND_PROFILES[profileKey];
    if (!profile) return;
    this.save(profile);
  },

  getProfileLabel() {
    const key = this.config.provider in LEXCITE_BACKEND_PROFILES ? this.config.provider : 'none';
    return LEXCITE_BACKEND_PROFILES[key]?.label || 'Unbekannt';
  },

  renderForm() {
    const providerEl = document.getElementById('backendProvider');
    const baseUrlEl = document.getElementById('backendBaseUrl');
    const projectRefEl = document.getElementById('backendProjectRef');
    const publishableKeyEl = document.getElementById('backendPublishableKey');
    const authModeEl = document.getElementById('backendAuthMode');
    const syncEnabledEl = document.getElementById('backendSyncEnabled');
    const summaryEl = document.getElementById('backendConfigSummary');

    if (providerEl) providerEl.value = this.config.provider || 'none';
    if (baseUrlEl) baseUrlEl.value = this.config.baseUrl || '';
    if (projectRefEl) projectRefEl.value = this.config.projectRef || '';
    if (publishableKeyEl) publishableKeyEl.value = this.config.publishableKey || '';
    if (authModeEl) authModeEl.value = this.config.authMode || 'guest-only';
    if (syncEnabledEl) syncEnabledEl.checked = !!this.config.syncEnabled;
    if (summaryEl) {
      summaryEl.textContent = this.isRemoteConfigured()
        ? `Aktive Konfiguration: ${this.getProfileLabel()} · ${this.config.baseUrl}`
        : 'Aktive Konfiguration: noch lokal ohne Remote-Backend';
    }
  },

  saveFromForm() {
    const providerEl = document.getElementById('backendProvider');
    const baseUrlEl = document.getElementById('backendBaseUrl');
    const projectRefEl = document.getElementById('backendProjectRef');
    const publishableKeyEl = document.getElementById('backendPublishableKey');
    const authModeEl = document.getElementById('backendAuthMode');
    const syncEnabledEl = document.getElementById('backendSyncEnabled');

    this.save({
      provider: providerEl?.value || 'none',
      baseUrl: (baseUrlEl?.value || '').trim(),
      projectRef: (projectRefEl?.value || '').trim(),
      publishableKey: (publishableKeyEl?.value || '').trim(),
      authMode: authModeEl?.value || 'guest-only',
      syncEnabled: !!syncEnabledEl?.checked,
    });

    if (typeof LexCiteSyncJournal !== 'undefined') {
      LexCiteSyncJournal.add({
        action: 'config',
        provider: this.config.provider,
        status: 'saved',
        message: this.isRemoteConfigured()
          ? `Backend-Konfiguration gespeichert (${this.getProfileLabel()}).`
          : 'Backend-Konfiguration lokal gespeichert.',
        fingerprint: '',
      });
    }
  },

  applyProfileAndRender(profileKey) {
    this.applyProfile(profileKey);
    this.renderForm();
  },

  isRemoteConfigured() {
    return this.config.provider !== 'none' && !!this.config.baseUrl && !!this.config.publishableKey;
  },

  emitChange() {
    if (typeof document === 'undefined' || !document.dispatchEvent || typeof CustomEvent === 'undefined') return;
    document.dispatchEvent(new CustomEvent('lexcite:backend-config-change', {
      detail: this.get(),
    }));
  },
};

LexCiteBackendConfig.load();
document.addEventListener('DOMContentLoaded', () => {
  LexCiteBackendConfig.renderForm();
});
if (typeof document !== 'undefined' && document.addEventListener) {
  document.addEventListener('lexcite:backend-config-change', () => {
    LexCiteBackendConfig.renderForm();
  });
}
window.__lexciteBackendConfigDebug = LexCiteBackendConfig;
