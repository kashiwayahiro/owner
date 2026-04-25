// ============================================================
// 定数・設定
// ============================================================
var TEST_ID = 'testid';
var TEST_PW = 'testpw';
var OWNER_NAME = '山田 太郎';

// 既に予約済みの日付セット（YYYY-MM-DD）
var BOOKED_DATES = new Set([
  '2026-05-10', '2026-05-11', '2026-05-12',
  '2026-05-22', '2026-05-23', '2026-05-24',
  '2026-06-07', '2026-06-08', '2026-06-09', '2026-06-10',
  '2026-07-01', '2026-07-02',
]);

// ============================================================
// ユーティリティ
// ============================================================
function padZ(n) { return n < 10 ? '0' + n : String(n); }
function dateToStr(d) {
  return d.getFullYear() + '-' + padZ(d.getMonth() + 1) + '-' + padZ(d.getDate());
}
function strToDate(s) {
  var p = s.split('-');
  return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
}
function daysBetween(start, end) {
  return Math.round((strToDate(end) - strToDate(start)) / 86400000);
}
function formatDateJa(s) {
  var p = s.split('-');
  return p[0] + '年' + Number(p[1]) + '月' + Number(p[2]) + '日';
}
function hasBookedInRange(start, end) {
  var cur = strToDate(start);
  var endD = strToDate(end);
  while (cur < endD) {
    if (BOOKED_DATES.has(dateToStr(cur))) return true;
    cur.setDate(cur.getDate() + 1);
  }
  return false;
}
function getRemainingDays() {
  var v = sessionStorage.getItem('remainingDays');
  return v !== null ? Number(v) : 14;
}
function setRemainingDays(n) {
  sessionStorage.setItem('remainingDays', String(n));
}

// ============================================================
// 認証
// ============================================================
function requireLogin(basePath) {
  if (!sessionStorage.getItem('loggedIn')) {
    window.location.href = basePath + 'index.html';
  }
}
function logout() {
  sessionStorage.removeItem('loggedIn');
  // パスの深さを確認して正しいindexへ
  var isInPages = window.location.pathname.includes('/pages/');
  window.location.href = isInPages ? '../index.html' : 'index.html';
}

// ============================================================
// ログインページ
// ============================================================
(function loginPage() {
  var form = document.getElementById('login-form');
  if (!form) return;

  // すでにログイン済みならトップへ
  if (sessionStorage.getItem('loggedIn')) {
    window.location.href = 'pages/top.html';
    return;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var id = document.getElementById('username').value.trim();
    var pw = document.getElementById('password').value;
    var errEl = document.getElementById('login-error');

    if (id === TEST_ID && pw === TEST_PW) {
      sessionStorage.setItem('loggedIn', 'true');
      sessionStorage.setItem('ownerName', OWNER_NAME);
      window.location.href = 'pages/top.html';
    } else {
      errEl.textContent = 'IDまたはパスワードが正しくありません。';
      document.getElementById('password').value = '';
    }
  });
})();

