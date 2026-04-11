// ══════════════════════════════════════════════════════════════
//  PDF.js Setup
// ══════════════════════════════════════════════════════════════
if (typeof pdfjsLib !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

// ══════════════════════════════════════════════════════════════
//  Drag & Drop
// ══════════════════════════════════════════════════════════════
function handleDragOver(e) {
  e.preventDefault();
  document.getElementById('pdfSection').classList.add('drag-over');
}
function handleDragLeave(e) {
  document.getElementById('pdfSection').classList.remove('drag-over');
}
function handleDrop(e) {
  e.preventDefault();
  document.getElementById('pdfSection').classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file && file.type === 'application/pdf') {
    if (typeof LexCiteUsage !== 'undefined') LexCiteUsage.trackPdfUpload(file.name);
    processPDF(file);
  }
  else showPdfStatus('error', 'Bitte eine PDF-Datei ablegen.');
}
function handleFileSelect(e) {
  const file = e.target.files[0];
  if (file) {
    if (typeof LexCiteUsage !== 'undefined') LexCiteUsage.trackPdfUpload(file.name);
    processPDF(file);
  }
  e.target.value = '';
}

// ══════════════════════════════════════════════════════════════
//  PDF Processing
// ══════════════════════════════════════════════════════════════
async function processPDF(file) {
  showPdfStatus('loading', 'PDF wird analysiert…');
  document.getElementById('autofillLegend').classList.remove('visible');

  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    // Extract text from first 4 pages
    let fullText = '';
    const pagesToRead = Math.min(4, pdf.numPages);
    for (let i = 1; i <= pagesToRead; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      fullText += content.items.map(item => item.str).join(' ') + '\n';
    }

    const filename = file.name;
    // Vorverarbeitung: Kapitälchen-Buchstabenabstand rekonstruieren («W O L F G A N G» → «WOLFGANG»)
    const processedText = preprocessPDFText(fullText);
    const detected = detectSource(processedText, filename);
    await applyDetectedInfo(detected, processedText);

  } catch (err) {
    console.error(err);
    showPdfStatus('error', 'Fehler beim Lesen des PDFs. Bitte Felder manuell ausfüllen.');
  }
}

