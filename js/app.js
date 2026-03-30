// app.js - ホーム画面のメインロジック

// キャラクターのセリフ定義
const CHARA_LINES = {
  day1:    '初めまして♡ 一緒に頑張ろう！',
  day2:    'また来てくれた！嬉しい♡',
  day3:    '3日連続！すごいじゃん！',
  day7:    '【1週間達成！】あなたって本当にすごいね♡',
  day30:   '【1ヶ月達成！】もうあなたなしじゃいられない♡',
  reset:   '待ってたよ...また最初から一緒に頑張ろう♡',
  default: '今日も来てくれたんだね♡ 頑張ろう！',
  completed: '今日はもうおわったよ♡ また明日ね！',
};

function getCharaLine(streakDays, todayCompleted, isReset) {
  if (todayCompleted) return CHARA_LINES.completed;
  if (isReset) return CHARA_LINES.reset;
  if (streakDays === 1) return CHARA_LINES.day1;
  if (streakDays === 2) return CHARA_LINES.day2;
  if (streakDays === 3) return CHARA_LINES.day3;
  if (streakDays === 7) return CHARA_LINES.day7;
  if (streakDays === 30) return CHARA_LINES.day30;
  return CHARA_LINES.default;
}

function renderHome() {
  let data = Storage.load();
  const wasStreak = data.streakDays;
  data = Storage.updateStreak(data);
  Storage.save(data);

  const isReset = wasStreak > 1 && data.streakDays === 1 && data.lastLoginDate === Storage.today();
  const questionCount = Storage.getTodayQuestionCount(data.streakDays);

  // 連続日数表示
  document.getElementById('streak-display').textContent =
    data.streakDays > 0 ? `🔥 ${data.streakDays}日連続！` : '今日から始めよう！';

  // 問題数表示
  document.getElementById('question-count').textContent =
    (data.todayCompleted && !Storage.DEBUG_MODE) ? '今日のノルマ完了 ✅' : `今日は ${questionCount} 問`;

  // キャラ表示（アンロック済みキャラに切替）
  const charaId  = Storage.getActiveCharaId(data.streakDays);
  const charaEl  = document.getElementById('chara-image');
  const holder   = document.getElementById('chara-placeholder');
  if (charaEl) {
    charaEl.src = `images/chara_0${charaId}.png`;
    charaEl.onerror = () => {
      charaEl.style.display = 'none';
      if (holder) holder.textContent = Storage.CHARA_EMOJI[charaId] || '🧑‍🎓';
    };
  }

  // キャラアンロックチェック（新規解禁があればバナー表示）
  const newUnlocks = Storage.checkCharaUnlock(data.streakDays);
  if (newUnlocks.length > 0) showUnlockBanner(newUnlocks[0]);

  // セリフ
  document.getElementById('chara-line').textContent =
    getCharaLine(data.streakDays, data.todayCompleted, isReset);

  // スタートボタン
  const btn = document.getElementById('start-btn');
  if (data.todayCompleted && !Storage.DEBUG_MODE) {
    btn.disabled = true;
    btn.textContent = '今日はおわり♡';
    btn.classList.add('btn-disabled');
  } else {
    btn.disabled = false;
    btn.textContent = '今日も始める';
    btn.onclick = () => {
      // セッション情報をsessionStorageに保存してquiz.htmlへ
      sessionStorage.setItem('questionCount', questionCount);
      sessionStorage.setItem('currentIndex', 0);
      sessionStorage.setItem('correctCount', 0);
      window.location.href = 'field.html';
    };
  }
}

function renderReviewBtn() {
  const btn = document.getElementById('review-btn');
  if (!btn) return;
  const dueCount   = Storage.getDueCards().length;
  const totalWrong = Storage.getWrongCards().length;
  if (totalWrong === 0) return;

  btn.style.display = 'flex';
  const badge = document.getElementById('review-count');
  if (dueCount > 0) {
    badge.textContent = `今日 ${dueCount}問`;
    badge.className = 'review-count-badge due';
    btn.disabled = false;
  } else {
    badge.textContent = `待機中 ${totalWrong}問`;
    badge.className = 'review-count-badge waiting';
    btn.disabled = true;
  }

  btn.onclick = () => {
    sessionStorage.setItem('selectedField', 'review');
    sessionStorage.setItem('questionCount', dueCount);
    sessionStorage.setItem('currentIndex', 0);
    sessionStorage.setItem('correctCount', 0);
    sessionStorage.removeItem('questions');
    sessionStorage.removeItem('questionResults');
    window.location.href = 'quiz.html';
  };
}

