import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const PaymentCancel = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const draftId = searchParams.get('draftId');
    const returnTo = draftId ? '/setup' : '/dashboard';

    return (
        <div className="payment-cancel-page" style={{ padding: '40px', textAlign: 'center', color: 'white' }}>
            <h1>Payment Cancelled</h1>
            <p>Your payment was cancelled.</p>
            <button
                onClick={() => navigate(returnTo)}
                style={{ marginTop: '20px', padding: '10px 20px', background: '#4b5563', color: 'white', border: 'none', borderRadius: '5px' }}
            >
                {draftId ? 'Return to setup' : 'Return to Dashboard'}
            </button>
        </div>
    );
};

export default PaymentCancel;
