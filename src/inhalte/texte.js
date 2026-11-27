// Inhaltsdatei: alle sichtbaren Texte des Spiels an einem Ort (Ausnahmen: Hilfe in hilfe.js, Namen in den Steckbriefen wie moebel.js).
// Feste Beschriftungen in index.html holen sich ihren Text über data-text="…" von hier.
// ENTWÜRFE von Claude – Lukas formuliert sie selbst, seine Fassung wird hier übernommen.
// Zahlen im deutschen Format: 1.05 → „1,05“; Geld: 1.07 → „1,07 €“ (stellen = Nachkommastellen, 0 bei glatten Beträgen)
import { BAUKOSTEN, FENSTER } from './bau.js';
import { MOEBEL } from './moebel.js';
const foyerHaltung = id => MOEBEL.find(m => m.id === id).foyer.haltung;   // Zahlen aus den Inhaltsdateien (25.11.): ändern sie sich dort, stimmen die Hinweise mit
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
  tempo: { 0: 'Pause', 1: 'x1', 2: 'x2', 10: 'x10', 25: 'x25', 50: 'x50' },
  kontostand: 'Kontostand',
  bekanntheit: 'Bekanntheit',

  // Zeitungsartikel am Tag vor dem ersten Gottesdienst (Text von Lukas, 26.11.2026; Knopf „Weiter“ von Lukas gewählt)
  zeitung: {
    schlagzeile: 'Eine neue Gemeinde macht auf!',
    text: 'Ist es eine Sekte oder eine Brutstätte geistlichen Lebens bei uns im Ort?',
    weiter: 'Weiter'
  },

  // Pop-up „Jugendpastor ist da“ (Entwurf von Claude, von Lukas freigegeben 27.11.2026: „passt alles“)
  jugendpastor: {
    titel: 'Verstärkung für die Gemeinde!',
    text: 'Ab heute ist Jugendpastor Jimmy bei euch. Er kann Jugendgottesdienste, Lobpreisgottesdienste und den Konfirmandenunterricht leiten. Teile ihn im Menü „Mitarbeiter“ unter „Hauptamt“ ein.',
    weiter: 'Weiter'
  },

  // Intro beim Öffnen der App (Text von Lukas, 26.11.2026)
  intro: 'twoyears 2026',

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
  // Gitarrist Pflicht (27.11.) – ENTWÜRFE von Claude, Lukas formuliert selbst
  fehltGitarrist: 'Für den Lobpreisgottesdienst fehlt ein Ehrenamtlicher, der die Gitarre spielt.',
  ausgefallenGitarrist: 'Der Lobpreisgottesdienst ist ausgefallen – niemand hat die Gitarre gespielt.',
  // Jugendgottesdienst (ENTWÜRFE von Claude, 26.11. – Lukas formuliert selbst)
  fehltMusiker: 'Für den Jugendgottesdienst fehlen Musiker – mindestens 2 Ehrenamtliche müssen an je einem Instrument spielen.',
  ausgefallenMusiker: 'Der Jugendgottesdienst ist ausgefallen – zu wenige Musiker im Raum.',
  // ---- Gemeindesaal (25.11.) – ENTWÜRFE von Claude, Lukas formuliert selbst ----
  // Was einer Veranstaltung im Gemeindesaal fehlt (Codes aus dem Spiel)
  fehltSaal: {
    leitung: 'Es fehlt ein Hauptamtlicher im Raum.',
    ehrenamt: 'Es fehlt ein Ehrenamtlicher im Raum.',
    musikLevel: 'Kein Ehrenamtlicher mit Musik ab Level 1 im Raum.',
    tisch: 'Es fehlt ein Tisch im Raum.',
    stuehle: 'Es fehlen Stühle (mindestens 2).',
    klavier: 'Es fehlt ein Klavier im Raum.',
    mitarbeiter: 'Es fehlt ein Haupt- oder Ehrenamtlicher im Raum.',           // ENTWURF 25.11. (Spielenachmittag)
    stuehleTisch: 'Es fehlen Stühle am Tisch (mindestens 2 direkt daneben).'   // ENTWURF 25.11. (Spielenachmittag)
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
    gesperrtForschung: name => `Gesperrt – braucht die Forschung „${name}“`,   // ENTWURF von Claude (26.11.)
    termin: (tag, slot, uhr) => `${tag} ${slot.toLowerCase()} · ${uhr}`,
    zurueck: 'Zurück',                                       // Platzhalter von Claude
    wochenplan: 'Wochenplan',
    wochenplanInfo: 'Wann findet der Gottesdienst statt? Er dauert 1 Stunde, danach 2 Stunden Kirchkaffee.',   // 25.11.: Kirchkaffee jetzt 2 Stunden (von Claude angepasst)
    wochenplanInfoSaal: 'Wann findet die Veranstaltung statt? Sie dauert 1 Stunde.',   // ENTWURF von Claude (Gemeindesaal)
    wochenplanInfoSpiele: 'Wann findet der Spielenachmittag statt? Nur nachmittags oder abends möglich, er dauert 2 Stunden.',   // ENTWURF 25.11.
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
    prognoseSonntag: 'Sonntag: Kollekte ×2',   // Zeile erscheint nur, wenn der Termin an einem Sonntag ist (Lukas, 26.11.)
    prognoseFaelltAus: 'Ohne Mitarbeiter im Raum fällt der Gottesdienst aus.',
    ca: wert => `ca. ${wert}`
  },
  // Kacheln der Veranstaltungen: was sie bringen und welche Bedingungen sie haben
  veranstaltungKacheln: {
    gottesdienst: {
      bringt: ['Kollekte: 1 € pro Besucher', 'Sonntag: Kollekte ×2', 'Zufriedenheit der Besucher', 'Bekanntheit der Gemeinde'],
      bedingungen: [{ text: 'Pastor im Raum', bedingung: 'leitung' }, 'Stühle = Sitzplätze',
        { text: 'Für Musik: Instrument im Raum', bedingung: 'instrument' }]   // ENTWURF von Claude (25.11., Instrumente)   // bedingung: wird im Fenster grün/rot markiert
    },
    lobpreis: {   // Lukas, 25.11.
      bringt: ['Kollekte: 1 € pro Besucher', 'Haltung je nach Lobpreis-Vorliebe', 'Bekanntheit der Gemeinde'],
      bedingungen: [{ text: 'Hauptamtlicher im Raum', bedingung: 'leitung' }, { text: 'Gitarre im Raum', bedingung: 'gitarre' },
        { text: 'Ehrenamtlicher spielt die Gitarre', bedingung: 'gitarrist' }]   // ENTWURF 27.11.
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
      // Jugendgottesdienst (ENTWURF von Claude, 26.11. – Lukas formuliert selbst)
      hauptamtJugend: b => ({ name: 'Hauptamtlicher (Pflicht)', besucher: `Jugendliche ${b.jugendProzent} %, Erwachsene ${b.erwachseneProzent} %`,
        haltung: `+${b.gottesdienst} Gottesdienst, +${b.platz} Platz, erfüllt Spaß (Jugendliche) und Lobpreis`, geld: `${geld(b.kollekte)} je Besucher` }),
      pflichtMoebel: b => ({ name: `${b.name} (Pflicht)` }),
      moebel: b => ({ name: b.max > 1 ? `${b.name} (${b.anzahl} von ${b.max})` : b.name,
        haltung: b.haltung ? (b.max > 1 ? `+${b.haltung} je Stück` : `+${b.haltung}`) : null,
        geld: b.kollekte ? `Kollekte ×${zahl(b.kollekte)}${b.max > 1 ? ' je Stück' : ''}` : null }),
      fenster: b => ({ name: `Fenster (${b.anzahl})`, haltung: `+${b.haltung} je Fenster` }),
      multiplikator: b => ({ name: 'Haltungs-Multiplikator', haltung: `alles ×${zahl(b.faktor)} (nur Pluswerte)` }),   // freigegeben 25.11. abends   // ENTWURF von Claude (25.11.)
      besserStuhl: b => ({ name: 'Bessere Stühle', haltung: '+ Stufe des Stuhls', geld: b.kollekte ? 'Kollekte × Stufe' : null }),
      instrumentOhne: b => ({ name: `${b.name} ohne Ehrenamtlichen` }),
      musiker: b => ({
        name: (b.nr === 1 ? '1 Ehrenamtlicher' : `${b.nr}. Ehrenamtlicher`) + (b.pflicht ? ' (Pflicht)' : '')
          + (b.brauchtInstrument ? ` (braucht ${b.nr === 1 ? 'ein' : b.nr + '.'} Instrument)` : ' am Instrument')
          + (b.level !== null ? ` (Level ${b.level})` : ''),
        besucher: b.besucher ? `×${zahl(b.besucher.min)} bis ×${zahl(b.besucher.max)} je nach Lobpreis-Vorliebe` : null,
        haltung: b.nr === 1 ? (b.imRaum ? `+${b.bonus} % je nach Lobpreis-Vorliebe` : `+${b.bonusMin} % oder mehr je nach Lobpreis-Vorliebe`)
          : (b.imRaum ? `weitere +${b.bonus} %` : `weitere +${b.bonusMin} % oder mehr (je nach Level)`),
        geld: b.nr === 1 ? (b.imRaum ? `Kollekte +${b.bonus} %` : `Kollekte +${b.bonusMin} % oder mehr`)
          : (b.imRaum ? `weitere +${b.bonus} %` : `weitere +${b.bonusMin} % oder mehr`) }),
      // Ton-Technik (27.11.) – Texte von Claude (Lukas: „texte können von dir sein“)
      lautsprecher: b => ({ name: `Lautsprecher (${b.anzahl} von ${b.max})`, besucher: b.imRaum ? `reicht für ${b.plaetze} Personen` : `je Stück für ${b.jeStueck} Personen` }),
      tonpult: () => ({ name: 'Tontechnikpult' }),
      tontechniker: b => ({ name: 'Ehrenamtlicher am Tontechnikpult' + (b.level !== null ? ` (Level ${b.level})` : '')
          + (b.braucht === 'pult' ? ' (braucht ein Tontechnikpult)' : b.braucht === 'lautsprecher' ? ' (braucht Lautsprecher)' : ''),
        haltung: b.aktiv ? `+${b.bonus} %` : `+${b.bonusMin} % oder mehr (je nach Level)`,
        geld: b.aktiv ? `Kollekte +${b.bonus} %` : `Kollekte +${b.bonusMin} % oder mehr` }),
      subwoofer: b => ({ name: `Subwoofer (${b.anzahl} von ${b.max})`, haltung: `+${b.bonus} % je Stück`, geld: `Kollekte +${b.bonus} % je Stück` }),
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
      ehrenamtKonfi: b => ({ name: `Ehrenamtliche (${b.anzahl} von ${b.max})`, ehrenamt: `+${b.jeEhrenamt} Haltung je Ehrenamtlichem` }),
      // Spielenachmittag (ENTWÜRFE von Claude, 25.11. – Lukas formuliert selbst)
      leitungSpiele: b => ({ name: 'Haupt- oder Ehrenamtlicher (Pflicht)', besucher: `normal, Jugendliche ${b.jugendProzent} %`,
        haltung: `+${b.veranstaltung}, erfüllt Spaß`, geld: `Spende ${geld(b.spendeMin, 0)} bis ${geld(b.spendeMax, 0)} je Besucher` }),
      tischStuehleSpiele: b => ({ name: `Tisch, mind. ${b.stuehleMin} Stühle direkt daneben (Pflicht)` }),
      stuhlAmTisch: b => ({ name: `Jeder weitere Stuhl am Tisch (bis ${b.jeTisch} je Tisch)`, besucher: `+${b.plaetze} Platz` })
    },
    // Zeile „Zusammen“: s = Summe aus dem Spiel
    summe: s => ({
      besucher: s.besucher.art === 'musik' ? `×${zahl(s.besucher.min)} bis ×${zahl(s.besucher.max)} je nach Lobpreis-Vorliebe`
        : s.besucher.art === 'vorliebe' ? '× Lobpreis-Vorliebe'
        : s.besucher.art === 'jugend' ? `Jugendliche ${s.besucher.jugendProzent} %, Erwachsene ${s.besucher.erwachseneProzent} %`   // ENTWURF 26.11.
        : s.besucher.art === 'plaetze' ? `${s.art === 'konfi' ? 'nur Jugendliche' : 'normal'}, ${s.besucher.plaetze} ${s.besucher.plaetze === 1 ? 'Platz' : 'Plätze'}${s.art === 'spiele' ? ' am Tisch' : ''}`
        : s.besucher.art === 'egal' ? 'normal, Stühle egal' : 'normal',
      haltung: (s.haltung.vorliebeMax !== null
        ? `+${s.haltung.fest}, dazu 0 bis +${s.haltung.vorliebeMax}` + (s.haltung.prozent ? ` und +${s.haltung.prozent} %` : '') + ' je nach Lobpreis-Vorliebe'
        : `+${s.haltung.fest}` + (s.haltung.prozent ? ` und +${s.haltung.prozent} %` + (s.art === 'gottesdienst' || s.art === 'jugend' ? ' je nach Lobpreis-Vorliebe' : '') : ''))
        + (s.haltung.ton ? `, +${s.haltung.ton} % Ton-Technik` : '')   // Ton-Technik (27.11.), Text von Claude
        + (s.haltung.faktor > 1 ? `, dann alles ×${zahl(s.haltung.faktor)}` : ''),   // Multiplikator, freigegeben 25.11. abends
      geld: s.geld.keins ? null : s.geld.spende ? `Spende ca. ${geld(s.geld.jeBesucher)} je Besucher`
        : `${geld(s.geld.jeBesucher)} je Besucher` + (s.tonPlaetze ? ` (Ton-Technik voll bis ${s.tonPlaetze} Besucher)` : ''),
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
  // Automaten (26.11.) – alle Texte ENTWURF von Claude, Lukas formuliert sie selbst. Eigene Texte je Automat unter seiner id.
  automat: {
    fuellstand: (n, max) => `Füllstand: ${n} von ${max}`,
    leer: 'Leer',
    nichtImKaffee: 'Steht nicht im Kirchkaffee – hier wird nichts verkauft.',
    getraenkeautomat: {
      fuellstand: (n, max) => `Getränke: ${n} / ${max}`,
      erklaerung: (preis, einkauf) => `Besucher kaufen hier Getränke für ${geld(preis, preis % 1 ? 2 : 0)}. Der Ehrenamtliche füllt den Automaten auf, wenn das Kirchkaffee zu hat (${geld(einkauf, einkauf % 1 ? 2 : 0)} pro Getränk).`
    }
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
    toilette: 'Toilette',   // Bedürfnis Toilette (26.11.) – ENTWURF von Claude, Lukas formuliert selbst
    mitglied: woche => `Gemeindemitglied seit Woche ${woche}`,   // 27.11. – ENTWURF von Claude, Lukas formuliert selbst
    // Konfirmandenunterricht (von Lukas freigegeben, 25.11.)
    jugendlich: 'Jugendlich',
    konfi: (n, von) => `Konfirmandenunterricht: ${n} von ${von}`,
    // Haltungslevel und Bedürfnisse am Ende der Woche (ENTWÜRFE von Claude, 25.11. – Lukas formuliert selbst)
    level: (n, max) => `Level ${n} von ${max}`,
    levelInfo: 'Bei 100 steigt die Haltung ein Level auf und beginnt wieder bei 0. Bei 0 geht es ein Level zurück.',
    wochenBeduerfnisse: 'Bedürfnisse diese Woche',
    wochenInfo: 'Wird Sonntag um 24 Uhr geprüft: jedes nicht erfüllte Bedürfnis kostet 5 Haltung.',
    keineWochenBeduerfnisse: 'Noch keine – Bedürfnisse entwickeln sich mit höherem Level.',
    wochenBeduerfnis: { lobpreis: 'Lobpreis', kaffee: 'Kaffee', spass: 'Spaß' },
    erfuelltWoche: 'erfüllt',
    offenWoche: 'noch offen',
    // Letzte Besuche (von Lukas freigegeben, 27.11.)
    letzteBesuche: 'Letzte Besuche',
    keineBesuche: 'Noch keine Besuche',
    keinPlatz: 'kein Platz',
    levelErreicht: n => `Level ${n} erreicht`,
    zeit: (tag, stunde, minute) => `${TEXTE.tageKurz[tag]} ${String(stunde).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
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
    // Mindestgäste (27.11.) – ENTWURF von Claude, Lukas formuliert selbst
    mindestgaeste: n => `Gäste pro Öffnungszeit: mindestens ${n}`,
    mindestTeile: { grund: n => `Grund ${n}`, sitzplaetze: n => `Sitzplätze +${n}`, tische: n => `Tische +${n}`, automaten: n => `Automaten +${n}`, theken: n => `weitere Theken +${n}` },
    mindestInfo: 'Zu jeder Öffnungszeit kommen mindestens so viele Gäste. Mehr Stühle, Tische, Automaten und Theken locken mehr an.',
    sitzInfo: prozent => `Nach dem Kaffee setzen sich Kunden mit ${prozent} % Wahrscheinlichkeit auf einen freien Stuhl. Beim Gehen geben sie Trinkgeld: 1 €, mehr mit besseren Stühlen und einem Tisch daneben.`
  },
  // ---- Fenster „Lager“ (Klick aufs Lager, 27.11.; Entwürfe von Claude, von Lukas freigegeben 27.11.) ----
  lagerFenster: {
    titel: 'Logistik-Zeiten',
    info: 'Lege hier fest, wann im Lager gearbeitet wird. Zu diesen Zeiten erscheinen im Dienstplan Stellen für die Logistik – eine je Regal. Die Eingeteilten kaufen Kaffee und Ware ein und füllen Maschinen und Automaten auf.',
    hinzufuegen: 'Logistik-Zeit hinzufügen',
    entfernen: 'Entfernen',
    keineZeiten: 'Noch keine Logistik-Zeiten – niemand füllt auf.',
    regale: n => `Regale: ${n} (bis zu ${n} Ehrenamtliche je Zeit)`,
    keinRegal: 'Stelle ein Regal auf, damit hier jemand arbeiten kann.'
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
    dauerspenderInfo: r => `Wer montags mindestens Haltungslevel ${r.abLevel} hat, wird mit ${r.chance} % Chance Dauerspender. Die Spenden kommen montags um ${r.stunde}:00 Uhr: zuerst ${r.start} €, jede Woche ${r.steigerung} € mehr, höchstens ${r.max} €. Fällt jemand unter Level ${r.abLevel}, endet die Dauerspende am nächsten Montag.`,   // ENTWURF 25.11. (Haltungslevel)
    dauerspenderLeer: 'Noch keine Dauerspender.',
    dauerspenderSumme: 'Summe pro Woche',
    dauerspenderSpalten: { name: 'Name', betrag: 'Spende diese Woche', naechster: 'Nächsten Montag', seit: 'Seit Woche', haltung: 'Haltung' },
    dauerspenderHaltung: (level, haltung) => `Level ${level} · ${haltung}`,   // ENTWURF 25.11. (Haltungslevel)
    // Dauerspender als eine Zeile zum Aufklappen (27.11., Lukas: „einfach als eine zeile und dann halt aufklappbar“) – ENTWURF von Claude
    dauerspenderZeile: (n, summe) => n ? `${n} Dauerspender · ${summe} pro Woche` : 'Noch keine Dauerspender',
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
  // Menü „Mitglieder“ (27.11.): eigener Knopf oben, alle Daten zu den Gemeindemitgliedern. Überschrift „Gemeindemitglieder“ von Lukas freigegeben,
  // alles andere ENTWURF von Claude – Lukas formuliert selbst (die Sätze stammen zum Teil aus dem bisherigen Abschnitt im Finanz-Fenster)
  mitglieder: {
    knopf: 'Mitglieder',   // ENTWURF
    titel: 'Gemeindemitglieder',
    anzahl: (n, summe) => `${n} ${n === 1 ? 'Mitglied' : 'Mitglieder'} · ${summe} pro Monat`,   // ENTWURF
    info: r => `Erwachsene ab Haltungslevel ${r.abLevel} werden nach jedem Gottesdienst mit ${r.chance} % Chance Mitglied. Mitglieder kommen öfter (+${r.kommBonus} %) und zahlen am 1. jedes Monats um ${r.stunde}:00 Uhr den Beitrag. Fällt ein Mitglied auf Level 2, kündigt es jede Woche mit ${r.kuendigung[2]} % Chance, auf Level 1 mit ${r.kuendigung[1]} %.`,   // ENTWURF
    beitragTitel: 'Beitrag',   // ENTWURF
    beitrag: 'Monatsbeitrag pro Mitglied',   // ENTWURF
    beitragWeniger: '−', beitragMehr: '+',
    beitragHaltung: (h, r) => `${h > 0 ? '+' : h < 0 ? '−' : '±'}${Math.abs(h)} Haltung für jedes Mitglied bei jeder Abbuchung. Bei ${r.neutral} € ändert sich nichts, je ${r.schritt} € mehr ${r.haltungMehr}, je ${r.schritt} € weniger +${r.haltungWeniger}.`,   // ENTWURF
    listeTitel: 'Alle Mitglieder',   // ENTWURF
    leer: 'Noch keine Gemeindemitglieder.',   // ENTWURF
    summe: 'Summe pro Monat',   // ENTWURF
    spalten: { name: 'Name', seit: 'Seit Woche', haltung: 'Haltung', gefahr: 'Kündigt diese Woche' },   // ENTWURF
    haltung: (level, haltung) => `Level ${level} · ${haltung}`,   // ENTWURF
    gefahr: c => c ? `${c} %` : '–',   // ENTWURF
    gefahrInfo: 'Rot markiert: Mitglieder auf Level 2 oder 1, die kündigen könnten.',   // ENTWURF
    verlaufTitel: 'Verlauf',   // ENTWURF
    verlaufInfo: n => `Mitglieder am Ende der letzten ${n} Wochen, dazu der Stand jetzt.`,   // ENTWURF
    verlaufLeer: 'Der Verlauf beginnt am Ende dieser Woche.',   // ENTWURF
    woche: w => `Woche ${w}`
  },
  menschen: {
    knopf: 'Menschen',
    titel: 'Menschen im Ort',
    spalten: { name: 'Name', haltung: 'Haltung', besuche: 'Besuche', zuletzt: 'Zuletzt da', kaffee: 'Kaffee', status: 'Status' },
    unbekannt: '–', prozent: n => `${n} %`,
    woche: n => `Woche ${n}`,
    level: n => `L${n}`,   // ENTWURF 25.11.: Haltungslevel vor dem Balken
    mitglied: 'Mitglied',   // ENTWURF 27.11.: Vermerk hinter dem Namen
    leer: 'Noch niemand bekannt.',
    status: { passant: 'Passant', neugierig: 'Neugierig', besucher: 'Besucher', stammgast: 'Stammgast', ehrenamtlich: 'Ehrenamtlich' },
    // ENTWURF 26.11. (Claude, wartet auf Freigabe von Lukas): Gruppen und gesammelte Statistiken
    gruppen: { ehrenamtlich: 'Ehrenamtliche', stammgast: 'Stammgäste', besucher: 'Besucher', neugierig: 'Neugierige', passant: 'Passanten' },
    ueberblick: 'Überblick',
    alle: 'Alle',
    statSpalten: { gruppe: 'Gruppe', anzahl: 'Anzahl', haltung: 'Ø Haltung', besuche: 'Ø Besuche', kaffee: 'Ø Kaffee', dieseWoche: 'Diese Woche da', jugend: 'Jugendliche', konfirmanden: 'Konfirmanden' },
    levelZeile: 'Haltungslevel (alle)',
    levelAnzahl: (n, anzahl) => `L${n}: ${anzahl}`,
    gruppeKopf: (name, anzahl) => `${name} (${anzahl})`,
    gruppeHaltung: n => `Ø Haltung ${n}`,
    gruppeLeer: 'Niemand in dieser Gruppe.'
  },
  // Meldung unten rechts
  meldung: {
    neugierig: name => `${name} ist am Tor stehen geblieben und schaut neugierig herein.`,
    keinGeldKaffee: name => `Nicht genug Geld – ${name} konnte keinen Kaffee einkaufen.`,   // Lukas, 25.11.
    // Automaten (26.11., ENTWURF von Claude): ware = id des Automaten
    keinGeldAutomat: (name, ware) => ware === 'getraenkeautomat' ? `Nicht genug Geld – ${name} konnte keine Getränke einkaufen.`
      : `Nicht genug Geld – ${name} konnte den Automaten nicht auffüllen.`,
    // Konfirmandenunterricht (von Lukas freigegeben, 25.11.; Einzahl bei „konfirmiert“ von Claude ergänzt)
    konfirmand: name => `${name} war 7-mal im Konfirmandenunterricht und wird bei der nächsten Konfirmation konfirmiert.`,
    konfirmiert: n => n === 1 ? '1 Jugendlicher wurde konfirmiert und gehört jetzt zu den Erwachsenen.'
      : `${n} Jugendliche wurden konfirmiert und gehören jetzt zu den Erwachsenen.`,
    keineKonfirmanden: () => 'In diesem Jahr gibt es keine Konfirmanden – die Konfirmation fällt aus.',
    konfiBrief: () => 'Der Einladungsbrief für Konfis ist verschickt. Bis zur Konfirmation kommen neue Jugendliche.',   // ENTWURF von Claude (27.11.)
    neuerDauerspender: () => 'Herzlichen Glückwunsch! Deine Gemeinde konnte einen neuen Dauerspender gewinnen!'   // Text von Lukas, 27.11.
  },

  // Seelsorge-Fenster
  seelsorge: {
    titel: 'Seelsorge',
    anfrage: (voll, name) => `${voll} möchte mit ${name} sprechen.`,   // 27.11.: Name des gefragten Hauptamtlichen (von Lukas so gewünscht)
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
    neueStufe: (n, name) => `${name} ist jetzt Seelsorger Stufe ${n}.`,   // 27.11.: Name des Hauptamtlichen (von Lukas so gewünscht)
    // Von Lukas freigegeben (25.11. abends): Aufstieg zwischen den Freischaltungen und auf einer Freischaltung
    stufeBonus: n => `Seine Ratschläge gelingen jetzt ${zahl(n)} % öfter.`,
    neuFreigeschaltet: t => `Neu: ${t}`,
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
      titel: (n, max) => `Seelsorge – Stufe ${n} von ${max}`,   // freigegeben 25.11. abends
      bonus: n => `Erfolgschance +${zahl(n)} %`,                // freigegeben 25.11. abends
      fortschritt: (x, y, n) => `${x} von ${y} Punkten bis Stufe ${n}`,
      hoechste: 'Höchste Stufe erreicht',
      // Was jede Stufe bringt (Stufe 1 bringt noch nichts Besonderes) – freigegeben 25.11.
      // Freischaltungen jetzt nur alle 5 Stufen (25.11. abends); Texte unverändert, nur die Stufen verschoben
      kann: { 5: 'erkennt den passendsten Rat', 10: 'schätzt jeden Rat ein', 15: 'sieht die genaue Chance', 20: 'Ratschläge gelingen am häufigsten' },
      jetzt: t => `Jetzt: ${t}`,
      ab: (n, t) => n === 20 ? `Stufe 20: ${t}` : `Ab Stufe ${n}: ${t}`
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
    // Wand, Tür, Abriss: standen bis 26.11. direkt in eingaben.js – Wortlaut unverändert
    wand: 'Zieh ein Rechteck, um Wände zu bauen.',
    tuer: 'Klicke auf eine Wand, um eine Tür zu setzen oder zu entfernen.',   // TODO Lukas: Preis dazuschreiben? (Vorschlag vorgelegt 26.11.)
    abriss: 'Zieh über den Bereich, der abgerissen werden soll.',
    keinWerkzeug: 'Wähle unten aus, was du bauen möchtest.',   // nach Rechtsklick: nichts gewählt (Entwurf von Claude, von Lukas freigegeben 25.11.)
    stuhl: 'Klicke, um einen Stuhl aufzustellen – oder auf einen Stuhl, um ihn zu verbessern.',
    kaffeemaschine: 'Klicke, um eine Kaffeemaschine aufzustellen (fürs Kirchkaffee).',
    getraenkeautomat: 'Klicke, um einen Getränkeautomaten aufzustellen (fürs Kirchkaffee).',   // ENTWURF von Claude (26.11.)
    theke: 'Klicke, um ein Thekenteil aufzustellen (fürs Kirchkaffee).',
    tisch: 'Stühle direkt daneben bringen mehr Trinkgeld (×1,2).',   // Lukas, 25.11.
    // ---- Ausstattung des Gottesdienstraums (Entwürfe von Claude, von Lukas vorerst so übernommen, 25.11.) ----
    kanzel: 'Klicke, um eine Kanzel aufzustellen (Gottesdienstraum, 1 pro Raum).',
    altar: 'Klicke, um einen Altar aufzustellen (Gottesdienstraum, 1 pro Raum).',
    // Ton-Technik (27.11.) – Texte von Claude
    lautsprecher: 'Klicke, um einen Lautsprecher aufzustellen (Gottesdienstraum, bis 8 pro Raum). Jeder reicht für 15 Personen – egal, wo er steht.',
    subwoofer: 'Klicke, um einen Subwoofer aufzustellen (Gottesdienstraum, bis 2 pro Raum) – bringt mehr, wenn die Ton-Technik läuft.',
    tonpult: 'Klicke, um ein Tontechnikpult aufzustellen (Gottesdienstraum, 1 pro Raum) – braucht Lautsprecher und einen Ehrenamtlichen als Tontechniker.',
    blumen: 'Klicke, um Blumen aufzustellen (Gottesdienstraum, bis 4 pro Raum).',
    gruenpflanze: 'Klicke, um eine Grünpflanze aufzustellen (Gottesdienstraum, bis 4 pro Raum).',
    // Instrumente (Muster von Lukas freigegeben 25.11.): jedes braucht einen eigenen Ehrenamtlichen
    gitarre: 'Klicke, um eine Gitarre aufzustellen (Gottesdienstraum, 1 pro Raum) – braucht einen eigenen Ehrenamtlichen, der sie spielt.',
    keyboard: 'Klicke, um ein Keyboard aufzustellen (Gottesdienstraum, 1 pro Raum) – braucht einen eigenen Ehrenamtlichen, der es spielt.',
    schlagzeug: 'Klicke, um ein Schlagzeug aufzustellen (Gottesdienstraum, 1 pro Raum) – braucht einen eigenen Ehrenamtlichen, der es spielt.',
    bass: 'Klicke, um einen Bass aufzustellen (Gottesdienstraum, 1 pro Raum) – braucht einen eigenen Ehrenamtlichen, der ihn spielt.',
    egitarre: 'Klicke, um eine E-Gitarre aufzustellen (Gottesdienstraum, 1 pro Raum) – braucht einen eigenen Ehrenamtlichen, der sie spielt.',
    mikrofon: 'Klicke, um ein Mikrofon aufzustellen (Gottesdienstraum, 1 pro Raum) – braucht einen eigenen Ehrenamtlichen, der singt.',
    // ---- Baukosten, Fenster, Foyer (25.11.) – ENTWÜRFE von Claude, Lukas formuliert selbst ----
    wand: `Zieh ein Rechteck, um Wände zu bauen. Jedes neue Wandstück kostet ${BAUKOSTEN.wand} €.`,
    fenster: `Klicke auf eine Wand, um ein Fenster einzusetzen (${BAUKOSTEN.fenster} €) oder wieder zu entfernen. Jedes Fenster bringt +${FENSTER.haltung} Haltung im Raum.`,
    garderobe: `Klicke, um eine Garderobe aufzustellen (wirkt im Foyer: +${foyerHaltung('garderobe')} Haltung für jeden, der hindurchläuft).`,
    infotisch: `Klicke, um einen Infotisch aufzustellen (wirkt im Foyer: +${foyerHaltung('infotisch')} Haltung für jeden, der hindurchläuft).`,
    // ---- Toiletten (26.11.) – ENTWÜRFE von Claude, Lukas formuliert selbst ----
    wc: 'Klicke, um eine WC-Kabine aufzustellen (Toiletten, eine Person gleichzeitig).',
    waschbecken: 'Klicke, um ein Waschbecken aufzustellen (Toiletten).',
    // ---- Lager (27.11.) – ENTWURF von Claude, Lukas formuliert selbst ----
    regal: 'Klicke, um ein Regal aufzustellen (Lager). Je Regal kann pro Zeitblock ein Ehrenamtlicher für die Logistik eingeteilt werden.',
    // ---- Büro (27.11.) – ENTWURF von Claude, Lukas formuliert selbst ----
    schreibtisch: 'Klicke, um einen Schreibtisch aufzustellen (Büro). Dann kann pro Zeitblock ein Ehrenamtlicher im Büro eingeteilt werden.'
  },
  // ---- Baukosten, Fenster, Foyer (25.11.) – ENTWÜRFE von Claude, Lukas formuliert selbst ----
  bauGeld: {
    wand: (kosten, stuecke) => `Nicht genug Geld für diese Wände (${stuecke} Stück, ${kosten}).`,
    fenster: preis => `Nicht genug Geld für ein Fenster (${preis}).`,
    tuer: preis => `Nicht genug Geld für eine Tür (${preis}).`,   // ENTWURF von Claude (26.11.), nach Vorbild Fenster – Lukas formuliert
    vorschau: (stuecke, kosten) => `${stuecke} ${stuecke === 1 ? 'Wandstück' : 'Wandstücke'} · ${kosten}`
  },
  foyerFenster: {
    info: 'Wer auf dem Weg zu seinem Platz durchs Foyer läuft, bekommt am Ende der Veranstaltung Haltung dazu.',
    zusammen: n => `Haltung +${n} für jeden, der hindurchläuft`,
    begruessung: (da, n) => `Begrüßungsdienst (ein Ehrenamtlicher im Foyer): ${da ? `+${n}` : `fehlt – würde +${n} bringen`}`,
    teil: (name, anzahl, n) => `${name} (${anzahl}): ${anzahl ? `+${anzahl * n}` : `je Stück +${n}`}`,
    nichtFertig: 'Das Foyer ist noch nicht fertig (Tür oder Größe fehlt) – es bringt noch nichts.',
    mitarbeiter: 'Im Foyer'
  },
  // Kauf gesperrt, weil schon genug davon im Raum steht
  grenze: {
    kanzel: 'In diesem Raum steht schon eine Kanzel.',
    altar: 'In diesem Raum steht schon ein Altar.',
    blumen: 'In diesem Raum stehen schon 4 Blumen.',
    gruenpflanze: 'In diesem Raum stehen schon 4 Grünpflanzen.',
    gitarre: 'In diesem Raum steht schon eine Gitarre.',
    lautsprecher: 'In diesem Raum stehen schon 8 Lautsprecher.',   // Ton-Technik (27.11.): Texte von Claude
    subwoofer: 'In diesem Raum stehen schon 2 Subwoofer.',
    tonpult: 'In diesem Raum steht schon ein Tontechnikpult.',
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
    keinGeld: 'Nicht genug Geld.',
    nichtGenugGeld: preis => `Nicht genug Geld für einen Stuhl (${preis}).`   // stand bis 26.11. in eingaben.js
  },
  // Menü der Pforte (in der Spielansicht aufs Tor tippen)
  // Evangelisation vor dem Laden (Texte von Lukas freigegeben, 26.11.)
  evangelisation: {
    feld: 'Evangelisation!',
    titel: 'Evangelisation',
    // ENTWURF (26.11. abends): „Musik-Level“ → „Evangelisation-Level“, weil seit dem neuen Skill dieser zählt – wartet auf Lukas
    info: 'Ehrenamtliche, die gerade frei haben, gehen von selbst hierher und sprechen Passanten an. Je höher ihr Evangelisation-Level, desto eher kommen die Leute zum nächsten Gottesdienst.',
    vorOrt: (x, max) => `Vor Ort: ${x} von ${max}`,
    chance: x => `Chance pro Passant: ${x} %`,
    niemand: 'Gerade ist niemand vor Ort.',
    keinJugo: name => `Kein Jugendgottesdienst geplant – ${name} lädt gerade niemanden ein.`,
    frei: x => `Gerade frei: ${x}`,
    // ENTWURF von Claude (26.11. abends, ausführlicheres Menü und Skill „Evangelisation“) – alle folgenden Texte warten auf Lukas
    spalten: { name: 'Vor Ort', level: 'Evangelisation', beitrag: 'Beitrag' },
    level: (x, max) => `Level ${x} von ${max}`,
    naechstes: h => `noch ${h} Std. bis zum nächsten Level`,
    hoechstes: 'höchstes Level',
    wohin: { gottesdienst: 'lädt zum Gottesdienst ein', jugend: 'lädt Jugendliche zum Jugendgottesdienst ein' },
    beitrag: x => `+${x} %`,
    chanceJugend: x => `Für jugendliche Passanten: ${x} %`,
    obergrenze: x => `(höchstens ${x} %)`,
    rechnung: 'Jeder Ehrenamtliche vor Ort bringt 5 % + 5 % je Evangelisation-Level, zusammen höchstens 80 %. Für jede Stunde vor Ort gibt es Erfahrung.',
    unterwegs: x => `Auf dem Weg hierher: ${x}`,
    zeiten: (von, bis) => `Evangelisiert wird von ${von} bis ${bis} Uhr.`,
    statistik: 'Was es bringt',
    statSpalten: { heute: 'Heute', woche: 'Diese Woche' },
    statZeilen: { vorbei: 'Vorbeigelaufen, während jemand da war', angesprochen: 'Angesprochen', gekommen: 'Eingeladene gekommen' },
    karte: x => `Evangelisation: Level ${x}`
  },
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
    tontechnikLevel: level => `Tontechnik: Level ${level}`,   // Ton-Technik (27.11.): Text von Claude
    musiker: 'Musiker',
    ohneGitarre: 'ohne Instrument keine Musik'
  },
  nichtGenugGeld: (name, preis) => `Nicht genug Geld für ${name} (${preis}).`,

  // ---- Bauleiste unten (25.11.; Reiter von Lukas freigegeben, übrige Texte ENTWÜRFE von Claude) ----
  // Spicker rechts im Bau-Modus: Mindestgröße je Raum. ENTWURF von Claude (27.11.) – Lukas formuliert selbst
  raumSpicker: { titel: 'Mindestgröße', groesse: (b, h) => `${b} × ${h}` },
  bauleiste: {
    kategorien: { bauen: 'Bauen', gottesdienst: 'Gottesdienst', kirchkaffee: 'Kirchkaffee', gemeindesaal: 'Gemeindesaal', foyer: 'Foyer', toiletten: 'Toiletten', lager: 'Lager', buero: 'Büro', deko: 'Deko', aussen: 'Außen' },   // „Foyer“, „Toiletten“, „Büro“: ENTWURF
    werkzeuge: { wand: 'Wand', tuer: 'Tür', fenster: 'Fenster', abriss: 'Abriss', bushaltestelle: 'Bushaltestelle' },   // „Fenster“: ENTWURF
    jeStueck: preis => `${preis} je Stück`,   // Preis der Wand (ENTWURF von Claude, 25.11.)
    abBekanntheit: n => `ab Bekanntheit ${n}`,
    drehen: 'Drehen (R)'
  },
  hinweiseAussen: {
    strasse: 'Zieh ein Rechteck, um Straße zu bauen. Die Straße muss im Tor beginnen.',
    parkplatz: 'Klicke, um einen Parkplatz zu bauen (R dreht ihn). Er zählt, wenn er an einer Straße liegt, die bis zum Tor führt.',
    bushaltestelle: 'Die Bushaltestelle steht am Gehweg neben dem Tor.',
    // ---- Wege und Außendeko (25.11.) – ENTWÜRFE von Claude, Lukas formuliert selbst ----
    weg: 'Zieh ein Rechteck, um einen Weg anzulegen. Wege machen das Gelände schöner.',
    busch: 'Klicke, um einen Busch zu pflanzen. Außendeko macht Passanten neugieriger.',
    hecke: 'Klicke, um ein Stück Hecke zu pflanzen.',
    blumenbeet: 'Klicke, um ein Blumenbeet anzulegen.',
    bank: 'Klicke, um eine Bank aufzustellen.',
    laterne: 'Klicke, um eine Laterne aufzustellen.',
    baum: 'Klicke, um einen Baum zu pflanzen (2 × 2 Kästchen).',
    schaukasten: 'Klicke, um einen Schaukasten aufzustellen. In der Spielansicht wählst du per Klick, wofür er wirbt.'
  },
  aussenMeldung: {
    innen: 'Straße und Parkplätze gehören nach draußen, nicht in einen Raum.',
    bekanntheit: n => `Parkplätze kannst du ab Bekanntheit ${n} bauen.`,
    strasseGeld: 'Das Geld hat nicht für die ganze Straße gereicht.',
    strasse: 'Straße',   // Name in „Nicht genug Geld für Straße“ (stand bis 26.11. in eingaben.js)
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
    info: 'So viele Menschen kann die Gemeinde erreichen. Mitgezählt: Besucher und Passanten im Ort.',   // 27.11.: „und Ehrenamtliche“ gestrichen (ENTWURF, Lukas prüft)
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
  // Haltungs-Multiplikator auf der Charakter-Karte des Hauptamtlichen (26.11.; Texte von Lukas freigegeben: „passt“)
  multiplikatorKarte: {
    titel: (n, max, faktor) => `Haltungs-Multiplikator · Stufe ${n} von ${max} · ×${zahl(faktor)}`,
    erklaerung: 'Vervielfacht die Haltung, die Besucher am Ende eines Gottesdienstes oder Lobpreisgottesdienstes bekommen, den er leitet – nach allen anderen Boni. Minuswerte bleiben, wie sie sind.',
    geleitet: (n, ab) => `${n} ${n === 1 ? 'Gottesdienst' : 'Gottesdienste'} geleitet` + (ab ? ` · nächste Stufe ab ${ab}` : ''),
    kaufen: (stufe, preis) => `Stufe ${stufe} kaufen (${preis} Heiligkeit)`,
    fehlen: n => `Noch ${n} ${n === 1 ? 'Gottesdienst' : 'Gottesdienste'} bis zur nächsten Stufe`,
    zuWenig: 'Zu wenig Heiligkeit',
    fertig: 'Höchste Stufe erreicht'
  },
  // Büro-Fenster (27.11.) – ENTWÜRFE von Claude, Lukas formuliert selbst
  buero: {
    info: n => `Pro Büro-Schicht gibt es ${n === 1 ? '1 Orga-Token' : n + ' Orga-Tokens'}.`,
    tokens: n => `Orga-Tokens: ${n}`,
    nichtFertig: 'Das Büro ist noch nicht fertig – es braucht mindestens 2 × 2 Kästchen und eine Tür.',
    keinTisch: 'Stell einen Schreibtisch auf, dann kannst du im Menü „Mitarbeiter“ einen Ehrenamtlichen fürs Büro einteilen.',
    mitarbeiter: 'Gerade im Büro',
    niemand: 'Gerade arbeitet niemand im Büro.',
    boni: 'Freischalten',
    preis: n => n === 1 ? '1 Orga-Token' : `${n} Orga-Tokens`,
    freischalten: 'Freischalten',
    aktivBis: datum => `Aktiv bis zur Konfirmation (${datum})`,
    zuWenig: 'Noch nicht genug Orga-Tokens.',
    bonus: {
      einladungKonfi: {
        name: 'Einladungsbrief für Konfis',
        wirkung: (n, chance) => `Jede Woche kommen ${n} neue Jugendliche in die Gemeinde. Zum nächsten Konfirmandenunterricht kommen sie mit ${chance} %. Gilt bis zur nächsten Konfirmation.`,
        ohneKonfi: 'Bringt nur etwas, wenn im Gemeindesaal Konfirmandenunterricht stattfindet.'
      }
    }
  },
  forschung: {
    knopf: 'Forschung',
    titel: 'Forschung',
    vorrat: (heiligkeit, geld) => `Heiligkeit: ${heiligkeit} · Kontostand: ${geld}`,
    kosten: (geld, heiligkeit) => `${geld} und ${heiligkeit} Heiligkeit`,
    dauer: sek => sek >= 60 && sek % 60 === 0 ? `Dauer: ${sek / 60} ${sek === 60 ? 'Minute' : 'Minuten'}` : `Dauer: ${sek} Sekunden`,
    dauerInfo: 'Gilt bei normaler Geschwindigkeit. Die Forschung läuft nur, wenn die Spielzeit läuft.',
    rest: sek => `noch ${sek >= 60 ? `${Math.floor(sek / 60)}:${String(sek % 60).padStart(2, '0')} Min.` : `${sek} Sek.`}`,
    beschreibung: { schulungen1: 'Schaltet frei, dass du Ehrenamtliche auf Schulungen schicken kannst.',
      schulungen2: 'Schaltet Stufe 2 aller Schulungen frei.',   // ENTWURF von Claude (27.11.), Texte darf Claude festlegen
      // ENTWÜRFE von Claude (26.11.) – Lukas formuliert selbst
      slot3gottesdienst: 'Schaltet in jedem Gottesdienstraum eine 3. Veranstaltung frei.',
      slot3saal: 'Schaltet in jedem Gemeindesaal eine 3. Veranstaltung frei.' },
    erforscht: 'Erforscht',
    starten: 'Forschen',
    abbrechen: 'Abbrechen',
    abbrechenFrage: 'Wirklich abbrechen? Geld und Heiligkeit sind dann weg.',
    abbrechenJa: 'Ja, abbrechen',
    abbrechenNein: 'Weiterforschen',
    zustand: { gesperrt: 'Erst die vorherige Forschung abschließen', besetzt: 'Es läuft schon eine andere Forschung', geld: 'Zu wenig Geld', heiligkeit: 'Zu wenig Heiligkeit', beides: 'Zu wenig Geld und Heiligkeit' },   // „beides“: ENTWURF von Claude (27.11.)
    schliessen: 'Schließen'
  },
  // Gemeindekalender (ENTWÜRFE von Claude, 26.11. – Lukas formuliert selbst)
  kalender: {
    knopf: 'Kalender',
    titel: 'Gemeindekalender',
    diese: 'Diese Woche',
    naechste: 'Nächste Woche',
    vorherige: 'Vorherige Woche',   // Wortlaut von Lukas, 27.11.
    // Bericht einer vergangenen Veranstaltung (Wörter von Lukas freigegeben, 27.11.)
    bericht: { besucher: 'Besucher', keinPlatz: 'Kein Platz', kollekte: 'Kollekte', spende: 'Spende', haltung: 'Haltung', heiligkeit: 'Heiligkeit', bekanntheit: 'Bekanntheit' },
    leerVorher: 'Für diese Woche gibt es keine Berichte.',   // ENTWURF von Claude, 27.11. – noch nicht von Lukas freigegeben
    woche: n => `Woche ${n} · alle Veranstaltungen in allen Räumen`,
    fest: (fest, art) => art ? `${fest} (${art})` : fest,
    kaffee: 'Kirchkaffee geöffnet',
    bis: stunde => `bis ${String(stunde).padStart(2, '0')}:00`,
    leer: 'In dieser Woche ist nichts geplant.',
    zustand: { geplant: '', laeuft: 'Läuft gerade', vorbei: 'Vorbei', faelltAus: 'Fällt aus', ausgefallen: 'Ist ausgefallen' },
    grund: { fest: 'wegen eines Fests', raum: 'Raum nicht fertig', keine: 'nichts eingestellt', leitung: 'kein Hauptamtlicher', gitarre: 'Gitarre fehlt', gitarrist: 'kein Gitarrist',
      gesperrt: 'Platz gesperrt', musiker: 'zu wenige Musiker', ehrenamt: 'kein Ehrenamtlicher', mitarbeiter: 'kein Mitarbeiter', musikLevel: 'Musik-Level zu niedrig',
      tisch: 'Tisch fehlt', klavier: 'Klavier fehlt', stuehle: 'zu wenige Stühle', stuehleTisch: 'zu wenige Stühle am Tisch' }
  },

  // Wochenzusammenfassung (27.11.): jeden Montag 8:00, Spiel pausiert bis „Weiter“.
  // ENTWURF von Claude (alle Texte in diesem Block) – noch nicht von Lukas formuliert
  wochenbericht: {
    titel: n => `Wochenzusammenfassung · Woche ${n}`,
    unter: 'Was letzte Woche lief und was es gebracht hat. Klick auf einen Bereich zeigt die Einzelheiten.',
    weiter: 'Weiter',
    kacheln: { ergebnis: 'Ergebnis', besucher: 'Besucher', bekanntheit: 'Bekanntheit', heiligkeit: 'Heiligkeit' },
    zurVorwoche: d => `${d} zur Vorwoche`,
    vorwoche: d => `Vorwoche ${d}`,
    ersteWoche: 'erste Woche',
    jetzt: n => `jetzt ${n}`,
    bereiche: { geld: 'Geld', veranstaltungen: 'Veranstaltungen', gemeinde: 'Gemeinde', werte: 'Bekanntheit & Heiligkeit', monat: 'Monatsblick' },
    // Kurzzeilen (auch zugeklappt sichtbar)
    geldKurz: (ergebnis, konto) => `${ergebnis} · Kontostand ${konto}`,
    veranstaltungenKurz: (n, aus) => `${n === 1 ? '1 Veranstaltung' : `${n} Veranstaltungen`}${aus ? ` · ${aus} ausgefallen` : ''}`,
    gemeindeKurz: (m, dm, s, ds) => `Mitglieder ${m}${dm} · Dauerspender ${s}${ds}`,
    werteKurz: (b, h) => `Bekanntheit ${b} · Heiligkeit ${h}`,
    monatKurz: (monat, summe) => `Mitgliedsbeiträge ${monat}: ${summe}`,
    // Geld
    spalten: { posten: '', woche: 'Letzte Woche', vorwoche: 'Vorwoche' },
    einnahmen: 'Einnahmen', ausgaben: 'Ausgaben', summe: 'Summe', ergebnis: 'Ergebnis',
    kaffeeTassen: 'Kirchkaffee: verkaufte Tassen', kaffeeGewinn: 'Kirchkaffee: Gewinn',
    heute: 'Heute früh eingegangen (zählt schon zur neuen Woche)',
    heuteDauerspende: 'Dauerspenden', heuteMitglied: 'Mitgliedsbeiträge',
    keine: 'keine',
    // Veranstaltungen
    vSpalten: { tag: 'Tag', was: 'Veranstaltung', besucher: 'Besucher', geld: 'Geld', haltung: 'Haltung', bekanntheit: 'Bekanntheit' },
    ausgefallen: grund => `Ausgefallen${grund ? ` – ${grund}` : ''}`,
    keineVeranstaltungen: 'Letzte Woche gab es keine Veranstaltungen.',
    // Gemeinde
    neueMitglieder: 'Neue Gemeindemitglieder', ehemaligeMitglieder: 'Nicht mehr Mitglied',
    neueSpender: 'Neue Dauerspender', ehemaligeSpender: 'Keine Dauerspender mehr',
    aufgestiegen: 'Im Haltungslevel aufgestiegen', abgestiegen: 'Im Haltungslevel abgestiegen',
    levelWechsel: (name, vorher, jetzt) => `${name} (Level ${vorher} → ${jetzt})`,
    unbekannt: 'Unbekannt',
    keineAenderung: 'Diese Woche hat sich in der Gemeinde nichts verändert.',
    // Bekanntheit & Heiligkeit
    wSpalten: { wert: '', start: 'Montag vor einer Woche', ende: 'Jetzt', aenderung: 'Veränderung' },
    // Monatsblick
    monatZeilen: { anzahl: 'Mitglieder', beitrag: 'Beitrag pro Mitglied', summe: 'Zusammen', vormonat: 'Vormonat' },
    monate: ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']
  },

  // ---- Texte, die bis 26.11. direkt im Code standen (index.html, fenster.js, anzeigen.js, zeichnen.js) – Wortlaut unverändert ----
  // Feste Beschriftungen der Seite (in index.html über data-text="seite.…" eingesetzt)
  seite: {
    mitarbeiter: 'Mitarbeiter',
    hauptamtliche: 'Hauptamtliche',
    ehrenamtliche: 'Ehrenamtliche',
    verfuegbar: 'verfügbar',
    finanzen: 'Finanzen',
    einnahmenVoraus: 'Voraussichtliche Einnahmen',
    ausgabenVoraus: 'Voraussichtliche Ausgaben',
    besucher: 'Besucher',
    bauen: 'Bauen',
    rueckgaengig: 'Rückgängig',
    neu: 'Neu',
    neuSicher: 'Wirklich leeren?',
    fertig: 'Fertig',
    keineHauptamtlichen: 'Noch keine Hauptamtlichen',
    keineEhrenamtlichen: 'Noch keine Ehrenamtlichen'
  },
  // Fenster „Raumfunktion“ im Editor
  raumFunktion: {
    titel: 'Raumfunktion',
    keineTuer: 'Dieser Raum hat noch keine Tür.',
    entfernen: 'Funktion entfernen',
    mind: groesse => `mind. ${groesse}`,
    zuKlein: groesse => `zu klein, mind. ${groesse}`
  },
  // Beschriftung der Räume auf der Karte
  raumAufKarte: {
    ohneFunktion: 'Ohne Funktion',
    keineVeranstaltung: 'Keine Veranstaltung',
    probleme: { tuer: 'Tür fehlt', verbindung: 'Verbindungstür zum Gottesdienstraum fehlt' },
    zuKlein: (b, h) => `zu klein (mind. ${b} × ${h})`
  },
  // Charakter-Karte eines Mitarbeiters
  personKarte: {
    art: { hauptamt: 'Hauptamtlich', ehrenamt: 'Ehrenamtlich' },
    imEinsatz: wo => 'Im Einsatz: ' + wo,
    verfuegbar: 'Verfügbar',
    skills: 'Skills',
    skillsSpaeter: 'Skills folgen später'
  },
  keineVeranstaltung: 'Keine',   // Auswahl im Raum-Fenster und Kalender (stand bis 26.11. als KEINE_VERANSTALTUNG in veranstaltungen.js)

  // ---- Menü „Mitarbeiter“: Dienstplan der Ehrenamtlichen (27.11.) – ENTWURF von Claude, Lukas formuliert selbst ----
  // Aufbau (Kalender, Ziehen und Klicken) von Lukas mit „das sieht super aus“ freigegeben; die Texte sind noch Entwürfe.
  dienstplan: {
    knopf: 'Dienstplan',
    titel: 'Mitarbeiter',
    tab: { ehrenamt: 'Ehrenamt', hauptamt: 'Hauptamt' },   // Tab-Namen von Lukas (27.11.)
    schritt1: '1. Ehrenamtlichen anklicken oder mit gedrückter Maustaste auf eine Stelle ziehen',
    schritt1HA: '1. Hauptamtlichen anklicken oder mit gedrückter Maustaste auf eine Stelle ziehen',   // ENTWURF 27.11.
    schritt2: '2. Freie Stelle anklicken (Klick auf einen Namen nimmt ihn wieder heraus)',
    info: 'Ohne Schicht sind Ehrenamtliche daheim. Sonntagvormittags kommen sie mit 90 % in den Gottesdienst.',
    schichten: (belegt, max) => `${belegt}/${max}`,
    infoHA: 'Ohne Schicht bleiben Hauptamtliche auf dem Gelände. Die Leitung eines Fests zählt nicht als Schicht.',   // ENTWURF 27.11.
    keineEA: 'Noch keine Ehrenamtlichen.',
    keineHA: 'Noch keine Hauptamtlichen.',   // ENTWURF 27.11.
    frei: n => `${n} frei`,
    voll: 'voll',
    keinTermin: 'Kein Termin',
    // ENTWÜRFE von Claude (27.11.) – Lukas formuliert sie noch
    meineDienste: name => `Dienste von ${name}:`,
    keineDienste: name => `${name} hat diese Woche noch keinen Dienst.`,
    daheim: 'daheim',
    termin: { kaffeeNach: 'Kirchkaffee danach', kaffee: 'Kirchkaffee-Schicht', logistik: 'Logistik · Lager', evangelisation: 'Evangelisation', buero: 'Büro' },   // „Büro“: ENTWURF 27.11.
    stelle: {
      musik: ding => ding,                     // Name des Instruments, z. B. „Gitarre“
      leitung: () => 'Leitung',
      leitungHA: () => 'Leitung',              // Leitung durch einen Hauptamtlichen (27.11.)
      chorleitung: () => 'Chorleitung · Klavier',
      mitarbeit: (_, n) => `Mitarbeit ${n}`,
      begruessung: (_, n, raum) => raum ? `Begrüßung · ${raum}` : 'Begrüßung',
      theke: (_, n) => `Theke ${n}`,
      regal: (_, n) => `Regal ${n}`,
      schreibtisch: () => 'Schreibtisch',   // Büro: ENTWURF 27.11.
      ton: () => 'Tontechnik',   // Ton-Technik (27.11.): Text von Claude
      evangelisation: (_, n) => `Platz ${n}`
    },
    fehler: {
      doppelt: name => `${name} hat bei diesem Termin schon eine Stelle.`,
      voll: name => `${name} hat schon alle Schichten dieser Woche.`,
      zeit: name => `${name} arbeitet zu dieser Zeit schon bei einem anderen Termin.`,
      person: (_, art) => art === 'hauptamt' ? 'Diese Stelle ist nur für Ehrenamtliche.' : 'Diese Stelle ist nur für Hauptamtliche.',   // ENTWURF 27.11.
      leitet: name => `${name} kann diese Veranstaltung nicht leiten.`,   // Jugendpastor – von Lukas freigegeben 27.11.
      keine: () => 'Diese Stelle gibt es nicht mehr.',
      auswahl: tab => tab === 'hauptamt' ? 'Wähle zuerst einen Hauptamtlichen aus.' : 'Wähle zuerst einen Ehrenamtlichen aus.',   // HA: ENTWURF 27.11.
      schulung: name => `${name} ist gerade auf Schulung.`   // Schulungen (27.11.): Text von Claude
    },
    // Schulungen (27.11.) – Texte von Claude (Lukas: „texte können von dir sein“)
    aufSchulung: 'auf Schulung',
    schulung: {
      titel: 'Schulungen',
      gesperrt: 'Schulungen schaltest du über die Forschung „Schulungen 1“ frei.',
      info: 'Auf Schulung geht nur, wer keine Schicht im Dienstplan hat. Solange die Schulung läuft, ist er weg und kommt auch nicht in den Gottesdienst.',
      laeuft: (name, stufe) => `Auf Schulung: ${name} (Stufe ${stufe})`,
      bis: (tag, uhr) => `zurück am ${tag} um ${uhr}`,
      stufe: (n, max) => `Stufe ${n} von ${max}`,
      wirkung: w => [w.skill === 'musik' ? `Musik +${w.level} Level` : w.skill === 'evangelisation' ? `Evangelisation +${w.level} Level` : null,
        w.schichten ? `+${w.schichten} ${w.schichten === 1 ? 'Schicht' : 'Schichten'} pro Woche` : null].filter(Boolean).join(' · '),
      kosten: (geld, heiligkeit) => heiligkeit ? `${geld} € und ${heiligkeit} Heiligkeit` : `${geld} €`,
      dauer: tage => tage % 7 === 0 ? `${tage / 7} ${tage === 7 ? 'Woche' : 'Wochen'}` : `${tage} ${tage === 1 ? 'Tag' : 'Tage'}`,
      schicken: 'Auf Schulung schicken',
      abbrechen: 'Schulung abbrechen',
      abbrechenFrage: 'Wirklich abbrechen? Geld und Heiligkeit sind dann weg, die Stufe zählt nicht.',
      abbrechenJa: 'Ja, abbrechen',
      abbrechenNein: 'Weiter schulen',
      zustand: {
        alle: 'Alle Stufen gemacht',
        forschung: 'Noch nicht erforscht',
        max: 'Schon auf dem höchsten Level',
        schichten: 'Erst alle Schichten austragen',
        weg: 'Ist gerade auf Schulung',
        geld: 'Zu wenig Geld',
        heiligkeit: 'Zu wenig Heiligkeit',
        beides: 'Zu wenig Geld und Heiligkeit',
        schichtbetrieb: 'Nur mit Dienstplan',
        person: 'Nur für Ehrenamtliche',
        keine: 'Diese Schulung gibt es nicht'
      }
    }
  },
  // Schichtbetrieb (27.11.) – ENTWÜRFE von Claude: geänderte Texte, wo Ehrenamtliche über den Dienstplan kommen
  schichtbetrieb: {
    kaffeeInfo: 'Das Kirchkaffee öffnet nach dem Gottesdienst für 2h und zu den Öffnungszeiten, die du hier festlegst. Bedient wird nur, wenn im Dienstplan Ehrenamtliche eingeteilt sind.',
    evangelisationInfo: 'Ehrenamtliche, die im Dienstplan für die Evangelisation eingeteilt sind, stehen hier und sprechen Passanten an. Je höher ihr Evangelisation-Level, desto eher kommen die Leute zum nächsten Gottesdienst.',
    daheim: x => `Gerade daheim: ${x}`,
    seiteEA: (einsatz, daheim, belegt, max, schulung) => `${einsatz || (schulung ? 'auf Schulung' : daheim ? 'daheim' : 'unterwegs')} · ${belegt}/${max} Schichten`   // „auf Schulung“: 27.11.
  }
};
