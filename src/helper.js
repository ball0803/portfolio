import * as THREE from 'three';
import Stats from 'three/examples/jsm/libs/stats.module';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls';

export function initHelper(scene, render, camera, directionalLight, ambientLight) {
    const stats = new Stats();
    document.body.appendChild(stats.dom);

    const axesHelper = new THREE.AxesHelper(5);
    scene.add(axesHelper);

    const gridHelper = new THREE.GridHelper(30, 30);
    scene.add(gridHelper);

    const cameraHelper = new THREE.CameraHelper(camera);
    scene.add(cameraHelper);

    const directionalLightHelper = new THREE.DirectionalLightHelper(directionalLight, 5);
    scene.add(directionalLightHelper);

    const planeGeometry = new THREE.PlaneGeometry(30, 30);
    const planeMeterial = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    const plane = new THREE.Mesh(planeGeometry, planeMeterial);
    scene.add(plane);
    plane.rotation.x = Math.PI / 2;
    plane.receiveShadow = true;

    const controls = new OrbitControls(camera, render.domElement);

    return {
        stats,
        controls
    }
};