(function () {
  const app = document.getElementById('app');
  const state = { page: 'match', result: null, history: [], loading: false, error: '' };

  function scoreColor(score) {
    if (score >= 80) return 'text-primary';
    if (score >= 60) return 'text-tertiary-container';
    return 'text-error';
  }

  function progressColor(score) {
    if (score >= 80) return 'bg-primary';
    if (score >= 60) return 'bg-tertiary-container';
    return 'bg-error';
  }

  function setPage(page) {
    state.page = page;
    render();
  }

  async function loadHistory() {
    try {
      const response = await fetch('/api/v1/analyses');
      if (!response.ok) throw new Error('Failed to load history');
      state.history = await response.json();
      render();
    } catch (error) {
      state.error = error.message;
      render();
    }
  }

  async function openAnalysis(id) {
    try {
      const response = await fetch('/api/v1/analyses/' + id);
      if (!response.ok) throw new Error('Failed to load analysis');
      state.result = await response.json();
      state.page = 'result';
      render();
    } catch (error) {
      state.error = error.message;
      render();
    }
  }

  async function submitAnalysis(form) {
    state.loading = true;
    state.error = '';
    render();

    const resumeText = form.querySelector('[name="resume_text"]').value.trim();
    const jobDescription = form.querySelector('[name="job_description"]').value.trim();
    const targetRole = form.querySelector('[name="target_role"]').value.trim();
    const file = form.querySelector('[name="resume_pdf"]').files[0];

    try {
      let response;
      if (file) {
        const payload = new FormData();
        payload.append('resume_pdf', file);
        payload.append('job_description', jobDescription);
        payload.append('target_role', targetRole);
        response = await fetch('/api/v1/analyze/pdf', { method: 'POST', body: payload });
      } else {
        response = await fetch('/api/v1/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            resume_text: resumeText,
            job_description: jobDescription,
            target_role: targetRole
          })
        });
      }

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to analyze');

      state.result = data;
      state.page = 'result';
      state.loading = false;
      render();
    } catch (error) {
      state.error = error.message;
      state.loading = false;
      render();
    }
  }

  function matchPage() {
    return `
      <div class="space-y-10">
        <header class="text-center space-y-4 max-w-3xl mx-auto">
          <span class="text-primary font-semibold text-xs tracking-widest uppercase">RAGFlow Match Engine</span>
          <h1 class="text-[2.75rem] leading-tight font-bold tracking-tight">Understand how your resume <span class="text-primary italic">matches</span> real jobs</h1>
          <p class="text-on-surface-variant text-lg leading-relaxed">Semantic and contextual analysis with deterministic explanations and optional LLM synthesis.</p>
        </header>

        ${state.error ? `<div class="bg-error-container text-on-error-container rounded-xl p-4 font-medium">${state.error}</div>` : ''}

        <form id="match-form" class="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div class="lg:col-span-7 space-y-8">
            <label class="bg-surface-container-low rounded-xl p-8 group transition-all block">
              <span class="block text-sm font-semibold mb-4">Resume Context</span>
              <input type="file" name="resume_pdf" accept=".pdf" class="hidden" />
              <span class="border-2 border-dashed border-outline-variant/30 rounded-lg p-12 flex flex-col items-center justify-center bg-surface-container-lowest group-hover:bg-primary/5 transition-colors cursor-pointer">
                <span class="material-symbols-outlined text-4xl text-primary/40 mb-4">upload_file</span>
                <span class="text-sm text-on-surface-variant text-center"><span class="text-primary font-semibold">Click to upload</span> or drag and drop<br /><span class="text-xs opacity-60">PDF up to 8MB</span></span>
              </span>
            </label>

            <div class="bg-surface-container-low rounded-xl p-8">
              <label class="block text-sm font-semibold mb-4">Resume Text</label>
              <textarea name="resume_text" class="w-full h-56 bg-surface-container-lowest rounded-lg border-none focus:ring-2 focus:ring-primary/20 p-4 resize-none" placeholder="Paste your resume text..."></textarea>
            </div>

            <div class="bg-surface-container-low rounded-xl p-8">
              <label class="block text-sm font-semibold mb-4">Job Description</label>
              <textarea name="job_description" class="w-full h-64 bg-surface-container-lowest rounded-lg border-none focus:ring-2 focus:ring-primary/20 p-4 resize-none" placeholder="Paste target job description..."></textarea>
            </div>
          </div>

          <div class="lg:col-span-5 space-y-8">
            <div class="bg-surface-container-lowest rounded-xl p-8 shadow-sm">
              <h3 class="text-base font-bold mb-6 flex items-center gap-2"><span class="material-symbols-outlined text-primary">target</span>Strategy Parameters</h3>
              <label class="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-2">Target Role</label>
              <input name="target_role" class="w-full bg-surface-container-low border-none rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20" placeholder="e.g. Senior Product Designer" />
            </div>

            <div class="bg-primary/5 rounded-xl p-8 border border-primary/10">
              <h4 class="text-sm font-bold text-primary mb-2 flex items-center gap-2"><span class="material-symbols-outlined text-sm">auto_awesome</span>Analysis Preview</h4>
              <p class="text-xs text-on-surface-variant leading-relaxed">RAGFlow will generate match score, weighted score, skill breakdown, gaps, insights and study plan.</p>
            </div>

            <button ${state.loading ? 'disabled' : ''} class="w-full bg-gradient-to-br from-primary to-primary-container text-white py-5 rounded-xl font-bold text-lg shadow-xl shadow-primary/20 disabled:opacity-50">
              ${state.loading ? 'Running analysis...' : 'Run Career Analysis'}
            </button>
          </div>
        </form>
      </div>
    `;
  }

  function resultPage() {
    if (!state.result) {
      return `
        <div class="bg-surface-container-lowest rounded-xl p-10 text-center">
          <h2 class="text-2xl font-bold mb-2">No result yet</h2>
          <p class="text-on-surface-variant mb-6">Run a match analysis first.</p>
          <button id="go-match" class="px-6 py-3 bg-primary text-white rounded-lg font-semibold">Go to Match Analysis</button>
        </div>
      `;
    }

    const r = state.result;
    const circ = Math.round(553 - (Math.max(0, Math.min(100, r.weightedMatchScore || 0)) / 100) * 553);

    return `
      <div class="space-y-8">
        <section class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div class="lg:col-span-2 bg-surface-container-lowest p-8 rounded-xl shadow-sm flex flex-col md:flex-row items-center justify-between relative overflow-hidden">
            <div class="space-y-4 max-w-xl">
              <span class="inline-block px-3 py-1 bg-primary-fixed text-on-primary-fixed text-xs font-bold rounded-full uppercase tracking-widest">Career Result</span>
              <h2 class="text-4xl font-extrabold leading-tight">Match Quality Assessment</h2>
              <p class="text-on-surface-variant">${r.synthesizedSummary || 'Deterministic match generated from resume-job semantic alignment.'}</p>
              <a href="/api/v1/analyses/${r.analysisId}/report" target="_blank" class="inline-block px-6 py-3 bg-gradient-to-r from-primary to-primary-container text-white font-bold rounded-lg">Download Report</a>
            </div>
            <div class="relative mt-8 md:mt-0">
              <svg class="w-48 h-48 transform -rotate-90">
                <circle class="text-surface-container-highest/40" cx="96" cy="96" fill="transparent" r="88" stroke="currentColor" stroke-width="12"></circle>
                <circle class="text-primary" cx="96" cy="96" fill="transparent" r="88" stroke="currentColor" stroke-dasharray="553" stroke-dashoffset="${circ}" stroke-linecap="round" stroke-width="12"></circle>
              </svg>
              <div class="absolute inset-0 flex flex-col items-center justify-center">
                <span class="text-5xl font-black">${r.weightedMatchScore || 0}%</span>
                <span class="text-sm font-bold text-on-surface-variant uppercase tracking-tighter">Weighted Match</span>
              </div>
            </div>
          </div>

          <div class="bg-gradient-to-br from-primary to-primary-container p-8 rounded-xl text-white flex flex-col justify-between">
            <div>
              <h3 class="font-bold text-lg flex items-center gap-2 mb-3"><span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1">auto_awesome</span>AI Strategic Insight</h3>
              <p class="text-primary-fixed">Provider: ${(r.llm && r.llm.provider) || 'none'} | Model: ${(r.llm && r.llm.model) || 'none'}</p>
            </div>
          </div>
        </section>

        <section class="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div class="lg:col-span-3 bg-surface-container-low p-8 rounded-xl space-y-5">
            <div class="flex justify-between items-end"><h3 class="text-xl font-bold">Skill Match Visualization</h3><span class="text-xs font-bold text-on-surface-variant">DETALHADO</span></div>
            ${(r.skillBreakdown || []).slice(0, 6).map((item) => {
              const val = item.presentInResume ? Math.round((item.weight || 1) * 100) : 20;
              return `
                <div class="space-y-2">
                  <div class="flex justify-between text-sm font-semibold"><span>${item.skill}</span><span class="${scoreColor(val)}">${item.presentInResume ? 'present' : 'gap'}</span></div>
                  <div class="h-3 bg-surface-container-highest/40 rounded-full overflow-hidden"><div class="h-full ${progressColor(val)} rounded-full" style="width:${val}%"></div></div>
                </div>
              `;
            }).join('')}
          </div>

          <div class="lg:col-span-2 bg-surface-container-lowest p-8 rounded-xl space-y-4 shadow-sm">
            <h3 class="text-xl font-bold flex items-center gap-2"><span class="material-symbols-outlined text-tertiary-container">warning</span>Gap Skills</h3>
            ${(r.missingSkills || []).length
              ? (r.missingSkills || []).map((skill) => `<div class="p-4 bg-surface-container-low rounded-lg border-l-4 border-tertiary-container"><h4 class="font-bold text-sm">${skill}</h4></div>`).join('')
              : '<p class="text-sm text-on-surface-variant">No relevant skill gaps detected.</p>'}
          </div>
        </section>

        <section class="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div class="lg:col-span-4 bg-surface-container-lowest p-8 rounded-xl shadow-sm">
            <h3 class="text-xl font-bold mb-6">Study Plan Timeline</h3>
            <div class="space-y-4">
              ${(r.studyPlan || []).map((week) => `<div class="p-4 bg-surface-container-low rounded-lg"><h4 class="text-sm font-bold">Week ${week.week}: ${week.focus}</h4><p class="text-xs text-on-surface-variant mt-1">${(week.actions || []).slice(0,1).join('')}</p></div>`).join('')}
            </div>
          </div>
          <div class="lg:col-span-8 bg-surface-container-lowest p-8 rounded-xl shadow-sm">
            <h3 class="text-xl font-bold mb-6">Resume Optimization Suggestions</h3>
            <ul class="space-y-3">
              ${(r.resumeOptimizationSuggestions || []).map((item) => `<li class="flex gap-3"><span class="material-symbols-outlined text-primary">check_circle</span><span class="text-sm">${item}</span></li>`).join('')}
            </ul>
          </div>
        </section>
      </div>
    `;
  }

  function historyPage() {
    const rows = state.history
      .map((item) => {
        const date = new Date(item.createdAt).toLocaleDateString();
        return `
          <button data-open="${item.analysisId}" class="w-full flex flex-col md:flex-row items-center justify-between p-6 bg-surface-container-lowest rounded-xl hover:bg-surface-container-low transition-all text-left">
            <div class="flex items-center gap-5 w-full md:w-auto">
              <div class="w-12 h-12 rounded-lg bg-primary-fixed flex items-center justify-center text-primary"><span class="material-symbols-outlined">description</span></div>
              <div><h3 class="font-semibold leading-tight">${item.targetRole || 'Untitled Analysis'}</h3><p class="text-sm text-on-surface-variant/70 mt-0.5">${item.analysisId}</p></div>
            </div>
            <div class="flex items-center justify-between w-full md:w-auto mt-4 md:mt-0 gap-10">
              <div class="text-right"><span class="text-xs uppercase tracking-widest text-on-surface-variant font-bold block mb-1">Weighted</span><span class="text-xl font-bold ${scoreColor(item.weightedMatchScore || 0)}">${item.weightedMatchScore || 0}%</span></div>
              <div class="text-right"><span class="text-xs uppercase tracking-widest text-on-surface-variant font-bold block mb-1">Date</span><span class="text-sm font-medium">${date}</span></div>
            </div>
          </button>
        `;
      })
      .join('');

    return `
      <div class="space-y-8">
        <header>
          <h1 class="text-[2.75rem] font-semibold tracking-tight leading-tight mb-2">History</h1>
          <p class="text-on-surface-variant text-lg max-w-2xl leading-relaxed">Review your past intelligent matching analyses.</p>
        </header>

        ${state.error ? `<div class="bg-error-container text-on-error-container rounded-xl p-4 font-medium">${state.error}</div>` : ''}

        <div class="space-y-4">${rows || '<div class="bg-surface-container-lowest rounded-xl p-8 text-on-surface-variant">No analyses yet.</div>'}</div>
      </div>
    `;
  }

  function bindActions() {
    document.querySelectorAll('[data-nav]').forEach((node) => {
      node.addEventListener('click', () => {
        const page = node.getAttribute('data-nav');
        if (page === 'history') loadHistory();
        setPage(page);
      });
    });

    const form = document.getElementById('match-form');
    if (form) {
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        submitAnalysis(form);
      });
    }

    document.querySelectorAll('[data-open]').forEach((node) => {
      node.addEventListener('click', () => openAnalysis(node.getAttribute('data-open')));
    });

    const newAnalysis = document.getElementById('new-analysis');
    if (newAnalysis) newAnalysis.addEventListener('click', () => setPage('match'));

    const goMatch = document.getElementById('go-match');
    if (goMatch) goMatch.addEventListener('click', () => setPage('match'));

    const translateBtn = document.getElementById('translate-btn');
    if (translateBtn && !translateBtn.dataset.bound) {
      translateBtn.dataset.bound = '1';
      translateBtn.addEventListener('click', () => {
        const url = encodeURIComponent(window.location.href);
        window.open(`https://translate.google.com/translate?sl=auto&tl=en&u=${url}`, '_blank');
      });
    }
  }

  function render() {
    if (state.page === 'match') app.innerHTML = matchPage();
    if (state.page === 'result') app.innerHTML = resultPage();
    if (state.page === 'history') app.innerHTML = historyPage();
    bindActions();
  }

  render();
})();
