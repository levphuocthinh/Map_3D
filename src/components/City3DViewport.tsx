import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  Plus,
  Minus,
  RotateCcw,
  RotateCw,
  Compass,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  Download,
  Car,
  Palette,
  Moon,
  Sun,
  Cloud,
  CloudRain,
  CloudFog,
  Play,
  Pause,
  Clock,
  X,
  ChevronRight,
  CheckCircle2,
  Loader2,
  Building2,
  Layers,
  Ruler,
  MapPin,
  Sparkles,
} from 'lucide-react';
import {
  BuildProgress,
  BuildingFeature,
  CityModelData,
  WeatherConditionType,
  WeatherInfo,
} from '../types';
import {
  buildThreeCityScene,
  RenderTheme,
  VehicleAgent,
} from '../utils/geometryBuilder';
import { soundEngine } from '../utils/soundEngine';

interface City3DViewportProps {
  cityData: CityModelData | null;
  progress: BuildProgress;
  weather: WeatherInfo;
  isExpanded3D: boolean;
  onToggleExpand3D: () => void;
}

const COMPASS_DIRS = [
  'B',
  'BĐB',
  'ĐB',
  'ĐĐB',
  'Đ',
  'ĐĐN',
  'ĐN',
  'NĐN',
  'N',
  'NTN',
  'TN',
  'TTN',
  'T',
  'TTB',
  'TB',
  'BTB',
];

