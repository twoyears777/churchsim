// Prüft Büro, Orga-Tokens und den „Einladungsbrief für Konfis“ (Spielprinzip von Lukas, 27.11.2026:
// claude/spielprinzip-buero-orga-tokens.md). Starten mit: node tests/buero.test.mjs
import assert from 'node:assert';
import { GRUNDSTUECK as G } from '../src/inhalte/umgebung.js';
import { BUERO, BONI } from '../src/inhalte/buero.js';
import { wandRechteck, tuerUmschalten, erkenneRaeume, raumTypVon, pruefeRaum, typZuweisen } from '../src/kern/karte.js';
import { neuesSpiel as neuesSpielOhne } from './hilfen/ohne-erster.mjs';
import { spielStarten, SPEICHER_VERSION } from '../src/kern/spiel.js';
import { zeitVorruecken } from '../src/kern/ablauf.js';
import { moebelKaufen } from '../src/kern/moebel.js';
import { personHinzufuegen } from '../src/kern/personen.js';
import { dienstTermine, stelleSetzen } from '../src/kern/dienst.js';
import { bonusFreischalten, bonusAktiv, jugendlicheEinladen, konfiBriefVerbraucht } from '../src/kern/buero.js';
import { besuchChance, neuePerson } from '../src/kern/besucher.js';
import { jahrgangAm, istJugend } from '../src/kern/konfi.js';
import { einzugsgebiet } from '../src/kern/einzugsgebiet.js';
import { TAG_MIN, WOCHE_MIN, zeitpunkt } from '../src/kern/zeit.js';

const brief = BONI.find(b => b.id === 'einladungKonfi');
// Gemeinde mit Büro (innen 2 × 2, Tür) und Schreibtisch, dazu Ehrenamtliche
function gemeinde({ tisch = true, eas = 2 } = {}) {
  const z = neuesSpielOhne(() => 0.5);
  z.schichtbetrieb = true; z.ortRuhig = true; z.konto = 5000;
  const aus = () => { const { raeume, gruppe } = erkenneRaeume(z); for (const r of raeume) { r.typ = raumTypVon(z, r); r.probleme = pruefeRaum(z, r, r.typ); } return { liste: raeume, gruppe }; };
  const raumBei = (x, y) => { const a = aus(); return a.liste[a.gruppe[x + y * z.w]]; };
  wandRechteck(z, G.x + 2, G.y + 2, G.x + 5, G.y + 5); tuerUmschalten(z, G.x + 2, G.y + 3);   // innen 2 × 2
  typZuweisen(z, raumBei(G.x + 3, G.y + 3), 'buero');
  if (tisch) assert.equal(moebelKaufen(z, 'schreibtisch', G.x + 4, G.y + 3), 'ok');
  const ea = [];
  for (let i = 0; i < eas; i++) ea.push(personHinzufuegen(z, { name: `Helfer ${i + 1}`, kuerzel: 'H', art: 'ehrenamt' }));
  const block = (tag, slot) => dienstTermine(z, aus()).find(t => t.art === 'buero' && t.tag === tag && t.slot === slot);
  const buero = () => raumBei(G.x + 3, G.y + 3);
  return { z, aus, ea, block, buero };
}
const bis = (z, aus, minute) => { while (z.minuten < minute) zeitVorruecken(z, aus(), Math.min(5, minute - z.minuten), () => 0.5); };
const naechsteWoche = z => (zeitpunkt(z.minuten).woche + 1) * WOCHE_MIN;

// Raum: Büro ab 2 × 2 mit Tür ist fertig; Schreibtisch 50 €, Farbe orange
{
  const { z, buero } = gemeinde();
  assert.equal(buero().typ.id, 'buero');
  assert.deepEqual(buero().probleme, []);
  assert.equal(z.moebel.filter(m => m.art === 'schreibtisch').length, 1);
}

// Stellen: in allen 21 Zeitblöcken eine Büro-Stelle, nur für Ehrenamtliche; ohne Schreibtisch keine; zweiter Tisch ändert nichts
{
  const { z, aus, block } = gemeinde();
  const t = dienstTermine(z, aus()).filter(x => x.art === 'buero');
  assert.equal(t.length, 21);
  assert.ok(t.every(x => x.stellen.length === 1 && x.stellen[0].wer === 'ehrenamt' && x.stellen[0].code === 'schreibtisch'));
  assert.equal(stelleSetzen(z, aus(), block(0, 'vormittag').key, 'tisch0', z.personen[0].id), 'person');   // Pastor: nur Ehrenamt
  assert.equal(moebelKaufen(z, 'schreibtisch', G.x + 4, G.y + 4), 'ok');
  assert.equal(block(0, 'vormittag').stellen.length, BUERO.plaetze);
  const ohne = gemeinde({ tisch: false });
  assert.equal(dienstTermine(ohne.z, ohne.aus()).filter(x => x.art === 'buero').length, 0);
}

// Orga-Tokens: je Büro-Schicht 1 Token am Ende der Schicht; die Schicht zählt zu den 3 Schichten der Woche
{
  const { z, aus, ea, block, buero } = gemeinde();
  assert.equal(z.buero.tokens, 0);
  for (const slot of ['vormittag', 'nachmittag', 'abend']) assert.equal(stelleSetzen(z, aus(), block(1, slot).key, 'tisch0', ea[0].id), 'ok');
  assert.equal(stelleSetzen(z, aus(), block(2, 'vormittag').key, 'tisch0', ea[0].id), 'voll');   // 3 Schichten vergeben
  const w = naechsteWoche(z), b = block(1, 'vormittag');
  bis(z, aus, w);
  const t0 = z.buero.tokens;   // diese Woche können schon Schichten gewesen sein
  bis(z, aus, w + b.von + 30);
  assert.ok(!ea[0].daheim && aus().gruppe[ea[0].x + ea[0].y * z.w] === buero().nr, 'sitzt während der Schicht im Büro');
  assert.equal(z.buero.tokens, t0, 'noch kein Token während der Schicht');
  bis(z, aus, w + b.bis + 1);
  assert.equal(z.buero.tokens, t0 + 1, 'Token am Ende der Schicht');
  bis(z, aus, w + 2 * TAG_MIN);
  assert.equal(z.buero.tokens, t0 + 3, 'drei Schichten, drei Tokens');
  assert.ok(ea[0].daheim, 'nach der Schicht daheim');
  // Ohne Schicht keine Tokens; Tokens bleiben beim Abriss des Büros erhalten
  bis(z, aus, w + 4 * TAG_MIN);
  assert.equal(z.buero.tokens, t0 + 3);
}

