import React, { useState } from 'react';
import CameraCapture from './components/CameraCapture';
import PhotoSphereViewer from './components/PhotoSphereViewer';

const App: React.FC = () => {
  const [stitchedImage, setStitchedImage] = useState<string | null>(null);

  return (
    <div className="w-screen h-screen bg-black flex flex-col text-white">
      {stitchedImage ? (
        <PhotoSphereViewer imageSrc={stitchedImage} onReset={() => setStitchedImage(null)} />
      ) : (
        <CameraCapture onCaptureComplete={setStitchedImage} />
      )}
    </div>
  );
};

export default App;
