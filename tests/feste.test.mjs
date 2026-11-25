// Prüft Feste und Zeiten im Kirchenjahr: Daten, Besucher- und Kollekte-Faktoren, Feiertage (mehr Passanten),
// Fest-Menü vor großen Festen und das Sonderevent (verdrängt Termine zur gleichen Zeit).
// Starten mit: node tests/feste.test.mjs
import assert from 'node:assert';
import { GRUNDSTUECK as G } from '../src/inhalte/umgebung.js';
import { FEIERTAG_PASSANTEN } from '../src/inhalte/kirchenjahr.js';
import { wandRechteck, tuerUmschalten, erkenneRaeume, raumTypVon, pruefeRaum, typZuweisen } from '../src/kern/karte.js';
import { neuesSpiel, spielStarten } from '../src/kern/spiel.js';
import { zeitVorruecken, terminEinstellen, veranstaltungEinstellen, prognose, termineDerWoche } from '../src/kern/ablauf.js';
import { moebelSetzen } from '../src/kern/moebel.js';
import { versetzen } from '../src/kern/personen.js';
import { besuchChance } from '../src/kern/besucher.js';
import { festAmTag, feiertagAmTag, faktorAmTag, tagAnzeige, kommendeFeste, zeitAmTag } from '../src/kern/kalender.js';
import { festSchluessel } from '../src/kern/feste.js';
import { ortSchritt } from '../src/kern/ort.js';
import { TAG_MIN } from '../src/kern/zeit.js';

const aus = z => { const { raeume, gruppe } = erkenneRaeume(z); for (const r of raeume) { r.typ = raumTypVon(z, r); r.probleme = pruefeRaum(z, r, r.typ); } return { liste: raeume, gruppe }; };
const raumBei = z => { const a = aus(z); return a.liste[a.gruppe[G.x + 5 + (G.y + 5) * z.w]]; };
const HEILIGABEND = 31;   // Spieltag: 0 = Montag 23.11.2026 → 24.12.2026 (Donnerstag)

// ---- Kalender ----
{
  assert.deepEqual(tagAnzeige(HEILIGABEND), { wochentag: 3, datum: '24.12.' });
  assert.equal(festAmTag(HEILIGABEND).id, 'heiligabend');
  assert.deepEqual(faktorAmTag(HEILIGABEND), { besucher: 3, kollekte: 2, fest: 'heiligabend', zeit: 'advent' });
  assert.deepEqual(faktorAmTag(6), { besucher: 1.2, kollekte: 1, fest: null, zeit: 'advent' });      // 1. Advent: Adventszeit
  assert.deepEqual(faktorAmTag(3), { besucher: 1, kollekte: 1, fest: null, zeit: 'trinitatis' });   // vor dem 1. Advent
  assert.equal(zeitAmTag(HEILIGABEND + 1), 'weihnachten');
  // Ostern 2027 = 28.3.; Karfreitag Feiertag, Ostersonntag nicht
  const ostern = kommendeFeste(0, 20).find(f => f.id === 'ostersonntag');
  assert.equal(tagAnzeige(ostern.tagNr).datum, '28.3.');
  assert.equal(feiertagAmTag(ostern.tagNr - 2), true); assert.equal(feiertagAmTag(ostern.tagNr), false);
  assert.equal(feiertagAmTag(HEILIGABEND), false); assert.equal(feiertagAmTag(HEILIGABEND + 1), true);
  // Fronleichnam (BW) 60 Tage nach Ostern, Allerheiligen
  assert.equal(feiertagAmTag(ostern.tagNr + 60), true);
  const erntedank = kommendeFeste(0, 20).find(f => f.id === 'erntedank');
  assert.equal(tagAnzeige(erntedank.tagNr).datum, '3.10.'); assert.equal(tagAnzeige(erntedank.tagNr).wochentag, 6);
  assert.equal(kommendeFeste(0, 1)[0].id, 'heiligabend');
}

// ---- Besucher-Faktor: Kommchance × Faktor, höchstens 100 % ----
{
  const b = { id: 'x', zufriedenheit: 40 };
  assert.equal(besuchChance(b, { faktor: 3 }), 1);
  assert.ok(Math.abs(besuchChance(b, { faktor: 1.2 }) - 0.48) < 1e-9);
}

