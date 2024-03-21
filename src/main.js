import '../style.css';
import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader';
import { initScene } from './scene';
import { initGUIController } from './controller';
import { initHelper } from './helper';

const render = new THREE.WebGLRenderer({
  canvas: document.querySelector('#threeJsCanvas'),
  antialias: true,
  alpha: true
});
render.shadowMap.enabled = true;
render.setSize(window.innerWidth, window.innerHeight);

const {scene, camera, ambientLight, directionalLight, fog} = initScene();
// const {stats, controls} = initHelper(scene, render, camera, directionalLight);

const textureURL = new URL('./asset/fiveTone.jpg', import.meta.url);
const texture = new THREE.TextureLoader().load(textureURL.href);
texture.minFilter = texture.magFilter = THREE.NearestFilter;

const glftLoader = new GLTFLoader();
const camelURL = new URL('./asset/camel/camel.gltf', import.meta.url);

const uniforms = {
  u_resolution: { value: { x: null, y: null } },
  u_time: { value: 0.0 },
  u_mouse: { value: { x: null, y: null } },
}

let loadedModel;
glftLoader.load(camelURL.href, 
  function(gltfScene){
  loadedModel = gltfScene;
  loadedModel.scene.traverse(function (child) {
    if (child.isMesh) {
      child.material.flatShading = false;
      child.geometry.computeVertexNormals();
    }
  });

  const vShader = /* glsl */`
    varying vec2 v_uv;
    void main() {
      v_uv = uv;
      gl_Position = projectionMatrix * modelViewMatrix *    vec4(position, 1.0);
  }`

  const fShader = /* glsl */`
    varying vec2 v_uv;
    uniform vec2 u_mouse;
    uniform vec2 u_resolution;
    uniform vec3 u_color;
    uniform float u_time;
    mat2 mtx = mat2( 0.80,  0.80, -0.80,  0.80 );

float colormap_f1(float x) {
    return (0.3647 * x + 164.02) * x + 154.21;
}

float colormap_f2(float x) {
    return (126.68 * x + 114.35) * x + 0.1551;
}

float colormap_red(float x) {
    if (x < 0.0) {
        return 0.0;
    } else if (x < 0.136721748106749) {
        return colormap_f2(x) / 255.0;
    } else if (x < 0.23422409711017) {
        return (1789.6 * x - 226.52) / 255.0;
    } else if (x < 0.498842730309711) {
        return colormap_f1(x) / 255.0;
    } else if (x < 0.549121259378134) {
        return (-654.951781800243 * x + 562.838873112072) / 255.0;
    } else if (x < 1.0) {
        return ((3.6897 * x + 11.125) * x + 223.15) / 255.0;
    } else {
        return 237.0 / 255.0;
    }
}

float colormap_green(float x) {
    if (x < 0.0) {
        return 154.0 / 255.0;
    } else if (x < 3.888853260731947e-2) {
        return colormap_f1(x) / 255.0;
    } else if (x < 0.136721748106749e0) {
        return (-1455.86353067466 * x + 217.205447330541) / 255.0;
    } else if (x < 0.330799131955394) {
        return colormap_f2(x) / 255.0;
    } else if (x < 0.498842730309711) {
        return (1096.6 * x - 310.91) / 255.0;
    } else if (x < 0.549121259378134) {
        return colormap_f1(x) / 255.0;
    } else {
        return 244.0 / 255.0;
    }
}

float colormap_blue(float x) {
    if (x < 0.0) {
        return 93.0 / 255.0;
    } else if (x < 3.888853260731947e-2) {
        return (1734.6 * x + 93.133) / 255.0;
    } else if (x < 0.234224097110170) {
        return colormap_f1(x) / 255.0;
    } else if (x < 0.330799131955394) {
        return (-1457.96598791534 * x + 534.138211325166) / 255.0;
    } else if (x < 0.549121259378134) {
        return colormap_f2(x) / 255.0;
    } else if (x < 1.0) {
        return ((3.8931 * x + 176.32) * x + 3.1505) / 255.0;
    } else {
        return 183.0 / 255.0;
    }
}

vec4 colormap(float x) {
    return vec4(colormap_red(x), colormap_green(x), colormap_blue(x), 1.0);
}
    

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

    float fbm( vec2 p ) {
        float f = 0.0;
        f += 0.500000*noise( p + 0.3*u_time +  0.2*u_mouse); p = mtx*p*1.5;
        f += 0.031250*noise( p ); p = mtx*p*2.01;
        f += 0.250000*noise( p  - 0.3*u_mouse); p = mtx*p*2.03;
        f += 0.125000*noise( p  + 0.5*u_mouse); p = mtx*p*2.01;
        f += 0.062500*noise( p  - 0.7*u_mouse); p = mtx*p*2.04;
        f += 0.015625*noise( p + sin(u_time*0.5) );


        return f/0.96875;
    }

    float pattern( in vec2 p ) {
        return fbm( p + fbm( p + fbm( p + fbm( p + fbm( p  ) ) ) ) );
    }

    void main() {
        vec2 v = u_mouse / u_resolution;
        // vec2 uv = gl_FragCoord.xy / u_resolution;
        vec2 uv = gl_FragCoord.xy / u_resolution * 2.0 - 1.0;
        uv.x *= u_resolution.x / u_resolution.y;
        float shade = pattern(v_uv);
        gl_FragColor = vec4(colormap(shade));
        // gl_FragColor = vec4(vec3(step(0.5, mod(v_uv.x*10.0, 1.0))), 1.0);
    }
  `
  loadedModel.scene.children[3].children[3].material = new THREE.ShaderMaterial({
    uniforms: uniforms,
    vertexShader: vShader,
    fragmentShader: fShader
  });

  loadedModel.scene.children[0].material = new THREE.MeshToonMaterial({color: 0xf6b604, gradientMap: texture});
  loadedModel.scene.position.set(0, 4.5, 0);
  loadedModel.scene.scale.set(3, 3, 3);
  // initGUIController(loadedModel.scene.children[0], camera, directionalLight, ambientLight, fog);

  scene.add(gltfScene.scene);
  },
	function ( xhr ) {
		console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
	},
	function ( error ) {
		console.log( 'An error happened', error );
	}
);
  
