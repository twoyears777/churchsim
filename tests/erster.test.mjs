// Prüft den ersten Gottesdienst (Lukas, 26.11.2026): Zeitungsartikel am Tag vorher um 8:00 (Zeit steht, bis weitergeklickt),
// +10 Leute fest beim ersten normalen Gottesdienst, der stattfindet, danach mindestens 1 neuer Ehrenamtlicher (mit der Frau des Pastors 2).
// Fällt er aus, gilt der nächste. Alte Spielstände mit Besuchen bekommen nichts.
// Starten mit: node tests/erster.test.mjs
import assert from 'node:assert';
import { GRUNDSTUECK as G } from '../src/inhalte/umgebung.js';
import { ERSTER_GOTTESDIENST } from '../src/inhalte/besucher.js';
import { TEXTE } from '../src/inhalte/texte.js';
import { wandRechteck, tuerUmschalten, erkenneRaeume, raumTypVon, pruefeRaum, typZuweisen } from '../src/kern/karte.js';
import { neuesSpiel, spielStarten, SPEICHER_VERSION } from '../src/kern/spiel.js';
import { zeitVorruecken, veranstaltungEinstellen, prognose } from '../src/kern/ablauf.js';
import { wochenberichtOffen, wochenberichtSchliessen } from '../src/kern/wochenbericht.js';
import { moebelSetzen } from '../src/kern/moebel.js';
import { versetzen } from '../src/kern/personen.js';
import { ersterAnlegen, zeitungOffen, zeitungSchliessen } from '../src/kern/erster.js';
import { TAG_MIN, WOCHE_MIN, zeitpunkt } from '../src/kern/zeit.js';

assert.deepEqual(ERSTER_GOTTESDIENST, { neueLeute: 10, ehrenamt: 1, zeitungTageVorher: 1, zeitungStunde: 8 });
assert.equal(TEXTE.zeitung.schlagzeile, 'Eine neue Gemeinde macht auf!');
assert.equal(TEXTE.zeitung.text, 'Ist es eine Sekte oder eine Brutstätte geistlichen Lebens bei uns im Ort?');

const aus = z => { const { raeume, gruppe } = erkenneRaeume(z); for (const r of raeume) { r.typ = raumTypVon(z, r); r.probleme = pruefeRaum(z, r, r.typ); } return { liste: raeume, gruppe }; };
const raumBei = z => { const a = aus(z); return a.liste[a.gruppe[G.x + 5 + (G.y + 5) * z.w]]; };
const SA = 5 * TAG_MIN, SO = 6 * TAG_MIN;
const ea = z => z.personen.filter(p => p.daten && p.daten.art === 'ehrenamt').length;

// Neues Spiel mit Gottesdienstraum (20 Stühle), Pastor im Raum, Gottesdienst Sonntag vormittags
function gemeinde(pastor = true) {
  const z = neuesSpiel(() => 0.5);
  wandRechteck(z, G.x + 2, G.y + 2, G.x + 18, G.y + 8); tuerUmschalten(z, G.x + 2, G.y + 5);
  typZuweisen(z, raumBei(z), 'gottesdienst');
  moebelSetzen(z, 'stuhl', G.x + 6, G.y + 3, G.x + 15, G.y + 4);
  if (pastor) versetzen(z, z.personen[0], G.x + 4, G.y + 5);
  veranstaltungEinstellen(z, raumBei(z), 'gottesdienst');
  z.ortRuhig = true; z.konto = 1000;
  return z;
}
// In kleinen Schritten bis zur Zielzeit (bleibt stehen, wenn die Zeitung aufgeht)
function bis(z, ziel, zufall = () => 0.5) {
  for (let i = 0; i < 2000 && z.minuten < ziel; i++) {
    if (wochenberichtOffen(z)) wochenberichtSchliessen(z);   // Wochenzusammenfassung (27.11.) wegklicken – sie prüft tests/wochenbericht.test.mjs
    const vor = z.minuten; zeitVorruecken(z, aus(z), Math.min(30, ziel - z.minuten), zufall); if (z.minuten === vor && !wochenberichtOffen(z)) break;
  }
}

