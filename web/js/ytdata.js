/*
 * KidsData: tải và lọc video từ YouTube Data API v3.
 * Viết theo ES5 (không arrow function, không async/await, dùng XHR) để chạy được trên TV webOS đời cũ.
 */
var KidsData = (function () {
  'use strict';

  var API_BASE = 'https://www.googleapis.com/youtube/v3/';
  var CACHE_KEY = 'kidstube.library.v1';

  /* ---------- tiện ích ---------- */

  function httpGetJson(url) {
    return new Promise(function (resolve, reject) {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', url, true);
      xhr.timeout = 20000;
      xhr.onload = function () {
        var data = null;
        try { data = JSON.parse(xhr.responseText); } catch (e) { data = null; }
        if (xhr.status >= 200 && xhr.status < 300 && data) {
          resolve(data);
        } else {
          var msg = (data && data.error && data.error.message) || ('HTTP ' + xhr.status);
          var err = new Error(stripTags(msg));
          err.status = xhr.status;
          reject(err);
        }
      };
      xhr.onerror = function () { reject(new Error('Không kết nối được mạng')); };
      xhr.ontimeout = function () { reject(new Error('Mạng quá chậm (hết thời gian chờ)')); };
      xhr.send();
    });
  }

  function stripTags(s) { return String(s).replace(/<[^>]*>/g, ''); }

  function ytGet(endpoint, params) {
    var q = ['key=' + encodeURIComponent(CONFIG.API_KEY)];
    for (var k in params) {
      if (params.hasOwnProperty(k) && params[k] !== undefined && params[k] !== null && params[k] !== '') {
        q.push(k + '=' + encodeURIComponent(params[k]));
      }
    }
    return httpGetJson(API_BASE + endpoint + '?' + q.join('&'));
  }

  function chunk(arr, size) {
    var out = [];
    for (var i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
  }

  function unique(arr) {
    var seen = {}, out = [];
    for (var i = 0; i < arr.length; i++) {
      if (!seen[arr[i]]) { seen[arr[i]] = true; out.push(arr[i]); }
    }
    return out;
  }

  // "PT1H2M3S" -> 3723 giây
  function parseDuration(iso) {
    var m = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(iso || '');
    if (!m) return 0;
    return (+m[1] || 0) * 86400 + (+m[2] || 0) * 3600 + (+m[3] || 0) * 60 + (+m[4] || 0);
  }

  // Chữ thường, bỏ dấu tiếng Việt: "Kinh Dị" -> "kinh di"
  function normalizeText(s) {
    var t = String(s || '').toLowerCase();
    if (t.normalize) t = t.normalize('NFD');
    return t.replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');
  }

  function bestThumb(t) {
    t = t || {};
    var o = t.high || t.medium || t.standard || t['default'];
    return o ? o.url : '';
  }

  function smallThumb(t) {
    t = t || {};
    var o = t['default'] || t.medium || t.high;
    return o ? o.url : '';
  }

  function hash(s) {
    var h = 0;
    for (var i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    return String(h);
  }

  /* ---------- phân tích cấu hình ---------- */

  function parseChannelEntry(entry) {
    var s = String(entry || '').replace(/^\s+|\s+$/g, '');
    if (!s) return null;
    var m = /channel\/(UC[\w-]{22})/.exec(s) || /^(UC[\w-]{22})$/.exec(s);
    if (m) return { type: 'id', value: m[1], raw: s };
    m = /(@[^\/?#\s]+)/.exec(s);
    if (m) {
      var h = m[1];
      try { h = decodeURIComponent(h); } catch (e) { /* giữ nguyên */ }
      return { type: 'handle', value: h, raw: s };
    }
    return { type: 'handle', value: '@' + s, raw: s };
  }

  function parseVideoId(entry) {
    var s = String(entry || '').replace(/^\s+|\s+$/g, '');
    var m = /(?:v=|youtu\.be\/|shorts\/|embed\/|live\/)([\w-]{11})/.exec(s) || /^([\w-]{11})$/.exec(s);
    return m ? m[1] : null;
  }

  function parseVideoIds(list) {
    var out = [];
    (list || []).forEach(function (e) { var id = parseVideoId(e); if (id) out.push(id); });
    return unique(out);
  }

  function makeRules(cfg) {
    var blocked = {};
    parseVideoIds(cfg.BLOCKED_VIDEO_IDS).forEach(function (id) { blocked[id] = true; });
    var keywords = [];
    (cfg.BLOCKED_KEYWORDS || []).forEach(function (k) {
      var n = normalizeText(k).replace(/^\s+|\s+$/g, '');
      if (n) keywords.push(n);
    });
    return {
      blockedIds: blocked,
      keywords: keywords,
      onlyKids: cfg.ONLY_MADE_FOR_KIDS === true,
      minDur: +cfg.MIN_DURATION_SECONDS || 0,
      blockedCount: 0
    };
  }

  /* ---------- gọi API ---------- */

  function toChannel(item) {
    var sn = item.snippet || {};
    var rel = item.contentDetails && item.contentDetails.relatedPlaylists;
    return {
      id: item.id,
      title: sn.title || item.id,
      thumb: smallThumb(sn.thumbnails),
      uploads: (rel && rel.uploads) || ('UU' + item.id.substr(2))
    };
  }

  // Trả về { channels: [...], missing: [chuỗi cấu hình không tìm thấy] }
  function resolveChannels(entries) {
    var parsed = [];
    (entries || []).forEach(function (e) { var p = parseChannelEntry(e); if (p) parsed.push(p); });

    var ids = unique(parsed.filter(function (p) { return p.type === 'id'; })
                           .map(function (p) { return p.value; }));
    var byId = {};
    var idJobs = chunk(ids, 50).map(function (group) {
      return ytGet('channels', { part: 'snippet,contentDetails', id: group.join(','), maxResults: 50 })
        .then(function (r) {
          (r.items || []).forEach(function (it) { byId[it.id] = toChannel(it); });
        });
    });

    return Promise.all(idJobs).then(function () {
      return Promise.all(parsed.map(function (p) {
        if (p.type === 'id') return byId[p.value] || null;
        return ytGet('channels', { part: 'snippet,contentDetails', forHandle: p.value })
          .then(function (r) { return r.items && r.items.length ? toChannel(r.items[0]) : null; });
      }));
    }).then(function (results) {
      var seen = {}, channels = [], missing = [];
      results.forEach(function (ch, i) {
        if (!ch) { missing.push(parsed[i].raw); return; }
        if (seen[ch.id]) return;
        seen[ch.id] = true;
        channels.push(ch);
      });
      return { channels: channels, missing: missing };
    });
  }

  // Lấy ID video mới nhất trong playlist "uploads" của kênh (1 đơn vị quota / 50 video)
  function fetchPlaylistIds(playlistId, max) {
    var acc = [];
    function step(token) {
      return ytGet('playlistItems', {
        part: 'contentDetails', playlistId: playlistId, maxResults: 50, pageToken: token
      }).then(function (r) {
        (r.items || []).forEach(function (it) {
          if (it.contentDetails && it.contentDetails.videoId) acc.push(it.contentDetails.videoId);
        });
        if (r.nextPageToken && acc.length < max) return step(r.nextPageToken);
        return acc.slice(0, max);
      });
    }
    return step('').then(null, function (err) {
      if (err.status === 404) return []; // kênh chưa có video
      throw err;
    });
  }

  function toVideo(it) {
    var sn = it.snippet || {}, st = it.status || {}, cd = it.contentDetails || {};
    return {
      id: it.id,
      title: sn.title || '',
      channelId: sn.channelId || '',
      channelTitle: sn.channelTitle || '',
      thumb: bestThumb(sn.thumbnails),
      publishedAt: sn.publishedAt || '',
      duration: parseDuration(cd.duration),
      live: sn.liveBroadcastContent || 'none',
      embeddable: st.embeddable !== false,
      privacy: st.privacyStatus || 'public',
      madeForKids: st.madeForKids === true,
      ageRestricted: !!(cd.contentRating && cd.contentRating.ytRating === 'ytAgeRestricted'),
      tagsText: (sn.tags || []).join(' ')
    };
  }

  // Chi tiết video (1 đơn vị quota / 50 video)
  function fetchVideos(ids) {
    var jobs = chunk(ids, 50).map(function (group) {
      return ytGet('videos', { part: 'snippet,contentDetails,status', id: group.join(','), maxResults: 50 })
        .then(function (r) { return r.items || []; });
    });
    return Promise.all(jobs).then(function (groups) {
      var out = [];
      groups.forEach(function (items) { items.forEach(function (it) { out.push(toVideo(it)); }); });
      return out;
    });
  }

  /* ---------- lọc ---------- */

  // Trả về lý do bị chặn (chuỗi) hoặc null nếu được phép.
  // strict=false dùng cho video lẻ phụ huynh tự chọn: chỉ kiểm tra kỹ thuật + danh sách chặn.
  function rejectReason(v, rules, strict) {
    if (rules.blockedIds[v.id]) return 'blocked-id';
    if (!v.embeddable) return 'not-embeddable';
    if (v.privacy === 'private') return 'private';
    if (v.ageRestricted) return 'age-restricted';
    if (v.live === 'live' || v.live === 'upcoming') return 'live';
    if (!strict) return null;
    if (rules.onlyKids && !v.madeForKids) return 'not-made-for-kids';
    if (rules.minDur && v.duration && v.duration < rules.minDur) return 'too-short';
    var text = normalizeText(v.title + ' ' + v.tagsText);
    for (var i = 0; i < rules.keywords.length; i++) {
      if (text.indexOf(rules.keywords[i]) !== -1) return 'keyword';
    }
    return null;
  }

  function slim(v) {
    return {
      id: v.id, title: v.title, channelTitle: v.channelTitle,
      thumb: v.thumb, publishedAt: v.publishedAt, duration: v.duration
    };
  }

  function byNewest(a, b) {
    return a.publishedAt < b.publishedAt ? 1 : (a.publishedAt > b.publishedAt ? -1 : 0);
  }

  function loadChannelVideos(ch, rules, max) {
    return fetchPlaylistIds(ch.uploads, max).then(fetchVideos).then(function (videos) {
      var keep = [];
      videos.forEach(function (v) {
        // Chốt chặn thứ hai: video phải thuộc đúng kênh trong danh sách cho phép
        if (v.channelId !== ch.id) { rules.blockedCount++; return; }
        if (rejectReason(v, rules, true)) { rules.blockedCount++; return; }
        keep.push(slim(v));
      });
      keep.sort(byNewest);
      return { id: ch.id, title: ch.title, thumb: ch.thumb, videos: keep };
    });
  }

  function buildLibrary(cfg) {
    var rules = makeRules(cfg);
    var max = +cfg.MAX_VIDEOS_PER_CHANNEL || 100;
    return resolveChannels(cfg.CHANNELS).then(function (res) {
      return Promise.all(res.channels.map(function (ch) {
        return loadChannelVideos(ch, rules, max);
      })).then(function (channels) {
        var pickIds = parseVideoIds(cfg.ALLOWED_VIDEOS);
        var pickJob = pickIds.length ? fetchVideos(pickIds) : Promise.resolve([]);
        return pickJob.then(function (videos) {
          var picks = [];
          videos.forEach(function (v) {
            if (rejectReason(v, rules, false)) { rules.blockedCount++; return; }
            picks.push(slim(v));
          });
          return {
            channels: channels,
            picks: picks,
            missing: res.missing,
            blockedCount: rules.blockedCount
          };
        });
      });
    });
  }

  /* ---------- bộ nhớ đệm ---------- */

  function signature(cfg) {
    return hash(JSON.stringify([
      cfg.API_KEY, cfg.CHANNELS, cfg.ALLOWED_VIDEOS, cfg.BLOCKED_VIDEO_IDS, cfg.BLOCKED_KEYWORDS,
      cfg.ONLY_MADE_FOR_KIDS, cfg.MIN_DURATION_SECONDS, cfg.MAX_VIDEOS_PER_CHANNEL
    ]));
  }

  function readCache() {
    try {
      var raw = window.localStorage.getItem(CACHE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function writeCache(obj) {
    try { window.localStorage.setItem(CACHE_KEY, JSON.stringify(obj)); } catch (e) { /* bỏ qua */ }
  }

  function clearCache() {
    try { window.localStorage.removeItem(CACHE_KEY); } catch (e) { /* bỏ qua */ }
  }

  function loadLibrary(cfg) {
    var sig = signature(cfg);
    var cached = readCache();
    var maxAge = (+cfg.CACHE_HOURS || 6) * 3600 * 1000;
    var sameConfig = cached && cached.sig === sig && cached.data;
    if (sameConfig && (Date.now() - cached.time) < maxAge) {
      return Promise.resolve(cached.data);
    }
    return buildLibrary(cfg).then(function (data) {
      writeCache({ sig: sig, time: Date.now(), data: data });
      return data;
    }, function (err) {
      // Mất mạng / hết quota: dùng tạm dữ liệu cũ nếu cấu hình không đổi
      if (sameConfig) {
        cached.data.stale = true;
        return cached.data;
      }
      throw err;
    });
  }

  return {
    loadLibrary: loadLibrary,
    clearCache: clearCache,
    // xuất thêm để kiểm thử
    _test: {
      parseDuration: parseDuration, normalizeText: normalizeText,
      parseChannelEntry: parseChannelEntry, parseVideoId: parseVideoId,
      makeRules: makeRules, rejectReason: rejectReason
    }
  };
})();