// ══════════════════════════════════════════════════════════════
//  Source Detection  — Priorität: Dateiname → Textanfang → Volltext
//
//  Grundregel: Ein Kommentar ZITIERT viele BGE. Ein BGE-Entscheid
//  enthält in der Regel nur eine einzige BGE-Nummer ganz am Anfang.
//  Deshalb: BGE erst prüfen, wenn der Dateiname keine andere Quelle
//  eindeutig bestimmt, UND nur wenn die BGE-Nummer ganz am Anfang
//  steht UND im Gesamttext nicht mehr als 2-mal vorkommt.
// ══════════════════════════════════════════════════════════════
function detectSource(text, filename) {
  const t = text;
  // Nur die ersten 400 Zeichen für primäre Texterkennung (Titelseite)
  const head = t.substring(0, 400);

  // ══════════════════════════════════════════════════════════════
  //  STUFE 0: SWISSLEX «DOKUMENT»-FELD
  //  Swisslex-PDFs haben immer ein «Dokument»-Feld, das den
  //  Quellentyp direkt codiert: «AJP 2002 S. 669», «BGE 140 I 305»,
  //  «AGer-Z 2015 Nr. 7», «4A_332/2007» usw.
  //  → Zuverlässigster Einstiegspunkt für alle Swisslex-Quellen.
  // ══════════════════════════════════════════════════════════════
  {
    // «Dokument»-Feld nur im Kopf (erste 500 Zeichen) suchen
    const swissHead = t.substring(0, 500);
    const dokM = swissHead.match(/\bDokument\s+(.+?)(?=\s*(?:Urteilsdatum|Autor\b|Titel\b|Seiten\b|Publikation\b|Gericht\b|ISSN\b|ISBN\b))/i);
    if (dokM) {
      const dok = dokM[1].trim();

      // Hilfsfunktionen für Swisslex-Metadaten
      const swMeta = (label, stopAt) => {
        const rx = new RegExp(`\\b${label}\\s+(.+?)(?=\\s*(?:${stopAt}|$))`, 'i');
        return (swissHead.match(rx) || t.substring(0, 600).match(rx) || [])[1]?.trim() || '';
      };
      const swAutorRaw = swMeta('Autor', 'Titel|Auflage|Jahr|Seiten|Herausgeber|ISBN|ISSN|Verlag|Urteilsdatum');
      const swTitelRaw = swMeta('Titel', 'Seiten|Auflage|Jahr|Herausgeber|ISBN|ISSN|Verlag|Publikation');
      const swSeitenRaw= swMeta('Seiten', 'Publikation|Herausgeber|ISBN|ISSN|Verlag|Auflage');
      // Autorname aufteilen: Swisslex schreibt «Vorname Nachname»
      let nachnamen_raw, vornamen_raw;
      if (swAutorRaw) {
        const parts = swAutorRaw.trim().split(/\s+/);
        if (parts.length >= 2) {
          vornamen_raw  = [parts[0]];
          nachnamen_raw = [parts.slice(1).join(' ')];
        }
      }
      const seiteAnfang = swSeitenRaw ? swSeitenRaw.split(/[-–]/)[0].trim() : '';

      // ── BGE: «BGE 140 I 305» ──────────────────────────────────
      const bgeDocM = dok.match(/^BGE\s+(\d+)\s+([IVX]+)\s+(\d+)/i);
      if (bgeDocM) return { type:'bge', fields:{ band:bgeDocM[1], teil:bgeDocM[2], seite:bgeDocM[3] }};

      // ── BGer nicht publiziert: «4A_332/2007» oder «BGer 4A.332/2007» ──
      const bgerDocM = dok.match(/(?:BGer\s+)?(\d[A-Za-z][_\.]\d{1,6}\/\d{4})/);
      if (bgerDocM) {
        return {
          type:'bger',
          fields:{
            geschaeft: normalizeBGerCaseNumber(bgerDocM[1]),
            datum: extractDecisionDate(t),
            erwaegung: extractDecisionConsideration(t),
          }
        };
      }

      // ── Kantonaler Entscheid: «AGer-Z 2015 Nr. 7» ────────────
      const kantDocM = dok.match(/^(AGer-Z|AGVE|JAR|ZR)\s+(\d{4})/i);
      if (kantDocM && dok.includes('Nr.')) {
        // AGer-Z & AGVE sind kantonale Zeitschriften
        const gerichtM = t.match(/Gericht\s+(.+?)(?=\s*(?:Publikation|Rechtsgebiete|Seite\s+\d))/i);
        const datumM   = t.match(/Urteilsdatum\s+(\d{1,2}\.\d{1,2}\.\d{4})/i);
        const seiteHdrM = t.match(/(?:^|[\s])Seite\s+(\d+)(?:\s|$)/m);
        let gericht = '';
        if (gerichtM) {
          const raw = gerichtM[1].trim();
          const kgM = raw.match(/^([A-Za-zÄÖÜäöü\s.\-]+?),\s*(.+)$/);
          if (kgM) {
            const kantonMap={'Zürich':'ZH','Bern':'BE','Luzern':'LU','Basel-Stadt':'BS','Basel-Landschaft':'BL','St. Gallen':'SG','Aargau':'AG','Thurgau':'TG','Graubünden':'GR','Tessin':'TI','Waadt':'VD','Genf':'GE','Zug':'ZG','Solothurn':'SO','Freiburg':'FR'};
            gericht = kgM[2].trim() + ' ' + (kantonMap[kgM[1].trim()] || kgM[1].trim());
          } else gericht = raw;
        }
        return { type:'kantonal', fields:{
          gericht, datum: datumM?datumM[1]:'',
          zeitschrift: kantDocM[1], jahr: kantDocM[2],
          seite: seiteHdrM ? seiteHdrM[1] : seiteAnfang
        }};
      }

      // ── Zeitschriftenartikel: «AJP 2002 S. 669», «ZBJV 156/2020 S. 451» ──
      // Band/Jahr-Format (z.B. «156/2020») ODER reines Jahr (z.B. «2020»)
      const zeitDocM = dok.match(/^([A-Za-z]+(?:\/[A-Za-z]+)?)\s+((?:\d+\/)?\d{4})\s+S\.\s*(\d+)/);
      if (zeitDocM) {
        const abk = zeitDocM[1], jahr = zeitDocM[2], seite = zeitDocM[3];
        return { type:'zeitschrift', fields:{
          zeitschrift:  abk,
          jahr,           // z.B. «156/2020» oder «2020»
          seite_start:  seite,
          titel:        swTitelRaw,
          nachnamen_raw,
          vornamen_raw,
        }};
      }

      // ── Fallback: Swisslex kantonaler Entscheid (z.B. STBER.2023.83, ZR, etc.) ──
      // Tritt ein wenn «Dokument»-Feld keinem bekannten Muster entspricht,
      // aber Gericht + Urteilsdatum vorhanden sind.
      {
        const swissGericht = swMeta('Gericht', 'Rechtsgebiete|Publikation|Betreff|Seite');
        const swissDatum   = (swissHead.match(/\bUrteilsdatum\s+(\d{1,2}\.\d{1,2}\.\d{4})/i) || [])[1] || '';
        if (swissGericht || swissDatum) {
          let gericht = '';
          const kgM = swissGericht.match(/^([A-Za-zÄÖÜäöü\s.\-]+?),\s*(.+)$/);
          if (kgM) {
            const kantonMap = {'Zürich':'ZH','Bern':'BE','Luzern':'LU','Basel-Stadt':'BS',
              'Basel-Landschaft':'BL','St. Gallen':'SG','Aargau':'AG','Thurgau':'TG',
              'Graubünden':'GR','Tessin':'TI','Waadt':'VD','Genf':'GE','Zug':'ZG',
              'Solothurn':'SO','Freiburg':'FR'};
            gericht = kgM[2].trim() + ' ' + (kantonMap[kgM[1].trim()] || kgM[1].trim());
          } else gericht = swissGericht;
          return { type: 'kantonal', fields: {
            gericht,
            datum:   swissDatum,
            jahr:    swissDatum ? (swissDatum.match(/\d{4}$/) || [])[0] || '' : '',
            zeitschrift: '',
            seite: '',
          }};
        }
      }
    }
  }

  // ──────────────────────────────────────────────────────────────
  //  STUFE 1: DATEINAME  (zuverlässigste Quelle)
  // ──────────────────────────────────────────────────────────────

  // BSK Kommentar: BSK-OR-I-Portmann-Rudolph-Art-322d.pdf
  const bskFnM = filename.match(/BSK-([A-Z]+)(?:-([IVX]+))?-(.+?)-Art-([0-9a-z]+)/i);
  if (bskFnM) {
    const gesetz   = bskFnM[1].toUpperCase();
    const band     = bskFnM[2] || '';
    const nachnamen = bskFnM[3].split('-').map(n => capitalize(n));
    const artNr    = bskFnM[4];
    // Versuche Auflage + Jahr aus Volltext zu lesen
    const aufM  = t.match(/(\d+)\.\s*Au\s*f\s*l/i);
    const jahrM = t.match(/\b(20[0-3]\d|19[5-9]\d)\b/);
    const ortM  = t.match(/\b(Basel|Bern|Zürich|Genf|Lausanne)\b/);
    // Vorname + Nachname extrahieren — 3 Stufen (Legalis-Kapitälchen können als CAPS oder gemischt vorkommen)
    const textAuthors = extractAuthorsFromHead(head) ||
                        extractAuthorsFromHead(t.substring(0, 800));
    let nachnamen_raw, vornamen_raw;
    // BSK: Nachnamen IMMER aus Dateiname (z.B. Infanger, nicht Spühler als Hrsg.)
    // Vornamen: aus Text, sofern der Dateiname-Nachname dort vorkommt
    nachnamen_raw = nachnamen;
    vornamen_raw  = nachnamen.map(nn => {
      // Bevorzuge textAuthors-Eintrag der exakt dem Dateinamen-Nachnamen entspricht
      if (textAuthors.length > 0) {
        const match = textAuthors.find(a => a.nachname.toLowerCase() === nn.toLowerCase());
        if (match) return match.vorname;
      }
      // Fallback: Suche «Vorname Nachname» im Volltext
      const rx = new RegExp('([A-ZÄÖÜ][a-zäöü]{1,15})\\s+' + nn + '(?:\\b|/)');
      const m = t.match(rx);
      return m ? m[1] : '';
    });
    // Herausgeber: erst Head, dann erste 800 Zeichen
    let hrsg_raw = extractHrsgFromHead(head);
    if (!hrsg_raw.length) hrsg_raw = extractHrsgFromHead(t.substring(0, 800));
    return {
      type: 'kommentar',
      fields: {
        art_von: artNr,
        gesetz,
        komm_name: 'Basler Kommentar',
        nachnamen_raw,
        vornamen_raw,
        hrsg_raw,
        teilband_hint: band ? `Obligationenrecht ${band}, Art. 1–529 ${gesetz}`.replace(/\s+/g,' ').trim() : '',
        auflage: aufM  ? aufM[1]  : '',
        jahr:    jahrM ? jahrM[1] : '',
        orte:    ortM  ? ortM[1]  : 'Basel',
      }
    };
  }

  // ──────────────────────────────────────────────────────────────
  //  STUFE 1b: Legaltip / Legalis Zeitschrift-Export im Dateinamen
  //  z.B. «Martin-Schubarth-...-AJP-PJA-5-2008-S-519-ff.pdf»
  //       «Patrick-Vogler-...-AJP-PJA-6-2020-S-739-ff.pdf»
  // ──────────────────────────────────────────────────────────────
  {
    const legaltipM = filename.match(
      /[-_](AJP|ZBJV|SJZ|ZBl|BJM|SZW|ZSR|sic|HAVE|REPRAX|GesKR|Medialex|recht)[-_](?:PJA[-_])?(\d+)[-_](\d{4})[-_]S[-_](\d+)/i
    );
    if (legaltipM) {
      const abk  = legaltipM[1].toUpperCase();
      const heft = legaltipM[2];   // Heft-/Band-Nummer
      const yr   = legaltipM[3];
      const pg   = legaltipM[4];
      // ZBJV und ZBl verwenden Band/Jahr-Format (z.B. 152/2016), AJP nur Jahr
      const jahr = (abk === 'ZBJV' || abk === 'ZBl') ? `${heft}/${yr}` : yr;
      // Autor aus Dateiname-Anfang (Vorname-Nachname vor dem Schlagwort-Teil)
      // Format: «Vorname-Nachname-Schlagwörter-...-AJP-PJA-N-YYYY-S-NNN-ff.pdf»
      const beforeJournal = filename.substring(0, legaltipM.index).replace(/[-_]$/, '');
      const autorSegs = beforeJournal.split(/[-_]/).filter(Boolean);
      const nachnamen_raw = autorSegs.length >= 2 ? [capitalize(autorSegs[1])] : undefined;
      const vornamen_raw  = autorSegs.length >= 1 ? [capitalize(autorSegs[0])] : undefined;
      // Titel: nach «[Seite NN]» Marker suchen (Legaltip-Format)
      const titelM = t.match(/\[Seite\s+\d+\]\s*(.+?)(?:\n|$)/i);
      return { type: 'zeitschrift', fields: {
        zeitschrift:   abk,
        jahr,
        seite_start:   pg,
        titel:         titelM ? titelM[1].trim().replace(/[–;-]\s*$/, '').trim() : '',
        nachnamen_raw,
        vornamen_raw,
      }};
    }
  }

  // ──────────────────────────────────────────────────────────────
  //  STUFE 1c: Kommentar-Beitrag «Autor-in-Hrsg-Hrsg-Art-NN-LAW.pdf»
  //  z.B. «Fabian-Duss-Marco-Buchmann-in-Zweifel-Beusch-Hrsg-Art-69-DBG.pdf»
  //       «Markus-Reich-Julia-von-Ah-in-Zweifel-Beusch-Hrsg-Art-18-DBG.pdf»
  // ──────────────────────────────────────────────────────────────
  {
    const inHrsgM = filename.match(
      /^([A-Za-zÄÖÜäöü]+-[A-Za-zÄÖÜäöü]+.+?)-in-([A-Za-zÄÖÜäöü]+-[A-Za-zÄÖÜäöü]+.*?)-(?:Hrsg|Hg|hrsg)(?:[-_]Art-(\d+[a-z]?)(?:[-_]([A-Za-z]+))?)?/i
    );
    if (inHrsgM) {
      const PARTICLES = new Set(['von','van','de','du','der','den','zum','zur','am','auf']);
      const parseNames = str => {
        const segs = str.split('-');
        const nns = [], vns = [];
        let i = 0;
        while (i + 1 < segs.length) {
          const vn = capitalize(segs[i]); i++;
          let nn = segs[i]; i++;
          if (PARTICLES.has(nn.toLowerCase()) && i < segs.length) {
            nn = nn.toLowerCase() + ' ' + capitalize(segs[i]);
            i++;
          } else {
            nn = capitalize(nn);
          }
          vns.push(vn);
          nns.push(nn);
        }
        return { nachnamen: nns, vornamen: vns };
      };
      const { nachnamen: nna, vornamen: vna } = parseNames(inHrsgM[1]);
      const { nachnamen: hrsgNa, vornamen: hrsgVna } = parseNames(inHrsgM[2]);
      const artNr  = inHrsgM[3] || '';
      const gesetz = inHrsgM[4] ? inHrsgM[4].toUpperCase() : '';
      // Auflage — Legalis nutzt «Au ﬂage» oder «Au f l» mit Ligatur/Leerzeichen
      const aufM  = t.match(/(\d+)\.\s*Au\s*(?:f\s*l|ﬂ)/i);
      // Jahr — «, 2022» oder «Auflage 2022»
      const jahrM = t.match(/(?:Auflage\s*,?\s*|,\s*)(20\d{2}|19\d{2})/i);
      // Ort aus bekannten Verlagen
      const ortM  = t.match(/\b(Helbing\s+Licht|Stämpfli|Schulthess)\b/i);
      const ort   = ortM ? (/Helbing/i.test(ortM[1]) ? 'Basel' :
                           /Stämpfli/i.test(ortM[1]) ? 'Bern' : 'Zürich') : '';
      // hrsg_raw: Nachnamen der Herausgeber (für Quellentype Kommentar)
      const hrsg_raw = hrsgNa.length
        ? hrsgNa.map((nn, i) => ({ nachname: nn, vorname: hrsgVna[i] || '' }))
        : [];
      return { type: 'kommentar', fields: {
        art_von:       artNr,
        gesetz,
        komm_name:     '',   // Nutzer füllt Titel manuell aus
        nachnamen_raw: nna,
        vornamen_raw:  vna,
        hrsg_raw:      hrsg_raw.map(h => h.vorname ? `${h.vorname} ${h.nachname}` : h.nachname),
        auflage:       aufM  ? aufM[1]  : '',
        jahr:          jahrM ? jahrM[1] : '',
        orte:          ort,
      }};
    }
  }

  // BGE im Dateinamen: BGE-129-III-276.pdf oder BGE_140_I_305.pdf
  const bgeFnM = filename.match(/BGE[-_\s]+(\d{2,3})[-_\s]+([IVX]+)[-_\s]+(\d+)/i);
  if (bgeFnM) {
    return buildBGEResult(bgeFnM[1], bgeFnM[2].toUpperCase(), bgeFnM[3], t);
  }

  // BGer im Dateinamen: 4A.253_2020.pdf oder LA220010-O9.pdf (Arbeitsgericht)
  const bgerFnM = filename.match(/^(?:BGer[-_\s]+)?(\d[A-Za-z][\._]\d+[_\/.]\d{4})/i);
  if (bgerFnM) {
    return { type: 'bger', fields: {
      geschaeft: normalizeBGerCaseNumber(bgerFnM[1]),
      datum: extractDecisionDate(t),
      erwaegung: extractDecisionConsideration(t),
    }};
  }

  // LA / Arbeitsgericht im Dateinamen (z.B. LA220010-O9.pdf)
  if (/^LA\d+/i.test(filename)) {
    const datum = extractDecisionDate(t);
    // Jahr aus Datum (zuverlässig), NICHT aus Dateiname (LA220010 → falsche «2200»)
    const yearM = datum ? datum.match(/\d{4}/) : t.match(/\b(20\d{2}|19\d{2})\b/);
    return { type: 'kantonal', fields: {
      gericht: 'Arbeitsgericht',
      datum,
      jahr:    yearM ? yearM[0] : ''
    }};
  }

  // Kantonale Gerichtsakten im Dateinamen (z.B. HG120134-O24.pdf)
  const kantonalCourtFile = extractCantonalCourtFromFilename(filename, t);
  if (kantonalCourtFile) {
    const datum = extractDecisionDate(head) || extractDecisionDate(t);
    const yearM = datum ? datum.match(/\d{4}$/) : null;
    return {
      type: 'kantonal',
      fields: {
        gericht: kantonalCourtFile,
        datum: datum || '',
        jahr: yearM ? yearM[0] : '',
        erwaegung: extractDecisionConsideration(head) || extractDecisionConsideration(t),
      }
    };
  }

  // AGer-Z / kantonaler Entscheid im Dateinamen
  const aGerFnM = filename.match(/(AGer-Z|AGVE)\s*(\d{4})/i);
  if (aGerFnM) {
    // ── Swisslex-Metadaten-Header parsen ──
    // Format: «Dokument AGer-Z 2015 Nr. 7 Urteilsdatum 06.11.2015 Gericht Zürich, Arbeitsgericht
    //          Publikation ... Rechtsgebiete ... Seite 12»
    const gerichtM = t.match(/Gericht\s+([^\n]+?)(?=\s*(?:Publikation|Rechtsgebiete|Seite\s+\d))/i);
    const datumM   = extractDecisionDate(t);
    // «Seite» im Swisslex-Header (NICHT «S.» im Fliesstext)
    const seiteHdrM = t.match(/(?:^|[\s])Seite\s+(\d+)(?:\s|$)/m);
    // Fallback: «S. 12» nur wenn kein Header-Seite gefunden
    const seiteFbM  = !seiteHdrM ? t.match(/S\.\s*(\d+)/) : null;
    // Gericht aufbereiten: «Zürich, Arbeitsgericht» → «Arbeitsgericht ZH»
    let gericht = '';
    if (gerichtM) {
      const raw = gerichtM[1].trim();
      // Muster «Kanton, Gerichtsname» z.B. «Zürich, Arbeitsgericht»
      const kgM = raw.match(/^([A-Za-zÄÖÜäöü\s.\-]+?),\s*(.+)$/);
      if (kgM) {
        const kantonMap = {
          'Zürich':'ZH','Bern':'BE','Luzern':'LU','Uri':'UR','Schwyz':'SZ',
          'Obwalden':'OW','Nidwalden':'NW','Glarus':'GL','Zug':'ZG',
          'Freiburg':'FR','Solothurn':'SO','Basel-Stadt':'BS','Basel-Landschaft':'BL',
          'Schaffhausen':'SH','Appenzell Ausserrhoden':'AR','Appenzell Innerrhoden':'AI',
          'St. Gallen':'SG','Graubünden':'GR','Aargau':'AG','Thurgau':'TG',
          'Tessin':'TI','Waadt':'VD','Wallis':'VS','Neuenburg':'NE',
          'Genf':'GE','Jura':'JU'
        };
        const kuerzel = kantonMap[kgM[1]] || kgM[1];
        gericht = kgM[2].trim() + ' ' + kuerzel;
      } else {
        gericht = raw;
      }
    }
    return { type: 'kantonal', fields: {
      gericht:     gericht,
      datum:       datumM || '',
      zeitschrift: aGerFnM[1],
      jahr:        aGerFnM[2],
      seite:       seiteHdrM ? seiteHdrM[1] : (seiteFbM ? seiteFbM[1] : '')
    }};
  }

  // ──────────────────────────────────────────────────────────────
  //  STUFE 2a: Navigator.ch / OFK (Orell Füssli Kommentar)
  //  Erkennungsmerkmal: «Artikelkommentar [LAW] [ARTNR]» in Kopf
  //  oder «Reihe OFK – Orell Füssli Kommentar»
  //  Format: Navigator.ch PDF-Export (ähnlich Legalis)
  // ──────────────────────────────────────────────────────────────
  {
    const navHead = t.substring(0, 700);
    if (/\bArtikelkommentar\b/i.test(navHead) || /\bReihe\s+OFK\b/i.test(navHead)) {
      // Art.-Nr. + Gesetz aus erster Zeile: «Artikelkommentar StGB 122»
      const artLineM   = navHead.match(/Artikelkommentar\s+([A-Za-z]+)\s+(\d+[a-z]?)/i);
      const art_von    = artLineM ? artLineM[2] : '';
      // Gesetz NICHT uppercase() — StGB würde sonst zu STGB
      const gesetz     = artLineM ? artLineM[1] : '';
      // Kommentator: «Autoren Andreas Donatsch»
      const autorM     = navHead.match(/\bAutoren?\s+([^\n]+)/i);
      const autorRaw   = autorM ? autorM[1].trim() : '';
      const autorParts = autorRaw.split(/\s+/).filter(Boolean);
      const nachnamen_raw = autorParts.length >= 2
        ? [autorParts[autorParts.length - 1]]
        : (autorRaw ? [autorRaw] : []);
      const vornamen_raw  = autorParts.length >= 2
        ? [autorParts.slice(0, -1).join(' ')]
        : [''];
      // Kommentar-Titel: «Titel StGB/JStG Kommentar»
      const kommTitelM = navHead.match(/\bTitel\s+([^\n]+)/i);
      const komm_name  = kommTitelM ? kommTitelM[1].trim() : 'OFK';
      // Auflage: «Auflage 21., überarbeitete Auflage 2022»
      const aufM  = navHead.match(/Auflage\s+(\d+)/i);
      const jahrM = navHead.match(/\bJahr\s+(\d{4})/i);
      const seitenM = navHead.match(/\bSeiten\s+(\d+)/i);
      // Herausgeber: «Herausgeber Andreas Donatsch»
      const hrsgM    = navHead.match(/\bHerausgeber\s+([^\n]+)/i);
      const hrsgRaw  = hrsgM ? hrsgM[1].trim() : '';
      const hrsg_raw = hrsgRaw ? [hrsgRaw] : [];
      return { type: 'kommentar', fields: {
        art_von,
        gesetz,
        komm_name,
        nachnamen_raw,
        vornamen_raw,
        hrsg_raw,
        auflage:     aufM    ? aufM[1]    : '',
        jahr:        jahrM   ? jahrM[1]   : '',
        orte:        'Zürich',   // Orell Füssli = Zürich
        seite_start: seitenM ? seitenM[1] : '',
      }};
    }
  }

  // ──────────────────────────────────────────────────────────────
  //  STUFE 2: KOMMENTAR-ERKENNUNG (Volltext, aber vor BGE prüfen!)
  //  Kommentare ENTHALTEN immer Verweise auf BGE — deshalb zuerst
  //  auf Kommentar prüfen, bevor BGE-Zitate fehlgeleitet werden.
  // ──────────────────────────────────────────────────────────────
  const kommWorte = ['Basler Kommentar', 'Berner Kommentar', 'Zürcher Kommentar',
                     'Handkommentar', 'Kommentar zu Art', 'BSK OR', 'BSK ZGB',
                     'Stämpflis Handkommentar'];
  const isKomm = kommWorte.some(w => t.includes(w));
  if (isKomm) {
    // Art.-Nummer: ersten Treffer im Textanfang bevorzugen
    const artRxHead = /Art\.\s*(\d+[a-z]?)(?:\s*[-–]\s*(\d+[a-z]?))?\s+([A-Z]{2,5})\b/;
    const artM = head.match(artRxHead) || t.match(artRxHead);
    const kommName = t.includes('Basler')   ? 'Basler Kommentar' :
                     t.includes('Berner')   ? 'Berner Kommentar' :
                     t.includes('Zürcher')  ? 'Zürcher Kommentar' :
                     t.includes('Stämpfli') ? 'Stämpflis Handkommentar' : 'Kommentar';
    const aufM  = t.match(/(\d+)\.\s*Au\s*f\s*l/i);
    const jahrM = t.match(/\b(20[0-3]\d|19[5-9]\d)\b/);
    const ortM  = t.match(/\b(Basel|Bern|Zürich|Genf|Lausanne)\b/);
    // Autoren + Herausgeber aus dem Textanfang extrahieren
    const authHead = extractAuthorsFromHead(head);
    const hrsg_raw = extractHrsgFromHead(head);
    return {
      type: 'kommentar',
      fields: {
        art_von:    artM ? artM[1] : '',
        art_bis:    artM && artM[2] ? artM[2] : '',
        gesetz:     artM ? artM[3] : '',
        komm_name:  kommName,
        auflage:    aufM  ? aufM[1]  : '',
        jahr:       jahrM ? jahrM[1] : '',
        orte:       ortM  ? ortM[1]  : '',
        nachnamen_raw: authHead.length ? authHead.map(a => a.nachname) : undefined,
        vornamen_raw:  authHead.length ? authHead.map(a => a.vorname)  : undefined,
        hrsg_raw:   hrsg_raw.length ? hrsg_raw : undefined,
      }
    };
  }

  // ──────────────────────────────────────────────────────────────
  //  STUFE 3: BGE / BGer — NUR wenn am Textanfang & selten im Text
  // ──────────────────────────────────────────────────────────────

  // Zähle BGE-Vorkommen im Gesamttext: viele = Sekundärquelle
  const bgeCount = (t.match(/BGE\s+\d+\s+[IVX]/g) || []).length;

  // BGE: nur wenn Nummer im Dokumentkopf steht UND maximal 3x vorkommt
  const bgeHeadM = head.match(/BGE\s+(\d{2,3})\s+([IVX]+)\s+(\d{2,4})/);
  if (bgeHeadM && bgeCount <= 3) {
    return buildBGEResult(bgeHeadM[1], bgeHeadM[2], bgeHeadM[3], t);
  }

  // BGer: Geschäftsnummer im Textanfang
  const bgerHeadM = head.match(/BGer\s+(\d[A-Za-z][._]\d{1,6}\/\d{4})/);
  if (bgerHeadM) {
    return {
      type: 'bger',
      fields: {
        geschaeft: normalizeBGerCaseNumber(bgerHeadM[1]),
        datum: extractDecisionDate(head) || extractDecisionDate(t),
        erwaegung: extractDecisionConsideration(head) || extractDecisionConsideration(t),
      }
    };
  }
  // Alternative: Geschäftsnummer-Muster im Kopf (ohne "BGer"-Label)
  const bgerNumHeadM = head.match(/\b(\d[A-Za-z][._]\d{1,5}\/\d{4})\b/);
  if (bgerNumHeadM) {
    return {
      type: 'bger',
      fields: {
        geschaeft: normalizeBGerCaseNumber(bgerNumHeadM[1]),
        datum: extractDecisionDate(head) || extractDecisionDate(t),
        erwaegung: extractDecisionConsideration(head) || extractDecisionConsideration(t),
      }
    };
  }

  // ──────────────────────────────────────────────────────────────
  //  STUFE 3b: MATERIALIEN / AMTLICHES BULLETIN
  // ──────────────────────────────────────────────────────────────
  const materialHead = head.match(/^(Botschaft|Bericht|Vernehmlassung)\s+(.+?)(?:,|vom)/i);
  const bblMatch = t.match(/\bBBl\s+(20\d{2}|19\d{2})\s+S\.\s*(\d+)/i);
  if (materialHead || /^Amtl\.\s*Bull\.\s*(NR|SR)\b/i.test(head) || bblMatch) {
    if (/^Amtl\.\s*Bull\.\s*(NR|SR)\b/i.test(head)) {
      const bullMatch = head.match(/^Amtl\.\s*Bull\.\s*(NR|SR)\s+(20\d{2}|19\d{2})\s+(\d+)(?:\s+\(([^)]+)\))?/i)
        || t.match(/Amtl\.\s*Bull\.\s*(NR|SR)\s+(20\d{2}|19\d{2})\s+(\d+)(?:\s+\(([^)]+)\))?/i);
      return {
        type: 'materialien',
        fields: {
          art: `Amtl. Bull. ${bullMatch ? bullMatch[1] : ''}`.trim(),
          bblJahr: bullMatch ? bullMatch[2] : '',
          bblSeite: bullMatch ? bullMatch[3] : '',
          stichwort: bullMatch && bullMatch[4] ? bullMatch[4].trim() : '',
        }
      };
    }

    const titleMatch = t.match(/^(Botschaft|Bericht|Vernehmlassung)\s+(.+?)(?=,\s*BBl|\s+vom\s+\d{1,2}\.|\n|$)/i);
    const dateMatch = extractDecisionDate(head) || extractDecisionDate(t);
    return {
      type: 'materialien',
      fields: {
        art: titleMatch ? titleMatch[1] : (materialHead ? materialHead[1] : 'Botschaft'),
        titel: titleMatch ? titleMatch[2].trim() : (materialHead ? materialHead[2].trim() : ''),
        datum: dateMatch || '',
        bblJahr: bblMatch ? bblMatch[1] : '',
        bblSeite: bblMatch ? bblMatch[2] : '',
        stichwort: '',
      }
    };
  }

  // ──────────────────────────────────────────────────────────────
  //  STUFE 3c: JUSLETTER
  //  Erkennungsmerkmal: ISSN 1424-7410 oder jusletter.weblaw.ch
  //  Goldgrube: «Zitiervorschlag: Vorname Nachname, Titel, in: Jusletter DD. Mon. YYYY»
  // ──────────────────────────────────────────────────────────────
  if (/1424-7410|jusletter\.weblaw\.ch/i.test(t)) {
    // Zitiervorschlag parsen — enthält Autor, Titel und Datum fertig aufbereitet
    const zitM = t.match(/Zitiervorschlag\s*:\s*(.+?),\s*(.+?),\s*in:\s*Jusletter\s+(\d{1,2}\.\s*\w+\.?\s*\d{4})/i);
    let nachnamen_raw, vornamen_raw, titel = '', datum = '';
    if (zitM) {
      const autorRaw = zitM[1].trim();
      const parts = autorRaw.split(/\s+/).filter(Boolean);
      // Jusletter schreibt «Vorname Nachname»
      nachnamen_raw = [parts.length >= 2 ? parts[parts.length - 1] : autorRaw];
      vornamen_raw  = [parts.length >= 2 ? parts.slice(0, -1).join(' ') : ''];
      titel = zitM[2].trim();
      datum = zitM[3].trim();
    } else {
      // Fallback: erste Zeile = Autorname, zweite = Titel
      const lines = t.split('\n').map(l => l.trim()).filter(Boolean);
      const autorLine = lines[0] || '';
      const parts = autorLine.split(/\s+/).filter(Boolean);
      nachnamen_raw = [parts.length >= 2 ? parts[parts.length - 1] : autorLine];
      vornamen_raw  = [parts.length >= 2 ? parts.slice(0, -1).join(' ') : ''];
      titel = lines[1] || '';
      const jahrM2 = t.match(/Jusletter\s+(?:\d{1,2}\.\s*\w+\.?\s*)?(\d{4})/i);
      datum = jahrM2 ? jahrM2[0].replace(/^Jusletter\s+/i,'').trim() : '';
    }
    return { type: 'zeitschrift', fields: {
      zeitschrift:  'Jusletter',
      jahr:         datum,   // Jusletter hat Datum statt Jahrgang
      seite_start:  '',
      titel,
      nachnamen_raw,
      vornamen_raw,
    }};
  }

  // ──────────────────────────────────────────────────────────────
  //  STUFE 4: ZEITSCHRIFTENARTIKEL
  // ──────────────────────────────────────────────────────────────
  // Bekannte Zeitschriften-Abkürzungen: Muster «AJP 2015 S. 123» im Volltext
  // Fallback für PDFs ohne Swisslex-Dokument-Feld (z.B. eingescannte Aufsätze)
  const journals = [
    { abk: 'AJP',   rx: /AJP[\s/]*(PJA)?[\s\/]*(20\d{2}|19\d{2})\s+S\.\s*(\d+)/i },
    { abk: 'SJZ',   rx: /SJZ\s+(20\d{2}|19\d{2})\s+S\.\s*(\d+)/i },
    // Band/Jahr-Format (z.B. «156/2020») wird durch (?:\d+\/)? unterstützt
    { abk: 'ZBJV',  rx: /ZBJV\s+((?:\d+\/)?\d{4})\s+S\.\s*(\d+)/i },
    { abk: 'ZBl',   rx: /ZBl\s+((?:\d+\/)?\d{4})\s+S\.\s*(\d+)/i },
    { abk: 'BJM',   rx: /BJM\s+((?:\d+\/)?\d{4})\s+S\.\s*(\d+)/i },
    { abk: 'ARV',   rx: /ARV\s+((?:\d+\/)?\d{4})\s+S\.\s*(\d+)/i },
    { abk: 'ZSR',   rx: /ZSR\s+((?:\d+\/)?\d{4})\s+S\.\s*(\d+)/i },
    // Arbeitsrecht-spezifische Zeitschriften
    { abk: 'JAR',   rx: /JAR\s+((?:\d+\/)?\d{4})(?:\s+S\.\s*(\d+))?/i },  // Jahrbuch des Arbeitsrechts
    { abk: 'ArbR',  rx: /ArbR\s+((?:\d+\/)?\d{4})\s+S\.\s*(\d+)/i },
    { abk: 'recht', rx: /\brecht\s+((?:\d+\/)?\d{4})\s+S\.\s*(\d+)/i },
    { abk: 'HAVE',  rx: /HAVE\s+((?:\d+\/)?\d{4})\s+S\.\s*(\d+)/i },
    { abk: 'REPRAX',rx: /REPRAX\s+((?:\d+\/)?\d{4})\s+S\.\s*(\d+)/i },
    { abk: 'GesKR', rx: /GesKR\s+((?:\d+\/)?\d{4})\s+S\.\s*(\d+)/i },
    // Zusätzliche Zeitschriften
    { abk: 'sic!',  rx: /sic!\s+((?:\d+\/)?\d{4})\s+S\.\s*(\d+)/i },
    { abk: 'ZESAR', rx: /ZESAR\s+((?:\d+\/)?\d{4})\s+S\.\s*(\d+)/i },
    { abk: 'SZW',   rx: /SZW\s+((?:\d+\/)?\d{4})\s+S\.\s*(\d+)/i },
    { abk: 'AGer-Z',rx: /AGer-Z\s*(20\d{2}|19\d{2})/i },
  ];
  for (const { abk, rx } of journals) {
    const jM = t.match(rx);
    if (jM) {
      // Jahr: entweder «2020» oder «156/2020» (Band/Jahr-Format)
      const isJahr = v => v && /^(?:\d+\/)?\d{4}$/.test(v);
      const jahr  = isJahr(jM[1]) ? jM[1] : isJahr(jM[2]) ? jM[2] : '';
      const seite = jM[3] || (!isJahr(jM[2]) ? jM[2] : '') || '';
      const authHead = extractAuthorsFromHead(head);
      // Kantonaler Entscheid: Swisslex-Metadaten parsen
      if (abk === 'AGer-Z') {
        const gerichtM = t.match(/Gericht\s+([^\n]+?)(?=\s*(?:Publikation|Rechtsgebiete|Seite\s+\d))/i);
        const datumM   = t.match(/Urteilsdatum\s+(\d{1,2}\.\d{1,2}\.\d{4})/i);
        const seiteHdrM = t.match(/(?:^|[\s])Seite\s+(\d+)(?:\s|$)/m);
        let gericht = '';
        if (gerichtM) {
          const raw = gerichtM[1].trim();
          const kgM = raw.match(/^([A-Za-zÄÖÜäöü\s.\-]+?),\s*(.+)$/);
          if (kgM) {
            const kantonMap = {
              'Zürich':'ZH','Bern':'BE','Luzern':'LU','Uri':'UR','Schwyz':'SZ',
              'Obwalden':'OW','Nidwalden':'NW','Glarus':'GL','Zug':'ZG',
              'Freiburg':'FR','Solothurn':'SO','Basel-Stadt':'BS','Basel-Landschaft':'BL',
              'Schaffhausen':'SH','Appenzell Ausserrhoden':'AR','Appenzell Innerrhoden':'AI',
              'St. Gallen':'SG','Graubünden':'GR','Aargau':'AG','Thurgau':'TG',
              'Tessin':'TI','Waadt':'VD','Wallis':'VS','Neuenburg':'NE',
              'Genf':'GE','Jura':'JU'
            };
            const kuerzel = kantonMap[kgM[1]] || kgM[1];
            gericht = kgM[2].trim() + ' ' + kuerzel;
          } else {
            gericht = raw;
          }
        }
        return { type: 'kantonal', fields: {
          gericht,
          datum:       datumM   ? datumM[1]   : '',
          zeitschrift: abk,
          jahr,
          seite:       seiteHdrM ? seiteHdrM[1] : (/^\d+$/.test(seite) ? seite : '')
        }};
      }
      return {
        type: 'zeitschrift',
        fields: {
          zeitschrift: abk,
          jahr,
          seite_start: /^\d+$/.test(seite) ? seite : '',
          nachnamen_raw: authHead.length ? authHead.map(a => a.nachname) : undefined,
          vornamen_raw:  authHead.length ? authHead.map(a => a.vorname)  : undefined,
        }
      };
    }
  }

  // ──────────────────────────────────────────────────────────────
  //  STUFE 4a: DIKE / LEGALIS Metadaten-Block
  //  Erkennungsmerkmal: «Buchautoren» Feld (Dike-spezifisch)
  //  Format: Titel … Serie/Reihe … Buchautoren … Jahr … Seiten … Herausgeber … Verlag
  // ──────────────────────────────────────────────────────────────
  {
    const dikeHead = t.substring(0, 900);
    const dikeBuchAutM = dikeHead.match(/\bBuchautoren?\s+(.+?)(?=\s*(?:Jahr|Seiten|Herausgeber|ISBN|Verlag|$))/i);
    if (dikeBuchAutM) {
      const dikeTitelM2  = dikeHead.match(/\bTitel\s+(.+?)(?=\s*(?:Serie\/Reihe|Buchautoren|Jahr|Herausgeber|ISBN))/i);
      const dikeSerieM2  = dikeHead.match(/\bSerie\/Reihe\s+(.+?)(?=\s*(?:Band\/Nr\.|Buchautoren|Jahr|Seiten|Herausgeber|ISBN|Verlag|$))/i);
      const dikeHrsgM2   = dikeHead.match(/\bHerausgeber\s+(.+?)(?=\s*(?:ISBN|Verlag|Seiten|\d{3,}-|$))/i);
      const dikeJahrM2   = dikeHead.match(/\bJahr\s+(\d{4})/i);
      const dikeSeitenM2 = dikeHead.match(/\bSeiten\s+(\d+)/i);
      const dikeVerlagM2 = dikeHead.match(/\bVerlag\s+(.+?)(?=\s*(?:ISBN|$))/i);

      // Autor: letztes Wort = Nachname, Rest = Vorname(n)
      const autorRaw   = dikeBuchAutM[1].trim();
      const autorParts = autorRaw.split(/\s+/).filter(Boolean);
      const nachnamen_raw = [autorParts.length >= 2 ? autorParts[autorParts.length - 1] : autorRaw];
      const vornamen_raw  = [autorParts.length >= 2 ? autorParts.slice(0, -1).join(' ') : ''];

      // Herausgeber parsen: «Roland Müller, Thomas Geiser» → [{vorname,nachname}]
      const hrsg_raw = [];
      if (dikeHrsgM2) {
        dikeHrsgM2[1].trim().split(/,\s*/).forEach(p => {
          const w = p.trim().split(/\s+/);
          if (w.length >= 2) hrsg_raw.push({ vorname: w[0], nachname: w.slice(1).join(' ') });
          else if (w.length === 1 && w[0]) hrsg_raw.push({ vorname: '', nachname: w[0] });
        });
      }

      // sb_titel: aus Serie/Reihe (Band/Nr.-Anhang entfernen)
      let sbTitel = '';
      if (dikeSerieM2) sbTitel = dikeSerieM2[1].trim().replace(/\s+Band\/Nr\..*$/i, '').trim();

      // Erscheinungsort: Verlag → bekannte Standorte
      const verlagCityMap = {
        'Dike': 'Zürich', 'Schulthess': 'Zürich', 'Stämpfli': 'Bern',
        'Helbing': 'Basel', 'Orell': 'Zürich', 'Rüegger': 'Zürich',
        'Nomos': 'Baden-Baden', 'DIKE': 'Zürich',
      };
      let orte = '';
      if (dikeVerlagM2) {
        for (const [v, city] of Object.entries(verlagCityMap)) {
          if (dikeVerlagM2[1].includes(v)) { orte = city; break; }
        }
      }
      if (!orte) {
        const ortM2 = t.match(/\b(Bern|Basel|Zürich|Genf|Lausanne|St\. Gallen)\b/);
        orte = ortM2 ? ortM2[1] : '';
      }

      const beitragTitel = dikeTitelM2 ? dikeTitelM2[1].replace(/\s+/g, ' ').trim() : '';

      if (dikeHrsgM2) {
        return { type: 'sammelband', fields: {
          titel:       beitragTitel,
          sb_titel:    sbTitel,
          auflage:     '',
          orte,
          jahr:        dikeJahrM2   ? dikeJahrM2[1]   : '',
          seite_start: dikeSeitenM2 ? dikeSeitenM2[1]  : '',
          nachnamen_raw,
          vornamen_raw,
          hrsg_raw,
        }};
      }
    }
  }

  // ──────────────────────────────────────────────────────────────
  //  STUFE 4b: SWISSLEX-METADATEN-BLOCK (Sammelband / Monographie)
  //  Format: «Titel … Autor … Auflage … Jahr … Herausgeber … Verlag …»
  //  Wenn «Herausgeber» vorhanden → Sammelband-Beitrag
  //  Wenn nur Autor + Titel → Monographie
  // ──────────────────────────────────────────────────────────────
  // Swisslex-Metadaten-Felder: nur im Kopf des Dokuments suchen (erste 600 Zeichen)
  // Swisslex platziert die Metadaten-Tabelle immer am Seitenanfang (vor dem Fliesstext).
  const swissHead   = t.substring(0, 600);
  const swissHrsgM  = swissHead.match(/\bHerausgeber\s+(.+?)(?=\s*(?:ISBN|Verlag|Seiten|\d{3}-|\u00a9|$))/i)
                   || t.match(/\bHerausgeber\s+(.+?)(?=\s*(?:ISBN|Verlag|Seiten|\d{3}-|\u00a9|$))/i);
  const swissTitelM = swissHead.match(/\bTitel\s+(.+?)(?=\s*(?:Serie\/Reihe|Autor|Auflage|Jahr|Herausgeber|ISBN))/i)
                   || t.match(/\bTitel\s+(.+?)(?=\s*(?:Serie\/Reihe|Autor|Auflage|Jahr|Herausgeber|ISBN))/i);
  const swissBuchTitelM = swissHead.match(/\bBuchtitel\s+(.+?)(?=\s*(?:Jahr|Seiten|Herausgeber|ISBN|Verlag))/i)
                      || t.match(/\bBuchtitel\s+(.+?)(?=\s*(?:Jahr|Seiten|Herausgeber|ISBN|Verlag))/i);
  // Autor: erst im Head, dann im erweiterten Kopf bis 900 Zeichen
  const swissAutorM = swissHead.match(/\bAutor\s+([A-Za-zÄÖÜäöü](?:[A-Za-zÄÖÜäöü\s.\-]+?)?)(?=\s*(?:Titel|Serie\/Reihe|Buchtitel|Auflage|Jahr|Seiten|Herausgeber|ISBN|Verlag))/i)
                   || t.substring(0, 900).match(/\bAutor\s+([A-Za-zÄÖÜäöü](?:[A-Za-zÄÖÜäöü\s.\-]+?)?)(?=\s*(?:Titel|Serie\/Reihe|Buchtitel|Auflage|Jahr|Seiten|Herausgeber|ISBN|Verlag))/i);
  const swissAuflM  = swissHead.match(/\bAuflage\s+(\d+)/i) || t.match(/\bAuflage\s+(\d+)/i);
  const swissJahrM  = swissHead.match(/\bJahr\s+(\d{4})/i)  || t.match(/\bJahr\s+(\d{4})/i);
  const swissSeitenM= swissHead.match(/\bSeiten\s+(\d+)/i)  || t.match(/\bSeiten\s+(\d+)/i);

  if (swissTitelM || swissAutorM) {
    const beitragTitelMeta = swissTitelM ? swissTitelM[1].trim() : '';
    const sbTitel  = swissBuchTitelM ? swissBuchTitelM[1].trim() : '';
    const autorRaw = swissAutorM ? swissAutorM[1].trim() : '';
    const auflage  = swissAuflM  ? swissAuflM[1]  : '';
    const jahr     = swissJahrM  ? swissJahrM[1]  : '';
    const seite    = swissSeitenM ? swissSeitenM[1] : '';
    // Verlag → Ort extrahieren (z.B. «Schulthess Juristische Medien AG» → Zürich/Basel/Genf aus Text)
    const ortM2  = t.match(/\b(Bern|Basel|Zürich|Genf|Lausanne|St\. Gallen)\b/);
    const orte   = ortM2 ? ortM2[1] : '';
    // Autorname aufteilen: Swisslex schreibt «Vorname [Zweiter Vorname] Nachname»
    // Regel: letztes Wort = Nachname, Rest = Vorname(n)
    const autorParts = autorRaw.split(/\s+/).filter(Boolean);
    let nachnamen_raw, vornamen_raw;
    if (autorParts.length >= 2) {
      nachnamen_raw = [autorParts[autorParts.length - 1]];
      vornamen_raw  = [autorParts.slice(0, -1).join(' ')];
    }
    if (swissHrsgM) {
      // ── Sammelband-Beitrag ──
      // Beitragstitel bevorzugt aus Swisslex-Titel, sonst aus Dateiname herleiten
      const beitragTitel = beitragTitelMeta || filename
        .replace(/\.pdf$/i,'')
        .replace(/_/g,' ')
        .replace(/\s*\|.*$/,'')  // alles nach Pipe entfernen
        .trim();
      // Herausgeber parsen: «Adrian von Kaenel, Roger Rudolph» → [{vorname,nachname}]
      const hrsgRaw = swissHrsgM[1].trim();
      const hrsgParts = hrsgRaw.split(/,\s*/);
      const hrsg_raw = hrsgParts.map(p => {
        const w = p.trim().split(/\s+/);
        if (w.length >= 2) return { vorname: w[0], nachname: w.slice(1).join(' ') };
        return { vorname: '', nachname: p.trim() };
      }).filter(h => h.nachname);
      return { type: 'sammelband', fields: {
        titel:        beitragTitel,
        sb_titel:     sbTitel,
        auflage,
        orte,
        jahr,
        seite_start:  seite,
        nachnamen_raw,
        vornamen_raw,
        hrsg_raw,
      }};
    } else {
      // ── Monographie / Lehrbuch ──
      return { type: 'monographie', fields: {
        titel:   sbTitel,
        auflage,
        orte,
        jahr,
        nachnamen_raw,
        vornamen_raw,
      }};
    }
  }

  // ──────────────────────────────────────────────────────────────
  //  STUFE 5: MONOGRAPHIE (Fallback)
  // ──────────────────────────────────────────────────────────────
  const yearM  = t.match(/\b(20[0-3]\d|19[5-9]\d)\b/);
  const ortM   = t.match(/\b(Bern|Basel|Zürich|Genf|Lausanne|St\. Gallen)\b/);
  const aufM2  = t.match(/(\d+)\.\s*Au\s*f\s*l/i);
  const authHead2 = extractAuthorsFromHead(head);
  return {
    type: 'monographie',
    fields: {
      jahr:   yearM ? yearM[1]  : '',
      orte:   ortM  ? ortM[1]   : '',
      auflage: aufM2 ? aufM2[1] : '',
      nachnamen_raw: authHead2.length ? authHead2.map(a => a.nachname) : undefined,
      vornamen_raw:  authHead2.length ? authHead2.map(a => a.vorname)  : undefined,
    }
  };
}

