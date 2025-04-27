import { getDB } from './db.js';
import { navigateTo } from './navigation.js';

let current = 0;
let dots = [];

export function initFormHandler(current) {
  // === Basis-Selektoren ===
  const form = document.getElementById('transferForm');
  const sections = document.querySelectorAll('form section');
  const allSections = document.querySelectorAll('section');
  const dotContainer = document.querySelector('.navigation');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');

  // === Entscheidungsfelder ===
  const decisionField = document.getElementById('decision');
  const reservationComment = document.getElementById('reservationComment');
  const rejectionReason = document.getElementById('rejectionReason');

  // === Dringlichkeit + Zeitfenster ===
  const dringlichkeitSelect = document.getElementById('dringlichkeit');
  const zeitfensterWrapper = document.getElementById('zeitfensterWrapper');

  // === Beatmungsspezifika ===
  const beatmungToggle = document.getElementById('beatmungToggle');
  const beatmungsDetails = document.getElementById('beatmungsDetails');
  const beatmungsModus = document.getElementById('beatmungsModus');

  const afWrapper = document.querySelector('label[for="af"]')?.parentElement; // div.input-pair where AF is
  const afInputLabel = document.querySelector('label[for="af"]');
  const spo2Wrapper = document.querySelector('label[for="spo2"]')?.parentElement;

  const modDruck = document.getElementById('modDruck');
  const modVolumen = document.getElementById('modVolumen');
  const modNIV = document.getElementById('modNIV');

  document.querySelectorAll('input[type="number"]').forEach(input => {
    input.addEventListener('input', () => {
      if (input.value.includes(',')) {
        input.value = input.value.replace(',', '.');
      }
    });
  });

  // ==========================
  // Navigation + Steps
  // ==========================
  function showSection(index) {
    sections.forEach((section, i) => {
      section.classList.toggle('active', i === index);
    });

    // Jetzt mit globalem "dots"-Array
    dots.forEach((dot, i) => {
      dot.classList.toggle('active', i === index);
    });

    prevBtn.disabled = index === 0;
    nextBtn.textContent = index === sections.length - 1 ? 'Speichern' : 'Weiter';
  }

  // Init dots navigation
  function initDots() {
    dotContainer.innerHTML = '';
    dots = []; // reset

    sections.forEach((_, i) => {
      const dot = document.createElement('span');
      dot.classList.add('dot');
      if (i === 0) dot.classList.add('active');
      dot.dataset.index = i;
      dot.addEventListener('click', () => {
        current = i;
        showSection(current);
      });
      dots.push(dot); // sammeln
      dotContainer.appendChild(dot);
    });
  }

  // Navigation buttons
  nextBtn.addEventListener('click', () => {
    if (current < sections.length - 1) {
      current++;
      showSection(current);
    } else {
      form.requestSubmit();
    }
  });

  prevBtn.addEventListener('click', () => {
    if (current > 0) {
      current--;
      showSection(current);
    }
  });
  
  // ==========================
  // Dynamik: Entscheidung
  // ==========================
  decisionField?.addEventListener('change', () => {
    const value = decisionField.value;
    reservationComment.style.display = value === 'vorbehalt' ? 'block' : 'none';
    rejectionReason.style.display = value === 'abgelehnt' ? 'block' : 'none';
  });

  // ==========================
  // Dynamik: Zeitfenster bei Dringlichkeit
  // ==========================
  dringlichkeitSelect?.addEventListener('change', () => {
    const selected = dringlichkeitSelect.value;
    const needsTime = ['Terminiert', 'Elektiv', 'Verschiebbar'].includes(selected);
    zeitfensterWrapper.classList.toggle('hidden', !needsTime);
  });

  // ==========================
  // Dynamik: Accordion – exklusiv offen
  // ==========================
  allSections.forEach(section => {
    const detailsList = section.querySelectorAll('details.accordion');
    detailsList.forEach(detail => {
      detail.addEventListener('toggle', () => {
        if (detail.open) {
          detailsList.forEach(other => {
            if (other !== detail) other.removeAttribute('open');
          });
        }
      });
    });
  });

  // ==========================
  // Dynamik: Landeplatz → RTW-Feld ein-/ausblenden
  // ==========================
  document.querySelectorAll('.landeplatzToggle').forEach(toggle => {
    toggle.addEventListener('change', (e) => {
      const wrapper = e.target.closest('details')?.querySelector('.rtw-wrapper');
      if (wrapper) wrapper.classList.toggle('hidden', !e.target.checked);
    });
  });

  // ==========================
  // Dynamik: Beatmungsdetails + Modus
  // ==========================
  beatmungToggle?.addEventListener('change', () => {
    beatmungsDetails.classList.toggle('hidden', !beatmungToggle.checked);

    if (afInputLabel && beatmungToggle.checked) {
      // MOVE AF INTO BeatmungsDetails!
      const target = beatmungsDetails.querySelector('.input-pair') || beatmungsDetails;
      target.appendChild(afInputLabel);
    } else if (afInputLabel && !beatmungToggle.checked) {
      // MOVE AF BACK to SPO2 input-pair
      spo2Wrapper?.appendChild(afInputLabel);
    }
  });

  beatmungsModus?.addEventListener('change', () => {
    const mode = beatmungsModus.value;

    // Alle Module zuerst ausblenden
    [modDruck, modVolumen, modNIV].forEach(el => el.classList.remove('active'));

    // Logik für Anzeige
    if (!mode) {
      // Kein Modus ausgewählt → alles anzeigen
      [modDruck, modVolumen, modNIV].forEach(el => el.classList.add('active'));
    } else if (mode === 'niv' || mode === 'assistiert') {
      modNIV.classList.add('active');
    } else if (mode === 'druck') {
      modDruck.classList.add('active');
    } else if (mode === 'volumen') {
      modVolumen.classList.add('active');
    }
  });

  // ==========================
  // Allgemeine Toggle-Helfer
  // ==========================
  function setupToggleCard(toggleId, cardSelector) {
    const toggle = document.getElementById(toggleId);
    const card = document.querySelector(cardSelector);
    if (!toggle || !card) return;

    toggle.addEventListener('change', () => {
      card.classList.toggle('hidden', !toggle.checked);
    });
  }

  // Toggle-Karten registrieren
  setupToggleCard('toggleKatecholamin', '.katego-wrapper');
  setupToggleCard('toggleSchrittmacher', '.schrittmacher-wrapper');
  setupToggleCard('toggleSonstige', '.sonstige-wrapper');
  setupToggleCard('toggleDialyse', '.dialyse-wrapper');

  form.addEventListener('submit', async (e) => {
    e.preventDefault(); // verhindert echtes Abschicken

    const formData = new FormData(form);
    const data = {};

    for (const [key, value] of formData.entries()) {
      let val = value;
    
      if (decimalFields.includes(key)) {
        val = normalizeDecimalInput(val);
      }
    
      if (data[key]) {
        if (!Array.isArray(data[key])) {
          data[key] = [data[key]];
        }
        data[key].push(val);
      } else {
        data[key] = val;
      }
    }

    // Optionale Felder hinzufügen, die nicht über FormData kommen (z. B. toggle-Karten)
    data.katecholaminpflichtig = document.getElementById('toggleKatecholamin')?.checked || false;
    data.schrittmacher = document.getElementById('toggleSchrittmacher')?.checked || false;
    data.sonstigeTherapie = document.getElementById('toggleSonstige')?.checked || false;
    data.dialyse = document.getElementById('toggleDialyse')?.checked || false;
    data.akute_blutung = document.getElementById('toggleBlutung')?.checked || false;
    data.beatmet = document.getElementById('beatmungToggle')?.checked || false;

    const idField = document.getElementById('entryId');
    if (!formData.get('id') && idField) {
      data.id = Date.now(); // neuer Eintrag
    } else {
      data.id = parseInt(formData.get('id')); // vorhandener Eintrag
    }
    
    try {
      const db = await getDB();
      const tx = db.transaction('items', 'readwrite');
      const store = tx.objectStore('items');
      await store.put({ ...data, updated: new Date().toISOString() }); // put → ersetzt bestehenden, falls id gleich
      await tx.complete;

      console.log('✅ Transfer gespeichert:', data);
      navigateTo('list');
    } catch (err) {
      console.error('❌ Fehler beim Speichern:', err);
      alert('Fehler beim Speichern.');
    }
  });

  // ==========================
  // Initialisierung
  // ==========================
  initDots();
  showSection(current);
}

