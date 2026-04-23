const LEXCITE_PRICING_SURVEY_VERSION = 'v11-entry-popup-study-program';

const LEXCITE_PRICING_SURVEY_DEFAULT = {
  version: LEXCITE_PRICING_SURVEY_VERSION,
  choice: '',
  answeredAt: '',
  dismissed: false,
  remoteSubmitted: false,
  remoteSubmittedAt: '',
  remoteError: '',
  studyProgram: '',
  studyProgramAnsweredAt: '',
  followupSkipped: false,
  modalClosed: false,
};

const LexCitePricingSurvey = {
  options: [
    { value: '3', label: '3 CHF / Semester' },
    { value: '5', label: '5 CHF / Semester' },
    { value: '9', label: '9 CHF / Semester' },
    { value: '19', label: '19 CHF / Semester' },
  ],

  studyPrograms: [
    { value: 'wirtschaftsrecht', label: 'Wirtschaftsrecht' },
    { value: 'angewandtes_recht', label: 'Angewandtes Recht' },
    { value: 'anderes', label: 'Andere Richtung' },
  ],

  state: { ...LEXCITE_PRICING_SURVEY_DEFAULT },
  entryPromptAllowed: false,

  load() {
    const persisted = LexCiteStorage.getJSON(LEXCITE_STORAGE_KEYS.pricingSurvey, {}) || {};
    if (persisted.version !== LEXCITE_PRICING_SURVEY_VERSION) {
      this.state = { ...LEXCITE_PRICING_SURVEY_DEFAULT };
      this.save();
      return;
    }
    this.state = {
      ...LEXCITE_PRICING_SURVEY_DEFAULT,
      ...persisted,
    };
  },

  save() {
    LexCiteStorage.setJSON(LEXCITE_STORAGE_KEYS.pricingSurvey, this.state);
  },

  getUsageCount() {
    return Array.isArray(window.savedCitations) ? window.savedCitations.length : 0;
  },

  hasPdfUsage() {
    return !!(typeof LexCiteUsage !== 'undefined' && LexCiteUsage.getSnapshot().counts?.pdf_upload > 0);
  },

  shouldShow() {
    if (this.state.dismissed || this.state.choice) return false;
    if (this.entryPromptAllowed) return true;
    const saves = this.getUsageCount();
    return saves >= 3 || (saves >= 2 && this.hasPdfUsage());
  },

  isOnboardingVisible() {
    const onboarding = document.getElementById('onboardingModal');
    if (!onboarding) return false;
    return onboarding.style.display !== 'none' && getComputedStyle(onboarding).display !== 'none';
  },

  scheduleEntryPrompt() {
    if (this.state.dismissed || this.state.choice) return;
    window.setTimeout(() => {
      if (this.state.dismissed || this.state.choice || this.isOnboardingVisible()) return;
      this.entryPromptAllowed = true;
      this.render();
    }, 900);
  },

  showEntryPromptNow() {
    if (this.state.dismissed || this.state.choice) return;
    this.entryPromptAllowed = true;
    this.state.modalClosed = false;
    this.save();
    this.render();
  },

  buildResponsePayload(value) {
    const project = window.projectMeta && typeof window.projectMeta === 'object'
      ? window.projectMeta
      : { title: '', course: '', dueDate: '', notes: '' };
    const syncPayload = typeof LexCiteSyncPayload !== 'undefined' ? LexCiteSyncPayload.build() : null;
    return {
      answer: value,
      saved_citation_count: this.getUsageCount(),
      project_present: !!(project.title || project.course || project.dueDate || project.notes),
      session_mode: typeof LexCiteSession !== 'undefined' ? LexCiteSession.state.mode : 'guest',
      scope: typeof LexCiteSession !== 'undefined' ? LexCiteSession.getScope() : 'guest:local',
      fingerprint: syncPayload?.summary?.fingerprint || '',
      source: LEXCITE_PRICING_SURVEY_VERSION,
    };
  },

  async answer(value) {
    if (typeof LexCiteUsage !== 'undefined') {
      LexCiteUsage.trackSurveyAnswer(value);
    }
    this.state.choice = value;
    this.state.answeredAt = new Date().toISOString();
    this.state.remoteError = '';
    this.save();
    this.render();

    if (typeof LexCiteRemoteAdapter !== 'undefined') {
      const result = await LexCiteRemoteAdapter.submitSurveyResponse(this.buildResponsePayload(value));
      this.state.remoteSubmitted = !!result.ok;
      this.state.remoteSubmittedAt = result.ok ? new Date().toISOString() : '';
      this.state.remoteError = result.ok ? '' : result.message;
      this.save();
      this.render();
    }
  },

  answerStudyProgram(value) {
    if (typeof LexCiteUsage !== 'undefined') {
      LexCiteUsage.trackStudyProgram(value);
    }
    this.state.studyProgram = value;
    this.state.studyProgramAnsweredAt = new Date().toISOString();
    this.state.dismissed = true;
    this.save();
    this.render();
  },

  skipStudyProgram() {
    this.state.followupSkipped = true;
    this.state.dismissed = true;
    this.save();
    this.render();
  },

  dismiss() {
    if (typeof LexCiteUsage !== 'undefined') {
      LexCiteUsage.trackSurveyDismiss();
    }
    this.state.followupSkipped = true;
    this.state.dismissed = true;
    this.save();
    this.render();
  },

  reset() {
    this.state = { ...LEXCITE_PRICING_SURVEY_DEFAULT };
    this.save();
    this.render();
  },

  openForTest() {
    this.state = { ...LEXCITE_PRICING_SURVEY_DEFAULT };
    this.save();
    this.render();
    this.openModal();
  },

  ensureModal() {
    let modal = document.getElementById('pricingSurveyModal');
    if (modal) return modal;

    modal = document.createElement('div');
    modal.id = 'pricingSurveyModal';
    modal.className = 'pricing-survey-modal';
    modal.innerHTML = `
      <div class="pricing-survey-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="pricingSurveyModalTitle">
        <button class="pricing-survey-modal-close" type="button" aria-label="Schliessen" onclick="LexCitePricingSurvey.closeModal()">×</button>
        <div class="pricing-survey-modal-eyebrow">Semesterpass-Signal</div>
        <div id="pricingSurveyModalStepPrice">
          <h3 class="pricing-survey-modal-title" id="pricingSurveyModalTitle">Welcher Semesterpass wäre für dich noch realistisch?</h3>
          <p class="pricing-survey-modal-copy" id="pricingSurveyModalCopy">
            Wenn LexCite dir im Semester bei Entscheiden, Vollzitaten und Verzeichnissen spürbar Zeit spart: Welcher Preis für einen Semesterpass wäre für dich noch okay?
          </p>
          <div class="pricing-pass-mini">
            <span class="pricing-pass-mini-chip">Testzugang: einzelne Fälle</span>
            <span class="pricing-pass-mini-chip premium">Semesterpass: speichern, prüfen, mehrere Arbeiten</span>
          </div>
          <div class="pricing-survey-modal-actions">
            <button class="pricing-survey-btn" type="button" onclick="LexCitePricingSurvey.answer('3')">3 CHF / Semester</button>
            <button class="pricing-survey-btn" type="button" onclick="LexCitePricingSurvey.answer('5')">5 CHF / Semester</button>
            <button class="pricing-survey-btn" type="button" onclick="LexCitePricingSurvey.answer('9')">9 CHF / Semester</button>
            <button class="pricing-survey-btn" type="button" onclick="LexCitePricingSurvey.answer('19')">19 CHF / Semester</button>
          </div>
          <div class="pricing-survey-modal-foot">
            Optional. Deine Antwort hilft uns, den Semesterpass realistisch einzuordnen.
            <button class="pricing-survey-dismiss" type="button" onclick="LexCitePricingSurvey.dismiss()">Jetzt nicht</button>
          </div>
        </div>
        <div id="pricingSurveyModalStepStudy" style="display:none">
          <h3 class="pricing-survey-modal-title">Noch kurz: Was studierst du?</h3>
          <p class="pricing-survey-modal-copy">
            Optional. Das hilft uns später besser zu verstehen, ob LexCite für Wirtschaftsrecht und Angewandtes Recht unterschiedlich zugeschnitten werden sollte.
          </p>
          <div class="pricing-survey-study-actions">
            <button class="pricing-survey-btn pricing-survey-btn-quiet" type="button" onclick="LexCitePricingSurvey.answerStudyProgram('wirtschaftsrecht')">Wirtschaftsrecht</button>
            <button class="pricing-survey-btn pricing-survey-btn-quiet" type="button" onclick="LexCitePricingSurvey.answerStudyProgram('angewandtes_recht')">Angewandtes Recht</button>
            <button class="pricing-survey-btn pricing-survey-btn-quiet" type="button" onclick="LexCitePricingSurvey.answerStudyProgram('anderes')">Andere Richtung</button>
          </div>
          <div class="pricing-survey-modal-foot">
            Die Angabe ist optional und dient nur dazu, das Produkt später gezielter zu schärfen.
            <button class="pricing-survey-dismiss" type="button" onclick="LexCitePricingSurvey.skipStudyProgram()">Überspringen</button>
          </div>
        </div>
      </div>
    `;
    modal.addEventListener('click', (event) => {
      if (event.target === modal) this.closeModal();
    });
    document.body.appendChild(modal);
    return modal;
  },

  openModal() {
    const modal = this.ensureModal();
    modal.classList.add('open');
    document.body.classList.add('pricing-survey-modal-open');
    if (!this.state.modalClosed && !this.state.choice && !this.state.dismissed && typeof LexCiteUsage !== 'undefined') {
      LexCiteUsage.trackSurveyShown();
    }
    this.state.modalClosed = false;
    this.save();
  },

  closeModal(userInitiated = true) {
    const modal = document.getElementById('pricingSurveyModal');
    if (modal) modal.classList.remove('open');
    document.body.classList.remove('pricing-survey-modal-open');
    if (this.state.choice && !this.state.studyProgram && !this.state.followupSkipped) {
      this.state.followupSkipped = true;
      this.state.dismissed = true;
      this.save();
      return;
    }
    if (userInitiated && !this.state.choice && !this.state.dismissed) {
      this.state.modalClosed = true;
      this.save();
    }
  },

  getAnswerLabel() {
    const match = this.options.find(option => option.value === this.state.choice);
    return match ? match.label : this.state.choice;
  },

  getStudyProgramLabel() {
    const match = this.studyPrograms.find(option => option.value === this.state.studyProgram);
    return match ? match.label : this.state.studyProgram;
  },

  render() {
    const card = document.getElementById('pricingSurveyCard');
    const intro = document.getElementById('pricingSurveyIntro');
    const actions = document.getElementById('pricingSurveyActions');
    const result = document.getElementById('pricingSurveyResult');
    const modal = this.ensureModal();
    const modalCopy = document.getElementById('pricingSurveyModalCopy');
    const modalPriceStep = document.getElementById('pricingSurveyModalStepPrice');
    const modalStudyStep = document.getElementById('pricingSurveyModalStepStudy');

    if (!card || !intro || !actions || !result || !modal || !modalCopy || !modalPriceStep || !modalStudyStep) return;

    if (this.shouldShow()) {
      card.style.display = 'none';
      intro.textContent = 'Kurze Einschätzung: Welcher Semesterpass wäre für dich für LexCite noch realistisch?';
      actions.style.display = 'grid';
      result.style.display = 'none';
      result.textContent = '';
      modalPriceStep.style.display = '';
      modalStudyStep.style.display = 'none';
      modalCopy.textContent = 'Wenn LexCite dir im Semester bei Entscheiden, Vollzitaten und Verzeichnissen spürbar Zeit spart: Welcher Preis für einen Semesterpass wäre für dich noch okay?';
      if (!this.state.modalClosed) this.openModal();
      return;
    }

    if (this.state.choice && !this.state.studyProgram && !this.state.followupSkipped) {
      card.style.display = 'none';
      actions.style.display = 'none';
      result.style.display = 'none';
      result.textContent = '';
      modalPriceStep.style.display = 'none';
      modalStudyStep.style.display = '';
      this.openModal();
      return;
    }

    if (this.state.choice) {
      card.style.display = 'none';
      actions.style.display = 'none';
      result.style.display = 'none';
      result.textContent = '';
      this.closeModal(false);
      return;
    }

    card.style.display = 'none';
    this.closeModal(false);
  },

  init() {
    this.load();
    this.render();
    this.scheduleEntryPrompt();
  },
};

document.addEventListener('DOMContentLoaded', () => {
  LexCitePricingSurvey.init();
});

if (typeof document !== 'undefined' && document.addEventListener) {
  document.addEventListener('lexcite:sync-payload-change', () => {
    LexCitePricingSurvey.render();
  });
}

if (typeof window !== 'undefined' && window.addEventListener) {
  window.addEventListener('lexcite:onboarding-closed', () => {
    window.setTimeout(() => LexCitePricingSurvey.showEntryPromptNow(), 450);
  });
}

window.__lexcitePricingSurveyDebug = LexCitePricingSurvey;
