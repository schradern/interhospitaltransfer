import { getDB } from './ressources/db.js';
import { setupNavigationHandlers, navigateTo } from './ressources/navigation.js';

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const db = await getDB();
        // You can now use db here
        console.log('DB opened', db);
        setupNavigationHandlers();
        navigateTo('list');
    
    } catch (err) {
        alert(err);
    }
});
