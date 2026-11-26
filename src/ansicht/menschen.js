// Figuren-Schublade: Hier werden ALLE Menschen gezeichnet (Besucher, Passanten, Mitarbeiter).
// Stil B „schräg von oben“ (Lukas, 26.11.2026). Übergangslösung – später durch einheitliche
// Grafiken ersetzen: Dann nur diese Datei austauschen, der Rest des Spiels bleibt gleich.
//
// Bedeutung der Farben (Lukas): Die OBERTEIL-Farbe trägt die Bedeutung (Besucher, Jugendliche,
// Hauptamt, Ehrenamt) und wird von außen übergeben. Abwechslung gibt es nur bei Haut und Haaren.
// ENTWURF (Claude, 26.11.): Haut-, Haar- und Hosenfarben unten sind Platzhalter – Lukas legt sie fest.

const HAUT = ['#f2c9a0', '#e8b48a', '#c98e62', '#8d5a3b', '#5e3a24'];
const HAARE = ['#2b1e16', '#5b3a29', '#8a5a2b', '#c9a15a', '#e0b04a', '#a33a1e'];
const HOSE = { erwachsen: '#3b3b4f', jugend: '#2f4a6b' };
const AUGEN = '#2b2b2b';
const SCHATTEN = 'rgba(0,0,0,0.18)';

// Maße in Einheiten einer 60 hohen Figur; Füße stehen bei y = 60.
// Jugendliche sind kleiner und schmaler (wie im Entwurf).
const MASS = {
  erwachsen: { kopfY: 10, kopfR: 10, koerper: [-11, 20, 22, 26], beine: [[-7, 44], [2, 44]], beinB: 5, beinH: 16, auge: 4 },
  jugend:    { kopfY: 23, kopfR: 9,  koerper: [-10, 32, 20, 20], beine: [[-5, 50], [1, 50]], beinB: 4, beinH: 10, auge: 3.5 }
};

// Feste Zahl aus der Kennung – dieselbe Person sieht immer gleich aus.
function streuung(id) {
  const s = String(id ?? '');
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

function rundRechteck(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
  else ctx.rect(x, y, w, h);
}

// Zeichnet einen Menschen. (cx, cy) = Mitte des Kästchens, hoehe = Größe einer erwachsenen Figur in Pixeln.
// art: { kleidung, id, jugend, rand (Farbe für Markierung, optional), schattenTiefer }
// Gibt zurück, wo Kopf, Oberkörper und Füße liegen (für Beschriftungen).
export function menschZeichnen(ctx, cx, cy, hoehe, art) {
  const u = hoehe / 60, m = art.jugend ? MASS.jugend : MASS.erwachsen;
  const oben = cy - 30 * u;                      // Figur steht mittig im Kästchen
  const X = v => cx + v * u, Y = v => oben + v * u;
  const z = streuung(art.id);
  const haut = HAUT[z % HAUT.length], haare = HAARE[(z >>> 8) % HAARE.length];

  // Schatten unter den Füßen
  ctx.fillStyle = SCHATTEN;
  ctx.beginPath(); ctx.ellipse(X(art.schattenTiefer ? 4 : 2), Y(art.schattenTiefer ? 64 : 60), 12 * u, 3.5 * u, 0, 0, Math.PI * 2); ctx.fill();

  const formen = () => {
    for (const [bx, by] of m.beine) { ctx.beginPath(); ctx.rect(X(bx), Y(by), m.beinB * u, m.beinH * u); ctx.stroke(); }
    const [kx, ky, kw, kh] = m.koerper; rundRechteck(ctx, X(kx), Y(ky), kw * u, kh * u, 5 * u); ctx.stroke();
    ctx.beginPath(); ctx.arc(X(0), Y(m.kopfY), m.kopfR * u, 0, Math.PI * 2); ctx.stroke();
  };
  // Umriss: weiß (damit man die Figur auf jedem Boden sieht) oder Markierungsfarbe
  ctx.lineJoin = 'round';
  ctx.strokeStyle = art.rand || '#fff';
  ctx.lineWidth = art.rand ? Math.max(4, 5 * u) : Math.max(2, 2.5 * u);
  formen();

  // Beine, Oberkörper (Bedeutungsfarbe), Kopf, Haare, Augen
  ctx.fillStyle = art.jugend ? HOSE.jugend : HOSE.erwachsen;
  for (const [bx, by] of m.beine) ctx.fillRect(X(bx), Y(by), m.beinB * u, m.beinH * u);
  const [kx, ky, kw, kh] = m.koerper;
  ctx.fillStyle = art.kleidung; rundRechteck(ctx, X(kx), Y(ky), kw * u, kh * u, 5 * u); ctx.fill();
  ctx.fillStyle = haut; ctx.beginPath(); ctx.arc(X(0), Y(m.kopfY), m.kopfR * u, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = haare; ctx.beginPath(); ctx.arc(X(0), Y(m.kopfY - 2), m.kopfR * u, Math.PI, 0); ctx.closePath(); ctx.fill();
  if (hoehe >= 20) {
    ctx.fillStyle = AUGEN;
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(X(s * m.auge), Y(m.kopfY + 1), Math.max(0.8, 1.2 * u), 0, Math.PI * 2); ctx.fill(); }
  }
  return {
    rechts: X(m.koerper[0] + m.koerper[2]) ,
    koerperMitte: { x: X(0), y: Y(ky + kh / 2) }, koerperHoehe: kh * u,
    fuesse: Y(60)
  };
}