// Gottesdienstraum mit 10 Stühlen, Pastor; 10 Besucher mit Haltung 30 (Kommchance 30 %)
function gemeinde() {
  const z = neuesSpiel(() => 0.5);
  wandRechteck(z, G.x + 2, G.y + 2, G.x + 18, G.y + 8); tuerUmschalten(z, G.x + 2, G.y + 5);
  typZuweisen(z, raumBei(z), 'gottesdienst');
  moebelSetzen(z, 'stuhl', G.x + 6, G.y + 3, G.x + 15, G.y + 3);
  versetzen(z, z.personen[0], G.x + 4, G.y + 5);
  z.besucher = Array.from({ length: 10 }, (_, i) => ({ id: 't' + i, vorname: 'T' + i, nachname: 'X', voll: 'T' + i + ' X',
    zufriedenheit: 30, kaffeeWert: 0, besuche: 0, lobpreis: 0.5 }));   // (Lobpreis-Vorliebe 50 %: Musik ändert hier nichts; eigene Tests in veranstaltungen.test.mjs)
  z.bekanntheit = 0; z.ortRuhig = true; z.konto = 1000;
  return z;
}

// ---- Normale Veranstaltung an Heiligabend (Donnerstag nachmittags): ×3 Besucher, ×2 Kollekte ----
{
  const z = gemeinde(), r = raumBei(z);
  veranstaltungEinstellen(z, r, 'gottesdienst', 0);
  assert.equal(terminEinstellen(z, r, 0, 3, 'nachmittag'), 'ok');
  z.minuten = 4 * 7 * TAG_MIN;                                  // Montag der Heiligabend-Woche
  z.feste.gefragt.push(festSchluessel('heiligabend', HEILIGABEND), festSchluessel('christfest1', HEILIGABEND + 1));
  const v = prognose(z, aus(z));
  assert.ok(Math.abs(v.erwartet - 9) < 1e-9);                   // 10 × 30 % × 3
  assert.equal(v.kirchenjahr.fest, 'heiligabend');
  assert.ok(Math.abs(v.kollekte - 18) < 1e-9);                  // 9 Plätze × 1 € × 2
  // zufall 0,85: Chance 90 % → alle kommen (ohne Fest: 30 % → niemand)
  zeitVorruecken(z, aus(z), 3 * TAG_MIN + 15 * 60 + 61, () => 0.85);
  const L = z.laeufe.find(x => x.plan.tag === 3);
  assert.equal(L.gaeste.length, 10);
  assert.equal(z.konto, 1000 + 20);                             // 10 Besucher × 1 € × 2
}

// ---- Fest-Menü: öffnet 7 Tage vorher um 8:00, Zeit steht, bis es beantwortet ist ----
{
  const z = gemeinde();
  zeitVorruecken(z, aus(z), (HEILIGABEND - 7) * TAG_MIN + 8 * 60 - z.minuten - 1, () => 0.99);
  assert.equal(z.feste.anfrage, null);
  zeitVorruecken(z, aus(z), 2, () => 0.99);
  assert.equal(z.feste.anfrage, festSchluessel('heiligabend', HEILIGABEND));
  const spiel = spielStarten(JSON.stringify({ version: 3, zustand: z }), () => 0.99);
  assert.equal(spiel.lage().festAnfrage, 'heiligabend:31');
  const vorher = spiel.lage();
  assert.equal(spiel.tick(0.2), false);                         // Zeit steht
  assert.deepEqual([spiel.lage().tag, spiel.lage().stunde, spiel.lage().minute], [vorher.tag, vorher.stunde, vorher.minute]);
  const m = spiel.festMenueInfo('heiligabend:31');
  assert.equal(m.name, 'Heiligabend'); assert.equal(m.tageBis, 7); assert.equal(m.offen, true);
  assert.equal(m.auswahl.slot, 'nachmittag'); assert.equal(m.auswahl.leitung, 'pastor'); assert.equal(m.auswahl.art, 'gottesdienst');
  assert.equal(spiel.festPlanen('heiligabend:31', { ...m.auswahl, leitung: 'gibtsnicht' }), 'leitung');
  assert.equal(spiel.festPlanen('heiligabend:31', { ...m.auswahl, raumNr: 99 }), 'raum');
  assert.equal(spiel.festAbsagen('heiligabend:31'), 'ok');      // „Diesmal nicht“
  assert.equal(spiel.lage().festAnfrage, null);
  assert.equal(spiel.tick(0.2), true);
  // Kirchenjahr-Fenster: Heiligabend als nächstes Fest, groß, nicht geplant
  const k = spiel.kirchenjahrInfo();
  assert.equal(k.feste[0].id, 'heiligabend'); assert.equal(k.feste[0].gross, true); assert.equal(k.feste[0].plan, null);
  assert.equal(k.zeit, 'advent'); assert.deepEqual(k.gesperrt, []);   // Konfirmation seit dem Konfirmandenunterricht frei
}

