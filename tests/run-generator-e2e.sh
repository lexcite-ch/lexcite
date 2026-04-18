#!/bin/zsh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
TMP_SCRIPT="/tmp/lexcite-generator-e2e.js"
export ROOT_DIR

ruby <<'RUBY'
root = ENV.fetch('ROOT_DIR')
files = [
  File.join(root, 'session.js'),
  File.join(root, 'storage.js'),
  File.join(root, 'account.js'),
  File.join(root, 'backend-config.js'),
  File.join(root, 'pricing-survey.js'),
  File.join(root, 'sync-payload.js'),
  File.join(root, 'sync-journal.js'),
  File.join(root, 'remote-adapter.js'),
  File.join(root, 'sync.js'),
  File.join(root, 'pdf-detection.js'),
  File.join(root, 'pdf-ui.js'),
  File.join(root, 'workspace.js'),
  File.join(root, 'citation-rules.js'),
  File.join(root, 'citation-audit.js'),
  File.join(root, 'checker-ui.js'),
  File.join(root, 'tracker.js'),
]

combined = files.map { |f| File.read(f) }.join("\n\n")

harness = <<~JS
  var window = this;
  var noop = function() {};
  var elements = {};
  var authorLists = { authorsList: [], hrsgList: [] };

  function makeClassList() {
    return {
      add: noop,
      remove: noop,
      toggle: noop,
      contains: function(){ return false; }
    };
  }

  function makeNode() {
    return {
      innerHTML: '',
      textContent: '',
      value: '',
      checked: false,
      disabled: false,
      style: {},
      dataset: {},
      className: '',
      classList: makeClassList(),
      appendChild: noop,
      remove: noop,
      focus: noop,
      select: noop,
      setAttribute: noop,
      removeAttribute: noop,
      scrollIntoView: noop,
      querySelector: function(){ return makeNode(); },
      querySelectorAll: function(){ return []; },
      addEventListener: noop,
      removeEventListener: noop,
      getBoundingClientRect: function(){ return { top:0,left:0,width:0,height:0 }; }
    };
  }

  function makeAuthorBlock(author) {
    return {
      querySelector: function(sel) {
        if (sel === '.nachname') return { value: author.nachname || '' };
        if (sel === '.vorname') return { value: author.vorname || '' };
        return { value: '' };
      }
    };
  }

  var document = {
    body: makeNode(),
    documentElement: { setAttribute: noop, getAttribute: function(){ return ''; }, style: {} },
    getElementById: function(id){
      if (!elements[id]) elements[id] = makeNode();
      return elements[id];
    },
    querySelector: function(){ return makeNode(); },
    querySelectorAll: function(sel){
      var m = sel.match(/^#([A-Za-z0-9_-]+)\s+\.author-block$/);
      if (m) {
        var listId = m[1];
        return (authorLists[listId] || []).map(makeAuthorBlock);
      }
      return [];
    },
    createElement: function(){ return makeNode(); },
    addEventListener: noop,
    removeEventListener: noop
  };

  var navigator = { clipboard: { writeText: noop } };
  var localStorage = { getItem: function(){ return null; }, setItem: noop, removeItem: noop };
  var location = { href: '' };
  var setTimeout = function(){ return 0; };
  var clearTimeout = noop;
  var setInterval = function(){ return 0; };
  var clearInterval = noop;
  var alert = function(msg){ throw new Error('ALERT:' + msg); };
  var confirm = function(){ return true; };
  var prompt = function(){ return ''; };
  var requestAnimationFrame = function(){ return 0; };

  #{combined}

  trackCitation = function(){};

  function resetState() {
    elements = {};
    authorLists = { authorsList: [], hrsgList: [] };
    ['sourceType','vollOutput','kurzOutput','vollPlain','kurzPlain','outputSection','vollLabel','kurzLabel'].forEach(function(id){
      document.getElementById(id);
    });
  }

  function setField(id, value) {
    document.getElementById(id).value = value;
  }

  function setAuthors(listId, authors) {
    authorLists[listId] = authors.slice();
  }

  function normalize(text) {
    return String(text || '').replace(/\\s+/g, ' ').trim();
  }

  function expectEqual(actual, expected, label) {
    if (normalize(actual) !== normalize(expected)) {
      throw new Error(label + '\\nEXPECTED: ' + expected + '\\nACTUAL:   ' + actual);
    }
  }

  function runCase(testCase) {
    resetState();
    document.getElementById('sourceType').value = testCase.type;
    updateOutputLabels(testCase.type);
    if (testCase.authors) setAuthors('authorsList', testCase.authors);
    if (testCase.editors) setAuthors('hrsgList', testCase.editors);
    Object.keys(testCase.fields || {}).forEach(function(key){
      setField(key, testCase.fields[key]);
    });
    FORMS[testCase.type].generate();
    var full = document.getElementById('vollPlain').textContent;
    var short = document.getElementById('kurzPlain').textContent;
    expectEqual(full, testCase.expectedFull, testCase.id + ' full');
    expectEqual(short, testCase.expectedShort, testCase.id + ' short');
    console.log('E2E_OK ' + testCase.id);
  }

  var cases = [
    {
      id: 'bge',
      type: 'bge',
      fields: { band: '127', teil: 'I', seite: '164', erwaegung: '3c', seite_konk: '171' },
      expectedFull: 'BGE 127 I 164 E. 3c S. 171.',
      expectedShort: 'BGE 127 I 164 E. 3c S. 171.'
    },
    {
      id: 'bger',
      type: 'bger',
      fields: { geschaeft: '9C_355/2023', datum: '07.09.2023', erwaegung: '3.2' },
      expectedFull: 'BGer 9C_355/2023 vom 7. September 2023 E. 3.2.',
      expectedShort: 'BGer 9C_355/2023 vom 7. September 2023 E. 3.2.'
    },
    {
      id: 'bvge',
      type: 'bvge',
      fields: { bvge_art: 'BVGE', geschaeft: '2007/1', datum: '', erwaegung: '3.5' },
      expectedFull: 'BVGE 2007/1 E. 3.5.',
      expectedShort: 'BVGE 2007/1 E. 3.5.'
    },
    {
      id: 'kantonal',
      type: 'kantonal',
      fields: { gericht: 'Zivilgericht BS', datum: '27.9.2001', zeitschrift: 'BJM', jahr: '2002', seite: '95', erwaegung: '5a' },
      expectedFull: 'Zivilgericht BS, Entscheid vom 27.9.2001, BJM 2002 S. 95 ff. E. 5a.',
      expectedShort: 'Zivilgericht BS, Entscheid vom 27.9.2001, BJM 2002 S. 95 ff. E. 5a.'
    },
    {
      id: 'monographie',
      type: 'monographie',
      authors: [{ nachname: 'Koller', vorname: 'Alfred' }],
      fields: { titel: 'Schweizerisches Obligationenrecht, Allgemeiner Teil', untertitel: '', band: 'I', auflage: '4', orte: 'Bern', jahr: '2017', stichwort: 'OR AT', seite: '45' },
      expectedFull: 'KOLLER Alfred, Schweizerisches Obligationenrecht, Allgemeiner Teil, Bd. I, 4. Aufl., Bern 2017 (zit. KOLLER, OR AT).',
      expectedShort: 'KOLLER, OR AT, S. 45.'
    },
    {
      id: 'dissertation',
      type: 'dissertation',
      authors: [{ nachname: 'Aeschi', vorname: 'Oliver' }],
      fields: { titel: 'Organisationshaftung', untertitel: '', diss_art: 'Diss.', uni_ort: 'Neuenburg', orte: 'Bern', jahr: '2005', stichwort: '', seite: '88' },
      expectedFull: 'AESCHI Oliver, Organisationshaftung, Diss. Neuenburg, Bern 2005.',
      expectedShort: 'AESCHI, S. 88.'
    },
    {
      id: 'zeitschrift',
      type: 'zeitschrift',
      authors: [{ nachname: 'Walter', vorname: 'Hans Peter' }],
      fields: { titel: 'Vertrauenshaftung im Umfeld des Vertrages', zeitschrift: 'ZBJV', jahr: '1996', seite_start: '273', stichwort: '', seite_konk: '273' },
      expectedFull: 'WALTER Hans Peter, Vertrauenshaftung im Umfeld des Vertrages, ZBJV 1996 S. 273 ff.',
      expectedShort: 'WALTER, Vertrauenshaftung im Umfeld des Vertrages, ZBJV 1996, S. 273.'
    },
    {
      id: 'sammelband',
      type: 'sammelband',
      authors: [{ nachname: 'Hunger', vorname: 'Patrick' }],
      editors: [
        { nachname: 'Böhringer', vorname: 'Peter' },
        { nachname: 'Müller', vorname: 'Roger' }
      ],
      fields: { titel: 'Erlöschen von Obligationen (§ 6)', sb_titel: 'Prinzipien des Vertragsrechts', auflage: '4', orte: 'Zürich', jahr: '2020', seite_start: '97', stichwort: '', seite_konk: '101' },
      expectedFull: 'HUNGER Patrick, Erlöschen von Obligationen (§ 6), in: Böhringer Peter/Müller Roger (Hrsg.), Prinzipien des Vertragsrechts, 4. Aufl., Zürich 2020, S. 97 ff.',
      expectedShort: 'HUNGER, Erlöschen von Obligationen (§ 6), S. 101.'
    },
    {
      id: 'kommentar',
      type: 'kommentar',
      authors: [{ nachname: 'Portmann', vorname: 'Wolfgang' }],
      editors: [
        { nachname: 'Widmer Lüchinger', vorname: 'Corinne' },
        { nachname: 'Oser', vorname: 'David' }
      ],
      fields: { art_prefix: 'Art.', art_von: '327b', art_bis: '', gesetz: 'OR', komm_name: 'Basler Kommentar', teilband: 'Obligationenrecht I, Art. 1–529 OR', auflage: '7', orte: 'Basel', jahr: '2019', randnote: '16' },
      expectedFull: 'PORTMANN Wolfgang, in: Widmer Lüchinger Corinne/Oser David (Hrsg.), Basler Kommentar, Obligationenrecht I, Art. 1–529 OR, 7. Aufl., Basel 2019.',
      expectedShort: 'PORTMANN, Art. 327b OR N 16.'
    },
    {
      id: 'materialien',
      type: 'materialien',
      fields: { mat_art: 'Botschaft', titel: 'zur Volksinitiative «Gegen neue Kampfflugzeuge»', datum: '26. August 2009', bbl_jahr: '2009', bbl_seite: '5975', stichwort: 'Kampfflugzeuge', seite: '5980' },
      expectedFull: 'Botschaft zur Volksinitiative «Gegen neue Kampfflugzeuge» vom 26. August 2009, BBl 2009 S. 5975 ff. (zit. Kampfflugzeuge).',
      expectedShort: 'Botschaft Kampfflugzeuge, S. 5980.'
    },
    {
      id: 'gesetz',
      type: 'gesetz',
      fields: { titel: 'Bundesgesetz über die Raumplanung vom 22. Juni 1979 (Raumplanungsgesetz, RPG)', sr: 'SR 700', abk: 'RPG', art: 'Art. 322d Abs. 2 OR' },
      expectedFull: 'Bundesgesetz über die Raumplanung vom 22. Juni 1979 (Raumplanungsgesetz, RPG), SR 700.',
      expectedShort: 'Art. 322d Abs. 2 OR.'
    },
    {
      id: 'internet',
      type: 'internet',
      authors: [{ nachname: 'Bundesamt für Gesundheit', vorname: '' }],
      fields: { titel: 'Bericht zum Schutz vor Passivrauchen', url: 'https://www.admin.ch/passivrauchen', pub_datum: '15.01.2024', datum: '11.08.2022', stichwort: 'BAG online', seite: '3' },
      expectedFull: 'BUNDESAMT FÜR GESUNDHEIT, Bericht zum Schutz vor Passivrauchen, 15.01.2024, https://www.admin.ch/passivrauchen, besucht am: 11.08.2022.',
      expectedShort: 'BUNDESAMT FÜR GESUNDHEIT, BAG online, S. 3.'
    }
  ];

  cases.forEach(runCase);
  console.log('GENERATOR_E2E_OK');
JS

File.write('/tmp/lexcite-generator-e2e.js', harness)
RUBY

osascript -l JavaScript "$TMP_SCRIPT"
