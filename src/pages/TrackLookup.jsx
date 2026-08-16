import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../hooks/useToast';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import api from '../services/api';
import './Tracking.css';

function TrackLookup() {
  const navigate = useNavigate();
  const { showError } = useToast();
  const [type, setType] = useState('order');
  const [referenceId, setReferenceId] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!referenceId || !email) {
      showError('Please fill in all fields');
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/api/tracking/lookup', {
        type,
        referenceId,
        email
      });

      if (response.token) {
        if (type === 'order') {
          navigate(`/track/order/${response.token}`);
        } else {
          navigate(`/track/appointment/${referenceId}`);
        }
      }
    } catch (err) {
      console.error('Lookup error:', err);
      const errorMessage = err.response?.data?.error || err.message || 'Failed to find order or appointment';
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="tracking-page">
      <Header />
      <main className="tracking-container">
        <div className="tracking-card">
          <div className="tracking-header">
            <h1>📦 Track Your Order or Appointment</h1>
            <p>Enter your order ID or confirmation code and email to track your status</p>
          </div>

          <form onSubmit={handleSubmit} className="tracking-form">
            <div className="form-group">
              <label htmlFor="type">Type</label>
              <select
                id="type"
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="form-control"
              >
                <option value="order">Order</option>
                <option value="appointment">Appointment</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="referenceId">
                {type === 'order' ? 'Order ID' : 'Confirmation Code'}
              </label>
              <input
                type="text"
                id="referenceId"
                value={referenceId}
                onChange={(e) => setReferenceId(e.target.value)}
                placeholder={type === 'order' ? 'Enter order ID' : 'Enter confirmation code'}
                required
                className="form-control"
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                className="form-control"
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-full"
              disabled={loading}
            >
              {loading ? 'Looking up...' : 'Track'}
            </button>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default TrackLookup;



