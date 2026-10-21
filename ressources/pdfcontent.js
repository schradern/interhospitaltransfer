// Gibt ausschließlich erfasste Angaben im Wortlaut des Formulars wieder (Beschriftung und gewählte Option):
// keine Berechnung, Bewertung, Umdeutung oder Ergänzung. Fehlende Angaben bleiben leer bzw. "-".
const URGENT_WITHOUT_TIME_WINDOW = 'Innerhalb von 2 Stunden';
const AIR_TRANSPORT_VEHICLES = ['RTH', 'ITH'];
const UNDECIDED_TEXT = 'Noch offen';
const NOT_SPECIFIED_TEXT = 'Keine Angabe';
const CATHETER_FIELDS = [
  'zugang_pvk', 'zugang_zvk', 'zugang_shaldon', 'zugang_arterie', 'zugang_pulmonalis', 'zugang_picco',
  'zugang_icp', 'zugang_dk', 'zugang_faekal',
];
const DRAIN_FIELDS = ['drainage_thorax', 'drainage_evd'];
const DEVICE_FIELDS = ['device_perfusoren', 'device_ecmo', 'device_iabp', 'device_respirator', 'device_inkubator'];
// Laborwerte in der Kurzform, die das Formular in Klammern nennt.
const LABORATORY_LABELS = [
  ['hb', 'Hb [g/dl]'], ['hkt', 'Hkt'], ['ph', 'pH-Wert'], ['lactat', 'Lactat [mg/dl]'],
  ['pao2', 'paO₂ [mmHg]'], ['paco2', 'paCO₂ [mmHg]'], ['hco3', 'Bicarbonat [mmol/l]'], ['be', 'BE [mmol/l]'],
  ['na', 'Na⁺ [mmol/l]'], ['k', 'K⁺ [mmol/l]'], ['cl', 'Cl⁻ [mmol/l]'], ['ca', 'Ca²⁺ [mmol/l]'],
];

const join = (parts, separator = ', ') => parts.filter(Boolean).join(separator);

// labels: Beschriftung je Feld; optionTexts: angezeigter Text der gewählten Option je Auswahlfeld.
export function writeTransferDocument(layout, data, { labels, optionTexts }) {
  const answers = {
    data,
    label: name => labels[name] ?? name,
    chosen: name => optionTexts[name] ?? data[name] ?? '',
  };
  answers.field = name => (answers.chosen(name) ? `${answers.label(name)}: ${answers.chosen(name)}` : '');
  answers.pair = name => [answers.label(name), answers.chosen(name)];
  writePatient(layout, answers);
  writeTransfer(layout, answers);
  writeBackground(layout, answers);
  writeClinicalState(layout, answers);
  writeLaboratory(layout, answers);
  writeInstrumentation(layout, answers);
  writeDecision(layout, answers);
}

// Kernangaben erscheinen immer, fehlend als "-", damit Lücken sichtbar bleiben.
const withPlaceholder = ([label, value]) => [label, value || '-'];

function writePatient(layout, { pair }) {
  layout.section('Patientendaten');
  layout.row([withPlaceholder(pair('patientenname')), pair('geburtsdatum')]);
  layout.row([pair('gewicht'), pair('irg')]);
}

function writeTransfer(layout, { data, label, chosen, field, pair }) {
  layout.section('Transferdetails');
  layout.row([['Quellklinik', data.quellklinik_name], ['Zielklinik', data.zielklinik_name]]);
  layout.row([pair('quellklinik_station'), pair('zielklinik_station')]);
  layout.row([pair('quellklinik_tel'), pair('zielklinik_tel')]);
  layout.row([pair('quellklinik_ansprechpartner'), pair('zielklinik_ansprechpartner')]);
  const isAirTransport = AIR_TRANSPORT_VEHICLES.includes(data.transportmittel);
  if (data.landeplatz_quellklinik || data.landeplatz_zielklinik || isAirTransport) {
    const landingSite = side => (data[`landeplatz_${side}`]
      ? join([chosen(`landeplatz_${side}`), data[`landeplatz_${side}`] === 'ja' && field(`rtw_${side}`)])
      : NOT_SPECIFIED_TEXT);
    layout.row([[label('landeplatz_quellklinik'), landingSite('quellklinik')], [label('landeplatz_zielklinik'), landingSite('zielklinik')]]);
  }
  layout.row([pair('aufnahme_zugesichert')]);

  layout.section('Transferinformationen');
  layout.row([pair('verlegungsgrund'), pair('dringlichkeit')]);
  if (data.dringlichkeit && data.dringlichkeit !== URGENT_WITHOUT_TIME_WINDOW) layout.row([pair('zeitfenster')]);
  layout.block('Transport', [field('transport_boden')]);
}

