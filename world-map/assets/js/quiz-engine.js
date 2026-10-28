/**
 * World Mapping Atlas — UPSC CSE Map Identification Quiz Engine (Revamped)
 * 1. Pinned location pulses on the 2D vector map at close zoom with label hidden.
 * 2. User observes the pin and identifies the feature from 4 distinct, plausible options.
 * 3. Minimized top bar: When quiz starts, heavy dropdowns collapse into a sleek, 1-line
 *    summary bar to keep 100% focus on the question and map.
 * 4. Human-grammatical questions for all categories (Ocean Currents, Local Winds, Parks, Rivers, etc.).
 * 5. Immediate feedback reveals the label on the map, displays UPSC relevance, and advances.
 * 6. Keyboard navigation: A, B, C, D (or 1, 2, 3, 4) to answer; Enter to advance.
 */

window.WORLD_QUIZ = (function () {
  'use strict';

  let currentDeck = [];
  let currentIndex = 0;
  let score = 0;
  let answered = false;
  let activeQuestion = null;
  let missedItems = [];
  let keyboardHandlerAttached = false;
  let userOverriddenFilters = false;
  let evidenceMode = false;

  const allCategoryKeys = [
    'national_park', 'tiger_reserve', 'biosphere_reserve', 'ramsar_site',
    'river', 'mountain', 'peak', 'pass', 'glacier', 'states',
    'current', 'wind', 'country', 'lake', 'desert', 'grassland', 'strait'
  ];

  const categoryNames = {
    national_park: 'National Parks',
    tiger_reserve: 'Tiger Reserves',
    biosphere_reserve: 'Biosphere Reserves',
    ramsar_site: 'Ramsar Sites',
    river: 'Rivers',
    mountain: 'Mountain Ranges',
    peak: 'Peaks',
    pass: 'Passes',
    glacier: 'Glaciers',
    states: 'States & UTs',
    current: 'Ocean Currents',
    wind: 'Local Winds',
    country: 'Countries',
    lake: 'Lakes',
    desert: 'Deserts',
    grassland: 'Grasslands',
    strait: 'Straits'
  };

  const selectedTypes = new Set(allCategoryKeys);

  function init() {
    const startBtn = document.getElementById('startQuiz');
    const continentSelect = document.getElementById('quizContinent');
    const toggleFiltersBtn = document.getElementById('quizConfigToggleBtn') || document.getElementById('btnToggleQuizFilters');

    if (startBtn) {
      startBtn.addEventListener('click', () => startQuiz());
    }
    if (continentSelect) {
      continentSelect.addEventListener('change', () => {
        updateConfigSummary();
      });
    }
    if (toggleFiltersBtn) {
      toggleFiltersBtn.addEventListener('click', () => toggleFiltersDrawer());
    }

    initTypeMultiSelect();
    attachKeyboardShortcuts();
  }

  function initTypeMultiSelect() {
    const triggerBtn = document.getElementById('quizTypeBtn');
    const menuEl = document.getElementById('quizTypeMenu');
    if (!triggerBtn || !menuEl) return;

    triggerBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isHidden = menuEl.classList.toggle('hidden');
      triggerBtn.setAttribute('aria-expanded', !isHidden);
    });

    document.addEventListener('click', (e) => {
      if (!menuEl.contains(e.target) && !triggerBtn.contains(e.target)) {
        menuEl.classList.add('hidden');
        triggerBtn.setAttribute('aria-expanded', 'false');
      }
    });

    // Checkbox toggles
    menuEl.querySelectorAll('.quiz-type-chk').forEach(chk => {
      chk.addEventListener('change', () => {
        userOverriddenFilters = true;
        const type = chk.dataset.type;
        if (chk.checked) selectedTypes.add(type);
        else selectedTypes.delete(type);
        updateTypeUI();
      });
    });

    // Quick Action Pills
    menuEl.querySelectorAll('.quick-pill-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        userOverriddenFilters = true;
        const action = btn.dataset.action;
        const chks = menuEl.querySelectorAll('.quiz-type-chk');
        if (action === 'all') {
          chks.forEach(c => { c.checked = true; selectedTypes.add(c.dataset.type); });
        } else if (action === 'india') {
          chks.forEach(c => {
            const isInd = c.dataset.group === 'india';
            c.checked = isInd;
            if (isInd) selectedTypes.add(c.dataset.type);
            else selectedTypes.delete(c.dataset.type);
          });
        } else if (action === 'world') {
          chks.forEach(c => {
            const isWld = c.dataset.group === 'world';
            c.checked = isWld;
            if (isWld) selectedTypes.add(c.dataset.type);
            else selectedTypes.delete(c.dataset.type);
          });
        } else if (action === 'clear') {
          chks.forEach(c => { c.checked = false; selectedTypes.delete(c.dataset.type); });
        }
        updateTypeUI();
      });
    });

    // Group header select buttons
    menuEl.querySelectorAll('.group-select-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        userOverriddenFilters = true;
        const grp = btn.dataset.group;
        const grpChks = menuEl.querySelectorAll(`.quiz-type-chk[data-group="${grp}"]`);
        const allChecked = Array.from(grpChks).every(c => c.checked);
        grpChks.forEach(c => {
          c.checked = !allChecked;
          if (!allChecked) selectedTypes.add(c.dataset.type);
          else selectedTypes.delete(c.dataset.type);
        });
        updateTypeUI();
      });
    });

    // "only" buttons per type (isolate single item alone)
    menuEl.querySelectorAll('.item-only-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        userOverriddenFilters = true;
        const targetType = btn.dataset.type;
        selectedTypes.clear();
        menuEl.querySelectorAll('.quiz-type-chk').forEach(c => {
          const isMatch = (c.dataset.type === targetType);
          c.checked = isMatch;
          if (isMatch) selectedTypes.add(targetType);
        });
        updateTypeUI();
      });
    });

    syncWithActiveKinds(true);
  }

  function syncWithActiveKinds(force = false) {
    if (userOverriddenFilters && !force) return;
    if (!window.WORLD_VECTOR_MAP || !window.WORLD_VECTOR_MAP.getActiveFilters) return;

    const activeMapFilters = window.WORLD_VECTOR_MAP.getActiveFilters();
    selectedTypes.clear();

    const menuEl = document.getElementById('quizTypeMenu');
    if (menuEl) {
      menuEl.querySelectorAll('.quiz-type-chk').forEach(chk => {
        const type = chk.dataset.type;
        const isActive = Boolean(activeMapFilters[type]);
        chk.checked = isActive;
        if (isActive) selectedTypes.add(type);
      });
    } else {
      allCategoryKeys.forEach(k => {
        if (activeMapFilters[k]) selectedTypes.add(k);
      });
    }

    updateTypeUI();
  }

  function updateTypeUI() {
    const labelEl = document.getElementById('quizTypeLabel');
    const badgeEl = document.getElementById('quizTypeBadge');
    if (!labelEl || !badgeEl) return;

    if (selectedTypes.size === 0) {
      labelEl.textContent = 'None selected';
      badgeEl.textContent = '0';
    } else if (selectedTypes.size === allCategoryKeys.length) {
      labelEl.textContent = 'All Types';
      badgeEl.textContent = 'All';
    } else if (selectedTypes.size <= 2) {
      const names = Array.from(selectedTypes).map(k => categoryNames[k] || k).join(', ');
      labelEl.textContent = names;
      badgeEl.textContent = `${selectedTypes.size}`;
    } else {
      labelEl.textContent = `${selectedTypes.size} types selected`;
      badgeEl.textContent = `${selectedTypes.size}`;
    }

    updateConfigSummary();
  }

  function updateConfigSummary() {
    const regEl = document.getElementById('quizSummaryRegion');
    const typEl = document.getElementById('quizSummaryTypes');
    const styEl = document.getElementById('quizSummaryStyle');
    const continentSelect = document.getElementById('quizContinent');
    const styleSelect = document.getElementById('quizStyle');

    const reg = continentSelect ? continentSelect.value.trim() : '';
    if (regEl) regEl.textContent = reg ? (reg === 'India' ? '🇮🇳 India' : reg) : '🌐 All Continents';
    if (typEl) typEl.textContent = selectedTypes.size === allCategoryKeys.length ? 'All Types' : `${selectedTypes.size} Types`;
    if (styEl) {
      const styVal = styleSelect ? styleSelect.value : 'mcq';
      styEl.textContent = styVal === 'mcq' ? 'MCQ' : (styVal === 'map' ? 'Map Pin' : 'Mixed');
    }
  }

  function toggleFiltersDrawer(forceOpen = null) {
    const drawer = document.getElementById('quizFiltersDrawer');
    const toggleText = document.getElementById('quizToggleText');
    const toggleBtn = document.getElementById('quizConfigToggleBtn') || document.getElementById('btnToggleQuizFilters');
    if (!drawer) return;

    const shouldCollapse = forceOpen !== null ? !forceOpen : !drawer.classList.contains('collapsed');
    if (shouldCollapse) {
      drawer.classList.add('collapsed');
      if (toggleText) toggleText.textContent = 'Edit Filters';
      if (toggleBtn) {
        toggleBtn.classList.remove('active');
        toggleBtn.innerHTML = '⚙ Filters';
      }
    } else {
      drawer.classList.remove('collapsed');
      if (toggleText) toggleText.textContent = 'Hide Filters';
      if (toggleBtn) {
        toggleBtn.classList.add('active');
        toggleBtn.innerHTML = '✕ Close';
      }
    }
  }

  function startQuiz(retryDeck = null) {
    if (!window.DATA_INTEGRITY) return;
    evidenceMode = document.getElementById('quizStyle')?.value === 'evidence';

    if (!userOverriddenFilters) {
      syncWithActiveKinds(false);
    }

    if (Array.isArray(retryDeck) && retryDeck.length > 0) {
      currentDeck = shuffleArray(retryDeck);
    } else {
      const continentSelect = document.getElementById('quizContinent');
      const continentVal = continentSelect ? continentSelect.value.trim() : '';

      let pool = window.DATA_INTEGRITY.getAll();
      if (window.SE7EN) pool = window.SE7EN.filterEntities(pool);
      if (evidenceMode) pool = pool.filter(e => window.SE7EN?.hasVerifiedQuestions(e));

      // Region Filter
      if (continentVal === 'India') {
        pool = pool.filter(e => e.group === 'india' || e.state || e.continent === 'India');
      } else if (continentVal) {
        pool = pool.filter(e => e.continent === continentVal);
      }

      // Grouped Multi-Type Selection Filter
      if (selectedTypes.size > 0 && selectedTypes.size < allCategoryKeys.length) {
        pool = pool.filter(e => {
          const cat = e.category || e.type;
          return selectedTypes.has(cat);
        });
      } else if (selectedTypes.size === 0) {
        pool = [];
      }

      if (pool.length === 0) {
        const cardEl = document.getElementById('quizCard');
        if (cardEl) {
          cardEl.innerHTML = `
            <div class="empty-state">
              <div class="empty-title">No Features Found</div>
              <p class="empty-desc">${evidenceMode ? 'No source-linked questions are ready for these filters yet. Unreviewed facts are excluded from this question bank.' : 'No features match these filters. Select another region or type.'}</p>
            </div>
          `;
        }
        toggleFiltersDrawer(true);
        return;
      }

      currentDeck = shuffleArray(pool);
    }

    currentIndex = 0;
    score = 0;
    missedItems = [];
    answered = false;

    // Minimize filter dropdowns to focus 100% on Question + Map
    updateConfigSummary();
    const configBar = document.getElementById('quizConfigBar');
    if (configBar) configBar.classList.remove('hidden');
    toggleFiltersDrawer(false);

    renderQuestion();
  }

  function getQuestionPrompt(entity) {
    const cat = entity.category || entity.type;
    switch (cat) {
      case 'current':
        return 'Which ocean current flows along this highlighted path?';
      case 'wind':
        return 'Which local wind blows across this highlighted region?';
      case 'national_park':
        return 'Which National Park is located at this pinned location?';
      case 'tiger_reserve':
        return 'Which Tiger Reserve is located at this pinned location?';
      case 'biosphere_reserve':
        return 'Which Biosphere Reserve is located here?';
      case 'ramsar_site':
        return 'Which Ramsar Wetland Site is located here?';
      case 'river':
        return 'Which river flows along this highlighted course?';
      case 'mountain':
        return 'Which mountain range is outlined here?';
      case 'peak':
        return 'Which prominent summit is located at this peak?';
      case 'pass':
        return 'Which mountain pass traverses this location?';
      case 'glacier':
        return 'Which glacier is located at these coordinates?';
      case 'states':
        return 'Which Indian State / UT is highlighted here?';
      case 'country':
        return 'Which country is outlined on the map?';
      case 'lake':
        return 'Which lake or inland water body is located here?';
      case 'desert':
        return 'Which desert or arid region is located here?';
      case 'grassland':
        return 'Which grassland or savanna plateau is located here?';
      case 'strait':
        return 'Which strait or maritime passage is located here?';
      default:
        return `What is the name of this ${(categoryNames[cat] || cat || 'feature')}?`;
    }
  }

  function renderQuestion() {
    const cardEl = document.getElementById('quizCard');
    const scoreEl = document.getElementById('quizScore');
    const fillEl = document.getElementById('quizFill');
    if (!cardEl) return;

    if (currentIndex >= currentDeck.length) {
      renderSummary();
      return;
    }

    answered = false;
    const targetEntity = currentDeck[currentIndex];
    activeQuestion = evidenceMode ? window.SE7EN.getVerifiedQuestion(targetEntity) : generateQuestion(targetEntity);
    if (!activeQuestion) { currentIndex++; renderQuestion(); return; }

    // Update Header
    if (scoreEl) {
      scoreEl.textContent = `Score: ${score}/${currentIndex} · Question ${currentIndex + 1} of ${currentDeck.length}`;
    }
    if (fillEl) {
      fillEl.style.width = `${((currentIndex) / currentDeck.length) * 100}%`;
    }

    // Pin location on 2D Vector Map
    if (window.WORLD_VECTOR_MAP && window.WORLD_VECTOR_MAP.setQuizTarget) {
      if (evidenceMode) window.WORLD_VECTOR_MAP.clearQuizTarget();
      else window.WORLD_VECTOR_MAP.setQuizTarget(targetEntity);
    } else if (window.WORLD_FLAT_MAP && window.WORLD_FLAT_MAP.setQuizTarget) {
      window.WORLD_FLAT_MAP.setQuizTarget(targetEntity.id);
    }

    const catName = categoryNames[targetEntity.category] || (targetEntity.categoryName || targetEntity.category).toUpperCase();
    const subLocation = evidenceMode ? '' : targetEntity.region || targetEntity.state || targetEntity.continent || '';

    // Render Question Card
    cardEl.innerHTML = `
      <div class="quiz-active-container">
        <!-- Top Tags Row -->
        <div class="detail-top-tags">
          <span class="category-pill" style="border-color:var(--accent2); color:var(--accent2);">
            ${escapeHtml(catName)}
          </span>
          ${subLocation ? `
            <span class="continent-pill">
              ${escapeHtml(subLocation)}
            </span>
          ` : ''}
        </div>

        <!-- Prompt Heading -->
        <div class="quiz-prompt-header">
          <span class="quiz-step-tag">${escapeHtml(evidenceMode ? activeQuestion.format : 'Observe Pinned Location on Map')}</span>
          <h2 class="quiz-question-title">${escapeHtml(evidenceMode ? activeQuestion.prompt : getQuestionPrompt(targetEntity))}</h2>
        </div>

        <!-- 4 Options -->
        <div class="quiz-options-grid" id="quizOptionsGrid">
          ${activeQuestion.options.map((opt, i) => `
            <button type="button" class="quiz-opt-btn" data-index="${i}" tabindex="0">
              <span class="opt-badge">${String.fromCharCode(65 + i)}</span>
              <span class="opt-text">${escapeHtml(opt)}</span>
            </button>
          `).join('')}
        </div>

        <!-- Feedback section (revealed on answer) -->
        <div class="quiz-feedback-box hidden" id="quizFeedbackBox"></div>
      </div>
    `;

    // Hook option buttons
    cardEl.querySelectorAll('.quiz-opt-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (answered) return;
        handleAnswer(parseInt(btn.dataset.index, 10));
      });
    });
  }

  function handleAnswer(selectedIndex) {
    if (answered) return;
    answered = true;

    const isCorrect = selectedIndex === activeQuestion.correctIndex;
    if (isCorrect) {
      score++;
    } else {
      missedItems.push(currentDeck[currentIndex]);
    }

    // Update Score display
    const scoreEl = document.getElementById('quizScore');
    const fillEl = document.getElementById('quizFill');
    if (scoreEl) {
      scoreEl.textContent = `Score: ${score}/${currentIndex + 1} · Question ${currentIndex + 1} of ${currentDeck.length}`;
    }
    if (fillEl) {
      fillEl.style.width = `${((currentIndex + 1) / currentDeck.length) * 100}%`;
    }

    // Reveal answer on 2D Vector Map
    if (window.WORLD_VECTOR_MAP && window.WORLD_VECTOR_MAP.revealQuizAnswer) {
      window.WORLD_VECTOR_MAP.revealQuizAnswer(activeQuestion.target.id);
    } else if (window.WORLD_FLAT_MAP && window.WORLD_FLAT_MAP.revealQuizAnswer) {
      window.WORLD_FLAT_MAP.revealQuizAnswer(activeQuestion.target.id, isCorrect);
    }

    // Style option buttons (green correct, red wrong)
    const optButtons = document.querySelectorAll('.quiz-opt-btn');
    optButtons.forEach((btn, i) => {
      btn.disabled = true;
      if (i === activeQuestion.correctIndex) {
        btn.classList.add('btn-correct');
      } else if (i === selectedIndex && !isCorrect) {
        btn.classList.add('btn-wrong');
      }
    });

    // Reveal Feedback & UPSC Explanation
    const feedbackEl = document.getElementById('quizFeedbackBox');
    if (feedbackEl) {
      feedbackEl.classList.remove('hidden');
      const isLast = currentIndex === currentDeck.length - 1;

      feedbackEl.innerHTML = `
        <div class="feedback-card ${isCorrect ? 'status-correct' : 'status-wrong'}">
          <div class="feedback-header">
            <span class="feedback-badge">${isCorrect ? '✓ Correct' : '✗ Not quite'}</span>
            <span class="correct-name">${escapeHtml(activeQuestion.target.name)}</span>
          </div>
          <p class="feedback-text">${escapeHtml(activeQuestion.explanation)}</p>
          ${(activeQuestion.sources || []).filter(url => /^https?:\/\//.test(url)).map((url,i)=>`<a href="${escapeHtml(url)}" target="_blank" rel="noopener">Reference ${i+1} ↗</a>`).join(' · ')}
          <button type="button" class="primary-btn feedback-next-btn" id="btnNextQuiz">
            ${isLast ? 'Complete Round →' : 'Next Question →'}
          </button>
        </div>
      `;

      const nextBtn = feedbackEl.querySelector('#btnNextQuiz');
      if (nextBtn) {
        nextBtn.focus();
        nextBtn.addEventListener('click', () => {
          currentIndex++;
          renderQuestion();
        });
      }
    }
  }

  function renderSummary() {
    const cardEl = document.getElementById('quizCard');
    const fillEl = document.getElementById('quizFill');
    if (!cardEl) return;

    if (fillEl) fillEl.style.width = '100%';

    if (window.WORLD_VECTOR_MAP && window.WORLD_VECTOR_MAP.clearQuizTarget) {
      window.WORLD_VECTOR_MAP.clearQuizTarget();
    }

    const pct = Math.round((score / currentDeck.length) * 100);

    cardEl.innerHTML = `
      <div class="quiz-summary-card">
        <h2 class="summary-title">Round Complete</h2>
        <div class="summary-score-big">${pct}%</div>
        <p class="summary-desc">You correctly identified ${score} out of ${currentDeck.length} features.</p>
        <div class="summary-actions">
          <button type="button" class="primary-btn" id="btnRestartQuiz">Practice Again</button>
          ${missedItems.length > 0 ? `<button type="button" class="secondary-btn" id="btnRetryMissed">Retry Missed (${missedItems.length})</button>` : ''}
          <button type="button" class="secondary-btn" id="btnChangeSettings">Change Filters</button>
        </div>
      </div>
    `;

    cardEl.querySelector('#btnRestartQuiz').addEventListener('click', () => startQuiz());
    const retryBtn = cardEl.querySelector('#btnRetryMissed');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => startQuiz(missedItems));
    }
    const changeBtn = cardEl.querySelector('#btnChangeSettings');
    if (changeBtn) {
      changeBtn.addEventListener('click', () => toggleFiltersDrawer(true));
    }
  }

  function generateQuestion(targetEntity) {
    const all = window.DATA_INTEGRITY.getAll();

    // 1. Same category distractors
    let pool = all.filter(e => e.id !== targetEntity.id && e.category === targetEntity.category);

    // 2. If not enough in category, add same continent
    if (pool.length < 3) {
      const more = all.filter(e => e.id !== targetEntity.id && e.continent === targetEntity.continent && !pool.includes(e));
      pool = pool.concat(more);
    }

    // 3. Fallback anywhere
    if (pool.length < 3) {
      const anywhere = all.filter(e => e.id !== targetEntity.id && !pool.includes(e));
      pool = pool.concat(anywhere);
    }

    // Deduplicate distractor names
    const distractorNames = Array.from(new Set(shuffleArray(pool).map(e => e.name)))
      .filter(n => n !== targetEntity.name)
      .slice(0, 3);

    const options = shuffleArray([targetEntity.name, ...distractorNames]);
    const correctIndex = options.indexOf(targetEntity.name);

    let explanation = targetEntity.description || '';
    if (targetEntity.nature) {
      explanation += ` · Nature: ${targetEntity.nature}`;
    }
    if (targetEntity.effect) {
      explanation += ` · Effect: ${targetEntity.effect}`;
    }
    if (targetEntity.upscNotes) {
      explanation += ` · ${targetEntity.upscNotes}`;
    }

    return {
      target: targetEntity,
      options: options,
      correctIndex: correctIndex,
      explanation: explanation
    };
  }

  function attachKeyboardShortcuts() {
    if (keyboardHandlerAttached) return;
    keyboardHandlerAttached = true;

    window.addEventListener('keydown', (e) => {
      if (e.target.closest('input,select,textarea,[contenteditable="true"]')) return;
      const quizPanel = document.getElementById('quizPanel');
      if (!quizPanel || quizPanel.classList.contains('hidden')) return;

      // When answered, pressing Enter or Space advances
      if (answered) {
        if (e.key === 'Enter' || e.key === ' ') {
          const nextBtn = document.getElementById('btnNextQuiz');
          if (nextBtn) {
            e.preventDefault();
            nextBtn.click();
          }
        }
        return;
      }

      // Keys 1/2/3/4 or A/B/C/D select options
      const key = e.key.toUpperCase();
      let optIdx = -1;
      if (key === 'A' || key === '1') optIdx = 0;
      else if (key === 'B' || key === '2') optIdx = 1;
      else if (key === 'C' || key === '3') optIdx = 2;
      else if (key === 'D' || key === '4') optIdx = 3;

      if (optIdx >= 0 && activeQuestion && optIdx < activeQuestion.options.length) {
        e.preventDefault();
        handleAnswer(optIdx);
      }
    });
  }

  function shuffleArray(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  return {
    init: init,
    startQuiz: startQuiz,
    toggleFiltersDrawer: toggleFiltersDrawer,
    syncWithActiveKinds: syncWithActiveKinds
  };
})();
