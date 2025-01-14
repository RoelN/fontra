import chai from "chai";
const expect = chai.expect;

import VarPath from "../src/fontra/client/core/var-path.js";
import VarArray from "../src/fontra/client/core/var-array.js";
import { Transform } from "../src/fontra/client/core/transform.js";


class MockPath2D {
  constructor() {
    this.items = [];
  }
  moveTo(x, y) {
    this.items.push({op: "moveTo", args: [x, y]})
  }
  lineTo(x, y) {
    this.items.push({op: "lineTo", args: [x, y]})
  }
  bezierCurveTo(x1, y1, x2, y2, x3, y3) {
    this.items.push({op: "bezierCurveTo", args: [x1, y1, x2, y2, x3, y3]})
  }
  quadraticCurveTo(x1, y1, x2, y2) {
    this.items.push({op: "quadraticCurveTo", args: [x1, y1, x2, y2]})
  }
  closePath() {
    this.items.push({op: "closePath", args: []});
  }
}


function simpleTestPath(isClosed=true) {
  return new VarPath(
    new VarArray(0, 0, 0, 100, 100, 100, 100, 0),
    [VarPath.ON_CURVE, VarPath.ON_CURVE, VarPath.ON_CURVE, VarPath.ON_CURVE],
    [{endPoint: 3, isClosed: isClosed}],
  );
}


