/**
 * AutoRepairService Unit Tests
 * 
 * Tests auto repair-specific service implementation.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AutoRepairService } from '../../../../server/services/templates/AutoRepairService.js';

describe('AutoRepairService', () => {
  let service;

  beforeEach(() => {
    service = new AutoRepairService();
  });

  describe('getFormType', () => {
    it('should return quote_request', () => {
      expect(service.getFormType()).toBe('quote_request');
    });
  });

  describe('getRequiredFields', () => {
    it('should return required fields including vehicle info', () => {
      const fields = service.getRequiredFields();
      expect(fields).toContain('name');
      expect(fields).toContain('email');
      expect(fields).toContain('phone');
      expect(fields).toContain('vehicleYear');
      expect(fields).toContain('vehicleMake');
      expect(fields).toContain('issueType');
    });
  });

  describe('getNicheFields', () => {
    it('should return auto repair-specific fields', () => {
      const fields = service.getNicheFields();
      expect(fields).toBeInstanceOf(Array);

      const vehicleYearField = fields.find((f) => f.name === 'vehicleYear');
      expect(vehicleYearField).toBeDefined();
      expect(vehicleYearField.type).toBe('select');
      expect(vehicleYearField.options.length).toBeGreaterThan(0);

      const issueTypeField = fields.find((f) => f.name === 'issueType');
      expect(issueTypeField).toBeDefined();
      expect(issueTypeField.type).toBe('select');
    });
  });

  describe('validateNicheFields', () => {
    it('should validate vehicle information', () => {
      const currentYear = new Date().getFullYear();
      const validData = {
        vehicleYear: currentYear.toString(),
        vehicleMake: 'Toyota Camry',
        issueType: 'brakes',
        urgency: 'soon',
      };

      const result = service.validateNicheFields(validData);
      expect(result.vehicleYear).toBe(currentYear);
      expect(result.vehicleMake).toBe('Toyota Camry');
      expect(result.issueType).toBe('brakes');
      expect(result.urgency).toBe('soon');
    });

    it('should throw error for missing vehicle year', () => {
      const invalidData = {
        vehicleMake: 'Toyota',
        issueType: 'brakes',
      };

      expect(() => service.validateNicheFields(invalidData)).toThrow('Vehicle year is required');
    });

    it('should throw error for invalid vehicle year', () => {
      const invalidData = {
        vehicleYear: '1900', // Too old
        vehicleMake: 'Toyota',
        issueType: 'brakes',
      };

      expect(() => service.validateNicheFields(invalidData)).toThrow('Invalid vehicle year');
    });

    it('should validate optional mileage', () => {
      const data = {
        vehicleYear: '2020',
        vehicleMake: 'Honda',
        issueType: 'oil_change',
        vehicleMileage: '50000',
      };

      const result = service.validateNicheFields(data);
      expect(result.vehicleMileage).toBe(50000);
    });
  });

  describe('formatConfirmationEmail', () => {
    it('should format email with vehicle information', () => {
      const data = {
        name: 'Jane Smith',
        email: 'jane@example.com',
        phone: '555-5678',
        vehicleYear: 2020,
        vehicleMake: 'Toyota Camry',
        issueType: 'brakes',
        urgency: 'urgent',
      };

      const email = service.formatConfirmationEmail(data);
      expect(email.subject).toContain('2020');
      expect(email.subject).toContain('Toyota Camry');
      expect(email.html).toContain('brakes');
      expect(email.html).toContain('urgent');
    });
  });
});