// Wer nicht im Büro sitzt (Schichtbetrieb aus = niemand kommt), bekommt kein Token
{
  const { z, aus, ea, block } = gemeinde();
  stelleSetzen(z, aus(), block(1, 'vormittag').key, 'tisch0', ea[0].id);
  z.schichtbetrieb = false;
  bis(z, aus, naechsteWoche(z) + 2 * TAG_MIN);
  assert.equal(z.buero.tokens, 0);
}

// Einladungsbrief: 3 Tokens, gilt bis zur nächsten Konfirmation, danach neu freischaltbar
{
  const { z } = gemeinde();
  z.buero.tokens = 2;
  assert.equal(bonusFreischalten(z, 'einladungKonfi'), 'tokens');
  z.buero.tokens = 4;
  assert.equal(bonusFreischalten(z, 'einladungKonfi'), 'ok');
  assert.equal(z.buero.tokens, 1);
  assert.ok(bonusAktiv(z, 'einladungKonfi'));
  assert.equal(bonusFreischalten(z, 'einladungKonfi'), 'aktiv');
  assert.equal(bonusFreischalten(z, 'gibtsnicht'), 'keine');
  const konfirmation = jahrgangAm(Math.floor(z.minuten / TAG_MIN) + 1);
  assert.equal(z.buero.boni.einladungKonfi.bis, konfirmation * TAG_MIN);
  assert.ok(!bonusAktiv(z, 'einladungKonfi', konfirmation * TAG_MIN), 'am Tag der Konfirmation vorbei');
  assert.equal(z.buero.meldung.code, 'konfiBrief');
}

// Jeden Montag 8:00 kommen 2 neue Jugendliche (nur solange der Brief gilt); sie zählen zum Einzugsgebiet
{
  const { z, aus } = gemeinde();
  const vorher = z.besucher.length;
  bis(z, aus, naechsteWoche(z) + 9 * 60);
  assert.equal(z.besucher.length, vorher, 'ohne Brief keine neuen Jugendlichen');
  z.buero.tokens = 3; bonusFreischalten(z, 'einladungKonfi');
  const w = naechsteWoche(z);
  bis(z, aus, w + 7 * 60);
  assert.equal(z.besucher.length, vorher, 'erst Montag um 8 Uhr');
  bis(z, aus, w + 9 * 60);
  const neu = z.besucher.filter(b => b.konfiBrief);
  assert.equal(neu.length, brief.proWoche);
  assert.ok(neu.every(istJugend));
  // Konfirmandenunterricht: 75 %, danach normale Kommchance
  const b = neu[0];
  assert.equal(besuchChance(b, { art: 'konfi' }), brief.ersterKonfi);
  konfiBriefVerbraucht(z, new Set());
  assert.ok(!b.konfiBrief);
  assert.notEqual(besuchChance(b, { art: 'konfi' }), brief.ersterKonfi);
  // Nach Ablauf kommen keine mehr
  z.buero.boni.einladungKonfi.bis = z.minuten;
  const n = z.besucher.length;
  bis(z, aus, naechsteWoche(z) + 9 * 60);
  assert.equal(z.besucher.length, n);
}

// Zuerst bekannte jugendliche Passanten; ist das Einzugsgebiet voll, kommen keine ganz neuen Leute
{
  const { z } = gemeinde();
  const passant = neuePerson(z, 50, () => 0.5); passant.jugend = true;
  const erwachsen = neuePerson(z, 50, () => 0.5); erwachsen.jugend = false;
  z.ort.leute = [erwachsen, passant];
  const da = jugendlicheEinladen(z, 1, () => 0);
  assert.equal(da[0], passant, 'bekannter Passant kommt zuerst');
  assert.ok(z.besucher.includes(passant));
  assert.ok(z.ort.leute.includes(erwachsen), 'Erwachsene bleiben Passanten');
  const g = einzugsgebiet(z);
  const rest = jugendlicheEinladen(z, g.frei + 5, () => 0.5);
  assert.equal(rest.length, g.frei, 'nur so viele, wie ins Einzugsgebiet passen');
  assert.equal(einzugsgebiet(z).frei, 0);
}

// Alter Spielstand ohne Büro lädt; Abfrage fürs Büro-Fenster
{
  const { z } = gemeinde();
  delete z.buero;
  const s = spielStarten(JSON.stringify({ version: SPEICHER_VERSION, zustand: z }), () => 0.5);
  const nr = s.bueroBei(G.x + 3, G.y + 3);
  assert.notEqual(nr, null);
  const info = s.bueroInfo(nr);
  assert.equal(info.tokens, 0);
  assert.equal(info.schreibtische, 1);
  assert.equal(info.boni[0].id, 'einladungKonfi');
  assert.equal(info.boni[0].leistbar, false);
  assert.equal(s.bonusFreischalten('einladungKonfi'), 'tokens');
}

console.log('buero.test.mjs: alles in Ordnung');
