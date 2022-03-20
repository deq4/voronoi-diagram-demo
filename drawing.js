function convertCoords(coords) {
    return {x: coords.x * ALGO_SCALE, y: coords.y * ALGO_SCALE};
}

function getRayBorderIntersection(startPoint, rayDirection, border) {
    let x, y;
    if (rayDirection.x !== 0) {
        x = rayDirection.x > 0 ? border.right : border.left;
        y = startPoint.y + (x - startPoint.x ) * rayDirection.y / rayDirection.x;
    } else {
        y = rayDirection.y > 0 ? border.bottom : border.top;
        x = startPoint.x;
    }
    return {x, y};
}

function getQuardraticSplineMidPointParam(lowPoint, p1, p2) {
    const a = (p1.y - p2.y);
    if (a === 0) {
        return {x: 2 * lowPoint.x - (p1.x + p2.x) / 2, y: 2 * lowPoint.y - p1.y};
    }

    const D = (lowPoint.y - p1.y) * (lowPoint.y - p2.y);
    let t;
    if (p1.x <= lowPoint.x && lowPoint.x <= p2.x) {
        t = (lowPoint.y - p2.y - Math.sqrt(D)) / a;
    } else {
        t = (lowPoint.y - p2.y + Math.sqrt(D)) / a;
    }

    const y = (lowPoint.y - t * p1.y) / (1-t);
    const x = (lowPoint.x - t*t * p1.x - (1-t)*(1-t) * p2.x) / (2*t*(1-t));
    return {x, y};
}

function drawAxes(drawingParams) {
    ctx.arc(0, 0, 2 / drawingParams.scale, 0, 2 * Math.PI);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(drawingParams.border.left, 0);
    ctx.lineTo(drawingParams.border.right, 0);
    ctx.moveTo(0, drawingParams.border.top);
    ctx.lineTo(0, drawingParams.border.bottom);
    ctx.stroke();
}

function drawCircle(x, y, size) {
    ctx.beginPath();
    ctx.arc(x, y, size, 0, 2 * Math.PI);
    ctx.fill();
}

function drawEdges(edges, border) {
    for (const edge of edges) {
        for (const ray of edge) {
            const startCoords = convertCoords(ray.rayStart);
            let endCoords;
            if (ray.segmentEnd) {
                endCoords = convertCoords(ray.segmentEnd);
            } else {
                const rayDirection = getRayDirection(ray);
                endCoords = getRayBorderIntersection(startCoords, rayDirection, border);
            }

            ctx.beginPath();
            ctx.moveTo(startCoords.x, startCoords.y === -Infinity ? border.top : startCoords.y);
            ctx.lineTo(endCoords.x, endCoords.y);
            ctx.stroke();
        }
    }
}

function drawParabola(lowPoint, p1, p2) {
    const cp = getQuardraticSplineMidPointParam(lowPoint, p1, p2);
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.quadraticCurveTo(cp.x, cp.y, p2.x, p2.y);
    ctx.stroke();
}

function clamp(x, lo, hi) {
    return Math.min(Math.max(x, lo), hi);
}

function drawParabolas(state, border, yScanLine) {
    const beachLine = state.beachLine;

    const minYSite = state.firstSite;
    if (beachLine.length === 0 && (minYSite === null || yScanLine <= minYSite.y)) {
        return;
    }

    for (let i = -1; i < beachLine.length; ++i) {
        let lX, rX;
        if (i !== -1) {
            lX = clamp(getXFromVertex(beachLine[i], yScanLine),
                border.left / ALGO_SCALE, border.right / ALGO_SCALE);
        } else {
            lX = border.left / ALGO_SCALE;
        }
        if (i !== beachLine.length - 1) {
            rX = clamp(getXFromVertex(beachLine[i+1], yScanLine),
                border.left / ALGO_SCALE, border.right / ALGO_SCALE);
        } else {
            rX = border.right / ALGO_SCALE;
        }
        if (lX >= rX) {
            continue;
        }
        const site = i !== -1 ? beachLine[i].rParabolaSite :
            beachLine.length !== 0 ? beachLine[i+1].lParabolaSite : minYSite;
        if (lX === site.x) {
            lX -= 1e-6;
        }
        if (rX === site.x) {
            rX += 1e-6;
        }
        const lP = convertCoords({x: lX, y: calcParabolaY(site, yScanLine, lX)});
        const rP = convertCoords({x: rX, y: calcParabolaY(site, yScanLine, rX)});
        const lowP = convertCoords({x: site.x, y: (site.y + yScanLine) / 2});
        drawParabola(lowP, lP, rP);
    }
}

function drawDiagram(sites, state, drawingParams) {
    const diagram = state.diagram;

    ctx.save();

    ctx.fillStyle = "black";
    for (site of sites) {
        const coords = convertCoords(site);
        drawCircle(coords.x, coords.y, 5 / drawingParams.scale);
    }

    ctx.fillStyle = "blue";
    for (vertex of diagram.vertices) {
        const coords = convertCoords(vertex);
        drawCircle(coords.x, coords.y, 5 / drawingParams.scale);
    }

    ctx.strokeStyle = "green";
    drawEdges(diagram.edges, drawingParams.border);

    ctx.strokeStyle = "black";
    drawParabolas(state, drawingParams.border, yScanLine);

    ctx.restore();
}

function drawScanLine(drawingParams, scanLineY) {
    ctx.save();
    ctx.strokeStyle = "red";

    ctx.beginPath();
    ctx.moveTo(drawingParams.border.left, scanLineY * ALGO_SCALE);
    ctx.lineTo(drawingParams.border.right, scanLineY * ALGO_SCALE);
    ctx.stroke();

    ctx.restore();
}

let lastFrame = null;
function drawLoop(ts) {
    ctx.resetTransform();
    ctx.clearRect(0, 0, width, height);
    ctx.beginPath();

    const [x_off, y_off, scale] = [parseFloat(window.x_off.value), parseFloat(window.y_off.value),
        parseFloat(window.scale.value)];
    const border = {left: -x_off / scale, right: (-x_off + width) / scale,
        top: -y_off / scale, bottom: (-y_off + height) / scale};
    const drawingParams = {border, x_off, y_off, scale};

    ctx.translate(x_off, y_off);
    ctx.scale(scale, scale);
    ctx.lineWidth = 1.5 / scale;

    drawAxes(drawingParams);

    drawDiagram(sites, state, drawingParams);

    drawScanLine(drawingParams, yScanLine);

    if (animationRunning === false) {
        lastFrame = null;
    } else {
        if (state.queue.length === 0) {
            animationRunning = false;
        } else if (lastFrame === null) {
            lastFrame = ts;
        } else {
            const elapsed = ts - lastFrame;
            lastFrame = ts;

            const dYScanLine = elapsed / 1000 * ANIMATION_SPEED;
            yScanLine += dYScanLine;

            while (state.queue.length > 0 && state.queue[0][0] < yScanLine) {
                step(state);
            }
        }
    }

    requestAnimationFrame(drawLoop);
};
