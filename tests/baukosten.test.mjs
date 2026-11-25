// Prüft Baukosten, Fenster und Foyer (Spielprinzip von Lukas, 25.11.2026). Starten mit: node tests/baukosten.test.mjs
import assert from 'node:assert';
import { GRUNDSTUECK as G } from '../src/inhalte/umgebung.js';
import { STARTGELD } from '../src/inhalte/finanzen.js';
import { BAUKOSTEN, STARTGELD_AUSGLEICH, FENSTER, FOYER } from '../src/inhalte/bau.js';
import { spielStarten, neuesSpiel, raeumeAuswerten } from '../src/kern/spiel.js';
import { wandRechteck, tuerUmschalten, fensterUmschalten, typZuweisen, erkenneRaeume, FENSTER as FENSTER_FELD, idx } from '../src/kern/karte.js';
import { raumAusstattung, moebelSetzen } from '../src/kern/moebel.js';
import { personHinzufuegen, versetzen } from '../src/kern/personen.js';
import { foyerBonus, foyerWert } from '../src/kern/foyer.js';
import { strasse } from '../src/kern/bewegung.js';
import { weg } from '../src/kern/wege.js';

assert.equal(STARTGELD, 1000);

// Wände kosten 5 € je neues Stück, Türen nichts, Abriss gibt alles zurück
{
  const s = spielStarten(null, () => 0.5);
  assert.equal(s.lage().konto, 1000);
  const v = s.wandVorschau(G.x + 2, G.y + 2, G.x + 8, G.y + 8);   // 7 × 7 → 24 Stücke
  assert.equal(v.stuecke, 24); assert.equal(v.kosten, 120); assert.equal(v.leistbar, true);
  assert.equal(s.wandBauen(G.x + 2, G.y + 2, G.x + 8, G.y + 8), 'ok');
  assert.equal(s.lage().konto, 1000 - 24 * BAUKOSTEN.wand);
  // Dieselbe Wand noch einmal: nichts Neues, kostet nichts
  assert.equal(s.wandBauen(G.x + 2, G.y + 2, G.x + 8, G.y + 8), 'ok');
  assert.equal(s.lage().konto, 880);
  // Raum daneben teilt sich eine Wand: nur die neuen Stücke kosten
  assert.equal(s.wandVorschau(G.x + 9, G.y + 2, G.x + 14, G.y + 8).stuecke, 17);   // 24 Stücke, 7 davon stehen schon
  s.tuerUmschalten(G.x + 2, G.y + 5);
  assert.equal(s.lage().konto, 880);   // Tür gratis
  // Fenster: 10 €, wieder weg → Geld zurück; auf Tür oder leerem Feld nicht
  assert.equal(s.fensterUmschalten(G.x + 5, G.y + 2), 'ok');
  assert.equal(s.zelle(G.x + 5, G.y + 2), 'fenster');
  assert.equal(s.lage().konto, 870);
  assert.equal(s.fensterUmschalten(G.x + 2, G.y + 5), 'keine');   // Tür
  assert.equal(s.fensterUmschalten(G.x + 5, G.y + 5), 'keine');   // leer
  assert.equal(s.fensterUmschalten(G.x + 5, G.y + 2), 'ok');
  assert.equal(s.zelle(G.x + 5, G.y + 2), 'wand'); assert.equal(s.lage().konto, 880);
  // Rückgängig gibt die 10 € wieder ab (Fenster ist zurück)
  assert.ok(s.rueckgaengig()); assert.equal(s.zelle(G.x + 5, G.y + 2), 'fenster'); assert.equal(s.lage().konto, 870);
  // Abriss: 24 Wandstücke à 5 € + 1 Fenster à 10 € zurück
  s.abreissen(G.x + 2, G.y + 2, G.x + 8, G.y + 8);
  assert.equal(s.lage().konto, 1000);
  // Rückgängig nach dem Bauen gibt das Geld zurück
  s.wandBauen(G.x + 2, G.y + 2, G.x + 8, G.y + 8); assert.equal(s.lage().konto, 880);
  assert.ok(s.rueckgaengig()); assert.equal(s.lage().konto, 1000); assert.equal(s.zelle(G.x + 2, G.y + 2), 'leer');
  // Kassenbuch: Kategorie „Bau“
  s.wandBauen(G.x + 2, G.y + 2, G.x + 8, G.y + 8);
  assert.equal(s.finanzInfo().woche.ausgaben.bau, 3 * 120 + 10);   // dreimal Wände gebaut, einmal ein Fenster gesetzt
}

