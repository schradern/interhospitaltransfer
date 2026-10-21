import { storeEntry } from './entrystore.js';
import { readFormData, populateForm, refreshConditionalFields, syncLinkedCheckbox } from './formdata.js';
import { showStatus } from './status.js';
import { isUnlocked } from './vault.js';

let hasUnsavedChanges = false;
let isSaving = false;

export function hasPendingChanges() {
  return hasUnsavedChanges;
}

export function discardPendingChanges() {
  hasUnsavedChanges = false;
}

// options: onSaved, initialStep und hasChanges (beim Wiederherstellen nach dem Entsperren).
export function initForm(container, templateHtml, entry, { onSaved, initialStep = 0, hasChanges = false }) {
  container.innerHTML = templateHtml;
  const form = container.querySelector('#transferForm');

  setupStepNavigation(form, initialStep);
  setupDependentFields(form);
  if (entry) populateForm(form, entry);
  else refreshConditionalFields(form);

  hasUnsavedChanges = hasChanges;
  form.addEventListener('submit', event => {
    event.preventDefault();
    persistForm(form, onSaved);
  });
  // Tastatur und Screenreader starten am Titel des Schritts statt am Seitenanfang.
  form.querySelector('section.active h2')?.focus({ preventScroll: true });
  return form;
}


function setupDependentFields(form) {
  const markChanged = event => {
    // Nur echte Nutzereingaben zählen; programmatisch ausgelöste Events nicht.
    if (event.isTrusted) hasUnsavedChanges = true;
  };
  form.addEventListener('input', event => {
    markChanged(event);
    if (event.target.dataset.checks) syncLinkedCheckbox(form, event.target);
  });
  form.addEventListener('change', event => {
    markChanged(event);
    refreshConditionalFields(form);
  });
}

function setupStepNavigation(form, initialStep) {
  const sections = [...form.querySelectorAll('section')];
  const stepContainer = form.querySelector('.navigation');
  const previousButton = form.querySelector('#prevBtn');
  const nextButton = form.querySelector('#nextBtn');
  const stepCounter = form.querySelector('.step-counter');
  let currentIndex = initialStep;

  const stepButtons = sections.map((section, index) => createStepButton(section, index, sections.length, () => showStep(index)));
  stepContainer.replaceChildren(...stepButtons);
  enableArrowKeyNavigation(stepContainer, stepButtons);

  function showStep(index) {
    const hasChangedStep = index !== currentIndex;
    currentIndex = index;
    form.dataset.step = String(index);
    stepCounter.textContent = `Schritt ${index + 1} von ${sections.length}`;
    sections.forEach((section, sectionIndex) => section.classList.toggle('active', sectionIndex === index));
    stepButtons.forEach((button, buttonIndex) => {
      const isCurrent = buttonIndex === index;
      button.classList.toggle('active', isCurrent);
      button.tabIndex = isCurrent ? 0 : -1;
      if (isCurrent) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
    previousButton.disabled = index === 0;
    nextButton.textContent = index === sections.length - 1 ? 'Speichern' : 'Weiter';
    if (hasChangedStep) {
      form.scrollIntoView({ block: 'start', behavior: 'smooth' });
      sections[index].querySelector('h2')?.focus({ preventScroll: true });
    }
  }

  nextButton.addEventListener('click', () => {
    if (currentIndex < sections.length - 1) showStep(currentIndex + 1);
    else form.requestSubmit();
  });
  previousButton.addEventListener('click', () => {
    if (currentIndex > 0) showStep(currentIndex - 1);
  });

  showStep(Math.min(initialStep, sections.length - 1));
}

// Schrittliste als ein einziger Tab-Halt; Pfeiltasten, Pos1 und Ende wechseln zwischen den Schritten.
function enableArrowKeyNavigation(container, buttons) {
  container.addEventListener('keydown', event => {
    const targetIndex = stepIndexForKey(event.key, buttons.indexOf(document.activeElement), buttons.length);
    if (targetIndex === null) return;
    event.preventDefault();
    buttons[targetIndex].focus();
  });
}

function stepIndexForKey(key, currentIndex, stepCount) {
  if (currentIndex < 0) return null;
  switch (key) {
    case 'ArrowDown':
    case 'ArrowRight':
      return (currentIndex + 1) % stepCount;
    case 'ArrowUp':
    case 'ArrowLeft':
      return (currentIndex - 1 + stepCount) % stepCount;
    case 'Home':
      return 0;
    case 'End':
      return stepCount - 1;
    default:
      return null;
  }
}

function createStepButton(section, index, stepCount, onSelect) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'dot';
  const title = section.querySelector('h2')?.textContent ?? '';
  button.setAttribute('aria-label', `Schritt ${index + 1} von ${stepCount}: ${title}`);
  const label = document.createElement('span');
  label.className = 'step-label';
  label.textContent = title;
  button.append(label);
  button.addEventListener('click', onSelect);
  return button;
}

async function persistForm(form, onSaved) {
  if (isSaving) return;
  isSaving = true;
  try {
    const entry = readFormData(form);
    await storeEntry(entry);
    hasUnsavedChanges = false;
    // Während des Speicherns gesperrt: keine Meldung über dem Sperrbildschirm.
    if (isUnlocked()) showStatus('Transfer gespeichert.');
    onSaved(entry.id);
  } catch (error) {
    showStatus(`${error.message} Die Eingaben sind noch nicht gespeichert.`, 'error');
  } finally {
    isSaving = false;
  }
}
