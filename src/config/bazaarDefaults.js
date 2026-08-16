/**
 * Bazaar Defaults — Smart content seeds for pop-up / temporary selling.
 *
 * Bazaar is the "easy" path: a weekend yard sale, food stall, or pop-up shop
 * gets a full online business experience (catalog + ordering + location +
 * payments) with minimal config and zero ceremony.
 *
 * This module provides:
 *   - BAZAAR_TYPES: the pop-up categories shown in the 2-step wizard
 *   - BAZAAR_ACCENTS: the approachable accent palette (mirrors layoutTokens)
 *   - getBazaarDefaults(): smart defaults for a pop-up type
 *   - buildBazaarSiteData(): assembles a complete siteData with layout metadata
 */

import { resolveTheme } from './layoutTokens.js';
import { resolveFeatures } from './layouts.js';

// ---------------------------------------------------------------------------
// Approachable accent palette (mirrors APPROACHABLE_ACCENTS in layoutTokens)
// ---------------------------------------------------------------------------

export const BAZAAR_ACCENTS = {
  market: { name: 'Market', value: '#c2683a', niches: ['food-stall', 'pop-up-food'] },
  garage: { name: 'Garage', value: '#a4563a', niches: ['yard-sale', 'estate-sale'] },
  stand:  { name: 'Stand',  value: '#c98a2b', niches: ['lemonade-stand', 'bake-sale'] },
  fair:   { name: 'Fair',   value: '#7a4a6b', niches: ['pop-up-shop', 'craft-market'] },
};

// ---------------------------------------------------------------------------
// Pop-up types
// ---------------------------------------------------------------------------

