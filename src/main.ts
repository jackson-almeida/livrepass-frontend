import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

console.log('MP KEY =>', import.meta.env?.NG_APP_MP_PUBLIC_KEY);

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