// ── BGE-Ergebnis zusammenbauen ─────────────────────────────────
function buildBGEResult(band, teil, seite, t) {
  const res = { type: 'bge', fields: { band, teil: teil.toUpperCase(), seite } };
  // Erwägung: nur aus Textanfang lesen, um Verwechslungen zu vermeiden
  const erwaegung = extractDecisionConsideration(t);
  if (erwaegung) res.fields.erwaegung = erwaegung;
  return res;
}

// ══════════════════════════════════════════════════════════════
//  Apply detected info to form
// ══════════════════════════════════════════════════════════════
async function applyDetectedInfo(detected, fullText) {
  const { type, fields } = detected;
  const filled = [];
  const missing = [];
  window.__lexciteLastDetection = {
    source: 'pdf',
    type,
    fields: { ...fields },
  };

  // Set type dropdown
  document.getElementById('sourceType').value = type;
  if (typeof LexCiteUsage !== 'undefined' && type) {
    LexCiteUsage.trackSourceType(type);
  }
  renderForm();

  // Short delay for DOM
  await new Promise(r => setTimeout(r, 60));

  // Autoren aus erkannten nachnamen_raw + vornamen_raw befüllen (ZUERST)
  // Priorität: strukturiert erkannte Autoren (Swisslex, Legalis) haben Vorrang
  // vor der generischen Textextraktion, die bei bibliographiereichen Dokumenten
  // (z.B. Sammelband-Beiträge mit Spezialliteratur) falsche Namen liefert.
  if (fields.nachnamen_raw && fields.nachnamen_raw.length) {
    const authorData = fields.nachnamen_raw.map((nn, i) => ({
      nachname: nn,
      vorname: (fields.vornamen_raw && fields.vornamen_raw[i]) ? fields.vornamen_raw[i] : ''
    }));
    fillAuthorBlocks(authorData, 'authorsList', filled);
  }

  // Fallback: generische Textextraktion — NUR wenn noch kein Autor gefüllt wurde
  // und der Typ kein strukturiertes Metadaten-Format hat (kein Sammelband/Kommentar)
  if (!filled.includes('Autor(en)') && (type === 'monographie' || type === 'zeitschrift')) {
    const authorData = extractAuthorsFromText(fullText);
    if (authorData.length) {
      fillAuthorBlocks(authorData, 'authorsList', filled);
    }
  }

  // Herausgeber befüllen (Kommentar + Sammelband: hrsgList)
  if ((type === 'kommentar' || type === 'sammelband') && fields.hrsg_raw && fields.hrsg_raw.length) {
    // kurze Pause damit hrsgList im DOM bereit ist
    await new Promise(r => setTimeout(r, 30));
    fillAuthorBlocks(fields.hrsg_raw, 'hrsgList', filled, 'Herausgeber');
  }

  // Fill known fields
  const fieldMap = {
    bge:          ['band','teil','seite','erwaegung'],
    bger:         ['geschaeft','datum','erwaegung'],
    dissertation: ['titel','untertitel','uni_ort','orte','jahr'],
    monographie:  ['titel','untertitel','band','auflage','orte','jahr'],
    zeitschrift: ['titel','zeitschrift','jahr','seite_start'],
    kommentar:   ['art_von','art_bis','gesetz','komm_name','teilband','auflage','orte','jahr'],
    kantonal:    ['gericht','datum','zeitschrift','jahr','seite','erwaegung'],
    sammelband:  ['titel','sb_titel','auflage','orte','jahr','seite_start'],
    gesetz:      ['titel','sr','abk'],
    internet:    ['titel','url','datum'],
  };

  // Special: try to extract title, year, orte from monograph text
  // WICHTIG: nur leere Felder befüllen — strukturierte Swisslex/Legalis-Daten haben Vorrang
  if (type === 'monographie' && fullText) {
    const extra = extractMonographFields(fullText);
    Object.keys(extra).forEach(k => { if (!fields[k]) fields[k] = extra[k]; });
  }
  if (type === 'zeitschrift' && fullText) {
    const extra = extractArticleTitle(fullText);
    Object.keys(extra).forEach(k => { if (!fields[k]) fields[k] = extra[k]; });
  }
  if (type === 'kommentar' && fullText) {
    const extra = extractKommentarFields(fullText);
    Object.keys(extra).forEach(k => { if (!fields[k]) fields[k] = extra[k]; });
  }

  // Apply to form fields
  for (const key of (fieldMap[type] || [])) {
    const val = fields[key];
    if (val) {
      const el = document.getElementById(key);
      if (el) { el.value = val; markAutofill(el); filled.push(keyLabel(key)); }
    } else {
      const el = document.getElementById(key);
      if (el && !isOptionalField(key)) missing.push(keyLabel(key));
    }
  }

  // Handle teilband_hint for Kommentar
  if (type === 'kommentar' && fields.teilband_hint) {
    const el = document.getElementById('teilband');
    if (el && !el.value) { el.value = fields.teilband_hint; markAutofill(el); filled.push('Teilband'); }
  }

  // Show autofill legend if anything was filled
  if (filled.length > 0) {
    document.getElementById('autofillLegend').classList.add('visible');
  }

  // Status message
  const typeLabel = {
    bge: 'BGE', bger: 'BGer (nicht publiziert)', monographie: 'Monographie',
    dissertation: 'Dissertation/Habilitation',
    zeitschrift: 'Zeitschriftenartikel', kommentar: 'Kommentar',
    kantonal: 'Kantonaler Entscheid', sammelband: 'Sammelband',
    gesetz: 'Gesetz/Erlass', internet: 'Internetfundstelle'
  }[type] || type;

  const filledHtml = filled.map(f => `<span class="detected-pill">${f}</span>`).join(' ');
  const missingHtml = missing.map(f => `<span class="missing-pill">${f} fehlt</span>`).join(' ');

  if (filled.length === 0) {
    showPdfStatus('partial',
      `<strong>Typ erkannt: ${typeLabel}</strong><br>Keine Felder konnten automatisch ausgefüllt werden. Bitte manuell ausfüllen.<br>${missingHtml}`
    );
  } else {
    const statusClass = missing.length === 0 ? 'success' : 'partial';
    showPdfStatus(statusClass,
      `<strong>Erkannt: ${typeLabel}</strong><br>${filledHtml}${missingHtml ? '<br>Noch ausfüllen: ' + missingHtml : ''}`
    );
  }
}

