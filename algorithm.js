const SITE = 0;
const CIRCLE = 1;

const EPS_TOLERANCE = 1e-9;

class Vertex {
    constructor(lParabolaSite, rParabolaSite, rayStart = null) {
        this.lParabolaSite = lParabolaSite;
        this.rParabolaSite = rParabolaSite;
        if (!rayStart) {
            if (lParabolaSite.y === rParabolaSite.y) {
                rayStart = {x: (lParabolaSite.x + rParabolaSite.x) / 2, y: -Infinity};
            } else {
                const [lowerParabola, higherParabola] = lParabolaSite.y > rParabolaSite.y ?
                    [lParabolaSite, rParabolaSite] : [rParabolaSite, lParabolaSite];
                rayStart = {x: lowerParabola.x, y: calcParabolaY(higherParabola, lowerParabola.y, lowerParabola.x)};
            }
        }
        this.rayStart = rayStart;
    }

    rayStart;
    segmentEnd = null;
    lParabolaSite;
    rParabolaSite;
}

function init(sites) {
    if (sites.length < 2) {
        return {queue: [], beachLine: [], diagram: []};
    }
    const queue = sites.map(coord => [coord.y, SITE, coord])
        .sort((lhs, rhs) => lhs[0] !== rhs[0] ? lhs[0] - rhs[0] : lhs[2].x - rhs[2].x);

    let beachLine = [];
    let lastSite = queue[0][2];
    for (let i = 1; i < queue.length; ++i) {
        if (queue[i][2].y !== lastSite.y) {
            if (i !== 1) {
                queue.splice(0, i);
            } else {
                beachLine = [new Vertex(queue[0][2], queue[1][2]), new Vertex(queue[1][2], queue[0][2])];
                queue.splice(0, 2);
            }
            break;
        }
        beachLine.push(new Vertex(lastSite, queue[i][2]));
        lastSite = queue[i][2];
    }
    
    const diagram = {edges: [[...beachLine]], vertices: []}
    const state = {queue, beachLine, diagram};
    return state;
}

function getRayDirection(vertex) {
    return {x: -(vertex.rParabolaSite.y - vertex.lParabolaSite.y), y: vertex.rParabolaSite.x - vertex.lParabolaSite.x};
}

function calcParabolaY(parabolaSite, y_s, x) {
    return ((y_s**2 - parabolaSite.y**2) - (x - parabolaSite.x)**2) / (2 * (y_s - parabolaSite.y));
}

function getXFromVertex(vertex, y_s) {
    const [x1, y1, x2, y2] = [vertex.lParabolaSite.x, vertex.lParabolaSite.y,
        vertex.rParabolaSite.x, vertex.rParabolaSite.y];
    const a = (y2 - y1);
    if (a === 0) {
        return (x1 + x2) / 2;
    }
    const b_over_2 = ( (y_s - y2)*x1 - (y_s - y1)*x2 );
    const D = b_over_2**2 - a * ( (y1 - y2) *y_s**2 + (y2**2 - y1**2 + x2**2 - x1**2) *y_s
                        + y2*x1**2 - y1*x2**2 + y1**2*y2 - y2**2*y1 );
    const vx1 = ( -b_over_2 - Math.sqrt(D) ) / a;
    return vx1;
}

function getCircleEventParameters(s1, s2, s3) {
    const D = 4 * ((s2.x - s1.x) * (s3.y - s1.y) - (s3.x - s1.x) * (s2.y - s1.y));
    if (D === 0) {
        return null;
    }
    const d1 = 2 * (((s1.x ** 2 - s2.x ** 2) + (s1.y ** 2 - s2.y ** 2)) * (s3.y - s1.y)
                  - ((s1.x ** 2 - s3.x ** 2) + (s1.y ** 2 - s3.y ** 2)) * (s2.y - s1.y));
    const d2 = 2 * ((s2.x - s1.x) * ((s1.x ** 2 - s3.x ** 2) + (s1.y ** 2 - s3.y ** 2))
                  - (s3.x - s1.x) * ((s1.x ** 2 - s2.x ** 2) + (s1.y ** 2 - s2.y ** 2)));
    const x = -d1 / D;
    const y = -d2 / D;
    const r = Math.hypot(s1.x - x, s1.y - y);
    const y_line = y + r;
    return {x, y, r, y_line};
}

