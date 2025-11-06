import { useState, useEffect } from 'react';
import { initializeStripe } from '../utils/stripe';

export function useStripe(publishableKey) {
  const [stripe, setStripe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!publishableKey) {
      setLoading(false);
      return;
    }

    let mounted = true;

    const loadStripeInstance = async () => {
      try {
        const stripeInstance = await initializeStripe(publishableKey);
        if (mounted) {
          setStripe(stripeInstance);
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          setError(err.message);
          setStripe(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadStripeInstance();

    return () => {
      mounted = false;
    };
  }, [publishableKey]);

  return { stripe, loading, error };
}

