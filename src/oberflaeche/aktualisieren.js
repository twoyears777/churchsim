// Automatische Aktualisierung: prüft beim Zurückkehren zur App, ob eine neue Version veröffentlicht wurde,
// und lädt dann neu – aber nie mitten in einer Aktion (z. B. während Besucher einlaufen).
import { VERSION } from '../version.js';

export function aktualisierungStarten(istBeschaeftigt) {
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});

  let wartet = false;
  async function pruefen() {
    try {
      const antwort = await fetch('version.json', { cache: 'no-store' });
      const { version } = await antwort.json();
      if (version && version !== VERSION) wartet = true;
    } catch (e) { return; }                     // offline: einfach weiterspielen
    neuLadenWennFrei();
  }
  function neuLadenWennFrei() {
    if (!wartet) return;
    if (istBeschaeftigt()) { setTimeout(neuLadenWennFrei, 2000); return; }
    // Schutz: pro neuer Version höchstens einmal neu laden (falls die Nummern mal nicht zusammenpassen)
    try { if (sessionStorage.getItem('churchsim-neu-geladen') === VERSION) return; sessionStorage.setItem('churchsim-neu-geladen', VERSION); } catch (e) {}
    location.reload();
  }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') pruefen(); });
  setInterval(pruefen, 10 * 60 * 1000);       // zusätzlich alle 10 Minuten
}
