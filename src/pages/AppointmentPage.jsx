import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { get, del, post } from '../utils/api';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import './AppointmentPage.css';

const AppointmentPage = () => {
    const { confirmationCode } = useParams();
    const [searchParams] = useSearchParams();
    const [appointment, setAppointment] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [cancelReason, setCancelReason] = useState('');
    const [cancelEmail, setCancelEmail] = useState('');
    const [cancelError, setCancelError] = useState('');
    const [cancelLoading, setCancelLoading] = useState(false);

    useEffect(() => {
        const sessionId = searchParams.get('session_id');
        const run = async () => {
            if (sessionId) {
                try {
                    await post('/api/booking/checkout/confirm', {
                        session_id: sessionId,
                        confirmation_code: confirmationCode
                    });
                } catch (err) {
                    console.error('Error confirming checkout session:', err);
                }
            }
            await fetchAppointment();
            if (searchParams.get('action') === 'cancel') {
                setShowCancelModal(true);
            }
        };
        run();
    }, [confirmationCode, searchParams]);

    const fetchAppointment = async () => {
        try {
            setLoading(true);
            // We need a global lookup endpoint or we need to know the tenant ID.
            // Since the URL doesn't have tenant ID, we'll assume there's an endpoint 
            // that can find by confirmation code alone.
            const response = await get(`/api/booking/appointments/${confirmationCode}`);
            setAppointment(response.appointment);
        } catch (err) {
            console.error('Error fetching appointment:', err);
            setError('Failed to load appointment details.');
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = async () => {
        if (!cancelReason.trim() || !cancelEmail.trim()) return;

        try {
            setCancelLoading(true);
            setCancelError('');
            await del(`/api/booking/appointments/${confirmationCode}`, {
                body: JSON.stringify({
                    reason: cancelReason,
                    cancelled_by: 'customer',
                    customer_email: cancelEmail.trim(),
                })
            });

            await fetchAppointment();
            setShowCancelModal(false);
        } catch (err) {
            console.error('Error cancelling appointment:', err);
            setCancelError(err.message || 'Failed to cancel appointment');
        } finally {
            setCancelLoading(false);
        }
    };

    if (loading) return <div className="loading">Loading...</div>;
    if (error) return <div className="error">{error}</div>;
    if (!appointment) return <div className="not-found">Appointment not found</div>;

    return (
        <div className="appointment-page">
            <Header />
            <main className="container mx-auto px-4 py-8">
                <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-6">
                    <h1 className="text-2xl font-bold mb-6">Appointment Details</h1>

                    <div data-testid="appointment-details" className="space-y-4">
                        <div className="flex justify-between border-b pb-4">
                            <span className="font-semibold">Status:</span>
                            <span data-testid="appointment-status" className={`status-badge ${appointment.status}`}>
                                {appointment.status}
                            </span>
                        </div>

                        <div className="flex justify-between border-b pb-4">
                            <span className="font-semibold">Confirmation Code:</span>
                            <span className="font-mono">{appointment.confirmation_code}</span>
                        </div>

                        <div className="flex justify-between border-b pb-4">
                            <span className="font-semibold">Service:</span>
                            <span data-testid="appointment-service">{appointment.service_name}</span>
                        </div>

                        <div className="flex justify-between border-b pb-4">
                            <span className="font-semibold">Date:</span>
                            <span data-testid="appointment-date">
                                {new Date(appointment.start_time).toLocaleDateString()}
                            </span>
                        </div>

                        <div className="flex justify-between border-b pb-4">
                            <span className="font-semibold">Time:</span>
                            <span data-testid="appointment-time">
                                {new Date(appointment.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>

                        {appointment.status !== 'cancelled' && (
                            <div className="mt-8 pt-4 border-t">
                                <button
                                    data-testid="cancel-appointment-button"
                                    onClick={() => setShowCancelModal(true)}
                                    className="text-red-600 hover:text-red-800 font-medium"
                                >
                                    Cancel Appointment
                                </button>
                            </div>
                        )}

                        {appointment.status === 'cancelled' && (
                            <div data-testid="cancellation-success" className="mt-4 p-4 bg-red-50 text-red-700 rounded">
                                This appointment has been cancelled.
                            </div>
                        )}
                    </div>
                </div>
            </main>
            <Footer />

            {showCancelModal && (
                <div data-testid="cancel-confirm-dialog" className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full">
                        <h3 className="text-xl font-bold mb-4">Cancel Appointment</h3>
                        <p className="mb-4">Confirm with the email used to book, and a short reason.</p>

                        <label htmlFor="cancel-email" className="block font-semibold mb-1">Email used to book</label>
                        <input
                            id="cancel-email"
                            data-testid="cancel-email"
                            type="email"
                            autoComplete="email"
                            value={cancelEmail}
                            onChange={(e) => setCancelEmail(e.target.value)}
                            className="w-full border rounded p-2 mb-4"
                            placeholder="you@example.com"
                        />

                        <textarea
                            data-testid="cancellation-reason"
                            value={cancelReason}
                            onChange={(e) => setCancelReason(e.target.value)}
                            className="w-full border rounded p-2 mb-4"
                            placeholder="Reason for cancellation..."
                            rows={3}
                        />

                        {cancelError && (
                            <p data-testid="cancel-error" className="text-red-600 mb-4">{cancelError}</p>
                        )}

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowCancelModal(false)}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
                            >
                                Keep Appointment
                            </button>
                            <button
                                data-testid="confirm-cancel-button"
                                onClick={handleCancel}
                                disabled={cancelLoading || !cancelReason.trim() || !cancelEmail.trim()}
                                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                            >
                                {cancelLoading ? 'Cancelling...' : 'Confirm Cancellation'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AppointmentPage;
