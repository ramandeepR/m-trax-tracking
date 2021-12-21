import { IonicModule, IonicRouteStrategy } from '@ionic/angular';

import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { BackgroundMode } from '@ionic-native/background-mode/ngx';
import { BatteryStatus } from '@ionic-native/battery-status/ngx';
import { BrowserModule } from '@angular/platform-browser';
import { Device } from '@ionic-native/device/ngx';
import { ForegroundService } from '@awesome-cordova-plugins/foreground-service/ngx';
import { Geolocation } from '@ionic-native/geolocation/ngx';
import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { RouteReuseStrategy } from '@angular/router';
import { SQLite } from '@ionic-native/sqlite/ngx';

@NgModule({
  declarations: [AppComponent],
  entryComponents: [],
  imports: [BrowserModule, IonicModule.forRoot(), AppRoutingModule, HttpClientModule,],
  providers: [{ provide: RouteReuseStrategy, useClass: IonicRouteStrategy }, ForegroundService, Geolocation, Device, SQLite, BatteryStatus, BackgroundMode],
  bootstrap: [AppComponent],
})
export class AppModule {}
