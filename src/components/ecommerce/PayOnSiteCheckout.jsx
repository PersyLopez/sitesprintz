import React, { useRef, useState } from 'react';
import { useCart } from '../../hooks/useCart';
import { useLocale } from '../../i18n/LocaleContext.jsx';
import { tLive } from '../../i18n/liveChrome/index.js';
import { api } from '../../services/api';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function PayOnSiteConfirmation({ confirmation }) {
  const { locale } = useLocale();
  const t = (key, vars) => tLive(locale, key, vars);
  if (!confirmation) return null;
  const displayTotal = Number(confirmation.total);
  const isDemo = confirmation.demo === true;
  const isDelivery = confirmation.fulfillmentType === 'delivery';
  return (
    <div className="pay-on-site-success" data-testid="pay-on-site-confirmation">
      <p><strong>{isDemo ? t('demoOrderPlaced') : t('orderPlaced')}</strong></p>
      <p>
        {isDemo
          ? t('demoOrderNote')
          : (isDelivery ? t('payOnDelivery') : t('payOnPickup'))}
      </p>
      {confirmation.orderId && (
        <p className="pay-on-site-order-id">{t('orderId', { id: String(confirmation.orderId).slice(0, 8) })}</p>
      )}
      {Number.isFinite(displayTotal) && (
        <p>{t('amountDue', { amount: displayTotal.toFixed(2) })}</p>
      )}
    </div>
  );
}

