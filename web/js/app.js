/*
 * Kids Tube — giao diện TV điều khiển bằng remote LG.
 * ES5 để tương thích TV webOS đời cũ.
 */
(function () {
  'use strict';

  var KEY = {
    LEFT: 37, UP: 38, RIGHT: 39, DOWN: 40, ENTER: 13,
    BACK: 461, BACKSPACE: 8, ESC: 27,
    PLAY: 415, PAUSE: 19, STOP: 413, FF: 417, RW: 412,
    RED: 403
  };
  var COLS = 4;
  var ALL_TAB_LIMIT = 300;
  var SEEK_STEP = 10;
  var WATCH_TICK = 5; // giây

  var els = {};
  var state = {
    tabs: [], tabIndex: 0, area: 'tabs', cardIndex: 0,
    loading: true, error: null, locked: false, lastBackAt: 0
  };
  var player = null;
  var ytReady = false;
  var pendingVideoId = null;
  var playback = { active: false, list: [], index: 0, hudTimer: null, startTimer: null };

  function $(id) { return document.getElementById(id); }

  /* ======================= Khởi động ======================= */

  function init() {
    els.app = $('app');
    els.tabs = $('tabs');
    els.grid = $('grid');
    els.status = $('status');
    els.toast = $('toast');
    els.limit = $('limit-badge');
    els.playerScreen = $('player-screen');
    els.shield = $('player-shield');
    els.hud = $('hud');
    els.hudTitle = $('hud-title');
    els.hudMeta = $('hud-meta');
    els.hudFill = $('hud-fill');
    els.hudTime = $('hud-time');
    els.playerMsg = $('player-msg');

    document.addEventListener('keydown', onKeyDown, false);
    bindPointer();
    document.addEventListener('visibilitychange', function () {
      if (document.hidden && playback.active && player && player.pauseVideo) player.pauseVideo();
    }, false);

    setInterval(watchTick, WATCH_TICK * 1000);
    setInterval(updateHudProgress, 500);
    updateLimitBadge();
    boot();
  }

  function boot() {
    state.loading = true;
    state.error = null;
    state.tabs = [];
    els.tabs.innerHTML = '';
    els.grid.innerHTML = '';

    if (limitReached()) { lockForToday(); return; }

    if (typeof CONFIG === 'undefined') { fail('Không đọc được js/config.js'); return; }
    if (!CONFIG.API_KEY || CONFIG.API_KEY.indexOf('DAN_') === 0) {
      fail('Chưa nhập API_KEY trong js/config.js');
      return;
    }
    if (!CONFIG.CHANNELS || !CONFIG.CHANNELS.length) {
      if (!CONFIG.ALLOWED_VIDEOS || !CONFIG.ALLOWED_VIDEOS.length) {
        fail('Chưa có kênh nào trong CHANNELS (js/config.js)');
        return;
      }
    }

    showStatus('Đang tải danh sách video…', false);
    KidsData.loadLibrary(CONFIG).then(function (lib) {
      state.loading = false;
      buildTabs(lib);
      if (!state.tabs.length) {
        fail('Không có video nào phù hợp.\nKiểm tra lại danh sách kênh và bộ lọc trong js/config.js');
        return;
      }
      hideStatus();
      state.tabIndex = 0;
      state.area = 'tabs';
      state.cardIndex = 0;
      renderTabs();
      renderGrid();
      updateFocus(false);
      if (lib.missing && lib.missing.length) {
        toast('Không tìm thấy kênh: ' + lib.missing.join(', '), 7000);
      } else if (lib.stale) {
        toast('Mất mạng — đang dùng danh sách đã lưu', 4000);
      }
    }, function (err) {
      state.loading = false;
      fail('Không tải được dữ liệu:\n' + err.message);
    });
  }

  function fail(msg) {
    state.error = msg;
    showStatus(msg + '\n\nNhấn OK để thử lại', true);
  }

  function buildTabs(lib) {
    var tabs = [];
    var all = [];
    lib.channels.forEach(function (ch) { all = all.concat(ch.videos); });
    all.sort(function (a, b) {
      return a.publishedAt < b.publishedAt ? 1 : (a.publishedAt > b.publishedAt ? -1 : 0);
    });
    var nonEmpty = lib.channels.filter(function (ch) { return ch.videos.length > 0; });
    if (nonEmpty.length > 1) tabs.push({ title: 'Tất cả', videos: all.slice(0, ALL_TAB_LIMIT) });
    nonEmpty.forEach(function (ch) { tabs.push({ title: ch.title, thumb: ch.thumb, videos: ch.videos }); });
    if (lib.picks && lib.picks.length) tabs.push({ title: 'Chọn lọc', videos: lib.picks });
    state.tabs = tabs;
  }

  function currentVideos() {
    var t = state.tabs[state.tabIndex];
    return t ? t.videos : [];
  }

  /* ======================= Vẽ giao diện ======================= */

  function renderTabs() {
    els.tabs.innerHTML = '';
    var frag = document.createDocumentFragment();
    state.tabs.forEach(function (tab, i) {
      var el = document.createElement('div');
      el.className = 'tab' + (i === state.tabIndex ? ' active' : '');
      el.setAttribute('data-index', String(i));
      if (tab.thumb) {
        var img = document.createElement('img');
        img.src = tab.thumb;
        img.alt = '';
        img.onerror = function () { this.style.display = 'none'; };
        el.appendChild(img);
      }
      var span = document.createElement('span');
      span.textContent = tab.title;
      el.appendChild(span);
      frag.appendChild(el);
    });
    els.tabs.appendChild(frag);
  }

  function renderGrid() {
    var videos = currentVideos();
    els.grid.innerHTML = '';
    els.grid.scrollTop = 0;
    var frag = document.createDocumentFragment();
    videos.forEach(function (v, i) {
      var card = document.createElement('div');
      card.className = 'card';
      card.setAttribute('data-index', String(i));

      var thumb = document.createElement('div');
      thumb.className = 'thumb';
      var img = document.createElement('img');
      img.alt = '';
      if (v.thumb) img.setAttribute('data-src', v.thumb);
      img.onerror = function () { this.style.visibility = 'hidden'; };
      thumb.appendChild(img);
      if (v.duration) {
        var dur = document.createElement('span');
        dur.className = 'dur';
        dur.textContent = formatTime(v.duration);
        thumb.appendChild(dur);
      }
      card.appendChild(thumb);

      var title = document.createElement('div');
      title.className = 'ctitle';
      title.textContent = v.title;
      card.appendChild(title);

      var meta = document.createElement('div');
      meta.className = 'cmeta';
      meta.textContent = v.channelTitle;
      card.appendChild(meta);

      frag.appendChild(card);
    });
    els.grid.appendChild(frag);
    loadVisibleImages();
  }

  function updateFocus(scroll) {
    var old = document.querySelectorAll('.focused');
    for (var i = 0; i < old.length; i++) old[i].classList.remove('focused');

    if (state.area === 'tabs') {
      var tab = els.tabs.children[state.tabIndex];
      if (tab) {
        tab.classList.add('focused');
        if (scroll !== false) ensureTabVisible(tab);
      }
    } else {
      var card = els.grid.children[state.cardIndex];
      if (card) {
        card.classList.add('focused');
        if (scroll !== false) ensureCardVisible(card);
      }
    }
    loadVisibleImages();
  }

  function ensureCardVisible(card) {
    var g = els.grid, pad = 50;
    var top = card.offsetTop, bottom = top + card.offsetHeight;
    if (top - pad < g.scrollTop) {
      g.scrollTop = Math.max(0, top - pad);
    } else if (bottom + pad > g.scrollTop + g.clientHeight) {
      g.scrollTop = bottom + pad - g.clientHeight;
    }
  }

  function ensureTabVisible(tab) {
    var t = els.tabs, pad = 60;
    var left = tab.offsetLeft, right = left + tab.offsetWidth;
    if (left - pad < t.scrollLeft) {
      t.scrollLeft = Math.max(0, left - pad);
    } else if (right + pad > t.scrollLeft + t.clientWidth) {
      t.scrollLeft = right + pad - t.clientWidth;
    }
  }

  // Chỉ tải ảnh thu nhỏ của những thẻ gần màn hình (đỡ nặng cho TV)
  function loadVisibleImages() {
    if (playback.active) return;
    var imgs = els.grid.querySelectorAll('img[data-src]');
    var h = window.innerHeight || 1080;
    for (var i = 0; i < imgs.length; i++) {
      var r = imgs[i].getBoundingClientRect();
      if (r.bottom > -h * 0.5 && r.top < h * 1.8) {
        imgs[i].src = imgs[i].getAttribute('data-src');
        imgs[i].removeAttribute('data-src');
      }
    }
  }

  function selectTab(i) {
    if (i < 0 || i >= state.tabs.length || i === state.tabIndex) return;
    state.tabIndex = i;
    state.cardIndex = 0;
    renderTabs();
    renderGrid();
  }

  /* ======================= Phím remote ======================= */

  function onKeyDown(e) {
    var code = e.keyCode;
    var handled = playback.active ? playerKey(code) : homeKey(code);
    if (handled) {
      e.preventDefault();
      e.stopPropagation();
    }
  }

  function isBack(code) { return code === KEY.BACK || code === KEY.BACKSPACE || code === KEY.ESC; }

  function homeKey(code) {
    if (isBack(code) && (state.locked || state.error || state.loading || state.area === 'tabs')) {
      askExit();
      return true;
    }
    if (state.locked) {
      if (code === KEY.ENTER && !limitReached()) { state.locked = false; boot(); }
      return true;
    }
    if (state.error) {
      if (code === KEY.ENTER) boot();
      return true;
    }
    if (state.loading) return true;

    if (code === KEY.RED) { // Nút đỏ: tải lại danh sách
      KidsData.clearCache();
      toast('Đang tải lại danh sách…', 2000);
      boot();
      return true;
    }

    var n = currentVideos().length;

    if (state.area === 'tabs') {
      if (code === KEY.LEFT) selectTab(state.tabIndex - 1);
      else if (code === KEY.RIGHT) selectTab(state.tabIndex + 1);
      else if ((code === KEY.DOWN || code === KEY.ENTER) && n) {
        state.area = 'grid';
        state.cardIndex = Math.min(state.cardIndex, n - 1);
      } else return false;
      updateFocus();
      return true;
    }

    // state.area === 'grid'
    var i = state.cardIndex;
    if (code === KEY.LEFT) {
      if (i % COLS > 0) state.cardIndex = i - 1;
    } else if (code === KEY.RIGHT) {
      if (i % COLS < COLS - 1 && i + 1 < n) state.cardIndex = i + 1;
    } else if (code === KEY.UP) {
      if (i < COLS) state.area = 'tabs';
      else state.cardIndex = i - COLS;
    } else if (code === KEY.DOWN) {
      if (i + COLS < n) state.cardIndex = i + COLS;
      else if (Math.floor((n - 1) / COLS) > Math.floor(i / COLS)) state.cardIndex = n - 1;
    } else if (code === KEY.ENTER || code === KEY.PLAY) {
      playFrom(currentVideos(), i);
      return true;
    } else if (isBack(code)) {
      state.area = 'tabs';
    } else {
      return false;
    }
    updateFocus();
    return true;
  }

  function askExit() {
    var now = Date.now();
    if (now - state.lastBackAt < 2500) {
      exitApp();
    } else {
      state.lastBackAt = now;
      toast('Nhấn Quay lại thêm lần nữa để thoát', 2500);
    }
  }

  function exitApp() {
    try {
      if (window.webOS && typeof window.webOS.platformBack === 'function') {
        window.webOS.platformBack();
        return;
      }
    } catch (e) { /* bỏ qua */ }
    window.close();
  }

  /* ======================= Chuột Magic Remote ======================= */

  function findIndexed(el, root, cls) {
    while (el && el !== root) {
      if (el.classList && el.classList.contains(cls)) return el;
      el = el.parentNode;
    }
    return null;
  }

  function bindPointer() {
    els.grid.addEventListener('mouseover', function (e) {
      if (state.loading || state.error || state.locked) return;
      var card = findIndexed(e.target, els.grid, 'card');
      if (!card) return;
      state.area = 'grid';
      state.cardIndex = +card.getAttribute('data-index');
      updateFocus(false);
    }, false);

    els.grid.addEventListener('click', function (e) {
      var card = findIndexed(e.target, els.grid, 'card');
      if (card) playFrom(currentVideos(), +card.getAttribute('data-index'));
    }, false);

    els.tabs.addEventListener('click', function (e) {
      var tab = findIndexed(e.target, els.tabs, 'tab');
      if (!tab) return;
      selectTab(+tab.getAttribute('data-index'));
      state.area = 'tabs';
      updateFocus(false);
    }, false);

    var ticking = false;
    els.grid.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      setTimeout(function () { ticking = false; loadVisibleImages(); }, 150);
    }, false);

    // Lớp chắn: bấm chuột lên video chỉ để dừng/phát, không thể bấm vào link YouTube
    els.shield.addEventListener('click', function () { togglePlay(); showHud(); }, false);
    els.shield.addEventListener('mousemove', function () { showHud(); }, false);
  }

  /* ======================= Trình phát ======================= */

  window.onYouTubeIframeAPIReady = function () {
    ytReady = true;
    if (pendingVideoId) {
      var id = pendingVideoId;
      pendingVideoId = null;
      startVideo(id);
    }
  };

  function playFrom(list, index) {
    if (!list || !list[index]) return;
    if (limitReached()) { lockForToday(); return; }
    playback.active = true;
    playback.list = list;
    playback.index = index;
    els.app.classList.add('hidden');
    els.playerScreen.classList.remove('hidden');
    startVideo(list[index].id);
  }

  function startVideo(id) {
    updateHudInfo();
    showHud();
    if (!ytReady || typeof YT === 'undefined' || !YT.Player) {
      pendingVideoId = id;
      showPlayerMsg('Đang tải trình phát…');
      return;
    }
    showPlayerMsg('');
    if (!player) {
      player = new YT.Player('player', {
        width: '100%',
        height: '100%',
        videoId: id,
        playerVars: {
          autoplay: 1,
          controls: 0,        // tự điều khiển bằng remote
          rel: 0,             // video liên quan (nếu có) chỉ từ cùng kênh
          fs: 0,
          disablekb: 1,
          iv_load_policy: 3,  // tắt chú thích
          playsinline: 1,
          cc_load_policy: 0,
          modestbranding: 1
        },
        events: {
          onReady: function (e) { e.target.playVideo(); },
          onStateChange: onPlayerState,
          onError: onPlayerError
        }
      });
    } else {
      player.loadVideoById(id);
    }
    clearTimeout(playback.startTimer);
    playback.startTimer = setTimeout(function () {
      if (!playback.active || !player || !player.getPlayerState) return;
      var s = player.getPlayerState();
      if (s === -1 || s === 5) showPlayerMsg('Nhấn OK để phát');
    }, 4000);
  }

  function onPlayerState(e) {
    if (!playback.active) return;
    if (e.data === 1) { // đang phát
      showPlayerMsg('');
      showHud();
    } else if (e.data === 2) { // tạm dừng
      showHud(true);
    } else if (e.data === 0) { // hết video
      if (CONFIG.AUTOPLAY_NEXT !== false && playback.index + 1 < playback.list.length) {
        playIndex(playback.index + 1);
      } else {
        closePlayer();
      }
    }
  }

  function onPlayerError(e) {
    if (!playback.active) return;
    var code = e.data;
    if (code === 153) {
      showPlayerMsg('Lỗi 153: YouTube yêu cầu app chạy từ trang web https.\nXem README, mục "Đưa web app lên GitHub Pages".');
      return;
    }
    showPlayerMsg('Video này không phát được (mã ' + code + ')');
    setTimeout(function () {
      if (!playback.active) return;
      if (playback.index + 1 < playback.list.length) playIndex(playback.index + 1);
      else closePlayer();
    }, 2500);
  }

  function playIndex(i) {
    if (i < 0 || i >= playback.list.length) return;
    if (limitReached()) { closePlayer(); lockForToday(); return; }
    playback.index = i;
    startVideo(playback.list[i].id);
  }

  function togglePlay() {
    if (!player || !player.getPlayerState) return;
    if (player.getPlayerState() === 1) player.pauseVideo();
    else player.playVideo();
  }

  function seekBy(sec) {
    if (!player || !player.getCurrentTime) return;
    var t = Math.max(0, player.getCurrentTime() + sec);
    var d = player.getDuration ? player.getDuration() : 0;
    if (d && t > d - 1) t = d - 1;
    player.seekTo(t, true);
    updateHudProgress();
  }

  function playerKey(code) {
    showHud();
    if (isBack(code) || code === KEY.STOP) { closePlayer(); return true; }
    if (code === KEY.ENTER) { togglePlay(); return true; }
    if (code === KEY.PLAY) { if (player && player.playVideo) player.playVideo(); return true; }
    if (code === KEY.PAUSE) { if (player && player.pauseVideo) player.pauseVideo(); return true; }
    if (code === KEY.LEFT || code === KEY.RW) { seekBy(-SEEK_STEP); return true; }
    if (code === KEY.RIGHT || code === KEY.FF) { seekBy(SEEK_STEP); return true; }
    if (code === KEY.DOWN) { playIndex(playback.index + 1); return true; }
    if (code === KEY.UP) { playIndex(playback.index - 1); return true; }
    return true; // nuốt mọi phím khác khi đang xem
  }

  function closePlayer() {
    if (!playback.active) return;
    playback.active = false;
    clearTimeout(playback.startTimer);
    pendingVideoId = null;
    if (player && player.stopVideo) { try { player.stopVideo(); } catch (e) { /* bỏ qua */ } }
    els.playerScreen.classList.add('hidden');
    els.app.classList.remove('hidden');
    showPlayerMsg('');

    if (playback.list === currentVideos()) {
      state.area = 'grid';
      state.cardIndex = playback.index;
    }
    updateFocus();
    updateLimitBadge();
  }

  function updateHudInfo() {
    var v = playback.list[playback.index];
    if (!v) return;
    els.hudTitle.textContent = v.title;
    els.hudMeta.textContent = v.channelTitle + '   ·   ' + (playback.index + 1) + '/' + playback.list.length;
    els.hudFill.style.width = '0%';
    els.hudTime.textContent = '';
  }

  function updateHudProgress() {
    if (!playback.active || !player || !player.getCurrentTime || !player.getDuration) return;
    var cur = player.getCurrentTime() || 0;
    var dur = player.getDuration() || 0;
    els.hudFill.style.width = dur ? (Math.min(100, cur / dur * 100) + '%') : '0%';
    els.hudTime.textContent = dur ? (formatTime(cur) + ' / ' + formatTime(dur)) : '';
  }

  function showHud(stay) {
    els.hud.classList.remove('faded');
    clearTimeout(playback.hudTimer);
    if (stay) return;
    playback.hudTimer = setTimeout(function () {
      if (player && player.getPlayerState && player.getPlayerState() === 2) return;
      els.hud.classList.add('faded');
    }, 4000);
  }

  function showPlayerMsg(msg) {
    els.playerMsg.textContent = msg;
    els.playerMsg.style.display = msg ? 'block' : 'none';
  }

  /* ======================= Giới hạn giờ xem ======================= */

  function limitSeconds() { return (+CONFIG.DAILY_LIMIT_MINUTES || 0) * 60; }

  function today() {
    var d = new Date();
    return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  }

  function readWatch() {
    try {
      var w = JSON.parse(window.localStorage.getItem('kidstube.watch') || 'null');
      if (w && w.date === today()) return w;
    } catch (e) { /* bỏ qua */ }
    return { date: today(), seconds: 0 };
  }

  function writeWatch(w) {
    try { window.localStorage.setItem('kidstube.watch', JSON.stringify(w)); } catch (e) { /* bỏ qua */ }
  }

  function limitReached() {
    var lim = limitSeconds();
    return lim > 0 && readWatch().seconds >= lim;
  }

  function watchTick() {
    if (!playback.active || !player || !player.getPlayerState) return;
    if (player.getPlayerState() !== 1) return;
    var w = readWatch();
    w.seconds += WATCH_TICK;
    writeWatch(w);
    if (limitReached()) {
      try { player.pauseVideo(); } catch (e) { /* bỏ qua */ }
      closePlayer();
      lockForToday();
    }
  }

  function lockForToday() {
    state.locked = true;
    els.tabs.innerHTML = '';
    els.grid.innerHTML = '';
    showStatus('Hôm nay con đã xem đủ giờ rồi.\nNghỉ mắt và mai xem tiếp nhé!', false);
    updateLimitBadge();
  }

  function updateLimitBadge() {
    var lim = limitSeconds();
    if (!lim) { els.limit.textContent = ''; return; }
    var left = Math.max(0, lim - readWatch().seconds);
    els.limit.textContent = 'Còn ' + Math.ceil(left / 60) + ' phút';
  }

  /* ======================= Tiện ích giao diện ======================= */

  function formatTime(sec) {
    sec = Math.floor(sec);
    var h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    var ss = (s < 10 ? '0' : '') + s;
    if (h) return h + ':' + (m < 10 ? '0' : '') + m + ':' + ss;
    return m + ':' + ss;
  }

  function showStatus(msg, isError) {
    els.status.textContent = msg;
    els.status.className = isError ? 'error' : '';
    els.status.style.display = 'block';
  }

  function hideStatus() { els.status.style.display = 'none'; }

  var toastTimer = null;
  function toast(msg, ms) {
    els.toast.textContent = msg;
    els.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { els.toast.classList.remove('show'); }, ms || 2500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, false);
  } else {
    init();
  }
})();
