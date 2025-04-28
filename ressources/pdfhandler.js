// KOMPLETTE, STRUKTURIERTE PDF-ERZEUGUNG - alles in EINER SEITE, medizinisch sinnvoll strukturiert
export function exportFormToPDF(formId = "transferForm") {
  const { jsPDF } = window.jspdf;
  const form = document.getElementById(formId);
  const formData = new FormData(form);
  const data = {};

  const decimalFields = [
    "gewicht", "spo2", "af", "fio2", "peep", "pinsp", "vt", "amv", "asb",
    "rr_sys", "rr_dias", "hr",
    "noradrenalin_dosis", "adrenalin_dosis", "dopamin_dosis", "dobutamin_dosis",
    "hb", "hkt", "pao2", "paco2", "ph", "lactat", "hco3", "be", "na", "k", "cl", "ca"
  ];
  
  function normalizeDecimalInput(value) {
    if (typeof value !== 'string') return value;
    const normalized = value.replace(',', '.');
    const number = parseFloat(normalized);
    return isNaN(number) ? null : number;
  }

  for (const [key, value] of formData.entries()) {
    let val = value;

    if (decimalFields.includes(key)) {
      val = normalizeDecimalInput(val);
    }

    if (data[key]) {
      if (!Array.isArray(data[key])) data[key] = [data[key]];
      data[key].push(val);
    } else {
      data[key] = val;
    }
  }

  const doc = new jsPDF();
  let y = 10;
  const marginLeft = 10;
  const labelWidth = 40;
  const lineHeight = 5;
  const colSpacing = 90;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const safe = (v) => v || "-";

  const drawDivider = () => {
    y += 2;
    doc.setDrawColor(200);
    doc.line(marginLeft, y, pageWidth - marginLeft, y);
    y += 4;
  };

  const addSection = (title) => {
    drawDivider();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(title, marginLeft, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
  };

  const addRow = (pairs) => {
    if (y > 280) { doc.addPage(); y = 10; }
    pairs.filter(p => p[1] !== undefined && p[1] !== "").forEach(([label, value], i) => {
      const x = marginLeft + (i * colSpacing);
      doc.setFont("helvetica", "bold");
      doc.text(label + ":", x, y);
      doc.setFont("helvetica", "normal");
      doc.text(String(value), x + labelWidth, y);
    });
    y += lineHeight;
  };

  const addMultiline = (label, text) => {
    if (!text) return;
    if (y > 275) { doc.addPage(); y = 10; }
  
    const textX = marginLeft + labelWidth; // rechter Startpunkt für Wert
    const availableWidth = pageWidth - marginLeft - textX; // verfügbare Breite ab Wert
  
    doc.setFont("helvetica", "bold");
    doc.text(label + ":", marginLeft, y);
  
    doc.setFont("helvetica", "normal");
    const split = doc.splitTextToSize(text, availableWidth);
    doc.text(split, textX, y);
  
    y += split.length * lineHeight;
  };

  const addMultilinePairs = (label, textOrArray) => {
    if (!textOrArray) return;
    if (y > 275) { doc.addPage(); y = 10; }
  
    const textX = marginLeft + labelWidth;
    const availableWidth = pageWidth - marginLeft - textX;
  
    doc.setFont("helvetica", "bold");
    doc.text(label + ":", marginLeft, y);
  
    let entries = [];
  
    if (Array.isArray(textOrArray)) {
      entries = textOrArray;
    } else {
      entries = textOrArray.split(',').map(e => e.trim());
    }
  
    const parsedEntries = entries.map(e => {
      const breakLine = e.startsWith("|BREAK|");
      const cleaned = breakLine ? e.replace("|BREAK|", "") : e;
      const parts = cleaned.split(':');
      const hasLabel = parts.length > 1;
      const lbl = hasLabel ? parts[0].trim() : "";
      const val = hasLabel ? parts.slice(1).join(":").trim() : cleaned.trim();
      return { label: lbl, value: val, breakLine };
    }).filter(p => p.value !== undefined && p.value !== "");

    //y += lineHeight; // move below the section label
    let currentX = textX;
  
    parsedEntries.forEach(({ label, value, breakLine }, index) => {
      const isLast = index === parsedEntries.length - 1;
  
      if (breakLine) {
        currentX = textX;
        y += lineHeight;
      }
  
      if (label) {
        doc.setFont("helvetica", "bold");
        doc.text(label + ":", currentX, y);
        const labelWidth = doc.getTextWidth(label + ": ");
        currentX += labelWidth;
  
        doc.setFont("helvetica", "normal");
        doc.text(value + (isLast ? "" : ", "), currentX, y);
        const valueWidth = doc.getTextWidth(value + (isLast ? "" : ", "));
        currentX += valueWidth + 2;
      } else {
        // No label, just value
        doc.setFont("helvetica", "normal");
        doc.text(value, currentX, y);
        const valueWidth = doc.getTextWidth(value);
        currentX += valueWidth + 2;
      }
  
      if (currentX > pageWidth - marginLeft) {
        currentX = textX;
        y += lineHeight;
      }
    });
  
    y += lineHeight;
  };

  const addSmallTable = (pairs) => {
    if (y > 275) { doc.addPage(); y = 10; }
  
    const tableStartX = marginLeft + labelWidth; // Start aligned with value text
    const availableWidth = pageWidth - tableStartX - marginLeft;
    const colsPerRow = 6; // Still 6 columns (adjust if needed)
    const cellWidth = availableWidth / colsPerRow;
    
    pairs = pairs.filter(p => p && p[1]);
  
    for (let i = 0; i < pairs.length; i += colsPerRow) {
      const row = pairs.slice(i, i + colsPerRow);
      row.forEach(([label, value], index) => {
        const x = tableStartX + index * cellWidth;
        doc.setFont("helvetica", "bold");
        doc.text(`${label}:`, x, y);
        doc.setFont("helvetica", "normal");
        doc.text(String(value), x + labelWidth / 2.5, y); // optional fine-tuning
      });
      y += lineHeight;
    }
  };

  const addSpace = (height = lineHeight) => {
    y += height;
  };

  const check = (v) => (v === true || v === "ja") ? "Ja" : (v === "nein" ? "Nein" : "-");

  // Kopfzeile
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Arztbegleiteter Interhospitaltransfer", pageWidth/2, y, {align: 'center'});
  y += 8;

  const irgMap = {
    "1": "IRG 1 – Kein besonderes Risiko",
    "2": "IRG 2 – Potenziell infektiös",
    "3": "IRG 3 – Bestätigte Infektion",
    "4": "IRG 4 – Hochkontagiös / Meldepflicht"
  };
  
  const irgText = irgMap[data.irg] || "-";
  // Patientendaten
  addSection("Patient");
  addRow([["Name", safe(data.patientenname)], ["Geburtsdatum", safe(data.geburtsdatum)]]);
  addRow([["Gewicht", data.gewicht ? `${data.gewicht} kg` : "-"], ["IRG", irgText]]);

  // Transferdetails
  addSection("Transfer");
  addRow([["Quellklinik", safe(data.quellklinik_name)], ["Zielklinik", safe(data.zielklinik_name)]]);
  addRow([["Station", safe(data.quellklinik_station)], ["Station", safe(data.zielklinik_station)]]);
  addRow([["Telefon", safe(data.quellklinik_tel)], ["Telefon", safe(data.zielklinik_tel)]]);
  if (data.quellklinik_ansprechpartner || data.zielklinik_ansprechpartner) {
    addRow([["Ansprechpartner", safe(data.quellklinik_ansprechpartner)], ["Ansprechpartner", safe(data.zielklinik_ansprechpartner)]])
  }

  if ((data.landeplatz_quellklinik === 'on' || data.landeplatz_zielklinik === 'on') || (data.transportmittel === 'RTH' || data.transportmittel === 'ITH')) {
    let lpq = data.landeplatz_quellklinik === 'on' 
      ? 'vorhanden' + (data.rtw_quellklinik === 'ja' ? ', RTW erforderlich' : '') 
      : 'nicht vorhanden';
  
    let lpz = data.landeplatz_zielklinik === 'on' 
      ? 'vorhanden' + (data.rtw_zielklinik === 'ja' ? ', RTW erforderlich' : '') 
      : 'nicht vorhanden';
  
    addRow([
      ["Landeplatz", lpq],
      ["Landeplatz", lpz]
    ]);
  }
  addSpace(1.5);
  addRow([
    ["Verlegungsgrund", safe(data.verlegungsgrund)],
    ["Aufnahme", (data.aufnahme_zugesichert === "ja") ? "Zugesichert" : "Zusage ausstehend"]
  ]);
  let trtxt = "";
  const tb = (data.transport_boden || "").toLowerCase();
  if (tb === "ja") {
    trtxt = "Bodengebundener Transport vertretbar";
  } else if (tb === "nein") {
    trtxt = "Bodengebundener Transport NICHT vertretbar";
  } else if (tb.includes("luftrettung")) {
    trtxt = "Bodengebunden, nur bei fehlender Luftrettung";
  }
  addRow([
    ["Dringlichkeit", (data.dringlichkeit && data.dringlichkeit !== "Innerhalb von 2 Stunden" && data.zeitfenster) 
      ? `${safe(data.dringlichkeit)}, ${safe(data.zeitfenster)}`
      : safe(data.dringlichkeit)
    ],
    ["Transport", trtxt]
  ]);
  // Hintergrund
  addSection("Medizinischer Hintergrund");
  const clinic_date_row = [["In Klinik seit", safe(data.klinik_seit)]];
  if (data.intensiv_seit) clinic_date_row.push(["Intensiv seit", safe(data.intensiv_seit)]);
  addRow(clinic_date_row);
  addMultiline("Verlegungsdiagnose", safe(data.verlegungsdiagnose));
  if (data.zusatzdiagnosen) {
    addMultiline("Weitere Diagnosen", safe(data.zusatzdiagnosen));
  }
  // Zustand
  addSection("Klinischer Zustand");
  let neuroEntries = [`Bewusstsein:${safe(data.bewusstsein)}`];
  if (data.gcs) {
    neuroEntries.push(`GCS:${safe(data.gcs)}`);
  }
  if (data.bewFreitext) {
    neuroEntries.push(`|BREAK|${safe(data.bewFreitext)}`);
  }
  addMultilinePairs("Neurologie", neuroEntries);
  addSpace(1.5);
  let atmuEntries = [];
if (data.beatmet === 'on') {
  // Beatmet (ventilated)
  atmuEntries.push(`SPO2:${safe(data.spo2)} %`);
  const brthModMap = {
    "druck": "Druckkontrolliert",
    "volumen": "Volumenkontrolliert",
    "assistiert": "Assistiert",
    "niv": "Nicht invasiv"
  };
  
  const brthModTx = brthModMap[data.beatmungs_modus] || "-";

  if (data.beatmungs_modus) {
    atmuEntries.push(`|BREAK|Ventilation:${brthModTx}`);
  }

  if (data.fio2) {
    atmuEntries.push(`FiO2:${safe(data.fio2)}`);
  }
  if (data.peep) {
    atmuEntries.push(`PEEP:${safe(data.peep)} cmH2O`);
  }

  const mode = (data.beatmungs_modus || "").toLowerCase();

  if (mode === "druck") {
    if (data.pinsp) {
      atmuEntries.push(`Pinsp:${safe(data.pinsp)} cmH2O`);
    }
  }
  if (mode === "volumen") {
    if (data.vt) {
      atmuEntries.push(`Tidalvolumen:${safe(data.vt)} ml`);
    }
    if (data.amv) {
      atmuEntries.push(`AMV:${safe(data.amv)} l/min`);
    }
  }
  if (mode === "niv") {
    if (data.asb) {
      atmuEntries.push(`ASB:${safe(data.asb)} cmH2O`);
    }
    if (data.af_niv) {
      atmuEntries.push(`f:${safe(data.af_niv)} /min`);
    }
  }

  if (data.ie) {
    atmuEntries.push(`I/E:${safe(data.ie)}`);
  }
  if (data.atemweg) {
    atmuEntries.push(`|BREAK|Atemweg:${safe(data.atemweg)}`);
  }
  if (data.awFreitext) {
    atmuEntries.push(`|BREAK|${safe(data.awFreitext)}`);
  }

} else {
  // Spontan atmend
  atmuEntries.push(`SPO2:${safe(data.spo2)}%`);

  if (data.o2_l_min && Number(data.o2_l_min) > 0) {
    atmuEntries.push(`O2:${safe(data.o2_l_min)} l/min`);
  }
  if (data.af) {
    atmuEntries.push(`AF:${safe(data.af)} /min`);
  }
  if (data.atemweg && data.atemweg !== "Keine Atemwegssicherung") {
    atmuEntries.push(`|BREAK|Atemweg:${safe(data.atemweg)}`);
  }
  if (data.awFreitext) {
    atmuEntries.push(`|BREAK|${safe(data.awFreitext)}`);
  }
}
  addMultilinePairs("Atmung", atmuEntries);
  addSpace(1.5);

  let kreislaufEntries = [];

  // Basic: Blood pressure and heart rate
  let rrText = "";
  if (data.rr_sys) {
    rrText += `${safe(data.rr_sys)}`;
  }
  if (data.rr_dias) {
    rrText += `/${safe(data.rr_dias)}`;
  }
  if (data.rr_sys && data.rr_dias) {
    const rr_mean = Math.round((Number(data.rr_sys) + 2 * Number(data.rr_dias)) / 3);
    rrText += ` (${rr_mean}) mmHg`;
  } else if (data.rr_sys) {
    rrText += ` mmHg`;
  }

  if (rrText) {
    kreislaufEntries.push(`RR: ${rrText}`);
  }

  if (data.hr) {
    kreislaufEntries.push(`HF: ${safe(data.hr)} /min`);
  }

  // Akute Blutung
  if (data.akute_blutung) {
    kreislaufEntries.push(`|BREAK|Akute Blutung!`);
  }

  // Katecholamine
  if (data.katego_toggle) {  // NOT toggleKatecholamin anymore
    const katecholamine = [
      data.noradrenalin_dosis && `Noradrenalin: ${safe(data.noradrenalin_dosis)}`,
      data.adrenalin_dosis && `Adrenalin: ${safe(data.adrenalin_dosis)}`,
      data.dopamin_dosis && `Dopamin: ${safe(data.dopamin_dosis)}`,
      data.dobutamin_dosis && `Dobutamin: ${safe(data.dobutamin_dosis)}`
    ].filter(Boolean).join(", ");
    
    if (katecholamine) {
      kreislaufEntries.push(`|BREAK|Unterstützung: ${katecholamine}`);
    }
  }

  // Schrittmacher
  if (data.schrittmacher) {
    kreislaufEntries.push(`|BREAK|Schrittmacher: ${safe(data.schrittmacher_modus)}`);
  }

  // Sonstige Therapie
  if (data.sonstigeTherapie) {
    kreislaufEntries.push(`|BREAK|${safe(data.sonstige_details)}`);
  }

  // Output
  addMultilinePairs("Kreislauf", kreislaufEntries);


  addSpace(1.5);
  const niereEntries = [];
  if (data.ausscheidung) {
    niereEntries.push(`Ausscheidung: ${safe(data.ausscheidung)}`);
  }
  if (data.dialyse_toggle) {
    niereEntries.push(`Dialyse: ${safe(data.dialyse_verfahren)}`);
  }
  if (data.niere_freitext) {
    niereEntries.push(`|BREAK|${safe(data.niere_freitext)}`);
  }
  addMultilinePairs("Nierenfunktion", niereEntries);
  addSpace(1.5);

  const infektionEntries = [];

  if (data.infektion_erreger) {
    infektionEntries.push(`Erreger: ${safe(data.infektion_erreger)}`);
  }

  if (data.irg) {
    infektionEntries.push(`Risikogruppe: ${irgMap[data.irg] || "-"}`);
  }

  if (data.infektion_antibiose) {
    infektionEntries.push(`|BREAK|Antibiotikatherapie: ${safe(data.infektion_antibiose)}`);
  }

  addMultilinePairs("Infektiologie", infektionEntries);

  addSection("Labor / BGA");
  addSmallTable([
    ["Hb", safe(data.hb)], 
    ["paO2", safe(data.pao2)],
    ["pH", safe(data.ph)],
    ["HCO3", safe(data.hco3)],
    ["Na", safe(data.na)],
    ["Cl", safe(data.cl)],
    ["Hkt", safe(data.hkt)],
    ["paCO2", safe(data.paco2)],
    ["Lactat", safe(data.lactat)],
    ["BE", safe(data.be)],
    ["K", safe(data.k)],
    ["Ca", safe(data.ca)],
  ]);
  addMultiline("Sonstige", data.labor_sonstige);

  if (data.medikation) {
    addMultiline([["Sonstige Medikation", safe(data.medikation)]])
  }

  addSection("Instrumentierung / Drainagen / Technische Geräte");

// Instrumentierung (Katheter)
  const katheter = [
    { label: "PVK", key: "zugang_pvk" },
    { label: "ZVK", key: "zugang_zvk" },
    { label: "Shaldon", key: "zugang_shaldon" },
    { label: "Arterie", key: "zugang_arterie" },
    { label: "Pulmonaliskatheter", key: "zugang_pulmonalis" },
    { label: "PiCCO", key: "zugang_picco" },
    { label: "ICP-Sonde", key: "zugang_icp" },
    { label: "Dauerkatheter (DK)", key: "zugang_dk" },
    { label: "Fäkalkollektor", key: "zugang_faekal" }
  ]
    .filter(item => data[item.key])
    .map(item => item.label);

  if (data.zugang_sonstiger) katheter.push(data.zugang_sonstiger); // Sonstige Katheter

  if (katheter.length) addRow([["Instrumentierung", katheter.join(", ")]]);

  // Drainagen
  const drainagen = [
    { label: "Thoraxdrainage", key: "drainage_thorax" },
    { label: "Externe Ventrikeldrainage (EVD)", key: "drainage_evd" }
  ]
    .filter(item => data[item.key])
    .map(item => item.label);

  if (data.drainage_sonstige_text) drainagen.push(data.drainage_sonstige_text); // Sonstige Drainagen

  if (drainagen.length) addRow([["Drainagen", drainagen.join(", ")]]);

  // Geräte
  const geraete = [
    { label: "Perfusoren", key: "device_perfusoren" },
    { label: "ECMO / ECLA", key: "device_ecmo" },
    { label: "IABP", key: "device_iabp" },
    { label: "Respirator", key: "device_respirator" },
    { label: "Inkubator", key: "device_inkubator" }
  ]
    .filter(item => data[item.key])
    .map(item => item.label);

  if (data.device_sonstiger) geraete.push(data.device_sonstiger); // Sonstige Geräte

  if (geraete.length) addRow([["Technische Geräte", geraete.join(", ")]]);

  // Freitext
  addMultiline("", data.instrument_freitext);

  addSection("Entscheidung");
  let entscheidungText = "";
  const transportmittel = safe(data.transportmittel);
  const entscheidung = safe(data.decision);
  const aufnahmeOffen = (data.aufnahme_zugesichert !== "ja");
  
  if (entscheidung === "angenommen") {
    entscheidungText = `Verlegung mittels ${transportmittel} angenommen`;
    if (aufnahmeOffen) entscheidungText += " (Aufnahmezusage ausstehend)";
  } else if (entscheidung === "vorbehalt") {
    entscheidungText = `Verlegung mittels ${transportmittel} unter Vorbehalt`;
    if (data.vorbehaltKommentar) {
      entscheidungText += `: ${data.vorbehaltKommentar}`;
    } else {
      entscheidungText += `.`;
    }
  } else if (entscheidung === "abgelehnt") {
    entscheidungText = `Verlegung mittels ${transportmittel} abgelehnt.`;
    if (data.ablehnungBegruendung) {
      entscheidungText += `\n${data.ablehnungBegruendung}`;
    }
    if (data.empfohlenesTransportmittel) {
      entscheidungText += `\nEmpfohlenes Transportmittel: ${data.empfohlenesTransportmittel}`;
    }
  }
  
  // Zeitangaben
  if (data.entscheidungszeitpunkt) {
    entscheidungText += ` (${safe(data.entscheidungszeitpunkt)})`;
  }
  
  // Ausgabe
  addMultiline("Entscheidung", entscheidungText);
  
  // Rückmeldung an ILS
  if (data.rueckmeldung) {
    addRow([["Rückmeldung an Leitstelle", `${safe(data.rueckmeldung)} Uhr`]]);
  }

  addRow([["Arzt", safe(data.arzt)]]);

  // Footer
  doc.setFontSize(7);
  doc.setTextColor(150);
  doc.text("medizin.dev | Evaluationsbogen", pageWidth/2, 290, {align: 'center'});

  // doc.save(`transfer_${data.patientenname || "unbekannt"}.pdf`);
  // doc.output('dataurlnewwindow');
  const pdfBlob = doc.output('blob');
  const pdfUrl = URL.createObjectURL(pdfBlob);
  window.open(pdfUrl, '_blank');
  setTimeout(() => URL.revokeObjectURL(pdfUrl), 5000);
}
