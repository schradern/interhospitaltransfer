import { renderEntriesList } from "./entryhandler.js";

export function setupNavigationHandlers() {
    const navBackButton = document.getElementById('navBack');
    const navAddButton = document.getElementById('navAdd');

    if (navBackButton && navAddButton) {
        navBackButton.addEventListener('click', () => navigateTo('list'));
        navAddButton.addEventListener('click', () => navigateTo('form'));
    }
}

export async function navigateTo(page, entryData = null) {
    const navBackButton = document.getElementById('navBack');
    const navAddButton = document.getElementById('navAdd');
    const navTitleText = document.getElementById('navTitle');
    const pdfDownloadButton = document.getElementById('navDownload');
    
    const app = document.getElementById('app');
    app.innerHTML = '';

    adaptNavigation(page);

    if (page === 'form') {
        fetch('./form-template.html')
            .then(response => response.text())
            .then(html => {
                document.getElementById('app').innerHTML = html;
                import('./formhandler.js').then(module => {
                    module.initFormHandler(0);
                    if (entryData) module.populateForm(entryData);
                });

                // Dynamically load PDF logic too!
                import('./pdfhandler.js').then(({ exportFormToPDF }) => {
                    const btn = document.getElementById('navDownload');
                    if (btn) {
                    btn.addEventListener('click', () => exportFormToPDF('transferForm'));
                    }
                });
                // const checkReady = () => {
                //     const formReady = document.getElementById('transferForm') && document.getElementById('nextBtn');
                //     if (!formReady) {
                //         return setTimeout(checkReady, 50);
                //     }
    
                //     // Erst dann importieren und initialisieren
                //     import('./formhandler.js')
                //       .then(module => module.initFormHandler())
                //       .catch(err => console.error('❌ Fehler beim Laden des Formhandlers:', err));
                // };
    
                // checkReady();
            })
            .catch(err => {
                app.innerHTML = '<p>Fehler beim Laden des Formulars.</p>';
                console.error('Formular konnte nicht geladen werden:', err);
            });
    } else if (page === 'list') {
        await renderEntriesList(app);
    } else {
        app.innerHTML = `<p>Page not found</p>`;
    }

    function adaptNavigation(page) {
        switch (page) {
            case 'form':
                navBackButton.classList.remove('hidden');
                navAddButton.classList.add('hidden');
                pdfDownloadButton.classList.remove('hidden');
                navTitleText.textContent  = 'Transfer';
                break;
            case 'list':
                navBackButton.classList.add('hidden');
                navAddButton.classList.remove('hidden');
                pdfDownloadButton.classList.add('hidden');
                navTitleText.textContent  = 'Interhospitaltransfer';
                break;
            default:
                navBackButton.classList.remove('hidden');
                navAddButton.classList.remove('hidden');
                pdfDownloadButton.classList.add('hidden');
                navTitleText.textContent  = 'Interhospitaltransfer';        
        }
    }
};