const pointer = new THREE.Vector2();
let mouseX = 0;
let mouseY = 0;
let speed = 0.05;

window.addEventListener('mousemove', (event) => {
  mouseX = (event.clientX / window.innerWidth) * 2 - 1;
  mouseY =  (event.clientY / window.innerHeight) * 2 - 1;
  uniforms.u_mouse.value.x = mouseX;
  uniforms.u_mouse.value.y = mouseY;
});

window.addEventListener('resize', () => {
  if (uniforms.u_resolution !== undefined){
      uniforms.u_resolution.value.x = window.innerWidth;
      uniforms.u_resolution.value.y = window.innerHeight;
    }
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  render.setSize(window.innerWidth, window.innerHeight);
})

const clock = new THREE.Clock();

function animate(time) {
  let distX = mouseX - pointer.x;
  let distY = mouseY - pointer.y;
  
  pointer.x = pointer.x + (distX * speed);
  pointer.y = pointer.y + (distY * speed);

  if (loadedModel) {
    loadedModel.scene.rotation.y = 0.3* pointer.x; 
    loadedModel.scene.rotation.x = 0.3+ 0.1*pointer.y;
    loadedModel.scene.rotation.z = 0.05*Math.sin(time/3000); 
    // loadedModel.scene.rotation.x = 0.3 + 0.1*Math.cos(time/1000);
    loadedModel.scene.position.y = 5 + 0.1*Math.sin(time/1000); 
  }

  uniforms.u_time.value = clock.getElapsedTime();
    // stats.update();
    // controls.update();
  render.render(scene, camera);
  render.setAnimationLoop(animate);
}

function cardHovereffect(){
	let card = document.querySelector('.cardCover');
	window.addEventListener('mousemove', function(e){
		let cardWidth = card.clientWidth || card.offsetWidth || card.scrollWidth;
		let cardHeight = card.clientHeight || card.offsetHeight || card.scrollHeight;
		let wMultiple = 320/cardWidth;
		let offsetX = 0.52 - (e.pageX - card.offsetLeft) / cardWidth;
		let offsetY = 0.52 - (e.pageY - card.offsetTop) / cardHeight;
		let dx = (e.pageX - card.offsetLeft) - cardWidth / 2;
		let dy = (e.pageY - card.offsetTop) - cardHeight / 2;

		let yRotate = (offsetX - dx) * (0.05 * wMultiple);
		let xRotate = (dy - offsetY) * (0.05 * wMultiple);

		let imgCSS = `rotateX(${xRotate}deg) rotateY(${yRotate}deg) translateY(${.6*xRotate}px) translateX(${1.2*yRotate}px)`;

		card.style.transform = imgCSS;

        const x = e.clientX / window.innerWidth;
        const y = e.clientY / window.innerHeight;

        card.style.backgroundImage = `radial-gradient(circle at ${x*100}% ${y*100}%, #e69c2e 20%, #F9C920 80%)`;

        // let centerX = window.innerWidth / 2;
        // let centerY = window.innerHeight / 2;
        // let angleRadians = Math.atan2(e.clientY - centerY, e.clientX - centerX);
        // let angleDegrees = angleRadians * (180 / Math.PI);

        // angleDegrees -= 90

        // card.style.backgroundImage = `linear-gradient(${angleDegrees}deg, #F9C920, #e69c2e)`;
	});
}

cardHovereffect();

animate();