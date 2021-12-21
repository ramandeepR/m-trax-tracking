// import { BackgroundGeolocation, BackgroundGeolocationConfig, BackgroundGeolocationEvents, BackgroundGeolocationResponse } from '@ionic-native/background-geolocation/ngx';

import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { IonContent, Platform } from '@ionic/angular';
import { SQLite, SQLiteObject } from '@ionic-native/sqlite/ngx';

import { ActivatedRoute } from '@angular/router';
import { App } from '@capacitor/app';
import {BackgroundGeolocationPlugin} from "@capacitor-community/background-geolocation";
import { BackgroundMode } from '@ionic-native/background-mode/ngx';
import { BatteryStatus } from '@ionic-native/battery-status/ngx';
import { Device } from '@ionic-native/device/ngx';
import { ForegroundService } from '@awesome-cordova-plugins/foreground-service/ngx';
import { Geolocation } from '@ionic-native/geolocation/ngx';
import { Observable } from 'rxjs';
import { environment } from './../../environments/environment';
import {registerPlugin} from "@capacitor/core";

// import { App } from '@capacitor/app';



const BackgroundGeolocation = registerPlugin<BackgroundGeolocationPlugin>("BackgroundGeolocation");


declare var google;


@Component({
  selector: 'app-folder',
  templateUrl: './folder.page.html',
  styleUrls: ['./folder.page.scss'],
})
export class FolderPage implements OnInit {
  @ViewChild('map', { static: false }) mapElement: ElementRef;
  @ViewChild(IonContent, { static: false }) content: IonContent;
  lastHeading: any;
  timeoutID: any;
  lastLatitude: any;
  lastLongitude: any;
  lastSpeed: any;
  meters: any;
  speeds: any;
  watch : any;
  map: any;
  minimumSpeed: any = 4;
  IsSpeedZero: boolean = false;
  finalPacketsArray = [];
  isTimeUpdate: any = false;
  deviceBatteryStatus: any;
  minimumBattery: number = 20;
  eventsList = [
    {'location': 1},
    {'start': 3},
    {'stop' :4},
    {'heading': 5},
    {'distance': 6},
    {'time': 7},
    {'ignitionOn': 8},
    {'ignitionOff': 9},
    {'driverLogin': 10},
    {'driverLogout': 11},
    {'startRoute': 12},
    {'endRoute': 13},
    {'onShift': 14},
    {'offShift': 15},
    {'temperature_1:': 16},
    {'temperature_2': 17},
    {'startBreak': 18},
    {'endBreak': 19},
    {'jobCompleted': 20},
    {'arrive': 21},
    {'depart': 22},
    {'doorOpen': 23},
    {'doorClose': 24},
    {'lowBattery': 25},
    {'externalPowerOn': 26},
    {'externalPowerOff': 27},
    {'enteredVehicle': 28},
    {'exitedVehicle': 29},
    {'panic': 30},
    {'applicationStart': 31},
    {'applicationStop': 32},
    {'vehicleConnect': 34},
    {'vehicleDisconnect': 35},
  ];
  IsFirstRecords: boolean = true;
  intervalID: any;
  constructor(public foregroundService: ForegroundService, private platform :Platform, private geolocation: Geolocation, public device: Device, private http: HttpClient, private batteryStatus: BatteryStatus, public backgroundMode: BackgroundMode) {
    this.backgroundMode.enable();
    let self = this;

    self.startService();
    App.addListener('appStateChange', ({ isActive }) => {
      console.log('App state changed. Is active?', isActive);
      if(!isActive){
        
        // self.startService();
        // self.intervalID = setInterval(function(){
        //   self.getBackgroundLocationWhenAppInActive();
        // }, 2000)
      }else{
        clearInterval(this.intervalID);
        this.getLocation(31);
      }
    });

    BackgroundGeolocation.addWatcher(
      {
          // If the "backgroundMessage" option is defined, the watcher will
          // provide location updates whether the app is in the background or the
          // foreground. If it is not defined, location updates are only
          // guaranteed in the foreground. This is true on both platforms.
  
          // On Android, a notification must be shown to continue receiving
          // location updates in the background. This option specifies the text of
          // that notification.
          backgroundMessage: "Cancel to prevent battery drain.",
  
          // The title of the notification mentioned above. Defaults to "Using
          // your location".
          backgroundTitle: "Tracking You.",
  
          // Whether permissions should be requested from the user automatically,
          // if they are not already granted. Defaults to "true".
          requestPermissions: true,
  
          // If "true", stale locations may be delivered while the device
          // obtains a GPS fix. You are responsible for checking the "time"
          // property. If "false", locations are guaranteed to be up to date.
          // Defaults to "false".
          stale: false,
  
          // The minimum number of metres between subsequent locations. Defaults
          // to 0.
          distanceFilter: 0
      },
      function callback(location, error) {
          if (error) {
              if (error.code === "NOT_AUTHORIZED") {
                  if (window.confirm(
                      "This app needs your location, " +
                      "but does not have permission.\n\n" +
                      "Open settings now?"
                  )) {
                      // It can be useful to direct the user to their device's
                      // settings when location permissions have been denied. The
                      // plugin provides the 'openSettings' method to do exactly
                      // this.
                      BackgroundGeolocation.openSettings();
                  }
              }
              return console.error(error);
          }
          
          let dict = {
            latitude: location.latitude,
            longitude: location.longitude,
            speed: location.speed == null ? 0 : location.speed.toFixed(1),
            headingDelta: self.calculateHeading(self.lastHeading, location.bearing),
            actualHeading: location.bearing,
            time: location.time,
            distance: 0,
            reason: 1//resp.coords.speed <= 1 ? '4' : '3'
          }

          let locationDict = {
            coords: {
              latitude: location.latitude,
              longitude: location.longitude,
              speed: location.speed == null ? 0 : location.speed.toFixed(1),
              heading: self.calculateHeading(self.lastHeading, location.bearing),
            },
            timestamp: location.time,
            distance: 0,
            reason: 1//resp.coords.speed <= 1 ? '4' : '3'
          }
          

          self.implementConditions(dict, locationDict);

          return console.log(location);
      }
  ).then(function after_the_watcher_has_been_added(watcher_id) {
      // When a watcher is no longer needed, it should be removed by calling
      // 'removeWatcher' with an object containing its ID.
      BackgroundGeolocation.removeWatcher({
          id: watcher_id
      });
  });
      
  }

