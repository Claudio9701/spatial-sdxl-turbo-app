document.addEventListener("DOMContentLoaded", function () {
    const video = document.getElementById("webcam");
    const canvas = document.getElementById("overlay");
    const context = canvas.getContext("2d");
    const croppedCanvas = document.getElementById("cropped"); // Add this canvas to your HTML
    const croppedctx = croppedCanvas.getContext("2d");
    const radius = 3;
    let points = []; // Array to store points
    let isDragging = false;
    let draggedPointIndex = null;

    // Access webcam
    navigator.mediaDevices
        .getUserMedia({ video: true })
        .then((stream) => {
            video.srcObject = stream;
            video.onloadedmetadata = () => {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                croppedCanvas.width = video.videoWidth; // Adjust as necessary
                croppedCanvas.height = video.videoHeight; // Adjust as necessary
                updateCroppedArea(); // Start updating the cropped area
            };
        })
        .catch((err) => {
            console.error("Error accessing webcam", err);
        });

    // Handle canvas mouse down
    canvas.addEventListener("mousedown", function (event) {
        // console.log("clicked");
        if (event.button === 0) {
            // Left-click
            const { x, y } = getCursorPosition(event);
            const pointIndex = findPoint(x, y);
            // console.log(pointIndex);

            if (pointIndex !== -1) {
                isDragging = true;
                draggedPointIndex = pointIndex;
            } else {
                points.push({ x, y });
                // console.log(points.length)
                redrawCanvas();
            }
        }
    });

    // Handle canvas mouse move
    canvas.addEventListener("mousemove", function (event) {
        if (isDragging) {
            const { x, y } = getCursorPosition(event);
            points[draggedPointIndex] = { x, y };
            redrawCanvas();
        }
    });

    // Handle canvas mouse up
    canvas.addEventListener("mouseup", function (event) {
        isDragging = false;
    });

    // Handle right-click for deletion
    canvas.addEventListener("contextmenu", function (event) {
        event.preventDefault();
        if (!isDragging) {
            const { x, y } = getCursorPosition(event);
            const pointIndex = findPoint(x, y);

            if (pointIndex !== null) {
                points.splice(pointIndex, 1);
                redrawCanvas();
            }
        }
    });

    // Find if a point is clicked
    function findPoint(x, y) {
        return points.findIndex(
            (p) => Math.sqrt((p.x - x) * 2 + (p.y - y) * 2) < radius * 3
        );
    }

    // Get cursor position relative to canvas
    function getCursorPosition(event) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = video.videoWidth / rect.width;
        const scaleY = video.videoHeight / rect.height;
        return {
            x: (event.clientX - rect.left) * scaleX,
            y: (event.clientY - rect.top) * scaleY,
        };
    }

    // Draw a point
    function drawPoint(x, y) {
        context.fillStyle = "red";
        context.beginPath();
        context.arc(x, y, radius, 0, 2 * Math.PI);
        context.fill();
    }

    // Draw a square connecting points
    function drawSquare() {
        context.beginPath();
        context.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            context.lineTo(points[i].x, points[i].y);
        }
        context.closePath();
        context.strokeStyle = "red";
        context.stroke();
    }



    function cropAndDisplayArea() {
        if (points.length === 4 && cv && cv.imread && video.readyState === 4) {
            // Sort points to ensure correct order
            let sortedPoints = sortPointsCorners(points);

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
            let dsize = new cv.Size(croppedCanvas.width, croppedCanvas.height);
            let srcTri = cv.matFromArray(4, 1, cv.CV_32FC2, sortedPoints.flatMap(p => [p.x, p.y]));

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


    // Sort points to ensure correct order
    function sortPointsCorners(points) {
        // Sort points based on y-coordinates
        points.sort((a, b) => a.y - b.y);

        // Split into top and bottom two points
        let topPoints = points.slice(0, 2);
        let bottomPoints = points.slice(2, 4);

        // Sort top and bottom pairs based on x-coordinates
        topPoints.sort((a, b) => a.x - b.x);
        bottomPoints.sort((a, b) => a.x - b.x);

        // Return the sorted points: top-left, top-right, bottom-left, bottom-right
        return [topPoints[0], topPoints[1], bottomPoints[0], bottomPoints[1]];
        // return [bottomPoints[1], bottomPoints[0], topPoints[1], topPoints[0] ];
    }




    // Modify redrawCanvas to call cropAndDisplayArea
    function redrawCanvas() {
        context.clearRect(0, 0, canvas.width, canvas.height);
        points.forEach((p) => drawPoint(p.x, p.y));

        if (points.length === 4) {
            drawSquare();
            //   if (isDragging===false){
            //     cropAndDisplayArea();
            //   }
        }
    }

    function updateCroppedArea() {
        if (points.length === 4 && video.readyState === 4) {
            cropAndDisplayArea();
        }
        requestAnimationFrame(updateCroppedArea);
    }

    function downloadCanvasAsPNG(canvas, filename) {
        // Create an anchor element (for download)
        var downloadLink = document.createElement('a');
        downloadLink.setAttribute('download', filename);

        // Convert canvas to data URL
        var canvasDataURL = canvas.toDataURL('image/png');

        // Set the download link href to the data URL
        downloadLink.href = canvasDataURL;

        // Trigger the download by simulating click
        downloadLink.click();
    }

});