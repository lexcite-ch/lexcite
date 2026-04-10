const LEXCITE_USAGE_DEFAULTS = {
  counts: {
    page_switch: 0,
    pdf_upload: 0,
    source_type_select: 0,
    citation_save: 0,
    bulk_check: 0,
    survey_show: 0,
    survey_answer: 0,
    survey_study_program: 0,
    survey_dismiss: 0,
  },
  pageViews: {},
  sourceTypes: {},
  surveyAnswers: {},
  studyPrograms: {},
  recent: [],
};

const LexCiteUsage = {
  state: JSON.parse(JSON.stringify(LEXCITE_USAGE_DEFAULTS)),
  remoteTrackedEvents: new Set([
    'source_type_select',
    'citation_save',
    'pdf_upload',
    'survey_answer',
    'survey_study_program',
  ]),

  load() {
    if (typeof LexCiteStorage === 'undefined') return;
    const persisted = LexCiteStorage.getJSON(LEXCITE_STORAGE_KEYS.usageStats, null);
    this.state = persisted
      ? {
          ...JSON.parse(JSON.stringify(LEXCITE_USAGE_DEFAULTS)),
          ...persisted,
          counts: { ...LEXCITE_USAGE_DEFAULTS.counts, ...(persisted.counts || {}) },
          pageViews: { ...(persisted.pageViews || {}) },
          sourceTypes: { ...(persisted.sourceTypes || {}) },
          surveyAnswers: { ...(persisted.surveyAnswers || {}) },
          studyPrograms: { ...(persisted.studyPrograms || {}) },
          recent: Array.isArray(persisted.recent) ? persisted.recent : [],
        }
      : JSON.parse(JSON.stringify(LEXCITE_USAGE_DEFAULTS));
  },

  save() {
    if (typeof LexCiteStorage === 'undefined') return;
    LexCiteStorage.setJSON(LEXCITE_STORAGE_KEYS.usageStats, this.state);
  },

  remember(event, meta = {}) {
    this.state.recent.unshift({
      event,
      meta,
      at: new Date().toISOString(),
    });
    this.state.recent = this.state.recent.slice(0, 25);
  },

  bump(event, meta = {}) {
    this.state.counts[event] = (this.state.counts[event] || 0) + 1;
    this.remember(event, meta);
    this.save();
    this.submitRemoteEvent(event, meta);
  },

  buildRemotePayload(eventName, eventValue = '') {
    const project = window.projectMeta && typeof window.projectMeta === 'object'
      ? window.projectMeta
      : { title: '', course: '', dueDate: '', notes: '' };
    return {
      event_name: eventName,
      event_value: eventValue || null,
      session_mode: typeof LexCiteSession !== 'undefined' ? LexCiteSession.state.mode : 'guest',
      scope: typeof LexCiteSession !== 'undefined' ? LexCiteSession.getScope() : 'guest:local',
      source: 'lexcite-web',
      project_present: !!(project.title || project.course || project.dueDate || project.notes),
    };
  },

  submitRemoteEvent(event, meta = {}) {
    if (!this.remoteTrackedEvents.has(event)) return;
    if (typeof LexCiteRemoteAdapter === 'undefined' || typeof LexCiteRemoteAdapter.submitUsageEvent !== 'function') return;

    let eventName = '';
    let eventValue = '';
    if (event === 'source_type_select') {
      eventName = 'source_type_selected';
      eventValue = meta.type || '';
    } else if (event === 'citation_save') {
      eventName = 'citation_saved';
      eventValue = meta.type || '';
    } else if (event === 'pdf_upload') {
      eventName = 'pdf_uploaded';
      eventValue = 'pdf';
    } else if (event === 'survey_answer') {
      eventName = 'pricing_survey_answered';
      eventValue = meta.answer || '';
    } else if (event === 'survey_study_program') {
      eventName = 'study_program_answered';
      eventValue = meta.program || '';
    }

    if (!eventName) return;
    LexCiteRemoteAdapter.submitUsageEvent(this.buildRemotePayload(eventName, eventValue));
  },

  trackPage(page) {
    if (!page) return;
    this.state.pageViews[page] = (this.state.pageViews[page] || 0) + 1;
    this.bump('page_switch', { page });
  },

  trackPdfUpload(filename = '') {
    this.bump('pdf_upload', {
      filename: filename ? filename.split('/').pop() : '',
    });
  },

  trackSourceType(type) {
    if (!type) return;
    this.state.sourceTypes[type] = (this.state.sourceTypes[type] || 0) + 1;
    this.bump('source_type_select', { type });
  },

  trackCitationSave(type) {
    this.bump('citation_save', { type: type || '' });
  },

  trackBulkCheck(count) {
    this.bump('bulk_check', { count: Number(count) || 0 });
  },

  trackSurveyShown() {
    this.bump('survey_show');
  },

  trackSurveyAnswer(answer) {
    if (answer) {
      this.state.surveyAnswers[answer] = (this.state.surveyAnswers[answer] || 0) + 1;
    }
    this.bump('survey_answer', { answer: answer || '' });
  },

  trackStudyProgram(program) {
    if (program) {
      this.state.studyPrograms[program] = (this.state.studyPrograms[program] || 0) + 1;
    }
    this.bump('survey_study_program', { program: program || '' });
  },

  trackSurveyDismiss() {
    this.bump('survey_dismiss');
  },

  getSnapshot() {
    return JSON.parse(JSON.stringify(this.state));
  },

  reset() {
    this.state = JSON.parse(JSON.stringify(LEXCITE_USAGE_DEFAULTS));
    this.save();
  },
};

LexCiteUsage.load();
window.__lexciteUsageDebug = LexCiteUsage;
