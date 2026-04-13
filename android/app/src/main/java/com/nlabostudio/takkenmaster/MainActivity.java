package com.nlabostudio.takkenmaster;

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

    private static final String AD_UNIT_ID = "ca-app-pub-2535567367869088/3799323013";

    private InterstitialAd mInterstitialAd;
    private static final long AD_DELAY_MS = 90_000;
    private final Handler handler = new Handler();

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        MobileAds.initialize(this, status -> loadAd());
    }

    @Override
    protected void onResume() {
        super.onResume();
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
                        loadAd();
                    }
                });
                mInterstitialAd.show(MainActivity.this);
                getPreferences(MODE_PRIVATE).edit()
                        .putLong("last_ad_time", System.currentTimeMillis())
                        .apply();
            }
        }, AD_DELAY_MS);
    }
}
