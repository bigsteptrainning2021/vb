import { Injectable } from '@angular/core';
// import { POSE_CONNECTIONS, POSE_LANDMARKS } from '@mediapipe/pose';
// import {Pose, POSE_CONNECTIONS} from '@mediapipe/pose';
// import {drawConnectors,drawLandmarks} from '@mediapipe/drawing_utils';
// import { LandmarkGrid } from '@mediapipe/control_utils_3d';
// import {LandmarkGrid} from '@mediapipe/control_utils_3d';
declare let LandmarkGrid:any;
declare let drawConnectors:any;
declare let Pose:any;
declare let drawLandmarks:any;

declare let POSE_CONNECTIONS:any;

@Injectable({
  providedIn: 'root'
})
export class PoseService {
  canvasElement: HTMLCanvasElement;
  canvasCtx: any;
  landmarkContainer: any;
  grid: any;
  pose: any;
  // LandmarkGrid:any;
  videoElement: any;
  worker: any;
  LandmarkGrid: any;
  constructor() { 
    console.log(this.LandmarkGrid,"hello")
    this.pose = new Pose({locateFile: (file:any) => {
      return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
    }});
    this.pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      enableSegmentation: true,
      smoothSegmentation: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });
    this.pose.onResults.bind(this);
    this.canvasElement = document.createElement('canvas');
    this.canvasCtx = this.canvasElement.getContext('2d');
    this.landmarkContainer = document.createElement('landmark-grid-container');
    this.grid = new LandmarkGrid(this.landmarkContainer);
    console.log(this.landmarkContainer,this.LandmarkGrid,"hiii")
  }


  private registerWebWorker = () => {
    if (typeof Worker !== 'undefined' && this.worker === undefined) {
      // Create a new
      // this.worker = new MyWorker();
        this.worker = new Worker(
    new URL('./selfie-segemantation.worker', import.meta.url)
  );

      this.worker.onmessage = ({ data }: any) => {
        if (data.action == 'segmentframe') {
          this.segmentFrame();
        }
      };
      // worker.postMessage('hello');
    } else {
      // Web Workers are not supported in this environment.
      // You should add a fallback so that your program still executes correctly.
    }
  };

  private isSupported = () => {
    //support chrome, firefox, edge TODO: check this
    return (
      navigator.userAgent.indexOf('Chrome') != -1 ||
      navigator.userAgent.indexOf('Firefox') != -1 ||
      navigator.userAgent.indexOf('Edg') != -1
    );
  };
  
  public poseDetection = async (
    track: MediaStreamTrack,
  ): Promise<any> => {
          await this.initialiseSegmentation(track);
          return this.canvasElement.captureStream(15).getVideoTracks()[0];


  };

  private segmentFrame = async () => {
    if (!this.isSegmentPossible()) {
      return;
    }
    await this.pose.send({
      image: this.videoElement,
    });
  };

  private isSegmentPossible = () => {
    if (
      this.videoElement &&
      (this.videoElement.videoWidth <= 0 || this.videoElement.videoHeight <= 0 )
    ) {
      return false;
    } else {
      return true;
    }
  };
   private initialiseSegmentation = async (track: MediaStreamTrack): Promise<void> => {
    await this.registerWebWorker();
    await this.pose.initialize();
    this.videoElement = document.createElement('video');
    this.videoElement.autoplay = true;
    this.videoElement.srcObject = track ? new MediaStream([track]) : null;
    try {
      await this.videoElement.play();
      this.canvasElement.width = this.videoElement.videoWidth;
      this.canvasElement.height = this.videoElement.videoHeight;
      this.worker.postMessage({
        action: 'initialize',
        maxFPS: 22,
      });
    } catch (error: any) {
      if (error.name === 'NotAllowedError') {
        // logger.warn('detected video element autoplay failed');
      }
      throw new Error(error.message);
    }
  };
  onResults(results:any) {
    if (!results.poseLandmarks) {
      this.grid.updateLandmarks([]);
      return;
    }
  
    this.canvasCtx.save();
    this.canvasCtx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);
    this.canvasCtx.drawImage(results.segmentationMask, 0, 0,
                        this.canvasElement.width, this.canvasElement.height);
  
    // Only overwrite existing pixels.
    this.canvasCtx.globalCompositeOperation = 'source-in';
    this.canvasCtx.fillStyle = '#00FF00';
    this.canvasCtx.fillRect(0, 0, this.canvasElement.width, this.canvasElement.height);
  
    // Only overwrite missing pixels.
    this.canvasCtx.globalCompositeOperation = 'destination-atop';
    this.canvasCtx.drawImage(
        results.image, 0, 0, this.canvasElement.width, this.canvasElement.height);
  
    this.canvasCtx.globalCompositeOperation = 'source-over';
    drawConnectors(this.canvasCtx, results.poseLandmarks, POSE_CONNECTIONS,
                   {color: '#00FF00', lineWidth: 4});
    drawLandmarks(this.canvasCtx, results.poseLandmarks,
                  {color: '#FF0000', lineWidth: 2});
    this.canvasCtx.restore();
  
    this.grid.updateLandmarks(results.poseWorldLandmarks);
  }
  
}
