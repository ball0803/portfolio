// Main JavaScript (main.js)

// Vertex Shader
const vertexShaderSource = /* glsl */`
    attribute vec2 a_position;
    void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
    }
`;

// Fragment Shader
const fragmentShaderSource = /* glsl */ `
precision highp float;

uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;

#define MAX_METABALLS 20

uniform vec3 u_metaballs[MAX_METABALLS];

float rand(vec2 n) { 
    return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
}

float noise(vec2 p){
    vec2 ip = floor(p);
    vec2 u = fract(p);
    u = u*u*(3.0-2.0*u);

    float res = mix(
        mix(rand(ip),rand(ip+vec2(1.0,0.0)),u.x),
        mix(rand(ip+vec2(0.0,1.0)),rand(ip+vec2(1.0,1.0)),u.x),u.y);
    return res*res;
}


float calculateRadius(vec3 metaball, float currentTime, float initialRadius, float maxRadius, float growthDuration, float decayDuration) {
    float timePassed = currentTime - metaball.z;
    float radius;

    if (timePassed < growthDuration) {
        // Growth phase
        float growthFactor = clamp(timePassed / growthDuration, 0.0, 1.0);
        radius = initialRadius + growthFactor * (maxRadius - initialRadius);
    } else {
        // Decay phase
        float decayFactor = clamp((timePassed - growthDuration) / decayDuration, 0.0, 1.0);
        radius = maxRadius * pow(1.0 - decayFactor, 10.0); // Adjust decayRate as needed
    }

    return radius;
}

float decay(float value, float threshold) {
    return (value < threshold) ? 0.0 : value;
}

vec2 calculatePosition(vec3 metaball, float currentTime, float noiseScale, float radius, float angularSpeed) {
    float timePassed = currentTime - metaball.z;
    float angle = angularSpeed * timePassed;
    float noiseValueX = noise(vec2(metaball.x * noiseScale, angle));
    float noiseValueY = noise(vec2(metaball.y * noiseScale, angle));
    float x = metaball.x + noiseValueX * radius;
    float y = metaball.y + noiseValueY * radius;

    return vec2(x, y);
}


vec2 moveTowards(vec2 currentPosition, vec2 targetPosition, float maxDistance, float currentTime, float startTime, float duration) {
    float progress = clamp((currentTime - startTime) / duration, 0.0, 1.0);
    
    vec2 intermediatePosition = mix(currentPosition, targetPosition, progress);
    
    vec2 direction = normalize(targetPosition - currentPosition);
    float distance = length(targetPosition - currentPosition);

    float moveDistance = min(distance, maxDistance * progress); // Adjust the progress to limit the maximum distance
    return currentPosition + direction * moveDistance;
}

void main() {
    vec2 uv = (2. * gl_FragCoord.xy - u_resolution.xy) / u_resolution.y;
    float metaballRadius = 0.001;
    float metaballMaxRadius = 0.03;
    float metaballRadiusDecay = 0.005;
    float metaballDecayDuration = 5.;
    float movingDuration = 5.;
    float growthDuration = 0.05;

    float frag = 0.0;
    for (int i = 0; i < MAX_METABALLS; i++) {
        float radius = decay(calculateRadius(u_metaballs[i], u_time, metaballRadius, metaballMaxRadius, growthDuration, metaballDecayDuration), metaballRadiusDecay);
        vec2 position;
        if (i == 0) {
            if (u_metaballs[i].xy == u_mouse) {
                position = u_mouse;
            } else{
                position = moveTowards(u_metaballs[i].xy, u_mouse, 1., u_time, u_metaballs[i].z, movingDuration);
            }
        } else {
            position = moveTowards(u_metaballs[i].xy, u_metaballs[i-1].xy, distance(u_metaballs[i].xy, u_mouse), u_time, u_metaballs[i].z, movingDuration);
        }
        // position = calculatePosition(vec3(position, u_metaballs[i].z), u_time, 1., .2, 3.);
        frag += radius /distance(position, uv);
    }

    frag = clamp(frag, 0.0, 1.0);
    frag = frag == 1.0 ? 1.0 : 0.0;

    gl_FragColor = vec4(frag);
}

`;

