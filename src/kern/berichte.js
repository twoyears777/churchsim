// Berichte (Lukas, 27.11.): Was hat eine Veranstaltung gebracht? Am Ende jeder Veranstaltung – egal in welchem Raum –
// wird ein kleiner Zettel mit ihren Werten gespeichert (z.berichte). Der Gemeindekalender zeigt ihn bei vergangenen Terminen.
// Der Kirchkaffee danach gehört nicht dazu (eigene Abrechnung in den Finanzen).
// Aufgehoben werden die Zettel dieser und der vorherigen Woche.
const WERTE = ['besucher', 'keinPlatz', 'kollekte', 'spende', 'haltung', 'heiligkeit', 'bekanntheit'];
const rund1 = n => Math.round(n * 10) / 10;

export function berichteAnlegen(z) {
  if (!z.berichte || typeof z.berichte !== 'object' || Array.isArray(z.berichte)) z.berichte = {};
}
// Während die Veranstaltung läuft: Wert auf dem Zettel des Ablaufs dazuzählen
export function berichtDazu(L, wert, betrag) {
  if (!betrag) return;
  if (!L.bericht) L.bericht = {};
  L.bericht[wert] = rund1((L.bericht[wert] || 0) + betrag);
}
// Veranstaltung ist zu Ende (oder ausgefallen): Zettel ablegen
export function berichtAblegen(z, L) {
  berichteAnlegen(z);
  const b = { woche: L.woche, raum: L.raum, platz: L.platz, art: L.art, tag: L.plan.tag, slot: L.plan.slot,
    ausgefallen: !!L.ausgefallen, grund: L.ausgefallen ? L.grund || null : null };
  if (L.fest) b.fest = L.fest;
  for (const w of WERTE) b[w] = L.ausgefallen ? 0 : (L.bericht && L.bericht[w]) || 0;
  z.berichte[L.id] = b;
}
// Neue Woche: nur diese und die vorherige Woche aufheben
export function berichteAufraeumen(z, woche) {
  berichteAnlegen(z);
  for (const id of Object.keys(z.berichte)) if (z.berichte[id].woche < woche - 1) delete z.berichte[id];
}
// Zettel eines Termins als Kopie (nur die Werte) oder null
export function berichtVon(z, id) {
  const b = z.berichte && z.berichte[id];
  if (!b || b.ausgefallen) return null;
  return Object.fromEntries(WERTE.map(w => [w, b[w] || 0]));
}
// Alle Zettel einer Woche: [{ id, ...Zettel }]
export function berichteDerWoche(z, woche) {
  return Object.entries(z.berichte || {}).filter(([, b]) => b.woche === woche).map(([id, b]) => ({ id, ...b }));
}
