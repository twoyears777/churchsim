// Intro beim Öffnen der App: schwarzer Bildschirm mit „twoyears 2026“, danach ist das Hauptmenü zu sehen.
// Das Intro ist nur ein Vorhang über dem Menü – am Spielstand ändert es nichts. Die Zeit steht ohnehin, weil das Menü offen ist.
// Klick oder Taste überspringt es. Die Taste geht dabei nicht weiter ans Menü (sonst würde z. B. Escape gleich weiterspielen).
// Dauer und Ein-/Ausblenden stehen in stil.css (.intro, @keyframes intro-blenden).
import { TEXTE } from '../inhalte/texte.js';

export function introStarten() {
  const intro = document.getElementById('intro');
  if (!intro) return;
  let fertig = false;
  function beenden() {
    if (fertig) return;
    fertig = true;
    window.removeEventListener('keydown', taste, true);
    intro.classList.add('weg');                                   // schwarzer Grund blendet kurz aus
    setTimeout(() => intro.remove(), 250);
  }
  function taste(e) { e.preventDefault(); e.stopImmediatePropagation(); beenden(); }

  document.getElementById('introText').textContent = TEXTE.intro;
  intro.classList.add('laeuft');
  intro.querySelector('.intro-text').addEventListener('animationend', beenden);
  intro.addEventListener('pointerdown', e => { e.preventDefault(); beenden(); });
  window.addEventListener('keydown', taste, true);                // „true“: kommt vor allen anderen Tasten-Abfragen dran
}
