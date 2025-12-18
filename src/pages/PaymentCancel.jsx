import React from 'react';
import { useNavigate } from 'react-router-dom';

const PaymentCancel = () => {
    const navigate = useNavigate();

    return (
        <div className="payment-cancel-page" style={{ padding: '40px', textAlign: 'center', color: 'white' }}>
            <h1>Payment Cancelled</h1>
            <p>Your payment was cancelled.</p>
            <button
                onClick={() => navigate('/dashboard')}
                style={{ marginTop: '20px', padding: '10px 20px', background: '#4b5563', color: 'white', border: 'none', borderRadius: '5px' }}
            >
                Return to Dashboard
            </button>
        </div>
    );
};

export default PaymentCancel;