// Zeitung am Samstag 8:00, Zeit steht, danach +10 Leute und 1 neuer Ehrenamtlicher
{
  const z = gemeinde();
  ersterAnlegen(z);
  assert.deepEqual(z.erster, { erledigt: false, zeitung: false, offen: false });
  assert.equal(ea(z), 1);                                         // Frau des Pastors
  const vorher = prognose(z, aus(z)).erwartet;
  assert.ok(vorher >= ERSTER_GOTTESDIENST.neueLeute);             // Prognose rechnet die 10 mit ein
  bis(z, SA + 12 * 60);
  assert.equal(zeitungOffen(z), true);
  assert.equal(z.minuten, SA + 8 * 60);                           // genau Samstag 8:00
  zeitVorruecken(z, aus(z), 60);
  assert.equal(z.minuten, SA + 8 * 60);                           // Zeit steht
  // Über die Schalterwand (gespeicherter Spielstand): Zeitung offen, tick bewegt nichts, „Weiter“ schließt sie
  const spiel = spielStarten(JSON.stringify({ version: SPEICHER_VERSION, zustand: z }), () => 0.5);
  assert.equal(spiel.lage().zeitung, true);
  assert.equal(spiel.tick(1), false);
  spiel.zeitungWeiter();
  assert.equal(spiel.lage().zeitung, false);
  assert.equal(JSON.parse(spiel.speicherText()).zustand.erster.offen, false);
  zeitungSchliessen(z);
  const stamm = z.besucher.length;
  bis(z, SO + 23 * 60);
  const lauf = z.besucher.filter(b => b.besuche === 1).length;
  assert.ok(z.besucher.length + ea(z) - 1 >= stamm + ERSTER_GOTTESDIENST.neueLeute, 'mindestens 10 neue Menschen');
  assert.ok(lauf + 1 >= ERSTER_GOTTESDIENST.neueLeute, 'die Neuen waren da');
  assert.equal(ea(z), 2);                                         // Frau des Pastors + 1
  assert.equal(z.erster.erledigt, true);
  assert.equal(zeitungOffen(z), false);
  // Nächste Woche: keine Zeitung, keine zusätzlichen Leute, kein sicherer Ehrenamtlicher
  const anzahl = z.besucher.length;
  bis(z, WOCHE_MIN + SO + 23 * 60);
  assert.equal(zeitungOffen(z), false);
  assert.ok(z.besucher.length < anzahl + ERSTER_GOTTESDIENST.neueLeute);
  assert.equal(ea(z), 2);
}
console.log('Erster Gottesdienst: Zeitung, +10 Leute, 1 Ehrenamtlicher bestanden.');

// Fällt der erste Gottesdienst aus (kein Pastor im Raum), gilt der nächste; die Zeitung kommt nur einmal
{
  const z = gemeinde(false);
  bis(z, SA + 12 * 60);
  assert.equal(zeitungOffen(z), true); zeitungSchliessen(z);
  bis(z, SO + 23 * 60);
  assert.equal(z.erster.erledigt, false);
  assert.equal(ea(z), 1);
  versetzen(z, z.personen[0], G.x + 4, G.y + 5);
  bis(z, WOCHE_MIN + SO + 23 * 60);
  assert.equal(z.erster.zeitung, true); assert.equal(zeitungOffen(z), false);   // keine zweite Zeitung
  assert.equal(z.erster.erledigt, true);
  assert.equal(ea(z), 2);
}
console.log('Ausgefallener erster Gottesdienst bestanden.');

// Alte Spielstände, in denen schon jemand da war: kein Bonus, keine Zeitung
{
  const z = gemeinde();
  z.besucher[0].besuche = 3;
  ersterAnlegen(z);
  assert.deepEqual(z.erster, { erledigt: true, zeitung: true, offen: false });
  bis(z, SO + 23 * 60);
  assert.equal(zeitpunkt(z.minuten).tag, 6);
  assert.equal(zeitungOffen(z), false);
}
console.log('Alte Spielstände bestanden.');
