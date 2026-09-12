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
    p[moduleId] = 'complete';
    setProgress(p);
  }
  function moduleStatus(moduleId) {
    var p = getProgress();
    return p[moduleId] || 'not-started';
  }

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
    render();
    return { goTo: function (i) { idx = Math.max(0, Math.min(total - 1, i)); render(); } };
  }

  /* ---------------- quiz renderer ---------------- */
  function renderQuiz(containerId, questions, scoreLineId, opts) {
    opts = opts || {};
    var qc = document.getElementById(containerId);
    var scoreLine = scoreLineId ? document.getElementById(scoreLineId) : null;
    if (!qc) return;
    var answered = 0, correctCount = 0;
    questions.forEach(function (q, qi) {
      var wrap = document.createElement('div'); wrap.className = 'q';
      var stem = document.createElement('div'); stem.className = 'stem';
      stem.textContent = (qi + 1) + '. ' + q.stem; wrap.appendChild(stem);
      var why = document.createElement('div'); why.className = 'why'; why.textContent = q.why;
      q.opts.forEach(function (text, oi) {
        var b = document.createElement('button'); b.className = 'opt'; b.textContent = text;
        b.addEventListener('click', function () {
          if (wrap.dataset.done) return;
          wrap.dataset.done = '1'; answered++;
          var btns = wrap.querySelectorAll('.opt');
          btns.forEach(function (x) { x.setAttribute('disabled', ''); });
          if (oi === q.correct) { b.classList.add('correct'); correctCount++; }
          else { b.classList.add('wrong'); btns[q.correct].classList.add('correct'); }
          why.classList.add('show');
          if (scoreLine) {
            scoreLine.textContent = 'Score: ' + correctCount + ' / ' + answered +
              (answered === questions.length ? '  — check complete' : '');
          }
          if (answered === questions.length && typeof opts.onComplete === 'function') {
            opts.onComplete(correctCount, questions.length);
          }
        });
        wrap.appendChild(b);
      });
      wrap.appendChild(why);
      qc.appendChild(wrap);
    });
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
    initNav: initNav,
    renderQuiz: renderQuiz,
    initOrderGame: initOrderGame,
    initMatchGame: initMatchGame,
    renderVideos: renderVideos,
    initChatbot: initChatbot
  };
})(window);