// ══════════════════════════════════════════════════════════════
//  Text Extraction Helpers
// ══════════════════════════════════════════════════════════════

// Extrahiert Autoren aus dem Dokumentkopf.
// Legalis-PDFs rendern Autorennamen in Kapitälchen — PDF.js kann diese als reine
// Grossbuchstaben extrahieren. Deshalb werden mehrere Muster probiert.
function extractAuthorsFromHead(head) {
  const results = [];

  // Muster 1: «Vorname Nachname/Vorname2 Nachname2» (gemischte Schreibung)
  // Erlaubt auch mehrgliedrige Nachnamen wie «Widmer Lüchinger»
  const slashPattern = /([A-ZÄÖÜ][a-zäöü]+)\s+([A-ZÄÖÜ][A-Za-zäöüÄÖÜ\-]+(?:\s+[A-ZÄÖÜ][a-zäöü]+)?)\s*\/\s*([A-ZÄÖÜ][a-zäöü]+)\s+([A-ZÄÖÜ][A-Za-zäöüÄÖÜ\-]+(?:\s+[A-ZÄÖÜ][a-zäöü]+)?)/;
  const slashM = head.match(slashPattern);
  if (slashM) {
    results.push({ vorname: slashM[1], nachname: slashM[2] });
    results.push({ vorname: slashM[3], nachname: slashM[4] });
    return results;
  }

  // Muster 1b: ALL-CAPS Slash «VORNAME NACHNAME/VORNAME2 NACHNAME2»
  // Legalis-Kapitälchen werden von PDF.js oft als reine Grossbuchstaben extrahiert
  const capsSlashPat = /([A-ZÄÖÜ]{2,})\s+([A-ZÄÖÜ]{3,})\s*\/\s*([A-ZÄÖÜ]{2,})\s+([A-ZÄÖÜ]{3,})/;
  const csM = head.match(capsSlashPat);
  if (csM && !isHeadingWord(csM[1]) && !isHeadingWord(csM[3])) {
    results.push({ vorname: capitalize(csM[1]), nachname: capitalize(csM[2]) });
    results.push({ vorname: capitalize(csM[3]), nachname: capitalize(csM[4]) });
    return results;
  }

  // Muster 2: Einzelautor «Vorname Nachname» (gemischte Schreibung)
  const singlePattern = /^([A-ZÄÖÜ][a-zäöü]+)\s+([A-ZÄÖÜ][A-Za-zäöüÄÖÜ\-]+(?:\s+[A-ZÄÖÜ][a-zäöü]+)?)\s*(?:\*|,|\n)/m;
  const singM = head.match(singlePattern);
  if (singM && !isHeadingWord(singM[2])) {
    results.push({ vorname: singM[1], nachname: singM[2] });
    return results;
  }

  // Muster 2b: ALL-CAPS Einzelautor «VORNAME NACHNAME,» (Legalis single-author)
  const capsSinglePat = /([A-ZÄÖÜ]{2,})\s+([A-ZÄÖÜ]{3,})\s*(?:,|$)/m;
  const csSingM = head.match(capsSinglePat);
  if (csSingM && !isHeadingWord(csSingM[1]) && !isHeadingWord(csSingM[2])) {
    results.push({ vorname: capitalize(csSingM[1]), nachname: capitalize(csSingM[2]) });
    return results;
  }

  // Muster 3: «NACHNAME Vorname» (Kapitälchen-Export im Nachnamen-zuerst-Format)
  const capsPattern = /\b([A-ZÄÖÜ]{3,})\s+([A-ZÄÖÜ][a-zäöü]+)\b/g;
  let cm;
  while ((cm = capsPattern.exec(head)) !== null && results.length < 3) {
    if (!isHeadingWord(cm[1])) {
      results.push({ nachname: capitalize(cm[1]), vorname: cm[2] });
    }
  }
  return results;
}

