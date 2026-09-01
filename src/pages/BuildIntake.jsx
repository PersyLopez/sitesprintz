import React, { useMemo, useState } from 'react';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import { Link } from 'react-router-dom';
import { useLocale } from '../i18n/LocaleContext.jsx';
import api from '../services/api';
import { FEATURE_MODULE_KEYS, SERVICE_RADIUS_MILES, recommendedPlanFromFeatures } from '../config/buildIntake.js';
import { isSetupOfferActive, setupOfferEndLabel, PRICING_CONFIG, PLATFORM_SUPPORT_EMAIL } from '../config/pricing.config.js';
import { laborDisplayVars, laborInquiryMailto } from '../utils/laborInquiryMailto';
import ImageUploader from '../components/setup/forms/ImageUploader';
import { uploadIntakeImage } from '../utils/siteImageUpload.js';
import './ContentPage.css';
import './BuildIntake.css';

const INITIAL_FORM = {
  contactName: '',
  contactEmail: '',
  contactPhone: '',
  businessName: '',
  businessTagline: '',
  cityServiceArea: '',
  streetAddress: '',
  locationPublic: false,
  serviceAreaLabel: '',
  serviceRadiusMiles: 10,
  hoursText: '',
  byAppointment: false,
  websiteUrl: '',
  instagram: '',
  facebook: '',
  scheduler: '',
  googleMaps: '',
  logoUrl: '',
  photosUrl: '',
  coverPhotoUrl: '',
  aboutBio: '',
  customDomain: '',
  servicesText: '',
  depositCancellationPolicy: '',
  operatingModel: '',
  staffNames: '',
  productsText: '',
  fulfillmentMode: '',
  extraAlbumUrl: '',
  staffProfilesText: '',
  faqText: '',
  beforeAfterText: '',
  quotesText: '',
  brandColors: '',
  brandFileUrl: '',
  referenceUrls: '',
  vibeSentence: '',
  website: '',
};

