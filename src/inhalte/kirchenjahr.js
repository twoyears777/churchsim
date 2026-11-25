// Inhaltsdatei: Kirchenjahr (evangelische Namen der Sonntage).
// Das Spiel beginnt am 1. Advent. Das Jahr wird nicht angezeigt; intern rechnen wir ab 2026,
// weil Ostern und damit viele Sonntage jedes Jahr anders fallen.
export const START = { jahr: 2026, monat: 11, tag: 29 };

// Sonntage, die von Ostern abhängen: Abstand zu Ostern in Wochen
export const UM_OSTERN = {
  '-9': 'Septuagesimä', '-8': 'Sexagesimä', '-7': 'Estomihi', '-6': 'Invokavit', '-5': 'Reminiszere',
  '-4': 'Okuli', '-3': 'Lätare', '-2': 'Judika', '-1': 'Palmsonntag', '0': 'Ostersonntag',
  '1': 'Quasimodogeniti', '2': 'Miserikordias Domini', '3': 'Jubilate', '4': 'Kantate', '5': 'Rogate',
  '6': 'Exaudi', '7': 'Pfingstsonntag', '8': 'Trinitatis'
};

export const NAMEN = {
  advent: n => `${n}. Advent`,
  christfest1: 'Christfest I', christfest2: 'Christfest II',
  nachChristfest: n => `${n}. Sonntag nach dem Christfest`,
  neujahr: 'Neujahr', epiphanias: 'Epiphanias',
  nachEpiphanias: n => `${n}. Sonntag nach Epiphanias`, letzterNachEpiphanias: 'Letzter Sonntag nach Epiphanias',
  nachTrinitatis: n => `${n}. Sonntag nach Trinitatis`,
  drittletzter: 'Drittletzter Sonntag des Kirchenjahres', vorletzter: 'Vorletzter Sonntag des Kirchenjahres',
  ewigkeit: 'Ewigkeitssonntag'
};
