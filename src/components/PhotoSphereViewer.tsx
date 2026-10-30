import React from 'react';
import { ReactPhotoSphereViewer } from 'react-photo-sphere-viewer';

interface PhotoSphereViewerProps {
  imageSrc: string;
  onReset: () => void;
}

const PhotoSphereViewer: React.FC<PhotoSphereViewerProps> = ({ imageSrc, onReset }) => {
  const downloadImage = () => {
    const link = document.createElement('a');
    link.href = imageSrc;
    link.download = `photosphere-${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="relative w-full h-full">
      <ReactPhotoSphereViewer
        src={imageSrc}
        height={"100vh"}
        width={"100vw"}
        littlePlanet={true}
      ></ReactPhotoSphereViewer>
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        <button onClick={downloadImage} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
          Download
        </button>
        <button onClick={onReset} className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded">
          Restart
        </button>
      </div>
    </div>
  );
};

export default PhotoSphereViewer;
