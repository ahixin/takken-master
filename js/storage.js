// storage.js - LocalStorage操作を一元管理

const Storage = {
  KEY: 'qualificationApp',

  // デフォルト値
  defaults: {
    lastLoginDate: null,
    streakDays: 0,
    todayCompleted: false,
    totalCorrect: 0,
    totalAnswered: 0,
    wrongCards: [],
    progress: {},  // { fieldKey: { lap: 1, seen: [cardId, ...] } }
    unlockedCharas: [1],  // 解禁済みキャラID
    maxStreak: 0,         // 最長連続日数
  },

  // 全データ取得
  load() {
    const raw = localStorage.getItem(this.KEY);
    if (!raw) return { ...this.defaults };
    return { ...this.defaults, ...JSON.parse(raw) };
  },

  // 全データ保存
  save(data) {
    localStorage.setItem(this.KEY, JSON.stringify(data));
  },

  // 今日の日付文字列（YYYY-MM-DD）
  today() {
    return new Date().toISOString().slice(0, 10);
  },

  // 連続日数の更新ロジック
  updateStreak(data) {
    const today = this.today();

    if (data.lastLoginDate === today) {
      // 今日すでに記録済み → 何もしない
      return data;
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    if (data.lastLoginDate === yesterdayStr) {
      // 昨日ログイン済み → 連続+1
      data.streakDays = (data.streakDays || 0) + 1;
    } else if (data.lastLoginDate === null) {
      // 初回
      data.streakDays = 1;
    } else {
      // 途切れた → リセット
      data.streakDays = 1;
    }

    data.lastLoginDate = today;
    data.todayCompleted = false;
    return data;
  },

  // 今日の問題数を計算
  // DEBUG_MODE=true の間は上限なし（デバッグ用）
  DEBUG_MODE: true,
  DEBUG_QUESTION_COUNT: 50,

  getTodayQuestionCount(streakDays) {
    if (this.DEBUG_MODE) return this.DEBUG_QUESTION_COUNT;
    if (streakDays <= 1) return 3;
    if (streakDays >= 30) return 10;
    return Math.min(streakDays + 2, 10);
  },

  // ===== ブックマーク =====
  TOTAL_CARDS: 1692,

  toggleBookmark(cardId) {
    const data = this.load();
    const set = new Set(data.bookmarks || []);
    if (set.has(cardId)) { set.delete(cardId); } else { set.add(cardId); }
    data.bookmarks = [...set];
    this.save(data);
    return set.has(cardId);
  },

  getBookmarks() { return this.load().bookmarks || []; },

  isBookmarked(cardId) { return (this.load().bookmarks || []).includes(cardId); },

  // 回答済みカード数（分野合計）
  getSeenCount() {
    const data = this.load();
    const prog = data.progress || {};
    const fields = ['権利関係', '宅建業法', '法令上の制限', '税・その他'];
    return fields.reduce((sum, f) => sum + (prog[f]?.seen?.length || 0), 0);
  },

  // ===== 周回管理 =====

  // 分野の進捗を取得
  getFieldProgress(field) {
    const data = this.load();
    return ((data.progress || {})[field]) || { lap: 1, seen: [] };
  },

  // カードを「回答済み」に記録
  markCardSeen(field, cardId) {
    const data = this.load();
    if (!data.progress) data.progress = {};
    if (!data.progress[field]) data.progress[field] = { lap: 1, seen: [] };
    const seen = data.progress[field].seen;
    if (!seen.includes(cardId)) seen.push(cardId);
    this.save(data);
  },

  // 周回を進める（seen をリセットして lap++ ）
  advanceLap(field) {
    const data = this.load();
    if (!data.progress) data.progress = {};
    if (!data.progress[field]) data.progress[field] = { lap: 1, seen: [] };
    data.progress[field].lap += 1;
    data.progress[field].seen = [];
    this.save(data);
    return data.progress[field].lap;
  },

  // SRS設定（忘却曲線ベース）
  // レベル別の次回復習までの日数
  SRS_INTERVALS: [1, 3, 7, 14, 30],
  MASTERED_LEVEL: 5,

  // 日付にN日加算した文字列を返す
  addDays(days) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  },

  // 正解・不正解に応じてSRSを更新
  // 返り値: { level, nextReview, mastered } or null
  updateCardAfterAnswer(cardId, isCorrect) {
    const data = this.load();
    const cards = data.wrongCards || [];
    const today = this.today();
    const idx = cards.findIndex(c => c.id === cardId);

    if (isCorrect) {
      if (idx === -1) return null; // 復習リストにないカードは何もしない
      const card = cards[idx];
      const newLevel = card.level + 1;
      if (newLevel >= this.MASTERED_LEVEL) {
        cards.splice(idx, 1);
        data.wrongCards = cards;
        this.save(data);
        return { mastered: true, prevLevel: card.level };
      }
      card.level = newLevel;
      card.nextReview = this.addDays(this.SRS_INTERVALS[newLevel - 1]);
      data.wrongCards = cards;
      this.save(data);
      return { mastered: false, level: newLevel, nextReview: card.nextReview };
    } else {
      // 不正解: レベルリセット・今日中に再確認
      if (idx === -1) {
        cards.push({ id: cardId, level: 0, nextReview: today });
      } else {
        cards[idx].level = 0;
        cards[idx].nextReview = today;
      }
      data.wrongCards = cards;
      this.save(data);
      return { mastered: false, level: 0, nextReview: today };
    }
  },

  // 今日が期限のカード（復習すべき）
  getDueCards() {
    const today = this.today();
    return (this.load().wrongCards || []).filter(c => c.nextReview <= today);
  },

  // 全間違いカード
  getWrongCards() {
    return this.load().wrongCards || [];
  },

  // セッション完了を記録
  completeToday(data, correct, total) {
    data.todayCompleted = true;
    data.totalCorrect = (data.totalCorrect || 0) + correct;
    data.totalAnswered = (data.totalAnswered || 0) + total;
    // 最長ストリーク更新
    if ((data.streakDays || 0) > (data.maxStreak || 0)) {
      data.maxStreak = data.streakDays;
    }
    return data;
  },

  // ===== キャラクターアンロック =====
  // 解禁条件: { キャラID: 必要連続日数 }
  CHARA_UNLOCK: { 2: 7, 3: 30 },
  // キャラごとのプレースホルダー絵文字
  CHARA_EMOJI: { 1: '🧑‍🎓', 2: '👩‍🎓', 3: '👸' },

  // 新規解禁キャラIDを返す（なければ空配列）
  checkCharaUnlock(streakDays) {
    const data = this.load();
    const unlocked = data.unlockedCharas || [1];
    const newUnlocks = [];
    Object.entries(this.CHARA_UNLOCK).forEach(([id, days]) => {
      const numId = parseInt(id);
      if (streakDays >= days && !unlocked.includes(numId)) {
        unlocked.push(numId);
        newUnlocks.push(numId);
      }
    });
    if (newUnlocks.length > 0) {
      data.unlockedCharas = unlocked;
      this.save(data);
    }
    return newUnlocks;
  },

  // 現在のストリークで使えるキャラの最大IDを返す
  getActiveCharaId(streakDays) {
    const data = this.load();
    const unlocked = data.unlockedCharas || [1];
    let active = 1;
    Object.entries(this.CHARA_UNLOCK).forEach(([id, days]) => {
      const numId = parseInt(id);
      if (streakDays >= days && unlocked.includes(numId)) {
        active = Math.max(active, numId);
      }
    });
    return active;
  },

  // 最長連続日数取得
  getMaxStreak() {
    const data = this.load();
    return Math.max(data.maxStreak || 0, data.streakDays || 0);
  },
};
