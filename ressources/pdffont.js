// Eingebettete Schrift (Noto Sans, SIL Open Font License), damit Namen wie „Łukasz Żółć“
// oder kyrillische Schreibweisen im PDF erhalten bleiben. Teilmenge: Latein, Griechisch, Kyrillisch.
export const FONT_FAMILY = 'NotoSans';
const FONT_FILES = [
  { url: './libs/fonts/NotoSans-Regular.ttf', fileName: 'NotoSans-Regular.ttf', style: 'normal' },
  { url: './libs/fonts/NotoSans-Bold.ttf', fileName: 'NotoSans-Bold.ttf', style: 'bold' },
];
const BINARY_CHUNK_SIZE = 0x8000;

// Von beiden Schriftschnitten abgedeckte Unicode-Bereiche (aus der Schriftdatei erzeugt).
const SUPPORTED_RANGES = [
  [0x0020, 0x007E], [0x00A0, 0x02FF], [0x0370, 0x0377], [0x037A, 0x037F], [0x0384, 0x038A], [0x038C, 0x038C],
  [0x038E, 0x03A1], [0x03A3, 0x03E1], [0x03F0, 0x052F], [0x1E00, 0x1EFF], [0x2000, 0x2064], [0x2066, 0x2071],
  [0x2074, 0x208E], [0x2090, 0x209C], [0x20A0, 0x20C0], [0x2100, 0x214F], [0x2212, 0x2212],
];
// Lesbare Ersatzdarstellung für häufige Zeichen außerhalb der Schrift.
const CHARACTER_REPLACEMENTS = {
  '→': '->', '←': '<-', '↔': '<->', '≥': '>=', '≤': '<=', '≈': '~', '\r': '', '\t': ' ',
};
const UNSUPPORTED_CHARACTER = '?';

let fontsPromise = null;

export function loadPdfFonts() {
  if (!fontsPromise) {
    fontsPromise = Promise.all(FONT_FILES.map(async font => {
      const response = await fetch(font.url);
      if (!response.ok) throw new Error(`Schrift ${font.fileName} konnte nicht geladen werden (HTTP ${response.status}).`);
      return { ...font, binary: toBinaryString(await response.arrayBuffer()) };
    }));
    fontsPromise.catch(() => { fontsPromise = null; });
  }
  return fontsPromise;
}

export function registerPdfFonts(doc, fonts) {
  fonts.forEach(font => {
    doc.addFileToVFS(font.fileName, font.binary);
    doc.addFont(font.fileName, FONT_FAMILY, font.style);
  });
}

export function toPdfText(value) {
  return [...String(value ?? '').normalize('NFC')]
    .map(character => {
      if (character === '\n' || isSupported(character)) return character;
      return CHARACTER_REPLACEMENTS[character] ?? UNSUPPORTED_CHARACTER;
    })
    .join('');
}

// Zeichen, die im PDF nur als „?“ erscheinen würden – für einen sichtbaren Hinweis.
export function findUnsupportedCharacters(values) {
  const unsupported = new Set();
  values.forEach(value => {
    [...String(value ?? '').normalize('NFC')].forEach(character => {
      if (character !== '\n' && !isSupported(character) && !(character in CHARACTER_REPLACEMENTS)) {
        unsupported.add(character);
      }
    });
  });
  return [...unsupported];
}

function isSupported(character) {
  const codePoint = character.codePointAt(0);
  return SUPPORTED_RANGES.some(([start, end]) => codePoint >= start && codePoint <= end);
}

function toBinaryString(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += BINARY_CHUNK_SIZE) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + BINARY_CHUNK_SIZE));
  }
  return binary;
}