describe("VarPath Tests", () => {
  
  it("empty copy", () => {
    const p = new VarPath();
    const p2 = p.copy();
    const mp = new MockPath2D();
    expect(p2.coordinates).to.deep.equal([]);
    expect(p2.pointTypes).to.deep.equal([]);
    expect(p2.contourInfo).to.deep.equal([]);
    p2.drawToPath2d(mp);
    expect(mp.items).to.deep.equal([]);
  })

  it("constructor", () => {
    const p = simpleTestPath();
    expect(p.coordinates).to.deep.equal([0, 0, 0, 100, 100, 100, 100, 0]);
    expect(p.pointTypes).to.deep.equal([VarPath.ON_CURVE, VarPath.ON_CURVE, VarPath.ON_CURVE, VarPath.ON_CURVE]);
    expect(p.contourInfo).to.deep.equal([{endPoint: 3, isClosed: true}]);
  })

  it("copy", () => {
    const p = simpleTestPath();
    const p2 = p.copy();
    // modify original
    p.coordinates[0] = 1000;
    p.pointTypes[0] = VarPath.OFF_CURVE_QUAD
    p.contourInfo[0].isClosed = false;
    expect(p2.coordinates).to.deep.equal([0, 0, 0, 100, 100, 100, 100, 0]);
    expect(p2.pointTypes).to.deep.equal([VarPath.ON_CURVE, VarPath.ON_CURVE, VarPath.ON_CURVE, VarPath.ON_CURVE]);
    expect(p2.contourInfo).to.deep.equal([{endPoint: 3, isClosed: true}]);
  })

  it("draw", () => {
    const p = simpleTestPath();
    const mp = new MockPath2D();
    p.drawToPath2d(mp);
    expect(mp.items).to.deep.equal(
      [
        {"args": [0, 0], "op": "moveTo"},
        {"args": [0, 100], "op": "lineTo"},
        {"args": [100, 100], "op": "lineTo"},
        {"args": [100, 0], "op": "lineTo"},
        {"args": [0, 0], "op": "lineTo"},
        {"args": [], "op": "closePath"},
      ],
    );
  })

  it("open path", () => {
    const p = simpleTestPath(false);
    const mp = new MockPath2D();
    p.drawToPath2d(mp);
    expect(mp.items).to.deep.equal(
      [
        {"args": [0, 0], "op": "moveTo"},
        {"args": [0, 100], "op": "lineTo"},
        {"args": [100, 100], "op": "lineTo"},
        {"args": [100, 0], "op": "lineTo"},
      ],
    );
  })

  it("closed path dangling off curves", () => {
    const p = new VarPath(
      new VarArray(0, 0, 0, 100, 100, 100, 100, 0),
      [VarPath.OFF_CURVE_QUAD, VarPath.ON_CURVE, VarPath.OFF_CURVE_QUAD, VarPath.ON_CURVE],
      [{endPoint: 3, isClosed: true}],
    );
    const mp = new MockPath2D();
    p.drawToPath2d(mp);
    expect(mp.items).to.deep.equal(
      [
        {"args": [0, 100], "op": "moveTo"},
        {"args": [100, 100, 100, 0], "op": "quadraticCurveTo"},
        {"args": [0, 0, 0, 100], "op": "quadraticCurveTo"},
        {"args": [], "op": "closePath"},
      ],
    );
  })

  it("open path dangling off curves", () => {
    const p = new VarPath(
      new VarArray(0, 0, 0, 100, 100, 100, 100, 0),
      [VarPath.OFF_CURVE_QUAD, VarPath.ON_CURVE, VarPath.OFF_CURVE_QUAD, VarPath.ON_CURVE],
      [{endPoint: 3, isClosed: false}],
    );
    const mp = new MockPath2D();
    p.drawToPath2d(mp);
    expect(mp.items).to.deep.equal(
      [
        {"args": [0, 100], "op": "moveTo"},
        {"args": [100, 100, 100, 0], "op": "quadraticCurveTo"},
      ],
    );
  })

  it("quad", () => {
    const p = new VarPath(
      new VarArray(0, 0, 0, 100, 100, 100, 100, 0),
      [VarPath.ON_CURVE, VarPath.OFF_CURVE_QUAD, VarPath.OFF_CURVE_QUAD, VarPath.OFF_CURVE_QUAD],
      [{endPoint: 3, isClosed: true}],
    );
    const mp = new MockPath2D();
    p.drawToPath2d(mp);
    expect(mp.items).to.deep.equal(
      [
        {"args": [0, 0], "op": "moveTo"},
        {"args": [0, 100, 50, 100], "op": "quadraticCurveTo"},
        {"args": [100, 100, 100, 50], "op": "quadraticCurveTo"},
        {"args": [100, 0, 0, 0], "op": "quadraticCurveTo"},
        {"args": [], "op": "closePath"},
      ],
    );
  })

  it("quad blob", () => {
    const p = new VarPath(
      new VarArray(0, 0, 0, 100, 100, 100, 100, 0),
      [VarPath.OFF_CURVE_QUAD, VarPath.OFF_CURVE_QUAD, VarPath.OFF_CURVE_QUAD, VarPath.OFF_CURVE_QUAD],
      [{endPoint: 3, isClosed: true}],
    );
    const mp = new MockPath2D();
    p.drawToPath2d(mp);
    expect(mp.items).to.deep.equal(
      [
        {"args": [50, 0], "op": "moveTo"},
        {"args": [0, 0, 0, 50], "op": "quadraticCurveTo"},
        {"args": [0, 100, 50, 100], "op": "quadraticCurveTo"},
        {"args": [100, 100, 100, 50], "op": "quadraticCurveTo"},
        {"args": [100, 0, 50, 0], "op": "quadraticCurveTo"},
        {"args": [], "op": "closePath"},
      ],
    );
  })

  it("cubic", () => {
    const p = new VarPath(
      new VarArray(0, 0, 0, 100, 100, 100, 100, 0),
      [VarPath.ON_CURVE, VarPath.OFF_CURVE_CUBIC, VarPath.OFF_CURVE_CUBIC, VarPath.ON_CURVE],
      [{endPoint: 3, isClosed: true}],
    );
    const mp = new MockPath2D();
    p.drawToPath2d(mp);
    expect(mp.items).to.deep.equal(
      [
        {"args": [0, 0], "op": "moveTo"},
        {"args": [0, 100, 100, 100, 100, 0], "op": "bezierCurveTo"},
        {"args": [0, 0], "op": "lineTo"},
        {"args": [], "op": "closePath"},
      ],
    );
  })

  it("add", () => {
    const p1 = new VarPath(
      new VarArray(0, 0, 0, 100, 100, 100, 100, 0),
      [VarPath.ON_CURVE, VarPath.OFF_CURVE_CUBIC, VarPath.OFF_CURVE_CUBIC, VarPath.ON_CURVE],
      [{endPoint: 3, isClosed: true}],
    );
    const p2 = p1.copy();
    const p3 = p1.addItemwise(p2);
    const mp = new MockPath2D();
    p3.drawToPath2d(mp);
    expect(mp.items).to.deep.equal(
      [
        {"args": [0, 0], "op": "moveTo"},
        {"args": [0, 200, 200, 200, 200, 0], "op": "bezierCurveTo"},
        {"args": [0, 0], "op": "lineTo"},
        {"args": [], "op": "closePath"},
      ],
    );
  })

  it("sub", () => {
    const p1 = new VarPath(
      new VarArray(0, 0, 0, 100, 100, 100, 100, 0),
      [VarPath.ON_CURVE, VarPath.OFF_CURVE_CUBIC, VarPath.OFF_CURVE_CUBIC, VarPath.ON_CURVE],
      [{endPoint: 3, isClosed: true}],
    );
    const p2 = p1.copy();
    const p3 = p1.subItemwise(p2);
    const mp = new MockPath2D();
    p3.drawToPath2d(mp);
    expect(mp.items).to.deep.equal(
      [
        {"args": [0, 0], "op": "moveTo"},
        {"args": [0, 0, 0, 0, 0, 0], "op": "bezierCurveTo"},
        {"args": [0, 0], "op": "lineTo"},
        {"args": [], "op": "closePath"},
      ],
    );
  })

  it("mul", () => {
    const p = new VarPath(
      new VarArray(0, 0, 0, 100, 100, 100, 100, 0),
      [VarPath.ON_CURVE, VarPath.OFF_CURVE_CUBIC, VarPath.OFF_CURVE_CUBIC, VarPath.ON_CURVE],
      [{endPoint: 3, isClosed: true}],
    );
    const mp = new MockPath2D();
    const p2 = p.mulScalar(2);
    p2.drawToPath2d(mp);
    expect(mp.items).to.deep.equal(
      [
        {"args": [0, 0], "op": "moveTo"},
        {"args": [0, 200, 200, 200, 200, 0], "op": "bezierCurveTo"},
        {"args": [0, 0], "op": "lineTo"},
        {"args": [], "op": "closePath"},
      ],
    );
  })

  it("pen-ish methods", () => {
    const p = new VarPath();
    const mp = new MockPath2D();
    p.moveTo(0, 0);
    p.lineTo(0, 100);
    p.cubicCurveTo(30, 130, 70, 130, 100, 100);
    p.quadraticCurveTo(130, 70, 130, 30, 100, 0);
    p.closePath();
    p.drawToPath2d(mp);
    expect(mp.items).to.deep.equal(
      [
        {"args": [0, 0], "op": "moveTo"},
        {"args": [0, 100], "op": "lineTo"},
        {"args": [30, 130, 70, 130, 100, 100], "op": "bezierCurveTo"},
        {"args": [130, 70, 130, 50], "op": "quadraticCurveTo"},
        {"args": [130, 30, 100, 0], "op": "quadraticCurveTo"},
        {"args": [0, 0], "op": "lineTo"},
        {"args": [], "op": "closePath"},
      ],
    );
  })

  it("iterPoints", () => {
    const p = new VarPath(
      new VarArray(0, 0, 0, 100, 100, 100, 100, 0),
      [VarPath.ON_CURVE, VarPath.OFF_CURVE_CUBIC, VarPath.OFF_CURVE_CUBIC, VarPath.ON_CURVE],
      [{endPoint: 3, isClosed: true}],
    );
    const points = [];
    for (const pt of p.iterPoints()) {
      points.push(pt)
    }
    expect(points).to.deep.equal(
      [
        {x: 0, y: 0, type: 0, smooth: false},
        {x: 0, y: 100, type: 2, smooth: false},
        {x: 100, y: 100, type: 2, smooth: false},
        {x: 100, y: 0, type: 0, smooth: false},
      ],
    );
  })

  it("transformed", () => {
    const t = new Transform().scale(2);
    const p = simpleTestPath(false);
    const mp = new MockPath2D();
    p.transformed(t).drawToPath2d(mp);
    expect(mp.items).to.deep.equal(
      [
        {"args": [0, 0], "op": "moveTo"},
        {"args": [0, 200], "op": "lineTo"},
        {"args": [200, 200], "op": "lineTo"},
        {"args": [200, 0], "op": "lineTo"},
      ],
    );
  });

  it("concat", () => {
    const p1 = simpleTestPath();
    const p2 = p1.copy();
    const p3 = p1.concat(p2);
    const mp = new MockPath2D();
    p3.drawToPath2d(mp);
    expect(mp.items).to.deep.equal(
      [
        {"args": [0, 0], "op": "moveTo"},
        {"args": [0, 100], "op": "lineTo"},
        {"args": [100, 100], "op": "lineTo"},
        {"args": [100, 0], "op": "lineTo"},
        {"args": [0, 0], "op": "lineTo"},
        {"args": [], "op": "closePath"},
        {"args": [0, 0], "op": "moveTo"},
        {"args": [0, 100], "op": "lineTo"},
        {"args": [100, 100], "op": "lineTo"},
        {"args": [100, 0], "op": "lineTo"},
        {"args": [0, 0], "op": "lineTo"},
        {"args": [], "op": "closePath"},
      ],
    );
  });

  it("getPoint", () => {
    const p = simpleTestPath();
    expect(p.getPoint(-1)).to.deep.equal(undefined);
    expect(p.getPoint(0)).to.deep.equal({"x": 0, "y": 0, "type": 0, "smooth": false});
    expect(p.getPoint(3)).to.deep.equal({"x": 100, "y": 0, "type": 0, "smooth": false});
    expect(p.getPoint(4)).to.deep.equal(undefined);
  });

  it("getContourIndex", () => {
    const p = new VarPath(
      new VarArray(),  // dummy
      [],  // dummy
      [
        {endPoint: 3, isClosed: true},
        {endPoint: 13, isClosed: true},
        {endPoint: 15, isClosed: true},
        {endPoint: 20, isClosed: true},
      ],
    );
    expect(p.getContourIndex(-1)).to.equal(undefined);
    expect(p.getContourIndex(0)).to.equal(0);
    expect(p.getContourIndex(3)).to.equal(0);
    expect(p.getContourIndex(4)).to.equal(1);
    expect(p.getContourIndex(5)).to.equal(1);
    expect(p.getContourIndex(13)).to.equal(1);
    expect(p.getContourIndex(14)).to.equal(2);
    expect(p.getContourIndex(15)).to.equal(2);
    expect(p.getContourIndex(16)).to.equal(3);
    expect(p.getContourIndex(20)).to.equal(3);
    expect(p.getContourIndex(21)).to.equal(undefined);
  });

  it("iterPointsOfContour", () => {
    const p = simpleTestPath();
    const pts = Array.from(p.iterPointsOfContour(0));
    expect(pts.length).to.equal(4);
    expect(pts[0]).to.deep.equal({"x": 0, "y": 0, "type": 0, "smooth": false});
    expect(pts[3]).to.deep.equal({"x": 100, "y": 0, "type": 0, "smooth": false});
    expect(pts[3]).to.deep.equal({"x": 100, "y": 0, "type": 0, "smooth": false});
    expect(Array.from(p.iterPointsOfContour(-1)).length).to.equal(4);
    expect(() => {Array.from(p.iterPointsOfContour(1))}).to.throw("contourIndex out of bounds: 1");
  });

  it("getControlBounds", () => {
    const p = new VarPath();
    p.moveTo(0, 75);
    p.cubicCurveTo(25, 100, 75, 100, 100, 25);
    p.lineTo(70, 0);
    p.closePath();
    const t = new Transform().scale(1.5, 2);
    const p2 = p.transformed(t);
    expect(p.getControlBounds()).to.deep.equal({"xMin": 0, "yMin": 0, "xMax": 100, "yMax": 100});
    expect(p2.getControlBounds()).to.deep.equal({"xMin": 0, "yMin": 0, "xMax": 150, "yMax": 200});
  });

  it("empty getControlBounds", () => {
    const p = new VarPath();
    expect(p.getControlBounds()).to.deep.equal(undefined);
  });

  it("test firstOnCurve bug", () => {
    const p1 = simpleTestPath();
    const p2 = p1.concat(p1);
    p2.pointTypes[0] = VarPath.OFF_CURVE_CUBIC;
    p2.pointTypes[1] = VarPath.OFF_CURVE_CUBIC;
    p2.pointTypes[5] = VarPath.OFF_CURVE_CUBIC;
    p2.pointTypes[6] = VarPath.OFF_CURVE_CUBIC;
    expect(p2.coordinates.length).to.equal(16);
    expect(p2.contourInfo.length).to.equal(2);
    expect(p2.contourInfo[0].endPoint).to.equal(3);
    expect(p2.contourInfo[1].endPoint).to.equal(7);
    const mp = new MockPath2D();
    p2.drawToPath2d(mp);
    expect(mp.items).to.deep.equal([
      {"op": "moveTo", "args": [100, 100]},
      {"op": "lineTo", "args": [100, 0]},
      {"op": "bezierCurveTo", "args": [0, 0, 0, 100, 100, 100]},
      {"op": "closePath", "args": []},
      {"op": "moveTo", "args": [0, 0]},
      {"op": "bezierCurveTo", "args": [0, 100, 100, 100, 100, 0]},
      {"op": "lineTo", "args": [0, 0]},
      {"op": "closePath", "args": []},
    ]);
  });

  it("test setPoint[Position]", () => {
    const p1 = simpleTestPath();
    const mp = new MockPath2D();
    p1.setPointPosition(1, 23, 45);
    p1.setPoint(2, {"x": 65, "y": 43, "type": VarPath.OFF_CURVE_QUAD});
    p1.drawToPath2d(mp);
    expect(mp.items).to.deep.equal([
      {"args": [0, 0], "op": "moveTo"},
      {"args": [23, 45], "op": "lineTo"},
      {"args": [65, 43, 100, 0], "op": "quadraticCurveTo"},
      {"args": [0, 0], "op": "lineTo"},
      {"args": [], "op": "closePath"},
    ]);
  });

  it("test insertPoint 0", () => {
    const p1 = simpleTestPath();
    p1.insertPoint(-1, 0, {"x": 12, "y": 13});
    const mp = new MockPath2D();
    p1.drawToPath2d(mp);
    expect(mp.items).to.deep.equal([
      {"args": [12, 13], "op": "moveTo"},
      {"args": [0, 0], "op": "lineTo"},
      {"args": [0, 100], "op": "lineTo"},
      {"args": [100, 100], "op": "lineTo"},
      {"args": [100, 0], "op": "lineTo"},
      {"args": [12, 13], "op": "lineTo"},
      {"args": [], "op": "closePath"},
    ]);
  });

  it("test insertPoint 1", () => {
    const p1 = simpleTestPath();
    p1.insertPoint(-1, 1, {"x": 12, "y": 13});
    const mp = new MockPath2D();
    p1.drawToPath2d(mp);
    expect(mp.items).to.deep.equal([
      {"args": [0, 0], "op": "moveTo"},
      {"args": [12, 13], "op": "lineTo"},
      {"args": [0, 100], "op": "lineTo"},
      {"args": [100, 100], "op": "lineTo"},
      {"args": [100, 0], "op": "lineTo"},
      {"args": [0, 0], "op": "lineTo"},
      {"args": [], "op": "closePath"},
    ]);
  });

  it("test appendPoint", () => {
    const p1 = simpleTestPath();
    p1.appendPoint(-1, {"x": 12, "y": 13});
    const mp = new MockPath2D();
    p1.drawToPath2d(mp);
    expect(mp.items).to.deep.equal([
      {"args": [0, 0], "op": "moveTo"},
      {"args": [0, 100], "op": "lineTo"},
      {"args": [100, 100], "op": "lineTo"},
      {"args": [100, 0], "op": "lineTo"},
      {"args": [12, 13], "op": "lineTo"},
      {"args": [0, 0], "op": "lineTo"},
      {"args": [], "op": "closePath"},
    ]);
  });

  it("test appendPoint via insertPoint", () => {
    const p1 = simpleTestPath();
    p1.insertPoint(-1, 4, {"x": 12, "y": 13});
    const mp = new MockPath2D();
    p1.drawToPath2d(mp);
    expect(mp.items).to.deep.equal([
      {"args": [0, 0], "op": "moveTo"},
      {"args": [0, 100], "op": "lineTo"},
      {"args": [100, 100], "op": "lineTo"},
      {"args": [100, 0], "op": "lineTo"},
      {"args": [12, 13], "op": "lineTo"},
      {"args": [0, 0], "op": "lineTo"},
      {"args": [], "op": "closePath"},
    ]);
  });

  it("test appendPoint with contour index", () => {
    const p1 = simpleTestPath();
    const t = new Transform().translate(10, 10).scale(2);
    const p2 = simpleTestPath().transformed(t);
    const p3 = p1.concat(p2);
    p3.appendPoint(1, {"x": 12, "y": 13});
    const mp = new MockPath2D();
    p3.drawToPath2d(mp);
    expect(mp.items).to.deep.equal([
      {"args": [0, 0], "op": "moveTo"},
      {"args": [0, 100], "op": "lineTo"},
      {"args": [100, 100], "op": "lineTo"},
      {"args": [100, 0], "op": "lineTo"},
      {"args": [0, 0], "op": "lineTo"},
      {"args": [], "op": "closePath"},
      {"args": [10, 10], "op": "moveTo"},
      {"args": [10, 210], "op": "lineTo"},
      {"args": [210, 210], "op": "lineTo"},
      {"args": [210, 10], "op": "lineTo"},
      {"args": [12, 13], "op": "lineTo"},
      {"args": [10, 10], "op": "lineTo"},
      {"args": [], "op": "closePath"},
    ]);
  });

  it("test appendPoint index error", () => {
    const p1 = simpleTestPath();
    expect(() => {p1.appendPoint(1, {"x": 12, "y": 13})}).to.throw("contourIndex out of bounds: 1");
  });

  it("test deletePoint", () => {
    const p1 = simpleTestPath();
    p1.setPointType(3, VarPath.OFF_CURVE_QUAD);
    p1.deletePoint(0, 1);
    const mp = new MockPath2D();
    p1.drawToPath2d(mp);
    expect(mp.items).to.deep.equal([
      {"args": [0, 0], "op": "moveTo"},
      {"args": [100, 100], "op": "lineTo"},
      {"args": [100, 0, 0, 0], "op": "quadraticCurveTo"},
      {"args": [], "op": "closePath"},
    ]);
  });

  it("test deletePoint index error", () => {
    const p1 = simpleTestPath();
    expect(() => {p1.deletePoint(0, 4)}).to.throw("contourPointIndex out of bounds: 4");
    expect(() => {p1.deletePoint(0, 5)}).to.throw("contourPointIndex out of bounds: 5");
  });

})
