function detectTypeFromText(text) {
  const t = text.trim();
  if (/^BGE\s+\d+\s+(I{1,3}|IV|VI{0,3}|V)\s+\d+/.test(t)) return 'bge';
  if (/^BGer\s+\d+[A-Z]+[._]\d+\/\d{4}/.test(t) || /^Urteil des Bundesgerichts/.test(t)) return 'bger';
  if (/^BVGE\s+\d+/.test(t) || /^BVGer\s+[A-Z]-\d+/.test(t)) return 'bvge';
  const kantonalCourts = ['KGer','OGer','AGer','HGer','VGer','StGer','AGVE','ZR','JAR','ARV','SozGer'];
  if (kantonalCourts.some(c => t.startsWith(c)) || /\bEntscheid vom\b/.test(t)) return 'kantonal';
  if (/^(Botschaft|Bericht|Vernehmlassung)\b/.test(t) || /^Amtl\.\s*Bull\.\s*(NR|SR)\b/.test(t) || /,\s*BBl\s+\d{4}\s*S\.\s*\d+/i.test(t)) return 'materialien';
  if (/(^|,\s*)(SR|LS|SAR|BSG)\s*\d/.test(t) || /^Art\.\s*\d+[a-z]?(?:\s+Abs\.\s*\d+)?(?:\s+lit\.\s*[a-z])?\s+[A-Z]{2,}/.test(t)) return 'gesetz';
  if (/\b(?:Diss\.|Habil\.)/.test(t)) return 'dissertation';
  if (/(https?:\/\/|www\.)/.test(t) || /besucht am:/i.test(t)) return 'internet';
  if (/\bin:\s/.test(t) && !/[Kk]ommentar\s+zu\s+Art/.test(t)) return 'sammelband';
  if (/[Kk]ommentar\s+zu\s+Art|N\s+\d+/.test(t)) return 'kommentar';
  const journals = ['AJP','ZSR','ZBJV','SJZ','BJM','HAVE','SZZP','Jusletter','plädoyer','ZBl','BaK','ZWR','SHK','BSK','recht','ZZZ'];
  if (journals.some(j => new RegExp('\\b' + j + '\\b').test(t))) return 'zeitschrift';
  return 'monographie';
}

// ── Format templates (ZitierGuide 5. Aufl.) ──────────────────
const FORMAT_TEMPLATES = {
  bge: {
    voll: 'BGE [Band] [Abt.] [Seite], [Fundstelle] [f./ff.]',
    kurz: 'BGE [Band] [Abt.] [Seite]',
    verz: '— BGE-Entscheide stehen im Judikaturverzeichnis (kein separater Verzeichniseintrag)',
  },
  bger: {
    voll: 'BGer [Geschäftsnummer, z.B. 9C_355/2023] vom [TT.MM.JJJJ] E. [Nr.]',
    kurz: 'BGer [Geschäftsnummer] E. [Nr.]',
    verz: 'BGer [Geschäftsnummer] vom [TT.MM.JJJJ]',
  },
  bvge: {
    voll: 'BVGE [Jahr/Nr.] E. [Nr.] / BVGer [Az] vom [TT.MM.JJJJ] E. [Nr.]',
    kurz: 'BVGE [Jahr/Nr.] E. [Nr.] / BVGer [Az] E. [Nr.]',
    verz: 'BVGE [Jahr/Nr.] / BVGer [Az] vom [TT.MM.JJJJ]',
  },
  kantonal: {
    voll: '[Gericht] [Datum], [Aktenzeichen], [Publikation] [Band/Jahr] [Seite]',
    kurz: '[Gericht] [Datum], [Aktenzeichen]',
    verz: '[Gericht] [Datum], [Aktenzeichen], [Publikation] [Band/Jahr] [Seite]',
  },
  monographie: {
    voll: 'NACHNAME Vorname, Titel, [Aufl.], Ort Jahr, S. [Seite]',
    kurz: 'NACHNAME, [Stichwort,] S. [Seite]',
    verz: 'NACHNAME Vorname, Titel, [Aufl.], Ort Jahr.',
  },
  dissertation: {
    voll: 'NACHNAME Vorname, Titel[, Untertitel], Diss./Habil. UniOrt, Ort Jahr, S. [Seite]',
    kurz: 'NACHNAME, [Stichwort,] S. [Seite]',
    verz: 'NACHNAME Vorname, Titel[, Untertitel], Diss./Habil. UniOrt, Ort Jahr.',
  },
  zeitschrift: {
    voll: 'NACHNAME Vorname, Aufsatztitel, Zeitschrift [Band/Jahr] [Seite ff.], [Fundstelle]',
    kurz: 'NACHNAME, Aufsatztitel, Zeitschrift [Band/Jahr] [Seite]',
    verz: 'NACHNAME Vorname, Aufsatztitel, Zeitschrift [Band/Jahr] [Seite ff.]',
  },
  kommentar: {
    voll: 'NACHNAME Vorname, in: HRSG Vorname (Hrsg.), Kommentartitel, [Teilband], [Aufl.], Ort Jahr. / NACHNAME Vorname, Kommentartitel (selbständig), [Aufl.], Ort Jahr.',
    kurz: 'NACHNAME, Art. [X] [Gesetz] N [Rz.]',
    verz: 'NACHNAME Vorname, in: HRSG Vorname (Hrsg.), Kommentartitel, [Teilband], [Aufl.], Ort Jahr.',
  },
  sammelband: {
    voll: 'NACHNAME Vorname, Beitragstitel, in: HRSG Vorname (Hrsg.), Bandtitel, [Aufl.], Ort Jahr, S. [Seite ff.], [Fundstelle]',
    kurz: 'NACHNAME, Beitragstitel, S. [Seite]',
    verz: 'NACHNAME Vorname, Beitragstitel, in: HRSG Vorname (Hrsg.), Bandtitel, [Aufl.], Ort Jahr, S. [Seite ff.]',
  },
  materialien: {
    voll: 'Botschaft/Bericht [Titel] vom [Datum], BBl [Jahr] S. [Seite] ff. (zit. [Stichwort]) / Amtl. Bull. NR|SR [Jahr] [Seite] ([Votant])',
    kurz: 'Botschaft/Bericht [Stichwort], S. [Seite] / Amtl. Bull. NR|SR [Jahr] [Seite] ([Votant])',
    verz: 'Botschaft/Bericht [Titel] vom [Datum], BBl [Jahr] S. [Seite] ff. (zit. [Stichwort])',
  },
  gesetz: {
    voll: '[Vollständiger Erlasstitel] vom [Datum] ([Kurztitel]), SR/LS/... [Nr.]',
    kurz: 'Art. [X] Abs. [Y] [Abkürzung]',
    verz: '[Vollständiger Erlasstitel] vom [Datum] ([Kurztitel]), SR/LS/... [Nr.]',
  },
  internet: {
    voll: 'NACHNAME Vorname, Titel, Websitename, [TT.MM.JJJJ], [URL], besucht am [TT.MM.JJJJ]',
    kurz: 'NACHNAME, N [Randziffer] / S. [Seite] / [Ziff./Überschrift]',
    verz: 'NACHNAME Vorname, Titel, Websitename, [TT.MM.JJJJ], [URL], besucht am [TT.MM.JJJJ]',
  },
};