const decimalFields = [
  "gewicht", "spo2", "af", "fio2", "peep", "pinsp", "vt", "amv", "asb", "rr_sys", "rr_dias", "hr", "noradrenalin_dosis", "adrenalin_dosis", "dopamin_dosis", "dobutamin_dosis", "hb", "hkt", "pao2", "paco2", "ph", "lactat", "hco3", "be", "na", "k", "cl", "ca"
];

function normalizeDecimalInput(value) {
  if (typeof value !== 'string') return value;
  const normalized = value.replace(',', '.');
  const number = parseFloat(normalized);
  return isNaN(number) ? null : number;
}

export function populateForm(data) {
  const form = document.getElementById('transferForm');

  if (data.id) {
    const idField = form.querySelector('#entryId');
    if (idField) idField.value = data.id;
  }

  Object.entries(data).forEach(([key, value]) => {
    const input = form.querySelector(`[name="${key}"]`);
    if (!input) return;

    if (input.type === 'checkbox') input.checked = Boolean(value);
    else if (input.type === 'radio') {
      const radio = form.querySelector(`[name="${key}"][value="${value}"]`);
      if (radio) radio.checked = true;
    } else input.value = value;
  });

// Dringlichkeit → Zeitfenster anzeigen
document.getElementById('dringlichkeit')?.dispatchEvent(new Event('change'));

// Beatmung → Beatmungsdetails anzeigen
document.getElementById('beatmungToggle')?.dispatchEvent(new Event('change'));

// Beatmungsmodus → Modul-spezifische Anzeigen
document.getElementById('beatmungsModus')?.dispatchEvent(new Event('change'));

// Entscheidung (angenommen / vorbehalt / abgelehnt)
document.getElementById('decision')?.dispatchEvent(new Event('change'));

// Landeplatz Quell- und Zielklinik → RTW anzeigen
document.querySelectorAll('.landeplatzToggle').forEach(toggle => {
  toggle.dispatchEvent(new Event('change'));
});

// Toggle-Karten (Katecholaminpflichtig, Schrittmacher, Sonstige, Dialyse) nachtriggern
['toggleKatecholamin', 'toggleSchrittmacher', 'toggleSonstige', 'toggleDialyse', 'toggleBlutung'].forEach(id => {
  const toggle = document.getElementById(id);
  toggle?.dispatchEvent(new Event('change'));
});
}