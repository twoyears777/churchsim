// Inhaltsdatei: die Menschen im Ort, die auf dem Gehweg vorbeilaufen (Passanten), und wann sie neugierig werden.
// Zahlen von Lukas freigegeben (25.11.), nach dem Testen leicht anpassbar.
export const ORT = {
  maxBewohner: 40,          // so viele Passanten gibt es im Ort höchstens
  passantenProTag: [6, 10], // so viele Leute laufen pro Tag vorbei (zufällig dazwischen), bekannte Besucher eingerechnet
  bekannteProTag: [1, 2],   // ... davon bekannte Besucher
  anteilBekannt: 0.5,       // Chance, dass ein Passant jemand ist, der schon mal vorbeikam (bis der Ort voll ist)
  von: 7, bis: 21,          // zwischen diesen Uhrzeiten machen sie sich auf den Weg
  haltung: [30, 60]         // Haltung zur Gemeinde, wenn jemand das erste Mal vorbeiläuft
};

export const NEUGIER = {
  grund: 0.05,              // Chance, neugierig zu werden: 5 % ...
  proBekanntheit: 0.005,    // ... + halbe Bekanntheit in % (Bekanntheit 20 → +10 %)
  kommChance: 0.75,         // ein Neugieriger kommt mit dieser Chance zum nächsten Gottesdienst (sonst wieder Passant)
  haltMinuten: 15           // so lange (Spielminuten) bleibt er am Tor stehen
};

// Plakat an der Pforte (Spielprinzip vom 25.11.): kostet 5 €, hängt bis zum nächsten Gottesdienst.
// Solange es hängt, werden Passanten am Tor 3× so oft neugierig (höchstens 100 %).
export const PLAKAT = { preis: 5, faktor: 3 };

export const STAMMGAST_AB_BESUCHEN = 3;   // Status „Stammgast“ ab so vielen Besuchen (die 4 Start-Stammgäste gleich)