function insertCircleEvent(queue, lVertex, rVertex) {
    const circleEventParams = getCircleEventParameters(
        lVertex.lParabolaSite, rVertex.lParabolaSite, rVertex.rParabolaSite);
    if (circleEventParams === null) {console.warn(`circleEventParams is null`, lVertex, rVertex); return;}
    if (Math.abs(circleEventParams.x - getXFromVertex(rVertex, circleEventParams.y_line)) > EPS_TOLERANCE
        || Math.abs(circleEventParams.x - getXFromVertex(lVertex, circleEventParams.y_line)) > EPS_TOLERANCE) {
        return;
    }
    let insertionIdx = queue.findIndex(event => event[0] > circleEventParams.y_line);
    insertionIdx = insertionIdx !== -1 ? insertionIdx : queue.length;
    queue.splice(insertionIdx, 0, [circleEventParams.y_line, CIRCLE,
        {vertex: rVertex, coords: {x: circleEventParams.x, y: circleEventParams.y}}]);
}

function removeCircleEvent(queue, lVertex, rVertex) {
    const circleEventParams = getCircleEventParameters(
        lVertex.lParabolaSite, rVertex.lParabolaSite, rVertex.rParabolaSite);
    if (circleEventParams == null) {
        return;
    }

    const prevCircleEventIdx = queue.findIndex(([y, eventType, eventData]) =>
        y === circleEventParams.y_line && eventType === CIRCLE && eventData.vertex === rVertex);
    if (prevCircleEventIdx !== -1) {
        queue.splice(prevCircleEventIdx, 1);
    }
}

function step(state) {
    let {queue, beachLine, diagram} = state;
    const [y, eventType, eventData] = queue.shift();

    switch (eventType) {
        case SITE: {
            let idx = beachLine.findIndex(vert => getXFromVertex(vert, y) - eventData.x >= 0);
            idx = idx !== -1 ? idx : beachLine.length;
            
            const disectedParabolaSite = idx === beachLine.length ? idx === 0 ? null :
                beachLine[idx - 1].rParabolaSite : beachLine[idx].lParabolaSite;
            const leftVertex = new Vertex(disectedParabolaSite, eventData);
            const rightVertex = new Vertex(eventData, disectedParabolaSite);
            beachLine.splice(idx, 0, leftVertex, rightVertex);
            
            if (idx > 0 && idx + 2 < beachLine.length) {
                removeCircleEvent(queue, beachLine[idx - 1], beachLine[idx + 2]);
            }

            if (idx > 0) {
                insertCircleEvent(queue, beachLine[idx - 1], leftVertex);
            }
            if (idx + 2 < beachLine.length) {
                insertCircleEvent(queue, rightVertex, beachLine[idx + 2]);
            }
            
            diagram.edges.push([leftVertex, rightVertex]);
            
            break;
        }
        case CIRCLE: {
            let idx = beachLine.indexOf(eventData.vertex); // with a real priority queue we would have to search by x-coordinate.
            if (idx === -1) throw Error(`Circle event not found in beach line ${JSON.stringify(eventData)}`);
            idx = idx - 1;
            const [lVertex, rVertex] = [beachLine[idx], beachLine[idx + 1]];
            const circleEventCoords = eventData.coords;
            const newVertex = new Vertex(lVertex.lParabolaSite, rVertex.rParabolaSite, circleEventCoords);
            beachLine.splice(idx, 2, newVertex);

            if (idx > 0) {
                removeCircleEvent(queue, beachLine[idx - 1], lVertex);
                insertCircleEvent(queue, beachLine[idx - 1], newVertex);
            }
            if (idx + 1 < beachLine.length) {
                removeCircleEvent(queue, rVertex, beachLine[idx + 1]);
                insertCircleEvent(queue, newVertex, beachLine[idx + 1]);
            }

            diagram.vertices.push(circleEventCoords);
            lVertex.segmentEnd = circleEventCoords;
            rVertex.segmentEnd = circleEventCoords;
            diagram.edges.push([newVertex]);
        }
    }
}