const GUIDE_RULES = {
  kommentar: {
    template(formatSel) {
      return FORMAT_TEMPLATES.kommentar[formatSel] || '—';
    },
    issues(text) {
      const issues = [];
      if (!/Art\.\s*\d+[a-z]?(?:[–-]\d+[a-z]?)?\s+[A-Z]{2,}/.test(text))
        issues.push('⚠️ Kommentar-Kurzangaben brauchen die Gesetzesstelle, z.B. <strong>Art. 97 OR</strong>.');
      // Guide S. 7–8: Kurzzitat braucht N [Randnote]; Vollzitat hat kein «Kommentar zu» Präfix
      if (!/\bN\s*\d+/.test(text) && !/in:\s+/.test(text) && !/,\s+\d+\.\s+Aufl\./.test(text))
        issues.push('⚠️ Kommentare werden in Fussnoten nach <strong>Randnote (N)</strong> zitiert, z.B. <em>PORTMANN, Art. 322d OR N 5.</em>');
      // Vollzitat unselbständig: muss «in:» enthalten (kein «Kommentar zu» mehr nötig)
      if (/^\s*[A-ZÄÖÜ].*?,\s+in:\s+/i.test(text) && /in:\s+.+\(Hrsg\.\)/i.test(text))
        ; // korrekt — keine Warnung
      return issues;
    },
  },
  bge: {
    template(formatSel) {
      return FORMAT_TEMPLATES.bge[formatSel] || '—';
    },
    regenerate(text, formatSel) {
      const parsed = parseBGECitation(text);
      if (!parsed || formatSel === 'verz') return null;
      return formatBGECitation(parsed, formatSel === 'kurz' ? 'short' : 'full');
    },
    issues(text) {
      const issues = [];
      const parsed = parseBGECitation(text);
      if (!/^BGE\s/.test(text))
        issues.push('⚠️ Muss mit <strong>BGE</strong> (Grossbuchstaben + Leerzeichen) beginnen.');
      if (!parsed)
        issues.push('⚠️ Format nicht erkannt — erwartet: <strong>BGE [Band] [Röm. Abteilung] [Seite]</strong>, z.B. <em>BGE 141 III 569 E. 4.2</em>.');
      if (/BGE\s+\d+,/.test(text))
        issues.push('⚠️ Kein Komma direkt nach der Bandnummer — die Abteilung (I/II/III/IV) fehlt oder ist falsch platziert.');
      if (parsed && !parsed.erwaegung && !/ff\./.test(text))
        issues.push('ℹ️ Bei BGE sollte entweder die relevante Erwägung (<strong>E.</strong>) oder bei Verweis auf den ganzen Entscheid <strong>ff.</strong> angegeben werden.');
      return issues;
    },
  },
  bger: {
    template(formatSel) {
      return FORMAT_TEMPLATES.bger[formatSel] || '—';
    },
    regenerate(text) {
      const parsed = parseBGerCitation(text);
      return parsed ? formatBGerCitation(parsed) : null;
    },
    issues(text) {
      const issues = [];
      const parsed = parseBGerCitation(text);
      if (!parsed)
        issues.push('⚠️ BGer-Format nicht erkannt — erwartet: <strong>BGer [Geschäftsnummer] vom [Datum]</strong>, z.B. <em>BGer 9C_355/2023 vom 07.09.2023 E. 3.2</em>.');
      if (/^Urteil des Bundesgerichts/.test(text))
        issues.push('ℹ️ Ausgeschriebene Bezeichnung «Urteil des Bundesgerichts» — üblicher ist die Kurzform <strong>BGer</strong>.');
      if (parsed && !parsed.datum)
        issues.push('⚠️ Bei nicht amtlich publizierten Bundesgerichtsurteilen gehört das <strong>Entscheiddatum</strong> dazu.');
      if (/\d+[A-Z]+\.\d+\/\d{4}/.test(text))
        issues.push('ℹ️ Die Geschäftsnummer wird in der App standardmässig mit <strong>Unterstrich</strong> vereinheitlicht, z.B. <em>9C_355/2023</em>.');
      return issues;
    },
  },
  bvge: {
    template(formatSel) {
      return FORMAT_TEMPLATES.bvge[formatSel] || '—';
    },
    regenerate(text) {
      const parsed = parseBVGECitation(text);
      return parsed ? formatBVGECitation(parsed) : null;
    },
    issues(text) {
      const issues = [];
      const parsed = parseBVGECitation(text);
      if (!parsed)
        issues.push('⚠️ Format nicht erkannt — erwartet: <strong>BVGE [Jahr/Nr.] E. [Nr.]</strong> oder <strong>BVGer [Az] vom [Datum] E. [Nr.]</strong>.');
      if (parsed && parsed.art === 'BVGer' && !parsed.datum)
        issues.push('⚠️ Bei <strong>BVGer</strong> gehört das Entscheiddatum dazu; nur <strong>BVGE</strong> kommt ohne Datum aus.');
      return issues;
    },
  },
  kantonal: {
    template(formatSel) {
      return FORMAT_TEMPLATES.kantonal[formatSel] || '—';
    },
    issues(text, formatSel) {
      const issues = [];
      if (!/\b(?:Entscheid vom|Urteil vom|\d{1,2}\.\d{1,2}\.\d{4})\b/.test(text))
        issues.push('⚠️ Bei kantonalen Entscheiden gehört ein <strong>Datum</strong> dazu.');
      if (!/\b(?:ZR|BJM|SJZ|AGVE|JAR|ARV)\b|\bS\.\s*\d+/.test(text))
        issues.push('ℹ️ Es wurde keine klare <strong>Publikation/Fundstelle</strong> erkannt — prüfe Zeitschrift, Jahrgang und Seite.');
      if (formatSel !== 'verz' && !/\bE\.\s*[\dA-Za-z.]+/.test(text))
        issues.push('ℹ️ Bei punktuellem Verweis sollte die relevante <strong>Erwägung</strong> angegeben werden.');
      return issues;
    },
  },
  materialien: {
    template(formatSel) {
      return FORMAT_TEMPLATES.materialien[formatSel] || '—';
    },
    regenerate(text, formatSel) {
      const parsed = parseMaterialCitation(text);
      if (!parsed) return null;
      return formatMaterialCitation(parsed, formatSel === 'kurz' ? 'short' : 'full');
    },
    issues(text, formatSel) {
      const issues = [];
      const parsed = parseMaterialCitation(text);
      if (formatSel === 'kurz' && /^(Botschaft|Bericht|Vernehmlassung)\s+.+?(?:,\s*S\.\s*\d+)?\.?$/i.test(stripTrailingPeriod(text))) {
        return issues;
      }
      if (!parsed) {
        issues.push('⚠️ Format nicht erkannt — erwartet z.B. <strong>Botschaft ... vom [Datum], BBl [Jahr] S. [Seite] ff. (zit. [Stichwort])</strong> oder <strong>Amtl. Bull. NR/SR [Jahr] [Seite]</strong>.');
        return issues;
      }
      if (parsed.art.startsWith('Amtl. Bull.')) {
        if (formatSel === 'verz')
          issues.push('ℹ️ <strong>Amtl. Bull.</strong> erscheint nicht im Materialienverzeichnis, sondern nur in der Fussnote.');
        return issues;
      }
      if (!parsed.bblJahr || !parsed.bblSeite)
        issues.push('⚠️ Bei Botschaften/Berichten fehlt die <strong>BBl-Fundstelle</strong> mit Jahr und Seite.');
      if (!parsed.stichwort && formatSel !== 'kurz')
        issues.push('⚠️ Im Materialienverzeichnis sollte ein <strong>(zit. Stichwort)</strong> angegeben werden.');
      return issues;
    },
  },
  gesetz: {
    template(formatSel) {
      return FORMAT_TEMPLATES.gesetz[formatSel] || '—';
    },
    regenerate(text, formatSel) {
      const parsed = parseLawCitation(text);
      if (!parsed) return null;
      if (parsed.mode === 'short') return formatSel === 'kurz' ? formatLawCitation(parsed, 'short') : null;
      if (formatSel === 'kurz') return null;
      return formatLawCitation(parsed, 'full');
    },
    issues(text, formatSel) {
      const issues = [];
      const parsed = parseLawCitation(text);
      if (!parsed) {
        issues.push('⚠️ Format nicht erkannt — erwartet entweder <strong>Art. [X] Abs. [Y] [Abkürzung]</strong> oder <strong>[Erlasstitel], SR/LS/... [Nr.]</strong>.');
        return issues;
      }
      if (parsed.mode === 'short') {
        if (formatSel !== 'kurz')
          issues.push('ℹ️ Das sieht eher nach einer <strong>Fussnoten-Kurzangabe</strong> als nach einem Verzeichnis- oder Vollzitat aus.');
        return issues;
      }
      if (!/\bvom\b/.test(parsed.titel))
        issues.push('⚠️ Bei vollständigen Gesetzesangaben gehört das <strong>Datum des Erlasses</strong> dazu.');
      if (!parsed.abk)
        issues.push('ℹ️ Im Titel ist keine klare <strong>Abkürzung / kein Kurztitel in Klammern</strong> erkennbar.');
      if (!/(SR|LS|SAR|BSG)\s*\d/.test(parsed.sr))
        issues.push('⚠️ Es fehlt die <strong>systematische Nummer</strong> wie SR, LS, SAR oder BSG.');
      return issues;
    },
  },
};