// ============================================================
// トップページ
// ============================================================
(function topPage() {
  if (!document.getElementById('cal-grid')) return;
  requireLogin('../');

  // オーナー名表示
  var nameEl = document.getElementById('owner-name');
  if (nameEl) nameEl.textContent = sessionStorage.getItem('ownerName') || '';

  // 残り日数表示
  var remEl = document.getElementById('remaining-days-num');
  if (remEl) remEl.textContent = getRemainingDays();

  // カレンダー状態
  var today = dateToStr(new Date());
  var viewYear = new Date().getFullYear();
  var viewMonth = new Date().getMonth(); // 0-indexed
  var selStart = null;
  var selEnd = null;
  var hoverDate = null;

  function render() {
    var label = document.getElementById('cal-month-label');
    label.textContent = viewYear + '年 ' + (viewMonth + 1) + '月';

    var grid = document.getElementById('cal-grid');
    grid.innerHTML = '';

    // 曜日ヘッダー
    var wdays = ['日', '月', '火', '水', '木', '金', '土'];
    wdays.forEach(function (d) {
      var cell = document.createElement('div');
      cell.className = 'cal-weekday';
      cell.textContent = d;
      grid.appendChild(cell);
    });

    // 月の最初の曜日（空セル）
    var firstDay = new Date(viewYear, viewMonth, 1).getDay();
    for (var i = 0; i < firstDay; i++) {
      var blank = document.createElement('div');
      blank.className = 'cal-day empty';
      grid.appendChild(blank);
    }

    // 日付セル
    var daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    for (var d = 1; d <= daysInMonth; d++) {
      var dateStr = viewYear + '-' + padZ(viewMonth + 1) + '-' + padZ(d);
      var cell = document.createElement('div');
      cell.className = 'cal-day';
      cell.textContent = d;
      cell.dataset.date = dateStr;
      cell.setAttribute('role', 'gridcell');

      var classes = ['cal-day'];

      if (dateStr === today) classes.push('today');

      if (dateStr < today) {
        classes.push('past');
        cell.setAttribute('aria-disabled', 'true');
      } else if (BOOKED_DATES.has(dateStr)) {
        classes.push('booked');
        cell.setAttribute('aria-label', d + '日 予約済み');
      } else {
        // 選択状態
        if (selStart && selEnd) {
          if (dateStr === selStart) classes.push('selected-start');
          else if (dateStr === selEnd) classes.push('selected-end');
          else if (dateStr > selStart && dateStr < selEnd) classes.push('in-range');
        } else if (selStart && !selEnd) {
          if (dateStr === selStart) classes.push('selected-start');
          else if (hoverDate && dateStr > selStart && dateStr <= hoverDate) {
            classes.push('hover-range');
          }
        }
        cell.addEventListener('click', onDateClick);
        cell.addEventListener('mouseenter', onDateHover);
      }

      cell.className = classes.join(' ');
      grid.appendChild(cell);
    }

    updateFooter();
  }

  function onDateClick() {
    var dateStr = this.dataset.date;
    var errEl = document.getElementById('cal-error');
    errEl.classList.add('hidden');
    errEl.textContent = '';

    if (!selStart || (selStart && selEnd)) {
      selStart = dateStr;
      selEnd = null;
    } else {
      if (dateStr <= selStart) {
        selStart = dateStr;
        selEnd = null;
      } else {
        if (hasBookedInRange(selStart, dateStr)) {
          errEl.textContent = '選択した期間内に予約済みの日程が含まれています。';
          errEl.classList.remove('hidden');
          return;
        }
        var nights = daysBetween(selStart, dateStr);
        if (nights > getRemainingDays()) {
          errEl.textContent = '残り宿泊可能日数（' + getRemainingDays() + '泊）を超えています。';
          errEl.classList.remove('hidden');
          return;
        }
        selEnd = dateStr;
      }
    }
    render();
  }

  function onDateHover() {
    if (selStart && !selEnd) {
      hoverDate = this.dataset.date;
      render();
    }
  }

  function updateFooter() {
    var infoEl = document.getElementById('selection-info');
    var btnEl = document.getElementById('reserve-btn');

    if (!selStart) {
      infoEl.innerHTML = 'チェックイン日を選択してください';
      btnEl.classList.add('hidden');
    } else if (!selEnd) {
      infoEl.innerHTML = '<strong>' + formatDateJa(selStart) + '</strong>チェックアウト日を選択してください';
      btnEl.classList.add('hidden');
    } else {
      var nights = daysBetween(selStart, selEnd);
      infoEl.innerHTML =
        '<strong>' + formatDateJa(selStart) + ' → ' + formatDateJa(selEnd) + '</strong>' +
        nights + '泊';
      btnEl.classList.remove('hidden');
    }
  }

  // 月ナビゲーション
  document.getElementById('cal-prev').addEventListener('click', function () {
    if (viewMonth === 0) { viewMonth = 11; viewYear--; }
    else viewMonth--;
    selStart = null; selEnd = null; hoverDate = null;
    render();
  });
  document.getElementById('cal-next').addEventListener('click', function () {
    if (viewMonth === 11) { viewMonth = 0; viewYear++; }
    else viewMonth++;
    selStart = null; selEnd = null; hoverDate = null;
    render();
  });

  // マウスが外れたらホバー解除
  document.getElementById('cal-grid').addEventListener('mouseleave', function () {
    if (selStart && !selEnd) {
      hoverDate = null;
      render();
    }
  });

  window.goToConfirm = function () {
    if (!selStart || !selEnd) return;
    sessionStorage.setItem('booking', JSON.stringify({
      checkin: selStart,
      checkout: selEnd,
      nights: daysBetween(selStart, selEnd)
    }));
    window.location.href = 'booking-confirm.html';
  };

  render();
})();

// ============================================================
// 予約確認ページ
// ============================================================
(function confirmPage() {
  if (!document.getElementById('confirm-view')) return;
  requireLogin('../');

  // オーナー名表示
  var nameEl = document.getElementById('owner-name');
  if (nameEl) nameEl.textContent = sessionStorage.getItem('ownerName') || '';

  var booking = JSON.parse(sessionStorage.getItem('booking') || 'null');
  if (!booking) {
    window.location.href = 'top.html';
    return;
  }

  document.getElementById('disp-checkin').textContent = formatDateJa(booking.checkin);
  document.getElementById('disp-checkout').textContent = formatDateJa(booking.checkout);
  document.getElementById('disp-nights').textContent = booking.nights;

  window.confirmBooking = function () {
    // 残り日数を減算して保存
    var remaining = getRemainingDays() - booking.nights;
    setRemainingDays(Math.max(0, remaining));

    // 予約日を既予約セットに追加（実際はサーバー保存）
    var cur = strToDate(booking.checkin);
    var endD = strToDate(booking.checkout);
    while (cur < endD) {
      BOOKED_DATES.add(dateToStr(cur));
      cur.setDate(cur.getDate() + 1);
    }

    sessionStorage.removeItem('booking');

    document.getElementById('confirm-view').classList.add('hidden');
    document.getElementById('success-view').classList.remove('hidden');
  };
})();
