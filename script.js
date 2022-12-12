const PX_PER_M = (1080 / 19.4) * 100;
const DELTA_T = 1 / 120; //s
const ZOOM_RATIO = 100;

class Vector {
	constructor(Arr) {
		this.dat = Arr;
		this.dim = Arr.length;
	}

	add = (that) => {
		let C = new Vector(new Array(this.dim).fill(0));
		for (let i = 0; i < this.dim; i++) {
			if (typeof this.dat[i] == "number") C.dat[i] = this.dat[i] + that.dat[i];
			else C.dat[i] = this.dat[i].add(that.dat[i]);
		}
		return C;
	};

	mulk = (k) => {
		let C = new Vector(new Array(this.dim).fill(0));
		for (let i = 0; i < this.dim; i++) {
			if (typeof this.dat[i] == "number") C.dat[i] = this.dat[i] * k;
			else C.dat[i] = this.dat[i].mulk(k);
		}
		return C;
	};

	abs = () => {
		let res = 0;
		for (let i = 0; i < this.dim; i++) {
			if (typeof this.dat[i] == "number") res += this.dat[i] * this.dat[i];
			else res += this.dat[i].abs();
		}
		return Math.sqrt(res);
	};

	sub = (that) => {
		return this.add(that.mulk(-1));
	};

	id = () => {
		return this.mulk(1 / this.abs());
	};
}

class matter {
	constructor(dim, R, V, m, minR, maxR, CANVAS) {
		this.dim = dim;
		//[R, V, m]
		this.X = new Vector(
			new Array(new Vector(R).mulk(ZOOM_RATIO), new Vector(V).mulk(ZOOM_RATIO))
		);
		this.t = 0;
		this.m = m;
		this.minR = new Vector(minR).mulk(ZOOM_RATIO / PX_PER_M);
		this.maxR = new Vector(maxR).mulk(ZOOM_RATIO / PX_PER_M);
		this.forceList = new Array();
		this.CANVAS = CANVAS;

		this.itv = setInterval(this.Next, DELTA_T * 1000);
	}

	addForce = (F) => {
		this.forceList.push(F);
	};

	dv_dt = (t, X) => {
		let F = new Vector(new Array(this.dim).fill(0));
		for (let everyF of this.forceList) F = F.add(everyF(t, X, this.m));
		for (let i = 0; i < X.dat[0].dim; i++)
			if (X.dat[0].dat[i] < this.minR.dat[i])
				F.dat[i] += (this.minR.dat[i] - X.dat[0].dat[i]) * 1000;
		for (let i = 0; i < X.dat[0].dim; i++)
			if (X.dat[0].dat[i] > this.maxR.dat[i])
				F.dat[i] += (this.maxR.dat[i] - X.dat[0].dat[i]) * 1000;

		return F.mulk(1 / this.m);
	};

	dr_dt = (t, X) => {
		return X.dat[1];
	};

	dX_dt = (t, X) => {
		return new Vector(new Array(this.dr_dt(t, X), this.dv_dt(t, X)));
	};

	RK = (Func, t, X) => {
		let K1 = Func(t, X);
		let K2 = Func(t + DELTA_T / 2, K1.mulk(DELTA_T / 2).add(X));
		let K3 = Func(t + DELTA_T / 2, K2.mulk(DELTA_T / 2).add(X));
		let K4 = Func(t + DELTA_T, K3.mulk(DELTA_T).add(X));
		return K1.add(K2)
			.add(K3)
			.add(K4)
			.mulk(DELTA_T / 6);
	};

	sim = () => {
		//this.state = this.state.add(this.dX_dt(this.t, this.state));
		this.X = this.X.add(this.RK(this.dX_dt, this.t, this.X));
		this.t += DELTA_T;
	};

	isOut = () => {
		for (let i = 0; i < this.dim; i++)
			if (
				this.X.dat[0].dat[i] > this.maxR.dat[i] ||
				this.X.dat[0].dat[i] < this.minR.dat[i]
			)
				return true;
		return false;
	};

	checkOut = () => {
		if (this.isOut()) this.DOM.style.display = "none";
		else this.DOM.style.display = "block";
	};

	Next = () => {
		this.sim();
		//this.checkOut();
		//this.disp();
	};
}

const Gravity_Y = (t, X, m) => {
	let G = new Vector(new Array(X.dat[0].dim).fill(0));
	G.dat[1] = 9.8 * m;
	return G;
};

//important: transfer address argument
const Spring = (Point, l) => (t, X, m) => {
	let tie = Point.X.dat[0];
	let len = l * ZOOM_RATIO;
	let dis = tie.sub(X.dat[0]);
	return dis.mulk((dis.abs() - len) * 10000);
};

