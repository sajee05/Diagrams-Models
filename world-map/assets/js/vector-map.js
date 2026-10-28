/**
 * Mapping Atlas — High-Performance Canvas Vector Map Engine
 * 1. 100% native HTML5 Canvas rendering engine: runs at solid 60 FPS.
 * 2. Unified standard Web Mercator projection across ALL project datasets.
 * 3. Legible physical geography:
 *    - Shaded contoured polygons for Mountain Ranges (both India and World).
 *    - Distinct area styling for Protected Areas (National Parks, Tiger Reserves, Biosphere Reserves, Ramsar Sites).
 *    - Flowing animated vector paths for Rivers.
 *    - Directional warm/cold vectors for Ocean Currents.
 *    - Legible vector symbols for Peaks (▲), Passes (⧖), Glaciers (❄), Lakes, Deserts, Grasslands, Straits.
 * 4. Master Toggles:
 *    - Borders: Toggles all sovereign country boundaries and Indian state borders.
 *    - Labels: Toggles all geographic text labels with halo anti-collision.
 * 5. Full two-way synchronization with the left sidebar list and multi-select layer filters.
 * 6. Smooth pan, zoom, pinch, fly-to, hover tooltip card, and quiz/recall support.
 */

window.WORLD_VECTOR_MAP = (function () {
  'use strict';

  // Constants
  const BASE_SCALE = 320;
  const WORLD_W = 2 * Math.PI * BASE_SCALE; // World circumference in projected space (~2010.62)
  const MIN_SCALE = 0.35;
  const MAX_SCALE = 18.0;

  // DOM Elements
  let stage = null;
  let cSea = null, cBg = null, cMid = null, cFl = null;
  let ctxSea = null, ctxBg = null, ctxMid = null, ctxFl = null;
  let floatingCard = null;

  // Viewport Dimensions & State
  let W = 0, H = 0, DPR = 1;
  const V = { s: 1.0, tx: 0, ty: 0 };
  let isReady = false;
  let currentTheme = 'light';
  let showBorders = true;
  let showLabels = true;
  let selectedId = null;
  let hoveredItem = null;

  // Animation & Rendering flags
  let rafId = 0;
  const dirty = { bg: true, mid: true, fl: true };
  let flowTime = 0;
  let animationTime = 0, animationLast = null;
  let animationPlaying = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let animationSpeed = 1;
  let terrainMode = 'cartographic';
  let terrainImage = null;
  let landClip = null;
  let entityScope = null;
  function inScope(item) { return !entityScope || entityScope.has(item.id) || entityScope.has(normKey(item.name)); }
  let animFly = null;

  // Gesture Tracking
  const ptrs = new Map();
  let gest = null;
  let lastTapTime = 0;

  // Category Filters
  const activeFilters = {
    national_park: true,
    tiger_reserve: true,
    biosphere_reserve: true,
    ramsar_site: true,
    river: true,
    mountain: true,
    peak: true,
    pass: true,
    glacier: true,
    states: true,
    current: true,
    wind: true,
    country: true,
    lake: true,
    desert: true,
    grassland: true,
    strait: true
  };

  // Pre-compiled Vector Datasets
  let compiledCountries = [];
  let compiledStates = [];
  let compiledRivers = [];
  let compiledMountains = [];
  let compiledProtectedAreas = [];
  let compiledPeaks = [];
  let compiledPasses = [];
  let compiledGlaciers = [];
  let compiledCurrents = [];
  let compiledWinds = [];
  let compiledWorldEntities = [];
  const entityIndex = new Map();

  // Color Palette
  const colors = {
    light: {
      sea: '#cad8e4',
      land: '#f1f5f9',
      landStroke: '#cbd5e1',
      borderCountry: '#94a3b8',
      borderState: '#cbd5e1',
      river: '#0284c7',
      riverFlow: '#ffffff',
      mountainFill: 'rgba(180, 83, 9, 0.16)',
      mountainStroke: '#78350f',
      mountainContour: 'rgba(180, 83, 9, 0.40)',
      mountainCrest: '#92400e',
      mountainCrestGlow: 'rgba(146, 64, 14, 0.25)',
      npFill: 'rgba(21, 128, 61, 0.35)',
      npStroke: '#15803d',
      trFill: 'rgba(120, 53, 15, 0.35)',
      trStroke: '#78350f',
      brFill: 'rgba(107, 33, 168, 0.22)',
      brStroke: '#7c3aed',
      ramsarFill: 'rgba(15, 118, 110, 0.30)',
      ramsarStroke: '#0f766e',
      currentWarm: '#ef4444',
      currentCold: '#0284c7',
      currentNeutral: '#64748b',
      peak: '#9333ea',
      peakLight: '#c084fc',
      pass: '#c2410c',
      glacier: '#0891b2',
      lake: '#0284c7',
      desert: '#d97706',
      grassland: '#16a34a',
      strait: '#0d9488',
      text: '#0f172a',
      textSub: '#475569',
      halo: '#ffffff',
      selPulse: '#2563eb'
    },
    dark: {
      sea: '#060f1e',
      land: '#0c1a2e',
      landStroke: '#1e3250',
      borderCountry: '#334a6e',
      borderState: '#1a2e4a',
      river: '#38bdf8',
      riverFlow: '#ffffff',
      mountainFill: 'rgba(245, 158, 11, 0.16)',
      mountainStroke: '#d4a77a',
      mountainContour: 'rgba(245, 158, 11, 0.45)',
      mountainCrest: '#fcd34d',
      mountainCrestGlow: 'rgba(251, 191, 36, 0.35)',
      npFill: 'rgba(34, 197, 94, 0.28)',
      npStroke: '#4ade80',
      trFill: 'rgba(245, 158, 11, 0.28)',
      trStroke: '#f59e0b',
      brFill: 'rgba(167, 139, 250, 0.22)',
      brStroke: '#a78bfa',
      ramsarFill: 'rgba(20, 184, 166, 0.25)',
      ramsarStroke: '#14b8a6',
      currentWarm: '#f87171',
      currentCold: '#38bdf8',
      currentNeutral: '#94a3b8',
      peak: '#a855f7',
      peakLight: '#e9d5ff',
      pass: '#fb923c',
      glacier: '#38bdf8',
      lake: '#38bdf8',
      desert: '#fbbf24',
      grassland: '#4ade80',
      strait: '#2dd4bf',
      text: '#f8fafc',
      textSub: '#94a3b8',
      halo: '#060e1a',
      selPulse: '#60a5fa'
    }
  };

  function getCol() {
    return colors[currentTheme] || colors.light;
  }

  // Projection Functions
  function project(lng, lat) {
    const x = (lng * (Math.PI / 180)) * BASE_SCALE;
    const latRad = Math.max(-85, Math.min(85, lat)) * (Math.PI / 180);
    const y = -Math.log(Math.tan(Math.PI / 4 + latRad / 2)) * BASE_SCALE;
    return [x, y];
  }

  function unproject(x, y) {
    const lng = (x / BASE_SCALE) * (180 / Math.PI);
    const latRad = 2 * Math.atan(Math.exp(-y / BASE_SCALE)) - Math.PI / 2;
    const lat = latRad * (180 / Math.PI);
    return [lng, lat];
  }

  function toScr(wx, wy) {
    return [W / 2 + V.tx + wx * V.s, H / 2 + V.ty + wy * V.s];
  }

  function toWld(sx, sy) {
    return [(sx - W / 2 - V.tx) / V.s, (sy - H / 2 - V.ty) / V.s];
  }

  function normKey(str) {
    return (str || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
  }

  // Initialization
  function init() {
    stage = document.getElementById('vectorMapStage');
    if (!stage) return false;

    // Detect theme
    currentTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';

    // Clear and build Canvas stack
    stage.innerHTML = `
      <canvas id="atlasCanvasSea" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none;"></canvas>
      <canvas id="atlasCanvasBg" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none;"></canvas>
      <canvas id="atlasCanvasMid" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none;"></canvas>
      <canvas id="atlasCanvasFl" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none;"></canvas>
      <div class="mp-floating-card" id="mapFloatingCard">
        <span class="card-badge" id="cardBadge">FEATURE</span>
        <div class="card-title" id="cardTitle">Title</div>
        <div class="card-sub" id="cardSub">Subtitle</div>
        <div class="card-note" id="cardNote"></div>
      </div>
    `;

    cSea = document.getElementById('atlasCanvasSea');
    cBg = document.getElementById('atlasCanvasBg');
    cMid = document.getElementById('atlasCanvasMid');
    cFl = document.getElementById('atlasCanvasFl');
    floatingCard = document.getElementById('mapFloatingCard');

    ctxSea = cSea.getContext('2d');
    ctxBg = cBg.getContext('2d');
    ctxMid = cMid.getContext('2d');
    ctxFl = cFl.getContext('2d');

    // Pre-compile datasets into Path2D
    compileDatasets();
    // Attach listeners
    attachPointerListeners();
    attachResizeListener();

    // Size canvas and set initial view centered on India
    resize();
    centerOnRegion(0, 8, Math.max(MIN_SCALE, Math.min(W / WORLD_W * .92, H / WORLD_W * .95)));

    isReady = true;
    requestRender(true, true);
    return true;
  }

  function compileDatasets() {
    entityIndex.clear();

    // 1. Countries (from window.COUNTRIES_GEOJSON)
    if (window.COUNTRIES_GEOJSON && Array.isArray(window.COUNTRIES_GEOJSON.features)) {
      compiledCountries = window.COUNTRIES_GEOJSON.features.map(f => {
        const path = new Path2D();
        const geom = f.geometry;
        let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;

        const addRing = (ring) => {
          ring.forEach(([lng, lat], i) => {
            const [x, y] = project(lng, lat);
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
            if (i === 0) path.moveTo(x, y);
            else path.lineTo(x, y);
          });
          path.closePath();
        };

        if (geom.type === 'Polygon') {
          geom.coordinates.forEach(addRing);
        } else if (geom.type === 'MultiPolygon') {
          geom.coordinates.forEach(poly => poly.forEach(addRing));
        }

        const name = (f.properties && (f.properties.name || f.properties.NAME || f.id)) || 'Country';
        const item = {
          id: normKey(name),
          name: name,
          category: 'country',
          path: path,
          bounds: [minX, minY, maxX, maxY],
          cx: (minX + maxX) / 2,
          cy: (minY + maxY) / 2
        };
        entityIndex.set(normKey(name), item);
        entityIndex.set('country-' + normKey(name), item);
        if (f.id) {
          entityIndex.set(String(f.id).toLowerCase(), item);
          entityIndex.set('country-' + String(f.id).toLowerCase(), item);
        }
        return item;
      });
    }

    landClip = new Path2D();
    compiledCountries.forEach(ct => landClip.addPath(ct.path));

    // 2. India States (from window.INDIA_STATES_GEOJSON)
    if (window.INDIA_STATES_GEOJSON && Array.isArray(window.INDIA_STATES_GEOJSON.features)) {
      compiledStates = window.INDIA_STATES_GEOJSON.features.map(f => {
        const path = new Path2D();
        const geom = f.geometry;
        let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
        const rings = [];

        const addRing = (ring) => {
          rings.push(ring);
          ring.forEach(([lng, lat], i) => {
            const [x, y] = project(lng, lat);
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
            if (i === 0) path.moveTo(x, y);
            else path.lineTo(x, y);
          });
          path.closePath();
        };

        if (geom.type === 'Polygon') {
          geom.coordinates.forEach(addRing);
        } else if (geom.type === 'MultiPolygon') {
          geom.coordinates.forEach(poly => poly.forEach(addRing));
        }

        // True centroid calculation for optimal text label placement & camera focus
        let bestRing = rings[0], maxArea = 0;
        rings.forEach(r => {
          let rMinX = 1e9, rMaxX = -1e9, rMinY = 1e9, rMaxY = -1e9;
          r.forEach(([x, y]) => {
            rMinX = Math.min(rMinX, x); rMaxX = Math.max(rMaxX, x);
            rMinY = Math.min(rMinY, y); rMaxY = Math.max(rMaxY, y);
          });
          const a = (rMaxX - rMinX) * (rMaxY - rMinY);
          if (a > maxArea) { maxArea = a; bestRing = r; }
        });

        let cxLng = 78.5, cyLat = 22.0;
        if (bestRing && bestRing.length > 2) {
          let signedArea = 0, cX = 0, cY = 0;
          for (let i = 0; i < bestRing.length - 1; i++) {
            const x0 = bestRing[i][0], y0 = bestRing[i][1];
            const x1 = bestRing[i + 1][0], y1 = bestRing[i + 1][1];
            const a = x0 * y1 - x1 * y0;
            signedArea += a;
            cX += (x0 + x1) * a;
            cY += (y0 + y1) * a;
          }
          signedArea *= 0.5;
          if (Math.abs(signedArea) > 1e-6) {
            cxLng = cX / (6 * signedArea);
            cyLat = cY / (6 * signedArea);
          } else {
            const mid = unproject((minX + maxX) / 2, (minY + maxY) / 2);
            cxLng = mid[0]; cyLat = mid[1];
          }
        } else {
          const mid = unproject((minX + maxX) / 2, (minY + maxY) / 2);
          cxLng = mid[0]; cyLat = mid[1];
        }

        const [projCx, projCy] = project(cxLng, cyLat);
        const name = (f.properties && (f.properties.NAME_1 || f.properties.name)) || 'State';
        const item = {
          id: normKey(name),
          name: name,
          category: 'states',
          path: path,
          rawRings: rings,
          bounds: [minX, minY, maxX, maxY],
          cx: projCx,
          cy: projCy,
          lng: cxLng,
          lat: cyLat,
          group: 'india'
        };
        entityIndex.set(normKey(name), item);
        entityIndex.set('state-' + normKey(name), item);
        entityIndex.set('india-state-' + normKey(name), item);
        return item;
      });
    }

    // 3. Geographic Features (from window.GEOGRAPHIC_FEATURES)
    if (window.GEOGRAPHIC_FEATURES) {
      const gf = window.GEOGRAPHIC_FEATURES;

      // Rivers
      if (Array.isArray(gf.rivers)) {
        compiledRivers = gf.rivers.map(r => {
          const path = new Path2D();
          let ptsCount = 0;
          let sumX = 0, sumY = 0;
          let midCoord = null;
          const segs = r.segments || (r.path ? [r.path] : []);

          segs.forEach(seg => {
            seg.forEach(([lng, lat], i) => {
              const [x, y] = project(lng, lat);
              sumX += x;
              sumY += y;
              ptsCount++;
              if (i === 0) path.moveTo(x, y);
              else path.lineTo(x, y);
            });
            if (!midCoord && seg.length > 0) {
              midCoord = seg[Math.floor(seg.length / 2)];
            }
          });

          const [cx, cy] = midCoord ? project(midCoord[0], midCoord[1]) : (ptsCount > 0 ? [sumX / ptsCount, sumY / ptsCount] : [0, 0]);

          const item = {
            id: r.id || normKey(r.name),
            name: r.name,
            altName: r.altName || '',
            category: 'river',
            flowVerified: r.flowVerified === true,
            context: r.context || '',
            color: r.color || '#0284c7',
            path: path,
            rawSegments: segs,
            cx: cx,
            cy: cy
          };
          entityIndex.set(normKey(r.name), item);
          entityIndex.set(normKey(r.name) + 'river', item);
          entityIndex.set('river' + normKey(r.name), item);
          if (r.id) {
            entityIndex.set(r.id, item);
            entityIndex.set(normKey(r.id), item);
          }
          return item;
        });
      }

      // Smooth Spline Geometry Helpers: Eliminates all sharp polygon corners & straight lines
      function buildSmoothClosedPath(pts) {
        const path = new Path2D();
        const len = pts.length;
        if (len < 3) return path;

        const midpoints = [];
        for (let i = 0; i < len; i++) {
          const p1 = pts[i];
          const p2 = pts[(i + 1) % len];
          midpoints.push([(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2]);
        }

        path.moveTo(midpoints[0][0], midpoints[0][1]);
        for (let i = 0; i < len; i++) {
          const ctrl = pts[(i + 1) % len];
          const nextMid = midpoints[(i + 1) % len];
          path.quadraticCurveTo(ctrl[0], ctrl[1], nextMid[0], nextMid[1]);
        }
        path.closePath();
        return path;
      }

      function buildSmoothOpenPath(pts) {
        const path = new Path2D();
        if (pts.length < 2) return path;
        if (pts.length === 2) {
          path.moveTo(pts[0][0], pts[0][1]);
          path.lineTo(pts[1][0], pts[1][1]);
          return path;
        }
        path.moveTo(pts[0][0], pts[0][1]);
        for (let i = 0; i < pts.length - 1; i++) {
          const p0 = pts[i];
          const p1 = pts[i + 1];
          const mx = (p0[0] + p1[0]) / 2;
          const my = (p0[1] + p1[1]) / 2;
          path.quadraticCurveTo(p0[0], p0[1], mx, my);
        }
        const last = pts[pts.length - 1];
        path.lineTo(last[0], last[1]);
        return path;
      }

      function generateOrganicZone(cx, cy, radius, seed = 1) {
        const numPts = 8;
        const pts = [];
        for (let i = 0; i < numPts; i++) {
          const angle = (i / numPts) * Math.PI * 2;
          const variance = 0.82 + Math.sin(seed * 9.7 + i * 2.3) * 0.28;
          const r = radius * variance;
          pts.push([cx + Math.cos(angle) * r, cy + Math.sin(angle) * r]);
        }
        return buildSmoothClosedPath(pts);
      }

      // Mountain Ranges (Smooth Organic Shaded Polygons & Undulating Crests)
      if (Array.isArray(gf.mountains)) {
        compiledMountains = gf.mountains.map(m => {
          let polyPath = new Path2D();
          let sumX = 0, sumY = 0, n = 0;

          if (Array.isArray(m.polygon) && m.polygon.length >= 3) {
            const projectedPts = m.polygon.map(([lng, lat]) => {
              const [x, y] = project(lng, lat);
              sumX += x;
              sumY += y;
              n++;
              return [x, y];
            });
            polyPath = buildSmoothClosedPath(projectedPts);
          }

          let crestPath = new Path2D();
          if (Array.isArray(m.path) && m.path.length >= 2) {
            const projectedCrest = m.path.map(([lng, lat]) => project(lng, lat));
            crestPath = buildSmoothOpenPath(projectedCrest);
          }

          const cx = n > 0 ? sumX / n : (m.coords ? project(m.coords[0], m.coords[1])[0] : 0);
          const cy = n > 0 ? sumY / n : (m.coords ? project(m.coords[0], m.coords[1])[1] : 0);

          const item = {
            id: m.id || normKey(m.name),
            name: m.name,
            category: 'mountain',
            context: m.context || '',
            color: m.color || '#78350f',
            polyPath: polyPath,
            crestPath: crestPath,
            polygon: m.polygon,
            cx: cx,
            cy: cy
          };
          entityIndex.set(normKey(m.name), item);
          if (m.id) {
            entityIndex.set(m.id, item);
            entityIndex.set(normKey(m.id), item);
          }
          return item;
        });
      }

      // Protected Areas (National Parks, Tiger Reserves, Biosphere Reserves with Green Organic Shading)
      if (Array.isArray(gf.protectedAreas)) {
        compiledProtectedAreas = gf.protectedAreas.map((p, idx) => {
          let cx = 0, cy = 0;
          if (p.coords) {
            [cx, cy] = project(p.coords[0], p.coords[1]);
          }
          // Organic natural sanctuary zone (approx 0.24 degree radius)
          const zoneRadius = 0.0038 * BASE_SCALE;
          // A location anchor must never masquerade as a notified protected-area boundary.
          const polyPath = null;

          const item = {
            id: p.id || normKey(p.name),
            name: p.name,
            pureName: p.pureName || p.name,
            category: p.type || 'national_park',
            state: p.state || '',
            rivers: p.rivers || '',
            keySpecies: p.keySpecies || '',
            note: p.note || p.context || '',
            color: p.color || '#15803d',
            cx: cx,
            cy: cy,
            polyPath: polyPath
          };
          entityIndex.set(normKey(p.name), item);
          if (p.pureName) entityIndex.set(normKey(p.pureName), item);
          if (p.id) {
            entityIndex.set(p.id, item);
            entityIndex.set(normKey(p.id), item);
          }
          return item;
        });
      }

      // Peaks
      if (Array.isArray(gf.peaks)) {
        compiledPeaks = gf.peaks.map(pk => {
          const [cx, cy] = pk.coords ? project(pk.coords[0], pk.coords[1]) : [0, 0];
          const item = {
            id: pk.id || normKey(pk.name),
            name: pk.name,
            category: 'peak',
            elevation: pk.elevation || '',
            context: pk.context || '',
            cx: cx,
            cy: cy
          };
          entityIndex.set(normKey(pk.name), item);
          if (pk.id) {
            entityIndex.set(pk.id, item);
            entityIndex.set(normKey(pk.id), item);
          }
          return item;
        });
      }

      // Passes
      if (Array.isArray(gf.passes)) {
        compiledPasses = gf.passes.map(ps => {
          const [cx, cy] = ps.coords ? project(ps.coords[0], ps.coords[1]) : [0, 0];
          const item = {
            id: ps.id || normKey(ps.name),
            name: ps.name,
            category: 'pass',
            elevation: ps.elevation || '',
            context: ps.context || '',
            cx: cx,
            cy: cy
          };
          entityIndex.set(normKey(ps.name), item);
          if (ps.id) {
            entityIndex.set(ps.id, item);
            entityIndex.set(normKey(ps.id), item);
          }
          return item;
        });
      }

      // Glaciers
      if (Array.isArray(gf.glaciers)) {
        compiledGlaciers = gf.glaciers.map(gl => {
          const [cx, cy] = gl.coords ? project(gl.coords[0], gl.coords[1]) : [0, 0];
          const item = {
            id: gl.id || normKey(gl.name),
            name: gl.name,
            category: 'glacier',
            length: gl.length || '',
            context: gl.context || '',
            cx: cx,
            cy: cy
          };
          entityIndex.set(normKey(gl.name), item);
          if (gl.id) {
            entityIndex.set(gl.id, item);
            entityIndex.set(normKey(gl.id), item);
          }
          return item;
        });
      }
    }

    // 4. Ocean Currents (from window.OCEAN_CURRENTS)
    if (window.OCEAN_CURRENTS && Array.isArray(window.OCEAN_CURRENTS)) {
      compiledCurrents = window.OCEAN_CURRENTS.map(c => {
        const path = new Path2D();
        const segs = c.segments || [];
        segs.forEach(seg => {
          seg.forEach(([lat, lng], i) => {
            const [x, y] = project(lng, lat);
            if (i === 0) path.moveTo(x, y);
            else path.lineTo(x, y);
          });
        });

        let cx = 0, cy = 0;
        if (c.coords && Array.isArray(c.coords) && c.coords.length >= 2) {
          [cx, cy] = project(c.coords[0], c.coords[1]);
        } else if (c.midpoint && Array.isArray(c.midpoint) && c.midpoint.length >= 2) {
          [cx, cy] = project(c.midpoint[1], c.midpoint[0]);
        }

        const typeMap = { 'w': 'warm', 'c': 'cold', 'n': 'neutral' };
        const currentType = typeMap[c.type] || c.type || 'warm';

        const item = {
          id: c.id || normKey(c.name),
          name: c.name,
          category: 'current',
          type: currentType,
          ocean: c.ocean || '',
          flow: c.flow || '',
          path: path,
          segments: segs,
          flowRoutes: segs.map(seg => {const pts=seg.map(([lat,lon])=>project(lon,lat));let total=0;const legs=[];for(let i=1;i<pts.length;i++){const a=pts[i-1],b=pts[i],length=Math.hypot(b[0]-a[0],b[1]-a[1]);if(length>0){legs.push({a,b,start:total,length});total+=length}}return {legs,total}}),
          cx: cx,
          cy: cy
        };
        entityIndex.set(normKey(c.name), item);
        if (c.id) entityIndex.set(c.id, item);
        return item;
      });
    }

    // 5. Local Winds (from window.LOCAL_WINDS)
    if (window.LOCAL_WINDS && Array.isArray(window.LOCAL_WINDS)) {
      compiledWinds = window.LOCAL_WINDS.map(w => {
        const path = new Path2D();
        const segs = w.segments || [];
        let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
        segs.forEach(seg => {
          seg.forEach(([lat, lng], i) => {
            const [x, y] = project(lng, lat);
            minX = Math.min(minX, x); maxX = Math.max(maxX, x);
            minY = Math.min(minY, y); maxY = Math.max(maxY, y);
            if (i === 0) path.moveTo(x, y);
            else path.lineTo(x, y);
          });
        });

        let cx = 0, cy = 0;
        if (w.coords && Array.isArray(w.coords) && w.coords.length >= 2) {
          [cx, cy] = project(w.coords[0], w.coords[1]);
        } else if (w.midpoint && Array.isArray(w.midpoint) && w.midpoint.length >= 2) {
          [cx, cy] = project(w.midpoint[1], w.midpoint[0]);
        } else if (minX < 1e8) {
          cx = (minX + maxX) / 2;
          cy = (minY + maxY) / 2;
        }

        const isCold = w.type === 'cold';
        const item = {
          id: w.id || normKey(w.name),
          name: w.name,
          category: 'wind',
          type: w.type || (isCold ? 'cold' : 'warm'),
          typeName: w.typeName || (isCold ? 'Cold Local Wind' : 'Warm Local Wind'),
          region: w.region || '',
          nature: w.nature || '',
          effect: w.effect || '',
          season: w.season || '',
          direction: w.direction || '',
          continent: w.continent || '',
          description: w.description || '',
          keyFacts: w.keyFacts || [],
          upscNotes: w.upscNotes || '',
          path: path,
          segments: segs,
          cx: cx,
          cy: cy,
          color: isCold ? '#0284c7' : '#ef4444'
        };
        entityIndex.set(normKey(w.name), item);
        if (w.id) entityIndex.set(w.id, item);
        return item;
      });
    }

    // 6. World Features (from window.WORLD_MAP_DATA)
    if (window.WORLD_MAP_DATA && Array.isArray(window.WORLD_MAP_DATA.entities)) {
      compiledWorldEntities = [];
      window.WORLD_MAP_DATA.entities.forEach(e => {
        // If this is a world river, link it to the compiled river polyline
        if (e.category === 'river') {
          const normW = normKey(e.name.replace(/river/ig, ''));
          const matchedRiver = compiledRivers.find(r => {
            const rNorm = normKey(r.name.replace(/river/ig, ''));
            return rNorm.includes(normW) || normW.includes(rNorm);
          });
          if (matchedRiver) {
            matchedRiver.description = e.description || matchedRiver.description || '';
            matchedRiver.upscNotes = e.upscNotes || matchedRiver.upscNotes || '';
            matchedRiver.continent = e.continent || matchedRiver.continent || '';
            if (e.id) entityIndex.set(e.id, matchedRiver);
            entityIndex.set(normKey(e.name), matchedRiver);
            return;
          }
          // If no polyline found in GEOGRAPHIC_FEATURES, still index the river so it is never dropped:
          let rcx = 0, rcy = 0;
          if (e.coords) [rcx, rcy] = project(e.coords[0], e.coords[1]);
          const riverItem = {
            id: e.id || normKey(e.name),
            name: e.name,
            category: 'river',
            continent: e.continent || '',
            description: e.description || '',
            upscNotes: e.upscNotes || '',
            coords: e.coords,
            cx: rcx,
            cy: rcy
          };
          if (e.id) entityIndex.set(e.id, riverItem);
          entityIndex.set(normKey(e.name), riverItem);
          compiledWorldEntities.push(riverItem);
          return;
        }

        let cx = 0, cy = 0;
        if (e.coords) {
          [cx, cy] = project(e.coords[0], e.coords[1]);
        }
        const item = {
          id: e.id || normKey(e.name),
          name: e.name,
          category: e.category,
          continent: e.continent || '',
          capital: e.capital || '',
          description: e.description || '',
          upscNotes: e.upscNotes || '',
          cx: cx,
          cy: cy
        };
        if (!entityIndex.has(normKey(e.name))) {
          entityIndex.set(normKey(e.name), item);
        }
        if (e.id) {
          entityIndex.set(e.id, item);
          entityIndex.set(normKey(e.id), item);
        }
        compiledWorldEntities.push(item);
      });
    }

    console.info(`Mapping Atlas: Pre-compiled ${entityIndex.size} indexed entities.`);
  }

  // Pointer Interaction
  function attachPointerListeners() {
    stage.addEventListener('pointerdown', e => {
      if (e.button !== 0) return;
      stage.setPointerCapture(e.pointerId);
      const rect = stage.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      ptrs.set(e.pointerId, [x, y]);
      gest = {
        t: performance.now(),
        startX: x,
        startY: y,
        prevX: x,
        prevY: y,
        moved: false
      };
    });

    stage.addEventListener('pointermove', e => {
      if (!ptrs.has(e.pointerId)) {
        // Hover inspection
        const rect = stage.getBoundingClientRect();
        handleHover(e.clientX - rect.left, e.clientY - rect.top);
        return;
      }

      const rect = stage.getBoundingClientRect();
      const curX = e.clientX - rect.left;
      const curY = e.clientY - rect.top;
      const prev = ptrs.get(e.pointerId);

      if (ptrs.size === 1 && gest) {
        const dx = curX - prev[0];
        const dy = curY - prev[1];

        if (Math.hypot(curX - gest.startX, curY - gest.startY) > 4) {
          gest.moved = true;
          stage.classList.add('drag');
        }

        if (gest.moved) {
          V.tx += dx;
          V.ty += dy;
          clampView();
          requestRender(true, true);
        }
      } else if (ptrs.size === 2) {
        // Pinch Zoom
        gest.moved = true;
        const pts = [...ptrs.values()];
        const d0 = Math.hypot(pts[0][0] - pts[1][0], pts[0][1] - pts[1][1]);
        ptrs.set(e.pointerId, [curX, curY]);
        const updatedPts = [...ptrs.values()];
        const d1 = Math.hypot(updatedPts[0][0] - updatedPts[1][0], updatedPts[0][1] - updatedPts[1][1]);

        if (d0 > 0 && d1 > 0) {
          const midX = (updatedPts[0][0] + updatedPts[1][0]) / 2;
          const midY = (updatedPts[0][1] + updatedPts[1][1]) / 2;
          zoomAt(midX, midY, d1 / d0);
        }
      }

      ptrs.set(e.pointerId, [curX, curY]);
    });

    const onPointerEnd = e => {
      if (!ptrs.has(e.pointerId)) return;
      ptrs.delete(e.pointerId);
      stage.classList.remove('drag');

      if (gest && !gest.moved && ptrs.size === 0 && performance.now() - gest.t < 350) {
        const rect = stage.getBoundingClientRect();
        handleTap(e.clientX - rect.left, e.clientY - rect.top);
      }
      if (ptrs.size === 0) gest = null;
    };

    stage.addEventListener('pointerup', onPointerEnd);
    stage.addEventListener('pointercancel', onPointerEnd);

    // Mouse Wheel Zoom
    stage.addEventListener('wheel', e => {
      e.preventDefault();
      const rect = stage.getBoundingClientRect();
      const factor = Math.exp(-e.deltaY * (e.deltaMode === 1 ? 0.05 : 0.002));
      zoomAt(e.clientX - rect.left, e.clientY - rect.top, factor);
    }, { passive: false });

    // Double-click zoom
    stage.addEventListener('dblclick', e => {
      const rect = stage.getBoundingClientRect();
      zoomAt(e.clientX - rect.left, e.clientY - rect.top, 1.6);
    });

    // Zoom Buttons
    const btnZin = document.getElementById('zoomIn');
    const btnZout = document.getElementById('zoomOut');
    const btnReset = document.getElementById('resetView');

    if (btnZin) btnZin.onclick = () => zoomAt(W / 2, H / 2, 1.4);
    if (btnZout) btnZout.onclick = () => zoomAt(W / 2, H / 2, 1 / 1.4);
    if (btnReset) btnReset.onclick = () => resetView();
  }

  function attachResizeListener() {
    window.addEventListener('resize', () => {
      resize();
      requestRender(true, true);
    });
  }

  function resize() {
    if (!stage) return;
    const rect = stage.getBoundingClientRect();
    W = rect.width || 800;
    H = rect.height || 600;
    DPR = Math.min(2, window.devicePixelRatio || 1);

    [cSea, cBg, cMid, cFl].forEach(canvas => {
      if (canvas) {
        canvas.width = Math.round(W * DPR);
        canvas.height = Math.round(H * DPR);
      }
    });

    setTransform(ctxSea);
    setTransform(ctxBg);
    setTransform(ctxMid);
    setTransform(ctxFl);
  }

  function setTransform(ctx) {
    if (!ctx) return;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }

  function zoomAt(sx, sy, factor) {
    const minS = MIN_SCALE;
    const maxS = MAX_SCALE;
    const newS = Math.min(Math.max(V.s * factor, minS), maxS);
    const ratio = newS / V.s;

    // Zoom centered at cursor point
    V.tx = sx - W / 2 - ratio * (sx - W / 2 - V.tx);
    V.ty = sy - H / 2 - ratio * (sy - H / 2 - V.ty);
    V.s = newS;

    clampView();
    requestRender(true, true);
  }

  function clampView() {
    const halfW = (WORLD_W / 2) * V.s;
    const halfH = 550 * V.s;
    const maxTx = halfW + W * 0.45;
    const maxTy = halfH + H * 0.45;
    V.tx = Math.max(-maxTx, Math.min(maxTx, V.tx));
    V.ty = Math.max(-maxTy, Math.min(maxTy, V.ty));
  }

  function centerOnRegion(lng, lat, targetScale = null) {
    const [wx, wy] = project(lng, lat);
    if (targetScale) V.s = targetScale;
    V.tx = -wx * V.s;
    V.ty = -wy * V.s;
    clampView();
    requestRender(true, true);
  }

  function resetView() {
    centerOnRegion(0, 8, Math.max(MIN_SCALE, Math.min(W / WORLD_W * .92, H / WORLD_W * .95)));
    selectedId = null;
    hideFloatingCard();
  }

  // Spatial Hit-Testing
  function findHit(sx, sy, radius = 14) {
    let closest = null;
    let minD = radius;

    const checkPoint = (item) => {
      if (!inScope(item)) return;
      if (!isCategoryActive(item.category)) return;
      const [px, py] = toScr(item.cx, item.cy);
      const d = Math.hypot(px - sx, py - sy);
      if (d < minD) {
        minD = d;
        closest = item;
      }
    };

    // 1. Points (Peaks, Passes, Glaciers, Protected Areas, World entities, Local Winds centroid)
    compiledPeaks.forEach(checkPoint);
    compiledPasses.forEach(checkPoint);
    compiledGlaciers.forEach(checkPoint);
    compiledProtectedAreas.forEach(checkPoint);
    compiledWorldEntities.forEach(checkPoint);
    compiledWinds.forEach(checkPoint);

    if (closest) return closest;

    // 2. Rivers
    if (isCategoryActive('river')) {
      const [wx, wy] = toWld(sx, sy);
      for (const r of compiledRivers) {
        for (const seg of r.rawSegments) {
          for (let i = 1; i < seg.length; i++) {
            const [x1, y1] = project(seg[i - 1][0], seg[i - 1][1]);
            const [x2, y2] = project(seg[i][0], seg[i][1]);
            const d = distToSegment(wx, wy, x1, y1, x2, y2);
            const screenD = d * V.s;
            if (screenD < minD) {
              minD = screenD;
              closest = r;
            }
          }
        }
      }
    }

    if (closest) return closest;

    // 3. Ocean Currents
    if (isCategoryActive('current')) {
      const [wx, wy] = toWld(sx, sy);
      for (const cur of compiledCurrents) {
          if (!inScope(cur)) continue;
        if (cur.segments) {
          for (const seg of cur.segments) {
            for (let i = 1; i < seg.length; i++) {
              const [x1, y1] = project(seg[i - 1][1], seg[i - 1][0]);
              const [x2, y2] = project(seg[i][1], seg[i][0]);
              const d = distToSegment(wx, wy, x1, y1, x2, y2);
              const screenD = d * V.s;
              if (screenD < minD) {
                minD = screenD;
                closest = cur;
              }
            }
          }
        }
      }
    }

    if (closest) return closest;

    // 4. Local Winds (Streamlines)
    if (isCategoryActive('wind')) {
      const [wx, wy] = toWld(sx, sy);
      for (const wind of compiledWinds) {
          if (!inScope(wind)) continue;
        if (wind.segments) {
          for (const seg of wind.segments) {
            for (let i = 1; i < seg.length; i++) {
              const [x1, y1] = project(seg[i - 1][1], seg[i - 1][0]);
              const [x2, y2] = project(seg[i][1], seg[i][0]);
              const d = distToSegment(wx, wy, x1, y1, x2, y2);
              const screenD = d * V.s;
              if (screenD < minD) {
                minD = screenD;
                closest = wind;
              }
            }
          }
        }
      }
    }

    if (closest) return closest;

    // 5. Mountain Polygons
    if (isCategoryActive('mountain')) {
      const [wx, wy] = toWld(sx, sy);
      for (const m of compiledMountains) {
        if (m.polygon && pointInPolygon(wx, wy, m.polygon)) {
          return m;
        }
      }
    }

    // 6. Indian States Polygons (for tap/click)
    if (!closest && isCategoryActive('states')) {
      const [wx, wy] = toWld(sx, sy);
      for (const st of compiledStates) {
        if (st.bounds && wx >= st.bounds[0] && wx <= st.bounds[2] && wy >= st.bounds[1] && wy <= st.bounds[3]) {
          if (st.rawRings) {
            for (const ring of st.rawRings) {
              if (pointInPolygon(wx, wy, ring)) return st;
            }
          } else {
            return st;
          }
        }
      }
    }

    // 7. Country Polygons (for tap/click)
    if (!closest && isCategoryActive('country')) {
      const [wx, wy] = toWld(sx, sy);
      for (const ct of compiledCountries) {
        if (ct.bounds && wx >= ct.bounds[0] && wx <= ct.bounds[2] && wy >= ct.bounds[1] && wy <= ct.bounds[3]) {
          return ct;
        }
      }
    }

    return null;
  }

  function distToSegment(px, py, x1, y1, x2, y2) {
    const l2 = (x2 - x1) ** 2 + (y2 - y1) ** 2;
    if (l2 === 0) return Math.hypot(px - x1, py - y1);
    let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
  }

  function pointInPolygon(wx, wy, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [x1, y1] = project(poly[i][0], poly[i][1]);
      const [x2, y2] = project(poly[j][0], poly[j][1]);
      const intersect = ((y1 > wy) !== (y2 > wy)) && (wx < (x2 - x1) * (wy - y1) / (y2 - y1) + x1);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  function handleHover(sx, sy) {
    if (recallTarget || quizTargetId) {
      const hit = findHit(sx, sy, 14);
      stage.style.cursor = hit ? 'pointer' : '';
      hideFloatingCard();
      return;
    }

    const hit = findHit(sx, sy, 12);
    if (hit) {
      stage.style.cursor = 'pointer';
      hoveredItem = hit;
      // Information should only be visible when clicked: hover only indicates clickable target
    } else {
      stage.style.cursor = '';
      hoveredItem = null;
    }
  }

  let recallTarget = null;
  let recallCallback = null;
  let quizTargetId = null;
  let quizTargetName = null;
  let quizTargetEntity = null;

  function setRecallTarget(entity, callback) {
    recallTarget = entity;
    recallCallback = callback;
    quizTargetId = null;
    quizTargetName = null;
    selectedId = null;
    hideFloatingCard();
    requestRender(false, true);
  }

  function getAppropriateScale(category, entity) {
    if (entity && entity.bounds) {
      const [minX, minY, maxX, maxY] = entity.bounds;
      const bw = Math.max(0.1, maxX - minX);
      const bh = Math.max(0.1, maxY - minY);
      // Maximize zoom to comfortably fit ~75% of canvas viewport
      const fitS = Math.min((W * 0.75) / bw, (H * 0.75) / bh);
      return Math.max(3.8, Math.min(fitS, 10.5));
    }

    // Maximum zoom scale defaults for practice/game modes
    switch (category) {
      case 'country':
        return 4.2;
      case 'current':
      case 'wind':
        return 3.2;
      case 'states':
      case 'mountain':
      case 'desert':
        return 5.8;
      case 'river':
      case 'lake':
      case 'strait':
      case 'grassland':
        return 7.0;
      case 'national_park':
      case 'tiger_reserve':
      case 'biosphere_reserve':
      case 'ramsar_site':
        return 8.5;
      case 'peak':
      case 'pass':
      case 'glacier':
        return 10.5;
      default:
        return 7.5;
    }
  }

  function resolveEntity(itemOrId) {
    if (!itemOrId) return null;
    let item = typeof itemOrId === 'object' ? itemOrId : null;
    let id = item ? (item.id || item.name) : itemOrId;
    if (!item && window.DATA_INTEGRITY) {
      item = window.DATA_INTEGRITY.getEntity(id) || window.DATA_INTEGRITY.get(id);
    }
    let norm = normKey(item ? item.name : id);

    // 1. Direct index lookup
    let found = (id && entityIndex.get(id)) || (norm && entityIndex.get(norm)) || null;

    // Suffix/prefix stripping fallback
    if (!found && norm) {
      const clean = norm.replace(/(river|mountains|mountain|range|nationalpark|tigerreserve|biospherereserve|ramsarsite)$/, '');
      if (clean) found = entityIndex.get(clean) || entityIndex.get('river-' + clean) || entityIndex.get('country-' + clean);
    }

    // 2. Fallback search across compiled arrays
    if (!found) {
      found = compiledRivers.find(r => r.id === id || normKey(r.name) === norm) ||
              compiledMountains.find(m => m.id === id || normKey(m.name) === norm) ||
              compiledProtectedAreas.find(p => p.id === id || normKey(p.name) === norm) ||
              compiledPeaks.find(pk => pk.id === id || normKey(pk.name) === norm) ||
              compiledPasses.find(ps => ps.id === id || normKey(ps.name) === norm) ||
              compiledGlaciers.find(gl => gl.id === id || normKey(gl.name) === norm) ||
              compiledCurrents.find(c => c.id === id || normKey(c.name) === norm) ||
              compiledWinds.find(w => w.id === id || normKey(w.name) === norm) ||
              compiledCountries.find(ct => ct.id === id || normKey(ct.name) === norm) ||
              compiledStates.find(st => st.id === id || normKey(st.name) === norm) ||
              compiledWorldEntities.find(we => we.id === id || normKey(we.name) === norm);
    }

    // 3. Coordinate resolution
    let cx = found ? found.cx : (item ? item.cx : undefined);
    let cy = found ? found.cy : (item ? item.cy : undefined);
    let lng = null, lat = null;

    if (cx !== undefined && cy !== undefined && cx !== null && cy !== null) {
      [lng, lat] = unproject(cx, cy);
    } else if (item && item.coords && Array.isArray(item.coords)) {
      lng = item.coords[0];
      lat = item.coords[1];
      [cx, cy] = project(lng, lat);
    } else if (item && item.path && Array.isArray(item.path) && item.path.length > 0) {
      const mid = item.path[Math.floor(item.path.length / 2)];
      lng = mid[0];
      lat = mid[1];
      [cx, cy] = project(lng, lat);
    } else if (found && found.bounds) {
      cx = (found.bounds[0] + found.bounds[2]) / 2;
      cy = (found.bounds[1] + found.bounds[3]) / 2;
      [lng, lat] = unproject(cx, cy);
    }

    const res = Object.assign({}, found || {}, item || {}, {
      id: id,
      name: (item && item.name) || (found && found.name) || id,
      category: (found && found.category) || (item && item.category) || '',
      bounds: (found && found.bounds) || (item && item.bounds) || null,
      cx: cx,
      cy: cy,
      lng: lng,
      lat: lat,
      path: (found && found.path) || (item && item.path) || null,
      polyPath: (found && found.polyPath) || (item && item.polyPath) || null
    });

    return res;
  }

  function setRecallTarget(entity, callback) {
    const resolved = resolveEntity(entity);
    recallTarget = resolved || entity;
    recallCallback = callback;
    quizTargetId = null;
    quizTargetName = null;
    selectedId = null;
    hideFloatingCard();

    // Automatically zoom and pan to the location in context (Max zoom)
    if (resolved && resolved.lng !== null && resolved.lat !== null) {
      const targetScale = getAppropriateScale(resolved.category, resolved);
      flyTo(resolved.lng, resolved.lat, targetScale, 450);
    }
    requestRender(false, true);
  }

  function revealRecallTarget(entity) {
    recallTarget = null;
    recallCallback = null;
    if (entity) selectEntity(entity.id || entity.name, true);
  }

  function setQuizTarget(itemOrId) {
    const resolved = resolveEntity(itemOrId);
    if (!resolved) return;

    quizTargetEntity = resolved;
    quizTargetId = resolved.id;
    quizTargetName = resolved.name;
    selectedId = resolved.id;
    hideFloatingCard();

    // Automatically zoom and pan to the location in context (Max zoom)
    if (resolved.lng !== null && resolved.lat !== null) {
      const targetScale = getAppropriateScale(resolved.category, resolved);
      flyTo(resolved.lng, resolved.lat, targetScale, 450);
    }
    requestRender(false, true);
  }

  function revealQuizAnswer(id) {
    quizTargetId = null;
    quizTargetName = null;
    selectedId = id;
    const resolved = resolveEntity(id) || quizTargetEntity;
    if (resolved && resolved.cx !== undefined && resolved.cy !== undefined) {
      const [sx, sy] = toScr(resolved.cx, resolved.cy);
      showFloatingCard(resolved, sx, sy);
    }
    requestRender(false, true);
  }

  function clearQuizTarget() {
    quizTargetId = null;
    quizTargetName = null;
    quizTargetEntity = null;
    selectedId = null;
    hideFloatingCard();
    requestRender(true, true);
  }

  function clearRecallTarget() {
    recallTarget = null;
    recallCallback = null;
    selectedId = null;
    hideFloatingCard();
    requestRender(true, true);
  }

  function showQuizPromptCard(sx, sy) {
    if (!floatingCard) return;
    const badge = floatingCard.querySelector('#cardBadge');
    const title = floatingCard.querySelector('#cardTitle');
    const sub = floatingCard.querySelector('#cardSub');
    const note = floatingCard.querySelector('#cardNote');

    if (badge) {
      badge.textContent = 'QUESTION IN PROGRESS';
      badge.style.background = '#f59e0b';
      badge.style.color = '#ffffff';
    }
    if (title) title.textContent = 'Observe Pinned Feature';
    if (sub) sub.textContent = 'Identify this feature on the map';
    if (note) {
      note.textContent = 'Select an option (A, B, C, or D) in the Quiz panel on the right to submit your answer.';
      note.style.display = 'block';
    }

    positionFloatingCard(sx, sy);
  }

  function handleTap(sx, sy) {
    if (recallCallback && recallTarget) {
      const hit = findHit(sx, sy, 26);
      const isCorrect = hit && (
        hit.id === recallTarget.id ||
        normKey(hit.name) === normKey(recallTarget.name) ||
        (hit.pureName && normKey(hit.pureName) === normKey(recallTarget.name))
      );
      const clickedName = hit ? hit.name : null;
      const cb = recallCallback;
      recallCallback = null;
      recallTarget = null;
      cb(isCorrect, clickedName);
      return;
    }

    const hit = findHit(sx, sy, 22);
    if (hit) {
      if (quizTargetId) {
        selectEntity(hit.id || hit.name, false);
        showQuizPromptCard(sx, sy);
        return;
      }
      selectEntity(hit.id || hit.name, false);
      showFloatingCard(hit, sx, sy);
      // Immediately open respective details in sidebar (browse item)
      if (window.WORLD_APP && window.WORLD_APP.onEntitySelected) {
        window.WORLD_APP.onEntitySelected(hit.id || hit.name, false);
      } else if (window.ENTITY_PANEL) {
        const ent = window.DATA_INTEGRITY ? window.DATA_INTEGRITY.getEntity(hit.id || hit.name) : hit;
        if (ent) window.ENTITY_PANEL.renderDetail(ent);
      }
    } else {
      selectedId = null;
      hideFloatingCard();
      requestRender(false, true);
    }
  }

  function positionFloatingCard(sx, sy) {
    if (!floatingCard) return;
    floatingCard.style.transform = 'none';
    floatingCard.classList.add('visible');

    const cardW = floatingCard.offsetWidth || 240;
    const cardH = floatingCard.offsetHeight || 90;

    let leftPos = sx - cardW / 2;
    let topPos = sy - cardH - 14;

    // Flip below if too close to the top
    if (topPos < 16) {
      topPos = sy + 22;
    }

    // Clamp horizontally and vertically inside canvas
    leftPos = Math.max(16, Math.min(W - cardW - 16, leftPos));
    topPos = Math.max(16, Math.min(H - cardH - 16, topPos));

    floatingCard.style.left = `${leftPos}px`;
    floatingCard.style.top = `${topPos}px`;
  }

  function showFloatingCard(item, sx, sy) {
    if (!floatingCard) return;
    const col = getCol();

    const badge = floatingCard.querySelector('#cardBadge');
    const title = floatingCard.querySelector('#cardTitle');
    const sub = floatingCard.querySelector('#cardSub');
    const note = floatingCard.querySelector('#cardNote');

    if (badge) {
      badge.textContent = (item.category || 'FEATURE').replace(/_/g, ' ').toUpperCase();
      badge.style.background = col[item.category] || col.selPulse;
      badge.style.color = '#ffffff';
    }
    if (title) title.textContent = item.name;
    if (sub) sub.textContent = item.region || item.state || item.continent || item.context || item.altName || '';
    if (note) {
      note.textContent = item.nature ? `${item.nature} · Effect: ${item.effect}` : (item.note || item.keySpecies || item.description || (item.elevation ? `Elevation: ${item.elevation}` : ''));
      note.style.display = note.textContent ? 'block' : 'none';
    }

    positionFloatingCard(sx, sy);
  }

  function hideFloatingCard() {
    if (floatingCard) floatingCard.classList.remove('visible');
  }

  // Layer Visibility
  function isCategoryActive(cat) {
    if (!cat) return true;
    const mapped = cat === 'mountain_range' ? 'mountain' : (cat === 'protected_area' ? 'national_park' : cat);
    return activeFilters[mapped] !== false;
  }

  function setCategoryFilter(categoryKey, isChecked) {
    activeFilters[categoryKey] = !!isChecked;
    requestRender(true, true);

    // Sync with left sidebar list immediately
    if (window.WORLD_SEARCH && window.WORLD_SEARCH.applyFilters) {
      window.WORLD_SEARCH.applyFilters();
    }
  }

  function setGroupFilter(group, isChecked) {
    const indiaKeys = ['national_park', 'tiger_reserve', 'biosphere_reserve', 'ramsar_site', 'river', 'mountain', 'peak', 'pass', 'glacier', 'states'];
    const worldKeys = ['current', 'wind', 'country', 'lake', 'desert', 'grassland', 'strait'];
    const targets = group === 'india' ? indiaKeys : (group === 'world' ? worldKeys : []);

    targets.forEach(k => {
      activeFilters[k] = !!isChecked;
    });

    requestRender(true, true);
    if (window.WORLD_SEARCH && window.WORLD_SEARCH.applyFilters) {
      window.WORLD_SEARCH.applyFilters();
    }
  }

  function setAllCategories(isChecked) {
    Object.keys(activeFilters).forEach(k => {
      activeFilters[k] = !!isChecked;
    });

    requestRender(true, true);
    if (window.WORLD_SEARCH && window.WORLD_SEARCH.applyFilters) {
      window.WORLD_SEARCH.applyFilters();
    }
  }

  function toggleBorders(visible) {
    showBorders = (visible !== undefined) ? visible : !showBorders;
    requestRender(true, false);
    return showBorders;
  }

  function toggleLabels(visible) {
    showLabels = (visible !== undefined) ? visible : !showLabels;
    requestRender(false, true);
    return showLabels;
  }

  function getVisibleOffsets() {
    // Single non-repeating world map
    return [0];
  }

  // Main Render Loop
  function requestRender(bg = true, mid = true) {
    if (bg) dirty.bg = true;
    if (mid) dirty.mid = true;
    dirty.fl = true;
    if (!rafId) {
      rafId = requestAnimationFrame(renderFrame);
    }
  }

  function renderFrame(time) {
    rafId = 0;
    if (animationLast !== null && animationPlaying && !document.hidden) animationTime += Math.min(100, time - animationLast) * animationSpeed;
    animationLast = time;
    time = animationTime;
    flowTime = time;

    // 1. Draw Ocean Surface & Smoky Volumetric Currents (strictly under landmass)
    drawSeaLayer(time);

    // 2. Draw Continental Landmass, Borders, States & Topographic Mountains
    if (dirty.bg) {
      drawBackground();
      dirty.bg = false;
    }

    // 3. Draw Mid Layer: River channels, Protected Area Badges, Peaks, Passes, Labels
    if (dirty.mid) {
      drawMidLayer();
      dirty.mid = false;
    }

    // 4. Draw Animated Flowing Water, Highlights, and Selection Rings
    drawFlyAndFlowLayer(time);

    // Keep silky 60 FPS animation loop active for flowing currents, rivers, winds, or selections
    if (animationPlaying && !document.hidden && (isCategoryActive('river') || isCategoryActive('current') || isCategoryActive('wind') || selectedId)) {
      dirty.fl = true;
      rafId = requestAnimationFrame(renderFrame);
    }
  }

  // Keep the illustrated water surface upright when a current travels westward.
  // Mirroring preserves the forward curl without turning the whole breaker upside down.
  function waveOrientation(angle) {
    const mirror = Math.cos(angle) < 0 ? -1 : 1;
    let rotation = mirror < 0 ? angle + Math.PI : angle;
    rotation = Math.atan2(Math.sin(rotation), Math.cos(rotation));
    return { rotation, mirror };
  }

  // Sea Layer: Base ocean color + Smoky Semi-3D Transparent Currents (NOT on land)
  function drawSeaLayer(time) {
    if (!ctxSea) return;
    const c = ctxSea;
    const col = getCol();
    setTransform(c);

    // Ocean Fill
    c.fillStyle = col.sea;
    c.fillRect(0, 0, W, H);

    if (terrainMode !== 'cartographic' && terrainImage) {
      const yMax = -project(0, 85)[1];
      c.save();
      c.translate(W / 2 + V.tx, H / 2 + V.ty); c.scale(V.s, V.s);
      c.globalAlpha = currentTheme === 'dark' ? .82 : 1;
      c.drawImage(terrainImage, -WORLD_W/2, -yMax, WORLD_W, yMax*2);
      c.restore();
    }

    // Quiet, broad water-surface lighting under the current ribbons.
    if(isCategoryActive('current') && compiledCurrents.some(inScope)){
      const wash=c.createLinearGradient(0,0,W,H);
      wash.addColorStop(0,currentTheme==='dark'?'rgba(5,42,62,.28)':'rgba(75,153,181,.12)');
      wash.addColorStop(.48,'rgba(208,244,249,.05)');
      wash.addColorStop(1,'rgba(20,98,140,.12)');c.fillStyle=wash;c.fillRect(0,0,W,H);
      c.lineWidth=.6;
      for(let row=0;row<Math.ceil(H/24);row++){
        const y=row*24;c.beginPath();
        for(let x=0;x<=W+20;x+=20){const yy=y+Math.sin(x*.014+row*.8+time*.00035)*2.3+Math.sin(x*.027-row+time*.00022)*1.2;if(x===0)c.moveTo(x,yy);else c.lineTo(x,yy)}
        c.strokeStyle='rgba(230,253,255,.09)';c.stroke();
      }
    }

    // Smoky, Semi-3D, Transparent Ocean Currents (Rendered across continuous world copies)
    if (isCategoryActive('current') && compiledCurrents.length > 0) {
      const isDark = currentTheme === 'dark';
      const offsets = getVisibleOffsets();

      for (const off of offsets) {
        c.save();
        c.translate(W / 2 + V.tx + off * V.s, H / 2 + V.ty);
        c.scale(V.s, V.s);
        c.lineCap = 'round';
        c.lineJoin = 'round';

        for (const cur of compiledCurrents) {
          if (!inScope(cur)) continue;
          const isWarm = cur.type === 'warm';
          const isSel = cur.id === selectedId;

          // Stylised breaking-wave fronts travel downstream; these illustrate current direction.
          // Their apparent height/speed is not a measured ocean state or tsunami forecast.
          const rgb=isWarm?'225,100,64':cur.type==='cold'?'5,132,187':'70,137,160';
          const deep=isWarm?'151,58,41':'5,72,121';
          const width=isSel?20:15;
          c.setLineDash([]);
          for(let halo=2;halo>=1;halo--){c.strokeStyle=`rgba(${rgb},.018)`;c.lineWidth=(width+halo*2)/V.s;c.stroke(cur.path)}
          c.strokeStyle=`rgba(${rgb},.12)`;c.lineWidth=3/V.s;c.stroke(cur.path);
          for(const route of cur.flowRoutes||[]){
            if(!route.total)continue;
            const pointAt=d=>{d=Math.max(0,Math.min(route.total,d));const leg=route.legs.find(l=>d<=l.start+l.length)||route.legs.at(-1);const t=Math.max(0,Math.min(1,(d-leg.start)/leg.length));return{x:leg.a[0]+(leg.b[0]-leg.a[0])*t,y:leg.a[1]+(leg.b[1]-leg.a[1])*t}};
            const sample=d=>{const p=pointAt(d),before=pointAt(d-4/V.s),after=pointAt(d+4/V.s);return {...p,angle:Math.atan2(after.y-before.y,after.x-before.x)}};
            const screenLength=route.total*V.s;
            const fronts=Math.min(65,Math.max(2,Math.ceil(screenLength/72)));
            for(let i=0;i<fronts;i++){
              const head=((i/fronts*route.total+time*.034/V.s)%route.total+route.total)%route.total;
              const p=sample(head),edge=Math.min(1,head*V.s/16,(route.total-head)*V.s/16);
              const size=isSel?1.1:.9;
              const phase=((time/3900+i*.37)%1+1)%1;
              // A complete wave cycle: low swell -> rising face -> curling barrel -> breaking wash.
              const swell=[[-22,6],[-13,5,-8,1,-5,-1],[-1,-5,5,-5,9,-2],[12,0,14,3,15,4],[12,3,10,2,7,2],[3,1,3,2,7,3],[10,4,15,5,18,6],[3,9,-8,7,-22,6]];
              const curl=[[-22,6],[-13,5,-8,1,-6,-5],[-4,-13,3,-16,9,-12],[14,-9,14,-3,9,-1],[12,-5,9,-9,6,-8],[1,-7,2,-1,7,2],[10,4,15,5,18,6],[3,9,-8,7,-22,6]];
              const crash=[[-22,6],[-12,6,-7,4,-2,1],[3,-1,12,-1,15,1],[19,2,19,5,15,5],[14,3,11,2,8,3],[4,3,5,4,9,4],[13,5,19,5,23,6],[5,9,-8,7,-22,6]];
              const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t)};
              let from,to,blend;
              if(phase<.42){from=swell;to=curl;blend=smooth(phase/.42)}
              else if(phase<.7){from=curl;to=crash;blend=smooth((phase-.42)/.28)}
              else{from=crash;to=swell;blend=smooth((phase-.7)/.3)}
              const shape=from.map((row,j)=>row.map((v,k)=>v+(to[j][k]-v)*blend));
              const curlAmount=phase<.42?smooth(phase/.42):1-smooth((phase-.42)/.3);
              c.save();c.globalAlpha=Math.max(0,edge);c.translate(p.x,p.y);const orientation=waveOrientation(p.angle);c.rotate(orientation.rotation);c.scale(orientation.mirror*size/V.s,size/V.s);
              const body=c.createLinearGradient(0,-15,0,8);
              body.addColorStop(0,isWarm?'#ffd0b9':'#bceff6');body.addColorStop(.48,isWarm?'#ec9a77':'#45b1da');body.addColorStop(1,isWarm?'#d7765c':'#2293c5');
              c.beginPath();c.moveTo(...shape[0]);shape.slice(1).forEach(row=>c.bezierCurveTo(...row));c.closePath();c.fillStyle=body;c.fill();
              // Dark blue/coral underside appears as the barrel opens and disappears in the wash.
              c.save();c.globalAlpha*=curlAmount;
              c.beginPath();c.moveTo(-11,5);c.bezierCurveTo(-3,2,-6,-7,3,-11);c.bezierCurveTo(8,-12,12,-7,9,-2);c.bezierCurveTo(9,-7,5,-9,2,-5);c.bezierCurveTo(1,-1,4,3,10,5);c.closePath();c.fillStyle=isWarm?'#a84c42':'#153e78';c.fill();
              c.strokeStyle=isWarm?'rgba(255,213,190,.75)':'rgba(158,227,250,.8)';c.lineWidth=.55;
              for(let k=0;k<4;k++){c.beginPath();c.moveTo(-9+k*3,4);c.bezierCurveTo(-1+k*2,0,-6+k*2,-7,1+k*2,-10);c.stroke()}
              c.beginPath();c.moveTo(-6,-5);c.bezierCurveTo(-5,-9,-2,-13,3,-13.3);c.bezierCurveTo(8,-14,12,-10,12.1,-6.3);c.bezierCurveTo(12.5,-4,11.5,-2,9,-1);c.bezierCurveTo(10,-3,10.6,-4.3,9.8,-6);c.bezierCurveTo(9.2,-5.1,8.6,-5.8,8.8,-7);c.bezierCurveTo(7.8,-6.4,7.1,-7,7.4,-8.1);c.bezierCurveTo(5.8,-7.6,5.2,-8.5,5.5,-9.5);c.bezierCurveTo(3,-9,2,-11,1,-10.8);c.bezierCurveTo(-1,-9,-3,-9,-6,-5);c.closePath();c.fillStyle='#d7f7ff';c.fill();c.restore();
              // Thin surface streaks stretch forward as the crest collapses.
              const breaking=smooth((phase-.43)/.14)*(1-smooth((phase-.82)/.18));
              for(let k=0;k<5;k++){const x=-10+k*5+breaking*4,y=5+Math.sin(k*2.2+phase*9)*.65;c.beginPath();c.moveTo(x-4,y);c.quadraticCurveTo(x,y-1.2-breaking*1.4,x+4,y-.3);c.strokeStyle=`rgba(233,254,255,${.28+breaking*.6})`;c.lineWidth=.7+breaking*.45;c.stroke()}
              if(breaking>.1){c.save();c.globalAlpha*=breaking;c.beginPath();c.ellipse(12+breaking*3,2.5,6.5,2.2,-.12,0,Math.PI*2);c.fillStyle='rgba(216,249,255,.75)';c.fill();c.restore()}
              c.restore();
            }
          }

        }

        c.restore();
      }
    }
  }

  // Background: 100% Opaque Continental Landmass (naturally clips currents), Borders, States, Mountains
  function drawBackground() {
    const c = ctxBg;
    const col = getCol();
    setTransform(c);

    // Clear background: ocean and currents show cleanly through water areas
    c.clearRect(0, 0, W, H);

    const offsets = getVisibleOffsets();

    for (const off of offsets) {
      c.save();
      c.translate(W / 2 + V.tx + off * V.s, H / 2 + V.ty);
      c.scale(V.s, V.s);
      c.globalAlpha = quizTargetId ? 0.88 : 1.0;

      // Authentic relief, clipped to geographic land, above the animated ocean layer.
      if (terrainMode !== 'cartographic' && terrainImage && landClip) {
        const yMax = -project(0,85)[1]; c.save(); c.clip(landClip);
        c.drawImage(terrainImage,-WORLD_W/2,-yMax,WORLD_W,yMax*2);
        if (terrainMode === 'relief') { c.fillStyle=currentTheme==='dark'?'rgba(3,15,28,.15)':'rgba(255,249,230,.12)'; c.fill(landClip); }
        c.restore();
      }
      compiledCountries.forEach(ct => {
        if (terrainMode === 'cartographic' || !terrainImage) { c.fillStyle = col.land; c.fill(ct.path); }
        if (showBorders) {
          c.strokeStyle = terrainMode === 'cartographic' ? col.borderCountry : 'rgba(255,255,255,.54)';
          c.lineWidth = 0.65 / V.s;
          c.stroke(ct.path);
        }
      });

      // 2. India States (Borders visible whenever showBorders is ON)
      if (showBorders) {
        compiledStates.forEach(st => {
          c.strokeStyle = terrainMode === 'cartographic' ? col.borderState : 'rgba(255,255,255,.48)';
          c.lineWidth = 0.5 / V.s;
          c.stroke(st.path);
        });
      }

      // 3. Mountain Ranges: Contoured Topographic Shading & Ridge Spines
      if (isCategoryActive('mountain')) {
        compiledMountains.forEach(m => {
        if (!inScope(m)) return;
          if (!inScope(m) || (terrainMode !== 'cartographic' && m.id !== selectedId)) return;
          if (m.polyPath) {
            // Topographic elevation fill
            c.fillStyle = col.mountainFill;
            c.fill(m.polyPath);

            // Outer elevation contour (dashed)
            c.strokeStyle = col.mountainContour;
            c.lineWidth = 0.85 / V.s;
            c.setLineDash([4 / V.s, 4 / V.s]);
            c.stroke(m.polyPath);
            c.setLineDash([]);

            // Crisp mountain range perimeter
            c.strokeStyle = col.mountainStroke;
            c.lineWidth = 1.3 / V.s;
            c.stroke(m.polyPath);
          }
          if (m.crestPath) {
            // Shaded relief under-ridge glow
            c.strokeStyle = col.mountainCrestGlow;
            c.lineWidth = 3.2 / V.s;
            c.stroke(m.crestPath);

            // Spine razorback ridgeline
            c.strokeStyle = col.mountainCrest;
            c.lineWidth = 1.6 / V.s;
            c.stroke(m.crestPath);
          }
        });
      }

      // 4. National Parks & Protected Areas: Organic Soft Green Shading
      if (isCategoryActive('national_park') || isCategoryActive('tiger_reserve') || isCategoryActive('biosphere_reserve') || isCategoryActive('ramsar_site')) {
        compiledProtectedAreas.forEach(p => {
        if (!inScope(p)) return;
          if (!p.polyPath || !isCategoryActive(p.category)) return;
          const isNP = p.category === 'national_park';
          const isTR = p.category === 'tiger_reserve';
          const isBR = p.category === 'biosphere_reserve';

          if (isNP) {
            c.fillStyle = col.npFill;
            c.strokeStyle = col.npStroke;
          } else if (isTR) {
            c.fillStyle = col.trFill;
            c.strokeStyle = col.trStroke;
          } else if (isBR) {
            c.fillStyle = col.brFill;
            c.strokeStyle = col.brStroke;
          } else {
            c.fillStyle = col.ramsarFill;
            c.strokeStyle = col.ramsarStroke;
          }
          c.fill(p.polyPath);
          c.lineWidth = 0.85 / V.s;
          c.stroke(p.polyPath);
        });
      }

      c.restore();
    }
  }

  // Precision Badge Renderers for Protected Areas & Physical Landmarks
  function drawNationalParkBadge(c, sx, sy, r, isSel, col) {
    c.save();
    c.fillStyle = col.npStroke;
    c.strokeStyle = col.halo;
    c.lineWidth = 1.8;
    // Heraldic faceted park shield
    c.beginPath();
    c.moveTo(sx, sy - r * 1.15);
    c.lineTo(sx + r * 0.95, sy - r * 0.4);
    c.lineTo(sx + r * 0.8, sy + r * 0.5);
    c.lineTo(sx, sy + r * 1.15);
    c.lineTo(sx - r * 0.8, sy + r * 0.5);
    c.lineTo(sx - r * 0.95, sy - r * 0.4);
    c.closePath();
    c.fill();
    c.stroke();
    // Inner sanctuary star
    c.fillStyle = '#ffffff';
    c.beginPath();
    c.arc(sx, sy - r * 0.1, Math.max(1.6, r * 0.32), 0, Math.PI * 2);
    c.fill();
    c.restore();
  }

  function drawTigerReserveBadge(c, sx, sy, r, isSel, col) {
    c.save();
    c.fillStyle = col.trStroke;
    c.strokeStyle = col.halo;
    c.lineWidth = 1.8;
    // Diamond reserve badge with tawny amber core
    c.beginPath();
    c.moveTo(sx, sy - r * 1.2);
    c.lineTo(sx + r * 1.05, sy);
    c.lineTo(sx, sy + r * 1.2);
    c.lineTo(sx - r * 1.05, sy);
    c.closePath();
    c.fill();
    c.stroke();
    // Inner warning amber eye
    c.fillStyle = '#fef08a';
    c.beginPath();
    c.arc(sx, sy, Math.max(1.5, r * 0.34), 0, Math.PI * 2);
    c.fill();
    c.restore();
  }

  function drawBiosphereReserveBadge(c, sx, sy, r, isSel, col) {
    c.save();
    // Outer Buffer Zone (dashed UNESCO reserve ring)
    c.fillStyle = col.brFill;
    c.strokeStyle = col.brStroke;
    c.lineWidth = 1.5;
    c.setLineDash([3, 2.5]);
    c.beginPath();
    c.arc(sx, sy, r + 4.5, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    c.setLineDash([]);
    // Transition Zone Halo
    c.strokeStyle = col.halo;
    c.lineWidth = 2.0;
    c.beginPath();
    c.arc(sx, sy, r, 0, Math.PI * 2);
    c.stroke();
    // Core Sanctuary Zone
    c.fillStyle = col.brStroke;
    c.beginPath();
    c.arc(sx, sy, r, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#ffffff';
    c.beginPath();
    c.arc(sx, sy, 2.2, 0, Math.PI * 2);
    c.fill();
    c.restore();
  }

  function drawRamsarBadge(c, sx, sy, r, isSel, col) {
    c.save();
    c.fillStyle = col.ramsarStroke;
    c.strokeStyle = col.halo;
    c.lineWidth = 1.6;
    // Teardrop wetland droplet
    c.beginPath();
    c.moveTo(sx, sy - r * 1.25);
    c.bezierCurveTo(sx + r * 1.2, sy - r * 0.2, sx + r, sy + r, sx, sy + r * 1.1);
    c.bezierCurveTo(sx - r, sy + r, sx - r * 1.2, sy - r * 0.2, sx, sy - r * 1.25);
    c.closePath();
    c.fill();
    c.stroke();
    // Water ripple
    c.strokeStyle = '#ffffff';
    c.lineWidth = 1.2;
    c.beginPath();
    c.arc(sx, sy + r * 0.2, r * 0.45, 0.2 * Math.PI, 0.8 * Math.PI);
    c.stroke();
    c.restore();
  }

  function drawPeakBadge(c, sx, sy, col, isSel) {
    c.save();
    const h = 9, w = 7.5;
    // Halo outline
    c.strokeStyle = col.halo;
    c.lineWidth = 2.4;
    c.beginPath();
    c.moveTo(sx, sy - h);
    c.lineTo(sx + w, sy + h * 0.55);
    c.lineTo(sx - w, sy + h * 0.55);
    c.closePath();
    c.stroke();

    // Sunlit Left Flank
    c.fillStyle = col.peakLight || '#c084fc';
    c.beginPath();
    c.moveTo(sx, sy - h);
    c.lineTo(sx, sy + h * 0.55);
    c.lineTo(sx - w, sy + h * 0.55);
    c.closePath();
    c.fill();

    // Shaded Right Flank
    c.fillStyle = col.peak;
    c.beginPath();
    c.moveTo(sx, sy - h);
    c.lineTo(sx + w, sy + h * 0.55);
    c.lineTo(sx, sy + h * 0.55);
    c.closePath();
    c.fill();

    // Snow Cap
    c.fillStyle = '#ffffff';
    c.beginPath();
    c.moveTo(sx, sy - h);
    c.lineTo(sx + w * 0.38, sy - h * 0.35);
    c.lineTo(sx, sy - h * 0.25);
    c.lineTo(sx - w * 0.38, sy - h * 0.35);
    c.closePath();
    c.fill();
    c.restore();
  }

  function drawPassBadge(c, sx, sy, col, isSel) {
    c.save();
    const s = 6;
    c.strokeStyle = col.halo;
    c.lineWidth = 3.0;
    c.beginPath();
    c.arc(sx - s * 0.8, sy, s * 0.9, -Math.PI * 0.35, Math.PI * 0.35);
    c.arc(sx + s * 0.8, sy, s * 0.9, Math.PI * 0.65, Math.PI * 1.35);
    c.stroke();

    c.strokeStyle = col.pass;
    c.lineWidth = 2.0;
    c.beginPath();
    c.arc(sx - s * 0.8, sy, s * 0.9, -Math.PI * 0.35, Math.PI * 0.35);
    c.stroke();
    c.beginPath();
    c.arc(sx + s * 0.8, sy, s * 0.9, Math.PI * 0.65, Math.PI * 1.35);
    c.stroke();

    // Road traverse line
    c.lineWidth = 1.6;
    c.beginPath();
    c.moveTo(sx, sy - s * 1.1);
    c.lineTo(sx, sy + s * 1.1);
    c.stroke();
    c.restore();
  }

  function drawGlacierBadge(c, sx, sy, col, isSel) {
    c.save();
    const r = 6;
    c.fillStyle = col.glacier;
    c.strokeStyle = col.halo;
    c.lineWidth = 1.8;
    c.beginPath();
    c.moveTo(sx, sy - r * 1.2);
    c.lineTo(sx + r, sy);
    c.lineTo(sx, sy + r * 1.2);
    c.lineTo(sx - r, sy);
    c.closePath();
    c.fill();
    c.stroke();

    // Crystalline ice sheen
    c.fillStyle = '#ffffff';
    c.beginPath();
    c.moveTo(sx, sy - r * 1.2);
    c.lineTo(sx + r, sy);
    c.lineTo(sx, sy + r * 1.2);
    c.closePath();
    c.globalAlpha = 0.55;
    c.fill();
    c.restore();
  }

  function drawMidLayer() {
    const c = ctxMid;
    const col = getCol();
    setTransform(c);
    c.clearRect(0, 0, W, H);

    const labelsToDraw = [];

    c.save();
    c.translate(W / 2 + V.tx, H / 2 + V.ty);
    c.scale(V.s, V.s);
    c.globalAlpha = quizTargetId ? 0.88 : 1.0;

    // 1. Rivers: Primary Channel Paths
    if (isCategoryActive('river')) {
      c.lineCap = 'round';
      c.lineJoin = 'round';
      compiledRivers.forEach(r => {
        if (!inScope(r)) return;
        const isSel = r.id === selectedId;
        const riverCol = quizTargetId && isSel ? '#f59e0b' : (isSel ? (currentTheme === 'dark' ? '#38bdf8' : '#0284c7') : col.river);
        c.strokeStyle = riverCol;
        c.lineWidth = (isSel ? 3.6 : 1.4) / V.s;
        c.stroke(r.path);

        if (showLabels && (V.s > 1.2 || isSel)) {
          labelsToDraw.push({
            id: r.id,
            text: r.name,
            wx: r.cx,
            wy: r.cy,
            col: riverCol,
            priority: isSel ? 100 : 10
          });
        }
      });
    }

    // 2. Ocean Currents: Labels (Graphics are rendered in Sea Layer under land)
    if (isCategoryActive('current') && showLabels) {
      compiledCurrents.forEach(cur => {
        if (V.s > 0.8 || cur.id === selectedId) {
          const isWarm = cur.type === 'warm';
          labelsToDraw.push({
            id: cur.id,
            text: cur.name,
            wx: cur.cx,
            wy: cur.cy,
            col: isWarm ? col.currentWarm : col.currentCold,
            priority: cur.id === selectedId ? 100 : 8
          });
        }
      });
    }

    // 2b. Local Winds: Labels
    if (isCategoryActive('wind') && showLabels) {
      compiledWinds.forEach(w => {
        if (!inScope(w)) return;
        if (V.s > 0.85 || w.id === selectedId) {
          const isCold = w.type === 'cold';
          labelsToDraw.push({
            id: w.id,
            text: w.name,
            wx: w.cx,
            wy: w.cy,
            col: isCold ? '#0284c7' : '#ef4444',
            priority: w.id === selectedId ? 100 : 14
          });
        }
      });
    }

    c.restore();

    // 3. Screen-Space Features (Protected areas, peaks, passes, glaciers)
    compiledProtectedAreas.forEach(p => {
        if (!inScope(p)) return;
      if (!isCategoryActive(p.category)) return;
      const [sx, sy] = toScr(p.cx, p.cy);
      if (sx < -20 || sx > W + 20 || sy < -20 || sy > H + 20) return;

      const isSel = p.id === selectedId;
      const r = isSel ? 7.5 : 5.0;

      if (p.category === 'national_park') {
        drawNationalParkBadge(c, sx, sy, r, isSel, col);
      } else if (p.category === 'tiger_reserve') {
        drawTigerReserveBadge(c, sx, sy, r, isSel, col);
      } else if (p.category === 'biosphere_reserve') {
        drawBiosphereReserveBadge(c, sx, sy, r, isSel, col);
      } else if (p.category === 'ramsar_site') {
        drawRamsarBadge(c, sx, sy, r, isSel, col);
      }

      if (showLabels && (V.s > 1.8 || isSel)) {
        labelsToDraw.push({
          id: p.id,
          text: p.name,
          wx: p.cx,
          wy: p.cy,
          offsetY: -11,
          col: col.text,
          priority: isSel ? 100 : 5
        });
      }
    });

    // Peaks: 3D Faceted Triangular Mountains
    if (isCategoryActive('peak')) {
      compiledPeaks.forEach(pk => {
        if (!inScope(pk)) return;
        const [sx, sy] = toScr(pk.cx, pk.cy);
        if (sx < -20 || sx > W + 20 || sy < -20 || sy > H + 20) return;
        const isSel = pk.id === selectedId;
        drawPeakBadge(c, sx, sy, col, isSel);

        if (showLabels && (V.s > 1.2 || isSel)) {
          labelsToDraw.push({
            id: pk.id,
            text: pk.name + (pk.elevation ? ` (${pk.elevation})` : ''),
            wx: pk.cx,
            wy: pk.cy,
            offsetY: -13,
            col: col.peak,
            priority: isSel ? 100 : 25
          });
        }
      });
    }

    // Passes: Mountain Pass Saddle
    if (isCategoryActive('pass')) {
      compiledPasses.forEach(ps => {
        if (!inScope(ps)) return;
        const [sx, sy] = toScr(ps.cx, ps.cy);
        if (sx < -20 || sx > W + 20 || sy < -20 || sy > H + 20) return;
        const isSel = ps.id === selectedId;
        drawPassBadge(c, sx, sy, col, isSel);

        if (showLabels && (V.s > 1.2 || isSel)) {
          labelsToDraw.push({
            id: ps.id,
            text: ps.name,
            wx: ps.cx,
            wy: ps.cy,
            offsetY: -11,
            col: col.pass,
            priority: isSel ? 100 : 20
          });
        }
      });
    }

    // Glaciers: Crystalline Ice Diamonds
    if (isCategoryActive('glacier')) {
      compiledGlaciers.forEach(gl => {
        if (!inScope(gl)) return;
        const [sx, sy] = toScr(gl.cx, gl.cy);
        if (sx < -20 || sx > W + 20 || sy < -20 || sy > H + 20) return;
        const isSel = gl.id === selectedId;
        drawGlacierBadge(c, sx, sy, col, isSel);

        if (showLabels && (V.s > 1.2 || isSel)) {
          labelsToDraw.push({
            id: gl.id,
            text: gl.name,
            wx: gl.cx,
            wy: gl.cy,
            offsetY: -10,
            col: col.glacier,
            priority: isSel ? 100 : 20
          });
        }
      });
    }

    // World Entities (Countries, Lakes, Deserts, Grasslands, Straits)
    compiledWorldEntities.forEach(we => {
      if (!inScope(we)) return;
      if (!isCategoryActive(we.category)) return;
      const isSel = we.id === selectedId;

      if (we.category === 'country') {
        if (showLabels && (V.s > 0.65 || isSel)) {
          labelsToDraw.push({
            id: we.id,
            text: we.name,
            wx: we.cx,
            wy: we.cy,
            offsetY: 0,
            col: col.text,
            priority: isSel ? 100 : 35
          });
        }
        return;
      }

      const [sx, sy] = toScr(we.cx, we.cy);
      if (sx < -30 || sx > W + 30 || sy < -30 || sy > H + 30) return;

      const itemCol = col[we.category] || col.text;
      c.save();
      c.fillStyle = itemCol;
      c.strokeStyle = col.halo;
      c.lineWidth = 1.6;

      if (we.category === 'peak' || (we.id && we.id.startsWith('peak-')) || (we.name && we.name.toLowerCase().includes('mount '))) {
        drawPeakBadge(c, sx, sy, col, isSel);
      } else if (we.category === 'lake') {
        // Oval water reservoir marker
        c.beginPath();
        c.ellipse(sx, sy, isSel ? 7 : 4.5, isSel ? 5 : 3.2, 0, 0, Math.PI * 2);
        c.fill();
        c.stroke();
      } else if (we.category === 'desert') {
        // Dune crescent
        c.beginPath();
        c.arc(sx, sy, isSel ? 6 : 4, 0.2 * Math.PI, 1.8 * Math.PI);
        c.closePath();
        c.fill();
        c.stroke();
      } else if (we.category === 'strait') {
        // Channel pinch brackets
        c.beginPath();
        c.arc(sx, sy, isSel ? 6 : 4, 0, Math.PI * 2);
        c.fill();
        c.stroke();
      } else {
        c.beginPath();
        c.arc(sx, sy, isSel ? 6.5 : 4.5, 0, Math.PI * 2);
        c.fill();
        c.stroke();
      }
      c.restore();

      if (showLabels && (V.s > 0.85 || isSel)) {
        labelsToDraw.push({
          id: we.id,
          text: we.name,
          wx: we.cx,
          wy: we.cy,
          offsetY: -8,
          col: itemCol,
          priority: isSel ? 100 : 15
        });
      }
    });

    // Mountain Ranges Labels
    if (isCategoryActive('mountain')) {
      compiledMountains.forEach(m => {
        if (!inScope(m)) return;
        if (showLabels && (V.s > 1.0 || m.id === selectedId)) {
          labelsToDraw.push({
            id: m.id,
            text: m.name.toUpperCase(),
            wx: m.cx,
            wy: m.cy,
            col: col.mountainStroke,
            priority: m.id === selectedId ? 100 : 30
          });
        }
      });
    }

    // State/UT names live in notes; political divisions remain visible on the basemap.

    // 4. Render Labels with Text Halo & Anti-Cheat Suppression in Quiz/Recall
    if (showLabels) {
      labelsToDraw.sort((a, b) => b.priority - a.priority);
      const occupied = [];

      labelsToDraw.forEach(lbl => {
        // In Quiz Mode, suppress label for the active quiz target
        if (quizTargetId || quizTargetName) {
          const cleanTgt = normKey(quizTargetName || quizTargetId).replace(/^(country|mountain|state|river|peak|lake|desert|strait)/g, '');
          const cleanLbl = normKey(lbl.text || lbl.id || '').replace(/^(country|mountain|state|river|peak|lake|desert|strait)/g, '');
          if (cleanTgt && cleanLbl && (cleanTgt === cleanLbl || cleanTgt.includes(cleanLbl) || cleanLbl.includes(cleanTgt))) {
            return;
          }
          if (lbl.id && quizTargetId && (lbl.id === quizTargetId || normKey(lbl.id) === normKey(quizTargetId))) {
            return;
          }
        }

        const [sx, sy] = toScr(lbl.wx, lbl.wy);
        const y = sy + (lbl.offsetY || 0);

        if (lbl.isState) {
          c.font = '700 11.5px Inter, system-ui, sans-serif';
        } else {
          c.font = '600 11px Inter, system-ui, sans-serif';
        }
        c.textAlign = 'center';
        c.textBaseline = 'middle';

        const width = c.measureText(lbl.text).width;
        const box = [sx - width / 2 - 4, y - 8, width + 8, 16];

        // Collision check
        let collides = false;
        if (lbl.priority < 90) {
          for (const occ of occupied) {
            if (box[0] < occ[0] + occ[2] && box[0] + box[2] > occ[0] &&
                box[1] < occ[1] + occ[3] && box[1] + box[3] > occ[1]) {
              collides = true;
              break;
            }
          }
        }

        if (!collides) {
          occupied.push(box);
          // Halo stroke
          c.strokeStyle = col.halo;
          c.lineWidth = lbl.isState ? 4.2 : 3.5;
          c.strokeText(lbl.text, sx, y);
          // Text fill
          c.fillStyle = lbl.col || col.text;
          c.fillText(lbl.text, sx, y);
        }
      });
    }
  }

  function drawFlyAndFlowLayer(time) {
    const c = ctxFl;
    const col = getCol();
    setTransform(c);
    c.clearRect(0, 0, W, H);

    // 1. Flowing Water Stream Animation along All Active Rivers (80% slower: 0.0048)
    if (isCategoryActive('river') && compiledRivers.length > 0) {
      c.save();
      c.translate(W / 2 + V.tx, H / 2 + V.ty);
      c.scale(V.s, V.s);
      c.lineCap = 'round';
      c.lineJoin = 'round';
      c.strokeStyle = currentTheme === 'dark' ? 'rgba(224, 242, 254, 0.90)' : 'rgba(255, 255, 255, 0.92)';
      c.lineWidth = 1.3 / V.s;
      c.setLineDash([7 / V.s, 15 / V.s]);
      c.lineDashOffset = -(time * 0.0048) / V.s;
      compiledRivers.forEach(r => {
        if (!inScope(r) || !r.flowVerified) return;
        c.stroke(r.path);
      });
      c.setLineDash([]);
      c.restore();
    }

    // 2. Animated Flowing Local Winds (Atmospheric corridors + soft shadows)
    drawWindsLayer(c, time);

    // 3. Selection & Highlight
    if (selectedId) {
      const target = resolveEntity(selectedId) || quizTargetEntity;
      if (target && target.cx !== undefined && target.cy !== undefined) {
        const [sx, sy] = toScr(target.cx, target.cy);
        const ph = ((time / 1400) % 1);

        // Highlight Mountain polygon if selected
        if (target.polyPath && target.category === 'mountain') {
          c.save();
          c.translate(W / 2 + V.tx, H / 2 + V.ty);
          c.scale(V.s, V.s);
          c.fillStyle = quizTargetId ? 'rgba(245, 158, 11, 0.28)' : 'rgba(217, 119, 6, 0.22)';
          c.fill(target.polyPath);
          c.strokeStyle = quizTargetId ? '#f59e0b' : '#d97706';
          c.lineWidth = 2.8 / V.s;
          c.stroke(target.polyPath);
          c.restore();
        } else if (target.polyPath && target.category === 'national_park') {
          c.save();
          c.translate(W / 2 + V.tx, H / 2 + V.ty);
          c.scale(V.s, V.s);
          c.fillStyle = quizTargetId ? 'rgba(245, 158, 11, 0.28)' : 'rgba(34, 197, 94, 0.30)';
          c.fill(target.polyPath);
          c.strokeStyle = quizTargetId ? '#f59e0b' : '#15803d';
          c.lineWidth = 2.8 / V.s;
          c.stroke(target.polyPath);
          c.restore();
        } else if (target.path && (target.category === 'country' || target.category === 'states')) {
          c.save();
          c.translate(W / 2 + V.tx, H / 2 + V.ty);
          c.scale(V.s, V.s);
          c.fillStyle = quizTargetId ? 'rgba(245, 158, 11, 0.20)' : (target.category === 'country' ? 'rgba(37, 99, 235, 0.16)' : 'rgba(100, 116, 139, 0.18)');
          c.fill(target.path);
          c.strokeStyle = quizTargetId ? '#f59e0b' : (target.category === 'country' ? '#2563eb' : '#475569');
          c.lineWidth = 2.6 / V.s;
          c.stroke(target.path);
          c.restore();
        }

        // Highlight River / Current / Wind path if selected or quiz target
        if (target.path && (target.category === 'river' || target.category === 'current' || target.category === 'wind')) {
          c.save();
          c.translate(W / 2 + V.tx, H / 2 + V.ty);
          c.scale(V.s, V.s);
          const isCold = target.type === 'c' || target.type === 'cold' || (target.nature && target.nature.toLowerCase().includes('cold'));
          const isWarm = target.type === 'w' || target.type === 'warm' || (target.nature && target.nature.toLowerCase().includes('warm'));
          const isRiver = target.category === 'river';

          let strokeCol;
          if (quizTargetId) {
            strokeCol = '#f59e0b';
          } else if (isRiver) {
            strokeCol = currentTheme === 'dark' ? '#38bdf8' : '#0284c7';
          } else if (isCold) {
            strokeCol = currentTheme === 'dark' ? '#38bdf8' : '#0284c7';
          } else if (isWarm) {
            strokeCol = currentTheme === 'dark' ? '#f87171' : '#ef4444';
          } else {
            strokeCol = '#94a3b8';
          }

          // Ambient glow
          c.strokeStyle = strokeCol;
          c.globalAlpha = 0.45;
          c.lineWidth = 6.8 / V.s;
          c.stroke(target.path);

          // Crisp core path
          c.globalAlpha = 1.0;
          c.lineWidth = 3.6 / V.s;
          c.stroke(target.path);
          c.restore();
        }

        // Animated pulse ring (Color-matched to cold current cyan, national park green, mountain amber)
        const pulseR = 8 + ph * 36;
        const alpha = (1 - ph) * 0.85;
        const isTargetCold = target.type === 'c' || target.type === 'cold' || (target.nature && target.nature.toLowerCase().includes('cold'));
        const isTargetNP = target.category === 'national_park';
        const isTargetMtn = target.category === 'mountain';
        const pulseCol = quizTargetId ? '#f59e0b' : (isTargetCold ? '#0284c7' : (isTargetNP ? '#15803d' : (isTargetMtn ? '#b45309' : col.selPulse)));

        c.strokeStyle = pulseCol;
        c.lineWidth = 2.5;
        c.globalAlpha = alpha;
        c.beginPath();
        c.arc(sx, sy, pulseR, 0, Math.PI * 2);
        c.stroke();

        c.fillStyle = pulseCol;
        c.globalAlpha = 0.3;
        c.beginPath();
        c.arc(sx, sy, 10, 0, Math.PI * 2);
        c.fill();
        c.globalAlpha = 1.0;

        // If in Quiz mode, render the Prominent Glowing Beacon Question Pin
        if (quizTargetId) {
          c.save();
          // Expanding radar waves
          for (let i = 0; i < 3; i++) {
            const ringPhase = ((ph + i * 0.33) % 1);
            const rWave = 12 + ringPhase * 44;
            const waveAlpha = (1 - ringPhase) * 0.75;
            c.strokeStyle = '#f59e0b';
            c.lineWidth = 2.2;
            c.globalAlpha = waveAlpha;
            c.beginPath();
            c.arc(sx, sy, rWave, 0, Math.PI * 2);
            c.stroke();
          }

          // Needle pointing to exact location
          c.globalAlpha = 1.0;
          c.strokeStyle = '#d97706';
          c.lineWidth = 3.0;
          c.beginPath();
          c.moveTo(sx, sy);
          c.lineTo(sx, sy - 24);
          c.stroke();

          // Luminous golden pin badge with glowing shadow
          c.shadowColor = 'rgba(245, 158, 11, 0.85)';
          c.shadowBlur = 14;
          const pinGrad = c.createLinearGradient(sx - 14, sy - 38, sx + 14, sy - 10);
          pinGrad.addColorStop(0, '#fbbf24');
          pinGrad.addColorStop(1, '#d97706');
          c.fillStyle = pinGrad;
          c.beginPath();
          c.arc(sx, sy - 24, 15, 0, Math.PI * 2);
          c.fill();

          c.shadowBlur = 0;
          c.strokeStyle = '#ffffff';
          c.lineWidth = 2.5;
          c.stroke();

          // Crisp White '?' glyph
          c.fillStyle = '#ffffff';
          c.font = '800 16px Inter, system-ui, sans-serif';
          c.textAlign = 'center';
          c.textBaseline = 'middle';
          c.fillText('?', sx, sy - 24);
          c.restore();
        }
      }
    }
  }

  function drawWindsLayer(c, time) {
    if (!isCategoryActive('wind') || compiledWinds.length === 0) return;
    const isDark = currentTheme === 'dark';
    const offsets = getVisibleOffsets();

    for (const off of offsets) {
      c.save();
      c.translate(W / 2 + V.tx + off * V.s, H / 2 + V.ty);
      c.scale(V.s, V.s);
      c.lineCap = 'round';
      c.lineJoin = 'round';

      for (const wind of compiledWinds) {
          if (!inScope(wind)) continue;
        const isCold = wind.type === 'cold';
        const isSel = wind.id === selectedId;

        // ONLY keep soft, semi-transparent flowing atmospheric shadows (NO dark center line, NO dashed line)
        const shadowColOuter = isCold
          ? (isDark ? 'rgba(56, 189, 248, 0.12)' : 'rgba(2, 132, 199, 0.09)')
          : (isDark ? 'rgba(248, 113, 113, 0.12)' : 'rgba(239, 68, 68, 0.09)');
        const shadowColInner = isCold
          ? (isDark ? 'rgba(56, 189, 248, 0.20)' : 'rgba(2, 132, 199, 0.15)')
          : (isDark ? 'rgba(248, 113, 113, 0.20)' : 'rgba(239, 68, 68, 0.15)');

        // Outer soft atmospheric shadow ribbon
        c.strokeStyle = shadowColOuter;
        c.lineWidth = (isSel ? 26 : 18) / V.s;
        c.stroke(wind.path);

        // Inner soft atmospheric shadow ribbon
        c.strokeStyle = shadowColInner;
        c.lineWidth = (isSel ? 14 : 9) / V.s;
        c.stroke(wind.path);
      }
      c.restore();
    }
  }

  // Camera Fly-To & Selection
  function selectEntity(id, autoPan = true) {
    selectedId = id;
    if (!id) {
      hideFloatingCard();
      requestRender(false, true);
      return;
    }

    const item = resolveEntity(id) || entityIndex.get(id) || entityIndex.get(normKey(id));
    if (item && item.cx !== undefined && item.cy !== undefined) {
      const [lng, lat] = (item.lng !== undefined && item.lat !== undefined && item.lng !== null)
        ? [item.lng, item.lat]
        : unproject(item.cx, item.cy);
      if (autoPan) {
        const targetScale = getAppropriateScale(item.category, item);
        flyTo(lng, lat, targetScale, 450);
      }
      const [sx, sy] = toScr(item.cx, item.cy);
      showFloatingCard(item, sx, sy);
    }
    requestRender(false, true);
  }

  function flyTo(lng, lat, targetScale = 2.0, duration = 400) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) duration = 0;
    const [wx, wy] = project(lng, lat);
    const startTx = V.tx;
    const startTy = V.ty;
    const startS = V.s;
    const targetTx = -wx * targetScale;
    const targetTy = -wy * targetScale;
    const startTime = performance.now();

    if (animFly) cancelAnimationFrame(animFly);

    function step(now) {
      const progress = Math.min(1.0, (now - startTime) / duration);
      const ease = progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress;

      V.tx = startTx + (targetTx - startTx) * ease;
      V.ty = startTy + (targetTy - startTy) * ease;
      V.s = startS + (targetScale - startS) * ease;
      clampView();

      requestRender(true, true);

      if (progress < 1.0) {
        animFly = requestAnimationFrame(step);
      } else {
        animFly = null;
      }
    }

    animFly = requestAnimationFrame(step);
  }

  function setTheme(theme) {
    currentTheme = theme;
    requestRender(true, true);
  }

  function setCustomBaseMap(options) {
    console.info('Mapping Atlas: Custom base map options ingested:', options);
  }

  document.addEventListener('visibilitychange', () => { animationLast = null; if (!document.hidden) requestRender(true,true); });

  return {
    init,
    setTerrain: () => { terrainMode = 'cartographic'; requestRender(true,true); },
    getTerrain: () => terrainMode,
    setAnimation: playing => { animationPlaying = !!playing; animationLast = null; requestRender(false,true); },
    setAnimationSpeed: speed => { animationSpeed = Math.max(.25,Math.min(3,Number(speed)||1)); },
    replayAnimation: () => { animationTime = 0; animationLast = null; requestRender(false,true); },
    getAnimation: () => ({ playing:animationPlaying, speed:animationSpeed, time:animationTime }),
    setEntityScope: ids => { entityScope = ids ? new Set(ids.flatMap(id => [id, normKey(id)])) : null; requestRender(true,true); },
    focusIndia: () => flyTo(81.5,22,Math.max(.8,Math.min(W/240,H/220)),900),
    getView: () => ({...V}),
    render: () => requestRender(true, true),
    resizeAndRender: () => {
      resize();
      requestRender(true, true);
    },
    zoomIn: () => zoomAt(W / 2, H / 2, 1.4),
    zoomOut: () => zoomAt(W / 2, H / 2, 1 / 1.4),
    resetView,
    selectEntity,
    toggleBorders,
    toggleLabels,
    setCategoryFilter,
    setGroupFilter,
    setAllCategories,
    getActiveFilters: () => ({ ...activeFilters }),
    isCategoryActive,
    setTheme,
    setCustomBaseMap,
    setRecallTarget,
    revealRecallTarget,
    clearRecallTarget,
    setQuizTarget,
    revealQuizAnswer,
    clearQuizTarget,
    isReady: () => isReady
  };
})();