export const BAZAAR_TYPES = [
  {
    id: 'yard-sale',
    name: 'Yard Sale',
    icon: '🏠',
    description: 'Sell items from your driveway or garage',
    accent: 'garage',
    items: [
      { name: 'Assorted household items', price: '$1–$20', description: 'Furniture, decor, kitchenware' },
      { name: 'Clothing & accessories', price: '$2–$10', description: 'Gently used, good condition' },
      { name: 'Books & media', price: '$1–$5', description: 'Books, DVDs, games' },
    ],
    heroTitle: 'Weekend Yard Sale',
    heroSubtitle: 'Everything must go — bargains on household items, clothing, and more.',
  },
  {
    id: 'estate-sale',
    name: 'Estate Sale',
    icon: '🏛️',
    description: 'Larger sale of furnishings from an estate',
    accent: 'garage',
    items: [
      { name: 'Furniture', price: 'Various', description: 'Sofas, tables, chairs, dressers' },
      { name: 'Antiques & collectibles', price: 'Various', description: 'Curated, well-preserved pieces' },
      { name: 'Household & decor', price: 'Various', description: 'Art, rugs, lamps, kitchenware' },
    ],
    heroTitle: 'Estate Sale',
    heroSubtitle: 'Quality furnishings and collectibles available for purchase.',
  },
  {
    id: 'food-stall',
    name: 'Food Stall',
    icon: '🌮',
    description: 'Sell food or drinks for the weekend',
    accent: 'market',
    items: [
      { name: 'Signature dish', price: '$8', description: 'Our most popular item' },
      { name: 'Combo plate', price: '$12', description: 'A little of everything' },
      { name: 'Drinks', price: '$3', description: 'Refreshing beverages' },
    ],
    heroTitle: 'Weekend Food Stall',
    heroSubtitle: 'Fresh, homemade food — find us this weekend.',
  },
  {
    id: 'pop-up-food',
    name: 'Pop-Up Food',
    icon: '🍔',
    description: 'Temporary food event or pop-up kitchen',
    accent: 'market',
    items: [
      { name: 'Featured special', price: '$10', description: 'Today\'s highlight' },
      { name: 'Side or snack', price: '$5', description: 'Perfect to share' },
      { name: 'Drinks', price: '$4', description: 'Selection of beverages' },
    ],
    heroTitle: 'Pop-Up Kitchen',
    heroSubtitle: 'A limited-time menu — catch us while we\'re here.',
  },
  {
    id: 'lemonade-stand',
    name: 'Lemonade Stand',
    icon: '🍋',
    description: 'Classic stand — drinks, snacks, baked goods',
    accent: 'stand',
    items: [
      { name: 'Fresh lemonade', price: '$2', description: 'Made fresh, served cold' },
      { name: 'Snacks', price: '$1', description: 'Cookies, chips, and more' },
    ],
    heroTitle: 'Lemonade Stand',
    heroSubtitle: 'Fresh-squeezed lemonade and treats — stop by!',
  },
  {
    id: 'bake-sale',
    name: 'Bake Sale',
    icon: '🧁',
    description: 'Homemade baked goods for a weekend or event',
    accent: 'stand',
    items: [
      { name: 'Assorted cookies', price: '$2 each / $10 dozen', description: 'Homemade, fresh-baked' },
      { name: 'Cakes & pies', price: '$15–$25', description: 'Whole and by the slice' },
      { name: 'Brownies & bars', price: '$3', description: 'Rich and fudgy' },
    ],
    heroTitle: 'Bake Sale',
    heroSubtitle: 'Homemade treats — fresh-baked and delicious.',
  },
  {
    id: 'pop-up-shop',
    name: 'Pop-Up Shop',
    icon: '🛍️',
    description: 'Temporary retail — clothes, crafts, goods',
    accent: 'fair',
    items: [
      { name: 'Featured item', price: '$25', description: 'Our most popular piece' },
      { name: 'Accessories', price: '$10–$20', description: 'Curated selection' },
      { name: 'Gift items', price: '$15', description: 'Great for gifting' },
    ],
    heroTitle: 'Pop-Up Shop',
    heroSubtitle: 'A curated selection — available for a limited time.',
  },
  {
    id: 'craft-market',
    name: 'Craft Market',
    icon: '🎨',
    description: 'Handmade goods, art, and crafts',
    accent: 'fair',
    items: [
      { name: 'Handmade pieces', price: '$20–$50', description: 'One-of-a-kind, artisan-made' },
      { name: 'Prints & art', price: '$15–$40', description: 'Original and limited prints' },
      { name: 'Small gifts', price: '$10', description: 'Perfect, thoughtful tokens' },
    ],
    heroTitle: 'Craft Market',
    heroSubtitle: 'Handmade goods from local makers — this weekend only.',
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getTypeConfig(typeId) {
  return BAZAAR_TYPES.find((t) => t.id === typeId) || BAZAAR_TYPES[0];
}

function generateId() {
  return `bazaar-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ---------------------------------------------------------------------------
// getBazaarDefaults()
// ---------------------------------------------------------------------------

/**
 * Get smart defaults for a pop-up type.
 *
 * @param {string} typeId - Pop-up type id (food-stall, yard-sale, etc.)
 * @param {Object} [opts] - Optional overrides { openUntil }
 * @returns {Object} Default content for the pop-up
 */
export function getBazaarDefaults(typeId, opts = {}) {
  const config = getTypeConfig(typeId);
  const accentKey = config.accent;

  return {
    heroTitle: config.heroTitle,
    heroSubtitle: config.heroSubtitle,
    items: config.items.map((item, i) => ({
      ...item,
      id: generateId() + `-${i}`,
    })),
    contactAddress: '', // user fills in
    businessHours: '',  // user fills in
    accentKey,
    openUntil: opts.openUntil || null,
  };
}

// ---------------------------------------------------------------------------
// buildBazaarSiteData()
// ---------------------------------------------------------------------------

/**
 * Assemble a complete siteData object with bazaar layout metadata.
 *
 * This is the output of the 2-step Bazaar wizard — it produces a siteData
 * ready to load into SiteContext, including the _layout, _character, _level,
 * _theme, and _features metadata used by the layout engine.
 *
 * @param {Object} params
 * @param {string} params.popUpType - Pop-up type id
 * @param {string} params.businessName - Required: the seller/business name
 * @param {string} [params.location] - Where the sale is
 * @param {string} [params.hours] - When the sale is
 * @param {string} [params.openUntil] - Optional end-date for countdown
 * @param {string} [params.contactPhone] - Optional phone
 * @param {string} [params.contactEmail] - Optional email
 * @returns {Object} Complete siteData with layout metadata
 */
export function buildBazaarSiteData({
  popUpType = 'food-stall',
  businessName,
  location = '',
  hours = '',
  openUntil = null,
  contactPhone = '',
  contactEmail = '',
}) {
  const config = getTypeConfig(popUpType);
  const defaults = getBazaarDefaults(popUpType, { openUntil });

  // Resolve theme tokens for approachable character
  const theme = resolveTheme({
    layout: 'bazaar',
    character: 'approachable',
    level: 'solo',
    overrides: {
      accent: defaults.accentKey,
      accentValue: BAZAAR_ACCENTS[defaults.accentKey]?.value,
    },
  });

  // Resolve bazaar features (no booking offered)
  const features = resolveFeatures('bazaar');

  // Build canonical sections array
  const sections = [
    {
      id: generateId(),
      type: 'hero',
      variant: 'stall',
      enabled: true,
      order: 0,
      content: {
        eyebrow: businessName,
        title: defaults.heroTitle,
        subtitle: defaults.heroSubtitle,
        ctaText: features.onlineOrdering.enabled ? 'Order Now' : 'View Menu',
        ctaLink: features.onlineOrdering.enabled ? '#catalog' : '#contact',
      },
      settings: {},
    },
    {
      id: generateId(),
      type: 'catalog',
      variant: 'grid',
      enabled: true,
      order: 1,
      content: {
        title: 'What We\'re Selling',
        items: defaults.items,
      },
      settings: {},
    },
    {
      id: generateId(),
      type: 'how-to-order',
      enabled: true,
      order: 2,
      content: {
        title: 'How to Order',
        steps: features.onlineOrdering.enabled
          ? [
            'Browse the items above',
            'Tap "Add" on what you want',
            'Choose pickup or pay in person',
          ]
          : [
            'Browse the items above',
            'Come find us at the location',
            'Pay in person — cash or card',
          ],
      },
      settings: {},
    },
    {
      id: generateId(),
      type: 'hours',
      enabled: true,
      order: 3,
      content: {
        title: 'When We\'re Open',
        hours: hours || '',
        openUntil,
      },
      settings: {},
    },
    {
      id: generateId(),
      type: 'location',
      enabled: true,
      order: 4,
      content: {
        title: 'Where to Find Us',
        address: location || '',
        mapUrl: '',
      },
      settings: {},
    },
    {
      id: generateId(),
      type: 'contact',
      enabled: true,
      order: 5,
      content: {
        title: 'Questions?',
        email: contactEmail || '',
        phone: contactPhone || '',
      },
      settings: {},
    },
  ];

  return {
    businessName: businessName || config.name,
    heroTitle: defaults.heroTitle,
    heroSubtitle: defaults.heroSubtitle,
    contactAddress: location,
    contactPhone,
    contactEmail,
    businessHours: hours,
    openUntil,
    products: defaults.items,
    sections,

    // Layout metadata consumed by the engine
    _layout: 'bazaar',
    _character: 'approachable',
    _level: 'solo',
    _niche: popUpType,
    _theme: {
      layout: 'bazaar',
      character: 'approachable',
      level: 'solo',
      mode: theme.theme.mode,
      accent: theme.theme.accent,
      accentValue: theme.theme.accentValue,
    },
    _features: features,
  };
}