const Rope = (Point, l) => (t, X, m) => {
	let tie = Point.X.dat[0];
	let len = l * ZOOM_RATIO;
	let dis = tie.sub(X.dat[0]);
	return dis.mulk((dis.abs() > len ? (dis.abs() - len) : 0) * 3000);
};

class space {
	constructor(x, y) {
		this.init(x, y);
	}

	init = (x, y) => {
		this.DOM = document.createElement("canvas");
		document.body.appendChild(this.DOM);
		this.DOM.style.position = "relative";
		this.DOM.style.top = "0px";
		this.DOM.style.left = "0px";
		this.DOM.width = this.x = x;
		this.DOM.height = this.y = y;
		this.DOM.style.border = "dashed 2px #FAA";
		this.DOM.style.background = "#EEE";
		this.CANVAS = this.DOM.getContext("2d");
		this.points = new Array();

		this.borderX1 = (this.x * 1) / 10;
		this.borderY1 = (this.y * 1) / 10;
		this.borderX2 = (this.x * 9) / 10;
		this.borderY2 = (this.y * 9) / 10;

		this.dim = 2;
		this.addPoint([0.07, 0.05], [0, 0], 1);
		this.addPoint([0.05, 0.05], [0, 0], 1);
		this.addPoint([0.05, 0.03], [0, 0], 1);
		this.points[1].addForce(Gravity_Y);
		this.points[1].addForce(Rope(this.points[0], 0.02));
		this.points[2].addForce(Gravity_Y);
		this.points[1].addForce(Rope(this.points[2], 0.02));
		this.points[2].addForce(Rope(this.points[1], 0.02));

		this.itv = setInterval(this.disp, DELTA_T);
	};

	addPoint = (R, V, m) => {
		this.points.push(
			new matter(
				this.dim,
				R, //R: m
				V, //V: m/s
				m, //m: kg
				new Array(this.borderX1, this.borderY1), //minR: px
				new Array(this.borderX2, this.borderY2), //maxR: px
				this.CANVAS
			)
		);
	};

	line = (p1, p2) => {
		this.CANVAS.lineWidth = 2;
		this.CANVAS.lineCap = "round";
		this.CANVAS.setLineDash([10, 0]);
		this.CANVAS.beginPath();
		this.CANVAS.moveTo(
			(p1.X.dat[0].dat[0] * PX_PER_M) / ZOOM_RATIO,
			(p1.X.dat[0].dat[1] * PX_PER_M) / ZOOM_RATIO
		);
		this.CANVAS.lineTo(
			(p2.X.dat[0].dat[0] * PX_PER_M) / ZOOM_RATIO,
			(p2.X.dat[0].dat[1] * PX_PER_M) / ZOOM_RATIO
		);
		this.CANVAS.closePath();
		this.CANVAS.strokeStyle = "#A64";
		this.CANVAS.stroke();
	};

	rect = (x1, y1, x2, y2) => {
		this.CANVAS.lineWidth = 2;
		this.CANVAS.lineCap = "round";
		this.CANVAS.setLineDash([5, 5]);
		this.CANVAS.beginPath();
		this.CANVAS.moveTo(x1, y1);
		this.CANVAS.lineTo(x1, y2);
		this.CANVAS.lineTo(x2, y2);
		this.CANVAS.lineTo(x2, y1);
		this.CANVAS.lineTo(x1, y1);
		this.CANVAS.closePath();
		this.CANVAS.strokeStyle = "#AAF";
		this.CANVAS.stroke();
	};

	circ = (x, y, r, d) => {
		this.CANVAS.lineWidth = d;
		this.CANVAS.lineCap = "round";
		this.CANVAS.setLineDash([10, 0]);
		this.CANVAS.beginPath();
		this.CANVAS.arc(x, y, r, 0, 2 * Math.PI);
		this.CANVAS.closePath();
		this.CANVAS.strokeStyle = "black";
		this.CANVAS.stroke();
	};

	drawPt = (Point) => {
		this.circ(
			(Point.X.dat[0].dat[0] * PX_PER_M) / ZOOM_RATIO,
			(Point.X.dat[0].dat[1] * PX_PER_M) / ZOOM_RATIO,
			2.0,
			4.0
		);
	};

	disp = () => {
		this.CANVAS.clearRect(0, 0, this.x, this.y);
		this.rect(this.borderX1, this.borderY1, this.borderX2, this.borderY2);
		this.line(this.points[0], this.points[1]);
		this.line(this.points[1], this.points[2]);
		this.drawPt(this.points[1]);
		this.drawPt(this.points[2]);
		//this.drawPt(this.points[1]);
	};
}

onload = () => {
	let back = new space(800, 640);
};
