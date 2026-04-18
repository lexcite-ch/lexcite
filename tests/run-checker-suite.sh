#!/bin/zsh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
TMP_SCRIPT="/tmp/lexcite-checker-suite.js"
export ROOT_DIR

ruby <<'RUBY'
require 'json'
root = ENV.fetch('ROOT_DIR')
fixtures = JSON.parse(File.read(File.join(root, 'tests', 'fixtures', 'checker-fixtures.json')))
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
  runReferenceSuite();
  var positive = document.getElementById('checkerReferenceStatus').textContent;
  runNegativeSuite();
  var negative = document.getElementById('checkerReferenceStatus').textContent;
  if (!/alle .* Guide-Referenzf[aä]lle bestanden/.test(positive)) throw new Error('REFERENCE_SUITE_FAILED: ' + positive);
  if (!/alle .* problematischen F[aä]lle werden korrekt markiert/.test(negative)) throw new Error('NEGATIVE_SUITE_FAILED: ' + negative);
  var fixtures = #{JSON.generate(fixtures)};
  console.log(fixtures.expectedMessages.reference);
JS

File.write('/tmp/lexcite-checker-suite.js', harness)
RUBY

osascript -l JavaScript "$TMP_SCRIPT"
