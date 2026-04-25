// ============================================================
// 定数
// ============================================================
var TEST_ID  = 'testid';
var TEST_PW  = 'testpw';
var OWNER_NAME = '山田 太郎 様';
var TOTAL_NIGHTS = 20; // 年間付与日数

// 予約済み日付（YYYY-MM-DD）
var BOOKED = new Set([
  '2026-05-08','2026-05-09','2026-05-10',
  '2026-05-20','2026-05-21','2026-05-22','2026-05-23',
  '2026-06-05','2026-06-06','2026-06-07','2026-06-08',
  '2026-07-10','2026-07-11',
]);

// ============================================================
// ユーティリティ
// ============================================================
function padZ(n) { return n < 10 ? '0' + n : '' + n; }
function toStr(d) {
  return d.getFullYear() + '-' + padZ(d.getMonth()+1) + '-' + padZ(d.getDate());
}
function toDate(s) {
  var p = s.split('-');
  return new Date(+p[0], +p[1]-1, +p[2]);
}
function diffDays(a, b) {
  return Math.round((toDate(b) - toDate(a)) / 86400000);
}
function fmtJa(s) {
  var p = s.split('-');
  return p[0] + '年' + +p[1] + '月' + +p[2] + '日';
}
function hasBooked(start, end) {
  var cur = toDate(start);
  var e   = toDate(end);
  while (cur < e) {
    if (BOOKED.has(toStr(cur))) return true;
    cur.setDate(cur.getDate()+1);
  }
  return false;
}
function getRemaining() {
  var v = sessionStorage.getItem('remaining');
  return v !== null ? +v : 14;
}
function setRemaining(n) {
  sessionStorage.setItem('remaining', '' + Math.max(0, n));
}

// ============================================================
// 認証
// ============================================================
function requireAuth(root) {
  if (!sessionStorage.getItem('loggedIn')) {
    window.location.href = root + 'index.html';
  }
}
function logout() {
  sessionStorage.removeItem('loggedIn');
  var inPages = window.location.pathname.includes('/pages/');
  window.location.href = inPages ? '../index.html' : 'index.html';
}
function showOwnerName() {
  var el = document.getElementById('owner-name');
  if (el) el.textContent = sessionStorage.getItem('ownerName') || '';
}

// ============================================================
// ログインページ
// ============================================================
(function initLogin() {
  var form = document.getElementById('login-form');
  if (!form) return;

  if (sessionStorage.getItem('loggedIn')) {
    window.location.href = 'pages/top.html';
    return;
  }

  form.addEventListener('submit', function(e) {
    e.preventDefault();
    var id = document.getElementById('username').value.trim();
    var pw = document.getElementById('password').value;
    var err = document.getElementById('login-error');

    if (id === TEST_ID && pw === TEST_PW) {
      sessionStorage.setItem('loggedIn', 'true');
      sessionStorage.setItem('ownerName', OWNER_NAME);
      window.location.href = 'pages/top.html';
    } else {
      err.textContent = 'IDまたはパスワードが正しくありません。';
      document.getElementById('password').value = '';
      document.getElementById('password').focus();
    }
  });
})();

