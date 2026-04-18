#!/bin/zsh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
TMP_SCRIPT="/tmp/lexcite-pdf-suite.js"
export ROOT_DIR

ruby <<'RUBY'
require 'json'
root = ENV.fetch('ROOT_DIR')
fixtures = JSON.parse(File.read(File.join(root, 'tests', 'fixtures', 'pdf-detection-fixtures.json')))
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
]

combined = files.map { |f| File.read(f) }.join("\n\n")

harness = <<~JS
  var window = this;
  var noop = function() {};
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
    getElementById: function(){ return makeNode(); },
    querySelector: function(){ return makeNode(); },
    querySelectorAll: function(){ return []; },
    createElement: function(){ return makeNode(); },
    addEventListener: noop,
    removeEventListener: noop
  };
  var navigator = { clipboard: { writeText: noop } };
  var localStorage = { getItem: function(){ return null; }, setItem: noop, removeItem: noop };
  var location = { href: '' };
  var pdfjsLib = { GlobalWorkerOptions: {} };
  var setTimeout = function(fn){ return 0; };
  var clearTimeout = noop;
  var setInterval = function(fn){ return 0; };
  var clearInterval = noop;
  var alert = noop, confirm = function(){ return true; }, prompt = function(){ return ''; };
  var requestAnimationFrame = function(fn){ return 0; };
  #{combined}

  function assertEqual(actual, expected, label) {
    if (actual !== expected) throw new Error(label + ': expected ' + expected + ', got ' + actual);
  }
  function assertType(result, expectedType, label) {
    if (!result || result.type !== expectedType) throw new Error(label + ': expected type ' + expectedType + ', got ' + (result && result.type));
  }

  var fixtures = #{JSON.generate(fixtures)};
  fixtures.helpers.forEach(function(testCase) {
    var actual;
    if (testCase.kind === 'preprocessPDFText') actual = preprocessPDFText(testCase.input);
    if (testCase.kind === 'normalizeBGerCaseNumber') actual = normalizeBGerCaseNumber(testCase.input);
    if (testCase.kind === 'extractDecisionDate') actual = extractDecisionDate(testCase.input);
    assertEqual(actual, testCase.expected, testCase.label);
  });

  fixtures.detections.forEach(function(testCase) {
    var detected = detectSource(testCase.text, testCase.filename);
    assertType(detected, testCase.expectedType, testCase.label);
    var expectedFields = testCase.expectedFields || {};
    Object.keys(expectedFields).forEach(function(field) {
      assertEqual(detected.fields[field], expectedFields[field], testCase.label + ' field ' + field);
    });
  });

  console.log('PDF_DETECTION_SUITE_OK');
JS

File.write('/tmp/lexcite-pdf-suite.js', harness)
RUBY

osascript -l JavaScript "$TMP_SCRIPT"
