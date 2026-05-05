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
};

export default config;
