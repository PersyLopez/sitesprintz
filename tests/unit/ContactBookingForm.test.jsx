import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ContactBookingForm from '../../src/components/setup/forms/ContactBookingForm';

vi.mock('../../src/hooks/useSite', () => ({
  useSite: vi.fn(),
}));

import { useSite } from '../../src/hooks/useSite';

describe('ContactBookingForm', () => {
  let mockUpdateField;
  let mockUpdateNestedField;

  beforeEach(() => {
    mockUpdateField = vi.fn();
    mockUpdateNestedField = vi.fn();

    useSite.mockReturnValue({
      siteData: {
        social: {
          facebook: '',
          instagram: '',
          whatsapp: '',
          tiktok: '',
          maps: '',
          website: '',
          linkedin: '',
        },
        booking: {
          enabled: false,
          provider: 'calendly',
          url: '',
          style: 'inline',
        },
      },
      updateField: mockUpdateField,
      updateNestedField: mockUpdateNestedField,
    });
  });

  it('writes WhatsApp, TikTok, website, and LinkedIn via updateField', () => {
    render(<ContactBookingForm />);

    const fields = [
      { label: /WhatsApp/i, key: 'social.whatsapp', value: 'https://wa.me/15551234567' },
      { label: /TikTok URL/i, key: 'social.tiktok', value: 'https://tiktok.com/@shop' },
      { label: /Website URL/i, key: 'social.website', value: 'https://shop.example' },
      { label: /LinkedIn URL/i, key: 'social.linkedin', value: 'https://linkedin.com/company/shop' },
    ];

    for (const field of fields) {
      fireEvent.change(screen.getByLabelText(field.label), {
        target: { value: field.value },
      });
      expect(mockUpdateField).toHaveBeenCalledWith(field.key, field.value);
    }
  });
});