// Nicht genug Geld: Wand wird nicht gebaut, Fenster nicht gesetzt
{
  const s = spielStarten(null, () => 0.5);
  const d = JSON.parse(s.speicherText()); d.zustand.konto = 100;
  const t = spielStarten(JSON.stringify(d), () => 0.5);
  assert.equal(t.wandVorschau(G.x + 2, G.y + 2, G.x + 8, G.y + 8).leistbar, false);
  assert.equal(t.wandBauen(G.x + 2, G.y + 2, G.x + 8, G.y + 8), 'geld');
  assert.equal(t.zelle(G.x + 2, G.y + 2), 'leer'); assert.equal(t.lage().konto, 100);
  assert.equal(t.wandBauen(G.x + 2, G.y + 2, G.x + 6, G.y + 6), 'ok');   // 16 Stücke = 80 €
  assert.equal(t.lage().konto, 20);
  assert.equal(t.fensterUmschalten(G.x + 4, G.y + 2), 'ok'); assert.equal(t.lage().konto, 10);
  assert.equal(t.fensterUmschalten(G.x + 3, G.y + 2), 'ok'); assert.equal(t.lage().konto, 0);
  assert.equal(t.fensterUmschalten(G.x + 5, G.y + 2), 'geld');
  assert.equal(t.baukosten().fensterLeistbar, false);
}

// Alter Spielstand: +950 € einmalig, alte Wände kostenlos (beim Abriss kein Geld zurück), neue kosten
{
  const s = spielStarten(null, () => 0.5);
  s.wandBauen(G.x + 2, G.y + 2, G.x + 8, G.y + 8);   // 120 €
  const d = JSON.parse(s.speicherText());
  delete d.zustand.baukosten; d.zustand.konto = 50;
  const alt = spielStarten(JSON.stringify(d), () => 0.5);
  assert.equal(alt.lage().konto, 50 + STARTGELD_AUSGLEICH);
  assert.equal(alt.finanzInfo().woche.einnahmen.ausgleich, STARTGELD_AUSGLEICH);
  alt.abreissen(G.x + 2, G.y + 2, G.x + 8, G.y + 8);
  assert.equal(alt.lage().konto, 1000);   // alte Wände: nichts zurück
  alt.wandBauen(G.x + 2, G.y + 2, G.x + 8, G.y + 8); assert.equal(alt.lage().konto, 880);
  alt.abreissen(G.x + 2, G.y + 2, G.x + 8, G.y + 8); assert.equal(alt.lage().konto, 1000);   // neue Wände: voll zurück
  // Beim nächsten Laden kein zweiter Ausgleich
  const wieder = spielStarten(alt.speicherText(), () => 0.5);
  assert.equal(wieder.lage().konto, 1000);
}

// Fenster sind Wand: schließen Räume ab, man läuft nicht hindurch, Tür bleibt nötig
{
  const z = neuesSpiel(() => 0.5);
  wandRechteck(z, G.x + 2, G.y + 2, G.x + 8, G.y + 8);
  assert.equal(fensterUmschalten(z, G.x + 5, G.y + 2), 'gesetzt');
  assert.equal(z.zellen[idx(z, G.x + 5, G.y + 2)], FENSTER_FELD);
  assert.equal(erkenneRaeume(z).raeume.length, 1);
  assert.equal(erkenneRaeume(z).raeume[0].tueren, 0);
  assert.equal(weg(z, { x: G.x + 5, y: G.y + 1 }, { x: G.x + 5, y: G.y + 4 }), null);   // kein Weg durchs Fenster
  // Neue Wand über ein Fenster lässt das Fenster stehen
  wandRechteck(z, G.x + 2, G.y + 2, G.x + 8, G.y + 8);
  assert.equal(z.zellen[idx(z, G.x + 5, G.y + 2)], FENSTER_FELD);
}

