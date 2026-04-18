#!/bin/zsh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
TMP_SCRIPT="/tmp/lexcite-checker-by-type.js"
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
  function makeNode() {
    return {
      innerHTML: '', textContent: '', value: '', checked: false, disabled: false,
      style: {}, dataset: {}, className: '',
      classList: { add: noop, remove: noop, toggle: noop, contains: function(){ return false; } },
      appendChild: noop, remove: noop, focus: noop, select: noop,
      setAttribute: noop, removeAttribute: noop,
      querySelector: function(){ return makeNode(); },
      querySelectorAll: function(){ return []; },
      addEventListener: noop, removeEventListener: noop,
      scrollIntoView: noop,
      getBoundingClientRect: function(){ return { top:0,left:0,width:0,height:0 }; }
    };
  }
  var document = {
    body: makeNode(),
    documentElement: { setAttribute: noop, getAttribute: function(){ return ''; }, style: {} },
    getElementById: function(id){ if (!elements[id]) elements[id] = makeNode(); return elements[id]; },
    querySelector: function(){ return makeNode(); },
    querySelectorAll: function(){ return []; },
    createElement: function(){ return makeNode(); },
    addEventListener: noop,
    removeEventListener: noop
  };
  var navigator = { clipboard: { writeText: noop } };
  var localStorage = { getItem: function(){ return null; }, setItem: noop, removeItem: noop };
  var location = { href: '' };
  var setTimeout = function(fn){ return 0; };
  var clearTimeout = noop;
  var setInterval = function(fn){ return 0; };
  var clearInterval = noop;
  var alert = noop, confirm = function(){ return true; }, prompt = function(){ return ''; };
  var requestAnimationFrame = function(fn){ return 0; };
  #{combined}

  function evaluateByType() {
    var grouped = {};
    GUIDE_REFERENCE_CASES.forEach(function(ref){
      if (!grouped[ref.type]) grouped[ref.type] = { references: [], negatives: [] };
      grouped[ref.type].references.push(ref);
    });
    GUIDE_NEGATIVE_CASES.forEach(function(ref){
      if (!grouped[ref.type]) grouped[ref.type] = { references: [], negatives: [] };
      grouped[ref.type].negatives.push(ref);
    });

    var order = ['bge','bger','bvge','kantonal','monographie','dissertation','zeitschrift','sammelband','kommentar','materialien','gesetz','internet'];
    var results = [];

    order.forEach(function(type){
      var group = grouped[type];
      if (!group) return;
      var failures = [];

      group.references.forEach(function(ref){
        var formatSel = ref.format || ((ref.type === 'gesetz' || ref.type === 'materialien') ? 'verz' : 'voll');
        if (ref.autoDetect !== false) {
          var detected = detectTypeFromText(ref.citation);
          if (detected !== ref.type) {
            failures.push('REF ' + ref.label + ': detect=' + (detected || '—') + ' expected=' + ref.type);
            return;
          }
        }
        var issues = getIssues(ref.citation, ref.type, formatSel);
        if (issues.length > (ref.expectIssues || 0)) {
          failures.push('REF ' + ref.label + ': ' + issues.length + ' Warnungen');
        }
      });

      group.negatives.forEach(function(ref){
        var formatSel = ref.format || 'voll';
        var issues = getIssues(ref.citation, ref.type, formatSel);
        if (issues.length < (ref.minIssues || 1)) {
          failures.push('NEG ' + ref.label + ': zu wenige Warnungen (' + issues.length + ')');
          return;
        }
        if (ref.mustContain && ref.mustContain.length) {
          var combined = issues.join(' ');
          var missing = ref.mustContain.filter(function(part){ return combined.indexOf(part) === -1; });
          if (missing.length) failures.push('NEG ' + ref.label + ': fehlend=' + missing.join(', '));
        }
      });

      results.push({
        type: type,
        references: group.references.length,
        negatives: group.negatives.length,
        failures: failures
      });
    });

    return results;
  }

  var results = evaluateByType();
  var hasFailures = results.some(function(r){ return r.failures.length > 0; });

  results.forEach(function(r){
    if (r.failures.length) {
      console.log('TYPE_FAIL ' + r.type + ' refs=' + r.references + ' neg=' + r.negatives);
      r.failures.forEach(function(line){ console.log('  - ' + line); });
    } else {
      console.log('TYPE_OK ' + r.type + ' refs=' + r.references + ' neg=' + r.negatives);
    }
  });

  if (hasFailures) {
    throw new Error('CHECKER_BY_TYPE_FAILED');
  }

  console.log('CHECKER_BY_TYPE_OK');
JS

File.write('/tmp/lexcite-checker-by-type.js', harness)
RUBY

osascript -l JavaScript "$TMP_SCRIPT"
