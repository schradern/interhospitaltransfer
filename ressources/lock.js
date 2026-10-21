import { askConfirmation, cancelConfirmation } from './confirmdialog.js';
import { isCryptoAvailable } from './crypto.js';
import { fetchAllRecords } from './db.js';
import { RETENTION_DAYS } from './retention.js';
import { hideStatus } from './status.js';
import {
  BROADCAST_LOCK, BROADCAST_VAULT_CHANGED, MINIMUM_PASSPHRASE_LENGTH, broadcastLock, isUnlocked, isVaultConfigured,
  lockVault, onBroadcast, resetVault, setupVault, unlockVault,
} from './vault.js';

const MILLISECONDS_PER_MINUTE = 60_000;
const INACTIVITY_LIMIT_MINUTES = 15;
const INACTIVITY_LIMIT_MS = INACTIVITY_LIMIT_MINUTES * MILLISECONDS_PER_MINUTE;
const INACTIVITY_CHECK_INTERVAL_MS = 30_000;
const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'touchstart', 'wheel'];
const RESET_QUESTION = 'Alle gespeicherten Transfers auf diesem Gerät werden unwiderruflich gelöscht. Fortfahren?';

let mode = 'unlock';
let lastActivity = Date.now();
let isLocking = false;
let beforeLock = async () => {};

// onBeforeLock läuft, solange der Schlüssel noch vorhanden ist (z. B. Formular verschlüsselt zwischenspeichern).
export async function initLock({ onUnlocked, onReset, onBeforeLock }) {
  beforeLock = onBeforeLock;
  const elements = getElements();
  elements.form.addEventListener('submit', event => {
    event.preventDefault();
    submitPassphrase(elements, onUnlocked);
  });
  elements.resetButton.addEventListener('click', () => confirmReset(elements, onReset));
  document.getElementById('navLock').addEventListener('click', () => {
    broadcastLock();
    lockApp();
  });

  ACTIVITY_EVENTS.forEach(type => window.addEventListener(type, () => { lastActivity = Date.now(); }, { capture: true, passive: true }));
  setInterval(lockIfInactive, INACTIVITY_CHECK_INTERVAL_MS);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') lockIfInactive();
  });
  onBroadcast(handleBroadcast);

  await showLockScreen(elements);
}

export async function lockApp() {
  if (!isUnlocked() || isLocking) return;
  isLocking = true;
  const elements = getElements();
  elements.layout.hidden = true;
  elements.layout.inert = true;
  hideStatus();
  // Offene Rückfrage gilt als abgebrochen; sie läge sonst als modaler Dialog über dem Sperrbildschirm.
  cancelConfirmation();
  try {
    await beforeLock();
  } catch {
    // Zwischenspeichern gescheitert: Der Entwurf fehlt dann beim Entsperren, was resumeView meldet.
  } finally {
    lockVault();
    isLocking = false;
  }
  await showLockScreen(elements);
}

// Anderes Fenster: Sperren übernehmen bzw. bei geändertem Passwort den eigenen (ungültigen) Schlüssel verwerfen.
function handleBroadcast(message) {
  if (message !== BROADCAST_LOCK && message !== BROADCAST_VAULT_CHANGED) return;
  if (isUnlocked()) {
    lockApp();
    return;
  }
  const elements = getElements();
  if (message === BROADCAST_VAULT_CHANGED && !elements.lockScreen.hidden) showLockScreen(elements);
}

function lockIfInactive() {
  if (Date.now() - lastActivity > INACTIVITY_LIMIT_MS) lockApp();
}

async function showLockScreen(elements) {
  // Inhalte sofort verbergen; das Formular erst zeigen, wenn der Modus feststeht.
  elements.layout.hidden = true;
  elements.layout.inert = true;
  elements.lockScreen.hidden = true;
  elements.form.reset();
  showError(elements, '');

  if (!isCryptoAvailable()) {
    showUnavailable(elements, 'Sichere Verbindung erforderlich', 'Die Verschlüsselung der Daten ist nur über HTTPS möglich. Bitte die App über https:// aufrufen.');
    return;
  }
  let hasExistingEntries = false;
  try {
    mode = (await isVaultConfigured()) ? 'unlock' : 'setup';
    hasExistingEntries = mode === 'setup' && (await fetchAllRecords()).length > 0;
  } catch (error) {
    showUnavailable(elements, 'Lokale Daten nicht erreichbar', `${error.message} Bitte die Seite neu laden.`);
    return;
  }
  describeMode(elements, hasExistingEntries);
  elements.lockScreen.hidden = false;
  elements.passphrase.focus();
}

