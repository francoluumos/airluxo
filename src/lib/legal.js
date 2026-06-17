// Swiss legal pages for a partner's white-label site. Generated from structured
// legal-entity data into editable Impressum / privacy / terms text. The output is a
// STARTING TEMPLATE for the partner's own review — not legal advice.

export const LEGAL_FIELDS = [
  ['company', 'Company / legal name'],
  ['legal_form', 'Legal form (GmbH, AG, …)'],
  ['street', 'Street + no.'],
  ['zip', 'ZIP'],
  ['city', 'City'],
  ['country', 'Country'],
  ['uid', 'UID (CHE-…)'],
  ['vat', 'VAT / MWST'],
  ['email', 'Email'],
  ['phone', 'Phone'],
  ['represented_by', 'Represented by'],
  ['register', 'Commercial register'],
];

export const LEGAL_TABS = [
  ['impressum', 'Impressum'],
  ['privacy', 'Datenschutz'],
  ['terms', 'AGB'],
];

const NOTE = 'Diese Seite wurde automatisch als Vorlage erstellt und ist vor der Veröffentlichung rechtlich zu prüfen.';

// Pre-fill legal fields from whatever the ingest/pipeline already captured.
export function seedLegal(legal, companyName, contact = {}) {
  const l = legal && typeof legal === 'object' ? legal : {};
  return {
    company: l.company || companyName || '',
    legal_form: l.legal_form || '',
    street: l.street || contact.address || '',
    zip: l.zip || '',
    city: l.city || '',
    country: l.country || 'Schweiz',
    uid: l.uid || '',
    vat: l.vat || '',
    email: l.email || contact.email || '',
    phone: l.phone || contact.phone || '',
    represented_by: l.represented_by || '',
    register: l.register || '',
  };
}

// Build the three legal pages (German / CH baseline) from the legal-entity fields.
export function buildLegalPages(legal) {
  const L = legal && typeof legal === 'object' ? legal : {};
  const line = (label, val) => (val ? `${label}${val}\n` : '');
  const addr = [L.street, [L.zip, L.city].filter(Boolean).join(' '), L.country].filter(Boolean).join('\n');
  const company = L.company || 'Das Unternehmen';

  const impressum =
`Impressum

${company}${L.legal_form ? ' · ' + L.legal_form : ''}
${addr}

${line('UID: ', L.uid)}${line('MWST / VAT: ', L.vat)}${line('E-Mail: ', L.email)}${line('Telefon: ', L.phone)}${line('Vertreten durch: ', L.represented_by)}${line('Handelsregister: ', L.register)}
${NOTE}`;

  const privacy =
`Datenschutzerklärung

${company} nimmt den Schutz Ihrer persönlichen Daten ernst. Diese Website wird über die AIRLUXO-Plattform betrieben; Buchungen und Zahlungen werden durch AIRLUXO als Auftragsbearbeiter abgewickelt.

Verantwortliche Stelle:
${company}
${addr}
${line('E-Mail: ', L.email)}
Wir bearbeiten Personendaten (z. B. Name, Kontaktangaben, Buchungs- und Zahlungsdaten) ausschliesslich zur Erbringung unserer Dienstleistungen und gemäss dem schweizerischen Datenschutzgesetz (revDSG). Daten werden nicht über das notwendige Mass hinaus an Dritte weitergegeben; Zahlungsabwicklung und Buchungsverwaltung erfolgen über AIRLUXO und deren Dienstleister.

Sie haben das Recht auf Auskunft, Berichtigung und Löschung Ihrer Daten. Kontaktieren Sie uns dazu unter den oben genannten Angaben.

${NOTE}`;

  const terms =
`Allgemeine Geschäftsbedingungen

Diese AGB regeln die Vermietung von Fahrzeugen durch ${company} über die AIRLUXO-Plattform.

1. Vertragsabschluss — Der Mietvertrag kommt mit der Bestätigung der Buchung zustande.
2. Preise & Zahlung — Es gelten die zum Buchungszeitpunkt angezeigten Preise. Die Zahlung wird über AIRLUXO abgewickelt.
3. Pflichten des Mieters — Gültiger Führerausweis, sorgfältiger Umgang mit dem Fahrzeug, Einhaltung der Verkehrsregeln.
4. Haftung & Versicherung — Es gelten die im Buchungsprozess angegebenen Versicherungs- und Selbstbehaltsbedingungen.
5. Stornierung — Es gelten die im Buchungsprozess angegebenen Stornobedingungen.
6. Anwendbares Recht — Es gilt schweizerisches Recht; Gerichtsstand ist der Sitz von ${company}.

${NOTE}`;

  return { impressum, privacy, terms };
}
