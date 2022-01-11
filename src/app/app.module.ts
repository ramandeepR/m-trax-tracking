import { IonicModule, IonicRouteStrategy } from '@ionic/angular';
import { SQLite, SQLiteObject } from '@awesome-cordova-plugins/sqlite/ngx';

import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import BackgroundGeolocation from "cordova-background-geolocation-lt";
import { BackgroundMode } from '@awesome-cordova-plugins/background-mode/ngx';
import { BatteryStatus } from '@awesome-cordova-plugins/battery-status/ngx';
import { BrowserModule } from '@angular/platform-browser';
import { Device } from '@awesome-cordova-plugins/device/ngx';
import { ForegroundService } from '@awesome-cordova-plugins/foreground-service/ngx';
import { Geolocation } from '@awesome-cordova-plugins/geolocation/ngx';
import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { RouteReuseStrategy } from '@angular/router';

@NgModule({
  declarations: [AppComponent],
  entryComponents: [],
  imports: [BrowserModule, IonicModule.forRoot(), AppRoutingModule, HttpClientModule,],
  providers: [{ provide: RouteReuseStrategy, useClass: IonicRouteStrategy }, BackgroundGeolocation, ForegroundService, Geolocation, Device, SQLite, BatteryStatus, BackgroundMode],
  bootstrap: [AppComponent],
})
export class AppModule {}
