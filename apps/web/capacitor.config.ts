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
      // Keep splash visible until SplashScreen.hide() is called from JS.
      // This bridges the gap between the native launch screen and React loading.
      launchAutoHide:    false,
      launchShowDuration: 0,
      backgroundColor:   '#05070E',
      showSpinner:       false,
      // iOS-specific: use the Splash image asset in Assets.xcassets
      iosSpinnerStyle: 'small',
    },
  },
};

export default config;