  startService() {
    // Notification importance is optional, the default is 1 - Low (no sound or vibration)
    this.foregroundService.start('GPS Running', 'Background Service', 'drawable/fsicon');
    
   }

  getBackgroundLocationWhenAppInActive(){
    let self = this;
      
  }
  
  ngOnInit() {
    this.getTrackLocation();
    // watch change in battery status
    const subscription = this.batteryStatus.onChange().subscribe(status => {
      this.deviceBatteryStatus = status;
      if(status.level <= this.minimumBattery){
        this.getLocation(25);
      }else if(status.isPlugged){
        this.getLocation(26);
      }else if(!status.isPlugged){
        this.getLocation(27);
      }
    });
  }
  
  getTrackLocation(){
    this.getLocation(1);
  }

  getLocation(reasonCode){
    this.geolocation.getCurrentPosition({enableHighAccuracy: true}).then((resp: any) => {
      
      let dict = {
        latitude: resp.coords.latitude,
        longitude: resp.coords.longitude,
        speed: resp.coords.speed == null ? 0 : resp.coords.speed.toFixed(1),
        headingDelta: this.calculateHeading(this.lastHeading, resp.coords.heading),
        actualHeading: resp.coords.heading,
        time: resp.timestamp,
        distance: 0,
        reason: reasonCode
      }
      this.implementConditions(dict, resp);
    }).catch((error) => {
       console.log('Error getting location', error);
    });
    this.subscribeLocation();
  }

  subscribeLocation(){
    this.watch = this.geolocation.watchPosition();
    this.watch.subscribe((resp: any) => {

      let dict = {
        latitude: resp.coords.latitude,
        longitude: resp.coords.longitude,
        speed: resp.coords.speed == null ? 0 : resp.coords.speed.toFixed(1),
        headingDelta: this.calculateHeading(this.lastHeading, resp.coords.heading),
        actualHeading: resp.coords.heading,
        time: resp.timestamp,
        distance: 0,
        reason: 1//resp.coords.speed <= 1 ? '4' : '3'
      }

      this.implementConditions(dict, resp);
    });
  }

  //calculate rest of the conditions & cases on the data got from service
  implementConditions(dict, resp){

    if(!this.IsFirstRecords && this.isTimeUpdate == false){

      let distance = this.distanceCalculations(this.lastLatitude, this.lastLongitude, resp.coords.latitude, resp.coords.longitude, 'K' );
      this.meters = Number(distance) * 1000;
      dict.distance = Number(distance)
      clearTimeout(this.timeoutID);

      if(dict.reason == 25 || dict.reason == 26 || dict.reason == 27 || dict.reason == 31 || dict.reason == 32){
        //do nothing just continue with the same reason code
      }else if(this.mps_to_kmph(this.lastSpeed) > this.minimumSpeed && this.mps_to_kmph(this.lastSpeed) <= this.minimumSpeed){
        dict.reason = 4;
      }else if(this.mps_to_kmph(this.lastSpeed) <= this.minimumSpeed && this.mps_to_kmph(this.lastSpeed) > this.minimumSpeed){
        dict.reason = 3;
      }else if(this.meters > 100){
        dict.reason  = 6;
      }else if(this.calculateHeading(this.lastHeading, resp.coords.heading) > 25 && this.mps_to_kmph(this.lastSpeed) > this.minimumSpeed){
        dict.reason  = 5;
      }

      if(dict.reason != 4) { this.timeoutFunction(); }
      console.log(dict)
      //if reason 1 (location) don't need to track events & data
      if(dict.reason == 1) { return}; 
      this.generateFinalPacket(dict);

    }else if(this.isTimeUpdate == true){
      dict.reason  = 7;
      this.isTimeUpdate = false;
      clearTimeout(this.timeoutID);
      this.generateFinalPacket(dict);
      this.timeoutFunction();
    }else{
      this.lastLatitude = resp.coords.latitude;
      this.lastLongitude = resp.coords.longitude;
      this.lastHeading = resp.coords.heading;
      this.IsFirstRecords = false;
      this.generateFinalPacket(dict);
      this.timeoutFunction();
    }
  };


