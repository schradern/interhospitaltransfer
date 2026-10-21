// Rückfrage im Seiteninhalt statt window.confirm(): Eingebettete Browser und Browser mit
// unterdrückten Systemdialogen beantworten confirm() sofort mit „Nein“, die Aktion bliebe wirkungslos.
const CONFIRM_VALUE = 'confirm';

let elementsCache = null;
let resolvePending = null;

// Löst mit true (bestätigt) oder false (Abbrechen, Esc, Klick neben den Dialog) auf.
export function askConfirmation({ message, confirmLabel, isDestructive = false }) {
  const { dialog, text, cancelButton, confirmButton } = getElements();
  cancelConfirmation();
  text.textContent = message;
  confirmButton.textContent = confirmLabel;
  confirmButton.classList.toggle('is-destructive', isDestructive);
  dialog.returnValue = '';
  dialog.showModal();
  cancelButton.focus();
  return new Promise(resolve => { resolvePending = resolve; });
}

// Offene Rückfrage sofort als abgebrochen beantworten (z. B. beim Sperren der App).
export function cancelConfirmation() {
  const { dialog } = getElements();
  if (!dialog.open) return;
  settle(false);
  dialog.close('');
}

function settle(isConfirmed) {
  const resolve = resolvePending;
  resolvePending = null;
  resolve?.(isConfirmed);
}

// Das close-Ereignis kommt asynchron; ist der Dialog bis dahin für eine neue Frage wieder offen, gilt es nicht mehr.
function handleClose(dialog) {
  if (dialog.open) return;
  settle(dialog.returnValue === CONFIRM_VALUE);
}

function bindEvents({ dialog, cancelButton, confirmButton }) {
  cancelButton.addEventListener('click', () => dialog.close(''));
  confirmButton.addEventListener('click', () => dialog.close(CONFIRM_VALUE));
  dialog.addEventListener('click', event => {
    if (event.target === dialog) dialog.close('');
  });
  // Esc schließt ohne Rückgabewert; close deckt alle Wege ab.
  dialog.addEventListener('close', () => handleClose(dialog));
}

function getElements() {
  if (elementsCache) return elementsCache;
  const byId = id => document.getElementById(id);
  elementsCache = {
    dialog: byId('confirmDialog'),
    text: byId('confirmMessage'),
    cancelButton: byId('confirmCancel'),
    confirmButton: byId('confirmAccept'),
  };
  bindEvents(elementsCache);
  return elementsCache;
}
