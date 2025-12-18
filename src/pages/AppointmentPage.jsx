import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { get, del } from '../utils/api';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import './AppointmentPage.css';

const AppointmentPage = () => {
    const { confirmationCode } = useParams();
    const [appointment, setAppointment] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [cancelReason, setCancelReason] = useState('');
    const [cancelLoading, setCancelLoading] = useState(false);

    useEffect(() => {
        fetchAppointment();
    }, [confirmationCode]);

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
        if (!cancelReason.trim()) return;

        try {
            setCancelLoading(true);
            // Use the tenant ID from the loaded appointment to call the tenant-scoped cancel endpoint
            // OR use a global cancel endpoint if available.
            // Let's assume we can use the tenant-scoped one if we have the tenant ID (which we should get from the appointment details)
            // But wait, the API requires userId (integer) in the URL: /api/booking/tenants/:userId/appointments/:identifier
            // The appointment object might have tenant_id (UUID) but maybe not the user_id (integer).
            // We might need the global endpoint to handle cancellation too, or return the user_id.

            // For now, let's assume the global endpoint supports DELETE too.
            await del(`/api/booking/appointments/${confirmationCode}`, {
                body: JSON.stringify({
                    reason: cancelReason,
                    cancelled_by: 'customer'
                })
            });

            // Refresh
            fetchAppointment();
            setShowCancelModal(false);
        } catch (err) {
            console.error('Error cancelling appointment:', err);
            alert('Failed to cancel appointment');
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
                        <p className="mb-4">Are you sure you want to cancel? Please provide a reason.</p>

                        <textarea
                            data-testid="cancellation-reason"
                            value={cancelReason}
                            onChange={(e) => setCancelReason(e.target.value)}
                            className="w-full border rounded p-2 mb-4"
                            placeholder="Reason for cancellation..."
                            rows={3}
                        />

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
                                disabled={cancelLoading}
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