function describeMode(elements, hasExistingEntries) {
  const isSetup = mode === 'setup';
  elements.form.querySelectorAll('input, button').forEach(control => { control.disabled = false; });
  elements.title.textContent = isSetup ? 'Daten schützen' : 'Gesperrt';
  elements.description.textContent = isSetup
    ? `Legen Sie ein Passwort fest (mindestens ${MINIMUM_PASSPHRASE_LENGTH} Zeichen, besser ein Satz aus mehreren Wörtern). Alle Einträge werden damit auf diesem Gerät verschlüsselt gespeichert${hasExistingEntries ? ', auch die bereits vorhandenen' : ''}. Ohne Passwort sind die Daten nicht wiederherstellbar.`
    : 'Passwort eingeben, um die gespeicherten Transfers zu öffnen.';
  elements.hint.textContent = `Einträge werden ${RETENTION_DAYS} Tage nach der letzten Änderung automatisch gelöscht, sobald die App das nächste Mal läuft (beim Start und stündlich). Die App sperrt sich nach ${INACTIVITY_LIMIT_MINUTES} Minuten ohne Eingabe. Auf gemeinsam genutzten Geräten das Passwort nicht im Browser speichern.`;
  elements.confirmField.hidden = !isSetup;
  elements.resetButton.hidden = isSetup;
  elements.passphrase.autocomplete = isSetup ? 'new-password' : 'current-password';
  elements.submit.textContent = isSetup ? 'Passwort festlegen' : 'Entsperren';
}

function showUnavailable(elements, title, description) {
  elements.title.textContent = title;
  elements.description.textContent = description;
  elements.hint.textContent = '';
  elements.form.querySelectorAll('input, button').forEach(control => { control.disabled = true; });
  elements.lockScreen.hidden = false;
}

async function submitPassphrase(elements, onUnlocked) {
  const passphrase = elements.passphrase.value;
  if (passphrase.length < MINIMUM_PASSPHRASE_LENGTH) {
    showError(elements, `Das Passwort muss mindestens ${MINIMUM_PASSPHRASE_LENGTH} Zeichen lang sein.`);
    return;
  }
  if (mode === 'setup' && passphrase !== elements.confirm.value) {
    showError(elements, 'Die Passwörter stimmen nicht überein.');
    return;
  }

  setBusy(elements, true);
  try {
    if (mode === 'setup') await setupVault(passphrase);
    else await unlockVault(passphrase);
    elements.form.reset();
    elements.lockScreen.hidden = true;
    elements.layout.hidden = false;
    elements.layout.inert = false;
    lastActivity = Date.now();
    await onUnlocked();
  } catch (error) {
    showError(elements, error.message);
    elements.passphrase.select();
  } finally {
    setBusy(elements, false);
  }
}

async function confirmReset(elements, onReset) {
  const isConfirmed = await askConfirmation({ message: RESET_QUESTION, confirmLabel: 'Löschen', isDestructive: true });
  if (!isConfirmed) return;
  try {
    await resetVault();
    onReset();
  } catch (error) {
    showError(elements, error.message);
  }
}

function setBusy(elements, isBusy) {
  elements.submit.disabled = isBusy;
  elements.form.setAttribute('aria-busy', String(isBusy));
  if (isBusy) elements.submit.textContent = 'Bitte warten …';
  else elements.submit.textContent = mode === 'setup' ? 'Passwort festlegen' : 'Entsperren';
}

function showError(elements, message) {
  elements.error.textContent = message;
  elements.error.hidden = message === '';
}

function getElements() {
  const byId = id => document.getElementById(id);
  return {
    layout: document.querySelector('.layout'),
    lockScreen: byId('lockScreen'),
    form: byId('lockForm'),
    title: byId('lockTitle'),
    description: byId('lockDescription'),
    hint: byId('lockHint'),
    passphrase: byId('passphrase'),
    confirm: byId('passphraseConfirm'),
    confirmField: byId('confirmField'),
    error: byId('lockError'),
    submit: byId('lockSubmit'),
    resetButton: byId('resetVault'),
  };
}
