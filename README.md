# 🏙️ Map 3D (Tiny Map 3D) — Real-Time 3D Urban Visualizer for Vietnam

[![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Three.js](https://img.shields.io/badge/Three.js-r170-black?logo=three.js&logoColor=white)](https://threejs.org/)
[![Mapbox GL JS](https://img.shields.io/badge/Mapbox_GL-v3.33-000000?logo=mapbox&logoColor=white)](https://docs.mapbox.com/mapbox-gl-js/)
[![Vite](https://img.shields.io/badge/Vite-6.0-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

An interactive real-time **3D Urban City Visualizer** built from satellite data, vector tiles, and geographic information across Vietnam (**Da Nang, Hanoi, Ho Chi Minh City**, and any user-selected GPS or bounding-box region). 

By uniting **Mapbox GL JS (High-Resolution Satellite & Vector Tiles)**, the **OpenStreetMap Overpass API**, and **Three.js WebGL**, this project renders true-to-life Vietnamese street-aligned tube houses, commercial shophouses, iconic bridges, and cultural landmarks locked at **60 FPS**.

---

## ✨ Key Features

### 1. 🛰️ 2D Satellite Mapping & Direct 3D Bounding-Box Scanning
- **Satellite Mode Toggle (`🛰️ Satellite` / `🗺️ Map`):** Seamlessly toggle between Mapbox High-Resolution Satellite imagery (`satellite-streets-v12`) and Dark Vector Map (`dark-v11`). Footprints are 100% synchronized between the 2D map and the 3D scene.
- **Real-Time GPS User Geolocation (`📍 Locate Me`):** Automatically detect browser GPS coordinates, smoothly fly to your current location, and instantly reconstruct the surrounding neighborhood into a 3D model.
- **Custom Bounding-Box Selection & Location Search:** Click and drag rectangular bounding boxes anywhere on the map or quickly search for cities, districts, and landmarks across Vietnam.

### 2. 🏘️ Authentic Vietnamese Tube House & Urban Architecture
- **Street-Aligned Terraced Row Houses (`Nhà ống liền kề`):** Automatically subdivides raw building polygons into realistic wall-to-wall Vietnamese tube houses (`4.2m – 5.4m` wide by `13.5m – 18m` deep) strictly oriented toward streets and inner alleys (`ngõ/kiệt` at `2.8m` width).
- **Signature Vietnamese Facades:**
  - **Ground Floor:** Authentic Vietnamese storefront signboards (`PHỞ BÒ`, `CÀ PHÊ`, `NHÀ THUỐC`, `KHÁCH SẠN`, `BÁNH MÌ`, `CƠM TẤM`, `TRÀ SỮA`, `TIỆM VÀNG`), retractable canvas awnings, Ausdoor-style roll-up shutters, and 4-panel folding iron gates with dark granite stone cladding.
  - **Upper Floors:** Modern C-shaped protruding concrete box-frames, Conwood timber sun louvers, Xingfa tinted glass windows, cantilevered balconies with bougainvillea planters, and outdoor AC condenser units.
  - **Party Walls (`Tường hông sát vách`):** Clean waterproof stucco finish separated from front facades, eliminating misplaced signage or windows on adjacent party walls.
- **Satellite-Accurate Roofing Systems:**
  - **Terracotta Clay Tile Stepped Thai Gables (`Mái ngói Thái giật cấp chữ A`):** Street-facing double-tier gable pediments with white fascia trim boards and ridge caps.
  - **Corrugated Anti-Heat Metal Roofs (`Mái tôn lạnh chống nóng`):** Pitched corrugated roofs in authentic satellite colors (oxide red, cobalt blue, dark green, zinc silver).
  - **Tiled Rooftop Terraces (`Sân thượng lát gạch`):** Featuring front concrete pergola portals, stairhead penthouses (`tum thang`), horizontal **Inox Son Ha stainless steel water tanks**, and **Thai Duong Nang solar vacuum tube water heaters**.

### 3. 🌉 Signature 3D Landmarks & Vietnamese Cultural Monuments
- **Da Nang:**
  - **Dragon Bridge (Cầu Rồng):** Sweeping golden steel dragon arches with detailed head, tail, and animated Fire and Water breathing visual effects.
  - **Han River Swing Bridge (Cầu Quay Sông Hàn):** Cable-stayed A-frame tower on a central rotating pier.
  - **Tran Thị Lý Bridge:** Iconic inclined single red Y-pylon cable-stayed bridge.
  - **Da Nang Administrative Center:** Cylindrical glass lighthouse-shaped skyscraper.
  - **Novotel Danang Premier Han River, Azura Tower & Indochina Riverside Towers.**
  - **Dragon Carp Statue & Love Lock Bridge, Da Nang Pink Cathedral (Nhà thờ Con Gà), Han Market, and Cham Sculpture Museum.**
- **Hanoi & Ho Chi Minh City:**
  - **Turtle Tower (Tháp Rùa Hồ Gươm)** surrounded by Sword Lake waters.
  - **Cat Linh – Ha Dong Elevated Metro Train** traversing aerial concrete viaducts.
  - **Bitexco Financial Tower** with cantilevered circular helipad.
  - **Landmark 81** stepped high-rise skyscraper.

### 4. 🌤️ 24-Hour Sun Cycle, Live Weather & 60 FPS Performance Engine
- **24-Hour Solar Simulation:** Real-time slider adjusting sun elevation, dynamic soft shadows, golden hour / twilight gradients, and nocturnal city window illuminations.
- **Live Weather Integration (Open-Meteo API):** Real-time weather synchronization (Sunny, Cloudy, Fog, Dynamic 3D Falling Rain) accompanied by procedural ambient audio (rain, thunder, birds, and city traffic).
- **Locked 60 FPS Rendering:**
  - Material-based geometry merging (`mergeGeometries`) reduces draw calls by **500x** (from ~20,000+ down to ~35–50).
  - High-performance `THREE.InstancedMesh` handles trees, flowing road vehicles, and rooftop water tanks / solar heaters.
  - Throttled raycasting (`45ms`) and change-detection POI label projections prevent superfluous React re-renders.

---

## 🛠️ Tech Stack

- **Frontend:** [React 18](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Tailwind CSS](https://tailwindcss.com/)
- **3D Graphics & WebGL:** [Three.js](https://threejs.org/) (`WebGLRenderer`, `ExtrudeGeometry`, `InstancedMesh`, `BufferGeometryUtils`, `PCFSoftShadowMap`)
- **Mapping & Geospatial:** [Mapbox GL JS](https://docs.mapbox.com/mapbox-gl-js/) (Satellite Streets & Vector Tiles), [OpenStreetMap Overpass API](https://wiki.openstreetmap.org/wiki/Overpass_API)
- **APIs & Audio:** Open-Meteo Weather API, Browser Geolocation API, Web Audio API Sound Synthesizer
- **Tooling & Bundler:** [Vite](https://vitejs.dev/), [Lucide Icons](https://lucide.dev/)

---

## 📂 Project Directory Structure

```text
Map_3D/
├── index.html                  # HTML entry point & Mapbox GL CSS link
├── package.json                # Project dependencies and npm scripts
├── tsconfig.json               # TypeScript compiler options
├── vite.config.ts              # Vite build configuration
├── .env.example                # Environment variable template
├── .gitignore                  # Git ignore rules
└── src/
    ├── main.tsx                # React application entry point
    ├── App.tsx                 # Main layout: 2D Map (Left) & 3D Viewport (Right)
    ├── index.css               # Global Tailwind CSS and map styling
    ├── types.ts                # TypeScript interfaces (BuildingFeature, RoadFeature, CityModelData...)
    ├── components/
    │   ├── Map2DPanel.tsx      # Mapbox 2D panel, satellite toggle, GPS geolocation & bounding box selector
    │   └── City3DViewport.tsx  # Three.js 3D viewport, OrbitControls, 24h day/night cycle, weather & sound
    ├── services/
    │   └── cityBuilder.ts      # Mapbox/OSM data extraction, tube house subdivision & urban synthesizer
    └── utils/
        ├── geometryBuilder.ts  # 3D building generation, Vietnamese roofs, landmarks, and material batching
        └── soundEngine.ts      # Web Audio procedural weather & urban environment sound synthesizer
```

---

## 🚀 Getting Started & Installation

### 1. Prerequisites
- **Node.js** version `>= 18.0.0`
- **npm** or **yarn**

### 2. Clone Repository & Install Dependencies
```bash
git clone https://github.com/levphuocthinh/Map_3D.git
cd Map_3D
npm install
```

### 3. Environment Variables (Optional)
To use a custom Mapbox public access token, copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
Inside `.env.local`:
```env
VITE_MAPBOX_ACCESS_TOKEN=your_mapbox_public_token_here
```
*(The project includes a built-in fallback token for instant out-of-the-box evaluation).*

### 4. Development Server
```bash
npm run dev
```
Open your browser at `http://localhost:5173/`.

### 5. Production Build
```bash
npm run build
npm run preview
```

---

## 🎮 Navigation & Viewport Controls

| Input | Action |
| :--- | :--- |
| **Left Click + Drag** | Orbit camera 360° around the city |
| **Right Click + Drag** | Pan camera across the ground plane |
| **Mouse Wheel / Scroll** | Zoom in / Zoom out |
| **Building Click** | Inspect landmark details (Height, Levels, Style, Address) |
| **Bottom Toolbar** | Adjust 24-hour time of day, toggle traffic flow, switch weather, take screenshots |
| **Top-Right Toolbar** | Toggle **🛰️ Satellite Mode**, select bounding boxes, or recenter view |

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
