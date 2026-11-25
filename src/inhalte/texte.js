// Inhaltsdatei: sichtbare Texte, die mit 0.1.2 neu dazugekommen sind.
// ENTWÜRFE von Claude – Lukas formuliert sie selbst, seine Fassung wird hier übernommen.
// Zahlen im deutschen Format: 1.05 → „1,05“; Geld: 1.07 → „1,07 €“ (stellen = Nachkommastellen, 0 bei glatten Beträgen)
const zahl = n => n.toLocaleString('de-DE', { maximumFractionDigits: 2 });
const geld = (n, stellen = 2) => n.toLocaleString('de-DE', { minimumFractionDigits: stellen, maximumFractionDigits: 2 }) + ' €';
export const TEXTE = {
  // Zeitanzeige oben
  tage: ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'],
  tageKurz: ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'],
  zeitAnzeige: (datum, tag, uhr) => `${datum} - ${tag} ${uhr}`,
  countdown: tage => tage === null ? 'Heute ist Sonntag' : tage === 0 ? 'Morgen ist Sonntag' : `Nächster Sonntag in ${tage} ${tage === 1 ? 'Tag' : 'Tagen'}`,
  // Zeile unter dem Sonntags-Countdown: ab 24 Std. in Tagen, darunter in Stunden (jeweils abgerundet), unter 1 Std. „in unter 1 Stunde“
  naechstesEvent: (name, minuten) => {
    const tage = Math.floor(minuten / 1440), std = Math.floor(minuten / 60);
    const wann = tage >= 1 ? `in ${tage} ${tage === 1 ? 'Tag' : 'Tagen'}` : std >= 1 ? `in ${std} ${std === 1 ? 'Stunde' : 'Stunden'}` : 'in unter 1 Stunde';
    return `Nächstes Event „${name}“ ${wann}`;
  },
  eventLaeuft: 'Läuft gerade',
  keinEvent: 'Kein Event geplant',
  tempo: { 0: 'Pause', 1: 'x1', 2: 'x2', 5: 'x5', 10: 'x10', 25: 'x25' },
  kontostand: 'Kontostand',
  bekanntheit: 'Bekanntheit',

  // Hauptmenü (Texte von Lukas freigegeben, 25.11.2026)
  hauptmenue: {
    titel: 'Churchsim',
    weiterspielen: 'Weiterspielen',
    neuesSpiel: 'Neues Spiel',
    beenden: 'Spiel beenden',
    rueckfrage: 'Neues Spiel starten? Der bisherige Spielstand wird überschrieben.',
    neuStarten: 'Neu starten',
    abbrechen: 'Abbrechen',
    knopf: 'Hauptmenü'
  },
  // Geld geben (Test-Werkzeug) – ENTWURF, Lukas formuliert selbst
  testGeld: '+ Geld',
  testGeldFeld: 'Betrag in €',

  // Hinweis unten rechts, während etwas läuft
  laeuft: {
    anreise: 'Die Besucher kommen zum Gottesdienst.',
    gottesdienst: 'Gottesdienst läuft.',
    kirchkaffee: 'Kirchkaffee läuft.',
    kaffeeOffen: 'Kirchkaffee hat geöffnet.'   // eigene Öffnungszeit (Lukas, 25.11.)
  },
  heimgeschickt: n => `${n} ${n === 1 ? 'Besucher musste' : 'Besucher mussten'} wieder heim – kein Stuhl frei.`,
  ausgefallen: 'Der Gottesdienst ist ausgefallen – kein Mitarbeiter im Raum.',
  fehltRaum: 'Für den Gottesdienst fehlt ein fertiger Gottesdienstraum.',
  fehltVeranstaltung: 'Im Gottesdienstraum ist noch kein Gottesdienst eingestellt (Raum anklicken).',
  fehltLeitung: 'Für den Gottesdienst fehlt der Pastor im Gottesdienstraum.',
  // Mehrere Veranstaltungen (25.11.): Text zu „gesperrt“ von Lukas freigegeben; die zwei Gitarren-Texte sind Platzhalter von Claude
  fehltGesperrt: n => `Veranstaltung ${n} fällt aus – Kanzel und Altar fehlen im Raum.`,
  fehltGitarre: 'Für den Lobpreisgottesdienst fehlt eine Gitarre im Raum.',
  ausgefallenGitarre: 'Der Lobpreisgottesdienst ist ausgefallen – keine Gitarre im Raum.',
  // ---- Gemeindesaal (25.11.) – ENTWÜRFE von Claude, Lukas formuliert selbst ----
  // Was einer Veranstaltung im Gemeindesaal fehlt (Codes aus dem Spiel)
  fehltSaal: {
    leitung: 'Es fehlt ein Hauptamtlicher im Raum.',
    ehrenamt: 'Es fehlt ein Ehrenamtlicher im Raum.',
    musikLevel: 'Kein Ehrenamtlicher mit Musik ab Level 1 im Raum.',
    tisch: 'Es fehlt ein Tisch im Raum.',
    stuehle: 'Es fehlen Stühle (mindestens 2).',
    klavier: 'Es fehlt ein Klavier im Raum.'
  },
  // Eigene Fehlt-Texte einzelner Veranstaltungen (gehen vor fehltSaal). Konfirmandenunterricht: von Lukas freigegeben (25.11.)
  fehltArt: {
    konfi: {
      leitung: 'Für den Konfirmandenunterricht fehlt ein Hauptamtlicher.',
      stuehle: 'Für den Konfirmandenunterricht fehlt mindestens ein Stuhl.'
    }
  },
  laeuftSaal: {
    anreise: name => `${name}: Die Besucher kommen.`,
    gottesdienst: name => `${name} läuft.`
  },
  ausgefallenSaal: (name, grund) => `Ausgefallen: ${name}${grund ? ' – ' + grund : ''}`,

  // Seitenleiste „Besucher“
  besucherLetzter: 'Letzter Gottesdienst',
  besucherHeim: 'Heimgeschickt (kein Stuhl)',
  besucherStamm: 'Bekannte Besucher',

  // Raum-Fenster Gottesdienstraum
  raum: {
    veranstaltung: 'Veranstaltung',
    platz: n => `Veranstaltung ${n}`,                       // Lukas, 25.11.
    platzEinstellen: n => `Veranstaltung ${n} einstellen`,
    art: 'Art',
    zeit: 'Zeit',
    gesperrt: 'Gesperrt – braucht Kanzel und Altar im Raum',
    termin: (tag, slot, uhr) => `${tag} ${slot.toLowerCase()} · ${uhr}`,
    zurueck: 'Zurück',                                       // Platzhalter von Claude
    wochenplan: 'Wochenplan',
    wochenplanInfo: 'Wann findet der Gottesdienst statt? Er dauert 1 Stunde, danach 2 Stunden Kirchkaffee.',   // 25.11.: Kirchkaffee jetzt 2 Stunden (von Claude angepasst)
    wochenplanInfoSaal: 'Wann findet die Veranstaltung statt? Sie dauert 1 Stunde.',   // ENTWURF von Claude (Gemeindesaal)
    keinMitarbeiterSaal: 'Kein Mitarbeiter im Raum.',                                   // ENTWURF von Claude (Gemeindesaal)
    plaetzeEgal: 'egal',                                                                // ENTWURF: Prognose Chorprobe (Stühle egal)
    slots: { vormittag: 'Vormittags', nachmittag: 'Nachmittags', abend: 'Abends' },
    mitarbeiter: 'Mitarbeiter im Raum',
    keinMitarbeiter: 'Kein Mitarbeiter im Raum – ohne ihn findet kein Gottesdienst statt.',
    skillsSpaeter: 'Skilllevel folgt später',
    prognose: 'Prognose für diese Woche',
    prognoseNaechste: 'Prognose für nächste Woche',
    prognoseBesucher: 'Erwartete Besucher',
    prognosePlaetze: 'Sitzplätze',
    prognoseGeld: 'Einnahmen',
    prognoseEhrenamt: 'Neue Ehrenamtliche',
    prognosePlakat: 'Plakat an der Pforte',
    plakatJa: 'hängt',
    plakatNein: 'keins',
    prognoseSonntagvormittag: 'Sonntagvormittag: Kollekte ×2',   // Zeile erscheint nur, wenn der Termin Sonntagvormittag ist
    prognoseFaelltAus: 'Ohne Mitarbeiter im Raum fällt der Gottesdienst aus.',
    ca: wert => `ca. ${wert}`
  },
  // Kacheln der Veranstaltungen: was sie bringen und welche Bedingungen sie haben
  veranstaltungKacheln: {
    gottesdienst: {
      bringt: ['Kollekte: 1 € pro Besucher', 'Sonntagvormittag: Kollekte ×2', 'Zufriedenheit der Besucher', 'Bekanntheit der Gemeinde'],
      bedingungen: [{ text: 'Pastor im Raum', bedingung: 'leitung' }, 'Stühle = Sitzplätze',
        { text: 'Für Musik: Instrument im Raum', bedingung: 'instrument' }]   // ENTWURF von Claude (25.11., Instrumente)   // bedingung: wird im Fenster grün/rot markiert
    },
    lobpreis: {   // Lukas, 25.11.
      bringt: ['Kollekte: 1 € pro Besucher', 'Haltung je nach Lobpreis-Vorliebe', 'Bekanntheit der Gemeinde'],
      bedingungen: [{ text: 'Hauptamtlicher im Raum', bedingung: 'leitung' }, { text: 'Gitarre im Raum', bedingung: 'gitarre' }]
    },
    keine: { bringt: ['Nichts'], bedingungen: ['Stammgäste werden unzufrieden'] },
    // ---- Gemeindesaal (25.11.) – ENTWÜRFE von Claude, Lukas formuliert selbst ----
    senioren: {
      bringt: ['Haltung +5 für jeden Besucher', 'Manchmal eine spontane Spende', 'Bekanntheit der Gemeinde'],
      bedingungen: [{ text: 'Hauptamtlicher im Raum', bedingung: 'leitung' }, { text: 'Ehrenamtlicher im Raum', bedingung: 'ehrenamt' },
        { text: 'Tisch im Raum', bedingung: 'tisch' }, { text: 'Mindestens 2 Stühle', bedingung: 'stuehle' }, 'Stühle = Sitzplätze']
    },
    chorprobe: {
      bringt: ['Haltung je nach Musik-Level des Ehrenamtlichen', 'Manchmal eine spontane Spende', 'Bekanntheit der Gemeinde'],
      bedingungen: [{ text: 'Ehrenamtlicher mit Musik ab Level 1', bedingung: 'musikLevel' }, { text: 'Klavier im Raum', bedingung: 'klavier' },
        'Stühle egal – alle passen hinein']
    },
    keineSaal: { bringt: ['Nichts'], bedingungen: [] }
  },
  // ---- Bausteintabelle im Menü „Veranstaltung einstellen“ (25.11.; Texte von Lukas freigegeben: „passt so“) ----
  // Jede Zeile: name, besucher, haltung, geld – null = Strich „–“. b = Baustein aus dem Spiel (Zahlen, Kennungen).
  bausteine: {
    spalten: { baustein: 'Baustein', imRaum: 'Im Raum', besucher: 'Besucher', haltung: 'Haltung', geld: 'Geld', ehrenamt: 'Ehrenamt' },
    zusammen: 'Zusammen (so wie der Raum jetzt ist)',
    faelltAus: 'Fällt aus – ein Pflicht-Baustein fehlt',   // ENTWURF von Claude (nicht in der Vorschau)
    zeilen: {
      hauptamt: b => ({ name: 'Hauptamtlicher (Pflicht)', besucher: 'normal', haltung: `+${b.gottesdienst} Gottesdienst, +${b.platz} Platz`, geld: `${geld(b.kollekte, 0)} je Besucher` }),
      hauptamtLobpreis: b => ({ name: 'Hauptamtlicher (Pflicht)', besucher: '× Lobpreis-Vorliebe',
        haltung: `0 bis +${b.haltungMax} je nach Lobpreis-Vorliebe, +${b.platz} Platz`, geld: `${geld(b.kollekte, 0)} je Besucher` }),
      pflichtMoebel: b => ({ name: `${b.name} (Pflicht)` }),
      moebel: b => ({ name: b.max > 1 ? `${b.name} (${b.anzahl} von ${b.max})` : b.name,
        haltung: b.haltung ? (b.max > 1 ? `+${b.haltung} je Stück` : `+${b.haltung}`) : null,
        geld: b.kollekte ? `Kollekte ×${zahl(b.kollekte)}${b.max > 1 ? ' je Stück' : ''}` : null }),
      besserStuhl: b => ({ name: 'Bessere Stühle', haltung: '+ Stufe des Stuhls', geld: b.kollekte ? 'Kollekte × Stufe' : null }),
      instrumentOhne: b => ({ name: `${b.name} ohne Ehrenamtlichen` }),
      musiker: b => ({
        name: (b.nr === 1 ? '1 Ehrenamtlicher' : `${b.nr}. Ehrenamtlicher`)
          + (b.brauchtInstrument ? ` (braucht ${b.nr === 1 ? 'ein' : b.nr + '.'} Instrument)` : ' am Instrument')
          + (b.level !== null ? ` (Level ${b.level})` : ''),
        besucher: b.besucher ? `×${zahl(b.besucher.min)} bis ×${zahl(b.besucher.max)} je nach Lobpreis-Vorliebe` : null,
        haltung: b.nr === 1 ? (b.imRaum ? `+${b.bonus} % je nach Lobpreis-Vorliebe` : `+${b.bonusMin} % oder mehr je nach Lobpreis-Vorliebe`)
          : (b.imRaum ? `weitere +${b.bonus} %` : `weitere +${b.bonusMin} % oder mehr (je nach Level)`),
        geld: b.nr === 1 ? (b.imRaum ? `Kollekte +${b.bonus} %` : `Kollekte +${b.bonusMin} % oder mehr`)
          : (b.imRaum ? `weitere +${b.bonus} %` : `weitere +${b.bonusMin} % oder mehr`) }),
      leitungSenioren: b => ({ name: 'Hauptamtlicher + Ehrenamtlicher (Pflicht)', besucher: 'normal',
        haltung: `+${b.veranstaltung} Event, +${b.platz} Platz`, geld: `Spende ca. ${geld(b.spende)} je Besucher` }),
      tischStuehle: b => ({ name: `Tisch, mind. ${b.stuehleMin} Stühle (Pflicht)` }),
      weitererStuhl: b => ({ name: 'Jeder weitere Stuhl', besucher: `+${b.plaetze} Platz` }),
      leitungChor: b => ({ name: `Ehrenamtlicher ab Musik-Level ${b.levelMin} (Pflicht)` + (b.level !== null ? ` (Level ${b.level})` : ''),
        besucher: 'normal, Stühle egal', haltung: `+${b.platz} Platz, +${b.bonus !== null ? b.bonus : b.bonusMin} %`, geld: `Spende ca. ${geld(b.spende)} je Besucher` }),
      chorLevel: b => ({ name: 'Jedes weitere Musik-Level', haltung: `+${b.proLevel} %` }),
      // Konfirmandenunterricht (von Lukas freigegeben, 25.11.)
      hauptamtKonfi: b => ({ name: 'Hauptamtlicher (Pflicht)', besucher: `nur Jugendliche, ${b.jugendProzent} %`, haltung: `+${b.veranstaltung}` }),
      stuehlePflicht: b => ({ name: 'Stühle (Pflicht)', besucher: `${b.plaetze} Platz je Stuhl` }),
      ehrenamtKonfi: b => ({ name: `Ehrenamtliche (${b.anzahl} von ${b.max})`, ehrenamt: `+${b.jeEhrenamt} Haltung je Ehrenamtlichem` })
    },
    // Zeile „Zusammen“: s = Summe aus dem Spiel
    summe: s => ({
      besucher: s.besucher.art === 'musik' ? `×${zahl(s.besucher.min)} bis ×${zahl(s.besucher.max)} je nach Lobpreis-Vorliebe`
        : s.besucher.art === 'vorliebe' ? '× Lobpreis-Vorliebe'
        : s.besucher.art === 'plaetze' ? `${s.art === 'konfi' ? 'nur Jugendliche' : 'normal'}, ${s.besucher.plaetze} ${s.besucher.plaetze === 1 ? 'Platz' : 'Plätze'}`
        : s.besucher.art === 'egal' ? 'normal, Stühle egal' : 'normal',
      haltung: s.haltung.vorliebeMax !== null
        ? `+${s.haltung.fest}, dazu 0 bis +${s.haltung.vorliebeMax}` + (s.haltung.prozent ? ` und +${s.haltung.prozent} %` : '') + ' je nach Lobpreis-Vorliebe'
        : `+${s.haltung.fest}` + (s.haltung.prozent ? ` und +${s.haltung.prozent} %` + (s.art === 'gottesdienst' ? ' je nach Lobpreis-Vorliebe' : '') : ''),
      geld: s.geld.keins ? null : s.geld.spende ? `Spende ca. ${geld(s.geld.jeBesucher)} je Besucher` : `${geld(s.geld.jeBesucher)} je Besucher`,
      ...(s.ehrenamt ? { ehrenamt: `+${s.ehrenamt} Haltung` } : {})   // Konfirmandenunterricht: Plus durch die Ehrenamtlichen im Raum
    })
  },
  bringt: 'Bringt',
  bedingungen: 'Bedingungen',

  // Kaffeemaschine
  maschine: {
    titel: 'Kaffeemaschine',
    fuellstand: (n, max) => `Füllstand: ${n} von ${max} Tassen`,
    auffuellen: 'Der Ehrenamtliche füllt die Maschine auf, wenn das Kirchkaffee zu hat (0,50 € pro Tasse).',   // Lukas, 25.11.
    leer: 'Leer – es wird kein Kaffee verkauft.',
    nichtImKaffee: 'Steht nicht im Kirchkaffee – hier wird kein Kaffee verkauft.'
  },
  // Kirchkaffee-Raum: Zustand unter dem Raumnamen
  kirchkaffee: {
    offen: 'Geöffnet',
    zu: 'Geschlossen',
    zuBis: (tag, uhr) => `Geschlossen · öffnet ${tag} ${uhr} Uhr`,   // Lukas, 25.11.
    keinEhrenamt: 'Geschlossen – kein Ehrenamtlicher',
    keineMaschine: 'Geschlossen – keine Kaffeemaschine',
    keineTheke: 'Geschlossen – keine Theke',
    trinkgeld: 'Trinkgeld'   // hinter der grünen Zahl beim Gehen: „+1,56 € Trinkgeld“ (Lukas, 25.11.)
  },

  // Besucher-Kärtchen
  karte: {
    zufriedenheit: 'Haltung',
    beduerfnisse: 'Bedürfnisse',
    sitzplatz: 'Sitzplatz',
    kaffee: 'Kaffee',
    gottesdienst: 'Guter Gottesdienst',
    keinKaffee: 'möchte keinen Kaffee',
    erfuellt: 'erfüllt',
    nichtErfuellt: 'nicht erfüllt',
    offen: 'offen',
    besuche: n => `${n} ${n === 1 ? 'Besuch' : 'Besuche'}`,
    neu: 'Neu dabei',
    passant: 'Passant · noch nie in der Gemeinde',
    neugierig: 'Neugierig – kommt vielleicht zum nächsten Gottesdienst',
    lobpreis: prozent => `Mag Lobpreis: ${prozent} %`,  // Lukas, 25.11.
    kaffeeWert: prozent => `Mag Kaffee: ${prozent} %`,  // Lukas, 25.11.
    // Konfirmandenunterricht (von Lukas freigegeben, 25.11.)
    jugendlich: 'Jugendlich',
    konfi: (n, von) => `Konfirmandenunterricht: ${n} von ${von}`
  },

  // ---- Fenster des Kirchkaffees: Öffnungszeiten (Lukas, 25.11.) ----
  kaffeeFenster: {
    oeffnungszeiten: 'Öffnungszeiten',
    info: 'Das Kirchenkaffee öffnet nach dem Gottesdienst automatisch für 2h. Zusätzlich kannst du drei Schichten pro Woche festlegen, an dem Kunden bedient werden.',
    slot: { vormittag: 'Vormittags · 10–15 Uhr', nachmittag: 'Nachmittags · 15–19 Uhr', abend: 'Abends · 19–23 Uhr' },
    hinzufuegen: 'Öffnungszeit hinzufügen',
    entfernen: 'Entfernen',
    voll: 'Höchstens 3 Öffnungszeiten pro Woche.',
    // Sitzplätze (Lukas, 25.11.)
    sitzplaetze: (n, tisch) => `Sitzplätze: ${n} (davon ${tisch} am Tisch)`,
    sitzInfo: prozent => `Nach dem Kaffee setzen sich Kunden mit ${prozent} % Wahrscheinlichkeit auf einen freien Stuhl. Beim Gehen geben sie Trinkgeld: 1 €, mehr mit besseren Stühlen und einem Tisch daneben.`
  },
  laden: 'Laden',   // Beschriftung des Ladens auf der Karte (Lukas, 25.11.)

  // ---- Fenster „Bekanntheit“ (Klick oben auf Bekanntheit; Entwürfe von Claude, von Lukas freigegeben 25.11.) ----
  bekanntheitFenster: {
    titel: 'Bekanntheit',
    stand: (wert, max) => `${wert} von ${max}`,
    woher: 'Woher sie kommt',
    quellen: {
      gottesdienst: n => `Gottesdienst: +${n} pro Gottesdienst`,
      zufrieden: (n, ab) => `Sehr zufriedene Besucher (Haltung ab ${ab}): +${n} pro Person im Gottesdienst`,
      seelsorge: n => `Gute Seelsorge: +${n} (je nach Ratschlag)`
    },
    verlauf: 'Verlauf',
    verlaufInfo: 'Bekanntheit am Ende jeder Woche',
    woche: n => `Woche ${n}`,
    letzte: 'Letzte Änderungen',
    keine: 'Noch keine Änderungen.',
    eintrag: { gottesdienst: () => 'Gottesdienst', zufrieden: n => `${n} sehr zufriedene Besucher`, seelsorge: () => 'Seelsorge' },
    wirkung: 'Was sie bewirkt',
    neue: (teiler, wert) => `Neue Besucher pro Woche: Bekanntheit ÷ ${teiler} → jetzt ca. ${wert}`,
    neugier: (grund, wert, faktor) => `Passanten am Tor werden neugierig: ${grund} + halbe Bekanntheit → jetzt ${wert} (mit Plakat ${faktor}×)`,
    neugierDazu: (gelaende, schaukasten) => `Darin enthalten: Gelände +${gelaende}, Schaukasten +${schaukasten}`   // ENTWURF (25.11.)
  },

  // ---- Finanz-Fenster (Spielprinzip 25.11.2026) – ENTWURF von Claude, Lukas formuliert selbst ----
  finanzFenster: {
    titel: 'Finanzen',
    kontostand: euro => `Kontostand: ${euro}`,
    dieseWoche: n => `Diese Woche (Woche ${n})`,
    einnahmen: 'Einnahmen',
    ausgaben: 'Ausgaben',
    keine: 'Noch nichts',
    summe: 'Summe',
    saldo: 'Ergebnis der Woche',
    voraussichtlich: (ein, aus) => `Voraussichtlich bis Sonntag: Einnahmen ${ein}, Ausgaben ${aus}`,
    kaffee: 'Kirchkaffee diese Woche',
    kaffeeGottesdienst: 'Verkauft nach Gottesdiensten',
    kaffeeOeffnungszeit: 'Verkauft in eigenen Öffnungszeiten',
    kaffeeVerkauft: 'Verkauft gesamt',
    kaffeeEinkauf: 'Einkauf im Laden',
    kaffeeGewinn: 'Gewinn',
    kaffeeGewinnInfo: 'Verkauf minus Einkauf. Eingekaufter Kaffee kann auch erst später verkauft werden.',
    tassen: n => `${n} ${n === 1 ? 'Tasse' : 'Tassen'}`,
    verlauf: 'Verlauf',
    verlaufInfo: n => `Die letzten ${n} Wochen`,
    verlaufLeer: 'Noch keine abgeschlossene Woche.',
    spalten: { woche: 'Woche', einnahmen: 'Einnahmen', ausgaben: 'Ausgaben', saldo: 'Ergebnis', kaffee: 'Kirchkaffee', kaffeeGewinn: 'Kaffee-Gewinn', konto: 'Kontostand' },
    laeuft: 'läuft',
    kassenbuch: 'Kassenbuch diese Woche',
    kassenbuchLeer: 'Noch keine Buchungen in dieser Woche.',
    // Zusatz im Kassenbuch hinter der Kategorie
    anlass: { gottesdienst: 'nach dem Gottesdienst', oeffnungszeit: 'Öffnungszeit', einkauf: 'Einkauf im Laden' },
    // Dauerspender (ENTWURF von Claude, 25.11. – Lukas formuliert selbst)
    dauerspender: 'Dauerspender',
    dauerspenderInfo: r => `Wer montags eine Haltung ab ${r.abHaltung} hat, wird mit ${r.chance} % Chance Dauerspender. Die Spenden kommen montags um ${r.stunde}:00 Uhr: zuerst ${r.start} €, jede Woche ${r.steigerung} € mehr, höchstens ${r.max} €. Sinkt die Haltung unter ${r.abHaltung}, endet die Dauerspende am nächsten Montag.`,
    dauerspenderLeer: 'Noch keine Dauerspender.',
    dauerspenderSumme: 'Summe pro Woche',
    dauerspenderSpalten: { name: 'Name', betrag: 'Spende diese Woche', naechster: 'Nächsten Montag', seit: 'Seit Woche', haltung: 'Haltung' },
    was: { abriss: 'Abriss', verbessern: 'verbessert', rueckgaengig: 'Rückgängig gemacht', bus: 'Bushaltestelle', werbekampagne: 'Werbekampagne' }
  },

  // ---- Versionsnummer unten links und Fenster „Changelog“ (Lukas' Wahl, 25.11.) ----
  changelog: {
    version: v => `Version ${v}`,
    titel: 'Changelog',
    fehler: 'Der Changelog konnte gerade nicht geladen werden.'   // Platzhalter (z. B. ohne Internet)
  },

  // ---- Menschen, Passanten, Seelsorge (Entwürfe von Claude, von Lukas vorerst so übernommen, 25.11.) ----
  // Fenster „Menschen im Ort“
  menschen: {
    knopf: 'Menschen',
    titel: 'Menschen im Ort',
    spalten: { name: 'Name', haltung: 'Haltung', besuche: 'Besuche', zuletzt: 'Zuletzt da', kaffee: 'Kaffee', status: 'Status' },
    unbekannt: '–', prozent: n => `${n} %`,
    woche: n => `Woche ${n}`,
    leer: 'Noch niemand bekannt.',
    status: { passant: 'Passant', neugierig: 'Neugierig', besucher: 'Besucher', stammgast: 'Stammgast', ehrenamtlich: 'Ehrenamtlich' }
  },
  // Meldung unten rechts
  meldung: {
    neugierig: name => `${name} ist am Tor stehen geblieben und schaut neugierig herein.`,
    keinGeldKaffee: name => `Nicht genug Geld – ${name} konnte keinen Kaffee einkaufen.`,   // Lukas, 25.11.
    // Konfirmandenunterricht (von Lukas freigegeben, 25.11.; Einzahl bei „konfirmiert“ von Claude ergänzt)
    konfirmand: name => `${name} war 7-mal im Konfirmandenunterricht und wird bei der nächsten Konfirmation konfirmiert.`,
    konfirmiert: n => n === 1 ? '1 Jugendlicher wurde konfirmiert und gehört jetzt zu den Erwachsenen.'
      : `${n} Jugendliche wurden konfirmiert und gehören jetzt zu den Erwachsenen.`,
    keineKonfirmanden: () => 'In diesem Jahr gibt es keine Konfirmanden – die Konfirmation fällt aus.'
  },

  // Seelsorge-Fenster
  seelsorge: {
    titel: 'Seelsorge',
    anfrage: voll => `${voll} möchte mit Pastor Harder sprechen.`,
    annehmen: 'Gespräch annehmen',
    ablehnen: 'Ablehnen',
    abgelehnt: name => `${name} ist enttäuscht.`,
    schliessen: 'Schließen',
    weiter: 'Weiter',
    keinGeld: 'Nicht genug Geld.',
    folgen: {
      haltung: n => `Haltung ${n > 0 ? '+' : '−'}${Math.abs(n)}`,
      bekanntheit: n => `Bekanntheit ${n > 0 ? '+' : '−'}${Math.abs(n).toLocaleString('de-DE')}`,
      spende: euro => `Spende +${euro}`,
      kosten: euro => `Kosten −${euro}`,
      neugierig: 'jetzt neugierig auf die Gemeinde'
    },
    neueStufe: n => `Pastor Harder ist jetzt Seelsorger Stufe ${n}.`,
    // Wer fragt (unter dem Namen) und was das Ergebnis bewirkt – freigegeben 25.11.
    person: (status, besuche, haltung) => `${status} · ${besuche} ${besuche === 1 ? 'Besuch' : 'Besuche'} · Haltung ${haltung}`,
    haltungVorherNachher: (vorher, nachher) => `Haltung ${vorher} → ${nachher}`,
    kommt: n => `kommt jetzt mit ${n} % zur nächsten Veranstaltung`,
    // Einschätzung der Ratschläge je Stufe des Pastors – freigegeben 25.11.
    beste: 'Das könnte passen',
    einschaetzung: { gut: 'passt gut', unsicher: 'unsicher', riskant: 'riskant' },
    prozent: n => `${n} %`,
    // Charakter-Karte des Pastors
    karte: {
      titel: n => `Seelsorge – Stufe ${n}`,
      fortschritt: (x, y, n) => `${x} von ${y} Punkten bis Stufe ${n}`,
      hoechste: 'Höchste Stufe erreicht',
      // Was jede Stufe bringt (Stufe 1 bringt noch nichts Besonderes) – freigegeben 25.11.
      kann: { 2: 'erkennt den passendsten Rat', 3: 'schätzt jeden Rat ein', 4: 'sieht die genaue Chance', 5: 'Ratschläge gelingen am häufigsten' },
      jetzt: t => `Jetzt: ${t}`,
      ab: (n, t) => n === 5 ? `Stufe 5: ${t}` : `Ab Stufe ${n}: ${t}`
    },
    // Situationen: Anfrage und je 3 Ratschläge mit gutem und schlechtem Ausgang (Reihenfolge wie in inhalte/seelsorge.js)
    situationen: {
      nachbar: {
        anfrage: n => `${n} hat Streit mit dem Nachbarn – wegen der Hecke. Seit Wochen grüßen sie sich nicht mehr.`,
        raete: [
          { text: 'Gehen Sie auf ihn zu und reden Sie in Ruhe mit ihm.', gut: n => `Die beiden haben sich ausgesprochen. ${n} ist erleichtert.`, schlecht: n => `Das Gespräch ist eskaliert. ${n} ist enttäuscht.` },
          { text: 'Schreiben Sie ihm einen freundlichen Brief.', gut: () => 'Der Nachbar hat sich bedankt und die Hecke geschnitten.', schlecht: () => 'Der Brief kam falsch an. Jetzt ist es noch schlimmer.' },
          { text: 'Lassen Sie es auf sich beruhen, das legt sich.', gut: () => 'Tatsächlich – nach ein paar Tagen grüßen sie sich wieder.', schlecht: n => `Es hat sich nicht gelegt. ${n} fühlt sich allein gelassen.` }
        ]
      },
      job: {
        anfrage: n => `${n} hat die Arbeit verloren und weiß nicht, wie es weitergehen soll.`,
        raete: [
          { text: 'Lassen Sie uns zusammen beten und überlegen, was jetzt dran ist.', gut: n => `${n} geht mit neuem Mut nach Hause.`, schlecht: n => `${n} hatte sich mehr praktische Hilfe erhofft.` },
          { text: 'Die Gemeinde hilft mit einem Lebensmittelgutschein aus.', gut: n => `${n} ist sehr dankbar und erzählt es weiter.`, schlecht: n => `${n} ist es peinlich, Hilfe anzunehmen.` },
          { text: 'Sehen Sie es als Chance – vielleicht kommt etwas Besseres.', gut: n => `Zwei Wochen später: eine neue Stelle! ${n} ist froh, dass Sie Mut gemacht haben.`, schlecht: n => `${n} fühlt sich nicht ernst genommen.` }
        ]
      },
      zweifel: {
        anfrage: n => `${n} zweifelt, ob es Gott überhaupt gibt, und möchte darüber reden.`,
        raete: [
          { text: 'Zweifel gehören dazu. Erzählen Sie mir mehr.', gut: n => `${n} fühlt sich verstanden und will wiederkommen.`, schlecht: n => `${n} hat noch mehr Fragen als vorher.` },
          { text: 'Lesen Sie mal die Psalmen – da zweifeln viele.', gut: n => `${n} hat sich in den Psalmen wiedergefunden.`, schlecht: n => `${n} konnte mit den alten Texten nichts anfangen.` },
          { text: 'Sie müssen einfach fester glauben.', gut: n => `Der klare Satz hat ${n} gutgetan.`, schlecht: n => `${n} fühlt sich unter Druck gesetzt.` }
        ]
      },
      trauer: {
        anfrage: n => `Die Mutter von ${n} ist gestorben. ${n} möchte mit jemandem reden.`,
        raete: [
          { text: 'Ich bin einfach da und höre zu.', gut: n => `${n} hat lange erzählt und ist dankbar für die Zeit.`, schlecht: n => `${n} hätte sich ein paar tröstende Worte gewünscht.` },
          { text: 'Ich helfe Ihnen gern bei der Trauerfeier.', gut: () => 'Eine würdige Feier. Die Familie spendet 30 € an die Gemeinde.', schlecht: () => 'Bei der Feier lief einiges schief.' },
          { text: 'Die Zeit heilt alle Wunden.', gut: n => `${n} nickt – irgendwie stimmt es ja.`, schlecht: n => `${n} wirkt verletzt.` }
        ]
      },
      sohn: {
        anfrage: n => `Der Sohn von ${n} ist 15 und redet kaum noch mit den Eltern.`,
        raete: [
          { text: 'Nehmen Sie sich Zeit für etwas, das ihm Spaß macht.', gut: () => 'Beim gemeinsamen Fußballschauen haben sie endlich wieder geredet.', schlecht: () => 'Der Sohn hatte keine Lust.' },
          { text: 'Setzen Sie klare Regeln.', gut: () => 'Zu Hause ist es ruhiger geworden.', schlecht: () => 'Jetzt gibt es jeden Tag Streit.' },
          { text: 'Das ist nur eine Phase.', gut: () => 'Ein paar Wochen später ist alles wieder besser.', schlecht: n => `${n} macht sich weiter große Sorgen.` }
        ]
      },
      einsam: {
        anfrage: n => `${n} ist vor Kurzem hergezogen und kennt hier noch niemanden.`,
        raete: [
          { text: 'Kommen Sie doch zum Kirchkaffee – da lernen Sie Leute kennen.', gut: n => `${n} freut sich auf Sonntag.`, schlecht: n => `${n} traut sich nicht so recht.` },
          { text: 'Ich besuche Sie nächste Woche einmal.', gut: n => `Der Besuch hat ${n} sehr gefreut.`, schlecht: n => `${n} fand den Besuch etwas aufdringlich.` },
          { text: 'Probieren Sie den Sportverein aus.', gut: n => `${n} hat im Verein erste Freunde gefunden.`, schlecht: n => `Im Verein war ${n} niemand sympathisch.` }
        ]
      }
    }
  },

  // Editor
  hinweise: {
    keinWerkzeug: 'Wähle unten aus, was du bauen möchtest.',   // nach Rechtsklick: nichts gewählt (Entwurf von Claude, von Lukas freigegeben 25.11.)
    stuhl: 'Tippe, um einen Stuhl aufzustellen – oder auf einen Stuhl, um ihn zu verbessern.',
    kaffeemaschine: 'Tippe, um eine Kaffeemaschine aufzustellen (fürs Kirchkaffee).',
    theke: 'Tippe, um ein Thekenteil aufzustellen (fürs Kirchkaffee).',
    tisch: 'Stühle direkt daneben bringen mehr Trinkgeld (×1,2).',   // Lukas, 25.11.
    // ---- Ausstattung des Gottesdienstraums (Entwürfe von Claude, von Lukas vorerst so übernommen, 25.11.) ----
    kanzel: 'Tippe, um eine Kanzel aufzustellen (Gottesdienstraum, 1 pro Raum).',
    altar: 'Tippe, um einen Altar aufzustellen (Gottesdienstraum, 1 pro Raum).',
    blumen: 'Tippe, um Blumen aufzustellen (Gottesdienstraum, bis 4 pro Raum).',
    gruenpflanze: 'Tippe, um eine Grünpflanze aufzustellen (Gottesdienstraum, bis 4 pro Raum).',
    // Instrumente (Muster von Lukas freigegeben 25.11.): jedes braucht einen eigenen Ehrenamtlichen
    gitarre: 'Tippe, um eine Gitarre aufzustellen (Gottesdienstraum, 1 pro Raum) – braucht einen eigenen Ehrenamtlichen, der sie spielt.',
    keyboard: 'Tippe, um ein Keyboard aufzustellen (Gottesdienstraum, 1 pro Raum) – braucht einen eigenen Ehrenamtlichen, der es spielt.',
    schlagzeug: 'Tippe, um ein Schlagzeug aufzustellen (Gottesdienstraum, 1 pro Raum) – braucht einen eigenen Ehrenamtlichen, der es spielt.',
    bass: 'Tippe, um einen Bass aufzustellen (Gottesdienstraum, 1 pro Raum) – braucht einen eigenen Ehrenamtlichen, der ihn spielt.',
    egitarre: 'Tippe, um eine E-Gitarre aufzustellen (Gottesdienstraum, 1 pro Raum) – braucht einen eigenen Ehrenamtlichen, der sie spielt.',
    mikrofon: 'Tippe, um ein Mikrofon aufzustellen (Gottesdienstraum, 1 pro Raum) – braucht einen eigenen Ehrenamtlichen, der singt.'
  },
  // Kauf gesperrt, weil schon genug davon im Raum steht
  grenze: {
    kanzel: 'In diesem Raum steht schon eine Kanzel.',
    altar: 'In diesem Raum steht schon ein Altar.',
    blumen: 'In diesem Raum stehen schon 4 Blumen.',
    gruenpflanze: 'In diesem Raum stehen schon 4 Grünpflanzen.',
    gitarre: 'In diesem Raum steht schon eine Gitarre.',
    // ENTWÜRFE von Claude nach demselben Muster (25.11.)
    keyboard: 'In diesem Raum steht schon ein Keyboard.',
    schlagzeug: 'In diesem Raum steht schon ein Schlagzeug.',
    bass: 'In diesem Raum steht schon ein Bass.',
    egitarre: 'In diesem Raum steht schon eine E-Gitarre.',
    mikrofon: 'In diesem Raum steht schon ein Mikrofon.'
  },
  // Menü eines Stuhls (im Editor auf einen Stuhl tippen)
  stuhl: {
    stufe: (n, max) => `Stufe ${n} von ${max}`,
    wirkung: (haltung, kollekte) => `Haltung +${haltung} pro Gottesdienst · Kollekte ×${kollekte}`,
    trinkgeld: f => `Im Kirchkaffee: Trinkgeld ×${f}`,   // Lukas, 25.11.
    naechste: name => `Nächste Stufe: ${name}`,
    verbessern: preis => `Verbessern (${preis})`,
    alle: (n, preis) => `Alle Stühle in diesem Raum verbessern (${n} ${n === 1 ? 'Stuhl' : 'Stühle'}, ${preis})`,
    alleInfo: 'Jeder Stuhl im Raum steigt eine Stufe.',
    hoechste: 'Höchste Stufe erreicht.',
    alleHoechste: 'Alle Stühle in diesem Raum sind auf der höchsten Stufe.',
    keinGeld: 'Nicht genug Geld.'
  },
  // Menü der Pforte (in der Spielansicht aufs Tor tippen)
  tor: {
    titel: 'Pforte',
    plakat: 'Plakat an der Pforte',
    info: 'Ein Plakat am Tor macht Passanten neugierig: Sie bleiben dreimal so oft stehen. Es hängt bis zum nächsten Gottesdienst.',
    chance: (ohne, mit) => `Neugier am Tor: ${ohne} % – mit Plakat ${mit} %`,
    haengt: chance => `Das Plakat hängt bis zum nächsten Gottesdienst (Neugier am Tor: ${chance} %).`,
    kaufen: preis => `Plakat aufhängen (${preis})`,
    keinGeld: 'Nicht genug Geld.'
  },
  // Raum-Fenster: was die Möbel bringen
  ausstattung: {
    haltung: n => `Haltung +${n}`,
    kollekte: f => `Kollekte ×${f}`,
    anzahl: (n, max) => `${n}/${max}`,
    // Lobpreisteam (Texte von Lukas freigegeben 25.11., Instrumente); p = Prozent (Summe aller Musiker), n = Zahl der Musiker
    lobpreisteam: (p, n) => `Lobpreisteam (${n} Musiker) – Kollekte +${p} %, Haltung +${p} %`,
    keinLobpreisteam: 'Lobpreisteam – kein Musiker eingeteilt',
    musikLevel: level => `Musik: Level ${level}`,
    musiker: 'Musiker',
    ohneGitarre: 'ohne Instrument keine Musik'
  },
  nichtGenugGeld: (name, preis) => `Nicht genug Geld für ${name} (${preis}).`,

  // ---- Bauleiste unten (25.11.; Reiter von Lukas freigegeben, übrige Texte ENTWÜRFE von Claude) ----
  bauleiste: {
    kategorien: { bauen: 'Bauen', gottesdienst: 'Gottesdienst', kirchkaffee: 'Kirchkaffee', gemeindesaal: 'Gemeindesaal', deko: 'Deko', aussen: 'Außen' },
    werkzeuge: { wand: 'Wand', tuer: 'Tür', raum: 'Raum festlegen', abriss: 'Abriss', bushaltestelle: 'Bushaltestelle' },
    abBekanntheit: n => `ab Bekanntheit ${n}`,
    drehen: 'Drehen (R)'
  },
  hinweiseAussen: {
    strasse: 'Zieh ein Rechteck, um Straße zu bauen. Die Straße muss im Tor beginnen.',
    parkplatz: 'Tippe, um einen Parkplatz zu bauen (R dreht ihn). Er zählt, wenn er an einer Straße liegt, die bis zum Tor führt.',
    bushaltestelle: 'Die Bushaltestelle steht am Gehweg neben dem Tor.',
    // ---- Wege und Außendeko (25.11.) – ENTWÜRFE von Claude, Lukas formuliert selbst ----
    weg: 'Zieh ein Rechteck, um einen Weg anzulegen. Wege machen das Gelände schöner.',
    busch: 'Tippe, um einen Busch zu pflanzen. Außendeko macht Passanten neugieriger.',
    hecke: 'Tippe, um ein Stück Hecke zu pflanzen.',
    blumenbeet: 'Tippe, um ein Blumenbeet anzulegen.',
    bank: 'Tippe, um eine Bank aufzustellen.',
    laterne: 'Tippe, um eine Laterne aufzustellen.',
    baum: 'Tippe, um einen Baum zu pflanzen (2 × 2 Kästchen).',
    schaukasten: 'Tippe, um einen Schaukasten aufzustellen. In der Spielansicht wählst du per Klick, wofür er wirbt.'
  },
  aussenMeldung: {
    innen: 'Straße und Parkplätze gehören nach draußen, nicht in einen Raum.',
    bekanntheit: n => `Parkplätze kannst du ab Bekanntheit ${n} bauen.`,
    strasseGeld: 'Das Geld hat nicht für die ganze Straße gereicht.',
    // ---- ENTWÜRFE von Claude (Wege und Außendeko, 25.11.) ----
    innenDeko: 'Außendeko gehört nach draußen, nicht in einen Raum.',
    bekanntheitTeil: (name, n) => `${name}: erst ab Bekanntheit ${n}.`,
    tor: 'Direkt im Tor muss der Weg frei bleiben.',
    wegGeld: 'Das Geld hat nicht für den ganzen Weg gereicht.'
  },
  // Bauleisten-Kärtchen: was ein Stück Außendeko fürs Gelände bringt – ENTWURF
  gelaendeKarte: n => `+${String(n).replace('.', ',')} Gelände`,

  // ---- Gelände und Schaukasten (Spielprinzip „Wege und Außendeko“, 25.11.) – ENTWÜRFE von Claude, Lukas formuliert selbst ----
  gelaende: {
    titel: 'Gelände',
    stand: (wert, max) => `${wert} von ${max}`,
    info: 'Wege und Außendeko machen das Gelände schöner. Je schöner es ist, desto öfter werden Passanten am Tor neugierig.',
    teil: (anzahl, name, punkte) => `${anzahl}× ${name}: ${punkte}`,
    gekappt: (summe, max) => `Zusammen ${summe} Punkte – es zählen höchstens ${max}.`,
    keine: 'Noch keine Außendeko. Du findest sie unter Bauen → Außen.',
    wirkung: p => `Passanten werden um ${p} öfter neugierig (Gelände ÷ 10).`,
    schaukasten: 'Schaukasten',
    aushang: (art, raum, termin, p) => `Wirbt für: ${art} (${raum}, ${termin}) · +${p} Neugier`,
    keinAushang: 'Kein Schaukasten mit Aushang.'
  },
  schaukasten: {
    titel: 'Schaukasten',
    info: p => `Wähle eine regelmäßige Veranstaltung, für die der Schaukasten wirbt. Solange sie eingestellt ist, werden Passanten um ${p} öfter neugierig. Der Aushang ist kostenlos und bleibt hängen, bis du ihn änderst.`,
    jetzt: 'Hängt gerade aus',
    leer: 'Der Schaukasten ist leer.',
    keine: 'Noch keine regelmäßige Veranstaltung eingestellt. Stelle zuerst in einem Gottesdienstraum eine Veranstaltung ein.',
    eintrag: (art, raum, termin) => `${art} · ${raum} · ${termin}`,
    abnehmen: 'Aushang abnehmen',
    doppelt: 'Wirbt schon ein anderer Schaukasten für dieselbe Veranstaltung, zählt sie nur einmal.'
  },

  // ---- Einzugsgebiet (Bekanntheit-Fenster) – erste Texte von Lukas freigegeben, übrige ENTWÜRFE von Claude ----
  einzugsgebiet: {
    titel: 'Einzugsgebiet',
    stand: (erreicht, grenze) => `${erreicht} von ${grenze} Menschen erreichbar`,
    voll: 'Einzugsgebiet voll – mehr Menschen erreichst du über Maßnahmen',
    info: 'So viele Menschen kann die Gemeinde erreichen. Mitgezählt: Besucher, Passanten im Ort und Ehrenamtliche.',
    teile: {
      start: n => `Ort: ${n}`,
      parkplatz: (n, anzahl) => `Parkplätze: +${n} (${anzahl} angeschlossen)`,
      bus: (n, name) => `Bushaltestelle (${name}): +${n}`,
      werbekampagne: n => `Überregionale Werbekampagne: +${n}`
    },
    massnahmen: 'Maßnahmen',
    parkplatz: 'Parkplatz',
    parkplatzInfo: (plus, preis) => `+${plus} pro Parkplatz · ${preis} · bauen unter Bauen → Außen, mit Straße bis zum Tor`,
    bushaltestelle: 'Bushaltestelle',
    werbekampagne: 'Überregionale Werbekampagne',
    plusPreis: (plus, preis) => `+${plus} · ${preis}`,
    frei: n => `Frei ab Bekanntheit ${n}`,
    kaufen: 'Kaufen',
    ausbauen: name => `Ausbauen: ${name}`,
    gekauft: 'Läuft dauerhaft.',
    keinGeld: 'Nicht genug Geld.'
  },
  // Fenster der Bushaltestelle (anklicken oder Bauleiste → Außen)
  bus: {
    titel: 'Bushaltestelle',
    keine: 'Noch keine Bushaltestelle. Mit einer Haltestelle erreicht die Gemeinde mehr Menschen.',
    stufe: (n, max, name) => `Stufe ${n} von ${max}: ${name}`,
    bringt: n => `Bringt +${n} Einzugsgebiet`,
    naechste: name => `Nächste Stufe: ${name}`,
    hoechste: 'Höchste Stufe erreicht.'
  },

  // ---- Kirchenjahr-Fenster und Fest-Menü (Spielprinzip vom 25.11., claude/vorschlag-kirchenjahr-feste.md) ----
  // Von Lukas freigegeben („Bau das“, 25.11.). Mit „ENTWURF“ markierte Texte kamen beim Bauen dazu und warten noch auf Lukas.
  // Faktoren in Worten (Lukas: Worte statt Zahlen)
  besucherWort: f => f >= 3 ? 'sehr viele Besucher' : f >= 2 ? 'viele Besucher' : f >= 1.5 ? 'mehr Besucher' : f > 1 ? 'etwas mehr Besucher' : '',
  kollekteWort: f => f >= 2 ? 'sehr hohe Kollekte' : f > 1 ? 'höhere Kollekte' : '',
  kirchenjahr: {
    titel: 'Kirchenjahr',                                      // ENTWURF
    jetzt: 'Jetzt',
    kommend: 'Kommende Feste',
    zeiten: 'Zeiten im Kirchenjahr',
    naechsterSonntag: (name, datum) => `Nächster Sonntag: ${name} · ${datum}`,   // ENTWURF
    heute: name => `Heute: ${name}`,                           // ENTWURF
    inTagen: n => n === 0 ? 'heute' : n === 1 ? 'morgen' : n < 7 ? `in ${n} Tagen` : n < 14 ? 'in 1 Woche' : `in ${Math.floor(n / 7)} Wochen`,
    feiertag: 'Feiertag: mehr Leute unterwegs',
    geplant: (art, raum, leitung) => `Geplant: ${art}, ${raum}, ${leitung}`,
    planen: 'Fest planen',
    aendern: 'Plan ändern',                                    // ENTWURF
    normal: 'normal viele Besucher',                           // ENTWURF (Zeiten ohne eigenen Faktor)
    gesperrt: 'Gesperrt – braucht Konfirmandenunterricht',
    // Konfirmation (von Lukas freigegeben, 25.11.)
    konfirmation: 'Konfirmation: Jugendliche, die im Jahr 7-mal beim Konfirmandenunterricht waren, werden konfirmiert. Sehr viele Besucher, sehr hohe Kollekte.',
    keineKonfirmanden: 'In diesem Jahr gibt es keine Konfirmanden – die Konfirmation fällt aus.',
    farben: { advent: 'violett', weihnachten: 'weiß', epiphanias: 'grün', vorpassion: 'grün', passion: 'violett', ostern: 'weiß', trinitatis: 'grün' },
    erklaerung: {
      advent: 'Die Zeit der Vorbereitung auf Weihnachten. Mit dem 1. Advent beginnt das neue Kirchenjahr.',
      weihnachten: 'Die Geburt Jesu wird gefeiert.',
      epiphanias: 'Jesus zeigt sich der Welt. Sie beginnt am 6. Januar mit den Weisen aus dem Morgenland.',
      vorpassion: 'Die Wochen vor der Passionszeit, ein Übergang zur Fastenzeit.',
      passion: 'Die Fastenzeit von Aschermittwoch bis Ostern. Im Mittelpunkt steht der Leidensweg Jesu.',
      ostern: 'Die Freude über die Auferstehung. Sie dauert 50 Tage bis Pfingsten.',
      trinitatis: 'Die längste Zeit im Kirchenjahr, bis zum Ewigkeitssonntag. Sie ist dem Glauben im Alltag gewidmet.'
    }
  },
  festMenue: {
    titel: 'Ein besonderes Fest steht an',
    zeile: (name, tag, datum, wann) => `${name} · ${tag}, ${datum} · ${wann}`,
    erwartet: teile => `Erwartet: ${teile}`,
    zeit: 'Zeit', raum: 'Raum', leitung: 'Leitung', art: 'Art', ehrenamtliche: 'Ehrenamtliche',
    hinweis: 'Andere Termine in diesem Raum und mit dieser Leitung fallen zur gleichen Zeit aus.',
    imRaum: 'Die Leitung muss zur Zeit des Festes im Raum stehen.',            // ENTWURF
    keinRaum: 'Du hast noch keinen fertigen Gottesdienstraum.',                // ENTWURF
    keineEA: 'Noch keine Ehrenamtlichen.',                                     // ENTWURF
    eaSpaeter: 'Was Ehrenamtliche beim Fest bewirken, folgt später.',          // ENTWURF
    konfirmanden: (name, n) => `${name} – ${n} ${n === 1 ? 'Konfirmand' : 'Konfirmanden'}`,   // von Lukas freigegeben (25.11.)
    faellt: (platz, raum) => `Fällt aus: Veranstaltung ${platz + 1}${raum ? ` (${raum})` : ''}`,   // ENTWURF
    planen: 'Fest planen',
    nicht: 'Diesmal nicht',
    absagen: 'Fest absagen',                                   // ENTWURF (wenn schon geplant)
    zurueck: 'Zurück'                                          // ENTWURF
  },
  faelltAusWegen: (platz, fest) => `Veranstaltung ${platz + 1} fällt aus wegen ${fest}.`,
  festPrognose: (fest, wort) => `${fest}: ${wort}`,             // ENTWURF: Zeile in der Prognose (Fest oder Adventszeit)
  hinweisKirchenjahr: 'Kirchenjahr anklicken für Feste und Zeiten',   // ENTWURF: Tooltip rechts oben

  // ---- Forschungsbaum und Heiligkeit (ALLES ENTWÜRFE von Claude, 25.11. – Lukas formuliert sie selbst) ----
  heiligkeit: 'Heiligkeit',
  heiligkeitHinweis: n => `Jeder Gottesdienstbesucher bringt ${n} Heiligkeit (gutgeschrieben am Ende des Gottesdienstes). Wird beim Forschen verbraucht.`,
  forschung: {
    knopf: 'Forschung',
    titel: 'Forschung',
    vorrat: (heiligkeit, geld) => `Heiligkeit: ${heiligkeit} · Kontostand: ${geld}`,
    kosten: (geld, heiligkeit) => `${geld} und ${heiligkeit} Heiligkeit`,
    dauer: sek => sek >= 60 && sek % 60 === 0 ? `Dauer: ${sek / 60} ${sek === 60 ? 'Minute' : 'Minuten'}` : `Dauer: ${sek} Sekunden`,
    dauerInfo: 'Gilt bei normaler Geschwindigkeit. Die Forschung läuft nur, wenn die Spielzeit läuft.',
    rest: sek => `noch ${sek >= 60 ? `${Math.floor(sek / 60)}:${String(sek % 60).padStart(2, '0')} Min.` : `${sek} Sek.`}`,
    beschreibung: { schulungen1: 'Schaltet frei, dass du Ehrenamtliche auf Schulungen schicken kannst.' },
    erforscht: 'Erforscht',
    starten: 'Forschen',
    abbrechen: 'Abbrechen',
    abbrechenFrage: 'Wirklich abbrechen? Geld und Heiligkeit sind dann weg.',
    abbrechenJa: 'Ja, abbrechen',
    abbrechenNein: 'Weiterforschen',
    zustand: { gesperrt: 'Erst die vorherige Forschung abschließen', besetzt: 'Es läuft schon eine andere Forschung', geld: 'Zu wenig Geld', heiligkeit: 'Zu wenig Heiligkeit' },
    schliessen: 'Schließen'
  }
};