// ============================================================
// トップページ（カレンダー）
// ============================================================
(function initTop() {
  if (!document.getElementById('cal-grid')) return;
  requireAuth('../');
  showOwnerName();

  // 残り日数表示
  var remaining = getRemaining();
  var numEl = document.getElementById('remaining-days-num');
  if (numEl) numEl.textContent = remaining;
  var bar = document.getElementById('nights-progress-fill');
  if (bar) bar.style.width = Math.round(remaining / TOTAL_NIGHTS * 100) + '%';

  var today    = toStr(new Date());
  var viewYear = new Date().getFullYear();
  var viewMon  = new Date().getMonth(); // 0-based
  var selStart = null;
  var selEnd   = null;
  var hoverD   = null;

  // ---- 描画 ----
  function render() {
    // 月ラベル
    document.getElementById('cal-month-label').textContent =
      viewYear + '年 ' + (viewMon+1) + '月';

    var grid = document.getElementById('cal-grid');
    grid.innerHTML = '';

    // 曜日ヘッダー
    ['日','月','火','水','木','金','土'].forEach(function(d) {
      var h = document.createElement('div');
      h.className = 'cal-weekday';
      h.textContent = d;
      grid.appendChild(h);
    });

    // 空白セル
    var firstDow = new Date(viewYear, viewMon, 1).getDay();
    for (var i = 0; i < firstDow; i++) {
      var b = document.createElement('div');
      b.className = 'cal-day empty';
      b.setAttribute('aria-hidden', 'true');
      grid.appendChild(b);
    }

    // 日付セル
    var lastDay = new Date(viewYear, viewMon+1, 0).getDate();
    for (var d = 1; d <= lastDay; d++) {
      var ds = viewYear + '-' + padZ(viewMon+1) + '-' + padZ(d);
      var cell = document.createElement('div');
      cell.setAttribute('role', 'gridcell');
      cell.dataset.date = ds;

      var cls = ['cal-day'];
      var isPast   = ds < today;
      var isBooked = BOOKED.has(ds);
      var isToday  = ds === today;

      if (isPast)        { cls.push('past'); cell.setAttribute('aria-disabled','true'); }
      else if (isBooked) { cls.push('booked'); cell.setAttribute('aria-label', d+'日 予約済み'); }
      else {
        // 選択状態
        if (selStart && selEnd) {
          if      (ds === selStart)                   cls.push('selected-start');
          else if (ds === selEnd)                     cls.push('selected-end');
          else if (ds > selStart && ds < selEnd)      cls.push('in-range');
        } else if (selStart && !selEnd) {
          if (ds === selStart)                        cls.push('selected-start');
          else if (hoverD && ds > selStart && ds <= hoverD) cls.push('hover-range');
        }

        cell.addEventListener('click', onDateClick);
        cell.addEventListener('mouseenter', onHover);
        cell.setAttribute('tabindex', '0');
        cell.setAttribute('role', 'button');
        cell.setAttribute('aria-label', d + '日');
        cell.addEventListener('keydown', function(e) {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onDateClick.call(this);
          }
        });
      }

      if (isToday) cls.push('today');
      cell.className = cls.join(' ');
      cell.textContent = d;
      grid.appendChild(cell);
    }

    updateFooter();
  }

  // ---- 日付クリック ----
  function onDateClick() {
    var ds  = this.dataset.date;
    var err = document.getElementById('cal-error');
    err.classList.add('hidden');
    err.textContent = '';

    if (!selStart || (selStart && selEnd)) {
      // 新規選択開始
      selStart = ds;
      selEnd   = null;
    } else {
      if (ds <= selStart) {
        selStart = ds;
        selEnd   = null;
      } else {
        // 終了日の確定（バリデーション）
        if (hasBooked(selStart, ds)) {
          err.textContent = '選択した期間に予約済みの日程が含まれています。';
          err.classList.remove('hidden');
          return;
        }
        var nights = diffDays(selStart, ds);
        if (nights > getRemaining()) {
          err.textContent = '残り宿泊可能日数（' + getRemaining() + '泊）を超えています。';
          err.classList.remove('hidden');
          return;
        }
        selEnd = ds;
      }
    }
    hoverD = null;
    render();
  }

  // ---- ホバープレビュー ----
  function onHover() {
    if (selStart && !selEnd) {
      hoverD = this.dataset.date;
      render();
    }
  }

  document.getElementById('cal-grid').addEventListener('mouseleave', function() {
    if (selStart && !selEnd && hoverD) {
      hoverD = null;
      render();
    }
  });

  // ---- フッター更新 ----
  function updateFooter() {
    var startEl  = document.getElementById('disp-start');
    var endEl    = document.getElementById('disp-end');
    var nightsEl = document.getElementById('disp-nights');
    var btnEl    = document.getElementById('reserve-btn');
    var stickyBar = document.getElementById('sticky-bar');
    var step1 = document.getElementById('step1');
    var step2 = document.getElementById('step2');
    var step3 = document.getElementById('step3');

    // placeholder クラスのリセット
    startEl.className = 'cal-date-chip-value placeholder';
    endEl.className   = 'cal-date-chip-value placeholder';
    startEl.textContent = '—';
    endEl.textContent   = '—';
    nightsEl.classList.add('hidden');
    btnEl.classList.add('hidden');
    if (stickyBar) stickyBar.classList.add('hidden');

    // ステップ更新
    [step1, step2, step3].forEach(function(s) {
      s.classList.remove('active','done');
    });

    if (!selStart) {
      step1.classList.add('active');
    } else if (!selEnd) {
      startEl.className  = 'cal-date-chip-value';
      startEl.textContent = fmtJa(selStart);
      step1.classList.add('done');
      step2.classList.add('active');
    } else {
      var nights = diffDays(selStart, selEnd);
      startEl.className  = 'cal-date-chip-value';
      startEl.textContent = fmtJa(selStart);
      endEl.className    = 'cal-date-chip-value';
      endEl.textContent   = fmtJa(selEnd);
      nightsEl.textContent = nights + '泊';
      nightsEl.classList.remove('hidden');
      btnEl.classList.remove('hidden');

      step1.classList.add('done');
      step2.classList.add('done');
      step3.classList.add('active');

      // モバイル用スティッキーバー
      if (stickyBar) {
        stickyBar.classList.remove('hidden');
        document.getElementById('sticky-dates').textContent =
          fmtJa(selStart) + ' → ' + fmtJa(selEnd);
        document.getElementById('sticky-nights').textContent = '（' + nights + '泊）';
      }
    }
  }

  // ---- 月ナビ ----
  document.getElementById('cal-prev').addEventListener('click', function() {
    if (viewMon === 0) { viewMon = 11; viewYear--; }
    else viewMon--;
    selStart = selEnd = hoverD = null;
    render();
  });
  document.getElementById('cal-next').addEventListener('click', function() {
    if (viewMon === 11) { viewMon = 0; viewYear++; }
    else viewMon++;
    selStart = selEnd = hoverD = null;
    render();
  });

  // ---- 予約へ進む ----
  window.goToConfirm = function() {
    if (!selStart || !selEnd) return;
    sessionStorage.setItem('booking', JSON.stringify({
      checkin:  selStart,
      checkout: selEnd,
      nights:   diffDays(selStart, selEnd),
    }));
    window.location.href = 'booking-confirm.html';
  };

  render();
})();

// ============================================================
// 予約確認ページ
// ============================================================
(function initConfirm() {
  if (!document.getElementById('confirm-view')) return;
  requireAuth('../');
  showOwnerName();

  var booking = JSON.parse(sessionStorage.getItem('booking') || 'null');
  if (!booking) { window.location.href = 'top.html'; return; }

  var remaining = getRemaining();

  document.getElementById('disp-checkin').textContent  = fmtJa(booking.checkin);
  document.getElementById('disp-checkout').textContent = fmtJa(booking.checkout);
  document.getElementById('disp-nights').textContent   = booking.nights;
  document.getElementById('disp-remaining').textContent =
    (remaining - booking.nights) + ' 泊';

  window.confirmBooking = function() {
    setRemaining(remaining - booking.nights);
    sessionStorage.removeItem('booking');
    document.getElementById('confirm-view').classList.add('hidden');
    document.getElementById('success-view').classList.remove('hidden');
  };
})();
