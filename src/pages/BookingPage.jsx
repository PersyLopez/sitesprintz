import React from 'react';
import { useParams } from 'react-router-dom';
import BookingWidget from '../components/BookingWidget';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';

const BookingPage = () => {
    const { userId } = useParams();
    return (
        <div className="booking-page">
            <Header />
            <main className="container mx-auto px-4 py-8">
                <BookingWidget />
            </main>
            <Footer />
        </div>
    );
};

export default BookingPage;
