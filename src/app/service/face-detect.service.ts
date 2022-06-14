import { Injectable } from '@angular/core';
import {FaceDetection} from '@mediapipe/face_detection';
import { IBackgroundConfig } from '../interface/global.interface';
import {drawConnectors,drawLandmarks,drawRectangle} from '@mediapipe/drawing_utils';

@Injectable({
  providedIn: 'root'
})
export class FaceDetectService {
  faceDetection: any;
  canvasCtx: any;
  canvasElement: any;
  drawingUtils: any;
  videoElement: HTMLVideoElement  | undefined;
  worker: any;
  isSegmentationRunning: boolean=false;

  constructor() {
    this.faceDetection = new FaceDetection({locateFile: (file) => {
      return `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection@0.4/${file}`;
    }});
    this.faceDetection.setOptions({
      model: 'short',
      minDetectionConfidence: 0.5
    });
    this.faceDetection.onResults(this.onResults.bind(this));
    this.canvasElement = document.createElement('canvas');
    this.canvasCtx = this.canvasElement.getContext('2d');
   }

   private registerWebWorker = () => {
    if (typeof Worker !== 'undefined' && this.worker === undefined) {
      // Create a new
      // this.worker = new MyWorker();
        this.worker = new Worker(
    new URL('./selfie-segemantation.worker', import.meta.url)
  );
      // this.isSegmentationRunning = true;
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
  
  public faceDetect = async (
    track?: MediaStreamTrack,
  ): Promise<any> => {
    if (this.isSupported()) {
      try {
        if (track) {
          await this.initialiseSegmentation(track);
          return this.canvasElement.captureStream(15).getVideoTracks()[0];
        }
      } catch (error: any) {
        console.log('error', error);
        throw new Error(error.message as string);
      }
    } else {
      throw new Error('You Browser does not support Virtual Background');
    }
  };

  private segmentFrame = async () => {
    if (!this.isSegmentPossible()) {
      return;
    }
    await this.faceDetection.send({
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
    await this.faceDetection.initialize();
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
   private onResults = (results: any) => {
      // Draw the overlays.
      this.canvasCtx.save();
      this.canvasCtx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);
      this.canvasCtx.drawImage(
          results.image, 0, 0, this.canvasElement.width, this.canvasElement.height);
      if (results.detections.length > 0) {
        drawRectangle(
          this.canvasCtx, results.detections[0].boundingBox,
            {color: 'blue', lineWidth: 4, fillColor: '#00000000'});
            drawLandmarks(this.canvasCtx, results.detections[0].landmarks, {
          color: 'red',
          radius: 5,
        });
      }
      this.canvasCtx.restore();
  };

}
