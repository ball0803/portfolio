import * as THREE from 'three';

export function initScene() {
    const scene = new THREE.Scene();

    const near = 0.1;
    const far = 1000;

    const camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    near,
    far
    );
    camera.position.set(0, 5, 15)

    const ambientLight = new THREE.AmbientLight(0xbd0f0f, 1.0);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(20, 20, -10);
    scene.add(directionalLight);

    const fog = new THREE.Fog(0x300591, 10, 25);
    scene.fog = fog;

    return {
        scene,
        camera,
        ambientLight,
        directionalLight,
        fog
    };
}