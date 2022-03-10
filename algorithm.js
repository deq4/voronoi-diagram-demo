const SITE = 0;
const CIRCLE = 1;

const EPS_TOLERANCE = 1e-9;

class Vertex {
    constructor(lParabolaSite, rParabolaSite, rayStart = null) {
        this.lParabolaSite = lParabolaSite;
        this.rParabolaSite = rParabolaSite;
        if (!rayStart) {
            const [lowerParabola, higherParabola] = lParabolaSite.y > rParabolaSite.y ?
                [lParabolaSite, rParabolaSite] : [rParabolaSite, lParabolaSite];
            rayStart = {x: lowerParabola.x, y: calcParabolaY(higherParabola, lowerParabola.y, lowerParabola.x)};
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
    const queue = sites
    .map((coord) => [coord.y, SITE, coord])
        .sort((lhs, rhs) => lhs[0] - rhs[0]);
    const s1 = queue[0][2];
    const s2 = queue[1][2];
    queue.splice(0, 2);
    const beachLine = [new Vertex(s1, s2), new Vertex(s2, s1)];
    const diagram = {edges: [[beachLine[0], beachLine[1]]], vertices: []}
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
        return -( (y1 - y2) *y_s**2 + (y2**2 - y1**2 + x2**2 - x1**2) *y_s + y2*x1**2 - y1*x2**2 + y1**2*y2 - y2**2*y1 )
            / ( 2 * ( (y_s - y2)*x1 - (y_s - y1)*x2 ) );
    }
    const b_over_2 = ( (y_s - y2)*x1 - (y_s - y1)*x2 );
    const D = b_over_2**2 - a * ( (y1 - y2) *y_s**2 + (y2**2 - y1**2 + x2**2 - x1**2) *y_s
                        + y2*x1**2 - y1*x2**2 + y1**2*y2 - y2**2*y1 );
    const vx1 = ( -b_over_2 - Math.sqrt(D) ) / a;
    return vx1;
}

function getCircleEventVertexCoords(s1, s2, s3) {
    const D = 4 * ((s2.x - s1.x) * (s3.y - s1.y) - (s3.x - s1.x) * (s2.y - s1.y));
    if (D === 0) {
        return null;
    }
    const d1 = 2 * (((s1.x ** 2 - s2.x ** 2) + (s1.y ** 2 - s2.y ** 2)) * (s3.y - s1.y)
                  - ((s1.x ** 2 - s3.x ** 2) + (s1.y ** 2 - s3.y ** 2)) * (s2.y - s1.y));
    const d2 = 2 * ((s2.x - s1.x) * ((s1.x ** 2 - s3.x ** 2) + (s1.y ** 2 - s3.y ** 2))
                  - (s3.x - s1.x) * ((s1.x ** 2 - s2.x ** 2) + (s1.y ** 2 - s2.y ** 2)));
    const xc = -d1 / D;
    const yc = -d2 / D;
    return {x:xc, y:yc};
}

function getCircleEventLineY(s1, s2, s3) {
    const vertexCoords = getCircleEventVertexCoords(s1, s2, s3);
    if (vertexCoords === null) {
        return null;
    }
    const r = Math.hypot(s1.x - vertexCoords.x, s1.y - vertexCoords.y);
    return vertexCoords.y + r;
}


function insertCircleEvent(queue, lVertex, rVertex) {
    const circleEventCoords = getCircleEventVertexCoords(
        lVertex.lParabolaSite, rVertex.lParabolaSite, rVertex.rParabolaSite);
    if (circleEventCoords === null) {console.warn(`CircleEventY is null`, lVertex, rVertex); return;}
    const circleEventLineY = getCircleEventLineY(
        lVertex.lParabolaSite, rVertex.lParabolaSite, rVertex.rParabolaSite);
    if (Math.abs(circleEventCoords.x - getXFromVertex(rVertex, circleEventLineY)) > EPS_TOLERANCE
        || Math.abs(circleEventCoords.x - getXFromVertex(lVertex, circleEventLineY)) > EPS_TOLERANCE) {
        return;
    }
    let insertionIdx = queue.findIndex(event => event[0] > circleEventLineY);
    insertionIdx = insertionIdx !== -1 ? insertionIdx : queue.length;
    queue.splice(insertionIdx, 0, [circleEventLineY, CIRCLE, rVertex]);
}

function removeCircleEvent(queue, lVertex, rVertex) {
    const prevCircleEventY = getCircleEventLineY(
        lVertex.lParabolaSite, rVertex.lParabolaSite, rVertex.rParabolaSite);

    const prevCircleEventIdx = queue.findIndex(([y, eventType, vertex]) =>
        y === prevCircleEventY && eventType === CIRCLE && vertex === rVertex);
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
            let idx = beachLine.indexOf(eventData); // with a real priority queue we would have to search by x-coordinate.
            if (idx === -1) throw Error(`Circle event not found in beach line ${JSON.stringify(eventData)}`);
            idx = idx - 1;
            const [lVertex, rVertex] = [beachLine[idx], beachLine[idx + 1]];
            const circleEventCoords = getCircleEventVertexCoords(lVertex.lParabolaSite, lVertex.rParabolaSite, rVertex.rParabolaSite);
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

