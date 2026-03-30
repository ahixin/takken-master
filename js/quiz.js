// quiz.js - 問題出題・正誤判定ロジック

const CORRECT_LINES = [
  '正解！さすがだね♡',
  'やったー！合ってたよ♡',
  'すごい！その調子！♡',
  '正解♡ あなたって天才かも！',
  'ナイス！どんどん行こう♡',
];

const WRONG_LINES = [
  'おしい！次は頑張ろう♡',
  '難しかったね。解説読んでみてね♡',
  'ドンマイ！一緒に覚えよう♡',
  'あと少し！絶対わかるようになるよ♡',
  '間違えたところが伸びるチャンス♡',
];

// ===== 間欠強化：レアセリフ（約8%の確率で出現）=====
const RARE_CORRECT_LINES = [
  '✨ えっ待って、天才すぎる…！！♡ 惚れちゃうかも',
  '✨ もう合格確定じゃん！！？♡ すごすぎて震える',
  '✨ 完璧…！！神セリフ出た♡ あなたって最高！',
];
const RARE_WRONG_LINES = [
  '🌟 難しい問題だよ、気にしないで♡ 絶対一緒に覚えようね',
  '🌟 これ引っかけ問題だよ！騙されたんだから♡',
];
const RARE_PROB = 0.08;

function getCharaResponse(isCorrect) {
  if (Math.random() < RARE_PROB) {
    const rare = isCorrect ? RARE_CORRECT_LINES : RARE_WRONG_LINES;
    return rare[Math.floor(Math.random() * rare.length)];
  }
  const lines = isCorrect ? CORRECT_LINES : WRONG_LINES;
  return lines[Math.floor(Math.random() * lines.length)];
}

// 「誤っているもの」「正しいもの」などの指示語を黄色強調
function highlightKeywords(text) {
  const escaped = text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  return escaped.replace(
    /(誤っているもの|誤りであるもの|正しいもの|正しくないもの|適切でないもの|不適切なもの)/g,
    '<mark class="keyword-highlight">$1</mark>'
  );
}

// Fisher-Yatesシャッフル
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

async function loadCards(selectedField) {
  // セッション内キャッシュを優先
  const cached = sessionStorage.getItem('allCards');
  const all = cached ? JSON.parse(cached) : await (await fetch('data/takken_cards.json')).json();
  if (!cached) sessionStorage.setItem('allCards', JSON.stringify(all));

  // 復習モードはSRSの期限カードのみ
  if (selectedField === 'review') {
    const dueIds = new Set(Storage.getDueCards().map(c => c.id));
    return shuffle(all.filter(c => dueIds.has(c.id)));
  }

  // ブックマークモード
  if (selectedField === 'bookmark') {
    const bookmarkIds = new Set(Storage.getBookmarks());
    return shuffle(all.filter(c => bookmarkIds.has(c.id)));
  }

  // 分野フィルタ
  const filtered = selectedField === 'all'
    ? all
    : all.filter(c => c.field === selectedField);

  // 未回答カードを優先
  const progress = Storage.getFieldProgress(selectedField);
  const seenIds  = new Set(progress.seen);
  let unseen     = filtered.filter(c => !seenIds.has(c.id));

  // 未回答が0 = 周回完了 → 次の周へ
  if (unseen.length === 0 && filtered.length > 0) {
    const newLap = Storage.advanceLap(selectedField);
    sessionStorage.setItem('lapAdvanced', newLap);
    unseen = filtered;
  } else {
    sessionStorage.removeItem('lapAdvanced');
  }

  return shuffle(unseen);
}