// Get WebGL context
const canvas = document.getElementById('webglCanvas');
const gl = canvas.getContext('webgl');

// Set up WebGL
if (!gl) {
    console.error('WebGL not supported');
}

// Compile shaders
const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

// Link shaders into a program
const program = linkProgram(gl, vertexShader, fragmentShader);

const mouseUniformLocation = gl.getUniformLocation(program, 'u_mouse');
const metaballsUniformLocation = gl.getUniformLocation(program, 'u_metaballs');

class Metaball {
    constructor(position, birthTime) {
        this.position = position;
        this.birthTime = birthTime;
    }
}

class LimitedArray {
    constructor(limit) {
        this.limit = limit;
        this.array = [];
    }

    pushToFront(element) {
        if (this.array.length >= this.limit) {
            // Remove the last element if the limit is reached
            this.array.pop();
        }
        // Add the new element to the front
        this.array.unshift(element);
    }

    getArray() {
        return this.array;
    }
    getLength() {
        return this.array.length;
    }
    getLast() {
        return this.array[this.array.length - 1];
    }
}

const cooldownDuration = .01; // 1 second
const minDistance = 0.07;
const numberOfMetaballs = 20;
const metaBalls = new LimitedArray(numberOfMetaballs);

metaBalls.pushToFront(new Metaball([0.0, 0.0], 0.0));
function flattenMetaballs(metaballs) {
    const flattenedArray = [];
    for (const metaball of metaballs) {
        // Extract position and radius for each metaball
        flattenedArray.push(metaball.position[0], metaball.position[1], metaball.birthTime);
    }
    return flattenedArray;
}


let lastMetaballAddedTime = 0;
let lastMetaballPosition = [0, 0];

// Add mousemove event listener to update mouse position
document.addEventListener('mousemove', function(event) {
    const currentTime = performance.now() / 1000;
    const normalizedMouseX = (2.0 * event.clientX - window.innerWidth)/window.innerHeight;
    const normalizedMouseY = (1.0-( 2.0 *event.clientY - window.innerHeight))/window.innerHeight;
    // console.log(metaBalls.getLast());

    if (currentTime - lastMetaballAddedTime > cooldownDuration 
    // ){
        && Math.sqrt((normalizedMouseX - lastMetaballPosition[0])**2 + (normalizedMouseY - lastMetaballPosition[1])**2) > minDistance){
        metaBalls.pushToFront(new Metaball([normalizedMouseX, normalizedMouseY], currentTime));
        lastMetaballAddedTime = currentTime;
        lastMetaballPosition = [normalizedMouseX, normalizedMouseY];
    }
    // console.log(normalizedMouseX, normalizedMouseY);
    // console.log(flattenMetaballs(metaBalls.getArray()));
    // gl.uniform2f(mouseUniformLocation, mouseX, mouseY);
    gl.uniform3fv(metaballsUniformLocation, flattenMetaballs(metaBalls.getArray()));
    gl.uniform2f(mouseUniformLocation, normalizedMouseX, normalizedMouseY);
});


// Get attribute and uniform locations
const positionAttributeLocation = gl.getAttribLocation(program, 'a_position');
const resolutionUniformLocation = gl.getUniformLocation(program, 'u_resolution');
const timeUniformLocation = gl.getUniformLocation(program, 'u_time');

// Create buffer
const positionBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
const positions = [
    -1, -1,
    1, -1,
    -1, 1,
    1, 1,
];
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

// Render loop
function render() {
    resizeCanvasToDisplaySize(gl.canvas);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(program);
    gl.enableVertexAttribArray(positionAttributeLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);
    gl.uniform2f(resolutionUniformLocation, gl.canvas.width, gl.canvas.height);
    gl.uniform1f(timeUniformLocation, performance.now() / 1000);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    requestAnimationFrame(render);
}

render();

// Utility functions
function compileShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader compilation error:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

function linkProgram(gl, vertexShader, fragmentShader) {
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Program linking error:', gl.getProgramInfoLog(program));
        gl.deleteProgram(program);
        return null;
    }
    return program;
}

function resizeCanvasToDisplaySize(canvas) {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        return true;
    }
    return false;
}
