import React, { useState } from 'react';
import { useInterval } from '../goodies';

const StableDiffusion = ({ webcamRef, points }) => {
    const [image, setImage] = useState("https://picsum.photos/id/56/480/480");
    const [genRunning, setGenRunning] = useState(false);

    // Model inference endpoint URL
    let modelURL = "http://localhost:8080/image2image";

    let queryParams = {
        "prompt": "A photo of napoleon with a golden crown and a red cape with nazca style patterns, standing in front of a mountain.",
        "strength": 0.999,
        "seed": 42,
        "num_inference_steps": 3,
    };

    // interpolate string for query params
    let queryURL = modelURL + "?" + new URLSearchParams(queryParams).toString();

    function getBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    }

    function dataURLToBlob(dataurl) {
        let arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
            bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new Blob([u8arr], { type: mime });
    }

    function cropAndDisplayArea(points, video, cv) {
        if (points.length === 4 && cv && cv.imread && video.readyState === 4) {

            // Create a temporary canvas to draw the video frame
            let tempCanvas = document.createElement("canvas");
            tempCanvas.width = video.videoWidth;
            tempCanvas.height = video.videoHeight;
            let tempCtx = tempCanvas.getContext("2d");
            tempCtx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);

            // Read the image from the temporary canvas
            let src = cv.imread(tempCanvas);
            let dst = new cv.Mat();

            // Define the destination size and the points for perspective transformation
            let dsize = new cv.Size(video.videoWidth, video.videoHeight);
            console.log("DSIZE", dsize)
            let srcTri = cv.matFromArray(4, 1, cv.CV_32FC2, points.flat());

            // Make sure the destination points match the order of the source points
            let dstTri = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, dsize.width, 0, 0, dsize.height, dsize.width, dsize.height]);

            // Compute the transformation matrix
            let M = cv.getPerspectiveTransform(srcTri, dstTri);

            // Perform the warp perspective transformation
            cv.warpPerspective(src, dst, M, dsize, cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar());

            // Use cv.imshow to draw the transformed image to the cropped canvas
            cv.imshow('cropped', dst);

            // Clean up
            src.delete();
            dst.delete();
            M.delete();
            srcTri.delete();
            dstTri.delete();
            tempCanvas.remove();
        } else {
            console.log("Conditions for cropping not met or OpenCV not ready");
        }
    }

    function generateImage() {
        if (
            typeof webcamRef.current !== "undefined" &&
            webcamRef.current !== null &&
            webcamRef.current.video.readyState === 4 &&
            window.cv && points.length === 4
        ) {
            console.log("Webcam ready");
            console.log("Starting image generation");
            // Estimate time to generate image
            let startTime = new Date().getTime();
            setGenRunning(true);

            cropAndDisplayArea(points, webcamRef.current.video, window.cv);

            // Get the cropped canvas
            let croppedCanvas = document.getElementById("cropped");

            // Returns a base64 encoded string of the current webcam image
            let transformedDataUrl = croppedCanvas.toDataURL('image/png');

            const bodyData = new FormData();
            // Create a binary blob from the base64 encoded string
            const blob = dataURLToBlob(transformedDataUrl);
            bodyData.append("file", blob);

            fetch(queryURL, {
                method: "POST",
                headers: {
                    'Accept': 'application/json',
                    'Access-Control-Allow-Origin': 'http://localhost:8080',
                    'Access-Control-Allow-Methods': 'POST',
                    'Access-Control-Allow-Headers': 'Content-Type',
                },
                body: bodyData
            })
                .then((response) => response.blob())
                .then(blob => getBase64(blob))
                .then((data) => {
                    setImage(data);
                })
                .catch((error) => {
                    console.error("Error:", error);
                })
                .finally(() => {
                    // Set generation to false to allow next image generation
                    setGenRunning(false);
                });
            let endTime = new Date().getTime();
            console.log("Image generation took", (endTime - startTime) / 1000, "seconds");
        }
        else {
            console.log("Webcam, opencv or calibration not ready");
        }
    }

    useInterval(() => {
        if (!genRunning) {
            generateImage();
        } else {
            console.log("Wait for image generation to finish");
        }
    }, 50);

    return (
        <div style={{ flex: "2" }} >
            <img src={image} alt={queryParams["prompt"]} style={{ borderColor: "blue", borderWidth: "10px" }} />
            <canvas id="cropped" style={{ display: "none" }} ></canvas>
        </div>
    );
};

export default StableDiffusion;