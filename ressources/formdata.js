// Werte werden unverändert als Text übernommen: keine Umrechnung, keine Interpretation.
export function readFormData(form) {
  const data = {};
  for (const [key, value] of new FormData(form)) {
    const text = typeof value === 'string' ? value.trim() : value;
    data[key] = key in data ? [].concat(data[key], text) : text;
  }

  const now = new Date().toISOString();
  data.id = Number(data.id) || createEntryId();
  data.created = form.dataset.created || now;
  data.updated = now;
  return data;
}

// Beschriftung jedes Feldes, wie sie im Formular steht (ohne Text der Eingabeelemente selbst).
export function readFieldLabels(form) {
  const labels = {};
  for (const field of form.elements) {
    if (field.name && field.type !== 'hidden') labels[field.name] = labelTextOf(form, field);
  }
  return labels;
}

function labelTextOf(form, field) {
  const label = field.closest('label') ?? form.querySelector(`label[for="${field.id}"]`);
  if (!label) return field.getAttribute('aria-label') ?? field.name;
  const copy = label.cloneNode(true);
  copy.querySelectorAll('input, select, textarea').forEach(control => control.remove());
  return copy.textContent.replace(/\s+/g, ' ').trim() || field.getAttribute('aria-label') || field.name;
}

// Ausgewählte Optionstexte der Auswahlfelder, damit das PDF den angezeigten Wortlaut übernimmt.
export function readSelectedOptionTexts(form) {
  const texts = {};
  form.querySelectorAll('select').forEach(select => {
    if (select.value) texts[select.name] = select.selectedOptions[0]?.textContent.trim() ?? select.value;
  });
  return texts;
}

// Zeitstempel mit Zufallsanteil: zwei neue Einträge in derselben Millisekunde (z. B. zwei Tabs)
// überschreiben sich nicht gegenseitig. Bleibt unterhalb von Number.MAX_SAFE_INTEGER.
const ENTRY_ID_RANDOM_RANGE = 1000;
function createEntryId() {
  const [random] = crypto.getRandomValues(new Uint32Array(1));
  return Date.now() * ENTRY_ID_RANDOM_RANGE + (random % ENTRY_ID_RANDOM_RANGE);
}

export function populateForm(form, entry) {
  form.dataset.created = entry.created || entry.updated || '';

  for (const [key, value] of Object.entries(entry)) {
    const field = form.elements.namedItem(key);
    if (!field || field instanceof RadioNodeList) continue;

    if (field.type === 'checkbox') {
      field.checked = Boolean(value);
    } else {
      field.value = migrateLegacyValue(key, value) ?? '';
    }
  }
  // Ältere Einträge: Freitext "Sonstige" ohne gespeicherte Checkbox → Checkbox setzen.
  form.querySelectorAll('[data-checks]').forEach(textField => {
    if (textField.value.trim() && !(textField.dataset.checks in entry)) syncLinkedCheckbox(form, textField);
  });
  refreshConditionalFields(form);
}

// In Version 1.0 war "Landeplatz vorhanden" ein Schalter (Wert "on"); jetzt Ja/Nein/Keine Angabe.
const LEGACY_SWITCH_FIELDS = ['landeplatz_quellklinik', 'landeplatz_zielklinik'];
function migrateLegacyValue(key, value) {
  if (LEGACY_SWITCH_FIELDS.includes(key) && (value === 'on' || value === true)) return 'ja';
  return value;
}

// Syntax von data-show-when:
//   "feld"           → Checkbox angehakt
//   "!feld"          → Checkbox nicht angehakt
//   "feld=a|b"       → Wert ist a oder b (leer erlaubt: "feld=|a")
//   "feld!=a|b"      → Wert ist weder a noch b
function isConditionMet(form, condition) {
  if (!condition.includes('=')) {
    const isNegated = condition.startsWith('!');
    const field = form.elements.namedItem(condition.replace('!', ''));
    return Boolean(field?.checked) !== isNegated;
  }

  const isNegated = condition.includes('!=');
  const [name, expected] = condition.split(isNegated ? '!=' : '=');
  const field = form.elements.namedItem(name);
  const isMatch = expected.split('|').includes(field?.value ?? '');
  return isMatch !== isNegated;
}

export function refreshConditionalFields(form) {
  form.querySelectorAll('[data-show-when]').forEach(element => {
    element.hidden = !isConditionMet(form, element.dataset.showWhen);
  });
}

// Freitextfeld "Sonstige" hakt die zugehörige Checkbox automatisch an bzw. ab.
export function syncLinkedCheckbox(form, textField) {
  const checkbox = form.elements.namedItem(textField.dataset.checks);
  if (checkbox && checkbox.type === 'checkbox') {
    checkbox.checked = textField.value.trim() !== '';
  }
}