function PayOnSiteCheckout({
  siteId,
  showAsAlternative = false,
  onConfirmed,
  deliveryConfig = null,
}) {
  const { locale } = useLocale();
  const t = (key, vars) => tLive(locale, key, vars);
  const { cartItems, getCartTotal, clearCart } = useCart();
  const submittingRef = useRef(false);
  const deliveryEnabled = deliveryConfig?.enabled === true;
  const deliveryFee = Number(deliveryConfig?.flatFee) || 0;
  const maxRadiusMiles = deliveryConfig?.maxRadiusMiles || null;

  const [fulfillment, setFulfillment] = useState('pickup');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryLine2, setDeliveryLine2] = useState('');
  const [notes, setNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [confirmation, setConfirmation] = useState(null);

  const subtotal = getCartTotal();
  const isDelivery = deliveryEnabled && fulfillment === 'delivery';
  const displayTotal = isDelivery ? subtotal + deliveryFee : subtotal;
  const emailValid = EMAIL_PATTERN.test(customerEmail.trim());
  const addressOk = !isDelivery || deliveryAddress.trim().length >= 5;
  const isDisabled = processing
    || !siteId
    || cartItems.length === 0
    || !customerName.trim()
    || !emailValid
    || !addressOk;

  const handlePlaceOrder = async (event) => {
    event.preventDefault();
    if (isDisabled || submittingRef.current) return;

    submittingRef.current = true;
    setProcessing(true);
    setError(null);

    try {
      const data = await api.post(`/api/orders/${siteId}/pay-on-site`, {
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim(),
        customerPhone: customerPhone.trim() || undefined,
        notes: notes.trim() || undefined,
        fulfillment: isDelivery ? 'delivery' : 'pickup',
        deliveryAddress: isDelivery ? deliveryAddress.trim() : undefined,
        deliveryAddressLine2: isDelivery && deliveryLine2.trim()
          ? deliveryLine2.trim()
          : undefined,
        items: cartItems.map((item) => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity
        }))
      });

      const confirmedTotal = Number.parseFloat(String(data.order?.total ?? displayTotal));
      const placed = {
        orderId: data.order?.id,
        total: Number.isFinite(confirmedTotal) ? confirmedTotal : displayTotal,
        demo: data.order?.demo === true || String(data.order?.id || '').startsWith('demo-'),
        fulfillmentType: data.order?.fulfillmentType || (isDelivery ? 'delivery' : 'pay_on_site'),
      };
      onConfirmed?.(placed);
      clearCart();
      if (!onConfirmed) {
        setConfirmation(placed);
      }
    } catch (err) {
      submittingRef.current = false;
      setError(err.message || t('orderError'));
      setProcessing(false);
    }
  };

  if (confirmation) {
    return <PayOnSiteConfirmation confirmation={confirmation} />;
  }

  return (
    <form
      className="pay-on-site-form"
      onSubmit={handlePlaceOrder}
      data-testid="pay-on-site-checkout"
    >
      {showAsAlternative ? (
        <p className="pay-on-site-heading">{t('orPayOnSite')}</p>
      ) : (
        <p className="pay-on-site-heading">{t('placeOrder')}</p>
      )}
      <p className="pay-on-site-note">
        {t('payOnSiteNote')}
      </p>

      {deliveryEnabled && (
        <fieldset className="pay-on-site-fulfillment" data-testid="fulfillment-choice">
          <legend>{t('fulfillmentLabel')}</legend>
          <label className="pay-on-site-radio">
            <input
              type="radio"
              name="fulfillment"
              value="pickup"
              checked={fulfillment === 'pickup'}
              onChange={() => setFulfillment('pickup')}
              data-testid="fulfillment-pickup"
            />
            <span>{t('fulfillmentPickup')}</span>
          </label>
          <label className="pay-on-site-radio">
            <input
              type="radio"
              name="fulfillment"
              value="delivery"
              checked={fulfillment === 'delivery'}
              onChange={() => setFulfillment('delivery')}
              data-testid="fulfillment-delivery"
            />
            <span>
              {t('fulfillmentDelivery')}
              {deliveryFee > 0 ? ` (+$${deliveryFee.toFixed(2)})` : ''}
              {maxRadiusMiles ? ` · ${t('deliveryWithinMiles', { miles: maxRadiusMiles })}` : ''}
            </span>
          </label>
        </fieldset>
      )}

      <label htmlFor="pay-on-site-name">{t('name')}</label>
      <input
        id="pay-on-site-name"
        type="text"
        name="name"
        autoComplete="name"
        required
        value={customerName}
        onChange={(event) => setCustomerName(event.target.value)}
        data-testid="pay-on-site-name"
      />

      <label htmlFor="pay-on-site-email">{t('email')}</label>
      <input
        id="pay-on-site-email"
        type="email"
        name="email"
        autoComplete="email"
        required
        value={customerEmail}
        onChange={(event) => setCustomerEmail(event.target.value)}
        data-testid="pay-on-site-email"
      />

      <label htmlFor="pay-on-site-phone">{t('phoneOptional')}</label>
      <input
        id="pay-on-site-phone"
        type="tel"
        name="phone"
        autoComplete="tel"
        value={customerPhone}
        onChange={(event) => setCustomerPhone(event.target.value)}
        data-testid="pay-on-site-phone"
      />

      {isDelivery && (
        <>
          <label htmlFor="pay-on-site-address">{t('deliveryAddress')}</label>
          <input
            id="pay-on-site-address"
            type="text"
            name="address"
            autoComplete="street-address"
            required
            value={deliveryAddress}
            onChange={(event) => setDeliveryAddress(event.target.value)}
            data-testid="pay-on-site-delivery-address"
          />
          <label htmlFor="pay-on-site-address2">{t('deliveryAddressLine2')}</label>
          <input
            id="pay-on-site-address2"
            type="text"
            name="address2"
            autoComplete="address-line2"
            value={deliveryLine2}
            onChange={(event) => setDeliveryLine2(event.target.value)}
            data-testid="pay-on-site-delivery-address2"
          />
        </>
      )}

      <label htmlFor="pay-on-site-notes">{t('notesOptional')}</label>
      <textarea
        id="pay-on-site-notes"
        name="notes"
        rows={2}
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        data-testid="pay-on-site-notes"
      />

      {isDelivery && deliveryFee > 0 && (
        <p className="pay-on-site-fee-note" data-testid="delivery-fee-note">
          {t('deliveryFeeNote', {
            fee: deliveryFee.toFixed(2),
            subtotal: Number(subtotal).toFixed(2),
          })}
        </p>
      )}

      <button
        type="submit"
        className={`btn btn-checkout ${showAsAlternative ? 'btn-secondary' : 'btn-primary'}`}
        disabled={isDisabled}
        data-testid="pay-on-site-place-order"
      >
        {processing
          ? t('placingOrder')
          : t('placeOrderWithTotal', { amount: Number(displayTotal).toFixed(2) })}
      </button>

      {error && (
        <div className="checkout-error" data-testid="pay-on-site-error">
          {error}
        </div>
      )}
    </form>
  );
}

export default PayOnSiteCheckout;
