const MAXIMUM_DRAG_PX = 140;
const OPEN_THRESHOLD_PX = 60;
const DIRECTION_LOCK_PX = 8;

// Wischgeste nach links legt den Löschen-Button frei (Abkürzung für Touch-Geräte).
// Zugängliche Alternative ohne Geste ist der Bearbeiten-Modus der Liste.
export function enableSwipeToDelete(list) {
  const gesture = { row: null, startX: 0, startY: 0, offsetX: 0, isHorizontal: null };
  list.querySelectorAll('.delete-btn').forEach(button => {
    button.setAttribute('aria-hidden', 'true');
    button.tabIndex = -1;
  });
  list.addEventListener('touchstart', event => startSwipe(list, gesture, event), { passive: true });
  list.addEventListener('touchmove', event => moveSwipe(gesture, event), { passive: true });
  list.addEventListener('touchend', () => finishSwipe(gesture));
  list.addEventListener('touchcancel', () => finishSwipe(gesture));
}

function startSwipe(list, gesture, event) {
  const row = event.target.closest('.entry');
  list.querySelectorAll('.entry.is-swiped').forEach(openRow => {
    if (openRow !== row) openRow.classList.remove('is-swiped');
  });
  if (!row) return;
  Object.assign(gesture, {
    row, startX: event.touches[0].clientX, startY: event.touches[0].clientY, offsetX: 0, isHorizontal: null,
  });
}

function moveSwipe(gesture, event) {
  if (!gesture.row) return;
  const deltaX = event.touches[0].clientX - gesture.startX;
  const deltaY = event.touches[0].clientY - gesture.startY;
  if (gesture.isHorizontal === null && Math.max(Math.abs(deltaX), Math.abs(deltaY)) > DIRECTION_LOCK_PX) {
    gesture.isHorizontal = Math.abs(deltaX) > Math.abs(deltaY);
  }
  if (!gesture.isHorizontal) return;
  gesture.offsetX = Math.max(-MAXIMUM_DRAG_PX, Math.min(0, deltaX));
  gesture.row.classList.add('is-dragging');
  gesture.row.style.transform = `translateX(${gesture.offsetX}px)`;
}

function finishSwipe(gesture) {
  if (!gesture.row) return;
  gesture.row.classList.remove('is-dragging');
  gesture.row.style.transform = '';
  if (gesture.isHorizontal) gesture.row.classList.toggle('is-swiped', gesture.offsetX < -OPEN_THRESHOLD_PX);
  gesture.row = null;
}
