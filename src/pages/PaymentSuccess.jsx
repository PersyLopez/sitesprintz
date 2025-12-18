import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const PaymentSuccess = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const sessionId = searchParams.get('session_id');

    useEffect(() => {
        if (!sessionId) {
            navigate('/');
        }
    }, [sessionId, navigate]);

    return (
        <div className="payment-success-page" style={{ padding: '40px', textAlign: 'center', color: 'white' }}>
            <h1>Payment Successful!</h1>
            <p>Thank you for your purchase.</p>
            <p>Your subscription has been confirmed.</p>
            <button
                onClick={() => navigate('/dashboard')}
                style={{ marginTop: '20px', padding: '10px 20px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '5px' }}
            >
                Go to Dashboard
            </button>
        </div>
    );
};

export default PaymentSuccess;
