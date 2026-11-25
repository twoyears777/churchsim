// Inhaltsdatei: sichtbare Texte, die mit 0.1.2 neu dazugekommen sind.
// ENTWÜRFE von Claude – Lukas formuliert sie selbst, seine Fassung wird hier übernommen.
export const TEXTE = {
  // Zeitanzeige oben
  tage: ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'],
  tageKurz: ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'],
  zeitAnzeige: (woche, tag, uhr) => `Woche ${woche} · ${tag} ${uhr}`,
  countdown: tage => tage === null ? 'Heute ist Sonntag' : tage === 0 ? 'Morgen ist Sonntag' : `Nächster Sonntag in ${tage} ${tage === 1 ? 'Tag' : 'Tagen'}`,
  tempo: { 0: 'Pause', 1: 'x1', 2: 'x2', 5: 'x5' },
  kontostand: 'Kontostand',
  bekanntheit: 'Bekanntheit',

  // Zurücksetzen (Test-Werkzeug)
  zuruecksetzen: 'Spiel auf Start zurücksetzen',
  zuruecksetzenSicher: 'Wirklich zurücksetzen?',
  // Geld geben (Test-Werkzeug) – ENTWURF, Lukas formuliert selbst
  testGeld: '+ Geld',
  testGeldFeld: 'Betrag in €',

  // Hinweis unten rechts, während etwas läuft
  laeuft: {
    anreise: 'Die Besucher kommen zum Gottesdienst.',
    gottesdienst: 'Gottesdienst läuft.',
    kirchkaffee: 'Kirchkaffee läuft.'
  },
  heimgeschickt: n => `${n} ${n === 1 ? 'Besucher musste' : 'Besucher mussten'} wieder heim – kein Stuhl frei.`,
  ausgefallen: 'Der Gottesdienst ist ausgefallen – kein Mitarbeiter im Raum.',
  fehltRaum: 'Für den Gottesdienst fehlt ein fertiger Gottesdienstraum.',
  fehltVeranstaltung: 'Im Gottesdienstraum ist noch kein Gottesdienst eingestellt (Raum anklicken).',
  fehltLeitung: 'Für den Gottesdienst fehlt der Pastor im Gottesdienstraum.',

  // Seitenleiste „Besucher“
  besucherLetzter: 'Letzter Gottesdienst',
  besucherHeim: 'Heimgeschickt (kein Stuhl)',
  besucherStamm: 'Bekannte Besucher',

  // Raum-Fenster Gottesdienstraum
  raum: {
    veranstaltung: 'Veranstaltung',
    wochenplan: 'Wochenplan',
    wochenplanInfo: 'Wann findet der Gottesdienst statt? Er dauert 1 Stunde, danach 1 Stunde Kirchkaffee.',
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
    prognoseFaelltAus: 'Ohne Mitarbeiter im Raum fällt der Gottesdienst aus.',
    ca: wert => `ca. ${wert}`
  },
  // Kacheln der Veranstaltungen: was sie bringen und welche Bedingungen sie haben
  veranstaltungKacheln: {
    gottesdienst: {
      bringt: ['Kollekte: 1 € pro Besucher', 'Zufriedenheit der Besucher', 'Bekanntheit der Gemeinde'],
      bedingungen: [{ text: 'Pastor im Raum', bedingung: 'leitung' }, 'Stühle = Sitzplätze',
        { text: 'Für Musik: Gitarre im Raum', bedingung: 'gitarre' }]   // bedingung: wird im Fenster grün/rot markiert
    },
    keine: { bringt: ['Nichts'], bedingungen: ['Stammgäste werden unzufrieden'] }
  },
  bringt: 'Bringt',
  bedingungen: 'Bedingungen',

  // Kaffeemaschine
  maschine: {
    titel: 'Kaffeemaschine',
    fuellstand: (n, max) => `Füllstand: ${n} von ${max} Tassen`,
    nachkaufen: (preis, tassen) => `Kaffee nachkaufen (${preis} € für ${tassen} Tassen)`,
    voll: 'Die Maschine ist zu voll zum Nachfüllen.',
    keinGeld: 'Nicht genug Geld.',
    leer: 'Leer – es wird kein Kaffee verkauft.',
    nichtImKaffee: 'Steht nicht im Kirchkaffee – hier wird kein Kaffee verkauft.'
  },
  // Kirchkaffee-Raum: Zustand unter dem Raumnamen
  kirchkaffee: {
    offen: 'Geöffnet',
    keinEhrenamt: 'Geschlossen – kein Ehrenamtlicher',
    keineMaschine: 'Geschlossen – keine Kaffeemaschine',
    keineTheke: 'Geschlossen – keine Theke'
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
    neugierig: 'Neugierig – kommt vielleicht zum nächsten Gottesdienst'
  },

  // ---- Menschen, Passanten, Seelsorge (Entwürfe von Claude, von Lukas vorerst so übernommen, 25.11.) ----
  // Fenster „Menschen im Ort“
  menschen: {
    knopf: 'Menschen',
    titel: 'Menschen im Ort',
    spalten: { name: 'Name', haltung: 'Haltung', besuche: 'Besuche', zuletzt: 'Zuletzt da', kaffee: 'Kaffee', status: 'Status' },
    ja: 'ja', nein: 'nein', unbekannt: '–',
    woche: n => `Woche ${n}`,
    leer: 'Noch niemand bekannt.',
    status: { passant: 'Passant', neugierig: 'Neugierig', besucher: 'Besucher', stammgast: 'Stammgast', ehrenamtlich: 'Ehrenamtlich' }
  },
  // Meldung unten rechts
  meldung: { neugierig: name => `${name} ist am Tor stehen geblieben und schaut neugierig herein.` },

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
      bekanntheit: n => `Bekanntheit ${n > 0 ? '+' : '−'}${Math.abs(n)}`,
      spende: euro => `Spende +${euro}`,
      kosten: euro => `Kosten −${euro}`,
      neugierig: 'jetzt neugierig auf die Gemeinde'
    },
    neueStufe: n => `Pastor Harder ist jetzt Seelsorger Stufe ${n}.`,
    // Charakter-Karte des Pastors
    karte: {
      titel: n => `Seelsorge – Stufe ${n}`,
      fortschritt: (x, y, n) => `${x} von ${y} Punkten bis Stufe ${n}`,
      hoechste: 'Höchste Stufe erreicht'
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
    stuhl: 'Tippe, um einen Stuhl aufzustellen – oder auf einen Stuhl, um ihn zu verbessern.',
    kaffeemaschine: 'Tippe, um eine Kaffeemaschine aufzustellen (fürs Kirchkaffee).',
    theke: 'Tippe, um ein Thekenteil aufzustellen (fürs Kirchkaffee).',
    // ---- Ausstattung des Gottesdienstraums (Entwürfe von Claude, von Lukas vorerst so übernommen, 25.11.) ----
    kanzel: 'Tippe, um eine Kanzel aufzustellen (Gottesdienstraum, 1 pro Raum).',
    altar: 'Tippe, um einen Altar aufzustellen (Gottesdienstraum, 1 pro Raum).',
    blumen: 'Tippe, um Blumen aufzustellen (Gottesdienstraum, bis 4 pro Raum).',
    gruenpflanze: 'Tippe, um eine Grünpflanze aufzustellen (Gottesdienstraum, bis 4 pro Raum).',
    gitarre: 'Tippe, um eine Gitarre aufzustellen (Gottesdienstraum, 1 pro Raum) – dann macht ein Ehrenamtlicher im Raum Musik.'
  },
  // Kauf gesperrt, weil schon genug davon im Raum steht
  grenze: {
    kanzel: 'In diesem Raum steht schon eine Kanzel.',
    altar: 'In diesem Raum steht schon ein Altar.',
    blumen: 'In diesem Raum stehen schon 4 Blumen.',
    gruenpflanze: 'In diesem Raum stehen schon 4 Grünpflanzen.',
    gitarre: 'In diesem Raum steht schon eine Gitarre.'
  },
  // Menü eines Stuhls (im Editor auf einen Stuhl tippen)
  stuhl: {
    stufe: (n, max) => `Stufe ${n} von ${max}`,
    wirkung: (haltung, kollekte) => `Haltung +${haltung} pro Gottesdienst · Kollekte ×${kollekte}`,
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
    musik: f => `Musik: Kollekte ×${f}`,
    musiker: 'Musiker',
    ohneGitarre: 'ohne Gitarre keine Musik'
  },
  nichtGenugGeld: (name, preis) => `Nicht genug Geld für ${name} (${preis}).`
};