// Fenster: +1 Haltung je Fenster im Raum, ohne Obergrenze; auch in Innenwänden (zählt für beide Räume)
{
  const z = neuesSpiel(() => 0.5);
  wandRechteck(z, G.x + 2, G.y + 2, G.x + 18, G.y + 8); tuerUmschalten(z, G.x + 2, G.y + 5);
  const raum = () => erkenneRaeume(z).raeume[0];
  typZuweisen(z, raum(), 'gottesdienst');
  assert.equal(raumAusstattung(z, raum()).haltung, 0);
  for (let i = 0; i < 6; i++) fensterUmschalten(z, G.x + 4 + i, G.y + 2);
  const a = raumAusstattung(z, raum());
  assert.equal(a.haltung, 6 * FENSTER.haltung);
  assert.deepEqual(a.teile.find(t => t.id === 'fenster'), { id: 'fenster', name: 'Fenster', anzahl: 6, max: null, haltung: 6, kollekte: null });
  // Bausteintabelle: Zeile „Fenster (6)“ und +6 in „Zusammen“
  const s = spielStarten(null, () => 0.5);
  s.wandBauen(G.x + 2, G.y + 2, G.x + 18, G.y + 8); s.tuerUmschalten(G.x + 2, G.y + 5);
  const nr = s.raumNrBei(G.x + 5, G.y + 5); s.raumTypSetzen(nr, 'gottesdienst');
  s.fensterUmschalten(G.x + 4, G.y + 2); s.fensterUmschalten(G.x + 5, G.y + 2);
  const b = s.raumInfo(nr).bausteine.gottesdienst;
  assert.deepEqual(b.zeilen.find(x => x.id === 'fenster'), { id: 'fenster', imRaum: true, anzahl: 2, haltung: 1 });
  assert.equal(b.summe.haltung.fest, 5 + 5 + 2);
  // Innenwand zwischen zwei Räumen: das Fenster zählt für beide
  const z2 = neuesSpiel(() => 0.5);
  wandRechteck(z2, G.x + 2, G.y + 2, G.x + 8, G.y + 8); wandRechteck(z2, G.x + 8, G.y + 2, G.x + 14, G.y + 8);
  fensterUmschalten(z2, G.x + 8, G.y + 5);
  const [r1, r2] = erkenneRaeume(z2).raeume;
  assert.equal(raumAusstattung(z2, r1).haltung, 1); assert.equal(raumAusstattung(z2, r2).haltung, 1);
}

