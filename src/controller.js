import { GUI } from 'dat.gui'


export function initGUIController(camel, camera, directionalLight, ambientLight, fog) {
    const gui = new GUI();

    const cameraFolder = gui.addFolder('Camera');
    cameraFolder.add(camera.position, 'x', -100, 100);
    cameraFolder.add(camera.position, 'y', -100, 100);
    cameraFolder.add(camera.position, 'z', -100, 100);

    cameraFolder.open();

    const camelFolder = gui.addFolder('Camel');
    const camelMaterial = camel.material;

    const camelData = {
        color: camelMaterial.color.getHex(),
        directionalLight: directionalLight.color.getHex(),
        ambientLight: ambientLight.color.getHex(),
        fogColor: fog.color.getHex(),
    }

    const lightFolder = gui.addFolder('Light');
    lightFolder.add(directionalLight.position, 'x', -100, 100);
    lightFolder.add(directionalLight.position, 'y', -100, 100);
    lightFolder.add(directionalLight.position, 'z', -100, 100);
    lightFolder.add(directionalLight, 'intensity', 0, 5);
    lightFolder.addColor(camelData, 'directionalLight').onChange(() => {
        directionalLight.color.setHex(Number(camelData.directionalLight.toString().replace('#', '0x')))
    });
    lightFolder.add(ambientLight, 'intensity', 0, 5);
    lightFolder.addColor(camelData, 'ambientLight').onChange(() => {
        ambientLight.color.setHex(Number(camelData.ambientLight.toString().replace('#', '0x')))
    });
    lightFolder.open();

    camelFolder.addColor(camelData, 'color')
    .onChange(() => {
        camelMaterial.color.setHex(Number(camelData.color.toString().replace('#', '0x')))
    })
    camelFolder.open();

    const fogFolder = gui.addFolder('Fog');
    fogFolder.add(fog, 'near', 0, 100);
    fogFolder.add(fog, 'far', 0, 100);
    fogFolder.addColor(camelData, 'fogColor').onChange(() => {
        fog.color.setHex(Number(camelData.fogColor.toString().replace('#', '0x')))
    });
    fogFolder.open();

    return gui;
};