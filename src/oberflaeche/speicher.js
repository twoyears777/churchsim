// Speichern im Browser. Was gespeichert wird, liefert das Spiel selbst als Text (spiel.speicherText()).
const SPEICHER = 'churchsim-editor';
export function ladenText() { try { return localStorage.getItem(SPEICHER); } catch (e) { return null; } }
export function speichern(spiel) { try { localStorage.setItem(SPEICHER, spiel.speicherText()); } catch (e) {} }
