import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { AgoraRTCService } from '../service/agora-rtc.service';
import { IndexService } from '../service/index.service';
import {FaceDetectService} from '../service/face-detect.service';
// import {PoseService} from '../service/pose.service'
import * as fp from "fingerpose";

import {PoseService} from '../service/pose.service';
@Component({
  selector: 'app-local-stream',
  templateUrl: './local-stream.component.html',
  styleUrls: ['./local-stream.component.scss'],
})
export class LocalStreamComponent implements OnInit, OnDestroy {
  @ViewChild('video') viewChild: any;
  selectedImage: string = '';
  id: string = 'madhur';
  track: any;
  selfieSegmentation: any;
  canvasCtx: any;
  canvasElement: any;
  backgroundConfig: any;
  image: any;
  videoElement: HTMLVideoElement | undefined;
  isBackgroundSourceLoading: boolean = false;
  backgroundBlurLevel: any;
  isSegmentationRunning: any;
  mediaStream: any;
  video: any;
  isStreamplay: boolean = true;
  imageName: any;
  allowDevice: boolean = true;
  loading_flag: boolean = false;
  selectedFlag: boolean = false;
  file: any;
  imageUrl:any=[];
  uploadedImage: boolean;
  constructor(
    private agoraRTC: AgoraRTCService,
    public indexService: IndexService,
    // public faceDetect:FaceDetectService, 
    public Pose:PoseService
  ) {}

  ngOnDestroy(): void {
    localStorage.removeItem('image');

    this.indexService.stopVirtualBackground();
  }

  ngOnInit(): void {}

  //create tracks and play localstream
 async allowDevices() {
   await this.agoraRTC.createBothTracks().then(() => {
      this.agoraRTC.streaming.next(true);
      this.agoraRTC.join(this.id).then(() => {
        // this.agoraRTC.publish();
      });
    });

    if (this.agoraRTC.publisher.tracks.video) {
      this.allowDevice = false;
      console.log(this.agoraRTC.publisher.tracks);
      setTimeout(async() => {
        this.agoraRTC.publisher.tracks.video?.play('stream');
        const a = document.getElementById('video');
        a ? (a.style.display = 'none') : null;
      }, 1000);
    }
  }


  //select background and apply it on stream
  async selectBackgroundImage(imag: any, type: any) {
    this.uploadedImage=false;

    if (this.selectedFlag) {
      await this.indexService.stopVirtualBackground();
    }
    this.selectedFlag = true;
    this.loading_flag = true;
    if (!this.selectedImage) {
      setTimeout(() => {
        const a = document.getElementById('stream');
        a ? (a.style.display = 'none') : null;

        const b = document.getElementById('video');
        b ? (b.style.display = 'block') : null;
      }, 500);
    }
    this.imageName = imag;
    if (type === 'image') {
      this.selectedImage = imag + '.png';
      this.track = await this.indexService.setVirtualBackground(
        {
          sourceType: 'image',
          sourceValue: '../../assets/' + this.selectedImage,
        },
        this.agoraRTC.publisher.tracks.video._mediaStreamTrack
      );
    } else {
      this.selectedImage = '';
      this.track = await this.indexService.setVirtualBackground(
        { sourceType: 'blur', sourceValue: `${this.imageName}` },
        this.agoraRTC.publisher.tracks.video._mediaStreamTrack
      );
    }
    const mediaStream = new MediaStream([this.track]);
    this.video = this.viewChild.nativeElement;
    this.mediaStream = mediaStream;
    this.video.srcObject = mediaStream;
    this.loading_flag = false;
    var playPromise = this.video.play();

    if (playPromise !== undefined) {
      playPromise
        .then((_: any) => {
          // Automatic playback started!
          // Show playing UI.
        })
        .catch((error: any) => {
          // Auto-play was prevented
          // Show paused UI.
        });
    }
  }

  async selectBackgroundImage1(imag: number, type: any) {
    this.uploadedImage=true;
    if (this.selectedFlag) {
      await this.indexService.stopVirtualBackground();
    }
    this.selectedFlag = true;
    this.loading_flag = true;
    if (!this.selectedImage) {
      setTimeout(() => {
        const a = document.getElementById('stream');
        a ? (a.style.display = 'none') : null;

        const b = document.getElementById('video');
        b ? (b.style.display = 'block') : null;
      }, 500);
    }
    this.imageName = imag;
    if (type === 'image') {
      // this.selectedImage = imag + '.png';
      this.track = await this.indexService.setVirtualBackground(
        {
          sourceType: 'image',
          sourceValue: this.imageName,
        },
        this.agoraRTC.publisher.tracks.video._mediaStreamTrack
      );
    }
    const mediaStream = new MediaStream([this.track]);
    this.video = this.viewChild.nativeElement;
    this.mediaStream = mediaStream;
    this.video.srcObject = mediaStream;
    this.loading_flag = false;
    var playPromise = this.video.play();

    if (playPromise !== undefined) {
      playPromise
        .then((_: any) => {
          // Automatic playback started!
          // Show playing UI.
        })
        .catch((error: any) => {
          // Auto-play was prevented
          // Show paused UI.
        });
    }
  }

  //remove background
  async removeBackground() {
    this.selectedImage = '';
    this.imageName = '';
    this.selectedFlag = false;
    this.uploadedImage=false;

    const a = document.getElementById('stream');
    a ? (a.style.display = 'block') : null;
    const b = document.getElementById('video');
    b ? (b.style.display = 'none') : null;
    await this.indexService.stopVirtualBackground();
  }


  //camera on and off 
  async pauseVideo() {
    this.isStreamplay = !this.isStreamplay;
    await this.agoraRTC.publisher.tracks.video.setEnabled(this.isStreamplay);
    if (this.imageName && this.isStreamplay && this.selectedFlag) {
      await this.indexService.stopVirtualBackground();
      if (this.imageName === 20)
        await this.selectBackgroundImage(this.imageName, 'blur');
      else if(this.uploadedImage)
        await this.selectBackgroundImage1(this.imageName, 'image');
      else await this.selectBackgroundImage(this.imageName, 'image');
    }
  }

  async onChange(event) {
    let reader = new FileReader(); // HTML5 FileReader API
    let file = event.target.files[0];
    if (event.target.files && event.target.files[0]) {
      reader.addEventListener('load', (event) => {
        setTimeout(() => {
          let data={
            img:event.target.result}
          this.imageUrl.push(data);
          localStorage.setItem('image', this.imageUrl);
        }, 1000);
      });
      reader.readAsDataURL(file);
      // When file uploads set it to file formcontrol

    }
    console.log(file,this.imageUrl,reader.result)
  }
}
