const LEXCITE_STORAGE_KEYS = {
  darkMode: 'lexcite_dark',
  customAbbr: 'lexcite_abbr_custom',
  savedCitations: 'lexcite_saved',
  projectMeta: 'lexcite_project_meta',
  trackerCounts: 'lexcite_counts',
  trackerTexts: 'lexcite_texts',
  trackerGoal: 'lexcite_goal',
  onboarded: 'lexcite_onboarded',
  pricingSurvey: 'lexcite_pricing_survey',
  usageStats: 'lexcite_usage_stats',
};

function createLocalStorageAdapter() {
  return {
    name: 'local-browser',
    capabilities: ['read', 'write', 'remove'],
    get(key) {
      return localStorage.getItem(key);
    },
    set(key, value) {
      localStorage.setItem(key, value);
    },
    remove(key) {
      localStorage.removeItem(key);
    },
  };
}

function createCloudReadyStorageAdapter() {
  const local = createLocalStorageAdapter();
  return {
    name: 'cloud-ready-local-fallback',
    capabilities: ['read', 'write', 'remove', 'sync-ready'],
    get: local.get,
    set: local.set,
    remove: local.remove,
  };
}

const LEXCITE_SCOPE_MIGRATION_PREFIX = 'lexcite_scope_migrated';

const LexCiteStorage = {
  adapter: createLocalStorageAdapter(),
  adapterMode: 'local',

  getMigrationMarker(scope) {
    return `${LEXCITE_SCOPE_MIGRATION_PREFIX}:${scope}`;
  },

  getScopedKey(key) {
    if (typeof LexCiteSession === 'undefined') return key;
    return LexCiteSession.getScopedStorageKey(key);
  },

  get(key, fallback = null) {
    const scopedKey = this.getScopedKey(key);
    const value = this.adapter.get(scopedKey);
    if (value == null && scopedKey !== key) {
      const legacyValue = this.adapter.get(key);
      return legacyValue == null ? fallback : legacyValue;
    }
    return value == null ? fallback : value;
  },

  set(key, value) {
    this.adapter.set(this.getScopedKey(key), value);
  },

  remove(key) {
    this.adapter.remove(this.getScopedKey(key));
  },

  getJSON(key, fallback) {
    const raw = this.get(key, null);
    if (raw == null || raw === '') return fallback;
    try {
      return JSON.parse(raw);
    } catch (error) {
      console.warn('LexCiteStorage: JSON parse failed for', key, error);
      return fallback;
    }
  },

  setJSON(key, value) {
    this.set(key, JSON.stringify(value));
  },

  getNumber(key, fallback = 0) {
    const raw = this.get(key, null);
    const parsed = raw == null ? Number.NaN : Number.parseInt(raw, 10);
    return Number.isNaN(parsed) ? fallback : parsed;
  },

  getBoolFlag(key) {
    return this.get(key) === '1';
  },

  setBoolFlag(key, value) {
    this.set(key, value ? '1' : '0');
  },

  useAdapter(adapter) {
    this.adapter = adapter;
    this.adapterMode = adapter?.name || 'unknown';
  },

  getAdapterInfo() {
    return {
      mode: this.adapterMode,
      capabilities: [...(this.adapter?.capabilities || [])],
    };
  },

  syncAdapterWithSession() {
    const wantsCloudReady = typeof LexCiteSession !== 'undefined' && LexCiteSession.isAuthenticated();
    this.useAdapter(wantsCloudReady ? createCloudReadyStorageAdapter() : createLocalStorageAdapter());
  },

  ensureScopeSeeded(keys = Object.values(LEXCITE_STORAGE_KEYS)) {
    if (typeof LexCiteSession === 'undefined') return;
    const scope = LexCiteSession.getScope();
    const marker = this.getMigrationMarker(scope);
    if (this.adapter.get(marker) === '1') return;

    keys.forEach(key => {
      const scopedKey = this.getScopedKey(key);
      if (this.adapter.get(scopedKey) != null) return;

      const guestScopedKey = `guest:local:${key}`;
      const guestValue = this.adapter.get(guestScopedKey);
      if (guestValue != null) {
        this.adapter.set(scopedKey, guestValue);
        return;
      }

      const legacyValue = this.adapter.get(key);
      if (legacyValue != null) {
        this.adapter.set(scopedKey, legacyValue);
      }
    });

    this.adapter.set(marker, '1');
  },

  migrateLegacyKeys(keys = Object.values(LEXCITE_STORAGE_KEYS)) {
    keys.forEach(key => {
      const scopedKey = this.getScopedKey(key);
      if (scopedKey === key) return;
      const scopedValue = this.adapter.get(scopedKey);
      const legacyValue = this.adapter.get(key);
      if (scopedValue == null && legacyValue != null) {
        this.adapter.set(scopedKey, legacyValue);
      }
    });
  },
};

LexCiteStorage.syncAdapterWithSession();
LexCiteStorage.migrateLegacyKeys();
LexCiteStorage.ensureScopeSeeded();

if (typeof document !== 'undefined' && document.addEventListener) {
  document.addEventListener('lexcite:session-change', () => {
    LexCiteStorage.syncAdapterWithSession();
    LexCiteStorage.migrateLegacyKeys();
    LexCiteStorage.ensureScopeSeeded();
  });
}
