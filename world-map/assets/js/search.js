/**
 * Mapping Atlas — Search and Filter Controller
 * Real-time fuzzy query filtering with 'All words' and 'Any word' facet support.
 */

window.WORLD_SEARCH = (function () {
  'use strict';

  let currentCategory = 'all';
  let currentContinent = '';
  let currentQuery = '';
  let searchMode = 'all';
  let debounceTimer = null;

  function init() {
    const searchInput = document.getElementById('searchInput');
    const searchModeSelect = document.getElementById('searchModeSelect');
    const continentSelect = document.getElementById('continentSelect');
    const filterChips = document.getElementById('browseFilters');

    if (searchInput) {
      searchInput.addEventListener('input', e => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          currentQuery = e.target.value;
          applyFilters();
        }, 120);
      });
    }

    if (searchModeSelect) {
      searchModeSelect.addEventListener('change', e => {
        searchMode = e.target.value;
        applyFilters();
      });
    }

    if (continentSelect) {
      continentSelect.addEventListener('change', e => {
        currentContinent = e.target.value;
        applyFilters();
      });
    }

    if (filterChips) {
      filterChips.addEventListener('click', e => {
        const chip = e.target.closest('.chip');
        if (!chip) return;

        filterChips.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');

        currentCategory = chip.dataset.filter || 'all';
        applyFilters();
      });
    }

    applyFilters();
  }

  function applyFilters() {
    if (!window.DATA_INTEGRITY || !window.ENTITY_PANEL) return;

    if (window.ENTITY_PANEL.showList) {
      window.ENTITY_PANEL.showList();
    }
    let filtered = window.DATA_INTEGRITY.search(currentQuery, currentContinent, currentCategory, searchMode);

    // Synchronize with Top-Right Multi-Select Layer Dropdown
    if (window.WORLD_VECTOR_MAP && window.WORLD_VECTOR_MAP.isCategoryActive) {
      filtered = filtered.filter(item => {
        const cat = item.category || item.type;
        return window.WORLD_VECTOR_MAP.isCategoryActive(cat);
      });
    }

    if (window.SE7EN) filtered = window.SE7EN.filterEntities(filtered);
    window.ENTITY_PANEL.renderList(filtered);
  }

  function setFilter(category, continent) {
    if (category) currentCategory = category;
    if (continent !== undefined) currentContinent = continent;

    // Update UI chips
    const filterChips = document.getElementById('browseFilters');
    if (filterChips) {
      filterChips.querySelectorAll('.chip').forEach(c => {
        c.classList.toggle('active', c.dataset.filter === currentCategory);
      });
    }

    const continentSelect = document.getElementById('continentSelect');
    if (continentSelect && continent !== undefined) {
      continentSelect.value = continent;
    }

    applyFilters();
  }

  return {
    init: init,
    applyFilters: applyFilters,
    setFilter: setFilter
  };
})();