// ── Issue checkers per type ───────────────────────────────────
function getIssues(text, type, formatSel = 'voll') {
  const issues = [];
  const litTypes = ['monographie','dissertation','zeitschrift','kommentar','sammelband'];

  if (litTypes.includes(type) && formatSel !== 'kurz') {
    // Must have KAPITÄLCHEN-like author (3+ consecutive capitals)
    if (!/[A-ZÄÖÜ]{3,}/.test(text)) {
      issues.push('⚠️ Autorname nicht in <strong>KAPITÄLCHEN</strong> — Nachnamen müssen vollständig grossgeschrieben werden (z.B. <em>PORTMANN</em> Wolfgang), vgl. ZitierGuide § 3.');
    }
    if (!/\d{4}/.test(text)) {
      issues.push('⚠️ Kein <strong>Erscheinungsjahr</strong> erkannt — Jahreszahl fehlt möglicherweise.');
    }
    if ((text.match(/,/g) || []).length < 2) {
      issues.push('ℹ️ Wenige Kommata — Bestandteile (Autor, Titel, Auflage, Ort Jahr) werden durch Kommata getrennt.');
    }
  }

  if (GUIDE_RULES[type]?.issues) issues.push(...GUIDE_RULES[type].issues(text, formatSel));

  if (type === 'monographie' && formatSel === 'verz') {
    if (/\bS\.\s*\d+/.test(text))
      issues.push('ℹ️ Seitenangabe «S. [Zahl]» gefunden — im <strong>Verzeichniseintrag</strong> entfällt die konkrete Fundstelle; im <strong>Vollzitat</strong> (Fussnote) ist sie korrekt.');
    if (/Dike|Schulthess|Stämpfli|Nomos|Helbing/.test(text))
      issues.push('⚠️ Verlagsname gefunden — der Verlagsname wird gemäss ZitierGuide S. 6 <strong>nicht</strong> angegeben.');
    if (/\bISBN\b/.test(text))
      issues.push('⚠️ ISBN-Nummer gefunden — wird im Zitat nicht angegeben.');
  }

  if (type === 'dissertation' && formatSel !== 'kurz') {
    if (!/\b(?:Diss\.|Habil\.)/.test(text))
      issues.push('⚠️ Kein <strong>«Diss.»</strong> oder <strong>«Habil.»</strong> gefunden — bei Dissertationen und Habilitationen muss dieser Zusatz stehen (ZitierGuide S. 6).');
    if (/Diss\.,|Habil\.,/.test(text))
      issues.push('⚠️ Komma nach «Diss.» / «Habil.» — zwischen dem Kürzel und dem <strong>Universitätsort</strong> steht kein Komma (z.B. «Diss. St. Gallen, Zürich 2024»), vgl. ZitierGuide S. 6.');
    // Check for series name (should NOT be included)
    const seriesHints = ['SGRW','ZStP','ZStR','ZZP','AISUF','SBI','BIR','Zürcher Studien','St. Galler Studien','Basler Studien'];
    const foundSeries = seriesHints.find(s => text.includes(s));
    if (foundSeries)
      issues.push(`⚠️ Schriftenreihe «${foundSeries}» gefunden — die Schriftenreihe wird gemäss ZitierGuide S. 6 <strong>nicht</strong> angegeben.`);
    if (/Dike|Schulthess|Stämpfli|Nomos|Helbing/.test(text))
      issues.push('⚠️ Verlagsname gefunden — der Verlagsname wird gemäss ZitierGuide S. 6 <strong>nicht</strong> angegeben.');
    if (/\bISBN\b/.test(text))
      issues.push('⚠️ ISBN-Nummer gefunden — wird im Zitat nicht angegeben.');
  }

  if (type === 'zeitschrift') {
    const journals = ['AJP','ZSR','ZBJV','SJZ','BJM','HAVE','Jusletter','plädoyer','ZBl','recht'];
    if (!journals.some(j => text.includes(j)))
      issues.push('ℹ️ Keine bekannte Zeitschriften-Abkürzung erkannt — prüfe, ob die Abkürzung dem ZitierGuide entspricht.');
  }

  if (type === 'sammelband' && formatSel !== 'kurz' && !/\bin:\s/i.test(text)) {
    issues.push('⚠️ Beiträge in Sammelbänden müssen mit <strong>in:</strong> auf die Fundstelle verweisen.');
  }

  if (type === 'internet') {
    if (formatSel !== 'kurz' && !/besucht am/i.test(text))
      issues.push('⚠️ Kein «<strong>besucht am [Datum]</strong>» — bei Internetquellen ist das Zugriffsdatum nach ZitierGuide obligatorisch.');
    if (formatSel !== 'kurz' && !/(https?:\/\/|www\.)/.test(text))
      issues.push('⚠️ Keine URL erkannt — bei Internetquellen muss der Link oder zumindest die Website-Adresse angegeben werden.');
    if (formatSel === 'kurz' && !/\b(N\s*\d+|S\.\s*\d+|Ziff\.\s*\d+|Kapitel|Abschnitt)\b/i.test(text))
      issues.push('ℹ️ In der Kurzangabe sollte die relevante Textstelle möglichst präzise über <strong>S.</strong>, <strong>N</strong>, Ziffer oder Überschrift bezeichnet werden.');
  }

  // Guide S. 29: Auf «a.a.O.» und «ebd.» soll verzichtet werden
  if (/\ba\.a\.O\b|\bebd\.\b/i.test(text))
    issues.push('⚠️ «<strong>a.a.O.</strong>» / «<strong>ebd.</strong>» gefunden — laut ZitierGuide S. 29 ist stets die ordentliche Kurzangabe zu verwenden (z.B. <em>MÜLLER, S. 45.</em>).');

  return issues;
}

