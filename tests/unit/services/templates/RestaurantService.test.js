/**
 * RestaurantService Unit Tests
 * 
 * Tests restaurant-specific service implementation.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RestaurantService } from '../../../../server/services/templates/RestaurantService.js';

describe('RestaurantService', () => {
  let service;

  beforeEach(() => {
    service = new RestaurantService();
  });

  describe('getFormType', () => {
    it('should return service_request', () => {
      expect(service.getFormType()).toBe('service_request');
    });
  });

  describe('getRequiredFields', () => {
    it('should return required fields including partySize', () => {
      const fields = service.getRequiredFields();
      expect(fields).toContain('name');
      expect(fields).toContain('email');
      expect(fields).toContain('phone');
      expect(fields).toContain('partySize');
      expect(fields).toContain('preferred_date');
      expect(fields).toContain('preferred_time');
    });
  });

  describe('getNicheFields', () => {
    it('should return restaurant-specific fields', () => {
      const fields = service.getNicheFields();
      expect(fields).toBeInstanceOf(Array);
      expect(fields.length).toBeGreaterThan(0);

      const partySizeField = fields.find((f) => f.name === 'partySize');
      expect(partySizeField).toBeDefined();
      expect(partySizeField.type).toBe('number');
      expect(partySizeField.required).toBe(true);

      const occasionField = fields.find((f) => f.name === 'occasion');
      expect(occasionField).toBeDefined();
      expect(occasionField.type).toBe('select');
    });
  });

  describe('validateNicheFields', () => {
    it('should validate party size', () => {
      const validData = {
        partySize: 4,
        occasion: 'birthday',
      };

      const result = service.validateNicheFields(validData);
      expect(result.partySize).toBe(4);
      expect(result.occasion).toBe('birthday');
    });

    it('should throw error for missing party size', () => {
      const invalidData = {
        occasion: 'birthday',
      };

      expect(() => service.validateNicheFields(invalidData)).toThrow('Party size is required');
    });

    it('should throw error for invalid party size', () => {
      const invalidData = {
        partySize: 100, // Too large
      };

      expect(() => service.validateNicheFields(invalidData)).toThrow('Validation failed');
    });

    it('should validate optional fields', () => {
      const data = {
        partySize: 2,
        dietaryRestrictions: 'Vegetarian',
        specialRequests: 'Window seat please',
      };

      const result = service.validateNicheFields(data);
      expect(result.partySize).toBe(2);
      expect(result.dietaryRestrictions).toBe('Vegetarian');
      expect(result.specialRequests).toBe('Window seat please');
    });
  });

  describe('formatConfirmationEmail', () => {
    it('should format email with restaurant-specific fields', () => {
      const data = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '555-1234',
        partySize: 4,
        occasion: 'birthday',
        preferred_date: '2024-12-25',
        preferred_time: '19:00',
      };

      const email = service.formatConfirmationEmail(data);
      expect(email.subject).toContain('Reservation Request');
      expect(email.subject).toContain('John Doe');
      expect(email.html).toContain('4 guests');
      expect(email.html).toContain('birthday');
      expect(email.html).toContain('2024-12-25');
      expect(email.html).toContain('19:00');
    });
  });
});

