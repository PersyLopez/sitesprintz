const INQUIRY_KIND_LABELS = {
  'zip-check': 'ZIP check',
  'package-quote': 'Package quote',
  'diagnostic-quote': 'Estimate',
  inquiry: 'Inquiry',
  'plan-request': 'Plan request',
  'class-request': 'Class request',
};

export function inquiryKindLabel(type) {
  const key = String(type || 'contact');
  if (key === 'contact') return '';
  return INQUIRY_KIND_LABELS[key] || key.replace(/-/g, ' ');
}

export function contactLeadSubject(type, businessName) {
  const shop = businessName || 'Your Site';
  if (type === 'quote') return `New Quote Request Submission - ${shop}`;
  const known = INQUIRY_KIND_LABELS[String(type || '')];
  if (known) return `New ${known} - ${shop}`;
  return `New Contact Form Submission - ${shop}`;
}

export function contactLeadPhrase(type) {
  if (type === 'quote') return 'quote request';
  return INQUIRY_KIND_LABELS[String(type || '')] || 'contact form submission';
}

const FORM_STATUS_TEST_ID = {
  'zip-check': 'zip-form-status',
  'package-quote': 'package-form-status',
  'diagnostic-quote': 'diagnostic-form-status',
  inquiry: 'inquiry-form-status',
  'plan-request': 'plan-form-status',
  'class-request': 'class-form-status',
};

/** Kind that may appear on the no-JS return URL. Contact stays unmarked. */
export function contactReturnLead(type) {
  const key = String(type || '');
  return FORM_STATUS_TEST_ID[key] ? key : '';
}

export function contactFormStatusTestId(type) {
  return FORM_STATUS_TEST_ID[String(type || '')] || 'contact-form-status';
}