// ── Try to re-generate the correct BGE citation ───────────────
function regenerateBGE(text) {
  const parsed = parseBGECitation(text);
  return parsed ? formatBGECitation(parsed, /,\s*\d+/.test(text) ? 'short' : 'full') : null;
}

// ── Try to re-generate the correct BGer citation ──────────────
function regenerateBGer(text) {
  const parsed = parseBGerCitation(text);
  return parsed ? formatBGerCitation(parsed).replace(/\.$/, '') : null;
}

function regenerateBVGE(text) {
  const parsed = parseBVGECitation(text);
  return parsed ? formatBVGECitation(parsed).replace(/\.$/, '') : null;
}

const GUIDE_REFERENCE_CASES = [
  { id: 'bge', type: 'bge', label: 'BGE', citation: 'BGE 127 I 164 E. 3c', format: 'voll', expectIssues: 0 },
  { id: 'bger', type: 'bger', label: 'BGer', citation: 'BGer 9C_355/2023 vom 07.09.2023 E. 3.2.', format: 'voll', expectIssues: 0 },
  { id: 'bvge', type: 'bvge', label: 'BVGE', citation: 'BVGE 2007/1 E. 3.5', format: 'voll', expectIssues: 0 },
  { id: 'bvger', type: 'bvge', label: 'BVGer', citation: 'BVGer A-1234/2020 vom 14.02.2021 E. 2.1.', format: 'voll', expectIssues: 0 },
  { id: 'kantonal', type: 'kantonal', label: 'Kantonal', citation: 'Zivilgericht BS, Entscheid vom 27.9.2001, BJM 2002 S. 95 ff. E. 5a.', format: 'voll', expectIssues: 0 },
  { id: 'kantonal-zr', type: 'kantonal', label: 'Kantonal (ZR)', citation: 'Obergericht ZH, Entscheid vom 12.05.2020, ZR 119/2020 S. 45 ff. E. 3b.', format: 'voll', expectIssues: 0 },
  { id: 'monographie', type: 'monographie', label: 'Monographie', citation: 'KOLLER Alfred, Schweizerisches Obligationenrecht, Allgemeiner Teil, Grundriss des allgemeinen Schuldrechts ohne Deliktsrecht, Bd. I, 4. Aufl., Bern 2017.', format: 'verz', expectIssues: 0 },
  { id: 'monographie-kurz', type: 'monographie', label: 'Monographie kurz', citation: 'KOLLER, S. 45.', format: 'kurz', expectIssues: 0 },
  { id: 'dissertation', type: 'dissertation', label: 'Dissertation', citation: 'AESCHI Oliver, Organisationshaftung, Risiko und Unsorgfalt bei der Geschäftsherrenhaftung, Diss. Neuenburg, Bern 2005.', format: 'verz', expectIssues: 0 },
  { id: 'habilitation', type: 'dissertation', label: 'Habilitation', citation: 'MUSTER Eva, Verwaltungsrechtliche Standards im Gesundheitswesen, Habil. Zürich, Basel 2024.', format: 'verz', expectIssues: 0 },
  { id: 'dissertation-kurz', type: 'dissertation', label: 'Dissertation kurz', citation: 'AESCHI, S. 88.', format: 'kurz', expectIssues: 0, autoDetect: false },
  { id: 'zeitschrift', type: 'zeitschrift', label: 'Zeitschrift', citation: 'WALTER Hans Peter, Vertrauenshaftung im Umfeld des Vertrages, ZBJV 1996 S. 273 ff.', format: 'verz', expectIssues: 0 },
  { id: 'zeitschrift-kurz', type: 'zeitschrift', label: 'Zeitschrift kurz', citation: 'WALTER, Vertrauenshaftung im Umfeld des Vertrages, ZBJV 1996 S. 273.', format: 'kurz', expectIssues: 0 },
  { id: 'zeitschrift-jusletter', type: 'zeitschrift', label: 'Zeitschrift (Jusletter)', citation: 'MÜLLER Roger, Digitalisierung im Zivilprozess, Jusletter 12. März 2024.', format: 'verz', expectIssues: 0 },
  { id: 'sammelband', type: 'sammelband', label: 'Sammelband', citation: 'HUNGER Patrick, Erlöschen von Obligationen (§ 6), in: Böhringer Peter/Müller Roger/Münch Peter/Waltenspühl Alex (Hrsg.), Prinzipien des Vertragsrechts, 4. Aufl., Zürich 2020, S. 97 ff.', format: 'verz', expectIssues: 0 },
  { id: 'sammelband-kurz', type: 'sammelband', label: 'Sammelband kurz', citation: 'HUNGER, Erlöschen von Obligationen, S. 101.', format: 'kurz', expectIssues: 0, autoDetect: false },
  { id: 'kommentar', type: 'kommentar', label: 'Kommentar', citation: 'SCHNYDER Anton K., Kommentar zu Art. 41–59a OR, in: Widmer Lüchinger Corinne/Oser David (Hrsg.), Basler Kommentar, Obligationenrecht I, Art. 1–529 OR, 7. Aufl., Basel 2019.', format: 'verz', expectIssues: 0 },
  { id: 'kommentar-kurz', type: 'kommentar', label: 'Kommentar kurz', citation: 'PORTMANN/RUDOLPH, Art. 327b OR N 16.', format: 'kurz', expectIssues: 0 },
  { id: 'materialien', type: 'materialien', label: 'Materialien', citation: 'Botschaft zur Volksinitiative «Gegen neue Kampfflugzeuge» vom 26. August 2009, BBl 2009 S. 5975 ff. (zit. Kampfflugzeuge).', format: 'verz', expectIssues: 0 },
  { id: 'materialien-kurz', type: 'materialien', label: 'Materialien kurz', citation: 'Botschaft Kampfflugzeuge, S. 5980.', format: 'kurz', expectIssues: 0, autoDetect: false },
  { id: 'amtl-bull', type: 'materialien', label: 'Amtl. Bull.', citation: 'Amtl. Bull. NR 2009 1234 (Müller).', format: 'voll', expectIssues: 0 },
  { id: 'gesetz', type: 'gesetz', label: 'Gesetz', citation: 'Bundesgesetz über die Raumplanung vom 22. Juni 1979 (Raumplanungsgesetz, RPG), SR 700', format: 'verz', expectIssues: 0 },
  { id: 'gesetz-sar', type: 'gesetz', label: 'Gesetz (SAR)', citation: 'Gesetz über die Einwohnergemeinden vom 19. Dezember 1978 (Gemeindegesetz, GG), SAR 171.100', format: 'verz', expectIssues: 0 },
  { id: 'gesetz-kurz', type: 'gesetz', label: 'Gesetz kurz', citation: 'Art. 322d Abs. 2 OR.', format: 'kurz', expectIssues: 0 },
  { id: 'internet', type: 'internet', label: 'Internet', citation: 'Bundesamt für Gesundheit, Bericht vom Oktober 2009 zu den Ergebnissen des Anhörungsverfahrens betreffend den Verordnungsentwurf zum Schutz vor Passivrauchen, www.admin.ch (Bundesrecht/Vernehmlassungen/Abgeschlossene Vernehmlassungen/2009/Verordnung zum Schutz vor Passivrauchen – Bericht), besucht am: 11.08.2022.', format: 'verz', expectIssues: 0 },
  { id: 'internet-kurz-ziff', type: 'internet', label: 'Internet kurz', citation: 'Bundesamt für Gesundheit, Ziff. 3.2.', format: 'kurz', expectIssues: 0, autoDetect: false },
  { id: 'internet-kurz-kapitel', type: 'internet', label: 'Internet kurz (Kapitel)', citation: 'Bundesamt für Gesundheit, Kapitel Vollzug.', format: 'kurz', expectIssues: 0, autoDetect: false },
  { id: 'internet-kurz-abschnitt', type: 'internet', label: 'Internet kurz (Abschnitt)', citation: 'Bundesamt für Gesundheit, Abschnitt Schutzkonzept.', format: 'kurz', expectIssues: 0, autoDetect: false },
];

