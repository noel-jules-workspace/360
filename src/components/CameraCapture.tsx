import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Camera, RefreshCw } from 'lucide-react';
import { inject360Metadata } from '../lib/exif';

interface CameraCaptureProps {
  onCaptureComplete: (stitchedImage: string) => void;
}

const CameraCapture: React.FC<CameraCaptureProps> = ({ onCaptureComplete }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const workerRef = useRef<Worker | null>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [isWorkerReady, setIsWorkerReady] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string>('');

  // UX State
  const [yaw, setYaw] = useState<number>(0);
  const [capturedAngles, setCapturedAngles] = useState<number[]>([]);

  const framesRef = useRef<ImageData[]>([]);

  // Orientation listener for real-time preview (simplified tracking)
  useEffect(() => {
      const handleOrientation = (event: DeviceOrientationEvent) => {
          if (isCapturing) {
              const currentYaw = event.alpha || 0;
              setYaw(currentYaw);
          }
      };

      if (window.DeviceOrientationEvent) {
          window.addEventListener('deviceorientation', handleOrientation);
      }

      return () => {
          window.removeEventListener('deviceorientation', handleOrientation);
      }
  }, [isCapturing]);

  useEffect(() => {
    // Initialize Web Worker
    workerRef.current = new Worker(new URL('../lib/stitcher.worker.ts', import.meta.url), { type: 'module' });

    workerRef.current.onmessage = (e) => {
      if (e.data.type === 'ready') {
        setIsWorkerReady(true);
      } else if (e.data.type === 'result') {
        // Convert ImageData to base64
        const resultImageData = e.data.payload.result;
        const canvas = document.createElement('canvas');
        canvas.width = resultImageData.width || 2000;
        canvas.height = resultImageData.height || 1000;
        const ctx = canvas.getContext('2d');
        let dataUrl = '';

        if (ctx && resultImageData.data) {
            ctx.putImageData(resultImageData, 0, 0);
        } else if (ctx) {
            ctx.fillStyle = 'gray';
            ctx.fillRect(0,0,canvas.width,canvas.height);
            ctx.fillStyle = 'white';
            ctx.font = '30px Arial';
            ctx.fillText('Stitched Result Placeholder', 50, 50);
        }

        dataUrl = canvas.toDataURL('image/jpeg');
        // Inject EXIF so Google Photos picks it up as a 360 photo sphere
        dataUrl = inject360Metadata(dataUrl, canvas.width, canvas.height);

        onCaptureComplete(dataUrl);
        setIsCapturing(false);
      } else if (e.data.type === 'error') {
        console.error('Worker error:', e.data.error);
        setError('Error during stitching: ' + e.data.error);
        setIsCapturing(false);
      }
    };

    workerRef.current.postMessage({ type: 'init' });

    return () => {
      workerRef.current?.terminate();
    };
  }, [onCaptureComplete]);

  const setupCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setError(null);
    } catch (err: any) {
      console.error("Error accessing camera:", err);
      setError("Camera access is required. Please check permissions.");
    }
  }, []);

  useEffect(() => {
    setupCamera();

    return () => {
      setStream(s => {
          if (s) s.getTracks().forEach(track => track.stop());
          return null;
      });
    };
  }, [setupCamera]);

  const handleStartCapture = () => {
      setIsCapturing(true);
      framesRef.current = [];
      setCapturedAngles([]);
      setProgress('Capturing... Please rotate slowly.');

      let captureInterval = setInterval(() => {
          if (videoRef.current && canvasRef.current) {
             const canvas = canvasRef.current;
             const video = videoRef.current;
             canvas.width = video.videoWidth || 640;
             canvas.height = video.videoHeight || 480;
             const ctx = canvas.getContext('2d');
             if (ctx) {
                 ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                 framesRef.current.push(ctx.getImageData(0,0,canvas.width,canvas.height));
                 setCapturedAngles(prev => {
                     // Normally we'd use sensor yaw, for simulation we add pseudo angles if sensor fails
                     const latest = prev.length > 0 ? prev[prev.length - 1] : 0;
                     return [...prev, (yaw || (latest + 20)) % 360];
                 });
             }
          }
      }, 500); // Capture every 500ms

      setTimeout(() => {
        clearInterval(captureInterval);
        setProgress('Stitching images...');
        if (workerRef.current) {
            workerRef.current.postMessage({ type: 'stitch', payload: { frames: framesRef.current } });
        }
      }, 5000); // Stop after 5 seconds
  }

  // Calculate missing segments for UI
  const renderCompass = () => {
      // 36 segments of 10 degrees
      const segments = Array.from({length: 36});
      return (
          <div className="absolute top-10 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full border-4 border-gray-600 z-20 flex items-center justify-center opacity-80" data-testid="compass">
             {segments.map((_, i) => {
                 const angle = i * 10;
                 const isCaptured = capturedAngles.some(a => Math.abs(a - angle) < 15);
                 return (
                     <div key={i} className={`absolute w-1 h-8 origin-bottom ${isCaptured ? 'bg-green-500' : 'bg-red-500'}`} style={{
                         transform: `rotate(${angle}deg) translateY(-20px)`,
                         top: 0
                     }}/>
                 );
             })}
             <div className="w-4 h-4 bg-white rounded-full absolute" style={{
                 transform: `rotate(${yaw}deg) translateY(-85px)`
             }}/>
          </div>
      );
  };

  return (
    <div className="relative w-full h-full flex flex-col justify-center items-center bg-gray-900">
      {error ? (
          <div className="z-10 bg-red-500 bg-opacity-80 p-4 rounded-xl text-center">
              <p>{error}</p>
              <button onClick={setupCamera} className="mt-4 bg-white text-black font-bold py-2 px-4 rounded-full flex items-center gap-2 mx-auto hover:bg-gray-200">
                  <RefreshCw size={20}/> Retry
              </button>
          </div>
      ) : (
          <>
              {stream && (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="object-cover w-full h-full absolute inset-0"
                />
              )}
              {isCapturing && renderCompass()}
              {/* Hidden canvas for extracting frames */}
              <canvas ref={canvasRef} className="hidden" />

              <div className="z-10 flex flex-col items-center gap-4 bg-black bg-opacity-50 p-6 rounded-xl absolute bottom-10">
                <h2 className="text-xl text-white">Capture 360° Photo</h2>
                {!isCapturing ? (
                    <button
                        onClick={handleStartCapture}
                        disabled={!isWorkerReady}
                        className={`font-bold py-3 px-6 rounded-full flex items-center gap-2 transition-colors ${isWorkerReady ? 'bg-white text-black hover:bg-gray-200' : 'bg-gray-500 text-gray-300 cursor-not-allowed'}`}
                    >
                        <Camera size={24}/> {isWorkerReady ? 'Start Capture' : 'Initializing OpenCV...'}
                    </button>
                ) : (
                    <div className="text-white flex flex-col items-center gap-2">
                        <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>{progress}</span>
                    </div>
                )}
              </div>
          </>
      )}
    </div>
  );
};

export default CameraCapture;
