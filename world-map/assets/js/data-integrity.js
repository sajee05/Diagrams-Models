/**
 * Mapping Atlas — Data Integrity and Indexing Engine
 * Validates datasets, creates fast indices, and cross-references features:
 * 1. World entities (countries, mountains, rivers, straits, lakes, deserts, grasslands)
 * 2. Survey of India geographic features (rivers, peaks, passes, glaciers, mountain ranges, protected areas)
 * 3. Global ocean currents (30 warm/cold currents and drifts)
 */

window.DATA_INTEGRITY = (function () {
  'use strict';

  let initialized = false;
  let allEntitiesList = [];
  const index = {
    byId: new Map(),
    byContinent: new Map(),
    byCategory: new Map(),
    searchIndex: []
  };

  function addEntity(entity) {
    if (!entity || !entity.id) return;
    if (index.byId.has(entity.id)) return; // prevent duplicate IDs

    index.byId.set(entity.id, entity);
    allEntitiesList.push(entity);

    // Index by Continent
    const cont = entity.continent || 'World';
    if (!index.byContinent.has(cont)) {
      index.byContinent.set(cont, []);
    }
    index.byContinent.get(cont).push(entity);

    // Index by Category
    const cat = entity.category || 'other';
    if (!index.byCategory.has(cat)) {
      index.byCategory.set(cat, []);
    }
    index.byCategory.get(cat).push(entity);

    // Search tokens
    const searchTokens = [
      entity.name || '',
      entity.capital || '',
      entity.category || '',
      entity.categoryName || '',
      entity.continent || '',
      entity.subtitle || '',
      entity.state || '',
      entity.context || '',
      ...(Array.isArray(entity.keyFacts) ? entity.keyFacts : []),
      entity.upscNotes || '',
      entity.description || '',
      ...(entity.studySections||[]).flatMap(s=>(s.facts||[]).map(f=>typeof f==='string'?f:f.text)),
      ...(entity.speciesNotes||[]).map(s=>[s.name,s.scientificName,s.category,s.notes].join(' '))
    ].join(' ').toLowerCase();

    index.searchIndex.push({
      id: entity.id,
      entity: entity,
      tokens: searchTokens
    });
  }

  function init() {
    if (initialized) return true;
    allEntitiesList = [];
    index.byId.clear();
    index.byContinent.clear();
    index.byCategory.clear();
    index.searchIndex = [];

    // 1. Index World Map Data (387 features)
    if (window.WORLD_MAP_DATA && Array.isArray(window.WORLD_MAP_DATA.entities)) {
      window.WORLD_MAP_DATA.entities.forEach(entity => {
        if (!entity.subtitle) {
          entity.subtitle = entity.capital ? `${entity.continent} · Cap: ${entity.capital}` : (entity.continent || '');
        }
        addEntity(entity);
      });
    }

    // 2. Index Geographic Features (Rivers, Mountain ranges, Peaks, Passes, Glaciers, Protected areas)
    if (window.GEOGRAPHIC_FEATURES) {
      const gf = window.GEOGRAPHIC_FEATURES;
      const categories = ['mountains', 'rivers', 'peaks', 'passes', 'glaciers', 'protectedAreas'];
      categories.forEach(cat => {
        (gf[cat] || []).forEach(f => {
          let catType = f.type || f.category || (cat === 'protectedAreas' ? 'protected_area' : cat.replace(/s$/, ''));
          let coords = f.coords;
          if (!coords && f.path && f.path.length > 0) coords = f.path[Math.floor(f.path.length / 2)];
          if (!coords && f.polygon && f.polygon.length > 0) coords = f.polygon[0];
          if (!coords && f.segments && f.segments[0] && f.segments[0].length > 0) coords = f.segments[0][Math.floor(f.segments[0].length / 2)];

          const enriched = Object.assign({}, f, {
            category: catType,
            subtitle: f.state || f.context || 'India',
            continent: f.continent || 'Asia',
            coords: coords,
            source: 'geographic'
          });
          addEntity(enriched);
        });
      });
    }

    // 3. Index Ocean Currents (30 currents)
    if (window.OCEAN_CURRENTS && Array.isArray(window.OCEAN_CURRENTS)) {
      window.OCEAN_CURRENTS.forEach(c => {
        addEntity(c);
      });
    }

    // 4. Index Local Winds (12 major global winds with complete climatology facts)
    if (window.LOCAL_WINDS && Array.isArray(window.LOCAL_WINDS)) {
      window.LOCAL_WINDS.forEach(w => {
        addEntity(w);
      });
    }

    // 5. Index Indian States & Union Territories (36 features from INDIA_STATES_GEOJSON)
    if (window.INDIA_STATES_GEOJSON && Array.isArray(window.INDIA_STATES_GEOJSON.features)) {
      const stateMetadata = {
        'andaman & nicobar island': { capital: 'Port Blair', context: 'Bay of Bengal UT, 572 islands, Ten Degree Channel separates Andaman and Nicobar' },
        'andhra pradesh': { capital: 'Amaravati', context: 'Eastern Ghats, Krishna & Godavari delta, Seshachalam Biosphere Reserve, Sriharikota spaceport' },
        'arunanchal pradesh': { capital: 'Itanagar', context: 'Eastern Himalayas, Namdapha NP, Dihang-Dibang BR, Land of Dawn-lit Mountains' },
        'assam': { capital: 'Dispur', context: 'Brahmaputra Valley, Kaziranga & Manas WHS, Majuli river island, tea capital' },
        'bihar': { capital: 'Patna', context: 'Gangetic plains, Valmiki TR, Kanwar Lake Ramsar site, historic Magadha' },
        'chandigarh': { capital: 'Chandigarh', context: 'Joint capital of Punjab & Haryana, planned city by Le Corbusier' },
        'chhattisgarh': { capital: 'Raipur', context: 'Mahanadi basin, Bastar plateau, Indravati & Kanger Valley NP, mineral heartland' },
        'dadara & nagar havelli': { capital: 'Silvassa', context: 'Western India UT, merged with Daman and Diu, Daman Ganga basin' },
        'daman & diu': { capital: 'Daman', context: 'Coastal enclave UT in Gulf of Khambhat, historic Portuguese colonial outpost' },
        'goa': { capital: 'Panaji', context: 'Konkan coast, Western Ghats biodiversity, Bhagwan Mahavir & Mollem NP, Mandovi river' },
        'gujarat': { capital: 'Gandhinagar', context: 'Longest coastline in India (1600 km), Gir Asiatic Lions, Great Rann of Kutch' },
        'haryana': { capital: 'Chandigarh', context: 'Ghaggar-Yamuna doab, Sultanpur NP & wetland, historic Kurukshetra' },
        'himachal pradesh': { capital: 'Shimla', context: 'Western Himalayas, Great Himalayan NP (WHS), Pin Valley, Spiti cold desert' },
        'jammu & kashmir': { capital: 'Srinagar / Jammu', context: 'Kashmir Valley, Pir Panjal & Zanskar ranges, Dal & Wular lakes, Dachigam Hangul' },
        'jharkhand': { capital: 'Ranchi', context: 'Chota Nagpur plateau, Betla NP & Palamu TR, Damodar valley, minerals capital' },
        'karnataka': { capital: 'Bengaluru', context: 'Deccan plateau, Western Ghats, Nagarhole & Bandipur TR, Kudremukh, Cauvery basin' },
        'kerala': { capital: 'Thiruvananthapuram', context: 'Malabar coast, Silent Valley NP, Periyar TR, Vembanad backwaters, Anamudi peak' },
        'lakshadweep': { capital: 'Kavaratti', context: 'Arabian Sea coral atoll archipelago, Nine Degree Channel, Pitti bird sanctuary' },
        'madhya pradesh': { capital: 'Bhopal', context: 'Central India heartland, highest number of Tiger Reserves (Kanha, Bandhavgarh, Panna), Narmada & Tapti' },
        'maharashtra': { capital: 'Mumbai', context: 'Western Ghats & Deccan lava traps, Tadoba-Andhari TR, Ajanta-Ellora, Godavari & Krishna origins' },
        'manipur': { capital: 'Imphal', context: 'Loktak Lake with floating phumdis, Keibul Lamjao NP (only floating national park, Sangai deer)' },
        'meghalaya': { capital: 'Shillong', context: 'Garo-Khasi-Jaintia hills, Nokrek Biosphere Reserve, Mawsynram wettest place on Earth, living root bridges' },
        'mizoram': { capital: 'Aizawl', context: 'Lushai Hills, Blue Mountain (Phawngpui) NP, Dampa TR, Tropic of Cancer' },
        'nagaland': { capital: 'Kohima', context: 'Naga Hills, Mount Saramati, Ntangki NP, Hornbill Festival, Dzukou Valley' },
        'nct of delhi': { capital: 'New Delhi', context: 'National Capital Territory on the Yamuna river, northern Aravalli ridge terminator' },
        'puducherry': { capital: 'Puducherry', context: 'Coromandel coast UT with enclaves in Tamil Nadu, Kerala (Mahe), and Andhra (Yanam)' },
        'punjab': { capital: 'Chandigarh', context: 'Land of five rivers (Sutlej, Beas, Ravi), Harike wetland Ramsar site, granary of India' },
        'rajasthan': { capital: 'Jaipur', context: 'Largest Indian state by area, Thar Desert, Aravalli oldest fold mountains, Ranthambore & Sariska TR' },
        'sikkim': { capital: 'Gangtok', context: 'Khangchendzonga NP (Mixed WHS), Teesta river basin, Nathu La pass, highest literacy in NE' },
        'tamil nadu': { capital: 'Chennai', context: 'Coromandel coast, Nilgiri Biosphere Reserve, Gulf of Mannar Marine NP, Western & Eastern Ghats confluence' },
        'telangana': { capital: 'Hyderabad', context: 'Deccan plateau between Godavari and Krishna rivers, Amrabad TR, Ramappa Temple WHS' },
        'tripura': { capital: 'Agartala', context: 'Clouded Leopard NP, Sepahijala, bordered on three sides by Bangladesh' },
        'uttar pradesh': { capital: 'Lucknow', context: 'Most populous state, Gangetic plain, Dudhwa NP & TR, confluence at Prayagraj' },
        'uttarakhand': { capital: 'Dehradun', context: 'Jim Corbett NP (oldest in India), Nanda Devi & Valley of Flowers WHS, Ganga & Yamuna glacial sources' },
        'west bengal': { capital: 'Kolkata', context: 'Sundarbans mangrove delta (WHS, royal Bengal tigers), Buxa & Jaldapara NP, Darjeeling Himalayas' },
        'odisha': { capital: 'Bhubaneswar', context: 'Eastern coastal plain, Similipal Biosphere Reserve, Chilika Lake (largest brackish lagoon), Bhitarkanika mangroves' }
      };

      window.INDIA_STATES_GEOJSON.features.forEach(f => {
        const rawName = (f.properties && (f.properties.NAME_1 || f.properties.name)) || 'State';
        const key = rawName.toLowerCase().trim();
        const meta = stateMetadata[key] || stateMetadata[rawName.toLowerCase().replace(/[^a-z]/g, '')] || {};

        let cxLng = 78.5, cyLat = 22.0;
        const geom = f.geometry;
        if (geom) {
          let rings = [];
          if (geom.type === 'Polygon') rings = geom.coordinates;
          else if (geom.type === 'MultiPolygon') geom.coordinates.forEach(p => rings.push(p[0]));
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
            }
          }
        }

        const stateEntity = {
          id: 'state-' + rawName.toLowerCase().replace(/[^a-z0-9]/g, '_'),
          name: rawName,
          category: 'states',
          categoryName: 'States & UTs',
          continent: 'India',
          group: 'india',
          state: rawName,
          capital: meta.capital || '',
          subtitle: meta.capital ? `Capital: ${meta.capital} · Indian State / UT` : 'Indian State / UT',
          context: meta.context || 'Indian State / Union Territory',
          description: meta.context ? `${rawName} — Capital: ${meta.capital}. ${meta.context}` : `Indian State / UT: ${rawName}`,
          upscNotes: meta.context || '',
          coords: [cxLng, cyLat],
          source: 'boundaries'
        };
        addEntity(stateEntity);
      });
    }

    initialized = true;
    console.info(`Mapping Atlas: Indexed ${allEntitiesList.length} total entities successfully from project data.`);
    return true;
  }

  function getEntity(id) {
    if (!initialized) init();
    if (!id) return null;
    if (index.byId.has(id)) return index.byId.get(id);

    // Fallback: lookup by normalized name
    const norm = String(id).toLowerCase().replace(/[^a-z0-9]+/g, '');
    if (!norm) return null;

    for (const [, e] of index.byId.entries()) {
      const eNorm = (e.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
      if (eNorm === norm || (e.pureName && e.pureName.toLowerCase().replace(/[^a-z0-9]+/g, '') === norm)) {
        return e;
      }
    }
    return null;
  }

  function getByContinent(continent) {
    if (!initialized) init();
    if (continent === 'India') {
      return allEntitiesList.filter(e => e.group === 'india' || e.state || e.continent === 'India' || e.id === 'country-india');
    }
    return continent ? (index.byContinent.get(continent) || []) : allEntitiesList;
  }

  function getByCategory(category) {
    if (!initialized) init();
    return category && category !== 'all' ? (index.byCategory.get(category) || []) : allEntitiesList;
  }

  function search(query, continentFilter, categoryFilter, searchMode = 'all') {
    if (!initialized) init();
    const q = (query || '').trim().toLowerCase();

    // Map high-level filter groupings
    const categoryGroups = {
      'protected': ['national_park', 'tiger_reserve', 'biosphere_reserve', 'ramsar_site'],
      'physical': ['river', 'mountain', 'peak', 'pass', 'glacier', 'current', 'wind'],
      'climate': ['current', 'wind'],
      'heritage': ['country', 'lake', 'desert', 'grassland', 'sea', 'strait']
    };

    return index.searchIndex.filter(item => {
      const e = item.entity;

      // Continent filter (Supports explicit India Only mode)
      if (continentFilter === 'India') {
        if (e.group !== 'india' && !e.state && e.continent !== 'India' && e.id !== 'country-india') return false;
      } else if (continentFilter && e.continent !== continentFilter) {
        return false;
      }

      // Category filter
      if (categoryFilter && categoryFilter !== 'all') {
        if (categoryGroups[categoryFilter]) {
          if (!categoryGroups[categoryFilter].includes(e.category)) return false;
        } else if (e.category !== categoryFilter) {
          return false;
        }
      }

      if (!q) return true;

      // Match "all words" vs "any word"
      const words = q.split(/\s+/).filter(Boolean);
      if (searchMode === 'all') {
        return words.every(w => item.tokens.includes(w));
      } else {
        return words.some(w => item.tokens.includes(w));
      }
    }).map(item => item.entity).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }

  return {
    init: init,
    getEntity: getEntity,
    getByContinent: getByContinent,
    getByCategory: getByCategory,
    search: search,
    getAll: () => (initialized ? allEntitiesList : (init(), allEntitiesList))
  };
})();
