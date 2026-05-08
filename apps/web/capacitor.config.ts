import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'au.com.kashio.app',
  appName: 'Kashio',
  webDir: 'out',
  server: {
    // iOS shell loads the live deployed web app.
    // Remove this block only if you switch to a static export build.
    url: 'https://app.kashio.com.au',
    cleartext: false,
  },
  plugins: {
    SplashScreen: {
      // Kept visible manually — we call SplashScreen.hide() from React once
      // the app is ready. This eliminates the blank-screen gap between the
      // native launch screen and the first React render.
      launchAutoHide:     false,
      launchShowDuration: 0,
      backgroundColor:    '#05070E',
      showSpinner:        false,
      androidSpinnerStyle: 'small',
    },
  },
};

export default config;
