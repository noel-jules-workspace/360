import piexif from 'piexifjs';

export function inject360Metadata(dataUrl: string, width: number, height: number): string {
    try {
        const exifObj = {
            "0th": {
                [piexif.ImageIFD.Make]: "Virtual 360 App",
                [piexif.ImageIFD.Model]: "Camera",
                [piexif.ImageIFD.Software]: "360 Photo App",
                [piexif.ImageIFD.XResolution]: [300, 1],
                [piexif.ImageIFD.YResolution]: [300, 1]
            },
            "Exif": {
                [piexif.ExifIFD.PixelXDimension]: width,
                [piexif.ExifIFD.PixelYDimension]: height,
                [piexif.ExifIFD.UserComment]: "ProjectionType=equirectangular"
            },
            "GPS": {}
        };

        const exifbytes = piexif.dump(exifObj);
        return piexif.insert(exifbytes, dataUrl);
    } catch (e) {
        console.error("Error injecting EXIF metadata", e);
        return dataUrl;
    }
}