async function initQuiz() {
  const questionCount  = parseInt(sessionStorage.getItem('questionCount') || '3');
  const currentIndex   = parseInt(sessionStorage.getItem('currentIndex') || '0');
  const selectedField  = sessionStorage.getItem('selectedField') || 'all';

  // 問題リストをsessionStorageから取得 or 新規ロード
  let questions;
  const cached = sessionStorage.getItem('questions');
  if (cached) {
    questions = JSON.parse(cached);
  } else {
    const cards = await loadCards(selectedField);
    // 復習・ブックマークモードは全問出題（制限なし）
    const noLimit = selectedField === 'review' || selectedField === 'bookmark';
    questions = noLimit ? cards : cards.slice(0, questionCount);
    sessionStorage.setItem('questions', JSON.stringify(questions));
  }

  if (currentIndex >= questions.length) {
    window.location.href = 'complete.html';
    return;
  }

  const q = questions[currentIndex];

  // 周回完了バナー（初回問題のみ表示）
  if (currentIndex === 0) {
    const lap = sessionStorage.getItem('lapAdvanced');
    if (lap) {
      const banner = document.getElementById('lap-banner');
      banner.textContent = `🎉 ${parseInt(lap) - 1}周目完了！${lap}周目スタート`;
      banner.style.display = 'block';
      setTimeout(() => banner.style.display = 'none', 3000);
      sessionStorage.removeItem('lapAdvanced');
    }
  }

  // 分野・出典バッジ
  const badge = document.getElementById('field-badge');
  if (badge) badge.textContent = q.field || '';
  const yearBadge = document.getElementById('year-badge');
  if (yearBadge) yearBadge.textContent = q.year || '';

  // 進捗
  document.getElementById('progress').textContent =
    `${currentIndex + 1} / ${questions.length} 問`;

  // 問題文（否定語を黄色強調）
  const ctx = document.getElementById('question-context');
  ctx.innerHTML = highlightKeywords(q.question);
  ctx.classList.add('collapsed');

  // 選択肢
  document.getElementById('choice-text').textContent = q.choice;

  // 展開ボタン
  const expandBtn = document.getElementById('expand-btn');
  expandBtn.textContent = '▼ 問題文を展開';
  expandBtn.onclick = () => {
    const isCollapsed = ctx.classList.toggle('collapsed');
    expandBtn.textContent = isCollapsed ? '▼ 問題文を展開' : '▲ 折りたたむ';
  };

  // ブックマークボタン
  const bookmarkBtn = document.getElementById('bookmark-btn');
  if (bookmarkBtn) {
    bookmarkBtn.textContent = Storage.isBookmarked(q.id) ? '⭐' : '☆';
    bookmarkBtn.onclick = () => {
      const now = Storage.toggleBookmark(q.id);
      bookmarkBtn.textContent = now ? '⭐' : '☆';
    };
  }

  // ○×ボタン
  document.getElementById('btn-true').disabled  = false;
  document.getElementById('btn-false').disabled = false;
  document.getElementById('btn-true').onclick  = () => answer(q, true);
  document.getElementById('btn-false').onclick = () => answer(q, false);
}

function answer(q, userAnswer) {
  document.getElementById('btn-true').disabled  = true;
  document.getElementById('btn-false').disabled = true;

  const isCorrect    = (userAnswer === q.is_answer);
  const currentIndex = parseInt(sessionStorage.getItem('currentIndex') || '0');

  if (isCorrect) {
    const correct = parseInt(sessionStorage.getItem('correctCount') || '0') + 1;
    sessionStorage.setItem('correctCount', correct);
  }

  // 分野別結果をトラッキング（サマリー用）
  const results = JSON.parse(sessionStorage.getItem('questionResults') || '[]');
  results.push({ field: q.field, isCorrect });
  sessionStorage.setItem('questionResults', JSON.stringify(results));

  // 回答済みに記録（復習・ブックマークモード以外）
  const selectedField = sessionStorage.getItem('selectedField') || 'all';
  if (selectedField !== 'review' && selectedField !== 'bookmark') {
    Storage.markCardSeen(selectedField, q.id);
  }

  // SRS更新（復習モード・通常モード共通）
  const srsResult = Storage.updateCardAfterAnswer(q.id, isCorrect);
  if (srsResult) {
    sessionStorage.setItem('lastSRSResult', JSON.stringify(srsResult));
  } else {
    sessionStorage.removeItem('lastSRSResult');
  }

  sessionStorage.setItem('lastCorrect',     isCorrect ? '1' : '0');
  sessionStorage.setItem('lastQuestionId',  q.id);
  sessionStorage.setItem('currentIndex',    currentIndex + 1);
  sessionStorage.setItem('charaLine', getCharaResponse(isCorrect));

  window.location.href = 'result.html';
}

document.addEventListener('DOMContentLoaded', initQuiz);