// ---- Sonderevent: findet statt, verdrängt die Veranstaltung im selben Raum zur gleichen Zeit (ohne Haltungs-Abzug) ----
{
  const z = gemeinde(), r = raumBei(z);
  veranstaltungEinstellen(z, r, 'gottesdienst', 0);
  terminEinstellen(z, r, 0, 3, 'nachmittag');                    // Veranstaltung 1 auch Donnerstag nachmittags
  zeitVorruecken(z, aus(z), (HEILIGABEND - 7) * TAG_MIN + 8 * 60 + 1 - z.minuten, () => 0.99);
  const spiel = spielStarten(JSON.stringify({ version: 3, zustand: z }), () => 0.85);
  const m = spiel.festMenueInfo('heiligabend:31');
  assert.equal(spiel.festPlanen('heiligabend:31', { ...m.auswahl, ehrenamt: ['niemand'] }), 'ok');
  const m2 = spiel.festMenueInfo('heiligabend:31');
  assert.equal(m2.geplant, true); assert.deepEqual(m2.auswahl.ehrenamt, []);
  assert.equal(m2.faellt.length, 1); assert.equal(m2.faellt[0].platz, 0);
  const k = spiel.kirchenjahrInfo().feste[0];
  assert.deepEqual(k.plan, { art: 'gottesdienst', slot: 'nachmittag', raumNr: m.auswahl.raumNr, raumName: 'Gottesdienstraum', leitung: 'Pastor Harder' });
  // Prognose von Veranstaltung 1 in der Heiligabend-Woche: fällt aus wegen Heiligabend
  const z2 = JSON.parse(spiel.speicherText()).zustand;
  z2.minuten = 4 * 7 * TAG_MIN; z2.feste.gefragt.push('christfest1:32');
  const v = prognose(z2, aus(z2));
  assert.equal(v.bereit, false); assert.equal(v.wegenFest, 'Heiligabend');
  // Ablauf: Termin des Fests + verdrängter Termin
  const t = termineDerWoche(z2, aus(z2), 4).filter(x => x.plan.tag === 3);
  assert.equal(t.length, 2); assert.equal(t[0].fest, 'heiligabend:31');
  zeitVorruecken(z2, aus(z2), 3 * TAG_MIN + 15 * 60 + 61, () => 0.85);
  const fest = z2.laeufe.find(x => x.fest), weg = z2.laeufe.find(x => x.wegenFest);
  assert.equal(fest.gaeste.length, 10); assert.equal(fest.ausgefallen, undefined);
  assert.equal(weg.ausgefallen, true); assert.equal(weg.grund, 'fest'); assert.equal(weg.gaeste, null);
  assert.equal(z2.konto, 1000 + 20);
  assert.ok(z2.besucher.every(b => b.zufriedenheit === 30));   // kein Abzug wegen Ausfall (Fest noch nicht zu Ende)
  // Leitung nicht im Raum: das Fest fällt aus
  const z3 = JSON.parse(spiel.speicherText()).zustand;
  z3.minuten = 4 * 7 * TAG_MIN; z3.feste.gefragt.push('christfest1:32');
  versetzen(z3, z3.personen[0], G.x + 26, G.y + 20);
  zeitVorruecken(z3, aus(z3), 3 * TAG_MIN + 15 * 60 + 1, () => 0.85);
  const f3 = z3.laeufe.find(x => x.fest);
  assert.equal(f3.ausgefallen, true); assert.equal(f3.grund, 'leitung');
}

// ---- Feiertage: doppelt so viele Passanten ----
{
  const zaehlen = tag => {
    const z = neuesSpiel(() => 0.5);
    z.minuten = tag * TAG_MIN; z.ort.tag = tag - 1;
    ortSchritt(z, () => 0.5).tun();
    return z.ort.gaenge.length;
  };
  const normal = zaehlen(HEILIGABEND), feiertag = zaehlen(HEILIGABEND + 1);
  assert.ok(normal > 0);
  assert.equal(feiertag, normal * FEIERTAG_PASSANTEN);
}

console.log('Feste-Tests bestanden.');
