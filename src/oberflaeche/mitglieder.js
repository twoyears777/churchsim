// Menü „Mitglieder“ (Lukas, 27.11.2026 – Spielprinzip claude/spielprinzip-mitglieder-menue.md).
// Eigener Knopf oben. Hier liegt alles zu den Gemeindemitgliedern: Anzahl, Monatsbeitrag (nur hier einstellbar),
// Liste mit Kündigungsgefahr (Level 2 oder 1 rot markiert) und ein kleines Diagramm der Mitgliederzahl über die Wochen.
// Alle Zahlen kommen über die Abfrage mitgliederInfo vom Spiel; hier wird nur HTML daraus.
// Der Beitrags-Knopf (data-beitrag) wird in fenster.js an den Befehl mitgliedsbeitragSetzen weitergegeben.
import { TEXTE } from '../inhalte/texte.js';
import { ui, esc } from './ui.js';

const geld = n => `${n.toLocaleString('de-DE', { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 })} €`;

// Diagramm im Stil der Bekanntheit-Kurve: x = Woche, y = Mitglieder (y-Achse mindestens bis 5)
function diagramm(V, T) {
  const W = 300, H = 110, oben = Math.max(5, Math.ceil(Math.max(...V.map(p => p.anzahl)) / 5) * 5);
  const px = i => V.length < 2 ? W / 2 : 24 + i * (W - 34) / (V.length - 1), py = v => 8 + (H - 26) * (1 - v / oben);
  const linie = V.map((p, i) => `${px(i).toFixed(1)},${py(p.anzahl).toFixed(1)}`).join(' ');
  return `<svg class="kurve" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(T.verlaufTitel)}">
    <line x1="24" y1="${py(0)}" x2="${W - 10}" y2="${py(0)}" stroke="#cfc9bb"/><line x1="24" y1="${py(oben)}" x2="${W - 10}" y2="${py(oben)}" stroke="#e2dccf"/>
    <text x="20" y="${py(0) + 4}" font-size="10" text-anchor="end" fill="#6b665b">0</text><text x="20" y="${py(oben) + 4}" font-size="10" text-anchor="end" fill="#6b665b">${oben}</text>
    <polyline points="${linie}" fill="none" stroke="#2d69be" stroke-width="2"/>
    ${V.map((p, i) => `<circle cx="${px(i).toFixed(1)}" cy="${py(p.anzahl).toFixed(1)}" r="${p.jetzt ? 4 : 2.5}" fill="#2d69be"><title>${T.woche(p.woche)}: ${p.anzahl}</title></circle>`).join('')}
    ${V.map((p, i) => `<text x="${px(i).toFixed(1)}" y="${H - 4}" font-size="10" text-anchor="middle" fill="#6b665b">${p.woche}</text>`).join('')}
  </svg>`;
}

export function mitgliederFenster() {
  const T = TEXTE.mitglieder, m = ui.spiel.mitgliederInfo(), b = m.beitrag, S = T.spalten;
  const beitrag = `<div class="zeile"><span>${T.beitrag}:</span>
      <button data-beitrag="${b.betrag - b.schritt}"${b.betrag <= b.min ? ' disabled' : ''}>${T.beitragWeniger}</button>
      <b>${geld(b.betrag)}</b>
      <button data-beitrag="${b.betrag + b.schritt}"${b.betrag >= b.max ? ' disabled' : ''}>${T.beitragMehr}</button></div>
    <p class="unter">${T.beitragHaltung(b.haltung, m.regeln)}</p>`;
  const liste = m.liste.length
    ? `<table class="finanzen hell verlauf"><tr><th>${S.name}</th><th>${S.seit}</th><th>${S.haltung}</th><th>${S.gefahr}</th></tr>
        ${m.liste.map(x => `<tr${x.kuendigung ? ' class="mitglied-gefahr"' : ''}><td>${esc(x.name || '–')}</td><td class="zahl">${x.seit}</td>
          <td class="zahl">${T.haltung(x.level, x.haltung)}</td><td class="zahl">${T.gefahr(x.kuendigung)}</td></tr>`).join('')}
        <tr class="summe"><td>${T.summe}</td><td></td><td></td><td class="zahl">${geld(m.proMonat)}</td></tr></table>
      ${m.liste.some(x => x.kuendigung) ? `<p class="unter">${T.gefahrInfo}</p>` : ''}`
    : `<p class="leer">${T.leer}</p>`;
  const verlauf = m.verlauf.length > 1
    ? `<p class="unter">${T.verlaufInfo(m.verlaufWochen)}</p>${diagramm(m.verlauf, T)}`
    : `<p class="leer">${T.verlaufLeer}</p>`;
  return `<h2>${T.titel}</h2><p class="unter staerker">${T.anzahl(m.anzahl, geld(m.proMonat))}</p>
    <p class="unter">${T.info(m.regeln)}</p>
    <h3>${T.beitragTitel}</h3>${beitrag}
    <h3>${T.listeTitel}</h3>${liste}
    <h3>${T.verlaufTitel}</h3>${verlauf}`;
}
