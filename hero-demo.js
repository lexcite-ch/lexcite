(() => {
  const STEPS = [
    { label: 'PDF hochladen', hint: 'Datei wählen oder einfügen' },
    { label: 'Angaben prüfen', hint: 'Quellentyp, Datum und Nummer kontrollieren' },
    { label: 'Vollzitat kopieren', hint: 'Fussnote oder Vollzitat übernehmen' },
    { label: 'Im Verzeichnis speichern', hint: 'Ins passende Quellenverzeichnis sichern' },
  ];

  const STEP_DURATION = 3000;

  function initHeroDemo() {
    const demo = document.getElementById('heroDemo');
    const listEl = document.getElementById('heroDemoStepList');
    const progressBar = document.getElementById('heroDemoProgress');
    const playBtn = document.getElementById('heroDemoPlay');
    const resetBtn = document.getElementById('heroDemoReset');
    const statusEl = document.getElementById('heroDemoStatus');
    if (!demo || !listEl || !progressBar || !playBtn || !resetBtn || !statusEl) return;

    let current = 0;
    let playing = true;
    let startTime = null;
    let raf = null;

    listEl.innerHTML = STEPS.map((step, index) => `
      <button class="hero-demo-step" id="heroDemoStep-${index}" type="button" data-step-index="${index}">
        <span class="hero-demo-step-num" id="heroDemoStepNum-${index}">${index + 1}</span>
        <span class="hero-demo-step-copy">
          <span class="hero-demo-step-label">${step.label}</span>
          <span class="hero-demo-step-hint">${step.hint}</span>
        </span>
      </button>
    `).join('');

    const stepRows = Array.from(listEl.querySelectorAll('.hero-demo-step'));

    function renderPlayIcon() {
      playBtn.setAttribute('aria-label', playing ? 'Demo pausieren' : 'Demo abspielen');
      playBtn.innerHTML = playing
        ? '<svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><rect x="2" y="1" width="3" height="10" fill="currentColor"/><rect x="7" y="1" width="3" height="10" fill="currentColor"/></svg>'
        : '<svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 1l9 5-9 5z" fill="currentColor"/></svg>';
    }

    function renderStep(index, progress = 0) {
      current = index;
      demo.dataset.step = String(index);

      stepRows.forEach((row, rowIndex) => {
        const num = document.getElementById(`heroDemoStepNum-${rowIndex}`);
        row.classList.toggle('active', rowIndex === index);
        row.classList.toggle('done', rowIndex < index);
        if (!num) return;
        num.classList.toggle('active', rowIndex === index);
        num.classList.toggle('done', rowIndex < index);
        num.classList.toggle('pending', rowIndex > index);
        num.textContent = rowIndex < index ? '✓' : String(rowIndex + 1);
      });

      const totalProgress = (index + progress) / STEPS.length;
      progressBar.style.width = `${Math.min(100, totalProgress * 100)}%`;
      statusEl.textContent = `Schritt ${index + 1} / ${STEPS.length} — ${STEPS[index].label}`;
    }

    function goTo(index) {
      current = index;
      startTime = performance.now();
      renderStep(current, 0);
    }

    function tick(timestamp) {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(1, elapsed / STEP_DURATION);
      renderStep(current, progress);
      if (progress >= 1) {
        current = (current + 1) % STEPS.length;
        startTime = null;
      }
      raf = requestAnimationFrame(tick);
    }

    function setPlaying(value) {
      playing = value;
      if (raf) cancelAnimationFrame(raf);
      if (playing) {
        startTime = null;
        raf = requestAnimationFrame(tick);
      }
      renderPlayIcon();
    }

    stepRows.forEach((row) => {
      row.addEventListener('click', () => {
        const index = Number(row.dataset.stepIndex || 0);
        goTo(index);
      });
    });

    playBtn.addEventListener('click', () => setPlaying(!playing));
    resetBtn.addEventListener('click', () => {
      current = 0;
      startTime = performance.now();
      renderStep(0, 0);
    });

    renderStep(0, 0);
    setPlaying(true);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHeroDemo);
  } else {
    initHeroDemo();
  }
})();
