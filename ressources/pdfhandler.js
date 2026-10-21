import { readFieldLabels, readFormData, readSelectedOptionTexts } from './formdata.js';
import { findUnsupportedCharacters, loadPdfFonts, registerPdfFonts } from './pdffont.js';
import { createLayout } from './pdflayout.js';
import { writeTransferDocument } from './pdfcontent.js';
import { showStatus } from './status.js';

const PDF_LIBRARY_URL = './libs/jspdf.umd.min.js';
const BLOB_URL_LIFETIME_MS = 60_000;
const TIMESTAMP_FORMAT = new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeStyle: 'short' });

let resourcesPromise = null;
let loadedResources = null;

// Bibliothek und Schriften vorab laden, damit der Export synchron im Klick-Kontext laufen kann
// (sonst blockieren Safari und Popup-Blocker das neue Fenster).
export function preloadPdfResources() {
  if (!resourcesPromise) {
    resourcesPromise = Promise.all([loadLibrary(), loadPdfFonts()])
      .then(([JsPdf, fonts]) => {
        loadedResources = { JsPdf, fonts };
        return loadedResources;
      });
    resourcesPromise.catch(() => { resourcesPromise = null; });
  }
  return resourcesPromise;
}

function loadLibrary() {
  if (window.jspdf?.jsPDF) return Promise.resolve(window.jspdf.jsPDF);
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = PDF_LIBRARY_URL;
    script.onload = () => resolve(window.jspdf.jsPDF);
    script.onerror = () => reject(new Error('PDF-Bibliothek konnte nicht geladen werden.'));
    document.head.append(script);
  });
}

export async function exportFormToPDF(form) {
  if (loadedResources) {
    createAndPresentPdf(loadedResources, form);
    return;
  }
  showStatus('PDF wird vorbereitet …');
  try {
    createAndPresentPdf(await preloadPdfResources(), form);
  } catch (error) {
    showStatus(error.message, 'error');
  }
}

function createAndPresentPdf({ JsPdf, fonts }, form) {
  try {
    const data = readFormData(form);
    const createdAt = new Date();
    const doc = new JsPdf({ unit: 'mm', format: 'a4' });
    registerPdfFonts(doc, fonts);
    doc.setProperties({ title: 'Interhospitaltransfer - Erfassungsbogen' });
    const layout = createLayout(doc);
    layout.title('Arztbegleiteter Interhospitaltransfer', `Erfassungsbogen, erstellt am ${TIMESTAMP_FORMAT.format(createdAt)}`);
    writeTransferDocument(layout, data, { labels: readFieldLabels(form), optionTexts: readSelectedOptionTexts(form) });
    layout.footer('Erfassungsbogen Interhospitaltransfer · medizin.dev');
    presentPdf(doc.output('blob'), buildFileName(createdAt));
    warnAboutUnsupportedCharacters(data);
  } catch (error) {
    showStatus(`PDF konnte nicht erstellt werden (${error.message}).`, 'error');
  }
}

function warnAboutUnsupportedCharacters(data) {
  const unsupported = findUnsupportedCharacters(Object.values(data).flat());
  if (unsupported.length === 0) return;
  showStatus(`Hinweis: Diese Zeichen kann das PDF nicht darstellen, sie erscheinen als „?“: ${unsupported.join(' ')}. Bitte das PDF prüfen.`, 'warning');
}

// Dateiname ohne Patientennamen, damit dieser nicht in Download-Verläufen landet.
function buildFileName(date) {
  const pad = number => String(number).padStart(2, '0');
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  return `Transfer_${day}_${pad(date.getHours())}${pad(date.getMinutes())}.pdf`;
}

function presentPdf(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const pdfWindow = isStandalone ? null : window.open(url, '_blank');
  if (!pdfWindow) {
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.rel = 'noopener';
    document.body.append(link);
    link.click();
    link.remove();
  }
  setTimeout(() => URL.revokeObjectURL(url), BLOB_URL_LIFETIME_MS);
}
