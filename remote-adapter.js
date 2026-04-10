function createLexCiteRemoteAdapter() {
  return {
    name: 'remote-transport-placeholder',
    capabilities: ['push', 'pull', 'status'],

    getConfig() {
      return typeof LexCiteBackendConfig !== 'undefined'
        ? LexCiteBackendConfig.get()
        : { provider: 'none', baseUrl: '', projectRef: '', syncEnabled: false, authMode: 'guest-only' };
    },

    getStatus() {
      const config = this.getConfig();
      const authenticated = typeof LexCiteSession !== 'undefined' && LexCiteSession.isAuthenticated();
      return {
        provider: config.provider,
        configured: config.provider !== 'none' && !!config.baseUrl && !!config.publishableKey,
        authenticated,
        syncEnabled: !!config.syncEnabled,
        transportReady: false,
      };
    },

    getRestHeaders() {
      const config = this.getConfig();
      return {
        'Content-Type': 'application/json',
        apikey: config.publishableKey,
        Authorization: `Bearer ${config.publishableKey}`,
      };
    },

    async submitSurveyResponse(payload) {
      const status = this.getStatus();
      if (typeof fetch === 'undefined') {
        return { ok: false, stage: 'fetch-missing', message: 'Fetch API ist in dieser Umgebung nicht verfügbar.', status };
      }
      if (!status.configured) {
        return { ok: false, stage: 'config-missing', message: 'Backend-Konfiguration unvollständig. Base URL oder Publishable Key fehlen.', status };
      }

      try {
        const endpoint = `${this.getConfig().baseUrl.replace(/\/$/, '')}/rest/v1/survey_responses`;
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            ...this.getRestHeaders(),
            Prefer: 'return=minimal',
          },
          body: JSON.stringify(payload),
        });

        const result = {
          ok: response.ok,
          stage: response.ok ? 'submitted' : 'http-error',
          message: response.ok
            ? 'Survey-Antwort erfolgreich an Supabase gesendet.'
            : `Survey-Antwort konnte nicht gespeichert werden (HTTP ${response.status}).`,
          status,
        };

        if (typeof LexCiteSyncJournal !== 'undefined') {
          LexCiteSyncJournal.add({
            action: 'survey-submit',
            provider: status.provider,
            status: result.ok ? 'ok' : 'error',
            message: result.message,
            fingerprint: payload?.fingerprint || '',
          });
        }

        return result;
      } catch (error) {
        const result = {
          ok: false,
          stage: 'network-error',
          message: 'Survey-Antwort konnte nicht an das Backend gesendet werden.',
          error: String(error),
          status,
        };
        if (typeof LexCiteSyncJournal !== 'undefined') {
          LexCiteSyncJournal.add({
            action: 'survey-submit',
            provider: status.provider,
            status: 'error',
            message: result.message,
            fingerprint: payload?.fingerprint || '',
          });
        }
        return result;
      }
    },

    async submitUsageEvent(payload) {
      const status = this.getStatus();
      if (typeof fetch === 'undefined') {
        return { ok: false, stage: 'fetch-missing', message: 'Fetch API ist in dieser Umgebung nicht verfügbar.', status };
      }
      if (!status.configured || !status.syncEnabled) {
        return { ok: false, stage: 'config-missing', message: 'Backend-Konfiguration unvollständig oder Synchronisierung nicht aktiviert.', status };
      }

      try {
        const endpoint = `${this.getConfig().baseUrl.replace(/\/$/, '')}/rest/v1/usage_events`;
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            ...this.getRestHeaders(),
            Prefer: 'return=minimal',
          },
          body: JSON.stringify(payload),
        });

        return {
          ok: response.ok,
          stage: response.ok ? 'submitted' : 'http-error',
          message: response.ok
            ? 'Usage-Event erfolgreich an Supabase gesendet.'
            : `Usage-Event konnte nicht gespeichert werden (HTTP ${response.status}).`,
          status,
        };
      } catch (error) {
        return {
          ok: false,
          stage: 'network-error',
          message: 'Usage-Event konnte nicht an das Backend gesendet werden.',
          error: String(error),
          status,
        };
      }
    },

    pushPayload(payload) {
      const status = this.getStatus();
      const result = {
        ok: false,
        stage: 'transport-missing',
        message: status.configured
          ? 'Remote-Transport ist noch nicht implementiert. Payload ist aber bereits backend-tauglich vorbereitet.'
          : 'Es gibt noch keine Backend-Konfiguration. Payload kann noch nicht übertragen werden.',
        payloadSummary: payload?.summary || null,
        status,
      };
      if (typeof LexCiteSyncJournal !== 'undefined') {
        LexCiteSyncJournal.add({
          action: 'push',
          provider: status.provider,
          status: result.ok ? 'ok' : 'pending',
          message: result.message,
          fingerprint: payload?.summary?.fingerprint || '',
        });
      }
      return result;
    },

    pullPayload() {
      const status = this.getStatus();
      const result = {
        ok: false,
        stage: 'transport-missing',
        message: status.configured
          ? 'Remote-Transport ist noch nicht implementiert. Ein späterer Pull würde hier projektbezogene Daten laden.'
          : 'Es gibt noch keine Backend-Konfiguration. Es kann noch nichts geladen werden.',
        payload: null,
        status,
      };
      if (typeof LexCiteSyncJournal !== 'undefined') {
        LexCiteSyncJournal.add({
          action: 'pull',
          provider: status.provider,
          status: result.ok ? 'ok' : 'pending',
          message: result.message,
          fingerprint: '',
        });
      }
      return result;
    },
  };
}

const LexCiteRemoteAdapter = createLexCiteRemoteAdapter();
window.__lexciteRemoteAdapterDebug = LexCiteRemoteAdapter;