function formatMinutesToHHMM(totalMinutes: number): string {
  const m = ((Math.round(totalMinutes) % 1440) + 1440) % 1440;
  const hh = String(Math.floor(m / 60)).padStart(2, '0');
  const mm = String(m % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

export const City3DViewport: React.FC<City3DViewportProps> = ({
  cityData,
  progress,
  weather,
  isExpanded3D,
  onToggleExpand3D,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const cityCleanupRef = useRef<(() => void) | null>(null);
  const vehiclesRef = useRef<VehicleAgent[]>([]);
  const vehicleMeshRef = useRef<THREE.InstancedMesh | null>(null);
  const rainSystemRef = useRef<THREE.LineSegments | null>(null);
  const cloudGroupRef = useRef<THREE.Group | null>(null);
  const buildingMeshesRef = useRef<THREE.Mesh[]>([]);
  const highlightMeshRef = useRef<THREE.Mesh | null>(null);
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const lastRaycastTimeRef = useRef<number>(0);
  const lastLoadedCityRef = useRef<string>('');

  // Interactive 3D Building Hover and Pinned Details
  const [hoveredBuilding, setHoveredBuilding] = useState<{
    building: BuildingFeature;
    screenX: number;
    screenY: number;
  } | null>(null);
  const [pinnedBuilding, setPinnedBuilding] = useState<BuildingFeature | null>(null);

  // Interactive Time of Day (default 07:49 = 469 mins, matching media_1792741211393_34b94846.jpg)
  const [timeMinutes, setTimeMinutes] = useState<number>(7 * 60 + 49);
  const [autoTimePlay, setAutoTimePlay] = useState<boolean>(false);
  const [weatherType, setWeatherType] = useState<WeatherConditionType>('clear');
  const [showWeatherPanel, setShowWeatherPanel] = useState<boolean>(false);

  const [pixelMode, setPixelMode] = useState<boolean>(false);
  const [showTraffic, setShowTraffic] = useState<boolean>(true);
  const [soundOn, setSoundOn] = useState<boolean>(false);
  const [cameraInfo, setCameraInfo] = useState({
    headingDeg: 24,
    compass: 'BĐB',
    pitchDeg: 64,
  });
  const [projectedPois, setProjectedPois] = useState<
    { id: string; name: string; x: number; y: number; visible: boolean }[]
  >([]);

  const isNightTime = timeMinutes < 345 || timeMinutes >= 1110; // Before 05:45 or after 18:30
  const currentTheme: RenderTheme = isNightTime ? 'night' : 'default';
  const timeStr = formatMinutesToHHMM(timeMinutes);

  const weatherMeta: Record<
    WeatherConditionType,
    { label: string; temp: number }
  > = {
    clear: { label: 'Trời quang', temp: isNightTime ? 25 : 28 },
    cloudy: { label: 'Nhiều mây', temp: isNightTime ? 24 : 26 },
    rain: { label: 'Mưa rào', temp: isNightTime ? 22 : 24 },
    fog: { label: 'Sương mù', temp: isNightTime ? 20 : 22 },
  };

  // Auto time-lapse timer when enabled
  useEffect(() => {
    if (!autoTimePlay) return;
    const id = setInterval(() => {
      setTimeMinutes((prev) => (prev + 4) % 1440);
    }, 60);
    return () => clearInterval(id);
  }, [autoTimePlay]);

  // Update procedural audio engine when soundOn, weatherType, or isNightTime changes
  useEffect(() => {
    soundEngine.toggle(soundOn, weatherType, isNightTime);
  }, [soundOn, weatherType, isNightTime]);

  useEffect(() => {
    return () => soundEngine.toggle(false, 'clear', false);
  }, []);

  // Initialize Three.js Scene, Shadows, Lights, Camera & OrbitControls
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#c8d6e5');
    scene.fog = new THREE.FogExp2('#c8d6e5', 0.00028);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      36,
      container.clientWidth / Math.max(1, container.clientHeight),
      2,
      4500
    );
    // Closer, immersive framing matching reference screenshot (24° BĐB nghiêng 64°)
    camera.position.set(105, 118, 178);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.localClippingEnabled = true;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.maxPolarAngle = Math.PI * 0.46;
    controls.minPolarAngle = 0.05;
    controls.minDistance = 40;
    controls.maxDistance = 1500;
    controls.target.set(0, 0, 0);
    controlsRef.current = controls;

    // Hemisphere + Sun Directional Light (with dynamic shadow frustum)
    const hemiLight = new THREE.HemisphereLight('#ffffff', '#94a3b8', 1.25);
    hemiLight.name = 'hemi-light';
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight('#fff7ed', 2.2);
    sunLight.position.set(280, 320, 210);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 20;
    sunLight.shadow.camera.far = 1500;
    const dShadow = 500;
    sunLight.shadow.camera.left = -dShadow;
    sunLight.shadow.camera.right = dShadow;
    sunLight.shadow.camera.top = dShadow;
    sunLight.shadow.camera.bottom = -dShadow;
    sunLight.shadow.bias = -0.0005;
    sunLight.name = 'dir-light';
    scene.add(sunLight);

    const fillLight = new THREE.DirectionalLight('#93c5fd', 0.65);
    fillLight.position.set(-240, 180, -200);
    fillLight.name = 'fill-light';
    scene.add(fillLight);

    // Dynamic Highlight Overlay Mesh for hovered 3D building
    const highlightGeo = new THREE.BufferGeometry();
    const highlightMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.45,
      depthTest: true,
    });
    const highlightMesh = new THREE.Mesh(highlightGeo, highlightMat);
    highlightMesh.visible = false;
    highlightMesh.renderOrder = 999;
    scene.add(highlightMesh);
    highlightMeshRef.current = highlightMesh;

    // Animation loop
    let animId = 0;
    let lastTime = performance.now();
    const dummy = new THREE.Object3D();
    const tempVec = new THREE.Vector3();

    const animate = (now: number) => {
      animId = requestAnimationFrame(animate);
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      controls.update();

      const offset = tempVec.copy(camera.position).sub(controls.target);
      const spherical = new THREE.Spherical().setFromVector3(offset);
      const pitchDeg = Math.round((spherical.phi * 180) / Math.PI);
      const headingDeg = Math.round(
        ((spherical.theta * 180) / Math.PI + 360) % 360
      );
      const dirIdx = Math.round(headingDeg / 22.5) % 16;

      setCameraInfo((prev) => {
        if (
          Math.abs(prev.headingDeg - headingDeg) >= 1 ||
          Math.abs(prev.pitchDeg - pitchDeg) >= 1
        ) {
          return {
            headingDeg,
            compass: COMPASS_DIRS[dirIdx],
            pitchDeg,
          };
        }
        return prev;
      });

      // Animate traffic vehicles & Cát Linh - Hà Đông Metro Train
      const vehicles = vehiclesRef.current;
      const vMesh = vehicleMeshRef.current;
      if (vMesh && vehicles.length > 0) {
        for (let i = 0; i < vehicles.length; i++) {
          const v = vehicles[i];
          if (v.points.length < 2) continue;
          const p1 = v.points[v.segIndex];
          const p2 = v.points[v.segIndex + 1];
          const dx = p2[0] - p1[0];
          const dz = p2[1] - p1[1];
          const segLen = Math.max(1, Math.hypot(dx, dz));

          v.t += (v.speed * dt) / segLen;
          if (v.t >= 1) {
            v.t = 0;
            v.segIndex = (v.segIndex + 1) % (v.points.length - 1);
          }

          const cur1 = v.points[v.segIndex];
          const cur2 = v.points[v.segIndex + 1];
          const cdx = cur2[0] - cur1[0];
          const cdz = cur2[1] - cur1[1];
          const cLen = Math.max(1, Math.hypot(cdx, cdz));
          const nx = -cdz / cLen;
          const nz = cdx / cLen;

          const vx = cur1[0] + cdx * v.t + nx * v.laneOffset;
          const vz = cur1[1] + cdz * v.t + nz * v.laneOffset;
          const vy = v.elevationFn
            ? v.elevationFn((v.segIndex + v.t) / Math.max(1, v.points.length - 1))
            : v.y;

          dummy.position.set(vx, vy, vz);
          dummy.rotation.set(0, Math.atan2(cdx, cdz), 0);
          dummy.scale.set(v.scaleX, v.scaleY, v.scaleZ);
          dummy.updateMatrix();
          vMesh.setMatrixAt(i, dummy.matrix);
        }
        vMesh.instanceMatrix.needsUpdate = true;
      }

      // Animate 3D Falling Rain Streaks
      const rain = rainSystemRef.current;
      if (rain && rain.visible) {
        const posAttr = rain.geometry.attributes
          .position as THREE.BufferAttribute;
        const arr = posAttr.array as Float32Array;
        const dropSpeed = 260 * dt;
        for (let i = 0; i < arr.length; i += 6) {
          arr[i + 1] -= dropSpeed;
          arr[i + 4] -= dropSpeed;
          if (arr[i + 4] < 0) {
            const resetY = 200 + Math.random() * 30;
            arr[i + 1] = resetY;
            arr[i + 4] = resetY - 9.5;
          }
        }
        posAttr.needsUpdate = true;
      }

      // Animate Drifting Clouds
      const clouds = cloudGroupRef.current;
      if (clouds && clouds.visible) {
        clouds.children.forEach((c) => {
          c.position.x += 6.5 * dt;
          if (c.position.x > 420) c.position.x = -420;
        });
      }

      renderer.render(scene, camera);
    };

    animId = requestAnimationFrame(animate);

    const resizeObserver = new ResizeObserver(() => {
      if (!container || !rendererRef.current || !cameraRef.current) return;
      const w = container.clientWidth;
      const h = Math.max(1, container.clientHeight);
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    });
    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      if (cityCleanupRef.current) cityCleanupRef.current();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Rebuild 3D City when cityData, showTraffic, currentTheme, or weatherType changes
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || !cityData) return;

    if (cityCleanupRef.current) {
      cityCleanupRef.current();
      cityCleanupRef.current = null;
    }

    const built = buildThreeCityScene(
      scene,
      cityData,
      showTraffic,
      currentTheme,
      weatherType
    );
    vehiclesRef.current = built.vehicles;
    vehicleMeshRef.current = built.vehicleMesh;
    rainSystemRef.current = built.rainSystem;
    cloudGroupRef.current = built.cloudGroup;
    buildingMeshesRef.current = built.buildingMeshes;
    cityCleanupRef.current = built.dispose;

    // Cinematic camera framing when switching region / preset
    const prevCity = lastLoadedCityRef.current;
    if (prevCity !== cityData.title) {
      lastLoadedCityRef.current = cityData.title;
      const cam = cameraRef.current;
      const ctrl = controlsRef.current;
      if (cam && ctrl) {
        const normT = cityData.title.toLowerCase();
        if (normT.includes('sông hàn') || normT.includes('cầu quay')) {
          // Iconic elevated view looking north across the Han River swing bridge
          ctrl.target.set(0, 8, 0);
          cam.position.set(65, 115, -235);
          ctrl.update();
        } else if (normT.includes('cầu rồng')) {
          ctrl.target.set(0, 10, 0);
          cam.position.set(135, 125, -220);
          ctrl.update();
        } else if (normT.includes('landmark 81')) {
          ctrl.target.set(0, 60, 0);
          cam.position.set(140, 160, 240);
          ctrl.update();
        } else if (normT.includes('tháp rùa') || normT.includes('hoàn kiếm')) {
          ctrl.target.set(0, 4, 0);
          cam.position.set(90, 85, 140);
          ctrl.update();
        } else {
          ctrl.target.set(0, 0, 0);
          cam.position.set(105, 118, 178);
          ctrl.update();
        }
      }
    }

    const updateLabels = () => {
      const cam = cameraRef.current;
      const container = mountRef.current;
      if (!cam || !container || !cityData) return;

      const w = container.clientWidth;
      const h = container.clientHeight;
      const v = new THREE.Vector3();

      // Only show top 2-3 prominent landmarks
      const topPois = cityData.pois
        .filter((p) =>
          /phúc khánh|khương đình|mipec|cầu rồng|cầu quay|sông hàn|novotel|azura|chùa|viện|vanda|royal/i.test(p.name) ||
          p.category === 'place_of_worship' ||
          p.category === 'police' ||
          p.category === 'bridge'
        )
        .slice(0, 3);

      const next = topPois.map((poi, idx) => {
        v.set(poi.x, poi.y, poi.z);
        v.project(cam);
        const isBehind = v.z > 1;
        const sx = Math.round((v.x * 0.5 + 0.5) * w);
        const sy = Math.round((-(v.y * 0.5) + 0.5) * h);
        return {
          id: poi.id,
          name: poi.name,
          x: sx,
          y: sy,
          isPrimary: idx === 0,
          visible:
            !isBehind && sx > 40 && sx < w - 40 && sy > 40 && sy < h - 40,
        };
      });
      setProjectedPois((prev: any[]) => {
        if (
          prev.length === next.length &&
          prev.every(
            (p, idx) =>
              p.id === next[idx].id &&
              p.visible === next[idx].visible &&
              Math.abs(p.x - next[idx].x) < 2 &&
              Math.abs(p.y - next[idx].y) < 2
          )
        ) {
          return prev;
        }
        return next as any;
      });
    };

    updateLabels();
    const interval = setInterval(updateLabels, 110);
    return () => clearInterval(interval);
  }, [cityData, showTraffic, currentTheme, weatherType]);

  // Dynamically update Sun Position, Shadows, Sky Color & Fog based on Time of Day (timeMinutes) and Weather (weatherType)
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const hemi = scene.getObjectByName('hemi-light') as THREE.HemisphereLight;
    const sun = scene.getObjectByName('dir-light') as THREE.DirectionalLight;
    if (!hemi || !sun) return;

    // Calculate Sun Angle from timeMinutes (06:00 = sunrise East, 12:00 = zenith, 18:00 = sunset West)
    const dayProgress = Math.max(0, Math.min(1, (timeMinutes - 340) / 770)); // 05:40 to 18:30
    const sunAngle = dayProgress * Math.PI; // 0 to PI
    const radius = 440;

    if (!isNightTime) {
      const sx = Math.cos(sunAngle) * radius;
      const sy = Math.max(85, Math.sin(sunAngle) * radius);
      const sz = 195;
      sun.position.set(sx, sy, sz);
    } else {
      // Moonlight angle at night
      sun.position.set(-220, 320, -180);
    }

    // Determine Sky & Lighting from Time + Weather
    let skyHex = '#c8d6e5';
    let fogDensity = 0.00025;

    if (isNightTime) {
      skyHex = weatherType === 'fog' ? '#1e293b' : '#091326';
      fogDensity = weatherType === 'fog' ? 0.0014 : 0.00045;
      hemi.intensity = 0.72;
      sun.intensity = 1.15;
      sun.color.set('#fdba74');
    } else if (timeMinutes < 420 || timeMinutes > 1020) {
      // Dawn (05:45 - 07:00) or Golden Hour / Sunset (17:00 - 18:30)
      skyHex = '#e6b89c';
      fogDensity = weatherType === 'fog' ? 0.0015 : 0.0004;
      hemi.intensity = 1.05;
      sun.intensity = 2.1;
      sun.color.set('#fb923c');
    } else {
      // Daytime (07:00 - 17:00)
      if (weatherType === 'rain') {
        skyHex = '#64748b';
        fogDensity = 0.00085;
        hemi.intensity = 0.95;
        sun.intensity = 1.1;
        sun.color.set('#cbd5e1');
      } else if (weatherType === 'cloudy') {
        skyHex = '#94a3b8';
        fogDensity = 0.0005;
        hemi.intensity = 1.15;
        sun.intensity = 1.45;
        sun.color.set('#f1f5f9');
      } else if (weatherType === 'fog') {
        skyHex = '#cbd5e1';
        fogDensity = 0.0018;
        hemi.intensity = 1.1;
        sun.intensity = 1.2;
        sun.color.set('#f8fafc');
      } else {
        // Crisp Sunny Morning/Day (like 07:49 in reference photo!)
        skyHex = '#c8d6e5';
        fogDensity = 0.00022;
        hemi.intensity = 1.28;
        sun.intensity = 2.35;
        sun.color.set('#fff7ed');
      }
    }

    scene.background = new THREE.Color(skyHex);
    scene.fog = new THREE.FogExp2(skyHex, fogDensity);
  }, [timeMinutes, weatherType, isNightTime]);

  // Apply Pixel Mode
  useEffect(() => {
    const renderer = rendererRef.current;
    const container = mountRef.current;
    if (!renderer || !container) return;

    if (pixelMode) {
      renderer.setPixelRatio(0.45);
      renderer.domElement.style.imageRendering = 'pixelated';
    } else {
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      renderer.domElement.style.imageRendering = 'auto';
    }
    renderer.setSize(container.clientWidth, container.clientHeight);
  }, [pixelMode]);

  // Camera Control Actions
  const handleZoom = (factor: number) => {
    const cam = cameraRef.current;
    const ctrl = controlsRef.current;
    if (!cam || !ctrl) return;
    const offset = cam.position.clone().sub(ctrl.target).multiplyScalar(factor);
    if (offset.length() >= 60 && offset.length() <= 1500) {
      cam.position.copy(ctrl.target).add(offset);
      ctrl.update();
    }
  };

  const handleRotate = (angleRad: number) => {
    const cam = cameraRef.current;
    const ctrl = controlsRef.current;
    if (!cam || !ctrl) return;
    const offset = cam.position.clone().sub(ctrl.target);
    const s = new THREE.Spherical().setFromVector3(offset);
    s.theta += angleRad;
    offset.setFromSpherical(s);
    cam.position.copy(ctrl.target).add(offset);
    ctrl.update();
  };

  const handleToggleTopDown = () => {
    const cam = cameraRef.current;
    const ctrl = controlsRef.current;
    if (!cam || !ctrl) return;
    const offset = cam.position.clone().sub(ctrl.target);
    const s = new THREE.Spherical().setFromVector3(offset);
    if (s.phi > 0.4) {
      s.phi = 0.1;
      s.radius = Math.max(380, s.radius);
    } else {
      s.phi = (64 * Math.PI) / 180;
      s.radius = 410;
    }
    offset.setFromSpherical(s);
    cam.position.copy(ctrl.target).add(offset);
    ctrl.update();
  };

  const handleDownloadScreenshot = () => {
    const renderer = rendererRef.current;
    if (!renderer) return;
    const dataUrl = renderer.domElement.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `tinymap-3d-${Date.now()}.png`;
    a.click();
  };

  const renderWeatherIcon = () => {
    if (weatherType === 'rain')
      return <CloudRain className="w-4 h-4 text-sky-400 shrink-0" />;
    if (weatherType === 'cloudy')
      return <Cloud className="w-4 h-4 text-slate-300 shrink-0" />;
    if (weatherType === 'fog')
      return <CloudFog className="w-4 h-4 text-slate-300 shrink-0" />;
    return isNightTime ? (
      <Moon className="w-4 h-4 text-amber-200 shrink-0" />
    ) : (
      <Sun className="w-4 h-4 text-amber-400 shrink-0" />
    );
  };

  // Building Hover Raycaster (Throttled for smooth 60 FPS)
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    // If user is dragging OrbitControls, skip raycasting to keep 60 FPS
    if (e.buttons > 0) {
      if (hoveredBuilding) setHoveredBuilding(null);
      return;
    }

    const now = performance.now();
    if (now - lastRaycastTimeRef.current < 45) return;
    lastRaycastTimeRef.current = now;

    const container = mountRef.current;
    const camera = cameraRef.current;
    const highlightMesh = highlightMeshRef.current;
    if (!container || !camera || !highlightMesh) return;

    const rect = container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const ndcX = (mouseX / rect.width) * 2 - 1;
    const ndcY = -(mouseY / rect.height) * 2 + 1;

    const raycaster = raycasterRef.current;
    raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);

    const hits = raycaster.intersectObjects(buildingMeshesRef.current, false);
    if (hits.length > 0) {
      const hitObj = hits[0].object as THREE.Mesh;
      const b = hitObj.userData?.building as BuildingFeature | undefined;
      // Only show hover highlight & info card for prominent named landmarks (per user request)
      if (b && (b.name || b.isLandmark || b.styleType === 'tower' || b.source !== 'generated')) {
        highlightMesh.geometry = hitObj.geometry;
        highlightMesh.position.copy(hitObj.position);
        highlightMesh.rotation.copy(hitObj.rotation);
        highlightMesh.scale.copy(hitObj.scale);
        highlightMesh.visible = true;

        setHoveredBuilding({
          building: b,
          screenX: mouseX,
          screenY: mouseY,
        });
        return;
      }
    }

    if (!pinnedBuilding) {
      highlightMesh.visible = false;
    }
    if (hoveredBuilding) {
      setHoveredBuilding(null);
    }
  };

  const handlePointerLeave = () => {
    if (!pinnedBuilding && highlightMeshRef.current) {
      highlightMeshRef.current.visible = false;
    }
    setHoveredBuilding(null);
  };

  const handleCanvasClick = () => {
    if (hoveredBuilding) {
      setPinnedBuilding((prev) =>
        prev?.id === hoveredBuilding.building.id ? null : hoveredBuilding.building
      );
    } else {
      setPinnedBuilding(null);
      if (highlightMeshRef.current) {
        highlightMeshRef.current.visible = false;
      }
    }
  };

  return (
    <div
      className="relative w-full h-full bg-[#1a2230] select-none overflow-hidden"
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onClick={handleCanvasClick}
    >
      {/* Three.js Canvas Mount */}
      <div
        ref={mountRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
      />

      {/* 3D Floating Landmark Labels */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
        {projectedPois.map(
          (poi: any) =>
            poi.visible && (
              <div
                key={poi.id}
                style={{
                  transform: `translate(${poi.x}px, ${poi.y}px) translate(-50%, -100%)`,
                }}
                className="absolute top-0 left-0 flex flex-col items-center drop-shadow-lg"
              >
                <div
                  className={`px-3 py-1 rounded-full backdrop-blur-md shadow-2xl flex items-center gap-1.5 border ${
                    poi.isPrimary
                      ? 'bg-[#ea580c] border-orange-400 text-white font-semibold'
                      : 'bg-[#18181b]/90 border-white/20 text-slate-100 font-medium'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      poi.isPrimary ? 'bg-white' : 'bg-orange-400'
                    }`}
                  />
                  <span className="text-[11.5px] whitespace-nowrap tracking-tight">
                    {poi.name}
                  </span>
                </div>
                <div
                  className={`w-1 h-2 ${
                    poi.isPrimary ? 'bg-[#ea580c]' : 'bg-white/80'
                  } shadow-sm`}
                />
              </div>
            )
        )}
      </div>

      {/* Interactive 3D Building Hover / Pinned Info Card */}
      {(hoveredBuilding || pinnedBuilding) && (() => {
        const b = (pinnedBuilding || hoveredBuilding?.building)!;
        const isPinned = !!pinnedBuilding;
        const containerW = mountRef.current?.clientWidth ?? 800;
        const containerH = mountRef.current?.clientHeight ?? 600;

        const rawX = hoveredBuilding ? hoveredBuilding.screenX + 18 : containerW - 350;
        const rawY = hoveredBuilding ? hoveredBuilding.screenY + 18 : 70;
        const posX = Math.max(16, Math.min(rawX, containerW - 340));
        const posY = Math.max(16, Math.min(rawY, containerH - 280));

        const getSourceBadge = () => {
          if (b.source === 'mapbox') {
            return (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30">
                Mapbox Vector
              </span>
            );
          }
          if (b.source === 'osm') {
            return (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                OpenStreetMap
              </span>
            );
          }
          return (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-500/20 text-purple-300 border border-purple-500/30">
              Quy hoạch 3D
            </span>
          );
        };

        return (
          <div
            style={
              isPinned
                ? undefined
                : { transform: `translate(${posX}px, ${posY}px)` }
            }
            className={`${
              isPinned
                ? 'absolute top-16 right-16 z-30 pointer-events-auto'
                : 'absolute top-0 left-0 z-30 pointer-events-none transition-transform duration-75 ease-out'
            } w-[320px] bg-[#0f172a]/95 backdrop-blur-xl border border-sky-400/40 rounded-2xl p-4 shadow-2xl text-slate-100 animate-in fade-in zoom-in-95 duration-150`}
          >
            {/* Header: Title + Category + Close */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center shrink-0 text-sky-400 mt-0.5">
                  <Building2 className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-white leading-snug line-clamp-2">
                    {b.name || b.category}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    <span className="text-[11px] text-sky-300/90 font-medium">
                      {b.category}
                    </span>
                    {getSourceBadge()}
                  </div>
                </div>
              </div>
              {isPinned && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setPinnedBuilding(null);
                  }}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Address if available */}
            {b.address && (
              <div className="flex items-center gap-1.5 mt-2.5 text-[11px] text-slate-300 bg-white/5 px-2.5 py-1 rounded-lg border border-white/5 truncate">
                <MapPin className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                <span className="truncate">{b.address}</span>
              </div>
            )}

            {/* Metrics Grid */}
            <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-700/60">
              <div className="bg-slate-800/60 rounded-xl p-2 border border-white/5">
                <div className="flex items-center gap-1 text-[10px] text-slate-400">
                  <Ruler className="w-3 h-3 text-sky-400" />
                  <span>Chiều cao</span>
                </div>
                <div className="text-sm font-bold text-white mt-0.5 font-mono">
                  {b.height.toFixed(1)} <span className="text-[10px] font-normal text-slate-400">m</span>
                </div>
              </div>

              <div className="bg-slate-800/60 rounded-xl p-2 border border-white/5">
                <div className="flex items-center gap-1 text-[10px] text-slate-400">
                  <Layers className="w-3 h-3 text-amber-400" />
                  <span>Số tầng</span>
                </div>
                <div className="text-sm font-bold text-white mt-0.5 font-mono">
                  {b.levels} <span className="text-[10px] font-normal text-slate-400">tầng</span>
                </div>
              </div>

              <div className="bg-slate-800/60 rounded-xl p-2 border border-white/5">
                <div className="flex items-center gap-1 text-[10px] text-slate-400">
                  <Sparkles className="w-3 h-3 text-emerald-400" />
                  <span>Diện tích</span>
                </div>
                <div className="text-sm font-bold text-white mt-0.5 font-mono">
                  {b.areaM2} <span className="text-[10px] font-normal text-slate-400">m²</span>
                </div>
              </div>
            </div>

            {/* Attached POIs / Amenities */}
            {b.pois && b.pois.length > 0 && (
              <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] text-slate-400">Tiện ích:</span>
                {b.pois.slice(0, 3).map((p, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 rounded-md text-[10px] bg-slate-800 text-slate-200 border border-slate-700/60"
                  >
                    {p.name}
                  </span>
                ))}
              </div>
            )}

            {/* Coordinates & Quick Action Hint */}
            <div className="mt-3 pt-2 border-t border-slate-700/60 flex items-center justify-between text-[10px] text-slate-400">
              <span className="font-mono">
                {b.centerLat.toFixed(5)}°N, {b.centerLon.toFixed(5)}°E
              </span>
              <span className="text-sky-400/90 font-medium">
                {isPinned ? 'Đã ghim chi tiết' : 'Nhấp chuột để ghim'}
              </span>
            </div>
          </div>
        );
      })()}

      {/* Top-Left Area Info & Interactive Time/Weather Overlay Cards */}
      {cityData && (
        <div className="absolute top-3.5 left-3.5 z-20 flex flex-col gap-2 max-w-[410px] pointer-events-auto">
          {/* Main City Stats Card */}
          <div className="bg-[#18181b]/85 backdrop-blur-xl border border-white/10 rounded-2xl px-4 py-2.5 shadow-2xl">
            <h2 className="text-[14px] font-semibold text-white leading-snug truncate">
              {cityData.title}
            </h2>
            <p className="text-[11.5px] text-slate-300 mt-0.5 truncate">
              {cityData.areaKm2.toFixed(2).replace('.', ',')} km² • dựng xong trong{' '}
              {cityData.buildTimeSec.toFixed(1).replace('.', ',')} s •{' '}
              {cityData.stats.mergedBuildings.toLocaleString('vi-VN')} nhà •{' '}
              {cityData.stats.treeCount.toLocaleString('vi-VN')} cây •{' '}
              {cityData.stats.carCount} xe ...
            </p>
            <div
              onClick={() => setShowWeatherPanel(true)}
              className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-300 cursor-pointer hover:text-orange-300 transition-colors"
            >
              <span className="w-2 h-2 rounded-full bg-orange-400 shadow-[0_0_8px_#fb923c]" />
              <span>
                {timeStr}: mô phỏng theo giờ (hôm nay chưa ghi số liệu lúc này) -
                bấm để chỉnh
              </span>
            </div>
          </div>

          {/* Weather & Time Pill Card + Quick Toggles */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setShowWeatherPanel(!showWeatherPanel)}
              className="w-fit flex items-center gap-3 bg-[#18181b]/90 hover:bg-[#27272a]/95 backdrop-blur-xl border border-white/15 rounded-2xl px-3.5 py-2 shadow-xl transition-all text-left"
            >
              {renderWeatherIcon()}
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold text-white tracking-tight">
                  {weatherMeta[weatherType].temp}°
                </span>
                <div className="flex flex-col leading-tight">
                  <span className="text-[11px] font-medium text-slate-100">
                    {weatherMeta[weatherType].label}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Lúc {timeStr}
                  </span>
                </div>
              </div>
              <ChevronRight
                className={`w-3.5 h-3.5 text-slate-400 ml-1 transition-transform ${
                  showWeatherPanel ? 'rotate-90 text-orange-400' : ''
                }`}
              />
            </button>

            {/* Quick 1-click Time & Weather Pills */}
            <button
              onClick={() => setTimeMinutes(isNightTime ? 7 * 60 + 49 : 23 * 60 + 24)}
              className="px-2.5 py-2 rounded-xl bg-[#18181b]/88 hover:bg-white/15 border border-white/15 text-[11px] font-medium text-slate-100 flex items-center gap-1.5 shadow-lg transition-colors"
              title="Đổi nhanh Sáng (07:49) / Đêm (23:24)"
            >
              {isNightTime ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span>Ban ngày</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-indigo-300" />
                  <span>Ban đêm</span>
                </>
              )}
            </button>

            <button
              onClick={() =>
                setWeatherType((prev) =>
                  prev === 'clear'
                    ? 'rain'
                    : prev === 'rain'
                    ? 'fog'
                    : prev === 'fog'
                    ? 'cloudy'
                    : 'clear'
                )
              }
              className="px-2.5 py-2 rounded-xl bg-[#18181b]/88 hover:bg-white/15 border border-white/15 text-[11px] font-medium text-slate-100 flex items-center gap-1.5 shadow-lg transition-colors"
              title="Đổi hiệu ứng thời tiết: Nắng → Mưa rào → Sương mù → Nhiều mây"
            >
              <CloudRain className="w-3.5 h-3.5 text-sky-400" />
              <span>Đổi thời tiết</span>
            </button>
          </div>

          {/* Interactive Time & Weather Popover Panel */}
          {showWeatherPanel && (
            <div className="mt-0.5 w-[350px] bg-[#14171f]/95 backdrop-blur-2xl border border-white/15 rounded-2xl p-4 shadow-2xl text-slate-100 animate-in fade-in duration-150">
              <div className="flex items-center justify-between pb-2.5 border-b border-white/10">
                <div className="flex items-center gap-2 text-xs font-semibold text-white">
                  <Clock className="w-3.5 h-3.5 text-orange-400" />
                  <span>Thời gian & Ánh sáng mặt trời</span>
                </div>
                <button
                  onClick={() => setShowWeatherPanel(false)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Time Slider */}
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-slate-400">Giờ trong ngày</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-orange-400 text-sm">
                      {timeStr}
                    </span>
                    <button
                      onClick={() => setAutoTimePlay(!autoTimePlay)}
                      className={`px-2 py-0.5 rounded-md text-[11px] font-medium flex items-center gap-1 transition-colors ${
                        autoTimePlay
                          ? 'bg-orange-500 text-white'
                          : 'bg-white/10 text-slate-200 hover:bg-white/15'
                      }`}
                    >
                      {autoTimePlay ? (
                        <>
                          <Pause className="w-3 h-3" /> Dừng
                        </>
                      ) : (
                        <>
                          <Play className="w-3 h-3" /> Tua 24h
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <input
                  type="range"
                  min={0}
                  max={1439}
                  value={timeMinutes}
                  onChange={(e) => setTimeMinutes(Number(e.target.value))}
                  className="w-full accent-orange-500 cursor-pointer h-1.5 bg-white/15 rounded-lg"
                />

                {/* Time Presets */}
                <div className="grid grid-cols-5 gap-1 mt-2">
                  {[
                    { label: 'Bình minh', mins: 6 * 60 + 10 },
                    { label: '07:49 Sáng', mins: 7 * 60 + 49 },
                    { label: '12:00 Trưa', mins: 12 * 60 },
                    { label: 'Hoàng hôn', mins: 17 * 60 + 35 },
                    { label: '23:24 Đêm', mins: 23 * 60 + 24 },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      onClick={() => {
                        setAutoTimePlay(false);
                        setTimeMinutes(preset.mins);
                      }}
                      className={`py-1 px-1 rounded-lg text-[10px] font-medium border transition-colors ${
                        Math.abs(timeMinutes - preset.mins) < 25
                          ? 'bg-orange-500/25 border-orange-400/60 text-orange-200'
                          : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Weather Condition Selector */}
              <div className="mt-4 pt-3 border-t border-white/10">
                <div className="text-xs font-semibold text-white mb-2">
                  Hiệu ứng Thời tiết 3D
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {(
                    [
                      {
                        id: 'clear',
                        label: 'Trời quang',
                        icon: <Sun className="w-4 h-4 text-amber-400" />,
                      },
                      {
                        id: 'cloudy',
                        label: 'Nhiều mây',
                        icon: <Cloud className="w-4 h-4 text-slate-200" />,
                      },
                      {
                        id: 'rain',
                        label: 'Mưa rào',
                        icon: <CloudRain className="w-4 h-4 text-sky-400" />,
                      },
                      {
                        id: 'fog',
                        label: 'Sương mù',
                        icon: <CloudFog className="w-4 h-4 text-slate-300" />,
                      },
                    ] as const
                  ).map((wItem) => (
                    <button
                      key={wItem.id}
                      onClick={() => setWeatherType(wItem.id)}
                      className={`flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-xl border text-[11px] font-medium transition-all ${
                        weatherType === wItem.id
                          ? 'bg-orange-500/25 border-orange-400 text-white shadow-lg'
                          : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      {wItem.icon}
                      <span>{wItem.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Top-Right Camera Angle, Traffic, Pixel & Export Bar (Matches Image: 24° BĐB nghiêng 64° | Car | Pixel | Sound | Download) */}
      <div className="absolute top-3.5 right-3.5 z-20 flex items-center gap-1.5 bg-[#18181b]/85 backdrop-blur-xl border border-white/10 rounded-2xl px-3 py-1.5 shadow-2xl">
        {/* Compass & Pitch Display */}
        <button
          onClick={handleToggleTopDown}
          title="Nhấn để chuyển góc nhìn Nghiêng 64° / Từ trên xuống 5°"
          className="flex items-center gap-2 pr-2.5 border-r border-white/10 hover:opacity-85 transition-opacity"
        >
          <Compass className="w-4 h-4 text-orange-400" />
          <div className="flex flex-col text-left leading-tight">
            <span className="text-[11px] font-semibold text-slate-100">
              {cameraInfo.headingDeg}° {cameraInfo.compass}
            </span>
            <span className="text-[10px] text-slate-400">
              nghiêng {cameraInfo.pitchDeg}°
            </span>
          </div>
        </button>

        {/* Toggle Traffic Flow */}
        <button
          onClick={() => setShowTraffic(!showTraffic)}
          title="Bật/tắt hiển thị xe & tàu điện"
          className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
            showTraffic
              ? 'bg-orange-500/25 text-orange-400 border border-orange-500/40'
              : 'text-slate-400 hover:bg-white/10 hover:text-white'
          }`}
        >
          <Car className="w-4 h-4" />
        </button>

        {/* Pixel Mode Button */}
        <button
          onClick={() => setPixelMode(!pixelMode)}
          title="Chuyển đổi chế độ Pixel / Mặc định"
          className={`px-3 h-8 rounded-xl flex items-center gap-1.5 text-xs font-medium transition-colors ${
            pixelMode
              ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
              : 'bg-white/5 text-slate-200 hover:bg-white/10 border border-white/10'
          }`}
        >
          <Palette className="w-3.5 h-3.5 text-orange-400" />
          <span>{pixelMode ? 'Default' : 'Pixel'}</span>
        </button>

        {/* Sound Toggle */}
        <button
          onClick={() => setSoundOn(!soundOn)}
          title="Âm thanh môi trường đô thị"
          className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
            soundOn
              ? 'bg-orange-500/25 text-orange-400 border border-orange-500/40'
              : 'text-slate-300 hover:bg-white/10 hover:text-white'
          }`}
        >
          {soundOn ? (
            <Volume2 className="w-4 h-4" />
          ) : (
            <VolumeX className="w-4 h-4" />
          )}
        </button>

        {/* Download Screenshot */}
        <button
          onClick={handleDownloadScreenshot}
          title="Tải ảnh chụp mô hình 3D"
          className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
        >
          <Download className="w-4 h-4" />
        </button>
      </div>

      {/* Right-Edge 3D Camera Controls (+, -, Rotate Left, Rotate Right, Top-Down, Fullscreen) */}
      <div className="absolute right-3.5 top-1/2 -translate-y-1/2 z-20 flex flex-col bg-[#18181b]/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden divide-y divide-white/10">
        <button
          onClick={() => handleZoom(0.8)}
          className="w-9 h-9 flex items-center justify-center text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
          title="Phóng to 3D"
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          onClick={() => handleZoom(1.25)}
          className="w-9 h-9 flex items-center justify-center text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
          title="Thu nhỏ 3D"
        >
          <Minus className="w-4 h-4" />
        </button>
        <button
          onClick={() => handleRotate(-Math.PI / 6)}
          className="w-9 h-9 flex items-center justify-center text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
          title="Xoay trái 30°"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => handleRotate(Math.PI / 6)}
          className="w-9 h-9 flex items-center justify-center text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
          title="Xoay phải 30°"
        >
          <RotateCw className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleToggleTopDown}
          className="w-9 h-9 flex items-center justify-center text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
          title="Chuyển góc nhìn từ trên cao / Isometric"
        >
          <span className="w-3.5 h-3.5 border-2 border-current rounded-sm flex items-center justify-center text-[8px]">
            •
          </span>
        </button>
        <button
          onClick={onToggleExpand3D}
          className="w-9 h-9 flex items-center justify-center text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
          title={
            isExpanded3D ? 'Thu gọn về màn hình đôi' : 'Mở rộng 3D toàn màn hình'
          }
        >
          {isExpanded3D ? (
            <Minimize2 className="w-3.5 h-3.5 text-orange-400" />
          ) : (
            <Maximize2 className="w-3.5 h-3.5" />
          )}
        </button>
      </div>

      {/* Build Progress Card Overlay */}
      {progress.active && (
        <div className="absolute inset-0 z-30 bg-[#080d1a]/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-[310px] bg-[#12161f]/95 border border-white/15 rounded-2xl p-5 shadow-2xl">
            <div className="flex items-center justify-between text-xs">
              <span className="text-orange-400 font-semibold">Đang dựng</span>
              <span className="text-slate-400 truncate max-w-[190px]">
                {progress.regionName} •{' '}
                {progress.areaKm2.toFixed(2).replace('.', ',')} km²
              </span>
            </div>

            <div className="mt-2 flex items-baseline justify-between">
              <div className="text-4xl font-bold text-white tracking-tight">
                {progress.percent}
                <span className="text-xl font-medium text-slate-400 ml-0.5">
                  %
                </span>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                {progress.elapsedSec.toFixed(1).replace('.', ',')} s
              </span>
            </div>

            <div className="mt-3 w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-orange-500 to-amber-400 transition-all duration-200"
                style={{ width: `${progress.percent}%` }}
              />
            </div>

            <div className="mt-4 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-200">
                  {progress.stepOsm.done ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <Loader2 className="w-4 h-4 text-orange-400 animate-spin shrink-0" />
                  )}
                  <span>OpenStreetMap</span>
                </div>
                <span className="text-slate-400">
                  {progress.stepOsm.done
                    ? `${progress.stepOsm.count.toLocaleString('vi-VN')} đối tượng`
                    : 'Đang tải...'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-200">
                  {progress.stepOpenBuildings.done ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <Loader2 className="w-4 h-4 text-orange-400 animate-spin shrink-0" />
                  )}
                  <span>Open Buildings</span>
                </div>
                <span className="text-slate-400">
                  {progress.stepOpenBuildings.done
                    ? `${progress.stepOpenBuildings.count.toLocaleString(
                        'vi-VN'
                      )} nhà · Overture`
                    : 'Đang quét...'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-200">
                  {progress.stepMerge.done ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <Loader2 className="w-4 h-4 text-orange-400 animate-spin shrink-0" />
                  )}
                  <span>Ghép dữ liệu</span>
                </div>
                <span className="text-slate-400">
                  {progress.stepMerge.done
                    ? `${progress.stepMerge.count.toLocaleString('vi-VN')} nhà`
                    : '...'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-200">
                  {progress.stepRender.done ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <Loader2 className="w-4 h-4 text-orange-400 animate-spin shrink-0" />
                  )}
                  <span>Dựng mô hình</span>
                </div>
                <span className="text-slate-400">
                  {progress.stepRender.pct}%
                </span>
              </div>
            </div>

            <div className="mt-4 pt-2.5 border-t border-white/5 text-[11px] text-slate-500">
              Chi tiết
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