function BuildIntake() {
  const { t, locale } = useLocale();
  const [form, setForm] = useState(INITIAL_FORM);
  const [features, setFeatures] = useState(() => (
    Object.fromEntries(FEATURE_MODULE_KEYS.map((key) => [key, false]))
  ));
  const extras = laborDisplayVars() || { care: 75, extra: 39, brand: 99, look: 250, batches: 2 };
  const offerActive = isSetupOfferActive();
  const offerEnd = setupOfferEndLabel(locale);
  const mailto = laborInquiryMailto(offerActive ? 'setup offer' : 'build on request');
  const [catalogItems, setCatalogItems] = useState([{ name: '', price: '', photoUrl: '' }]);
  const [acceptedManagedPlan, setAcceptedManagedPlan] = useState(false);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  const updateField = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const toggleFeature = (key) => {
    setFeatures((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const featurePanels = useMemo(() => ({
    booking: features.booking && (
      <div className="build-intake-feature-panel" data-testid="build-feature-booking">
        <div className="build-intake-field">
          <label htmlFor="servicesText">{t('build.fields.servicesText')}</label>
          <textarea id="servicesText" value={form.servicesText} onChange={(e) => updateField('servicesText', e.target.value)} />
        </div>
        <div className="build-intake-field">
          <label htmlFor="depositCancellationPolicy">{t('build.fields.depositCancellationPolicy')}</label>
          <textarea id="depositCancellationPolicy" value={form.depositCancellationPolicy} onChange={(e) => updateField('depositCancellationPolicy', e.target.value)} />
        </div>
        <div className="build-intake-grid build-intake-grid--2">
          <div className="build-intake-field">
            <label htmlFor="operatingModel">{t('build.fields.operatingModel')}</label>
            <select id="operatingModel" value={form.operatingModel} onChange={(e) => updateField('operatingModel', e.target.value)}>
              <option value="">{t('build.fields.select')}</option>
              <option value="solo">{t('build.fields.operatingSolo')}</option>
              <option value="team">{t('build.fields.operatingTeam')}</option>
            </select>
          </div>
          <div className="build-intake-field">
            <label htmlFor="staffNames">{t('build.fields.staffNames')}</label>
            <input id="staffNames" type="text" value={form.staffNames} onChange={(e) => updateField('staffNames', e.target.value)} />
          </div>
        </div>
      </div>
    ),
    shop: features.shop && (
      <div className="build-intake-feature-panel" data-testid="build-feature-shop">
        <div className="build-intake-field">
          <label htmlFor="productsText">{t('build.fields.productsText')}</label>
          <textarea id="productsText" value={form.productsText} onChange={(e) => updateField('productsText', e.target.value)} />
        </div>
        <div className="build-intake-field">
          <label htmlFor="fulfillmentMode">{t('build.fields.fulfillmentMode')}</label>
          <select id="fulfillmentMode" value={form.fulfillmentMode} onChange={(e) => updateField('fulfillmentMode', e.target.value)}>
            <option value="">{t('build.fields.select')}</option>
            <option value="pickup">{t('build.fields.fulfillmentPickup')}</option>
            <option value="shipping">{t('build.fields.fulfillmentShipping')}</option>
            <option value="both">{t('build.fields.fulfillmentBoth')}</option>
          </select>
        </div>
      </div>
    ),
    gallery: features.gallery && (
      <div className="build-intake-feature-panel" data-testid="build-feature-gallery">
        <div className="build-intake-field">
          <label htmlFor="extraAlbumUrl">{t('build.fields.extraAlbumUrl')}</label>
          <input id="extraAlbumUrl" type="url" inputMode="url" value={form.extraAlbumUrl} onChange={(e) => updateField('extraAlbumUrl', e.target.value)} />
        </div>
      </div>
    ),
    staff: features.staff && (
      <div className="build-intake-feature-panel" data-testid="build-feature-staff">
        <div className="build-intake-field">
          <label htmlFor="staffProfilesText">{t('build.fields.staffProfilesText')}</label>
          <textarea id="staffProfilesText" value={form.staffProfilesText} onChange={(e) => updateField('staffProfilesText', e.target.value)} />
        </div>
      </div>
    ),
    faq: features.faq && (
      <div className="build-intake-feature-panel" data-testid="build-feature-faq">
        <div className="build-intake-field">
          <label htmlFor="faqText">{t('build.fields.faqText')}</label>
          <textarea id="faqText" value={form.faqText} onChange={(e) => updateField('faqText', e.target.value)} />
        </div>
      </div>
    ),
    beforeAfter: features.beforeAfter && (
      <div className="build-intake-feature-panel" data-testid="build-feature-beforeAfter">
        <div className="build-intake-field">
          <label htmlFor="beforeAfterText">{t('build.fields.beforeAfterText')}</label>
          <textarea id="beforeAfterText" value={form.beforeAfterText} onChange={(e) => updateField('beforeAfterText', e.target.value)} />
        </div>
      </div>
    ),
    quotes: features.quotes && (
      <div className="build-intake-feature-panel" data-testid="build-feature-quotes">
        <div className="build-intake-field">
          <label htmlFor="quotesText">{t('build.fields.quotesText')}</label>
          <textarea id="quotesText" value={form.quotesText} onChange={(e) => updateField('quotesText', e.target.value)} />
        </div>
      </div>
    ),
    brandMatch: features.brandMatch && (
      <div className="build-intake-feature-panel" data-testid="build-feature-brandMatch">
        <div className="build-intake-field">
          <label htmlFor="brandColors">{t('build.fields.brandColors')}</label>
          <input id="brandColors" type="text" value={form.brandColors} onChange={(e) => updateField('brandColors', e.target.value)} />
        </div>
        <div className="build-intake-field">
          <label htmlFor="brandFileUrl">{t('build.fields.brandFileUrl')}</label>
          <input id="brandFileUrl" type="url" inputMode="url" value={form.brandFileUrl} onChange={(e) => updateField('brandFileUrl', e.target.value)} />
        </div>
      </div>
    ),
    uniqueLook: features.uniqueLook && (
      <div className="build-intake-feature-panel" data-testid="build-feature-uniqueLook">
        <div className="build-intake-field">
          <label htmlFor="referenceUrls">{t('build.fields.referenceUrls')}</label>
          <textarea id="referenceUrls" value={form.referenceUrls} onChange={(e) => updateField('referenceUrls', e.target.value)} />
        </div>
        <div className="build-intake-field">
          <label htmlFor="vibeSentence">{t('build.fields.vibeSentence')}</label>
          <input id="vibeSentence" type="text" value={form.vibeSentence} onChange={(e) => updateField('vibeSentence', e.target.value)} />
        </div>
      </div>
    ),
  }), [features, form, t]);

  const recommendedPlan = recommendedPlanFromFeatures(features);

  const updateCatalog = (index, patch) => {
    setCatalogItems((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!offerActive && !acceptedManagedPlan) {
      setError(t('build.planAckRequired'));
      return;
    }
    setStatus('submitting');
    setError('');
    try {
      await api.initCsrf();
      await api.post('/api/build-intake', {
        ...form,
        catalogItems,
        coverPhotoUrl: form.coverPhotoUrl,
        features,
        wantsScheduling: Boolean(features.booking),
        wantsOrdering: Boolean(features.shop),
        preferredLocale: locale === 'es' ? 'es' : 'en',
        acceptedManagedPlan,
      });
      setStatus('success');
      setForm(INITIAL_FORM);
      setCatalogItems([{ name: '', price: '', photoUrl: '' }]);
      setFeatures(Object.fromEntries(FEATURE_MODULE_KEYS.map((key) => [key, false])));
      setAcceptedManagedPlan(false);
    } catch (err) {
      setStatus('error');
      setError(err.message || t('build.error'));
    }
  };

  return (
    <div className="content-page story-public">
      <Header />
      <main className="page-content">
        <div className="content-container">
          <h1>{t('build.title')}</h1>
          <p className="build-intake-intro">
            {offerActive
              ? t('build.offer.intro', { end: offerEnd, days: PRICING_CONFIG.trial.duration })
              : t('build.intro', extras)}
          </p>

          {mailto ? (
            <p>
              <a href={mailto} data-testid="build-intake-email-alt">
                {t('build.offer.emailAlt', { email: PLATFORM_SUPPORT_EMAIL })}
              </a>
            </p>
          ) : null}

          <div className="build-intake-privacy-callout" data-testid="build-plan-callout">
            {offerActive ? (
              <>
                <p>
                  <strong>
                    {recommendedPlan === 'growth' ? t('build.offer.planGrowth') : t('build.offer.planStarter')}
                  </strong>
                </p>
                <p>{t('build.offer.planManaged')}</p>
              </>
            ) : (
              <>
                <p><strong>{t('build.planCallout.title', extras)}</strong></p>
                <p>{t('build.planCallout.body', extras)}</p>
              </>
            )}
            <p>
              <Link to="/register?plan=growth">{t('build.planCallout.diyLink')}</Link>
            </p>
          </div>

          <form className="build-intake-form" onSubmit={handleSubmit} data-testid="build-intake-form" noValidate>
            <div className="build-intake-honeypot" aria-hidden="true">
              <label htmlFor="website">Website</label>
              <input
                id="website"
                name="website"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={form.website}
                onChange={(e) => updateField('website', e.target.value)}
              />
            </div>

            {offerActive ? (
              <section className="build-intake-section" data-testid="build-need-this" aria-labelledby="build-need-heading">
                <h2 id="build-need-heading">{t('build.offer.needTitle')}</h2>
                <p>{t('build.offer.needWhy')}</p>
                <div className="build-intake-grid build-intake-grid--2">
                  <div className="build-intake-field">
                    <label htmlFor="contactName">{t('build.fields.contactName')}</label>
                    <input id="contactName" required value={form.contactName} onChange={(e) => updateField('contactName', e.target.value)} />
                    <p className="build-intake-help">{t('build.offer.contactWhy')}</p>
                  </div>
                  <div className="build-intake-field">
                    <label htmlFor="contactEmail">{t('build.fields.contactEmail')}</label>
                    <input id="contactEmail" type="email" required value={form.contactEmail} onChange={(e) => updateField('contactEmail', e.target.value)} />
                  </div>
                  <div className="build-intake-field">
                    <label htmlFor="businessName">{t('build.fields.businessName')}</label>
                    <input id="businessName" required value={form.businessName} onChange={(e) => updateField('businessName', e.target.value)} />
                    <p className="build-intake-help">{t('build.offer.businessWhy')}</p>
                  </div>
                </div>
                <div className="build-intake-field">
                  <ImageUploader
                    label={t('build.offer.coverLabel')}
                    value={form.coverPhotoUrl}
                    onChange={(url) => updateField('coverPhotoUrl', url)}
                    allowUrl
                    uploadFn={uploadIntakeImage}
                    pickHint={t('build.offer.pickHint')}
                    urlHint={t('build.offer.photoHint')}
                  />
                  <p className="build-intake-help">{t('build.offer.coverHelp')}</p>
                </div>
                <h3>{t('build.offer.catalogTitle')}</h3>
                <p>{t('build.offer.catalogHelp')}</p>
                {catalogItems.map((item, index) => (
                  <div className="build-intake-catalog-row" key={`catalog-${index}`}>
                    <div className="build-intake-field">
                      <label htmlFor={`catalog-name-${index}`}>{t('build.offer.itemName')}</label>
                      <input
                        id={`catalog-name-${index}`}
                        value={item.name}
                        onChange={(e) => updateCatalog(index, { name: e.target.value })}
                      />
                    </div>
                    <div className="build-intake-field">
                      <label htmlFor={`catalog-price-${index}`}>{t('build.offer.itemPrice')}</label>
                      <input
                        id={`catalog-price-${index}`}
                        value={item.price}
                        onChange={(e) => updateCatalog(index, { price: e.target.value })}
                      />
                    </div>
                    <ImageUploader
                      label={t('build.offer.itemPhoto')}
                      value={item.photoUrl}
                      onChange={(url) => updateCatalog(index, { photoUrl: url })}
                      allowUrl
                      uploadFn={uploadIntakeImage}
                      pickHint={t('build.offer.pickHint')}
                      urlHint={t('build.offer.photoHint')}
                    />
                  </div>
                ))}
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setCatalogItems((prev) => [...prev, { name: '', price: '', photoUrl: '' }])}
                >
                  {t('build.offer.addItem')}
                </button>
                <div className="build-intake-checkboxes" style={{ marginTop: '1rem' }}>
                  <label htmlFor="feature-booking">
                    <input
                      id="feature-booking"
                      type="checkbox"
                      checked={features.booking}
                      onChange={() => toggleFeature('booking')}
                      data-testid="build-need-scheduling"
                    />
                    <span>{t('build.offer.scheduling')}</span>
                  </label>
                  <label htmlFor="feature-shop">
                    <input
                      id="feature-shop"
                      type="checkbox"
                      checked={features.shop}
                      onChange={() => toggleFeature('shop')}
                      data-testid="build-need-ordering"
                    />
                    <span>{t('build.offer.ordering')}</span>
                  </label>
                </div>
                {featurePanels.booking}
                {featurePanels.shop}
              </section>
            ) : null}

            {offerActive ? (
              <h2 className="build-intake-nice-heading">{t('build.offer.niceTitle')}</h2>
            ) : null}

            {offerActive ? (
              <section className="build-intake-section" aria-labelledby="build-extra-business-heading">
                <h2 id="build-extra-business-heading">{t('build.sections.business')}</h2>
                <div className="build-intake-grid">
                  <div className="build-intake-field">
                    <label htmlFor="businessTagline">{t('build.fields.businessTagline')}</label>
                    <input id="businessTagline" value={form.businessTagline} onChange={(e) => updateField('businessTagline', e.target.value)} />
                  </div>
                  <div className="build-intake-field">
                    <label htmlFor="aboutBio">{t('build.fields.aboutBio')}</label>
                    <textarea id="aboutBio" value={form.aboutBio} onChange={(e) => updateField('aboutBio', e.target.value)} />
                  </div>
                  <div className="build-intake-field">
                    <label htmlFor="customDomain">{t('build.fields.customDomain')}</label>
                    <input id="customDomain" value={form.customDomain} onChange={(e) => updateField('customDomain', e.target.value)} />
                  </div>
                  <div className="build-intake-field">
                    <label htmlFor="contactPhone">{t('build.fields.contactPhone')}</label>
                    <input id="contactPhone" type="tel" value={form.contactPhone} onChange={(e) => updateField('contactPhone', e.target.value)} />
                  </div>
                </div>
              </section>
            ) : null}

            {!offerActive ? (
            <>
            <section className="build-intake-section" aria-labelledby="build-contact-heading">
              <h2 id="build-contact-heading">{t('build.sections.contact')}</h2>
              <div className="build-intake-grid build-intake-grid--2">
                <div className="build-intake-field">
                  <label htmlFor="contactName">{t('build.fields.contactName')}</label>
                  <input id="contactName" required value={form.contactName} onChange={(e) => updateField('contactName', e.target.value)} />
                </div>
                <div className="build-intake-field">
                  <label htmlFor="contactEmail">{t('build.fields.contactEmail')}</label>
                  <input id="contactEmail" type="email" required value={form.contactEmail} onChange={(e) => updateField('contactEmail', e.target.value)} />
                </div>
                <div className="build-intake-field">
                  <label htmlFor="contactPhone">{t('build.fields.contactPhone')}</label>
                  <input id="contactPhone" type="tel" value={form.contactPhone} onChange={(e) => updateField('contactPhone', e.target.value)} />
                </div>
              </div>
            </section>

            <section className="build-intake-section" aria-labelledby="build-business-heading">
              <h2 id="build-business-heading">{t('build.sections.business')}</h2>
              <div className="build-intake-grid">
                <div className="build-intake-field">
                  <label htmlFor="businessName">{t('build.fields.businessName')}</label>
                  <input id="businessName" required value={form.businessName} onChange={(e) => updateField('businessName', e.target.value)} />
                </div>
                <div className="build-intake-field">
                  <label htmlFor="businessTagline">{t('build.fields.businessTagline')}</label>
                  <input id="businessTagline" value={form.businessTagline} onChange={(e) => updateField('businessTagline', e.target.value)} />
                </div>
                <div className="build-intake-field">
                  <label htmlFor="aboutBio">{t('build.fields.aboutBio')}</label>
                  <textarea id="aboutBio" value={form.aboutBio} onChange={(e) => updateField('aboutBio', e.target.value)} />
                </div>
                <div className="build-intake-field">
                  <label htmlFor="customDomain">{t('build.fields.customDomain')}</label>
                  <input id="customDomain" value={form.customDomain} onChange={(e) => updateField('customDomain', e.target.value)} />
                </div>
              </div>
            </section>
            </>
            ) : null}

            <section className="build-intake-section" aria-labelledby="build-location-heading">
              <h2 id="build-location-heading">{t('build.sections.location')}</h2>
              <div className="build-intake-privacy build-intake-privacy-callout" data-testid="build-address-privacy-callout">
                <p><strong>{t('build.locationCallout.title')}</strong></p>
                <p>{t('build.locationCallout.body')}</p>
              </div>
              <div className="build-intake-grid">
                <div className="build-intake-field">
                  <label htmlFor="cityServiceArea">{t('build.fields.cityServiceArea')}</label>
                  <input id="cityServiceArea" value={form.cityServiceArea} onChange={(e) => updateField('cityServiceArea', e.target.value)} />
                </div>
                <div className="build-intake-field">
                  <label htmlFor="streetAddress">{t('build.fields.streetAddress')}</label>
                  <input id="streetAddress" value={form.streetAddress} onChange={(e) => updateField('streetAddress', e.target.value)} />
                </div>
              </div>

              <fieldset className="build-intake-visibility" data-testid="build-address-visibility">
                <legend>{t('build.locationVisibility.legend')}</legend>
                <div className="build-intake-radio">
                  <label htmlFor="locationPrivate">
                    <input
                      id="locationPrivate"
                      name="locationVisibility"
                      type="radio"
                      checked={!form.locationPublic}
                      onChange={() => updateField('locationPublic', false)}
                    />
                    <span>{t('build.locationVisibility.private')}</span>
                  </label>
                  <p className="build-intake-help">{t('build.locationVisibility.privateHelp')}</p>
                </div>
                <div className="build-intake-radio">
                  <label htmlFor="locationPublic">
                    <input
                      id="locationPublic"
                      name="locationVisibility"
                      type="radio"
                      checked={form.locationPublic}
                      onChange={() => updateField('locationPublic', true)}
                    />
                    <span>{t('build.locationVisibility.public')}</span>
                  </label>
                  <p className="build-intake-help">{t('build.locationVisibility.publicHelp')}</p>
                </div>
              </fieldset>

              {!form.locationPublic && (
                <div className="build-intake-grid build-intake-grid--2" data-testid="build-service-area-fields">
                  <div className="build-intake-field">
                    <label htmlFor="serviceAreaLabel">{t('build.fields.serviceAreaLabel')}</label>
                    <input
                      id="serviceAreaLabel"
                      value={form.serviceAreaLabel}
                      onChange={(e) => updateField('serviceAreaLabel', e.target.value)}
                      placeholder={t('build.fields.serviceAreaLabelPlaceholder')}
                    />
                  </div>
                  <div className="build-intake-field">
                    <label htmlFor="serviceRadiusMiles">{t('build.fields.serviceRadiusMiles')}</label>
                    <select
                      id="serviceRadiusMiles"
                      value={form.serviceRadiusMiles}
                      onChange={(e) => updateField('serviceRadiusMiles', Number(e.target.value))}
                    >
                      {SERVICE_RADIUS_MILES.map((miles) => (
                        <option key={miles} value={miles}>{t('build.fields.radiusMiles', { miles })}</option>
                      ))}
                    </select>
                    <p className="build-intake-help">{t('build.fields.serviceAreaPreview', {
                      area: form.serviceAreaLabel || t('build.fields.serviceAreaFallback'),
                      miles: form.serviceRadiusMiles,
                    })}</p>
                  </div>
                </div>
              )}
            </section>

            <section className="build-intake-section" aria-labelledby="build-hours-heading">
              <h2 id="build-hours-heading">{t('build.sections.hours')}</h2>
              <label htmlFor="byAppointment">
                <input
                  id="byAppointment"
                  type="checkbox"
                  checked={form.byAppointment}
                  onChange={(e) => updateField('byAppointment', e.target.checked)}
                />
                {' '}
                {t('build.fields.byAppointment')}
              </label>
              {!form.byAppointment && (
                <div className="build-intake-field" style={{ marginTop: '1rem' }}>
                  <label htmlFor="hoursText">{t('build.fields.hoursText')}</label>
                  <textarea id="hoursText" value={form.hoursText} onChange={(e) => updateField('hoursText', e.target.value)} />
                </div>
              )}
            </section>

            <section className="build-intake-section" aria-labelledby="build-sources-heading">
              <h2 id="build-sources-heading">{t('build.sections.sources')}</h2>
              <p>{t('build.sourcesHint')}</p>
              <div className="build-intake-grid build-intake-grid--2">
                {['websiteUrl', 'instagram', 'facebook', 'scheduler', 'googleMaps', 'logoUrl', 'photosUrl'].map((field) => (
                  <div className="build-intake-field" key={field}>
                    <label htmlFor={field}>{t(`build.fields.${field}`)}</label>
                    <input
                      id={field}
                      type="url"
                      inputMode="url"
                      value={form[field]}
                      onChange={(e) => updateField(field, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </section>

            <section className="build-intake-section" aria-labelledby="build-features-heading">
              <h2 id="build-features-heading">{t('build.sections.features')}</h2>
              <p>{t('build.featuresHint')}</p>
              <div className="build-intake-checkboxes">
                {FEATURE_MODULE_KEYS.filter((key) => !(offerActive && (key === 'booking' || key === 'shop'))).map((key) => (
                  <div key={key}>
                    <label htmlFor={`feature-${key}`}>
                      <input
                        id={`feature-${key}`}
                        type="checkbox"
                        checked={features[key]}
                        onChange={() => toggleFeature(key)}
                      />
                      <span>{t(`build.features.${key}`, extras)}</span>
                    </label>
                    {featurePanels[key]}
                  </div>
                ))}
              </div>
            </section>

            <div className="build-intake-actions">
              {!offerActive ? (
              <label className="build-intake-plan-ack" htmlFor="acceptedManagedPlan">
                <input
                  id="acceptedManagedPlan"
                  type="checkbox"
                  required
                  checked={acceptedManagedPlan}
                  onChange={(e) => setAcceptedManagedPlan(e.target.checked)}
                  data-testid="build-plan-ack"
                />
                <span>{t('build.planAck', extras)}</span>
              </label>
              ) : null}
              {error && (
                <div className="build-intake-message build-intake-message--error" role="alert">
                  {error}
                </div>
              )}
              {status === 'success' && (
                <div className="build-intake-message build-intake-message--success" role="status">
                  {t('build.success')}
                </div>
              )}
              <button
                type="submit"
                className="btn-primary-large"
                disabled={status === 'submitting' || (!offerActive && !acceptedManagedPlan)}
                data-testid="build-intake-submit"
              >
                {status === 'submitting' ? t('build.submitting') : t('build.submit')}
              </button>
            </div>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default BuildIntake;
