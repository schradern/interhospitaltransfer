import { openDatabase } from './ressources/db.js';
import { discardPendingChanges } from './ressources/formhandler.js';
import { initLock } from './ressources/lock.js';
import { initNavigation, refreshView, resumeView, suspendView } from './ressources/navigation.js';
import { RETENTION_DAYS, purgeExpiredEntries } from './ressources/retention.js';
import { showStatus, hideStatus } from './ressources/status.js';

const PURGE_INTERVAL_MS = 60 * 60_000;
const SKIP_WAITING_MESSAGE = 'skip-waiting';

let isNavigationReady = false;
let serviceWorkerRegistration = null;

setupChrome();
registerServiceWorker();
start();

async function start() {
  try {
    await openDatabase();
    await purgeExpired();
    setInterval(purgeExpired, PURGE_INTERVAL_MS);
    await initLock({ onUnlocked: handleUnlocked, onReset: handleReset, onBeforeLock: suspendView });
  } catch (error) {
    const layout = document.querySelector('.layout');
    layout.hidden = false;
    layout.inert = false;
    document.getElementById('lockScreen').hidden = true;
    const message = document.createElement('p');
    message.className = 'empty-state';
    message.textContent = `${error.message} Im privaten Modus oder bei blockiertem Website-Speicher können keine Einträge gespeichert werden.`;
    document.getElementById('app').replaceChildren(message);
  }
}

async function handleUnlocked() {
  if (isNavigationReady) {
    await resumeView();
  } else {
    isNavigationReady = true;
    initNavigation();
  }
  offerWaitingUpdate();
}

function handleReset() {
  discardPendingChanges();
  window.location.reload();
}

async function purgeExpired() {
  try {
    const deletedCount = await purgeExpiredEntries();
    if (deletedCount === 0) return;
    showStatus(`${deletedCount === 1 ? '1 Eintrag' : `${deletedCount} Einträge`} älter als ${RETENTION_DAYS} Tage automatisch gelöscht.`);
    if (isNavigationReady) refreshView();
  } catch (error) {
    showStatus(`Automatische Löschung fehlgeschlagen: ${error.message}`, 'error');
  }
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  const hadController = Boolean(navigator.serviceWorker.controller);
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    // Erstinstallation braucht keinen Neustart; nur ein echtes Update lädt neu.
    if (hadController) window.location.reload();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') offerWaitingUpdate();
  });
  navigator.serviceWorker.register('./service-worker.js')
    .then(registration => {
      serviceWorkerRegistration = registration;
      watchForUpdate(registration);
    })
    .catch(error => {
      const reason = error.name === 'SecurityError' ? 'Browser-Einstellungen' : 'Netzwerk oder Browser';
      showStatus(`Offline-Nutzung in diesem Browser nicht verfügbar (${reason}).`);
    });
}

function watchForUpdate(registration) {
  offerWaitingUpdate();
  registration.addEventListener('updatefound', () => {
    const worker = registration.installing;
    worker?.addEventListener('statechange', () => {
      if (worker.state === 'installed') offerWaitingUpdate();
    });
  });
}

// Erneut anbieten nach dem Entsperren und beim Zurückkehren zur App, falls die Meldung überdeckt wurde.
function offerWaitingUpdate() {
  const worker = serviceWorkerRegistration?.waiting;
  if (!worker || !navigator.serviceWorker.controller) return;
  showStatus('Neue Version verfügbar.', 'info', {
    label: 'Aktualisieren',
    onActivate: () => worker.postMessage(SKIP_WAITING_MESSAGE),
  });
}

function setupChrome() {
  const legalDialog = document.getElementById('legalDialog');
  document.querySelectorAll('.open-legal').forEach(button => {
    button.addEventListener('click', () => legalDialog.showModal());
  });
  document.getElementById('closeLegal').addEventListener('click', () => legalDialog.close());
  legalDialog.addEventListener('click', event => {
    if (event.target === legalDialog) legalDialog.close();
  });
  document.getElementById('status').addEventListener('click', hideStatus);
}