const GUIDE_NEGATIVE_CASES = [
  {
    id: 'neg-bger-ohne-datum',
    type: 'bger',
    label: 'BGer ohne Datum',
    citation: 'BGer 9C_355/2023 E. 3.2.',
    format: 'voll',
    minIssues: 1,
    mustContain: ['Entscheiddatum']
  },
  {
    id: 'neg-bvger-ohne-datum',
    type: 'bvge',
    label: 'BVGer ohne Datum',
    citation: 'BVGer A-1234/2020 E. 2.1.',
    format: 'voll',
    minIssues: 1,
    mustContain: ['Entscheiddatum']
  },
  {
    id: 'neg-bge-ohne-abteilung',
    type: 'bge',
    label: 'BGE ohne Abteilung',
    citation: 'BGE 141 569 E. 4.2',
    format: 'voll',
    minIssues: 1,
    mustContain: ['Format nicht erkannt']
  },
  {
    id: 'neg-kantonal-ohne-datum',
    type: 'kantonal',
    label: 'Kantonal ohne Datum',
    citation: 'Obergericht ZH, ZR 119/2020 S. 45 ff.',
    format: 'voll',
    minIssues: 1,
    mustContain: ['Datum']
  },
  {
    id: 'neg-kommentar-ohne-art',
    type: 'kommentar',
    label: 'Kommentar ohne Gesetzesstelle',
    citation: 'PORTMANN/RUDOLPH, N 16.',
    format: 'kurz',
    minIssues: 1,
    mustContain: ['Gesetzesstelle']
  },
  {
    id: 'neg-kommentar-mit-seite',
    type: 'kommentar',
    label: 'Kommentar mit Seitenangabe',
    citation: 'PORTMANN/RUDOLPH, Art. 327b OR S. 16.',
    format: 'kurz',
    minIssues: 1,
    mustContain: ['Randnote']
  },
  {
    id: 'neg-zeitschrift-ohne-abkuerzung',
    type: 'zeitschrift',
    label: 'Zeitschrift ohne erkennbare Abkürzung',
    citation: 'MÜLLER Roger, Digitalisierung im Zivilprozess, Juristische Fachzeitschrift 2024 S. 15 ff.',
    format: 'verz',
    minIssues: 1,
    mustContain: ['Zeitschriften-Abkürzung']
  },
  {
    id: 'neg-monographie-mit-verlag',
    type: 'monographie',
    label: 'Monographie mit Verlag',
    citation: 'MEIER Hans, Vertragsrecht, Dike, Zürich 2020.',
    format: 'verz',
    minIssues: 1,
    mustContain: ['Verlagsname']
  },
  {
    id: 'neg-dissertation-mit-reihe',
    type: 'dissertation',
    label: 'Dissertation mit Schriftenreihe',
    citation: 'MUSTER Eva, Digitalisierung im Verwaltungsrecht, Diss. Zürich, SGRW 10, Zürich 2024.',
    format: 'verz',
    minIssues: 1,
    mustContain: ['Schriftenreihe']
  },
  {
    id: 'neg-materialien-ohne-bbl',
    type: 'materialien',
    label: 'Materialien ohne BBl',
    citation: 'Botschaft zur Volksinitiative «Gegen neue Kampfflugzeuge» vom 26. August 2009.',
    format: 'verz',
    minIssues: 1,
    mustContain: ['BBl-Fundstelle']
  },
  {
    id: 'neg-gesetz-ohne-sr',
    type: 'gesetz',
    label: 'Gesetz ohne SR',
    citation: 'Bundesgesetz über die Raumplanung vom 22. Juni 1979 (Raumplanungsgesetz, RPG)',
    format: 'verz',
    minIssues: 1,
    mustContain: ['Format nicht erkannt']
  },
  {
    id: 'neg-internet-ohne-besucht',
    type: 'internet',
    label: 'Internet ohne Besuchsdatum',
    citation: 'Bundesamt für Gesundheit, Bericht zum Schutz vor Passivrauchen, www.admin.ch',
    format: 'verz',
    minIssues: 1,
    mustContain: ['besucht am']
  },
  {
    id: 'neg-internet-kurz-ohne-stelle',
    type: 'internet',
    label: 'Internet kurz ohne Fundstelle',
    citation: 'Bundesamt für Gesundheit.',
    format: 'kurz',
    minIssues: 1,
    mustContain: ['präzise']
  },
  {
    id: 'neg-internet-voll-ohne-url',
    type: 'internet',
    label: 'Internet ohne URL',
    citation: 'Bundesamt für Gesundheit, Bericht zum Schutz vor Passivrauchen, besucht am: 11.08.2022.',
    format: 'verz',
    minIssues: 1,
    mustContain: ['URL']
  },
];