// Wrapper für Abwärtskompatibilität
function extractAuthorsFromText(text) {
  return extractAuthorsFromHead(text.substring(0, 400));
}

// ══════════════════════════════════════════════════════════════
//  PDF-Text Vorverarbeitung
//  Problem: Legalis-PDFs mit Kapitälchen werden von PDF.js als
//  Einzelbuchstaben extrahiert: «W O L F G A N G   P O R T M A N N»
//  → Muss zu «WOLFGANG PORTMANN» rekonstruiert werden.
// ══════════════════════════════════════════════════════════════
function preprocessPDFText(text) {
  let t = text;

  // Schritt 1: Zusammenhängende Einzelbuchstaben-Sequenzen zusammenfügen
  // «W O L F G A N G» → «WOLFGANG» (mind. 3 Buchstaben mit je 1 Leerzeichen Abstand)
  t = t.replace(/([A-ZÄÖÜ])( [A-ZÄÖÜ]){2,}/g, m => m.replace(/ /g, ''));

  // Schritt 2: Leerzeichen vor Slash entfernen («PORTMANN /ROGER» → «PORTMANN/ROGER»)
  // Entsteht durch den Leerraum zwischen zwei spaced-letter Wörtern vor dem Slash
  t = t.replace(/([A-ZÄÖÜ]{3,}) \/([A-Z])/g, '$1/$2');

  // Schritt 3: Mehrfache Leerzeichen normalisieren (entstehen durch den obigen Prozess)
  t = t.replace(/ {2,}/g, ' ');

  return t;
}