function renderTaskCard() {
  const el = document.getElementById('task-card');
  if (!el) return;
  const data = Storage.load();
  const newCount    = Storage.getTodayQuestionCount(data.streakDays);
  const reviewCount = Storage.getDueCards().length;

  const seenCount  = Storage.getSeenCount();
  const totalCards = Storage.TOTAL_CARDS;
  const pct        = Math.round(seenCount / totalCards * 100);

  el.style.display = 'block';

  if (data.todayCompleted && !Storage.DEBUG_MODE) {
    el.innerHTML = `
      <div class="task-card-done">✅ 今日のノルマ達成！</div>
      <div class="task-progress-row">
        <span class="task-progress-label">全体進捗 ${pct}%（${seenCount}/${totalCards}問）</span>
        <div class="task-progress-bar"><div class="task-progress-fill" style="width:${pct}%"></div></div>
      </div>`;
  } else {
    el.innerHTML = `
      <div class="task-card-title">今日のタスク</div>
      <div class="task-items">
        <div class="task-item"><span class="task-icon">📖</span>新規問題 <strong>${newCount}問</strong></div>
        ${reviewCount > 0
          ? `<div class="task-item task-item-review"><span class="task-icon">🔁</span>要復習 <strong>${reviewCount}問</strong></div>`
          : ''}
      </div>
      <div class="task-progress-row">
        <span class="task-progress-label">全体進捗 ${pct}%（${seenCount}/${totalCards}問）</span>
        <div class="task-progress-bar"><div class="task-progress-fill" style="width:${pct}%"></div></div>
      </div>`;
  }
}

function renderCountdown() {
  const el = document.getElementById('countdown-section');
  if (!el) return;

  // 試験日（localStorage でカスタム設定可能）
  const savedDate = localStorage.getItem('examDate') || '2026-10-18';
  const EXAM_DATE = new Date(savedDate);
  const today     = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.ceil((EXAM_DATE - today) / (1000 * 60 * 60 * 24));
  if (days < 0) return;

  const totalDays = Math.ceil((EXAM_DATE - new Date('2026-01-01')) / (1000 * 60 * 60 * 24));
  const elapsed   = Math.max(0, totalDays - days);
  const barPct    = Math.min(100, Math.round(elapsed / totalDays * 100));

  // ペース診断
  const seenCount  = Storage.getSeenCount();
  const totalCards = Storage.TOTAL_CARDS;
  const needed     = totalCards - seenCount;
  const pacePerDay = days > 0 ? Math.ceil(needed / days) : needed;
  const data       = Storage.load();
  const streak     = data.streakDays || 1;
  const currentPace = streak > 0 ? Math.round(seenCount / streak) : 0;
  const projPct    = days > 0
    ? Math.min(100, Math.round((seenCount + currentPace * days) / totalCards * 100))
    : Math.round(seenCount / totalCards * 100);

  let paceMsg, paceClass;
  if (seenCount === 0) {
    paceMsg  = `あと毎日 <strong>${pacePerDay}問</strong> で全問カバーできます`;
    paceClass = 'pace-neutral';
  } else if (projPct >= 100) {
    paceMsg  = `✅ このペースなら試験前に全問カバーできます！`;
    paceClass = 'pace-good';
  } else if (projPct >= 70) {
    paceMsg  = `📈 試験まで約 <strong>${projPct}%</strong> カバー見込み（あと毎日+${pacePerDay}問で全カバー）`;
    paceClass = 'pace-ok';
  } else {
    paceMsg  = `⚠️ 試験まで約 <strong>${projPct}%</strong> 見込み。毎日 <strong>${pacePerDay}問</strong> を目標に！`;
    paceClass = 'pace-warn';
  }

  el.innerHTML = `
    <div class="countdown-label">試験まで <strong class="countdown-days">${days}日</strong></div>
    <div class="countdown-bar"><div class="countdown-fill" style="width:${barPct}%"></div></div>
    <div class="pace-diagnosis ${paceClass}">${paceMsg}</div>`;
}

function showUnlockBanner(charaId) {
  const el = document.getElementById('unlock-banner');
  if (!el) return;
  const msgs = {
    2: '🎉 7日連続達成！新キャラ解禁！',
    3: '🎉 30日連続達成！レアキャラ解禁！',
  };
  el.textContent = msgs[charaId] || '🎉 新キャラ解禁！';
  el.style.display = 'block';
  setTimeout(() => { el.style.display = 'none'; }, 5000);
}

document.addEventListener('DOMContentLoaded', () => {
  renderHome();
  renderReviewBtn();
  renderTaskCard();
  renderCountdown();

  // Service Worker 登録
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
});