function writeBackground(layout, { pair }) {
  layout.section('Medizinischer Hintergrund');
  layout.row([withPlaceholder(pair('verlegungsdiagnose'))]);
  layout.row([pair('zusatzdiagnosen')]);
  layout.row([pair('klinik_seit'), pair('intensiv_seit')]);
}

function writeClinicalState(layout, answers) {
  const { data, field } = answers;
  layout.section('Klinischer Zustand');
  const writtenBlocks = [
    layout.block('Bewusstsein', [join([field('bewusstsein'), field('gcs')]), field('bewFreitext')]),
    layout.block('Atmung / Beatmung', describeBreathing(answers)),
    layout.block('Kreislauf', describeCirculation(answers)),
    layout.block('Nierenfunktion', [
      field('ausscheidung'),
      data.dialyse_toggle && join([answers.label('dialyse_toggle'), field('dialyse_verfahren')]),
      field('niere_freitext'),
    ]),
    layout.block('Infektiologie', [field('infektion_erreger'), field('infektion_antibiose')]),
  ];
  if (!writtenBlocks.some(Boolean)) layout.block('Angaben', ['-']);
}

function describeBreathing({ data, label, field }) {
  const isVentilated = Boolean(data.beatmet);
  const vitals = join([field('spo2'), field('af'), !isVentilated && field('o2_l_min')]);
  if (!isVentilated) return [vitals, field('atemweg'), field('awFreitext')];

  const mode = data.beatmungs_modus;
  const showsAll = !mode;
  const settings = join([
    field('fio2'), field('peep'), field('ie'),
    (showsAll || mode === 'druck') && field('pinsp'),
    (showsAll || mode === 'volumen') && field('vt'),
    (showsAll || mode === 'volumen') && field('amv'),
    (showsAll || mode === 'niv' || mode === 'assistiert') && field('asb'),
  ]);
  return [vitals, join([label('beatmet'), field('beatmungs_modus'), field('beatmet_seit')]), settings, field('atemweg'), field('awFreitext')];
}

function describeCirculation({ data, label, field }) {
  return [
    join([field('rr_sys'), field('rr_dias'), field('hr')]),
    data.akute_blutung && label('akute_blutung'),
    data.katego_toggle && join([
      label('katego_toggle'),
      field('noradrenalin_dosis'), field('adrenalin_dosis'), field('dopamin_dosis'), field('dobutamin_dosis'),
    ]),
    data.schrittmacher_toggle && join([label('schrittmacher_toggle'), field('schrittmacher_modus')]),
    data.sonstige_toggle && join([label('sonstige_toggle'), field('sonstige_details')]),
  ];
}

function writeLaboratory(layout, { data }) {
  const values = LABORATORY_LABELS.map(([name, label]) => [label, data[name]]);
  if (values.some(([, value]) => value) || data.labor_sonstige) {
    layout.section('Laborparameter und BGA');
    layout.grid(values);
    layout.block('Sonstige Werte', [data.labor_sonstige]);
  }
  if (data.medikation) {
    layout.section('Medikation');
    layout.block('Medikation', [data.medikation]);
  }
}

// Die Checkbox "Sonstige" ist maßgeblich: abgewählt erscheint auch der Freitext nicht.
function writeInstrumentation(layout, { data, label }) {
  const pick = (fields, otherField) => [
    ...fields.filter(name => data[name]).map(label),
    data[otherField] ? (data[`${otherField}_text`] || label(otherField)) : '',
  ].filter(Boolean);
  const catheters = pick(CATHETER_FIELDS, 'zugang_sonstiger');
  const drains = pick(DRAIN_FIELDS, 'drainage_sonstige');
  const devices = pick(DEVICE_FIELDS, 'device_sonstiger');
  if (!catheters.length && !drains.length && !devices.length && !data.instrument_freitext) return;

  layout.section('Instrumentierung');
  layout.block('Zugänge / Katheter', [join(catheters)]);
  layout.block('Drainagen', [join(drains)]);
  layout.block('Technische Geräte', [join(devices)]);
  layout.block(label('instrument_freitext'), [data.instrument_freitext]);
}

function writeDecision(layout, { data, label, chosen, pair }) {
  layout.section('Entscheidung');
  layout.row([pair('arzt')]);
  layout.row([pair('transportmittel'), [label('decision'), chosen('decision') || UNDECIDED_TEXT]]);
  if (data.decision === 'vorbehalt') layout.row([pair('vorbehaltKommentar')]);
  if (data.decision === 'abgelehnt') {
    layout.row([pair('empfohlenesTransportmittel')]);
    layout.row([pair('ablehnungBegruendung')]);
  }
  layout.row([pair('entscheidungszeitpunkt'), pair('rueckmeldung')]);
}
