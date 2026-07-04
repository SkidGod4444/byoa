"use client";

import { Suspense, useEffect, useRef } from "react";
import * as THREE from "three";
import { Canvas, useThree } from "@react-three/fiber";
import { CameraControls, ContactShadows, Grid } from "@react-three/drei";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { useSceneStore } from "@/store/sceneStore";
import { ActuatorAssembly, useTotalLength } from "./Assemblies";
import { cameraBus } from "./cameraBus";

/** Offline image-based lighting — makes metals read as metal without any CDN fetch. */
function Env() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const tex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    // Mutating the scene graph is the intended three.js API here (this is
    // exactly what drei's <Environment> does internally).
    // eslint-disable-next-line react-hooks/immutability
    scene.environment = tex;
    scene.environmentIntensity = 0.55;
    return () => {
      tex.dispose();
      pmrem.dispose();
      scene.environment = null;
    };
  }, [gl, scene]);
  return null;
}

function CameraRig({ totalLen }: { totalLen: number }) {
  const controls = useRef<CameraControls>(null);
  const selected = useSceneStore((s) => s.selected);

  // Fly to a clicked part.
  useEffect(() => {
    if (!selected?.pos || !controls.current) return;
    const c = controls.current;
    const [x, y, z] = selected.pos;
    const target = new THREE.Vector3(x, y, z);
    const camPos = new THREE.Vector3();
    c.camera.getWorldPosition(camPos);
    const dir = camPos.sub(target);
    // keep the current viewing direction but come closer
    const dist = Math.max(38, Math.min(70, dir.length() * 0.55));
    dir.normalize().multiplyScalar(dist);
    c.setLookAt(x + dir.x, y + dir.y + 4, z + dir.z, x, y, z, true);
  }, [selected]);

  // Frame the whole machine when its length changes (stage added/removed).
  useEffect(() => {
    const frame = () => {
      const d = Math.max(150, totalLen * 1.9);
      controls.current?.setLookAt(d * 0.66, d * 0.3, d * 0.72, 0, -2, 0, true);
    };
    frame();
    // expose to the DOM view-control buttons
    cameraBus.controls = controls.current;
    cameraBus.reset = frame;
    return () => {
      cameraBus.controls = null;
      cameraBus.reset = null;
    };
  }, [totalLen]);

  return <CameraControls ref={controls} makeDefault minDistance={22} maxDistance={480} smoothTime={0.32} />;
}

export default function ActuatorScene() {
  const select = useSceneStore((s) => s.select);
  const totalLen = useTotalLength();

  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ fov: 38, near: 1, far: 1200, position: [120, 70, 140] }}
      gl={{ antialias: true, alpha: true }}
      onPointerMissed={() => select(null)}
      className="!touch-none"
    >
      <Env />
      <ambientLight intensity={0.5} />
      <directionalLight position={[45, 70, 50]} intensity={1.15} />
      <directionalLight position={[-50, 30, -60]} intensity={0.5} color="#c4b5fd" />
      <directionalLight position={[0, -40, 30]} intensity={0.18} />

      <Suspense fallback={null}>
        <ActuatorAssembly />
      </Suspense>

      <ContactShadows position={[0, -44, 0]} opacity={0.5} scale={340} blur={2.2} far={90} resolution={512} color="#01030a" />
      <Grid
        position={[0, -44.2, 0]}
        args={[600, 600]}
        cellSize={12}
        cellThickness={0.6}
        cellColor="#1c1c21"
        sectionSize={60}
        sectionThickness={1}
        sectionColor="#2a2a31"
        fadeDistance={420}
        fadeStrength={2.2}
        infiniteGrid
      />
      <CameraRig totalLen={totalLen} />
    </Canvas>
  );
}
