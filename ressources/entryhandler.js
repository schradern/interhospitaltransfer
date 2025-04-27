import { getDB } from './db.js';
import { navigateTo } from './navigation.js';
import { populateForm } from './formhandler.js';

export async function renderEntriesList(appElement) {
  const db = await getDB();
  const tx = db.transaction(['items'], 'readonly');
  const store = tx.objectStore('items');
  const request = store.getAll();

  request.onsuccess = () => {
    const items = request.result;

    const entryHTML = items.length > 0
      ? items.map((item, index) =>
          `<div class="swipe-container" data-id="${item.id || index}">
                <div class="delete-btn">Löschen</div>
                <div class="entry">
                    <p><b>${item.patientenname || 'Unbenannter Eintrag'}</b><br>
                    <small>${new Date(item.created || item.updated).toLocaleString()}</small></p>
                    <button class="delete-inline">Löschen</button>
                </div>
            </div>`
        ).join('')
      : `<div class="entry empty"><p>Noch keine gespeicherten Transfers.</p></div>`;

    appElement.innerHTML = `<div id="entries">${entryHTML}</div>`;

    document.querySelectorAll('.swipe-container').forEach(container => {
        const entry = container.querySelector('.entry');
        const id = Number(container.dataset.id);
  
        let startX = 0;
        let currentX = 0;
        let dragging = false;
        let swiped = false;
        let tappedDelete = false;
        const isMobile = 'ontouchstart' in window;
  
        // === Swipe only on mobile ===
        if (isMobile) {
          entry.addEventListener('touchstart', e => {
            startX = e.touches[0].clientX;
            dragging = true;
            swiped = false;
            entry.style.transition = 'none';
          });
  
          entry.addEventListener('touchmove', e => {
            if (!dragging) return;
            currentX = e.touches[0].clientX - startX;
            if (currentX < 0) {
              entry.style.transform = `translateX(${currentX}px)`;
            }
          });
  
          entry.addEventListener('touchend', () => {
            dragging = false;
            entry.style.transition = 'transform 0.2s ease';
  
            if (currentX < -60) {
              entry.style.transform = `translateX(-100px)`;
              swiped = true;
            } else {
              entry.style.transform = 'translateX(0)';
            }
  
            currentX = 0;
          });
        }
  
        // === Hide swipe if tapping elsewhere ===
        document.addEventListener('touchstart', e => {
          if (!entry.contains(e.target)) {
            entry.style.transform = 'translateX(0)';
          }
        });
  
        // === Tap on entry (open only if not deleting) ===
        entry.addEventListener('click', async () => {
          if (swiped || tappedDelete) {
            swiped = false;
            tappedDelete = false;
            return;
          }
  
          const db = await getDB();
          const tx = db.transaction('items', 'readonly');
          const store = tx.objectStore('items');
          const request = store.get(id);
  
          request.onsuccess = async () => {
            const item = request.result;
            if (!item) return;
            await navigateTo('form', item);
          };
        });
  
        // === Delete button (desktop inline)
        const deleteInline = container.querySelector('.delete-inline');
        deleteInline?.addEventListener('click', async (e) => {
          e.stopPropagation();
          tappedDelete = true;
          await deleteEntry(id, container);
        });
  
        // === Delete button (iOS red area)
        const deleteBtn = container.querySelector('.delete-btn');
        deleteBtn?.addEventListener('touchstart', (e) => {
          e.stopPropagation();
          tappedDelete = true;
        });
  
        deleteBtn?.addEventListener('click', async (e) => {
          e.stopPropagation();
          tappedDelete = true;
          await deleteEntry(id, container);
        });
  
        async function deleteEntry(id, container) {
          const db = await getDB();
          const tx = db.transaction('items', 'readwrite');
          await tx.objectStore('items').delete(id);
          await tx.complete;
          container.remove();
          console.log('🗑️ gelöscht:', id);
        }
      });
    };
  

  request.onerror = () => {
    appElement.innerHTML = `<div class="entry empty">Failed to load entries.</div>`;
  };
}

export async function editEntry(id) {
    const db = await getDB();
    const tx = db.transaction('items', 'readonly');
    const store = tx.objectStore('items');
    const request = store.get(id);
  
    request.onsuccess = async () => {
      const item = request.result;
      if (!item) return;
  
      await navigateTo('form');
      setTimeout(() => {
        // Warte kurz bis DOM fertig
        populateForm(item);
      }, 100); // ggf. Timeout verlängern, wenn nötig
    };
  
    request.onerror = () => {
      console.error('❌ Fehler beim Laden des Eintrags');
    };
  }