function renderReferenceCases() {
  const el = document.getElementById('checkerReferenceGrid');
  if (!el) return;
  const categoryMeta = {
    entscheid: { title: 'Entscheide', intro: 'Die wichtigsten Referenzfälle für Judikatur und den stärksten PDF-Flow.' },
    werke: { title: 'Monographien & Dissertationen', intro: 'Werke, Dissertationen und Habilitationen für Verzeichnis und Kurzangabe.' },
    literatur: { title: 'Kommentare & Beiträge', intro: 'Kommentare, Zeitschriften und Sammelband-Beiträge für Fussnoten und Vollzitate.' },
    normen: { title: 'Materialien & Gesetze', intro: 'Botschaften, Amtl. Bull. und Erlasse für Verzeichnisse und Vollzitate.' },
    online: { title: 'Internet', intro: 'Webquellen und kurze Verweise auf konkrete Stellen.' },
  };
  const categoryFor = (ref) => {
    if (['bge', 'bger', 'bvge', 'kantonal'].includes(ref.type)) return 'entscheid';
    if (['monographie', 'dissertation'].includes(ref.type)) return 'werke';
    if (['zeitschrift', 'sammelband', 'kommentar'].includes(ref.type)) return 'literatur';
    if (['materialien', 'gesetz'].includes(ref.type)) return 'normen';
    return 'online';
  };
  const grouped = { entscheid: [], werke: [], literatur: [], normen: [], online: [] };
  GUIDE_REFERENCE_CASES.forEach(ref => {
    grouped[categoryFor(ref)].push(ref);
  });
  const sectionOrder = {
    entscheid: [
      'bge',
      'bger',
      'bvge',
      'bvger',
      'kantonal',
      'kantonal-zr',
    ],
    werke: [
      'monographie',
      'dissertation',
      'habilitation',
      'monographie-kurz',
      'dissertation-kurz',
    ],
    literatur: [
      'kommentar',
      'kommentar-kurz',
      'zeitschrift',
      'zeitschrift-kurz',
      'zeitschrift-jusletter',
      'sammelband',
      'sammelband-kurz',
    ],
    normen: [
      'materialien',
      'materialien-kurz',
      'amtl-bull',
      'gesetz',
      'gesetz-sar',
      'gesetz-kurz',
    ],
    online: [
      'internet',
      'internet-kurz-ziff',
      'internet-kurz-kapitel',
      'internet-kurz-abschnitt',
    ],
  };
  const subsectionMeta = {
    literatur: [
      {
        title: 'Kommentare',
        ids: ['kommentar', 'kommentar-kurz'],
      },
      {
        title: 'Zeitschriften',
        ids: ['zeitschrift', 'zeitschrift-kurz', 'zeitschrift-jusletter'],
      },
      {
        title: 'Sammelbände',
        ids: ['sammelband', 'sammelband-kurz'],
      },
    ],
  };

  el.innerHTML = Object.entries(categoryMeta).map(([key, meta]) => {
    const refs = [...(grouped[key] || [])];
    const desiredOrder = sectionOrder[key] || [];
    refs.sort((a, b) => {
      const ai = desiredOrder.indexOf(a.id);
      const bi = desiredOrder.indexOf(b.id);
      const av = ai === -1 ? Number.MAX_SAFE_INTEGER : ai;
      const bv = bi === -1 ? Number.MAX_SAFE_INTEGER : bi;
      return av - bv || a.label.localeCompare(b.label, 'de-CH');
    });
    if (!refs.length) return '';
    const defaultGrid = `
      <div class="checker-ref-section-grid">
        ${refs.map(ref => `
          <button class="checker-ref-chip" onclick="loadReferenceCase('${ref.id}')" type="button">
            <strong>${esc(ref.label)}</strong>
            <span>${esc(ref.citation.slice(0, 80))}${ref.citation.length > 80 ? '…' : ''}</span>
          </button>
        `).join('')}
      </div>
    `;
    const subsectionContent = (subsectionMeta[key] || []).map(group => {
      const groupRefs = refs.filter(ref => group.ids.includes(ref.id));
      if (!groupRefs.length) return '';
      return `
        <div class="checker-ref-subsection">
          <div class="checker-ref-subsection-title">${esc(group.title)}</div>
          <div class="checker-ref-section-grid">
            ${groupRefs.map(ref => `
              <button class="checker-ref-chip" onclick="loadReferenceCase('${ref.id}')" type="button">
                <strong>${esc(ref.label)}</strong>
                <span>${esc(ref.citation.slice(0, 80))}${ref.citation.length > 80 ? '…' : ''}</span>
              </button>
            `).join('')}
          </div>
        </div>
      `;
    }).join('');
    return `
      <section class="checker-ref-section">
        <div class="checker-ref-section-head">
          <div class="checker-ref-section-title">${esc(meta.title)}</div>
          <div class="checker-ref-section-intro">${esc(meta.intro)}</div>
        </div>
        ${subsectionContent || defaultGrid}
      </section>
    `;
  }).join('');
}

