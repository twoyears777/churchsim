// Inhaltsdatei: Möbel, die man im Editor aufstellen kann. Jedes Möbel belegt 1 Kästchen.
// kosten: Kaufpreis in €, wird sofort vom Konto abgezogen; beim Abriss volle Rückerstattung.
export const MOEBEL = [
  { id: 'stuhl', name: 'Stuhl', kosten: 5 },
  { id: 'kaffeemaschine', name: 'Kaffeemaschine', kosten: 50, fassung: 30, startFuellung: 0 },  // für das Kirchkaffee
  { id: 'theke', name: 'Theke', kosten: 20 }   // für das Kirchkaffee; mehrere Thekenteile nebeneinander = eine Theke
];
