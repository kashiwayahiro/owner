// 予約フォーム
(function () {
  var form = document.getElementById('booking-form');
  if (!form) return;

  var checkinInput = document.getElementById('checkin');
  var checkoutInput = document.getElementById('checkout');
  var nightsDisplay = document.getElementById('nights-display');
  var successMessage = document.getElementById('success-message');

  // 今日以降の日付のみ選択可能にする
  var today = new Date().toISOString().split('T')[0];
  checkinInput.min = today;
  checkoutInput.min = today;

  // チェックイン変更時にチェックアウトの最小日を更新
  checkinInput.addEventListener('change', function () {
    checkoutInput.min = this.value;
    if (checkoutInput.value && checkoutInput.value <= this.value) {
      checkoutInput.value = '';
    }
    updateNights();
  });

  checkoutInput.addEventListener('change', updateNights);

  function updateNights() {
    var ci = checkinInput.value;
    var co = checkoutInput.value;
    if (!ci || !co) {
      nightsDisplay.classList.remove('visible');
      return;
    }
    var diff = (new Date(co) - new Date(ci)) / 86400000;
    if (diff > 0) {
      nightsDisplay.textContent = '宿泊数: ' + diff + ' 泊';
      nightsDisplay.classList.add('visible');
    } else {
      nightsDisplay.classList.remove('visible');
    }
  }

  // フォーム送信
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    successMessage.classList.remove('hidden');
    form.reset();
    nightsDisplay.classList.remove('visible');
    successMessage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
})();

// 予約一覧フィルター
(function () {
  var filterBtns = document.querySelectorAll('.filter-btn');
  if (!filterBtns.length) return;

  var rows = document.querySelectorAll('#reservations-body tr');
  var countDisplay = document.getElementById('count-display');

  filterBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      filterBtns.forEach(function (b) { b.classList.remove('active'); });
      this.classList.add('active');

      var filter = this.dataset.filter;
      var visible = 0;

      rows.forEach(function (row) {
        var show = filter === 'all' || row.dataset.status === filter;
        row.style.display = show ? '' : 'none';
        if (show) visible++;
      });

      countDisplay.textContent = visible + ' 件を表示中';
    });
  });

  // 初期表示件数
  countDisplay.textContent = rows.length + ' 件を表示中';
})();

// キャンセル操作
function cancelReservation(btn, id) {
  if (!confirm('予約 #' + id + ' をキャンセルしますか？')) return;
  var row = btn.closest('tr');
  var badgeCell = row.cells[7];
  badgeCell.innerHTML = '<span class="badge badge-danger">キャンセル</span>';
  row.dataset.status = 'cancelled';
  btn.parentElement.innerHTML = '<span class="text-xs text-muted">—</span>';
}
