const signalStart = .1;
const signalTarget = .8;
const signalTime = .15;

const sampleRate = 1;

const externalForceFactor = 0;// .01;
const frictionFactor = 0.9;
const systemHeaviness = 10;

const simSteps = 600;

const pScale = 100;
const iScale = 10;
const dScale = 10000;

let gP = 0;
let gI = 0;
let gD = 0;

let gScore;

function onPChange(v) {
    gP = v / pScale;
    console.log('P', v);
    updateModel();
}

function onIChange(v) {
    gI = v / iScale;
    console.log('I', v);
    updateModel();
}

function onDChange(v) {
    gD = v / dScale;
    console.log('D', v);
    updateModel();
}

function main() {
    if (document.readyState !== 'complete') {
        return;
    }

    chartDiv = document.getElementById('chart');
    ctx = chartDiv.getContext('2d');

    scoreDiv = document.getElementById('score');

    let urlVars = getUrlVars();

    if (urlVars.p) {
        document.getElementById('pInput').value = gP = urlVars.p;
        gP /= pScale;
    }

    if (urlVars.i) {
        document.getElementById('iInput').value = gI = urlVars.i;
        gI /= iScale;
    }

    if (urlVars.d) {
        document.getElementById('dInput').value = gD = urlVars.d;
        gD /= dScale;
    }

    updateModel();
}

function updateModel() {
    simulate();
    queueRender();
}

function getUrlVars() {
    let vars = Object.create(null);

    let hashes = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');
    for (let i = 0; i < hashes.length; i++) {
        let hash = hashes[i].split('=');
        if (hash[1]) {
            vars[hash[0]] = hash[1];
        }
    }
    return vars;
}

function setUrlVars(urlVars) {
    let currentUrl = window.location.href;

    let baseUrl = currentUrl.split('?')[0];

    let newUrl = baseUrl + '?';

    let keys = Object.keys(urlVars);

    for (let i = 0; i < keys.length; ++i) {
        if (i > 0) {
            newUrl += '&';
        }

        let k = keys[i];

        newUrl += k + '=' + urlVars[k];
    }

    history.pushState(newUrl, '', newUrl);
}

let targetLine = [[0, signalStart], [signalTime, signalStart], [signalTime, signalTarget], [1, signalTarget]];
let actualLine = [];

let ctx = {};
let chartDiv = {};
let scoreDiv = {};
function queueRender() {
    chartDiv.width = chartDiv.offsetWidth;
    chartDiv.height = chartDiv.offsetHeight;

    scoreDiv.innerText = gScore.toFixed(4);

    setUrlVars({ p: Math.round(gP * pScale), i: Math.round(gI * iScale), d: Math.round(gD * dScale) });

    window.requestAnimationFrame(function () {
        let scale = window.devicePixelRatio;
        console.log(scale);
        console.log(chartDiv.offsetWidth, chartDiv.offsetHeight);

        console.log(ctx.getTransform());
        ctx.setTransform(
            chartDiv.offsetWidth,
            0,
            0,
            chartDiv.offsetHeight * -1,
            0,
            chartDiv.offsetHeight
        );

        ctx.lineWidth = scale / chartDiv.offsetWidth;

        ctx.beginPath();
        ctx.moveTo(0, 0);
        targetLine.forEach(p => ctx.lineTo(p[0], p[1]));
        ctx.strokeStyle = 'white';
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, 0);

        actualLine.forEach(p => ctx.lineTo(p[0], p[1]));
        ctx.strokeStyle = 'orange';
        ctx.stroke();
    });
}




document.onreadystatechange = main;




function PidController(dt, min, max, p, i, d) {
    this._dt = dt;
    this._max = max;
    this._min = min;
    this._Kp = p;
    this._Kd = d;
    this._Ki = i;
    this._pre_error = 0;
    this._integral = 0;
}

PidController.prototype.calculate = function calculate(setpoint, pv) {
    // Calculate error
    let error = setpoint - pv;

    // Proportional term
    let Pout = this._Kp * error;

    // Integral term
    this._integral += error * this._dt;
    let Iout = this._Ki * this._integral;

    // Derivative term
    let derivative = (error - this._pre_error) / this._dt;
    let Dout = this._Kd * derivative;

    // Calculate total output
    let output = Pout + Iout + Dout;

    // Restrict to max/min
    if (output > this._max)
        output = this._max;
    else if (output < this._min)
        output = this._min;

    // Save error to previous error
    this._pre_error = error;

    return output;
}

function simulate() {
    let pidC = new PidController(.001, -1, 1, gP, gI, gD);

    let val = signalStart;
    actualLine = [[0, val]];

    gScore = 0;

    let inc = pidC.calculate(signalStart, val);

    let nonLinear = new Array(Math.round(systemHeaviness));

    for (let i = 0; i < simSteps - 1; ++i) {
        let t = i / simSteps;
        let target = (t < signalTime) ? signalStart : signalTarget;
        if (i % sampleRate === 0) {
            inc = pidC.calculate(target, val);
        }

        nonLinear.push(inc);
        nonLinear.splice(0, 1);
        val += nonLinear.reduce((a, b) => a + b, 0) / nonLinear.length + (Math.random() - .5) * externalForceFactor;
        val *= frictionFactor;
        actualLine.push([t, val]);

        gScore += Math.abs(val - target);

        console.log(nonLinear.length);
    }
}