// Foyer: Haltung nur für die, die hindurchlaufen – Begrüßungsdienst +3, Garderobe/Infotisch je +2 (jedes Stück)
{
  const z = neuesSpiel(() => 0.5);
  z.personen.forEach((p, i) => versetzen(z, p, G.x + 1 + i, G.y + 1));   // Mitarbeiter aus dem Weg (oben links)
  const tx = G.tor.x + 1, unten = G.y + G.h - 2;
  // Foyer direkt hinter dem Tor (innen 6 × 5), darüber der Gottesdienstraum (innen 17 × 6), dazwischen eine Tür
  wandRechteck(z, tx - 3, unten - 6, tx + 4, unten);
  wandRechteck(z, tx - 9, unten - 13, tx + 9, unten - 6);
  tuerUmschalten(z, tx, unten); tuerUmschalten(z, tx, unten - 6);
  let { raeume } = erkenneRaeume(z);
  const foyer = raeume.find(r => r.zellen.includes(idx(z, tx, unten - 2))), gd = raeume.find(r => r.zellen.includes(idx(z, tx, unten - 9)));
  typZuweisen(z, foyer, 'foyer'); typZuweisen(z, gd, 'gottesdienst');
  let aus = raeumeAuswerten(z);
  const f = () => aus.liste.find(r => r.zellen.includes(idx(z, tx, unten - 2)));
  assert.deepEqual(f().probleme, []);
  assert.equal(foyerWert(z, aus, f()).haltung, 0);
  const sitz = { x: tx, y: unten - 10 };
  assert.equal(foyerBonus(z, aus, strasse(0), sitz), 0);   // leeres Foyer bringt nichts
  // Garderobe ×2 und Infotisch
  moebelSetzen(z, 'garderobe', tx - 2, unten - 4, tx - 2, unten - 3); moebelSetzen(z, 'infotisch', tx + 3, unten - 4, tx + 3, unten - 4);
  aus = raeumeAuswerten(z);
  assert.equal(foyerWert(z, aus, f()).haltung, 2 + 2 + 2);
  // Begrüßungsdienst: ein Ehrenamtlicher steht im Foyer (zwei zählen nicht doppelt)
  const ea = personHinzufuegen(z, { name: 'Gerda Gruß', kuerzel: 'G', art: 'ehrenamt' });
  assert.ok(versetzen(z, ea, tx + 3, unten - 2));
  const ea2 = personHinzufuegen(z, { name: 'Hans Hallo', kuerzel: 'H', art: 'ehrenamt' });
  assert.ok(versetzen(z, ea2, tx - 2, unten - 1));
  aus = raeumeAuswerten(z);
  const w = foyerWert(z, aus, f());
  assert.equal(w.begruessung, true); assert.equal(w.haltung, FOYER.begruessung + 6);
  assert.equal(foyerBonus(z, aus, strasse(0), sitz), 9);
  // Wer nicht durchs Foyer muss, bekommt nichts: zweite Tür direkt von draußen in den Gottesdienstraum
  const z2 = JSON.parse(JSON.stringify(z));
  tuerUmschalten(z2, tx - 9, unten - 9);
  const aus2 = raeumeAuswerten(z2);
  assert.equal(foyerBonus(z2, aus2, { x: tx - 12, y: unten - 9 }, { x: tx - 7, y: unten - 9 }), 0);
  // Hauptamtliche zählen nicht als Begrüßungsdienst
  const z3 = JSON.parse(JSON.stringify(z));
  z3.personen = z3.personen.filter(p => p.id === 'pastor');
  versetzen(z3, z3.personen[0], tx + 3, unten - 2);
  assert.equal(foyerWert(z3, raeumeAuswerten(z3), raeumeAuswerten(z3).liste.find(r => r.zellen.includes(idx(z3, tx, unten - 2)))).begruessung, false);
}

// Foyer über die Schalterwand: Raumtyp wählbar, Fenster-Info, Foyer anklickbar
{
  const s = spielStarten(null, () => 0.5);
  s.wandBauen(G.x + 2, G.y + 2, G.x + 7, G.y + 7); s.tuerUmschalten(G.x + 2, G.y + 4);
  const nr = s.raumNrBei(G.x + 4, G.y + 4);
  const wahl = s.raumtypWahl(nr).typen.find(t => t.id === 'foyer');
  assert.equal(wahl.zuKlein, false); assert.deepEqual(wahl.minGroesse, [4, 4]);
  s.raumTypSetzen(nr, 'foyer');
  assert.equal(s.foyerBei(G.x + 4, G.y + 4), nr);
  assert.equal(s.veranstaltungsraumBei(G.x + 4, G.y + 4), null);
  assert.equal(s.moebelKaufen('garderobe', G.x + 4, G.y + 4), 'ok');
  const i = s.foyerInfo(nr);
  assert.equal(i.fertig, true); assert.equal(i.haltung, 2); assert.equal(i.begruessung.da, false);
  assert.deepEqual(i.teile.map(t => [t.id, t.anzahl]), [['garderobe', 1], ['infotisch', 0]]);
  // Kleiner als 4 × 4 geht nicht
  s.wandBauen(G.x + 10, G.y + 2, G.x + 14, G.y + 6); s.tuerUmschalten(G.x + 10, G.y + 4);
  assert.equal(s.raumtypWahl(s.raumNrBei(G.x + 12, G.y + 4)).typen.find(t => t.id === 'foyer').zuKlein, true);
}

console.log('Baukosten, Fenster und Foyer: alle Tests bestanden');
