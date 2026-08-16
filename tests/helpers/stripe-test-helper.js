/**
 * Stripe Test Helper - Uses Stripe Test Clocks for subscription testing
 * Inspired by Antigravity patterns for advanced Stripe integration tests
 */

export class StripeTestHelper {
  constructor(apiBase) {
    this.apiBase = apiBase;
  }

  /**
   * Create a Stripe test clock for simulating time
   * Useful for testing recurring charges, expirations, etc.
   */
  async createTestClock(frozenTime = new Date()) {
    try {
      const response = await fetch(`${this.apiBase}/api/test/stripe/clock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          frozen_time: Math.floor(frozenTime.getTime() / 1000)
        })
      });
      const data = await response.json();
      return data.clock_id;
    } catch (e) {
      console.error('Failed to create test clock:', e);
      throw e;
    }
  }

  /**
   * Advance test clock to simulate time passing
   */
  async advanceTestClock(clockId, advanceSeconds) {
    try {
      const response = await fetch(
        `${this.apiBase}/api/test/stripe/clock/${clockId}/advance`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ advance_by_seconds: advanceSeconds })
        }
      );
      return await response.json();
    } catch (e) {
      console.error('Failed to advance test clock:', e);
      throw e;
    }
  }

  /**
   * Get test payment intents for a clock
   */
  async getPaymentIntents(clockId) {
    try {
      const response = await fetch(
        `${this.apiBase}/api/test/stripe/clock/${clockId}/payment-intents`
      );
      return await response.json();
    } catch (e) {
      console.error('Failed to get payment intents:', e);
      throw e;
    }
  }

  /**
   * Create a test customer with test clock
   */
  async createTestCustomer(clockId, customerData = {}) {
    try {
      const response = await fetch(`${this.apiBase}/api/test/stripe/customer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clock_id: clockId,
          email: customerData.email || `test+${Date.now()}@example.com`,
          ...customerData
        })
      });
      const data = await response.json();
      return data.customer;
    } catch (e) {
      console.error('Failed to create test customer:', e);
      throw e;
    }
  }

  /**
   * Simulate a payment with Stripe test card
   */
  async simulatePayment(customerId, amount, currency = 'usd') {
    try {
      const response = await fetch(`${this.apiBase}/api/test/stripe/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: customerId,
          amount,
          currency
        })
      });
      const data = await response.json();
      return data.intent;
    } catch (e) {
      console.error('Failed to simulate payment:', e);
      throw e;
    }
  }

  /**
   * Clean up test clock
   */
  async deleteTestClock(clockId) {
    try {
      await fetch(`${this.apiBase}/api/test/stripe/clock/${clockId}`, {
        method: 'DELETE'
      });
    } catch (e) {
      console.warn('Failed to delete test clock:', e);
    }
  }
}

export const stripeTestHelper = new StripeTestHelper(
  process.env.API_URL || 'http://localhost:3000'
);
