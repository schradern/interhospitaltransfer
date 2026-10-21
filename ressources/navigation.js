import { decryptJson, encryptJson } from './crypto.js';
import { renderEntriesList } from './entryhandler.js';
import { initForm, hasPendingChanges, discardPendingChanges } from './formhandler.js';
import { readFormData } from './formdata.js';
import { exportFormToPDF, preloadPdfResources } from './pdfhandler.js';
import { showStatus, hideStatus } from './status.js';
import { isUnlocked, requireKey } from './vault.js';

const FORM_TEMPLATE_URL = './form-template.html';
const DISCARD_QUESTION = 'Ungespeicherte Eingaben verwerfen?';
const DRAFT_LOST_MESSAGE = 'Die ungespeicherten Eingaben konnten nach dem Entsperren nicht wiederhergestellt werden.';

let currentPage = null;
let currentForm = null;
let templatePromise = null;
// Beim Sperren verschlüsselt im Arbeitsspeicher abgelegtes Formular; die Seite selbst wird geleert.
let suspendedDraft = null;
// Eintrag, dessen Zeile nach der Rückkehr zur Liste den Fokus erhält (Tastaturbedienung).
let returnFocusEntryId = null;

export function initNavigation() {
  const app = document.getElementById('app');
  document.getElementById('navAdd').addEventListener('click', () => openForm(app, null));
  document.getElementById('navBack').addEventListener('click', () => history.back());
  document.getElementById('navSave').addEventListener('click', () => currentForm?.requestSubmit());
  document.getElementById('navDownload').addEventListener('click', () => {
    if (currentForm) exportFormToPDF(currentForm);
  });

  window.addEventListener('popstate', event => handleHistoryChange(app, event.state));
  window.addEventListener('keydown', event => {
    const isSaveShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's';
    if (!isSaveShortcut || currentPage !== 'form') return;
    event.preventDefault();
    currentForm?.requestSubmit();
  });
  window.addEventListener('beforeunload', event => {
    if (currentPage === 'form' && hasPendingChanges()) event.preventDefault();
  });

  history.replaceState({ page: 'list' }, '');
  showList(app);
}

// Nach automatischer Löschung: Liste neu aufbauen; ein offenes Formular bleibt unverändert.
export function refreshView() {
  if (currentPage === 'list' && isUnlocked()) showList(document.getElementById('app'));
}

// Vor dem Sperren (Schlüssel noch vorhanden): Klartext aus der Seite entfernen.
export async function suspendView() {
  try {
    if (currentPage === 'form' && currentForm) {
      suspendedDraft = await encryptJson(requireKey(), {
        entry: readFormData(currentForm),
        initialStep: Number(currentForm.dataset.step ?? 0),
        hasChanges: hasPendingChanges(),
      });
    }
  } finally {
    document.getElementById('app').replaceChildren();
    currentForm = null;
  }
}

export async function resumeView() {
  const app = document.getElementById('app');
  if (currentPage !== 'form') {
    showList(app);
    return;
  }
  const draft = await restoreDraft();
  if (draft) {
    const templateHtml = await loadFormTemplate();
    // Erneut gesperrt: verschlüsselten Entwurf behalten, beim nächsten Entsperren wiederherstellen.
    if (!isUnlocked()) return;
    suspendedDraft = null;
    renderForm(app, templateHtml, draft.entry, draft);
    return;
  }
  suspendedDraft = null;
  showStatus(DRAFT_LOST_MESSAGE, 'warning');
  discardPendingChanges();
  history.replaceState({ page: 'list' }, '');
  showList(app);
}

async function restoreDraft() {
  if (!suspendedDraft) return null;
  try {
    return await decryptJson(requireKey(), suspendedDraft);
  } catch {
    // Nicht entschlüsselbar (z. B. Passwort inzwischen neu eingerichtet): Aufrufer meldet den Verlust.
    return null;
  }
}

function handleHistoryChange(app, state) {
  const targetPage = state?.page ?? 'list';
  if (targetPage === 'form' && currentPage !== 'form') {
    // Vorwärts-Navigation in ein bereits verlassenes Formular: Inhalt existiert nicht mehr.
    history.replaceState({ page: 'list' }, '');
    return;
  }
  if (currentPage === 'form' && hasPendingChanges() && !window.confirm(DISCARD_QUESTION)) {
    history.pushState({ page: 'form' }, '');
    return;
  }
  discardPendingChanges();
  showList(app);
}

async function showList(app) {
  currentPage = 'list';
  currentForm = null;
  suspendedDraft = null;
  updateHeader('list');
  await renderEntriesList(app, { onOpen: entry => openForm(app, entry) });
  restoreRowFocus(app);
}

function restoreRowFocus(app) {
  const entryId = returnFocusEntryId;
  returnFocusEntryId = null;
  if (entryId === null) return;
  const row = [...app.querySelectorAll('.entry-open')].find(button => button.dataset.entryId === String(entryId));
  row?.focus();
}

async function openForm(app, entry) {
  hideStatus();
  let templateHtml;
  try {
    templateHtml = await loadFormTemplate();
  } catch (error) {
    showStatus(error.message, 'error');
    return;
  }
  if (!isUnlocked()) return;
  history.pushState({ page: 'form' }, '');
  returnFocusEntryId = entry?.id ?? null;
  renderForm(app, templateHtml, entry, {});
  window.scrollTo({ top: 0 });
  preloadPdfResources();
}

function renderForm(app, templateHtml, entry, { initialStep = 0, hasChanges = false }) {
  currentPage = 'form';
  updateHeader('form');
  const onSaved = entryId => {
    returnFocusEntryId = entryId;
    history.back();
  };
  currentForm = initForm(app, templateHtml, entry, { onSaved, initialStep, hasChanges });
}

function loadFormTemplate() {
  if (!templatePromise) {
    templatePromise = fetch(FORM_TEMPLATE_URL)
      .then(response => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.text();
      })
      .catch(error => {
        templatePromise = null;
        throw new Error(`Formular konnte nicht geladen werden (${error.message}).`);
      });
  }
  return templatePromise;
}

function updateHeader(page) {
  const isForm = page === 'form';
  document.querySelector('.nav').dataset.page = page;
  document.getElementById('navBack').hidden = !isForm;
  document.getElementById('navAdd').hidden = isForm;
  document.getElementById('navDownload').hidden = !isForm;
  document.getElementById('navSave').hidden = !isForm;
  document.getElementById('navTitle').textContent = isForm ? 'Transfer' : 'Interhospitaltransfer';
}
