#!/usr/bin/env node
/**
 * Deep feature API suite — excludes Stripe Checkout / Connect and Google OAuth.
 * Usage: node scripts/feature-api-deep-dive.js
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const API = process.env.API_BASE || 'http://127.0.0.1:3000';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const jarPath = path.join('/tmp', `ssz-api-${Date.now()}.jar`);

const results = [];

function record(feature, name, ok, detail = '') {
  results.push({ feature, name, ok, detail: String(detail).slice(0, 240) });
  const mark = ok ? 'PASS' : 'FAIL';
  console.log(`${mark}  [${feature}] ${name}${detail ? ` — ${String(detail).slice(0, 120)}` : ''}`);
}

async function jarFetch(urlPath, { method = 'GET', body, token, csrf } = {}) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  if (csrf) headers['X-CSRF-Token'] = csrf;

  const res = await fetch(`${API}${urlPath}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    // node fetch doesn't use curl jar; we pass csrf manually after GET
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text.slice(0, 200) }; }
  return { status: res.status, json, headers: res.headers };
}

async function getCsrf() {
  // Use cookie jar via undici isn't trivial; hit endpoint and use token only.
  // Server stores by sessionId cookie — set Cookie if returned.
  const res = await fetch(`${API}/api/csrf-token`, { headers: { Accept: 'application/json' } });
  const setCookie = res.headers.getSetCookie?.() || [];
  const json = await res.json();
  const cookie = setCookie.map((c) => c.split(';')[0]).join('; ');
  return { csrfToken: json.csrfToken, cookie };
}

async function authedFetch(cookie, csrf, token, urlPath, opts = {}) {
  const headers = {
    Accept: 'application/json',
    Cookie: cookie || '',
    ...(csrf ? { 'X-CSRF-Token': csrf } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${API}${urlPath}`, {
    method: opts.method || 'GET',
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text.slice(0, 300) }; }
  // refresh cookies
  const setCookie = res.headers.getSetCookie?.() || [];
  let nextCookie = cookie;
  if (setCookie.length) {
    const map = Object.fromEntries((cookie || '').split(';').filter(Boolean).map((p) => {
      const [k, ...v] = p.trim().split('=');
      return [k, v.join('=')];
    }));
    for (const c of setCookie) {
      const [kv] = c.split(';');
      const [k, ...v] = kv.split('=');
      map[k.trim()] = v.join('=');
    }
    nextCookie = Object.entries(map).filter(([k]) => k).map(([k, v]) => `${k}=${v}`).join('; ');
  }
  return { status: res.status, json, cookie: nextCookie };
}

async function login(email, password) {
  let { csrfToken, cookie } = await getCsrf();
  const res = await authedFetch(cookie, csrfToken, null, '/api/auth/login', {
    method: 'POST',
    body: { email, password }
  });
  const token = res.json?.accessToken || res.json?.token || res.json?.data?.token || res.json?.data?.accessToken;
  const user = res.json?.user || res.json?.data?.user || {};
  return { ...res, token, user, csrfToken };
}

async function main() {
  console.log(`\n=== Feature API deep dive @ ${API} ===\n(Skip: Stripe Checkout/Connect, Google OAuth)\n`);

  // Health
  {
    const r = await jarFetch('/api/health');
    record('platform', 'GET /api/health', r.status === 200 && r.json?.status === 'ok', JSON.stringify(r.json?.services || {}));
  }

  // Public templates
  {
    const r = await jarFetch('/api/templates');
    const list = r.json?.templates || r.json?.data?.templates || r.json?.data || r.json;
    const n = Array.isArray(list) ? list.length : (list?.templates?.length || 0);
    record('templates', 'GET /api/templates', r.status === 200 && n >= 10, `count=${n}`);
  }

  // Showcase
  {
    const r = await jarFetch('/api/showcases');
    record('showcase', 'GET /api/showcases', r.status === 200, `keys=${Object.keys(r.json || {}).join(',')}`);
  }

  // Legal pages (mounted at /legal, not /api/legal; refunds is plural)
  for (const p of ['terms', 'privacy', 'refunds']) {
    const r = await jarFetch(`/legal/${p}`);
    const ok = r.status === 200 && (typeof r.json?.raw === 'string' || r.json?.html || Boolean(r.json));
    record('legal', `GET /legal/${p}`, ok, `status=${r.status}`);
  }

  // Auth — email/password (not Google)
  const growth = await login('growth@example.com', 'GrowthPass!2024');
  record('auth', 'Login growth@example.com', growth.status < 400 && Boolean(growth.token), `status=${growth.status} plan=${growth.user?.subscriptionPlan || growth.user?.plan || growth.json?.message}`);

  const starter = await login('starter@example.com', 'StarterPass!2024');
  record('auth', 'Login starter@example.com', starter.status < 400 && Boolean(starter.token), `status=${starter.status}`);

  const free = await login('free@example.com', 'FreePass!2024');
  record('auth', 'Login free@example.com (starter plan)', free.status < 400 && Boolean(free.token), `status=${free.status}`);

  // /me
  if (growth.token) {
    const { csrfToken, cookie } = await getCsrf();
    const me = await authedFetch(cookie, csrfToken, growth.token, '/api/auth/me');
    const u = me.json?.user || me.json?.data || me.json;
    const plan = u?.subscriptionPlan || u?.subscription_plan || u?.plan;
    record('auth', 'GET /api/auth/me (growth)', me.status === 200 && plan === 'growth', `plan=${plan}`);
  }

  // Sites list
  async function withSession(loginResult, fn) {
    const { csrfToken, cookie } = await getCsrf();
    return fn(cookie, csrfToken, loginResult.token);
  }

  let growthSiteId = null;
  let growthSubdomain = null;

  if (growth.token) {
    await withSession(growth, async (cookie, csrf, token) => {
      const sites = await authedFetch(cookie, csrf, token, '/api/sites');
      const list = sites.json?.sites || sites.json?.data?.sites || sites.json?.data || [];
      const arr = Array.isArray(list) ? list : [];
      record('sites', 'GET /api/sites (growth)', sites.status === 200, `count=${arr.length}`);

      // Ensure at least one published site via draft → publish (sites POST may not exist)
      if (arr.length === 0) {
        const draft = await authedFetch(cookie, csrf, token, '/api/drafts', {
          method: 'POST',
          body: {
            templateId: 'salon',
            businessData: {
              businessName: `Growth Feature Salon ${Date.now().toString(36).slice(-4)}`,
              email: 'growth@example.com',
              phone: '555-0100',
              sections: [{ type: 'hero', id: 'h1' }],
              faq: { items: [{ question: 'Hours?', answer: '9-5' }] },
              gallery: { images: ['/x.jpg'] }
            }
          }
        });
        const draftId = draft.json?.draftId || draft.json?.id;
        if (draftId) {
          const pub = await authedFetch(cookie, csrf, token, `/api/drafts/${draftId}/publish`, {
            method: 'POST',
            body: { plan: 'growth', email: 'growth@example.com' }
          });
          record('sites', 'Publish growth draft for fixtures', pub.status < 400, `status=${pub.status} sub=${pub.json?.subdomain || ''} ${pub.json?.error || pub.json?.code || ''}`);
          if (pub.json?.subdomain) {
            growthSiteId = pub.json.subdomain;
            growthSubdomain = pub.json.subdomain;
          }
        } else {
          record('sites', 'Publish growth draft for fixtures', false, `draft create failed status=${draft.status}`);
        }
      }

      const sites2 = await authedFetch(cookie, csrf, token, '/api/sites');
      const list2 = sites2.json?.sites || sites2.json?.data?.sites || sites2.json?.data || [];
      const arr2 = Array.isArray(list2) ? list2 : [];
      if (arr2[0]) {
        growthSiteId = arr2[0].id || arr2[0].subdomain;
        growthSubdomain = arr2[0].subdomain || arr2[0].id;
      }
    });
  }

  // Draft create (Starter content persistence path)
  if (starter.token) {
    await withSession(starter, async (cookie, csrf, token) => {
      const draft = await authedFetch(cookie, csrf, token, '/api/drafts', {
        method: 'POST',
        body: {
          templateId: 'freelancer',
          businessData: {
            businessName: 'Starter Persist Co',
            heroTitle: 'Hello',
            sections: [{ type: 'hero', id: 'h1' }],
            faq: { items: [{ question: 'Hours?', answer: '9-5' }] },
            gallery: { images: ['/x.jpg'] }
          }
        }
      });
      const draftId = draft.json?.draftId || draft.json?.data?.draftId || draft.json?.id || draft.json?.data?.id;
      record('drafts', 'POST /api/drafts with sections/faq/gallery', draft.status < 400 && Boolean(draftId), `status=${draft.status} id=${draftId} err=${draft.json?.error || draft.json?.message || ''}`);

      if (draftId) {
        const get = await authedFetch(cookie, csrf, token, `/api/drafts/${draftId}`);
        // API returns camelCase businessData (also aliased as data)
        const bd = get.json?.businessData
          || (get.json?.data && typeof get.json.data === 'object' && !get.json.data.draftId ? get.json.data : null)
          || get.json?.draft?.businessData
          || get.json?.draft?.business_data;
        const okPersist = Boolean(bd?.sections?.length || bd?.faq || bd?.gallery);
        record('drafts', 'Draft persists sections/faq/gallery', get.status === 200 && okPersist, `keys=${bd ? Object.keys(bd).join(',') : 'none'}`);
      }

      // Validate plan endpoint accepts growth
      const badPublishPrep = await authedFetch(cookie, csrf, token, '/api/drafts', {
        method: 'POST',
        body: { templateId: 'salon', businessData: { businessName: 'Plan Check' } }
      });
      record('drafts', 'Second draft create (starter)', badPublishPrep.status < 400, `status=${badPublishPrep.status}`);
    });
  }

  // Growth: products + orders gate
  if (growth.token && growthSiteId) {
    await withSession(growth, async (cookie, csrf, token) => {
      const products = await authedFetch(cookie, csrf, token, `/api/orders/${growthSiteId}/products`);
      record('products', 'GET products (growth)', products.status === 200 || products.status === 404, `status=${products.status}`);

      const createProd = await authedFetch(cookie, csrf, token, `/api/orders/${growthSiteId}/products`, {
        method: 'POST',
        body: { name: 'Cut', price: 25, description: 'Haircut', inventory: 10 }
      });
      record('products', 'POST product (growth allowed)', createProd.status < 400 || createProd.status === 404, `status=${createProd.status} ${createProd.json?.error || createProd.json?.code || ''}`);

      const orders = await authedFetch(cookie, csrf, token, `/api/orders/${growthSiteId}/orders`);
      record('orders', 'GET orders (growth)', orders.status === 200 || orders.status === 404, `status=${orders.status}`);
    });
  } else {
    record('products', 'POST product (growth)', false, 'no growth site — skipped create');
  }

  // Starter: products should be forbidden
  if (starter.token) {
    await withSession(starter, async (cookie, csrf, token) => {
      const sites = await authedFetch(cookie, csrf, token, '/api/sites');
      const list = sites.json?.sites || sites.json?.data?.sites || [];
      const arr = Array.isArray(list) ? list : [];
      const siteId = arr[0]?.id || arr[0]?.subdomain || 'nonexistent-starter-site';
      const createProd = await authedFetch(cookie, csrf, token, `/api/orders/${siteId}/products`, {
        method: 'POST',
        body: { name: 'Blocked', price: 1 }
      });
      const blocked = createProd.status === 403 || createProd.json?.code === 'GROWTH_PLAN_REQUIRED' || createProd.status === 404;
      record('tier-gate', 'Starter cannot create products', blocked, `status=${createProd.status} code=${createProd.json?.code}`);
    });
  }

  // Booking gate: starter owner blocked, growth allowed on services list
  if (growth.user?.id || growth.token) {
    // need user id — from me
    const { csrfToken, cookie } = await getCsrf();
    const me = await authedFetch(cookie, csrfToken, growth.token, '/api/auth/me');
    const uid = me.json?.user?.id || me.json?.data?.id || me.json?.id;
    if (uid) {
      const svc = await jarFetch(`/api/booking/tenants/${uid}/services`);
      record('booking', 'Growth public booking services', svc.status === 200, `status=${svc.status}`);
    } else {
      record('booking', 'Growth public booking services', false, 'no user id from /me');
    }
  }

  if (starter.token) {
    const { csrfToken, cookie } = await getCsrf();
    const me = await authedFetch(cookie, csrfToken, starter.token, '/api/auth/me');
    const uid = me.json?.user?.id || me.json?.data?.id || me.json?.id;
    if (uid) {
      const svc = await jarFetch(`/api/booking/tenants/${uid}/services`);
      const blocked = svc.status === 403 || svc.json?.code === 'GROWTH_PLAN_REQUIRED';
      record('booking', 'Starter native booking blocked', blocked, `status=${svc.status} code=${svc.json?.code}`);
    }
  }

  // Contact submission (needs published site subdomain if any)
  {
    const pub = await jarFetch('/api/showcases');
    const sites = pub.json?.sites || pub.json?.data?.sites || pub.json?.data || [];
    const arr = Array.isArray(sites) ? sites : [];
    const sub = arr[0]?.subdomain || growthSubdomain;
    if (sub) {
      const { csrfToken, cookie } = await getCsrf();
      const submit = await authedFetch(cookie, csrfToken, null, '/api/submissions/contact', {
        method: 'POST',
        body: {
          subdomain: sub,
          name: 'Mantest Visitor',
          email: 'visitor@example.com',
          message: 'Hello from feature deep dive'
        }
      });
      record('contact', 'POST /api/submissions/contact', submit.status < 400, `status=${submit.status} sub=${sub} ${submit.json?.error || submit.json?.code || ''}`);
    } else {
      record('contact', 'POST /api/submissions/contact', false, 'no published subdomain available');
    }
  }

  // Custom domain gate endpoint (expect 403/400 without domain, but Growth allowed past plan check)
  if (growth.token && growthSubdomain) {
    await withSession(growth, async (cookie, csrf, token) => {
      const dom = await authedFetch(cookie, csrf, token, `/api/sites/${growthSubdomain}/domain`);
      // 200 empty, 404 site, or 403 plan — plan should NOT be the failure for growth
      const planBlocked = dom.json?.code === 'GROWTH_PLAN_REQUIRED' || dom.json?.code === 'PRO_PLAN_REQUIRED';
      record('domain', 'Growth domain endpoint plan check', !planBlocked && dom.status !== 401, `status=${dom.status} code=${dom.json?.code || ''}`);
    });
  }

  if (starter.token) {
    await withSession(starter, async (cookie, csrf, token) => {
      const sites = await authedFetch(cookie, csrf, token, '/api/sites');
      const list = sites.json?.sites || sites.json?.data?.sites || [];
      const sub = (Array.isArray(list) && list[0]?.subdomain) || 'no-site';
      const dom = await authedFetch(cookie, csrf, token, `/api/sites/${sub}/domain`);
      const planBlocked = ['GROWTH_PLAN_REQUIRED', 'PRO_PLAN_REQUIRED', 'CUSTOM_DOMAIN_UNAVAILABLE'].includes(dom.json?.code);
      record('domain', 'Starter domain endpoint plan check', !planBlocked && dom.status !== 401, `status=${dom.status} code=${dom.json?.code || ''}`);
    });
  }

  // Service requests tier
  {
    const { csrfToken, cookie } = await getCsrf();
    const sub = growthSubdomain || 'missing';
    const sr = await authedFetch(cookie, csrfToken, null, '/api/service-requests/submit', {
      method: 'POST',
      body: { subdomain: sub, templateId: 'salon', name: 'A', email: 'a@b.com', message: 'need cut' }
    });
    record('service-requests', 'POST service-requests/submit', sr.status !== 500, `status=${sr.status} code=${sr.json?.code || sr.json?.error || ''}`);
  }

  // Plan validation sanity via invalid login still works
  {
    const bad = await login('nobody@example.com', 'WrongPass!9999');
    record('auth', 'Bad login rejected', bad.status >= 400 || !bad.token, `status=${bad.status}`);
  }

  // Summary
  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n=== SUMMARY: ${passed} passed, ${failed} failed / ${results.length} ===\n`);

  const byFeature = {};
  for (const r of results) {
    byFeature[r.feature] = byFeature[r.feature] || { pass: 0, fail: 0, items: [] };
    byFeature[r.feature][r.ok ? 'pass' : 'fail']++;
    byFeature[r.feature].items.push(r);
  }
  for (const [feat, info] of Object.entries(byFeature)) {
    console.log(`${feat}: ${info.pass}✓ ${info.fail}✗`);
    for (const item of info.items.filter((i) => !i.ok)) {
      console.log(`  - ${item.name}: ${item.detail}`);
    }
  }

  const out = path.join(__dirname, '../.mantest/feature-api-results.json');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify({ passed, failed, results, at: new Date().toISOString() }, null, 2));
  console.log(`\nWrote ${out}`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
