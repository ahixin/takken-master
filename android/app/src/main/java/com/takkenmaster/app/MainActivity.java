package com.takkenmaster.app;

import android.os.Bundle;
import android.os.Handler;
import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.FullScreenContentCallback;
import com.google.android.gms.ads.LoadAdError;
import com.google.android.gms.ads.MobileAds;
import com.google.android.gms.ads.interstitial.InterstitialAd;
import com.google.android.gms.ads.interstitial.InterstitialAdLoadCallback;
import com.google.androidbrowserhelper.trusted.LauncherActivity;

public class MainActivity extends LauncherActivity {

    // ★ 本番公開時にAdMobの実際のIDに変更してください
    // テスト中はこのままでOK（テスト広告が表示されます）
    private static final String AD_UNIT_ID = "ca-app-pub-3940256099942544/1033173712";

    private InterstitialAd mInterstitialAd;
    private static final long AD_DELAY_MS = 90_000; // セッション開始90秒後に広告表示
    private final Handler handler = new Handler();

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // AdMob SDK 初期化
        MobileAds.initialize(this, status -> loadAd());
    }

    @Override
    protected void onResume() {
        super.onResume();
        // セッション完了後（90秒後）に広告を1日1回表示
        scheduleAd();
    }

    @Override
    protected void onPause() {
        super.onPause();
        handler.removeCallbacksAndMessages(null);
    }

    private void loadAd() {
        AdRequest req = new AdRequest.Builder().build();
        InterstitialAd.load(this, AD_UNIT_ID, req, new InterstitialAdLoadCallback() {
            @Override
            public void onAdLoaded(InterstitialAd ad) {
                mInterstitialAd = ad;
            }
            @Override
            public void onAdFailedToLoad(LoadAdError error) {
                mInterstitialAd = null;
            }
        });
    }

    private void scheduleAd() {
        // 1日1回の制限チェック
        long lastAdTime = getPreferences(MODE_PRIVATE)
                .getLong("last_ad_time", 0);
        long now = System.currentTimeMillis();
        boolean shownToday = (now - lastAdTime) < 24 * 60 * 60 * 1000L;
        if (shownToday) return;

        handler.postDelayed(() -> {
            if (mInterstitialAd != null) {
                mInterstitialAd.setFullScreenContentCallback(new FullScreenContentCallback() {
                    @Override
                    public void onAdDismissedFullScreenContent() {
                        mInterstitialAd = null;
                        loadAd(); // 次回用に再ロード
                    }
                });
                mInterstitialAd.show(MainActivity.this);
                // 表示時刻を保存
                getPreferences(MODE_PRIVATE).edit()
                        .putLong("last_ad_time", System.currentTimeMillis())
                        .apply();
            }
        }, AD_DELAY_MS);
    }
}
