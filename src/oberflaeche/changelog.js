// Changelog im Spiel: liest CHANGELOG.md (dieselbe Datei wie im Repo) und nimmt nur den Abschnitt der aktuellen Version.
// Reine Anzeige – keine Spielregeln. So muss der Text nur an einer Stelle gepflegt werden.
import { VERSION } from '../version.js';

let geladen = null;   // null = noch nicht geladen, sonst { abschnitte } oder { fehler: true }

// Schneidet aus dem Markdown-Text den Abschnitt „## <version>“ heraus und zerlegt ihn in Bereiche mit Punkten.
// Bereiche sind fett gedruckte Zeilen (**Neu**), Punkte sind Zeilen mit „- “.
export function abschnittLesen(text, version) {
  const zeilen = text.split(/\r?\n/);
  const start = zeilen.findIndex(z => z.trim() === `## ${version}`);
  if (start < 0) return null;
  const bereiche = [];
  for (const roh of zeilen.slice(start + 1)) {
    const z = roh.trim();
    if (z.startsWith('## ')) break;
    const titel = z.match(/^\*\*(.+)\*\*$/);
    if (titel) bereiche.push({ titel: titel[1], punkte: [] });
    else if (z.startsWith('- ')) {
      if (!bereiche.length) bereiche.push({ titel: '', punkte: [] });
      bereiche[bereiche.length - 1].punkte.push(z.slice(2));
    }
  }
  return bereiche;
}

// Lädt die Datei einmal; ruft danach fertig() auf, damit das Fenster neu gezeichnet wird.
export function changelogHolen(fertig) {
  if (geladen) return geladen;
  geladen = { laedt: true };
  fetch('CHANGELOG.md', { cache: 'no-store' })
    .then(a => a.ok ? a.text() : Promise.reject())
    .then(t => { const b = abschnittLesen(t, VERSION); geladen = b ? { bereiche: b } : { fehler: true }; })
    .catch(() => { geladen = { fehler: true }; })
    .then(fertig);
  return geladen;
}
