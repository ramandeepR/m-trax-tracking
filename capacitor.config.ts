import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mTrax.tracking',
  appName: 'mTrax-Tracking',
  webDir: 'www',
  bundledWebRuntime: false,
  "server": {
    "cleartext": true
  }
};

export default config;
