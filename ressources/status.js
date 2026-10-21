const DISPLAY_DURATION_MS = 4000;

let hideTimer = null;

// Nicht-blockierende Rückmeldung (tone: info | warning | error). Hinweise, Fehler und Meldungen
// mit Aktion bleiben stehen, bis sie angeklickt oder durch die nächste Meldung ersetzt werden.
export function showStatus(message, tone = 'info', action = null) {
  const statusElement = document.getElementById('status');
  if (!statusElement) return;

  clearTimeout(hideTimer);
  statusElement.replaceChildren(message);
  statusElement.dataset.tone = tone;
  statusElement.hidden = false;

  if (tone !== 'info' || action) statusElement.append(createCloseButton());
  if (action) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'status-action';
    button.textContent = action.label;
    button.addEventListener('click', event => {
      event.stopPropagation();
      hideStatus();
      action.onActivate();
    });
    statusElement.append(button);
    return;
  }
  // Nur reine Informationen verschwinden von selbst; Hinweise und Fehler bleiben stehen.
  if (tone === 'info') {
    hideTimer = setTimeout(hideStatus, DISPLAY_DURATION_MS);
  }
}

function createCloseButton() {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'status-close';
  button.textContent = '×';
  button.setAttribute('aria-label', 'Meldung schließen');
  button.addEventListener('click', event => {
    event.stopPropagation();
    hideStatus();
  });
  return button;
}

export function hideStatus() {
  const statusElement = document.getElementById('status');
  if (statusElement) statusElement.hidden = true;
}
