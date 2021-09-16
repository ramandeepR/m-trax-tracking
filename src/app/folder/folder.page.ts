import { Component, OnInit, Input, ViewChild, ElementRef} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { IonContent, Platform } from '@ionic/angular';
import { Geolocation } from '@ionic-native/geolocation/ngx';
import { Device } from '@ionic-native/device/ngx';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from './../../environments/environment';
import { SQLite, SQLiteObject } from '@ionic-native/sqlite/ngx';
import { BatteryStatus } from '@ionic-native/battery-status/ngx';

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

  constructor(private platform :Platform, private geolocation: Geolocation, public device: Device, private http: HttpClient, private batteryStatus: BatteryStatus) { }
  
  ngOnInit() {
    this.getTrackLocation();
    // watch change in battery status
    const subscription = this.batteryStatus.onChange().subscribe(status => {
      this.deviceBatteryStatus = status;
      if(status.level <= this.minimumBattery){
        this.getLocation(25, false);
      }else if(status.isPlugged){
        this.getLocation(26);
      }else if(!status.isPlugged){
        this.getLocation(27);
      }
    });

    this.platform.pause.subscribe(async () => {
      console.log('Pause event detected');
      this.getLocation(32);
    });

    this.platform.resume.subscribe(async () => {
      console.log('Resume event detected');
      this.getLocation(31);
    });

    this.platform.ready().then(() => {
      console.log('ready')
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
