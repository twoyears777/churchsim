// Inhaltsdatei: Hilfe-Bereich (Anleitung im Spiel). ENTWÜRFE von Claude (25.11.) – Lukas formuliert sie selbst,
// seine Fassung wird hier übernommen. Neue Themen einfach als weiteren Eintrag in `themen` ergänzen.
//
// Aufbau eines Themas: titel + inhalt. Im Inhalt ist jeder Eintrag entweder
//   - ein Text (wird ein Absatz) oder
//   - { punkte: [ … ] } (wird eine Aufzählung).
// **so** wird fett gedruckt.
// Ein paar Zahlen (Raumgrößen, Besuche bis zum Ehrenamt) kommen direkt aus den Spielwerten, damit die Hilfe nicht veraltet.
import { GELAENDE, SCHAUKASTEN } from './gelaende.js';
import { RAUMTYPEN } from './raumtypen.js';
import { EHRENAMT_AB_BESUCHEN } from './besucher.js';
import { EINZUGSGEBIET, PARKPLATZ } from './einzugsgebiet.js';

const groesse = id => RAUMTYPEN.find(t => t.id === id).minGroesse.join(' × ');

export const HILFE = {
  knopf: 'Hilfe',
  titel: 'Hilfe',
  info: 'Wähle ein Thema. Solange die Hilfe offen ist, steht die Zeit.',
  zurueck: 'Zurück',
  themen: [
    {
      id: 'start',
      titel: 'Worum es geht',
      inhalt: [
        'Du bist Gemeindemanager und baust eine Gemeinde von null auf. Du baust Räume, stellst Möbel auf, setzt Mitarbeiter ein und planst Veranstaltungen. Je zufriedener die Besucher sind, desto öfter kommen sie wieder, und je bekannter die Gemeinde ist, desto mehr neue Leute kommen dazu.',
        '**Erste Schritte:** Klicke unten auf „Bauen“. Baue einen Gottesdienstraum mit Tür, lege seine Funktion fest und stelle Stühle auf. Klicke auf „Fertig“, ziehe Pastor Harder in den Raum und stelle im Raum-Fenster einen Gottesdienst ein.'
      ]
    },
    {
      id: 'bauen',
      titel: 'Bauen',
      inhalt: [
        'Mit „Bauen“ öffnest du den Bau-Modus. Die Zeit ist dann angehalten. Unten siehst du die Bauleiste mit den Reitern Bauen, Gottesdienst, Kirchkaffee, Deko und Außen. Ein Klick auf ein Kärtchen wählt das Werkzeug.',
        { punkte: [
          '**Wand:** Zieh ein Rechteck – daraus werden die Wände eines Raums.',
          '**Tür:** Klicke auf eine Wand, um eine Tür zu setzen oder wieder zu entfernen. Jeder Raum braucht eine Tür.',
          '**Abriss:** Zieh über einen Bereich, um Wände und Möbel abzureißen. Möbel bekommst du voll erstattet.',
          '**Außen:** Straße, Parkplätze und Bushaltestelle (siehe „Einzugsgebiet“). Parkplätze dreht man mit R. Dazu Wege und Außendeko (siehe „Bekanntheit, Passanten und Pforte“).',   // Zusatz ENTWURF 25.11.
          'Unter der Maus zeigt ein grüner oder roter Umriss, ob ein Möbel dort passt.',
          '**Rückgängig** nimmt den letzten Schritt zurück, **Neu** fängt das Grundstück neu an.',
          'Gebaut werden kann nur auf dem eigenen Grundstück.'
        ] }
      ]
    },
    {
      id: 'raeume',
      titel: 'Räume',
      inhalt: [
        'Mit „Raum festlegen“ klickst du in einen fertigen Raum und gibst ihm eine Funktion.',
        { punkte: [
          `**Gottesdienstraum** (mindestens ${groesse('gottesdienst')} Kästchen): Hier finden Gottesdienste und Lobpreisgottesdienste statt.`,
          `**Kirchkaffee** (mindestens ${groesse('kirchkaffee')} Kästchen): braucht eine Verbindungstür zu einem Gottesdienstraum. Nach dem Gottesdienst und zu eigenen Öffnungszeiten gibt es hier Kaffee.`
        ] }
      ]
    },
    {
      id: 'moebel',
      titel: 'Möbel und Ausstattung',
      inhalt: [
        'Möbel kosten sofort Geld. Jedes Möbel belegt ein Kästchen.',
        { punkte: [
          '**Stühle** sind die Sitzplätze. Wer keinen Stuhl findet, muss wieder heim. Klicke auf einen Stuhl, um ihn zu verbessern (Holzstuhl → Polsterstuhl → Komfortstuhl → Ehrenstuhl). Bessere Stühle bringen mehr Haltung und mehr Kollekte.',
          '**Kanzel** und **Altar** (je 1 pro Raum): verbessern den Gottesdienst und schalten gemeinsam eine zweite Veranstaltung im Raum frei.',
          '**Blumen** und **Grünpflanzen** (bis zu 4 pro Raum): mehr Haltung bzw. mehr Kollekte.',
          '**Instrumente** (Gitarre, Keyboard, Schlagzeug, Bass, E-Gitarre, Mikrofon; je 1 pro Raum): Jedes Instrument braucht einen eigenen Ehrenamtlichen, der es spielt. Jeder Musiker erhöht den Bonus des Lobpreisteams. Für den Lobpreisgottesdienst ist die Gitarre Pflicht.',   // ENTWURF von Claude (25.11.)
          '**Kaffeemaschine**, **Theke** und **Tisch**: für das Kirchkaffee.'
        ] }
      ]
    },
    {
      id: 'mitarbeiter',
      titel: 'Mitarbeiter',
      inhalt: [
        'Links siehst du deine Mitarbeiter. Zieh eine Figur mit der Maus in einen Raum, um sie dort einzusetzen. Klick auf eine Figur zeigt ihre Karte.',
        { punkte: [
          '**Hauptamtliche** (blau), z. B. Pastor Harder, leiten die Veranstaltungen.',
          '**Ehrenamtliche** (orange) machen im Gottesdienstraum Musik (ein Ehrenamtlicher pro Instrument) oder öffnen das Kirchkaffee.',
          `Wer oft kommt, wird mit der Zeit selbst Ehrenamtlicher (ab ${EHRENAMT_AB_BESUCHEN} Besuchen).`
        ] }
      ]
    },
    {
      id: 'veranstaltungen',
      titel: 'Veranstaltungen und Wochenplan',
      inhalt: [
        'Klicke in der Spielansicht auf einen Gottesdienstraum. Dort stellst du ein, welche Veranstaltung stattfindet und wann (Wochentag, vormittags, nachmittags oder abends).',
        { punkte: [
          '**Gottesdienst:** braucht den Pastor im Raum. Bringt Kollekte, Zufriedenheit und Bekanntheit.',
          '**Lobpreisgottesdienst:** braucht einen Hauptamtlichen und eine Gitarre. Wie gut er ankommt, hängt davon ab, wie sehr jemand Lobpreis mag.',
          '**Konfirmandenunterricht:** Im Gemeindesaal möglich, braucht einen Hauptamtlichen und Stühle. Nur Jugendliche kommen. Jeder Ehrenamtliche im Raum bringt mehr Haltung. Wer 7-mal da war, wird am 2. Sonntag im Mai konfirmiert.',   // von Lukas freigegeben (25.11.)
          '**Sonntagvormittag** gibt es doppelte Kollekte.',
          'Sobald Kanzel und Altar im Raum stehen, kannst du eine **zweite Veranstaltung** einstellen.',
          'Fehlt etwas, fällt die Veranstaltung aus – das macht Stammgäste unzufrieden. Das Raum-Fenster zeigt dir rot, was fehlt, und eine Prognose für die Woche.'
        ] }
      ]
    },
    {
      id: 'kirchkaffee',
      titel: 'Kirchkaffee',
      inhalt: [
        'Nach jedem Gottesdienst hat das Kirchkaffee 2 Stunden offen. Klick auf den Raum, um bis zu 3 weitere Öffnungszeiten pro Woche festzulegen. Geöffnet ist es nur mit Kaffeemaschine, Theke und einem Ehrenamtlichen im Raum. Die Kunden stellen sich an der Theke an; jede Tasse bringt 1 €. Mehr Theken bedeuten kürzere Schlangen. Wenn das Kirchkaffee zu hat, kauft der Ehrenamtliche im Laden Kaffee nach. Wer Kaffee will und keinen bekommt, ist enttäuscht.',
        'Stell Stühle und Tische ins Kirchkaffee: Die Hälfte der Kunden setzt sich nach dem Kaffee hin und gibt beim Gehen Trinkgeld. Bessere Stühle und ein Tisch daneben erhöhen es.'
      ]
    },
    {
      id: 'besucher',
      titel: 'Besucher und Haltung',
      inhalt: [
        'Jeder Besucher hat eine **Haltung** zur Gemeinde. Je höher sie ist, desto wahrscheinlicher kommt er wieder.',
        { punkte: [
          'Mehr Haltung: Sitzplatz, guter Gottesdienst, Kaffee, gute Möbel, gute Seelsorge.',
          'Weniger Haltung: kein Stuhl frei, kein Kaffee, ausgefallene Veranstaltung.',
          'Klick auf eine Figur zeigt ihr Kärtchen mit Haltung und Bedürfnissen. Unter „Menschen“ oben siehst du alle, die du kennst.'
        ] }
      ]
    },
    {
      id: 'bekanntheit',
      titel: 'Bekanntheit, Passanten und Pforte',
      inhalt: [
        'Die **Bekanntheit** (oben) wächst durch Gottesdienste, sehr zufriedene Besucher und gute Seelsorge. Sie bestimmt, wie viele neue Besucher pro Woche kommen. Klick auf die Bekanntheit zeigt, woher sie kommt und wie sie sich entwickelt.',
        'Vor dem Grundstück laufen **Passanten** vorbei. Manche bleiben am Tor stehen und werden neugierig – dann kommen sie vielleicht zur nächsten Veranstaltung. Klick auf die **Pforte**, um ein Plakat aufzuhängen: Dann bleiben Passanten öfter stehen.',
        // ENTWURF von Claude (Wege und Außendeko, 25.11.) – Lukas formuliert selbst
        `**Gelände:** Wege und Außendeko (Busch, Hecke, Baum, Blumenbeet, Bank, Laterne, Schaukasten) unter Bauen → Außen machen das Gelände schöner. Jedes Stück bringt Punkte, höchstens ${GELAENDE.max}. Passanten werden um Gelände ÷ 10 Prozentpunkte öfter neugierig.`,
        `**Schaukasten:** Klick in der Spielansicht auf einen Schaukasten und wähle eine regelmäßige Veranstaltung. Solange sie eingestellt ist, werden Passanten um ${Math.round(SCHAUKASTEN.neugier * 100)} Prozentpunkte öfter neugierig.`
      ]
    },
    {
      id: 'einzugsgebiet',
      titel: 'Einzugsgebiet',
      inhalt: [
        `Die Gemeinde kann nur so viele Menschen erreichen, wie ihr **Einzugsgebiet** hergibt – am Anfang ${EINZUGSGEBIET.start}. Mitgezählt werden Besucher, Passanten im Ort und Ehrenamtliche. Ist es voll, kommen keine neuen Menschen dazu. Den Stand siehst du im Bekanntheit-Fenster.`,
        { punkte: [
          `**Parkplätze** (ab Bekanntheit ${PARKPLATZ.abBekanntheit}): unter Bauen → Außen. Ein Parkplatz zählt nur, wenn er an einer Straße liegt, die bis zum Tor führt. Nicht angeschlossene Teile sind rot.`,
          '**Bushaltestelle:** am Gehweg neben dem Tor, in drei Stufen ausbaubar. Klick auf die Haltestelle oder über das Bekanntheit-Fenster.',
          '**Überregionale Werbekampagne:** einmal kaufen im Bekanntheit-Fenster, wirkt dauerhaft.'
        ] }
      ]
    },
    {
      id: 'seelsorge',
      titel: 'Seelsorge',
      inhalt: [
        'Ab und zu möchte jemand mit Pastor Harder sprechen. Die Zeit hält dann an. Nimmst du das Gespräch an, wählst du einen von drei Ratschlägen. Geht er gut aus, steigt die Haltung (manchmal auch Bekanntheit oder eine Spende), sonst sinkt sie. Ablehnen enttäuscht die Person.',
        'Mit jedem Gespräch sammelt der Pastor Erfahrung und steigt in der Seelsorge-Stufe. Je höher die Stufe, desto besser kann er einschätzen, welcher Rat passt.'
      ]
    },
    {
      id: 'finanzen',
      titel: 'Finanzen',
      inhalt: [
        'Links unter „Finanzen“ siehst du den Kontostand und was diese Woche voraussichtlich rein- und rausgeht.',
        { punkte: [
          '**Einnahmen:** Kollekte, Kirchkaffee, Spenden, Erstattung beim Abriss.',
          '**Ausgaben:** Möbel, Kaffee, Plakat, manche Seelsorge-Ratschläge, Maßnahmen fürs Einzugsgebiet.'
        ] }
      ]
    },
    {
      id: 'zeit',
      titel: 'Zeit und Kirchenjahr',
      inhalt: [
        'Oben steuerst du die Zeit: Pause, x1, x2, x5, x10, x25. Rechts oben stehen Woche, Tag und Uhrzeit, wie lange es bis Sonntag ist und welcher Sonntag im Kirchenjahr ansteht. Das Rad zeigt die Zeit im Kirchenjahr. Das Spiel beginnt am 1. Advent.',
        // ENTWURF (25.11., Kirchenjahr-Fenster) – Lukas formuliert selbst
        'Klickst du auf das Kirchenjahr, siehst du die kommenden Feste und Zeiten. An großen Festen wie Heiligabend kommen viel mehr Besucher, die Kollekte ist höher. Vor großen Festen öffnet sich das Fest-Menü: Dort planst du ein besonderes Fest mit Raum und Leitung. An Feiertagen sind mehr Leute unterwegs.'
      ]
    }
  ]
};
