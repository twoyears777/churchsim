// Skill-Fach der Mitarbeiter (26.11.): alle Skills an der Person, alte Spielstände werden beim Laden umgezogen
import assert from 'node:assert';
import { spielStarten } from './hilfen/ohne-erster.mjs';   // ohne ersten Gottesdienst (26.11.)
const s = spielStarten(null, () => 0.5);
const d = JSON.parse(s.speicherText());
const pa = d.zustand.personen.find(p => p.id === 'pastor');
assert.equal(pa.skills.seelsorge, 0); assert.deepEqual(pa.skills.multiplikator, { stufe: 0, geleitet: 0 });
assert.equal(d.zustand.seelsorge.punkte, undefined);
delete pa.skills; d.zustand.seelsorge.punkte = 54;
d.zustand.personen.push({ id: 'ea9', x: 1, y: 1, daten: { name: 'Erna', kuerzel: 'E', art: 'ehrenamt' }, musikErfahrung: 250 });
const s2 = spielStarten(JSON.stringify(d), () => 0.5);
assert.equal(s2.personInfo('pastor').seelsorge.stufe, 10);
assert.equal(s2.personInfo('ea9').musik.level, 2);
const d2 = JSON.parse(s2.speicherText());
assert.equal(d2.zustand.seelsorge.punkte, undefined);
assert.equal(d2.zustand.personen.find(p => p.id === 'ea9').musikErfahrung, undefined);
assert.deepEqual(d2.zustand.personen.find(p => p.id === 'ea9').skills, { musik: 250, evangelisation: 0, tontechnik: 0 });
console.log('Skills: alle Tests bestanden');
