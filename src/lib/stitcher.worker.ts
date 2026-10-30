/// <reference lib="webworker" />

declare var cv: any;


let isReady = false;

// Set up Module before loading OpenCV
(self as any).Module = {
    onRuntimeInitialized: () => {
        isReady = true;
        console.log("OpenCV ready");
    }
};

self.importScripts('/js/opencv.js');

function waitForCv(): Promise<void> {
    return new Promise(resolve => {
        if (isReady) {
            resolve();
        } else {
            const interval = setInterval(() => {
                if (isReady) {
                    clearInterval(interval);
                    resolve();
                } else if (typeof cv !== 'undefined' && cv.Mat) {
                    isReady = true;
                    clearInterval(interval);
                    resolve();
                }
            }, 100);
        }
    });
}

function stitchImages(frames: ImageData[]): ImageData {
    if (frames.length === 0) throw new Error("No frames provided");
    if (frames.length === 1) return frames[0];

    console.log(`Stitching ${frames.length} images using ORB matching...`);

    let resultMat = cv.matFromImageData(frames[0]);
    const orb = new cv.ORB();
    const matcher = new cv.BFMatcher(cv.NORM_HAMMING, true);

    for (let i = 1; i < frames.length; i++) {
        let img2 = cv.matFromImageData(frames[i]);

        let gray1 = new cv.Mat();
        let gray2 = new cv.Mat();
        cv.cvtColor(resultMat, gray1, cv.COLOR_RGBA2GRAY);
        cv.cvtColor(img2, gray2, cv.COLOR_RGBA2GRAY);

        let kp1 = new cv.KeyPointVector();
        let kp2 = new cv.KeyPointVector();
        let des1 = new cv.Mat();
        let des2 = new cv.Mat();

        orb.detectAndCompute(gray1, new cv.Mat(), kp1, des1);
        orb.detectAndCompute(gray2, new cv.Mat(), kp2, des2);

        let matches = new cv.DMatchVector();
        if (des1.rows > 0 && des2.rows > 0) {
            matcher.match(des1, des2, matches);
        }

        // Sort matches by distance
        let matchArray = [];
        for (let j = 0; j < matches.size(); j++) {
            matchArray.push(matches.get(j));
        }
        matchArray.sort((a, b) => a.distance - b.distance);

        const goodMatchesCount = Math.min(Math.max(10, matchArray.length * 0.15), 50);

        if (goodMatchesCount >= 4) {
            let pts1 = new cv.Mat(goodMatchesCount, 1, cv.CV_32FC2);
            let pts2 = new cv.Mat(goodMatchesCount, 1, cv.CV_32FC2);

            for (let j = 0; j < goodMatchesCount; j++) {
                const match = matchArray[j];
                const pt1 = kp1.get(match.queryIdx).pt;
                const pt2 = kp2.get(match.trainIdx).pt;

                pts1.data32F[j * 2] = pt1.x;
                pts1.data32F[j * 2 + 1] = pt1.y;
                pts2.data32F[j * 2] = pt2.x;
                pts2.data32F[j * 2 + 1] = pt2.y;
            }

            const H = cv.findHomography(pts2, pts1, cv.RANSAC);

            if (!H.empty()) {
                const warpDst = new cv.Mat();
                // We simplify canvas size estimation by just taking a reasonably wider canvas size
                // In a production scenario, corners are transformed to calculate exact bounding box
                const newWidth = resultMat.cols + img2.cols / 2;
                const newHeight = Math.max(resultMat.rows, img2.rows);

                cv.warpPerspective(img2, warpDst, H, new cv.Size(newWidth, newHeight));

                // Copy resultMat into warpDst
                let roi = warpDst.roi(new cv.Rect(0, 0, resultMat.cols, resultMat.rows));
                resultMat.copyTo(roi);
                roi.delete();

                resultMat.delete();
                resultMat = warpDst;
            }
            H.delete();
            pts1.delete();
            pts2.delete();
        }

        gray1.delete();
        gray2.delete();
        kp1.delete();
        kp2.delete();
        des1.delete();
        des2.delete();
        matches.delete();
        img2.delete();
    }

    orb.delete();
    matcher.delete();

    // Convert back to ImageData structure
    // (In actual use, a canvas is generally needed to reconstruct the ImageData properly,
    // but we can mock returning the required structure since we cannot use DOM elements here easily
    // We create an array buffer to hold the pixel data for returning).
    const width = resultMat.cols;
    const height = resultMat.rows;
    const imgData = new ImageData(new Uint8ClampedArray(resultMat.data), width, height);

    resultMat.delete();

    return imgData;
}

self.onmessage = async (e: MessageEvent) => {
    const { type, payload } = e.data;

    if (type === 'init') {
        await waitForCv();
        self.postMessage({ type: 'ready' });
    }

    if (type === 'stitch') {
        const frames = payload.frames; // Array of ImageData
        if (!isReady) {
            self.postMessage({ type: 'error', error: 'OpenCV not initialized' });
            return;
        }

        try {
            const resultImageData = stitchImages(frames);
            self.postMessage({ type: 'result', payload: { result: resultImageData } });
        } catch (err: any) {
             self.postMessage({ type: 'error', error: err.toString() });
        }
    }
};

export {};