function normalizeBGerCaseNumber(raw) {
  const s = normalizeWhitespace(raw).replace(/^BGer\s+/i, '').replace(/\.pdf$/i, '');
  const m = s.match(/^(\d+[A-Za-z])[._](\d{1,6})[\/._](\d{4})$/);
  if (m) return `${m[1]}_${m[2]}/${m[3]}`;
  return s.replace(/^(\d+[A-Za-z])\.(\d{1,6}\/\d{4})$/, '$1_$2');
}

function extractCantonalCourtFromFilename(filename, text) {
  const name = String(filename || '');
  const patterns = [
    { rx: /^HG\d/i, label: 'Handelsgericht' },
    { rx: /^OG\d/i, label: 'Obergericht' },
    { rx: /^KG\d/i, label: 'Kantonsgericht' },
    { rx: /^VG\d/i, label: 'Verwaltungsgericht' },
    { rx: /^SG\d/i, label: 'Sozialversicherungsgericht' },
  ];
  const match = patterns.find(entry => entry.rx.test(name));
  if (!match) return '';

  const t = String(text || '');
  const cantonMap = {
    'Zürich': 'ZH', 'Bern': 'BE', 'Luzern': 'LU', 'Basel-Stadt': 'BS',
    'Basel-Landschaft': 'BL', 'St. Gallen': 'SG', 'Aargau': 'AG',
    'Thurgau': 'TG', 'Graubünden': 'GR', 'Tessin': 'TI', 'Waadt': 'VD',
    'Genf': 'GE', 'Zug': 'ZG', 'Solothurn': 'SO', 'Freiburg': 'FR',
    'Wallis': 'VS', 'Neuenburg': 'NE', 'Jura': 'JU',
  };

  const courtTextPatterns = [
    new RegExp(`${match.label}\\s+des\\s+Kantons\\s+([A-Za-zÄÖÜäöü.\\- ]+?)(?=\\s+(?:Urteil|Entscheid|Beschluss|vom)\\b|[.,;]|$)`, 'i'),
    new RegExp(`${match.label}\\s+([A-Za-zÄÖÜäöü.\\- ]+?)(?=\\s+(?:Urteil|Entscheid|Beschluss|vom)\\b|[.,;]|$)`, 'i'),
  ];
  for (const rx of courtTextPatterns) {
    const m = t.match(rx);
    if (m && m[1]) {
      const canton = normalizeWhitespace(m[1]).replace(/[.,;:].*$/, '').trim();
      const suffix = cantonMap[canton];
      if (suffix) return `${match.label} ${suffix}`;
    }
  }

  return match.label;
}

