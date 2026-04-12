// push.js - プッシュ通知（OneSignal）
// ============================================================
// SETUP: onesignal.com でアカウント作成後、以下のApp IDを設定してください
// ============================================================
const ONESIGNAL_APP_ID = 'YOUR_ONESIGNAL_APP_ID'; // ← ここを置き換え

// 通知メッセージ（キャラがキャラ名義で送る）
const PUSH_MESSAGES = [
  { title: '宅建マスター', body: '今日もやろう♡ 3問だけでいいから！' },
  { title: '宅建マスター', body: 'また来てくれた！嬉しい♡ 一緒に頑張ろう' },
  { title: '宅建マスター', body: '今日サボったら連続記録が途切れちゃう！' },
  { title: '宅建マスター', body: '待ってたよ♡ 今日の問題やってみて！' },
  { title: '宅建マスター', body: '3問だけ！終わったらほめてあげる♡' },
];

function initPushNotifications() {
  // App IDが設定されていない場合はスキップ
  if (!ONESIGNAL_APP_ID || ONESIGNAL_APP_ID === 'YOUR_ONESIGNAL_APP_ID') return;

  window.OneSignalDeferred = window.OneSignalDeferred || [];
  OneSignalDeferred.push(async function(OneSignal) {
    await OneSignal.init({
      appId: ONESIGNAL_APP_ID,
      serviceWorkerPath: 'sw.js',
      notifyButton: { enable: false },
      promptOptions: {
        slidedown: {
          prompts: [{
            type: 'push',
            autoPrompt: false,
          }]
        }
      }
    });
  });
}

// 通知許可をリクエスト（初回訪問から1日後に表示）
async function requestNotificationPermission() {
  if (!ONESIGNAL_APP_ID || ONESIGNAL_APP_ID === 'YOUR_ONESIGNAL_APP_ID') return;

  const firstVisit = localStorage.getItem('firstVisit');
  if (!firstVisit) {
    localStorage.setItem('firstVisit', Date.now());
    return; // 初回はスキップ
  }

  const daysSinceFirst = (Date.now() - parseInt(firstVisit)) / (1000 * 60 * 60 * 24);
  const alreadyAsked = localStorage.getItem('notificationAsked');
  if (daysSinceFirst >= 1 && !alreadyAsked) {
    localStorage.setItem('notificationAsked', '1');
    showNotificationPrompt();
  }
}

function showNotificationPrompt() {
  // カスタムプロンプト表示
  const banner = document.createElement('div');
  banner.id = 'notif-prompt';
  banner.style.cssText = `
    position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%);
    background: linear-gradient(135deg, #7c3aed, #a855f7);
    color: white; padding: 16px 20px; border-radius: 16px;
    box-shadow: 0 4px 20px rgba(124,58,237,0.4);
    text-align: center; z-index: 9999; max-width: 320px; width: 90%;
    font-family: 'Noto Sans JP', sans-serif;
  `;
  banner.innerHTML = `
    <div style="font-size:1.2em; margin-bottom:8px;">🔔 毎日リマインド</div>
    <div style="font-size:0.85em; margin-bottom:12px; opacity:0.9;">
      キャラからの通知をONにする？<br>忘れずに続けられるよ♡
    </div>
    <div style="display:flex; gap:8px; justify-content:center;">
      <button onclick="enablePush()" style="
        background:white; color:#7c3aed; border:none; padding:8px 20px;
        border-radius:20px; font-weight:bold; cursor:pointer;">
        通知をON
      </button>
      <button onclick="document.getElementById('notif-prompt').remove()" style="
        background:rgba(255,255,255,0.2); color:white; border:none; padding:8px 16px;
        border-radius:20px; cursor:pointer;">
        あとで
      </button>
    </div>
  `;
  document.body.appendChild(banner);
  setTimeout(() => banner.remove(), 10000);
}

async function enablePush() {
  document.getElementById('notif-prompt')?.remove();
  if (!window.OneSignalDeferred) return;
  OneSignalDeferred.push(async function(OneSignal) {
    await OneSignal.Notifications.requestPermission();
  });
}

// OneSignal SDK ロード
function loadOneSignalSDK() {
  if (!ONESIGNAL_APP_ID || ONESIGNAL_APP_ID === 'YOUR_ONESIGNAL_APP_ID') return;
  const script = document.createElement('script');
  script.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
  script.defer = true;
  script.onload = () => {
    initPushNotifications();
    setTimeout(requestNotificationPermission, 3000);
  };
  document.head.appendChild(script);
}

document.addEventListener('DOMContentLoaded', loadOneSignalSDK);