  generateFinalPacket(dict){
 
    let finalDict = {
      timestamp: dict.time,
      reason: dict.reason,
      lat: dict.latitude.toFixed(5),
      lon: dict.longitude.toFixed(5),
      heading: dict.actualHeading === null ? 0 : dict.actualHeading.toFixed(1),
      lastHeading: this.lastHeading === null ? 0 : this.lastHeading.toFixed(1),
      speed: dict.speed,
      version: '1',
      imei: this.device.uuid,
      t1: '',
      t2: '',
      data: '',  
      driverID: ''
    };
    console.log(finalDict)
    return;
    //recording last values here
    this.lastHeading = dict.actualHeading;
    this.lastSpeed = dict.speed;
    this.lastLatitude = dict.latitude;
    this.lastLongitude = dict.longitude;
    
    this.CallAjax(finalDict)
    .subscribe((response) => {
      console.log(response);
    });
  }

  CallAjax(data): Observable<any> {
    return this.http.post(environment.webServiceUrl, data);
  }

  calculateHeading(h1, h2){
    let C = h1 > h2 ? h1 - h2 : h2 - h1;
    return C;
  }

  timeoutFunction(){
    let self = this;
    this.timeoutID = setTimeout(function(){
      this.isTimeUpdate = true;
      clearTimeout(this.timeoutID);
      self.getLocation(7);
    }, 60000);
  }

  mps_to_kmph(mps){
    return (mps* 18/5).toFixed(1);
  }

  //:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
//:::                                                                         :::
//:::  This routine calculates the distance between two points (given the     :::
//:::  latitude/longitude of those points). It is being used to calculate     :::
//:::  the distance between two locations using GeoDataSource (TM) prodducts  :::
//:::                                                                         :::
//:::  Definitions:                                                           :::
//:::    South latitudes are negative, east longitudes are positive           :::
//:::                                                                         :::
//:::  Passed to function:                                                    :::
//:::    lat1, lon1 = Latitude and Longitude of point 1 (in decimal degrees)  :::
//:::    lat2, lon2 = Latitude and Longitude of point 2 (in decimal degrees)  :::
//:::    unit = the unit you desire for results                               :::
//:::           where: 'M' is statute miles (default)                         :::
//:::                  'K' is kilometers                                      :::
//:::                  'N' is nautical miles                                  :::
//:::                                                                         :::
//:::  Worldwide cities and other features databases with latitude longitude  :::
//:::  are available at https://www.geodatasource.com                         :::
//:::                                                                         :::
//:::  For enquiries, please contact sales@geodatasource.com                  :::
//:::                                                                         :::
//:::  Official Web site: https://www.geodatasource.com                       :::
//:::                                                                         :::
//:::               GeoDataSource.com (C) All Rights Reserved 2018            :::
//:::                                                                         :::
//:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

distanceCalculations(lat1, lon1, lat2, lon2, unit) {
  console.log('--------')
  console.log(lat1, lon1, lat2, lon2, unit);
  if ((lat1 == lat2) && (lon1 == lon2)) {
      return 0;
  }
  else {
      var radlat1 = Math.PI * lat1/180;
      var radlat2 = Math.PI * lat2/180;
      var theta = lon1-lon2;
      var radtheta = Math.PI * theta/180;
      var dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
      if (dist > 1) {
          dist = 1;
      }
      dist = Math.acos(dist);
      dist = dist * 180/Math.PI;
      dist = dist * 60 * 1.1515;
      /// 10,000 meters
      // 10,000 / 1000 = 10 km
      //10 * 1000 = 10,000 meters
      if (unit=="K") { dist = dist * 1.609344 }
      if (unit=="N") { dist = dist * 0.8684 }
      if (unit=="M") { dist }
      console.log('distance '+ dist.toFixed(1));
      return dist.toFixed(1);
  }
}


}