function normalizeSwissDate(day, month, year) {
  const monthMap = {
    'januar': '01', 'janvier': '01', 'gennaio': '01',
    'februar': '02', 'fevrier': '02', 'fevrier.': '02', 'fevrier,': '02', 'février': '02', 'febbraio': '02',
    'maerz': '03', 'märz': '03', 'mars': '03', 'marzo': '03',
    'april': '04', 'avril': '04', 'aprile': '04',
    'mai': '05', 'maggio': '05',
    'juni': '06', 'juin': '06', 'giugno': '06',
    'juli': '07', 'juillet': '07', 'luglio': '07',
    'august': '08', 'aout': '08', 'août': '08', 'agosto': '08',
    'september': '09', 'septembre': '09', 'settembre': '09',
    'oktober': '10', 'octobre': '10', 'ottobre': '10',
    'november': '11', 'novembre': '11',
    'dezember': '12', 'decembre': '12', 'décembre': '12', 'dicembre': '12',
  };
  const key = String(month || '').toLowerCase().replace(/ä/g, 'ä').replace(/é/g, 'é').replace(/\.$/, '');
  const fallbackKey = key.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const mm = monthMap[key] || monthMap[fallbackKey];
  if (!mm) return '';
  return `${String(day).padStart(2, '0')}.${mm}.${year}`;
}

