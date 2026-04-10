(() => {
  function initHeroDemo() {
    const demo = document.getElementById('heroDemo');
    if (!demo) return;

    const steps = Array.from(demo.querySelectorAll('.hero-demo-step'));
    const caption = document.getElementById('heroDemoCaption');
    const progressBar = document.getElementById('heroDemoProgress');
    if (!steps.length) return;

    const captions = [
      {
        title: 'PDF hochladen',
        body: 'Lade den Entscheid hoch. LexCite liest die ersten wichtigen Angaben direkt aus dem PDF.'
      },
      {
        title: 'Kurz prüfen',
        body: 'Prüfe kurz Quellentyp, Geschäftsnummer und Datum. Meist dauert das nur ein paar Sekunden.'
      },
      {
        title: 'Vollzitat kopieren',
        body: 'Das Vollzitat ist fertig. Du musst die Struktur nicht mehr selbst aus dem Guide zusammensetzen.'
      },
      {
        title: 'Speichern',
        body: 'Speichere den Fall ab, damit Vollzitat, Kurzangabe und Verzeichniseintrag zusammenbleiben.'
      }
    ];

    let activeIndex = 0;
    let intervalId = null;

    function renderStep(index) {
      activeIndex = index % steps.length;
      demo.dataset.step = String(activeIndex);
      steps.forEach((step, stepIndex) => {
        step.classList.toggle('active', stepIndex === activeIndex);
      });
      if (caption && captions[activeIndex]) {
        caption.innerHTML = `<strong>${captions[activeIndex].title}</strong><span>${captions[activeIndex].body}</span>`;
      }
      if (progressBar) {
        progressBar.style.width = `${((activeIndex + 1) / steps.length) * 100}%`;
      }
    }

    function startLoop() {
      if (intervalId) clearInterval(intervalId);
      intervalId = window.setInterval(() => {
        renderStep((activeIndex + 1) % steps.length);
      }, 2200);
    }

    steps.forEach((step, index) => {
      step.addEventListener('mouseenter', () => {
        renderStep(index);
      });
      step.addEventListener('focus', () => {
        renderStep(index);
      });
    });

    demo.addEventListener('mouseenter', () => {
      if (intervalId) clearInterval(intervalId);
    });

    demo.addEventListener('mouseleave', () => {
      startLoop();
    });

    renderStep(0);
    startLoop();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHeroDemo);
  } else {
    initHeroDemo();
  }
})();
