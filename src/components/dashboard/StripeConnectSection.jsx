import PaymentStatusCard from '../ecommerce/PaymentStatusCard';
import './StripeConnectSection.css';

function StripeConnectSection() {
  return (
    <section className="stripe-connect-section" data-testid="stripe-connect-section">
      <PaymentStatusCard />
    </section>
  );
}

export default StripeConnectSection;