function extractDecisionDate(text) {
  const t = String(text || '');
  const numeric = t.match(/\b(\d{1,2})\.(\d{1,2})\.(\d{4})\b/);
  if (numeric) return `${numeric[1].padStart(2, '0')}.${numeric[2].padStart(2, '0')}.${numeric[3]}`;

  const longDate = t.match(/\b(?:Urteil|Entscheid|Urteilsdatum|Arr[êe]t|Sentenza)?\s*(?:vom|du|del)?\s*(\d{1,2})\.\s*(Januar|Janvier|Gennaio|Februar|F[ée]vrier|Febbraio|März|Maerz|Mars|Marzo|April|Avril|Aprile|Mai|Maggio|Juni|Juin|Giugno|Juli|Juillet|Luglio|August|Août|Aout|Agosto|September|Septembre|Settembre|Oktober|Octobre|Ottobre|November|Novembre|Dezember|D[ée]cembre|Dicembre)\s+(\d{4})\b/i);
  if (longDate) return normalizeSwissDate(longDate[1], longDate[2], longDate[3]);

  return '';
}

function extractDecisionConsideration(text) {
  const t = String(text || '').substring(0, 1200);
  const match = t.match(/\bE\.\s*([\d]+(?:[a-z]|\.\d+)*)/i);
  return match ? match[1] : '';
}

// Extrahiert Herausgeber aus dem Legalis/BSK-Format «…, in: Vorname Nachname, Vorname2 Nachname2 Werk…»
// Beispiel: «Wolfgang Portmann/Roger Rudolph, in: Corinne Widmer Lüchinger, David Oser Obligationenrecht I»
function extractHrsgFromHead(head) {
  // Suche «, in:» gefolgt von Namen bis zum nächsten klar erkennbaren Nicht-Namen-Token
  const inM = head.match(/,\s*in:\s*(.+?)(?:\s+(?:Obligationenrecht|Obligationen|Stämpflis?|Handkommentar|[0-9]+\.\s*Aufl|Helbing|Stämpfli|Schulthess|Dike|\[Seite|Art\.\s*\d))/i);
  if (!inM) return [];
  const block = inM[1].trim();
  // Komma-getrennte Namen: «Corinne Widmer Lüchinger, David Oser»
  const results = [];
  const parts = block.split(/,\s*/);
  for (const part of parts) {
    const words = part.trim().split(/\s+/);
    if (words.length >= 2 && /^[A-ZÄÖÜ]/.test(words[0])) {
      const vorname = words[0];
      const nachname = words.slice(1).join(' ');
      if (/^[A-ZÄÖÜ]/.test(nachname)) {
        results.push({ vorname, nachname });
      }
    }
  }
  return results;
}

function extractMonographFields(text) {
  const fields = {};
  // Year: look for standalone 4-digit year near city names
  const yearM = text.match(/\b(19[5-9]\d|20[0-3]\d)\b/);
  if (yearM) fields.jahr = yearM[1];
  // Swiss cities
  const cityRx = /\b(Bern|Basel|Zürich|Genf|Lausanne|St\. Gallen|Schulthess|Stämpfli|Dike)\b/;
  const cityM = text.match(cityRx);
  if (cityM) fields.orte = cityM[1];
  // Auflage
  const aufM = text.match(/(\d+)\.\s*Au\s*f\s*l/i);
  if (aufM && parseInt(aufM[1]) > 1) fields.auflage = aufM[1];
  return fields;
}

function extractArticleTitle(text) {
  const fields = {};
  // Title is usually the first long text block after the author
  // Simple: first sentence-like string of 20-100 chars
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 20 && l.length < 200);
  if (lines.length > 0) {
    // Skip lines that look like author names or journal info
    for (const line of lines) {
      if (!/^\d/.test(line) && !/^(AJP|SJZ|ZBl|ZBJV|BJM|Praxis)/.test(line)) {
        fields.titel = line.replace(/\*$/,'').trim();
        break;
      }
    }
  }
  return fields;
}

function extractKommentarFields(text) {
  const fields = {};
  const head = String(text || '').substring(0, 1500);
  const norm = head.replace(/\s+/g, ' ').trim();

  const artM = norm.match(/Kommentar\s+zu\s+(Art\.|§)\s*(\d+[a-z]?)(?:\s*[-–]\s*(\d+[a-z]?))?\s+([A-Z]{2,8})\b/i)
    || norm.match(/\b(Art\.|§)\s*(\d+[a-z]?)(?:\s*[-–]\s*(\d+[a-z]?))?\s+([A-Z]{2,8})\b/i);
  if (artM) {
    fields.art_von = artM[2];
    if (artM[3]) fields.art_bis = artM[3];
    fields.gesetz = artM[4];
  }

  const kommNameM = norm.match(/\b(Basler Kommentar|Berner Kommentar|Zürcher Kommentar|Stämpflis Handkommentar|Handkommentar)\b/i);
  if (kommNameM) fields.komm_name = kommNameM[1];

  const teilbandM = norm.match(/\b(Obligationenrecht\s+[IVX]+(?:,\s*Art\.\s*[\dA-Za-z–\- ]+\s+[A-Z]{2,8})?|Zivilgesetzbuch\s+[IVX]+(?:,\s*Art\.\s*[\dA-Za-z–\- ]+\s+[A-Z]{2,8})?)\b/i);
  if (teilbandM) fields.teilband_hint = teilbandM[1].replace(/\s+/g, ' ').trim();

  const aufM = norm.match(/(\d+)\.\s*Au\s*f\s*l/i);
  if (aufM) fields.auflage = aufM[1];

  const yearM = norm.match(/\b(19[5-9]\d|20[0-3]\d)\b/);
  if (yearM) fields.jahr = yearM[1];

  const cityM = norm.match(/\b(Basel|Bern|Zürich|Genf|Lausanne)\b/);
  if (cityM) fields.orte = cityM[1];

  const hrsg = extractHrsgFromHead(head);
  if (hrsg.length) fields.hrsg_raw = hrsg;

  return fields;
}

window.__lexcitePdfDebug = {
  detectSource,
  preprocessPDFText,
  normalizeBGerCaseNumber,
  normalizeSwissDate,
  extractDecisionDate,
  extractDecisionConsideration,
  extractAuthorsFromHead,
  extractHrsgFromHead,
  extractMonographFields,
  extractArticleTitle,
  extractKommentarFields,
};
