/* Composites Field School — shared frame engine.
   Owns: panel nav (dots/counter/progress/back-next), the quiz renderer,
   progress storage, and reusable interaction widgets (ordering game,
   matching game, video grid) plus the floating study-assistant chatbot.
   Per-module bespoke widget JS stays inline in each module file. */
(function (global) {
  'use strict';

  var PROGRESS_KEY = 'cfs.progress';

  function getProgress() {
    try {
      return JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}');
    } catch (e) { return {}; }
  }
  function setProgress(p) {
    try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(p)); } catch (e) {}
  }
  function markComplete(moduleId) {
    if (!moduleId) return;
    var p = getProgress();
    var wasComplete = p[moduleId] === 'complete';
    p[moduleId] = 'complete';
    setProgress(p);
    if (!wasComplete) {
      var label = (typeof MODULE_LABELS !== 'undefined' && MODULE_LABELS[moduleId]) || moduleId;
      pushNotification((moduleId === 'module-14' ? label + ' finished — full practice exam complete.' : label + ' complete. Nice work.'), 'complete');
    }
  }
  function moduleStatus(moduleId) {
    var p = getProgress();
    return p[moduleId] || 'not-started';
  }

  /* ---------------- quiz score ledger ----------------
     Separate from cfs.progress (which is just complete/incomplete).
     Powers the dashboard's Grades tab and progress ring with real
     per-module scores instead of a flat "done" flag. */
  var SCORES_KEY = 'cfs.scores';
  function getScores() {
    try { return JSON.parse(localStorage.getItem(SCORES_KEY) || '{}'); } catch (e) { return {}; }
  }
  function setScores(s) {
    try { localStorage.setItem(SCORES_KEY, JSON.stringify(s)); } catch (e) {}
  }
  function recordScore(moduleId, correct, total) {
    if (!moduleId || !total) return;
    var s = getScores();
    var pct = Math.round((correct / total) * 100);
    var prev = s[moduleId];
    var attempts = (prev && prev.attempts || 0) + 1;
    var improved = !prev || !prev.best || pct > prev.best.pct;
    var best = (prev && prev.best && prev.best.pct >= pct) ? prev.best : { correct: correct, total: total, pct: pct };
    s[moduleId] = { last: { correct: correct, total: total, pct: pct }, best: best, attempts: attempts, updated: Date.now() };
    setScores(s);
    var label = (typeof MODULE_LABELS !== 'undefined' && MODULE_LABELS[moduleId]) || moduleId;
    if (improved) {
      pushNotification(label + ' quiz: ' + correct + '/' + total + ' (' + pct + '%)' + (pct >= 80 ? ' — exam-ready.' : ' — new best score.'), pct >= 80 ? 'good' : 'info');
    } else {
      pushNotification(label + ' quiz retaken: ' + correct + '/' + total + ' (' + pct + '%).', 'info');
    }
    return s[moduleId];
  }

  /* ---------------- notification feed ----------------
     A real, locally-generated event log (not fake canned "messages
     from support") — course events push into it automatically:
     module completed, quiz scored/improved, capstone passed. Powers
     the dashboard's bell dropdown and the Messages nav item. */
  var NOTIF_KEY = 'cfs.notifications';
  var NOTIF_SEED_KEY = 'cfs.notifSeeded';
  function getNotifications() {
    try { return JSON.parse(localStorage.getItem(NOTIF_KEY) || '[]'); } catch (e) { return []; }
  }
  function setNotifications(list) {
    try { localStorage.setItem(NOTIF_KEY, JSON.stringify(list.slice(0, 40))); } catch (e) {}
  }
  function pushNotification(text, kind) {
    var list = getNotifications();
    list.unshift({ id: Date.now() + '-' + Math.random().toString(36).slice(2, 7), text: text, kind: kind || 'info', time: Date.now(), read: false });
    setNotifications(list);
    return list;
  }
  function unreadCount() {
    return getNotifications().filter(function (n) { return !n.read; }).length;
  }
  function markAllNotificationsRead() {
    var list = getNotifications().map(function (n) { n.read = true; return n; });
    setNotifications(list);
  }
  function seedNotificationsOnce() {
    try {
      if (localStorage.getItem(NOTIF_SEED_KEY)) return;
      localStorage.setItem(NOTIF_SEED_KEY, '1');
      pushNotification('Welcome to Composites Field School. Your progress, scores, and time are all saved to this browser only.', 'welcome');
    } catch (e) {}
  }
  seedNotificationsOnce();

  var MODULE_LABELS = {
    'module-0': 'Module 0 — Orientation', 'module-1': 'Module 1 — What a composite is',
    'module-2': 'Module 2 — Reinforcements', 'module-3': 'Module 3 — Resins',
    'module-4': 'Module 4 — Cores & sandwich', 'module-5': 'Module 5 — Safety',
    'module-6': 'Module 6 — Curing chemistry', 'module-7': 'Module 7 — Manufacturing processes',
    'module-8': 'Module 8 — Molds & gelcoat', 'module-9': 'Module 9 — Structural details',
    'module-10': 'Module 10 — Hardware & bonding', 'module-11': 'Module 11 — Quality assurance',
    'module-12': 'Module 12 — Repair fundamentals', 'module-13': 'Module 13 — Environmental compliance',
    'module-14': 'Module 14 — Capstone exam'
  };

  /* ---------------- time-on-course tracker ----------------
     Accumulates real wall-clock time across every page that loads
     shell.js, in whole seconds, in localStorage. Flushes on tab-hide
     and unload so backgrounded tabs don't inflate the total. */
  var TIME_KEY = 'cfs.timeSpentSec';
  function getTimeSpentSec() {
    try { return parseInt(localStorage.getItem(TIME_KEY) || '0', 10) || 0; } catch (e) { return 0; }
  }
  function addTimeSpentSec(sec) {
    if (!sec || sec < 0) return;
    try { localStorage.setItem(TIME_KEY, String(getTimeSpentSec() + Math.round(sec))); } catch (e) {}
  }
  (function trackTime() {
    var start = Date.now();
    function flush() {
      var delta = (Date.now() - start) / 1000;
      if (delta > 0 && delta < 4 * 3600) addTimeSpentSec(delta);
      start = Date.now();
    }
    document.addEventListener('visibilitychange', function () { if (document.hidden) flush(); else start = Date.now(); });
    window.addEventListener('pagehide', flush);
    window.addEventListener('beforeunload', flush);
  })();

  /* ---------------- panel nav ---------------- */
  function initNav(opts) {
    opts = opts || {};
    var panels = Array.prototype.slice.call(document.querySelectorAll('.panel'));
    var total = panels.length;
    var idx = 0;
    var counter = document.getElementById('counter');
    var pfill = document.getElementById('pfill');
    var backBtn = document.getElementById('backBtn');
    var nextBtn = document.getElementById('nextBtn');
    var dotsWrap = document.getElementById('dots');

    if (dotsWrap) {
      for (var i = 0; i < total; i++) {
        var d = document.createElement('div');
        d.className = 'dot' + (i === 0 ? ' on' : '');
        dotsWrap.appendChild(d);
      }
    }
    var dots = dotsWrap ? Array.prototype.slice.call(dotsWrap.children) : [];

    function render() {
      panels.forEach(function (p, i) { p.classList.toggle('active', i === idx); });
      dots.forEach(function (d, i) { d.classList.toggle('on', i === idx); });
      if (counter) counter.textContent = 'Section ' + (idx + 1) + ' / ' + total;
      if (pfill) pfill.style.width = (((idx + 1) / total) * 100) + '%';
      if (backBtn) backBtn.disabled = idx === 0;
      if (nextBtn) nextBtn.textContent = idx === total - 1 ? 'Finish' : 'Next';
      window.scrollTo({ top: 0, behavior: 'smooth' });
      if (typeof opts.onChange === 'function') opts.onChange(idx, total);
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', function () {
        if (idx < total - 1) { idx++; render(); }
        else {
          var db = document.getElementById('doneBox');
          if (db) db.classList.add('show');
          nextBtn.disabled = true;
        }
      });
    }
    if (backBtn) {
      backBtn.addEventListener('click', function () { if (idx > 0) { idx--; render(); } });
    }
    if (global.location.hash === '#quiz') idx = total - 1;
    render();
    enhanceAllRanges();
    return { goTo: function (i) { idx = Math.max(0, Math.min(total - 1, i)); render(); } };
  }

  /* ---------------- range-slider fill ----------------
     Paints the filled portion of every <input type=range> so progress
     reads at a glance instead of a flat gray bar. Called automatically
     by initNav(); safe to call again if a module adds sliders later. */
  function enhanceRange(el) {
    if (el.dataset.cfsEnhanced) return;
    el.dataset.cfsEnhanced = '1';
    function update() {
      var min = +el.min || 0, max = +el.max || 100, val = +el.value;
      var pct = max > min ? ((val - min) / (max - min)) * 100 : 0;
      el.style.background = 'linear-gradient(to right, var(--accent) 0%, var(--accent) ' + pct + '%, var(--line) ' + pct + '%, var(--line) 100%)';
    }
    el.addEventListener('input', update);
    update();
  }
  function enhanceAllRanges() {
    Array.prototype.forEach.call(document.querySelectorAll('input[type=range]'), enhanceRange);
  }

  /* ---------------- quiz renderer (v2) ----------------
     One question at a time, exam-style. A wrong pick never dead-ends you:
     you can keep trying other options, or tap "Show the answer" to reveal
     it and move on — either way "Next question" becomes available within
     one click. Score only credits first-try correct answers. Finishing
     shows a review of anything missed and a "Retake quiz" (reshuffled)
     option, so you're never stuck and never locked out of trying again. */
  function shuffleArr(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function shuffleQuestions(questions) {
    return shuffleArr(questions).map(function (q) {
      var order = shuffleArr(q.opts.map(function (_, i) { return i; }));
      return {
        stem: q.stem,
        why: q.why,
        opts: order.map(function (i) { return q.opts[i]; }),
        correct: order.indexOf(q.correct)
      };
    });
  }
  var LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];
  function renderQuiz(containerId, questionsIn, scoreLineId, opts) {
    opts = opts || {};
    var qc = document.getElementById(containerId);
    if (!qc) return;
    if (scoreLineId) { var sl = document.getElementById(scoreLineId); if (sl) sl.textContent = ''; }

    var questions = questionsIn;
    var qi = 0;
    var results = []; // {picked, correctFirstTry, attempts, revealed}

    function start(qs) {
      questions = qs;
      qi = 0;
      results = questions.map(function () { return { picked: null, correctFirstTry: false, attempts: 0, revealed: false }; });
      renderQuestion();
    }

    function renderQuestion() {
      qc.innerHTML = '';
      var q = questions[qi];
      var r = results[qi];
      var resolved = r.solved || r.revealed;

      var prog = document.createElement('div'); prog.className = 'qz-progress';
      var bar = document.createElement('div'); bar.className = 'qz-progress-bar';
      var fill = document.createElement('div'); fill.className = 'qz-progress-fill';
      fill.style.width = ((qi / questions.length) * 100) + '%';
      bar.appendChild(fill); prog.appendChild(bar);
      var label = document.createElement('div'); label.className = 'qz-progress-label';
      label.textContent = 'Question ' + (qi + 1) + ' of ' + questions.length;
      prog.appendChild(label);
      qc.appendChild(prog);

      var card = document.createElement('div'); card.className = 'qz-card';
      var stem = document.createElement('div'); stem.className = 'qz-stem'; stem.textContent = q.stem;
      card.appendChild(stem);

      var optsWrap = document.createElement('div'); optsWrap.className = 'qz-opts';
      q.opts.forEach(function (text, oi) {
        var b = document.createElement('button'); b.type = 'button'; b.className = 'qz-opt';
        b.innerHTML = '<span class="qz-letter">' + LETTERS[oi] + '</span><span class="qz-opt-text"></span>';
        b.querySelector('.qz-opt-text').textContent = text;
        var wasWrongPick = r.wrongPicks && r.wrongPicks.indexOf(oi) !== -1;
        if (wasWrongPick) { b.classList.add('wrong'); b.disabled = true; }
        if (resolved) {
          b.disabled = true;
          if (oi === q.correct) b.classList.add('correct');
        }
        b.addEventListener('click', function () {
          if (resolved || wasWrongPick) return;
          r.attempts++;
          if (oi === q.correct) {
            r.solved = true;
            if (r.attempts === 1) r.correctFirstTry = true;
          } else {
            r.wrongPicks = r.wrongPicks || [];
            if (r.wrongPicks.indexOf(oi) === -1) r.wrongPicks.push(oi);
          }
          renderQuestion();
        });
        optsWrap.appendChild(b);
      });
      card.appendChild(optsWrap);

      var fb = document.createElement('div'); fb.className = 'qz-feedback';
      if (r.correctFirstTry) {
        fb.className += ' qz-fb-correct';
        fb.innerHTML = '<div class="qz-feedback-head">✓ Correct.</div><div class="qz-why">' + q.why + '</div>';
      } else if (r.solved) {
        fb.className += ' qz-fb-correct';
        fb.innerHTML = '<div class="qz-feedback-head">✓ Got it.</div><div class="qz-why">' + q.why + '</div>';
      } else if (r.revealed) {
        fb.className += ' qz-fb-info';
        fb.innerHTML = '<div class="qz-feedback-head">Answer: ' + LETTERS[q.correct] + '. ' + escapeHtml(q.opts[q.correct]) + '</div><div class="qz-why">' + q.why + '</div>';
      } else if (r.attempts > 0) {
        fb.className += ' qz-fb-wrong';
        fb.innerHTML = '<div class="qz-feedback-head">Not that one — try again, or reveal the answer below.</div>';
      } else {
        fb.hidden = true;
      }
      card.appendChild(fb);

      var actions = document.createElement('div'); actions.className = 'qz-actions';
      var revealBtn = document.createElement('button'); revealBtn.type = 'button';
      revealBtn.className = 'btn ghost qz-reveal'; revealBtn.textContent = 'Just show me the answer';
      revealBtn.hidden = resolved || !(r.attempts > 0);
      revealBtn.addEventListener('click', function () { r.revealed = true; renderQuestion(); });
      actions.appendChild(revealBtn);

      var nextBtn = document.createElement('button'); nextBtn.type = 'button';
      nextBtn.className = 'btn primary qz-next';
      nextBtn.textContent = qi === questions.length - 1 ? 'See results' : 'Next question →';
      nextBtn.disabled = !resolved;
      nextBtn.addEventListener('click', function () {
        if (qi < questions.length - 1) { qi++; renderQuestion(); }
        else finish();
      });
      actions.appendChild(nextBtn);
      card.appendChild(actions);

      qc.appendChild(card);
    }

    function escapeHtml(s) {
      var d = document.createElement('div'); d.textContent = s; return d.innerHTML;
    }

    function finish() {
      var correctCount = results.filter(function (r) { return r.correctFirstTry; }).length;
      var total = questions.length;
      if (scoreLineId) {
        var sl2 = document.getElementById(scoreLineId);
        if (sl2) sl2.textContent = 'Score: ' + correctCount + ' / ' + total + ' — check complete';
      }
      qc.innerHTML = '';
      var pct = Math.round((correctCount / total) * 100);
      var wrap = document.createElement('div'); wrap.className = 'qz-summary';
      var tier = pct >= 80 ? 'ok' : pct >= 50 ? 'warn' : 'bad';
      wrap.innerHTML =
        '<div class="qz-summary-score ' + tier + '">' + correctCount + ' / ' + total + '</div>' +
        '<div class="qz-summary-pct">' + pct + '% on first try' + (pct >= 80 ? ' — exam-ready range' : '') + '</div>';
      var missed = results.map(function (r, i) { return { r: r, q: questions[i] }; }).filter(function (x) { return !x.r.correctFirstTry; });
      if (missed.length) {
        var rev = document.createElement('div'); rev.className = 'qz-review';
        var h = document.createElement('div'); h.className = 'qz-review-head'; h.textContent = 'Review — ' + missed.length + ' to revisit';
        rev.appendChild(h);
        missed.forEach(function (x) {
          var item = document.createElement('div'); item.className = 'qz-review-item';
          item.innerHTML = '<div class="qz-review-stem">' + escapeHtml(x.q.stem) + '</div>' +
            '<div class="qz-review-answer">Correct answer: ' + LETTERS[x.q.correct] + '. ' + escapeHtml(x.q.opts[x.q.correct]) + '</div>' +
            '<div class="qz-why">' + x.q.why + '</div>';
          rev.appendChild(item);
        });
        wrap.appendChild(rev);
      }
      var retake = document.createElement('button'); retake.type = 'button';
      retake.className = 'btn primary qz-retake'; retake.textContent = 'Retake quiz (shuffled)';
      retake.addEventListener('click', function () { start(shuffleQuestions(questionsIn)); });
      wrap.appendChild(retake);
      qc.appendChild(wrap);
      if (typeof opts.onComplete === 'function') opts.onComplete(correctCount, total);
    }

    start(shuffleQuestions(questionsIn));
  }

  /* ---------------- ordering / sequencing game ----------------
     items: [{id,label}] in the order rendered.
     correctOrder: array of ids in the correct sequence.
     Renders a reorderable list (native drag + keyboard-accessible
     up/down buttons) with a "Check order" button. */
  function initOrderGame(containerId, items, correctOrder, opts) {
    opts = opts || {};
    var root = document.getElementById(containerId);
    if (!root) return;
    var order = items.map(function (it) { return it.id; });
    var byId = {}; items.forEach(function (it) { byId[it.id] = it; });

    var list = document.createElement('ul');
    list.className = 'order-list';
    root.appendChild(list);

    var checkBtn = document.createElement('button');
    checkBtn.className = 'btn ghost'; checkBtn.style.marginTop = '12px';
    checkBtn.textContent = 'Check order';
    root.appendChild(checkBtn);

    var result = document.createElement('div');
    result.className = 'readout'; result.style.display = 'none';
    root.appendChild(result);

    function move(id, dir) {
      var i = order.indexOf(id);
      var j = i + dir;
      if (j < 0 || j >= order.length) return;
      var tmp = order[i]; order[i] = order[j]; order[j] = tmp;
      draw();
    }
    var dragSrc = null;
    function draw() {
      list.innerHTML = '';
      order.forEach(function (id, i) {
        var li = document.createElement('li');
        li.className = 'order-item';
        li.draggable = true;
        li.dataset.id = id;
        li.innerHTML = '<span class="num">' + (i + 1) + '.</span><span style="flex:1">' +
          byId[id].label + '</span>' +
          '<span style="display:flex;gap:4px">' +
          '<button type="button" aria-label="Move up" style="min-height:32px;min-width:32px;border:1px solid var(--line-strong);background:#fff;border-radius:6px;cursor:pointer">↑</button>' +
          '<button type="button" aria-label="Move down" style="min-height:32px;min-width:32px;border:1px solid var(--line-strong);background:#fff;border-radius:6px;cursor:pointer">↓</button>' +
          '</span>';
        var ups = li.querySelectorAll('button');
        ups[0].addEventListener('click', function () { move(id, -1); });
        ups[1].addEventListener('click', function () { move(id, 1); });
        li.addEventListener('dragstart', function () { dragSrc = id; li.classList.add('dragging'); });
        li.addEventListener('dragend', function () { li.classList.remove('dragging'); });
        li.addEventListener('dragover', function (e) { e.preventDefault(); });
        li.addEventListener('drop', function (e) {
          e.preventDefault();
          if (dragSrc === null || dragSrc === id) return;
          var si = order.indexOf(dragSrc), di = order.indexOf(id);
          order.splice(si, 1); order.splice(di, 0, dragSrc);
          draw();
        });
        list.appendChild(li);
      });
    }
    checkBtn.addEventListener('click', function () {
      var correct = order.every(function (id, i) { return id === correctOrder[i]; });
      Array.prototype.forEach.call(list.children, function (li, i) {
        li.classList.toggle('correct-pos', li.dataset.id === correctOrder[i]);
      });
      result.style.display = 'block';
      if (correct) {
        result.className = 'readout ok';
        result.textContent = opts.correctMsg || 'Correct sequence.';
        if (typeof opts.onCorrect === 'function') opts.onCorrect();
      } else {
        result.className = 'readout warn';
        result.textContent = opts.wrongMsg || 'Not quite — green rows are already in the right spot. Keep adjusting.';
      }
    });
    draw();
  }

  /* ---------------- click-to-match pairing game ----------------
     pairs: [{left, right}] — left and right lists are shuffled independently. */
  function initMatchGame(containerId, pairs, opts) {
    opts = opts || {};
    var root = document.getElementById(containerId);
    if (!root) return;
    var grid = document.createElement('div');
    grid.className = 'match-grid';
    root.appendChild(grid);
    var leftCol = document.createElement('div');
    var rightCol = document.createElement('div');
    leftCol.style.display = rightCol.style.display = 'flex';
    leftCol.style.flexDirection = rightCol.style.flexDirection = 'column';
    leftCol.style.gap = rightCol.style.gap = '8px';
    grid.appendChild(leftCol); grid.appendChild(rightCol);

    function shuffle(arr) {
      var a = arr.slice();
      for (var i = a.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var t = a[i]; a[i] = a[j]; a[j] = t;
      }
      return a;
    }
    var leftItems = pairs.map(function (p, i) { return { id: i, text: p.left }; });
    var rightItems = shuffle(pairs.map(function (p, i) { return { id: i, text: p.right }; }));
    var selL = null, selR = null, solved = {};
    var solvedCount = 0;

    function makePill(item, col, side) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'match-pill'; b.textContent = item.text;
      b.addEventListener('click', function () {
        if (solved[item.id]) return;
        if (side === 'l') {
          if (selL) selL.el.classList.remove('sel');
          selL = { id: item.id, el: b }; b.classList.add('sel');
        } else {
          if (selR) selR.el.classList.remove('sel');
          selR = { id: item.id, el: b }; b.classList.add('sel');
        }
        if (selL && selR) {
          if (selL.id === selR.id) {
            selL.el.classList.remove('sel'); selR.el.classList.remove('sel');
            selL.el.classList.add('right'); selR.el.classList.add('right');
            solved[selL.id] = true; solvedCount++;
            selL = null; selR = null;
            if (solvedCount === pairs.length && typeof opts.onComplete === 'function') opts.onComplete();
          } else {
            selL.el.classList.add('wrong'); selR.el.classList.add('wrong');
            (function (l, r) {
              setTimeout(function () {
                l.el.classList.remove('sel', 'wrong');
                r.el.classList.remove('sel', 'wrong');
              }, 550);
            })(selL, selR);
            selL = null; selR = null;
          }
        }
      });
      col.appendChild(b);
    }
    leftItems.forEach(function (it) { makePill(it, leftCol, 'l'); });
    rightItems.forEach(function (it) { makePill(it, rightCol, 'r'); });
  }

  /* ---------------- video grid ----------------
     videos: [{title, channel, youtubeId, note}] */
  function renderVideos(containerId, videos) {
    var root = document.getElementById(containerId);
    if (!root) return;
    var grid = document.createElement('div');
    grid.className = 'vid-grid';
    videos.forEach(function (v) {
      var a = document.createElement('a');
      a.className = 'vid-card'; a.target = '_blank'; a.rel = 'noopener';
      a.href = 'https://www.youtube.com/watch?v=' + v.youtubeId;
      a.innerHTML =
        '<div class="vid-thumb" style="background-image:url(https://img.youtube.com/vi/' + v.youtubeId + '/hqdefault.jpg)"></div>' +
        '<div class="vid-meta"><div class="vt">' + v.title + '</div><div class="vc">' + (v.channel || '') +
        (v.note ? ' · ' + v.note : '') + '</div></div>';
      grid.appendChild(a);
    });
    root.appendChild(grid);
  }

  /* ---------------- required-viewing block ----------------
     A single, prominent "must watch" video per module — separate from the
     supplementary vid-grid. Non-blocking (never disables Next/Finish; a
     gate like that is exactly the kind of dead-end this rebuild removes),
     but keeps a persistent "watched" checkmark per module in localStorage
     so returning to the page shows what's already been done. */
  var WATCHED_KEY = 'cfs.watched';
  function getWatched() {
    try { return JSON.parse(localStorage.getItem(WATCHED_KEY) || '{}'); } catch (e) { return {}; }
  }
  function setWatchedFlag(id, val) {
    var w = getWatched(); w[id] = !!val;
    try { localStorage.setItem(WATCHED_KEY, JSON.stringify(w)); } catch (e) {}
  }
  function renderMustWatch(containerId, video, opts) {
    opts = opts || {};
    var root = document.getElementById(containerId);
    if (!root) return;
    var id = opts.id || video.youtubeId;
    var watched = getWatched()[id];

    var box = document.createElement('div');
    box.className = 'must-watch' + (watched ? ' done' : '');

    var a = document.createElement('a');
    a.className = 'must-watch-thumb'; a.target = '_blank'; a.rel = 'noopener';
    a.href = 'https://www.youtube.com/watch?v=' + video.youtubeId;
    a.style.backgroundImage = 'url(https://img.youtube.com/vi/' + video.youtubeId + '/hqdefault.jpg)';

    var body = document.createElement('div');
    body.className = 'must-watch-body';
    var badge = document.createElement('div'); badge.className = 'must-watch-badge';
    badge.textContent = watched ? '✓ Watched' : '▶ Required viewing';
    var title = document.createElement('div'); title.className = 'must-watch-title'; title.textContent = video.title;
    var meta = document.createElement('div'); meta.className = 'must-watch-meta';
    meta.textContent = (video.channel || 'YouTube') + (video.note ? ' · ' + video.note : '');
    var checkBtn = document.createElement('button'); checkBtn.type = 'button';
    checkBtn.className = 'must-watch-check';
    checkBtn.textContent = watched ? '✓ Marked as watched' : 'Mark as watched';
    checkBtn.setAttribute('aria-pressed', watched ? 'true' : 'false');
    checkBtn.addEventListener('click', function () {
      watched = !watched;
      setWatchedFlag(id, watched);
      box.classList.toggle('done', watched);
      badge.textContent = watched ? '✓ Watched' : '▶ Required viewing';
      checkBtn.textContent = watched ? '✓ Marked as watched' : 'Mark as watched';
      checkBtn.setAttribute('aria-pressed', watched ? 'true' : 'false');
    });

    body.appendChild(badge); body.appendChild(title); body.appendChild(meta); body.appendChild(checkBtn);
    box.appendChild(a); box.appendChild(body);
    root.appendChild(box);
  }

  /* ---------------- floating study-assistant chatbot ----------------
     Rule-based / keyword search over window.CFS_KB (assets/knowledge-base.js).
     No network calls — fully client-side FAQ search, honest about what it is. */
  function score(entry, query) {
    var q = query.toLowerCase();
    var words = q.split(/[^a-z0-9]+/).filter(Boolean);
    var hay = (entry.q + ' ' + (entry.tags || []).join(' ') + ' ' + entry.a).toLowerCase();
    var s = 0;
    words.forEach(function (w) {
      if (w.length < 3) return;
      if (hay.indexOf(w) !== -1) s += w.length >= 5 ? 3 : 1;
    });
    if (hay.indexOf(q) !== -1) s += 8;
    return s;
  }
  function initChatbot() {
    if (document.getElementById('cfsChatToggle')) return;
    var kb = global.CFS_KB || [];
    var toggle = document.createElement('button');
    toggle.id = 'cfsChatToggle'; toggle.setAttribute('aria-label', 'Open study assistant'); toggle.textContent = '💬';
    var panel = document.createElement('div');
    panel.id = 'cfsChatPanel';
    panel.innerHTML =
      '<div class="cfs-chat-head"><span>Field School Assistant</span><button id="cfsChatClose" aria-label="Close">✕</button></div>' +
      '<div class="cfs-chat-log" id="cfsChatLog"></div>' +
      '<div class="cfs-chip-row" id="cfsChatChips"></div>' +
      '<div class="cfs-chat-input"><input id="cfsChatInput" type="text" placeholder="Ask about resins, glass, safety…" aria-label="Ask a question"><button id="cfsChatSend">Ask</button></div>';
    document.body.appendChild(toggle);
    document.body.appendChild(panel);

    var log = panel.querySelector('#cfsChatLog');
    var chips = panel.querySelector('#cfsChatChips');
    var input = panel.querySelector('#cfsChatInput');

    function addMsg(text, who) {
      var m = document.createElement('div');
      m.className = 'cfs-msg ' + who;
      m.innerHTML = text;
      log.appendChild(m);
      log.scrollTop = log.scrollHeight;
    }
    function answer(query) {
      addMsg(query, 'user');
      if (!kb.length) {
        addMsg('The knowledge base hasn\'t loaded on this page yet — try a module page with assets/knowledge-base.js linked.', 'bot');
        return;
      }
      var ranked = kb.map(function (e) { return { e: e, s: score(e, query) }; })
        .filter(function (r) { return r.s > 0; })
        .sort(function (a, b) { return b.s - a.s; });
      if (!ranked.length) {
        addMsg('I don\'t have that one indexed yet. Try rephrasing, or check the module\'s "field notes" callouts — and always cross-check against the official ABYC study guide.', 'bot');
        return;
      }
      var top = ranked.slice(0, 2);
      top.forEach(function (r) {
        var vidLink = r.e.youtubeId ? ' <br><a href="https://www.youtube.com/watch?v=' + r.e.youtubeId + '" target="_blank" rel="noopener">▶ watch a related video</a>' : '';
        addMsg('<b>' + r.e.q + '</b><br>' + r.e.a + vidLink, 'bot');
      });
    }
    function ask(q) { input.value = ''; answer(q); }
    panel.querySelector('#cfsChatSend').addEventListener('click', function () {
      if (input.value.trim()) ask(input.value.trim());
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && input.value.trim()) ask(input.value.trim());
    });
    toggle.addEventListener('click', function () { panel.classList.toggle('open'); });
    panel.querySelector('#cfsChatClose').addEventListener('click', function () { panel.classList.remove('open'); });

    addMsg('Hi — I\'m a search assistant, not a live tutor: I match your question against this course\'s vetted content and the curriculum, and point you to a relevant video. I can be wrong or incomplete, so treat the official ABYC study guide as the final word.', 'bot');
    var starters = ['CSM vs woven roving?', 'MEKP eye contact first aid', 'What is crimp?', 'Barcol hardness?', 'Galvanic corrosion + carbon'];
    starters.forEach(function (s) {
      var c = document.createElement('button'); c.className = 'cfs-chip'; c.type = 'button'; c.textContent = s;
      c.addEventListener('click', function () { ask(s); });
      chips.appendChild(c);
    });
  }

  global.CFS = {
    getProgress: getProgress,
    markComplete: markComplete,
    moduleStatus: moduleStatus,
    getScores: getScores,
    recordScore: recordScore,
    getTimeSpentSec: getTimeSpentSec,
    getNotifications: getNotifications,
    pushNotification: pushNotification,
    unreadCount: unreadCount,
    markAllNotificationsRead: markAllNotificationsRead,
    moduleLabel: function (id) { return MODULE_LABELS[id] || id; },
    initNav: initNav,
    renderQuiz: renderQuiz,
    initOrderGame: initOrderGame,
    initMatchGame: initMatchGame,
    renderVideos: renderVideos,
    renderMustWatch: renderMustWatch,
    enhanceRange: enhanceRange,
    enhanceAllRanges: enhanceAllRanges,
    initChatbot: initChatbot
  };
})(window);
