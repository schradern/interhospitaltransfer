import { askConfirmation } from './confirmdialog.js';
import { loadEntries, removeEntry } from './entrystore.js';
import { expiryOf, lastChangeOf } from './retention.js';
import { enableSwipeToDelete } from './swipe.js';
import { showStatus } from './status.js';
import { isUnlocked } from './vault.js';

// Kurzformate ohne Jahr: bei 7 Tagen Speicherdauer eindeutig und auch auf schmalen Bildschirmen vollständig lesbar.
const DATE_FORMAT = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
const DAY_FORMAT = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit' });
const DELETE_QUESTION = 'Diesen Eintrag endgültig löschen?';
const UNREADABLE_MESSAGE = 'Dieser Eintrag kann nicht entschlüsselt werden und lässt sich nur löschen.';

export async function renderEntriesList(container, { onOpen }) {
  container.replaceChildren(createMessage('Einträge werden geladen …'));

  let entries;
  try {
    entries = await loadEntries();
  } catch (error) {
    if (isUnlocked()) container.replaceChildren(createMessage(error.message));
    return;
  }
  // Während des Entschlüsselns gesperrt: keine Klartexte mehr in die Seite schreiben.
  if (!isUnlocked()) return;

  if (entries.length === 0) {
    container.replaceChildren(createEmptyMessage());
    return;
  }

  entries.sort((first, second) => lastChangeOf(second) - lastChangeOf(first));
  const list = document.createElement('ul');
  list.className = 'entries';
  list.setAttribute('aria-label', 'Gespeicherte Transfers');
  list.append(...entries.map(entry => createEntryItem(entry, {
    onOpen,
    onDelete: item => confirmAndDelete(entry, item, container),
  })));
  container.replaceChildren(createListToolbar(list, entries.length), list);
  enableSwipeToDelete(list);
}

// Löschen nur im Bearbeiten-Modus sichtbar: zwei bewusste Schritte plus Rückfrage, ohne Wischgeste bedienbar.
function createListToolbar(list, entryCount) {
  const toolbar = document.createElement('div');
  toolbar.className = 'list-toolbar';
  const count = createTextElement('span', describeCount(entryCount));
  count.className = 'list-count';
  const editButton = createButton('list-edit', 'Bearbeiten', 'Einträge bearbeiten');
  editButton.setAttribute('aria-pressed', 'false');
  editButton.addEventListener('click', () => {
    const isEditing = list.classList.toggle('is-editing');
    editButton.textContent = isEditing ? 'Fertig' : 'Bearbeiten';
    editButton.setAttribute('aria-pressed', String(isEditing));
  });
  toolbar.append(count, editButton);
  return toolbar;
}

function describeCount(entryCount) {
  return entryCount === 1 ? '1 gespeicherter Transfer' : `${entryCount} gespeicherte Transfers`;
}

function createEntryItem(entry, { onOpen, onDelete }) {
  const title = titleOf(entry);
  const item = document.createElement('li');
  item.className = 'swipe-container';

  const swipeDeleteButton = createButton('delete-btn', 'Löschen', `${title} löschen`);
  const row = document.createElement('div');
  row.className = 'entry';

  const openButton = createButton('entry-open', '', `${title} öffnen`);
  openButton.append(
    createTextElement('strong', title),
    createTextElement('small', describeRoute(entry)),
    createTextElement('small', describeTimestamp(entry)),
  );
  const inlineDeleteButton = createButton('delete-inline', 'Löschen', `${title} löschen`);

  openButton.addEventListener('click', () => {
    if (row.classList.contains('is-swiped')) row.classList.remove('is-swiped');
    else if (item.closest('.entries')?.classList.contains('is-editing')) return;
    else if (entry.isUnreadable) showStatus(UNREADABLE_MESSAGE, 'error');
    else onOpen(entry);
  });
  swipeDeleteButton.addEventListener('click', () => onDelete(item));
  inlineDeleteButton.addEventListener('click', () => onDelete(item));

  row.append(openButton, inlineDeleteButton);
  item.append(swipeDeleteButton, row);
  return item;
}

async function confirmAndDelete(entry, item, container) {
  // Ohne Patientennamen: Die Rückfrage bleibt bis zur Antwort sichtbar.
  const isConfirmed = await askConfirmation({ message: DELETE_QUESTION, confirmLabel: 'Löschen', isDestructive: true });
  if (!isConfirmed) {
    item.querySelector('.entry')?.classList.remove('is-swiped');
    return;
  }
  try {
    await removeEntry(entry.id);
    item.remove();
    showStatus('Eintrag gelöscht.');
    const remaining = container.querySelectorAll('.swipe-container').length;
    if (remaining === 0) container.replaceChildren(createEmptyMessage());
    else container.querySelector('.list-count').textContent = describeCount(remaining);
  } catch (error) {
    showStatus(error.message, 'error');
  }
}

function titleOf(entry) {
  if (entry.isUnreadable) return 'Nicht lesbarer Eintrag';
  return entry.patientenname || 'Unbenannter Eintrag';
}

function describeRoute(entry) {
  const source = entry.quellklinik_name || '–';
  const target = entry.zielklinik_name || '–';
  return source === '–' && target === '–' ? 'Keine Klinikangaben' : `${source} → ${target}`;
}

function describeTimestamp(entry) {
  return `Geändert ${DATE_FORMAT.format(lastChangeOf(entry))} · Löschung ab ${DAY_FORMAT.format(expiryOf(entry))}`;
}

function createButton(className, text, accessibleName) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  button.textContent = text;
  button.setAttribute('aria-label', accessibleName);
  return button;
}

function createTextElement(tagName, text) {
  const element = document.createElement(tagName);
  element.textContent = text;
  return element;
}

function createMessage(text) {
  const message = createTextElement('p', text);
  message.className = 'empty-state';
  return message;
}

function createEmptyMessage() {
  return createMessage('Noch keine gespeicherten Transfers. Mit „Neu“ einen Transfer anlegen.');
}
