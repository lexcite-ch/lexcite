const LEXCITE_SESSION_KEYS = {
  mode: 'lexcite_session_mode',
  user: 'lexcite_session_user',
};

function createGuestSession() {
  return {
    mode: 'guest',
    user: null,
    scope: 'guest:local',
  };
}

function emitLexCiteSessionChange(state) {
  if (typeof document === 'undefined' || !document.dispatchEvent || typeof CustomEvent === 'undefined') return;
  document.dispatchEvent(new CustomEvent('lexcite:session-change', {
    detail: {
      mode: state.mode,
      scope: state.scope,
      userId: state.user?.id || null,
    },
  }));
}

const LexCiteSession = {
  state: createGuestSession(),

  load() {
    const mode = localStorage.getItem(LEXCITE_SESSION_KEYS.mode);
    const rawUser = localStorage.getItem(LEXCITE_SESSION_KEYS.user);
    let user = null;
    if (rawUser) {
      try {
        user = JSON.parse(rawUser);
      } catch (error) {
        console.warn('LexCiteSession: user parse failed', error);
      }
    }

    if (mode === 'user' && user?.id) {
      this.state = {
        mode: 'user',
        user,
        scope: `user:${user.id}`,
      };
      return;
    }

    this.state = createGuestSession();
  },

  save() {
    localStorage.setItem(LEXCITE_SESSION_KEYS.mode, this.state.mode);
    if (this.state.user) {
      localStorage.setItem(LEXCITE_SESSION_KEYS.user, JSON.stringify(this.state.user));
    } else {
      localStorage.removeItem(LEXCITE_SESSION_KEYS.user);
    }
    emitLexCiteSessionChange(this.state);
  },

  setGuestMode() {
    this.state = createGuestSession();
    this.save();
  },

  setUser(user) {
    if (!user?.id) throw new Error('LexCiteSession: user id required');
    this.state = {
      mode: 'user',
      user,
      scope: `user:${user.id}`,
    };
    this.save();
  },

  isAuthenticated() {
    return this.state.mode === 'user' && !!this.state.user?.id;
  },

  getScope() {
    return this.state.scope || 'guest:local';
  },

  getScopedStorageKey(baseKey) {
    return `${this.getScope()}:${baseKey}`;
  },

  getDebugInfo() {
    return {
      mode: this.state.mode,
      scope: this.getScope(),
      userId: this.state.user?.id || null,
    };
  },
};

LexCiteSession.load();
window.__lexciteSessionDebug = LexCiteSession;
