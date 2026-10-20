(function initServiceAreaMaps() {
  function tileXY(lat, lng, zoom) {
    const n = 2 ** zoom;
    const x = Math.floor(((lng + 180) / 360) * n);
    const latRad = (lat * Math.PI) / 180;
    const y = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n);
    return { x, y, n };
  }

  function zoomForMiles(miles) {
    if (miles <= 5) return 12;
    if (miles <= 10) return 11;
    if (miles <= 15) return 10;
    if (miles <= 25) return 9;
    return 8;
  }

  function metersPerPixel(lat, zoom) {
    return (156543.03392 * Math.cos((lat * Math.PI) / 180)) / (2 ** zoom);
  }

  function renderMap(root) {
    const lat = Number(root.getAttribute('data-lat'));
    const lng = Number(root.getAttribute('data-lng'));
    const miles = Number(root.getAttribute('data-radius-miles'));
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || !Number.isFinite(miles) || miles <= 0) {
      return;
    }

    const zoom = zoomForMiles(miles);
    const { x, y } = tileXY(lat, lng, zoom);
    const size = 256;
    const tiles = [];
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        tiles.push(`<img alt="" width="${size}" height="${size}" src="https://tile.openstreetmap.org/${zoom}/${x + dx}/${y + dy}.png" loading="lazy" decoding="async" />`);
      }
    }

    const radiusPx = (miles * 1609.344) / metersPerPixel(lat, zoom);
    const diameter = Math.max(32, Math.min(Math.round(radiusPx * 2), 640));

    root.innerHTML = `<div class="ss-service-area-map-tiles">${tiles.join('')}</div>
      <div class="ss-service-area-map-ring" style="width:${diameter}px;height:${diameter}px"></div>
      <p class="ss-service-area-map-attr">Map © OpenStreetMap</p>`;
  }

  function boot() {
    const maps = document.querySelectorAll('[data-testid="service-area-map"]');
    if (!maps.length) return;
    const pending = [];
    maps.forEach((map) => {
      if (map.dataset.ssMapWatch === '1' || map.querySelector('img')) return;
      map.dataset.ssMapWatch = '1';
      pending.push(map);
    });
    if (!pending.length) return;
    if (typeof IntersectionObserver !== 'function') {
      pending.forEach(renderMap);
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        renderMap(entry.target);
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '200px' });
    pending.forEach((map) => observer.observe(map));
  }

  window.ssPaintServiceAreaMaps = boot;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