function setReferenceStatus(text) {
  const el = document.getElementById('checkerReferenceStatus');
  if (!el) return;
  el.textContent = text;
  el.classList.toggle('visible', !!text);
}

function loadReferenceCase(id) {
  const ref = GUIDE_REFERENCE_CASES.find(x => x.id === id);
  if (!ref) return;
  const input = document.getElementById('checkerInput');
  const typeSelect = document.getElementById('checkerTypeSelect');
  const formatSelect = document.getElementById('checkerFormatSelect');
  if (input) input.value = ref.citation;
  if (typeSelect) typeSelect.value = ref.autoDetect === false ? ref.type : 'auto';
  if (formatSelect) formatSelect.value = ref.format || (ref.type === 'gesetz' || ref.type === 'materialien' ? 'verz' : 'voll');
  setReferenceStatus(`Referenzfall geladen: ${ref.label}`);
  checkCitation();
}

function runReferenceSuite() {
  const failures = [];
  for (const ref of GUIDE_REFERENCE_CASES) {
    const formatSel = ref.format || (ref.type === 'gesetz' || ref.type === 'materialien' ? 'verz' : 'voll');
    if (ref.autoDetect !== false) {
      const detected = detectTypeFromText(ref.citation);
      if (detected !== ref.type) {
        failures.push(`${ref.label}: Typ erkannt als ${detected || '—'} statt ${ref.type}`);
        continue;
      }
    }
    const issues = getIssues(ref.citation, ref.type, formatSel);
    if (issues.length > ref.expectIssues) {
      failures.push(`${ref.label}: ${issues.length} Warnungen bei Guide-Referenz`);
    }
  }
  if (failures.length) {
    setReferenceStatus(`Referenztest: ${GUIDE_REFERENCE_CASES.length - failures.length}/${GUIDE_REFERENCE_CASES.length} bestanden\n` + failures.join('\n'));
  } else {
    setReferenceStatus(`Referenztest: alle ${GUIDE_REFERENCE_CASES.length} Guide-Referenzfälle bestanden.`);
  }
}

function runNegativeSuite() {
  const failures = [];
  for (const ref of GUIDE_NEGATIVE_CASES) {
    const formatSel = ref.format || 'voll';
    const issues = getIssues(ref.citation, ref.type, formatSel);
    if (issues.length < (ref.minIssues || 1)) {
      failures.push(`${ref.label}: zu wenige Warnungen (${issues.length})`);
      continue;
    }
    if (ref.mustContain && ref.mustContain.length) {
      const combined = issues.join(' ');
      const missing = ref.mustContain.filter(part => !combined.includes(part));
      if (missing.length) {
        failures.push(`${ref.label}: erwartete Hinweise fehlen (${missing.join(', ')})`);
      }
    }
  }
  if (failures.length) {
    setReferenceStatus(`Negativtest: ${GUIDE_NEGATIVE_CASES.length - failures.length}/${GUIDE_NEGATIVE_CASES.length} bestanden\n` + failures.join('\n'));
  } else {
    setReferenceStatus(`Negativtest: alle ${GUIDE_NEGATIVE_CASES.length} problematischen Fälle werden korrekt markiert.`);
  }
}

// ── LCS word-level diff ───────────────────────────────────────
