import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {
  BuildingFeature,
  CityModelData,
  RoadFeature,
  TreeInstance,
  WeatherConditionType,
} from '../types';

export type RenderTheme = 'default' | 'night';

// Build a sculpted 3D vehicle BufferGeometry (Chassis + Cabin + Dark Windows + 4 Wheels + Headlights/Taillights)
function createSculptedVehicleGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];

  const paintBox = (
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    r: number,
    g: number,
    b: number
  ) => {
    const geo = new THREE.BoxGeometry(w, h, d).toNonIndexed();
    geo.translate(x, y, z);
    const count = geo.attributes.position.count;
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      colors[i * 3] = r;
      colors[i * 3 + 1] = g;
      colors[i * 3 + 2] = b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    parts.push(geo);
  };

  // 1. Lower body chassis (white vertex color -> multiplied by instanceColor!)
  paintBox(1.0, 0.42, 1.0, 0, 0.28, 0, 1.0, 1.0, 1.0);

  // 2. Upper cabin roof (slightly narrower & shorter for realistic car/bus profile)
  paintBox(0.86, 0.36, 0.58, 0, 0.65, -0.04, 1.0, 1.0, 1.0);

  // 3. Dark glass windshields & side windows (dark vertex color -> stays dark glass!)
  paintBox(0.88, 0.26, 0.52, 0, 0.64, -0.04, 0.14, 0.18, 0.24);
  paintBox(0.78, 0.26, 0.61, 0, 0.64, -0.04, 0.14, 0.18, 0.24);

  // 4. Front & rear bumpers (dark charcoal)
  paintBox(1.02, 0.14, 1.04, 0, 0.14, 0, 0.2, 0.22, 0.25);

  // 5. 4 Black Tires/Wheels at corners
  const wheelPositions: [number, number][] = [
    [-0.48, 0.3],
    [0.48, 0.3],
    [-0.48, -0.3],
    [0.48, -0.3],
  ];
  for (const [wx, wz] of wheelPositions) {
    paintBox(0.14, 0.26, 0.22, wx, 0.13, wz, 0.08, 0.08, 0.1);
  }

  // 6. Front headlights (warm bright yellow-white at +Z front)
  paintBox(0.22, 0.1, 0.04, -0.32, 0.32, 0.51, 1.0, 0.98, 0.8);
  paintBox(0.22, 0.1, 0.04, 0.32, 0.32, 0.51, 1.0, 0.98, 0.8);

  // 7. Rear taillights (red at -Z back)
  paintBox(0.24, 0.1, 0.04, -0.32, 0.34, -0.51, 0.95, 0.15, 0.15);
  paintBox(0.24, 0.1, 0.04, 0.32, 0.34, -0.51, 0.95, 0.15, 0.15);

  const merged = mergeGeometries(parts, false);
  parts.forEach((p) => p.dispose());
  merged.computeVertexNormals();
  return merged;
}

// Build a lush multi-puff 3D tree crown BufferGeometry with vertical vertex-color shading
function createLushTreeCanopyGeometry(): THREE.BufferGeometry {
  const puffs: { x: number; y: number; z: number; rx: number; ry: number; rz: number }[] = [
    { x: 0, y: 0.55, z: 0, rx: 2.3, ry: 2.1, rz: 2.3 },
    { x: -1.15, y: -0.15, z: 0.85, rx: 1.85, ry: 1.65, rz: 1.85 },
    { x: 1.2, y: -0.1, z: 0.75, rx: 1.8, ry: 1.6, rz: 1.8 },
    { x: 0.1, y: -0.15, z: -1.25, rx: 1.9, ry: 1.65, rz: 1.85 },
    { x: -0.85, y: 0.1, z: -0.8, rx: 1.7, ry: 1.55, rz: 1.7 },
  ];

  const parts: THREE.BufferGeometry[] = [];
  for (const p of puffs) {
    const g = new THREE.IcosahedronGeometry(1.0, 1).toNonIndexed();
    g.scale(p.rx, p.ry, p.rz);
    g.translate(p.x, p.y, p.z);
    const pos = g.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const py = pos.getY(i);
      // Shade from deeper leaf shadow at bottom (0.68) to bright sunlit crown at top (1.12)
      const shade = Math.max(0.68, Math.min(1.12, 0.86 + py * 0.1));
      colors[i * 3] = shade;
      colors[i * 3 + 1] = shade;
      colors[i * 3 + 2] = shade;
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    parts.push(g);
  }

  const merged = mergeGeometries(parts, false);
  parts.forEach((p) => p.dispose());
  merged.computeVertexNormals();
  return merged;
}

// Recompute clean, undistorted architectural UVs on extruded building walls after rotateX(-PI/2)
function applyCleanArchitecturalUVs(
  geo: THREE.BufferGeometry,
  tileMeters = 15
) {
  const pos = geo.attributes.position;
  const norm = geo.attributes.normal;
  const uv = geo.attributes.uv;
  if (!pos || !norm || !uv) return;

  for (let i = 0; i < pos.count; i++) {
    const nx = norm.getX(i);
    const ny = norm.getY(i);
    const nz = norm.getZ(i);
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);

    if (Math.abs(ny) > 0.75) {
      // Roof / floor cap
      uv.setXY(i, x / tileMeters, z / tileMeters);
    } else {
      // Vertical sidewall: project horizontal coordinate along wall tangent
      const uCoord = Math.abs(nx) > Math.abs(nz) ? z : x;
      uv.setXY(i, uCoord / tileMeters, y / tileMeters);
    }
  }
  uv.needsUpdate = true;
}

export interface FacadeTextureSet {
  tubeModernTex: THREE.CanvasTexture;
  tubeClassicTex: THREE.CanvasTexture;
  tubeCommercialTex: THREE.CanvasTexture;
  kttVintageTex: THREE.CanvasTexture;
  frenchColonialTex: THREE.CanvasTexture;
  towerGlassAzureTex: THREE.CanvasTexture;
  towerGlassTealTex: THREE.CanvasTexture;
  towerRibbonTex: THREE.CanvasTexture;
  towerBronzeTex: THREE.CanvasTexture;
  clayTileRoofTex: THREE.CanvasTexture;
  corrugatedRoofTex: THREE.CanvasTexture;
  terraceSlabTex: THREE.CanvasTexture;
  tubeTex: THREE.CanvasTexture;
  kttTex: THREE.CanvasTexture;
  towerGlassTex: THREE.CanvasTexture;
}

// Create high-resolution architectural facade textures matching Vietnamese urban architecture:
// - Modern glass curtain-walls (Azure, Teal, Bronze)
// - Travertine stone ribbon towers
// - Vietnamese tube houses (Modern wood louvers, Heritage French-colonial shutters, Shophouse storefronts)
// - Vintage KTT apartment blocks with "chuồng cọp" balconies
export function createFacadeTextures(theme: RenderTheme): FacadeTextureSet {
  const makeFacade = (
    cols: number,
    rows: number,
    style:
      | 'tubeModern'
      | 'tubeClassic'
      | 'tubeCommercial'
      | 'kttVintage'
      | 'frenchColonial'
      | 'towerGlassAzure'
      | 'towerGlassTeal'
      | 'towerRibbon'
      | 'towerBronze'
  ) => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    const rowH = 512 / rows;
    const colW = 512 / cols;

    let s =
      style === 'towerGlassAzure'
        ? 999
        : style === 'towerGlassTeal'
        ? 888
        : style === 'towerBronze'
        ? 666
        : style === 'towerRibbon'
        ? 777
        : style === 'kttVintage'
        ? 333
        : style === 'frenchColonial'
        ? 444
        : style === 'tubeCommercial'
        ? 555
        : style === 'tubeClassic'
        ? 222
        : 111;
    const rand = () => {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };

    if (theme === 'default') {
      if (style === 'towerGlassAzure') {
        // Modern azure/cyan glass curtain wall (like Novotel Danang, Azura, Lotte)
        // High luminance and radiant mullions so glass towers gleam in sunlight and never turn dark
        ctx.fillStyle = '#0ea5e9';
        ctx.fillRect(0, 0, 512, 512);

        for (let r = 0; r < rows; r++) {
          const y = r * rowH;
          // Crisp white/silver horizontal spandrel band
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, y, 512, rowH * 0.16);
          ctx.fillStyle = 'rgba(255,255,255,0.7)';
          ctx.fillRect(0, y + rowH * 0.16, 512, 2.5);

          for (let c = 0; c < cols; c++) {
            const gx = c * colW;
            const gy = y + rowH * 0.20;
            const gw = colW - 3.5;
            const gh = rowH * 0.74;
            // Sparkling cyan-blue glass panel
            ctx.fillStyle = rand() < 0.45 ? '#38bdf8' : '#0284c7';
            ctx.fillRect(gx + 1.8, gy, gw, gh);

            // Diagonal sky reflection gradient
            ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
            ctx.fillRect(gx + 2, gy, gw * 0.45, gh);

            // Crisp silver/white vertical mullion
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(gx, y, 2.2, rowH);
          }
        }
      } else if (style === 'towerGlassTeal') {
        // Sleek dark-teal architectural glass curtain-wall (like Vanda, Vietcombank)
        ctx.fillStyle = '#1e4e68';
        ctx.fillRect(0, 0, 512, 512);

        for (let r = 0; r < rows; r++) {
          const y = r * rowH;
          ctx.fillStyle = '#15394d';
          ctx.fillRect(0, y, 512, rowH * 0.22);
          ctx.fillStyle = '#477c99';
          ctx.fillRect(0, y + rowH * 0.22, 512, 2.5);

          for (let c = 0; c < cols; c++) {
            const gx = c * colW;
            const gy = y + rowH * 0.26;
            const gw = colW - 5;
            const gh = rowH * 0.68;
            ctx.fillStyle = rand() < 0.35 ? '#265f7d' : '#1b4963';
            ctx.fillRect(gx + 2.5, gy, gw, gh);
            ctx.fillStyle = 'rgba(148, 197, 222, 0.35)';
            ctx.fillRect(gx, y, 2, rowH);
          }
        }
      } else if (style === 'towerBronze') {
        // Champagne/bronze reflective metallic glass facade
        ctx.fillStyle = '#78350f';
        ctx.fillRect(0, 0, 512, 512);

        for (let r = 0; r < rows; r++) {
          const y = r * rowH;
          ctx.fillStyle = '#451a03';
          ctx.fillRect(0, y, 512, rowH * 0.2);
          ctx.fillStyle = '#f59e0b';
          ctx.fillRect(0, y + rowH * 0.2, 512, 2);

          for (let c = 0; c < cols; c++) {
            const gx = c * colW;
            const gy = y + rowH * 0.24;
            const gw = colW - 4;
            const gh = rowH * 0.7;
            ctx.fillStyle = rand() < 0.4 ? '#b45309' : '#92400e';
            ctx.fillRect(gx + 2, gy, gw, gh);
            // Vertical gold fins
            ctx.fillStyle = '#d97706';
            ctx.fillRect(gx, y, 3, rowH);
          }
        }
      } else if (style === 'towerRibbon') {
        // Modern travertine high-rise with horizontal dark-slate ribbon windows
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 512, 512);

        for (let r = 0; r < rows; r++) {
          const y = r * rowH;
          ctx.fillStyle = 'rgba(0,0,0,0.12)';
          ctx.fillRect(0, y, 512, 3);

          const bandY = y + rowH * 0.24;
          const bandH = rowH * 0.52;
          ctx.fillStyle = '#22303f';
          ctx.fillRect(10, bandY, 492, bandH);

          for (let c = 0; c < cols; c++) {
            const mx = c * colW;
            if (rand() < 0.25) {
              ctx.fillStyle = '#2e4054';
              ctx.fillRect(mx + 3, bandY + 2, colW - 6, bandH - 4);
            }
            ctx.fillStyle = 'rgba(226,232,240,0.45)';
            ctx.fillRect(mx, bandY, 3, bandH);
          }
        }
      } else if (style === 'tubeModern') {
        // Modern Vietnamese tube house with alternating timber louvers (lam gỗ Conwood), anthracite Xingfa frames & glass balustrades
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(0, 0, 512, 512);

        // Upper floors (rows 0 to rows - 2)
        for (let r = 0; r < rows - 1; r++) {
          const y = r * rowH;
          // Floor demarcation shadow line
          ctx.fillStyle = '#cbd5e1';
          ctx.fillRect(0, y, 512, 4);
          ctx.fillStyle = 'rgba(0,0,0,0.08)';
          ctx.fillRect(0, y + 4, 512, 2);

          for (let c = 0; c < cols; c++) {
            const wx = c * colW + colW * 0.14;
            const wy = y + rowH * 0.16;
            const ww = colW * 0.72;
            const wh = rowH * 0.70;

            // Anthracite aluminum window frame (Xingfa)
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(wx, wy, ww, wh);

            // Deep tinted glass
            ctx.fillStyle = '#334155';
            ctx.fillRect(wx + 2, wy + 2, ww - 4, wh - 4);
            ctx.fillStyle = 'rgba(56, 189, 248, 0.38)';
            ctx.fillRect(wx + 3, wy + 3, (ww - 6) * 0.6, wh - 6);

            // Alternating architectural feature: Timber louvers on 50% of columns
            if ((c + r) % 2 === 0) {
              ctx.fillStyle = '#b45309'; // Conwood warm teak wood
              const louverX = wx + ww * 0.58;
              const louverW = ww * 0.38;
              for (let ly = wy + 3; ly < wy + wh - 3; ly += 6) {
                ctx.fillRect(louverX, ly, louverW, 3.2);
              }
            } else {
              // Sliding glass door with vertical division
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(wx + ww * 0.5 - 1, wy, 2, wh);
            }

            // Glass balcony ledge / balustrade
            ctx.fillStyle = 'rgba(56, 189, 248, 0.55)';
            ctx.fillRect(wx - 2, wy + wh - 6, ww + 4, 7);
            ctx.fillStyle = '#64748b';
            ctx.fillRect(wx - 2, wy + wh, ww + 4, 2);
          }
        }

        // Ground floor (r === rows - 1): Granite-clad entrance facade & 4-panel iron/glass gate (Cổng sắt 4 cánh & mặt tiền ốp đá tầng trệt)
        const gY = (rows - 1) * rowH;
        ctx.fillStyle = '#334155'; // Dark granite stone cladding on ground floor
        ctx.fillRect(0, gY, 512, rowH);
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(0, gY, 512, 4);

        for (let c = 0; c < cols; c++) {
          const gx = c * colW + colW * 0.12;
          const gw = colW * 0.76;
          const gy = gY + rowH * 0.14;
          const gh = rowH * 0.84;

          // White stone lintel & pillars
          ctx.fillStyle = '#f1f5f9';
          ctx.fillRect(gx - 3, gy - 3, gw + 6, gh + 3);

          // 4-panel dark iron & frosted glass folding gate (cửa cổng 4 cánh Việt Nam)
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(gx, gy, gw, gh);
          const panelW = (gw - 10) / 4;
          for (let p = 0; p < 4; p++) {
            const px = gx + 2 + p * (panelW + 2);
            ctx.fillStyle = 'rgba(186, 230, 253, 0.65)';
            ctx.fillRect(px + 2, gy + 6, panelW - 4, gh * 0.58);
            ctx.fillStyle = '#334155';
            ctx.fillRect(px + 2, gy + gh * 0.68, panelW - 4, gh * 0.26);
          }
          // House number plate (Biển số nhà xanh)
          ctx.fillStyle = '#0284c7';
          ctx.fillRect(gx - 2, gy - 12, 18, 9);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(gx + 1, gy - 9, 12, 3);
        }
      } else if (style === 'tubeClassic') {
        // Heritage French-colonial Vietnamese townhouse: ochre stucco with deep green shuttered louvers
        ctx.fillStyle = '#fef08a'; // Ochre yellow
        ctx.fillRect(0, 0, 512, 512);

        for (let r = 0; r < rows - 1; r++) {
          const y = r * rowH;
          ctx.fillStyle = '#ca8a04';
          ctx.fillRect(0, y, 512, 4);

          for (let c = 0; c < cols; c++) {
            const wx = c * colW + colW * 0.22;
            const wy = y + rowH * 0.22;
            const ww = colW * 0.56;
            const wh = rowH * 0.58;

            // Decorative white arched lintel
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(wx + ww * 0.5, wy + 4, ww * 0.5, Math.PI, 0);
            ctx.fill();

            // Forest green louvered shutters (cửa chớp gỗ xanh)
            ctx.fillStyle = '#166534';
            ctx.fillRect(wx, wy, ww, wh);

            // Shutter louvers
            ctx.fillStyle = '#14532d';
            for (let ly = wy + 3; ly < wy + wh - 3; ly += 5) {
              ctx.fillRect(wx + 3, ly, ww - 6, 2.5);
            }
          }
        }

        // Ground floor traditional wooden 4-panel folding door (Cửa bức bàn / cửa gỗ 4 cánh)
        const gY = (rows - 1) * rowH;
        ctx.fillStyle = '#ca8a04';
        ctx.fillRect(0, gY, 512, 5);
        for (let c = 0; c < cols; c++) {
          const dx = c * colW + colW * 0.16;
          const dw = colW * 0.68;
          const dy = gY + rowH * 0.16;
          const dh = rowH * 0.82;
          ctx.fillStyle = '#78350f';
          ctx.fillRect(dx, dy, dw, dh);
          const pw = (dw - 10) / 4;
          for (let p = 0; p < 4; p++) {
            const px = dx + 2 + p * (pw + 2);
            ctx.fillStyle = '#92400e';
            ctx.fillRect(px, dy + 4, pw, dh - 8);
            ctx.fillStyle = '#b45309';
            ctx.fillRect(px + 2, dy + 8, pw - 4, dh * 0.45);
          }
        }
      } else if (style === 'tubeCommercial') {
        // Vietnamese Shophouse (Nhà phố thương mại Việt Nam):
        // Ground floor: Storefront signage with authentic Vietnamese shop signs, rolling shutters & awnings
        // Upper floors: Residential townhome windows with white frames, curtains, and air conditioner units
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 512, 512);

        const shopSigns = [
          { text: 'PHỞ BÒ', sub: 'Hà Nội', bg: '#dc2626', fg: '#fef08a' },
          { text: 'CÀ PHÊ', sub: 'Đà Nẵng', bg: '#78350f', fg: '#fef3c7' },
          { text: 'NHÀ THUỐC', sub: 'Tâm Đức', bg: '#0284c7', fg: '#ffffff' },
          { text: 'KHÁCH SẠN', sub: 'River View', bg: '#1e3a8a', fg: '#facc15' },
          { text: 'BÁNH MÌ', sub: 'Pâté Nóng', bg: '#ea580c', fg: '#ffffff' },
          { text: 'CƠM TẤM', sub: 'Sài Gòn', bg: '#b91c1c', fg: '#fef08a' },
          { text: 'TRÀ SỮA', sub: 'Trân Châu', bg: '#059669', fg: '#ffffff' },
          { text: 'TIỆM VÀNG', sub: 'Bảo Tín', bg: '#ca8a04', fg: '#1e293b' },
        ];

        // 1. Upper Floors Residential Windows
        for (let r = 0; r < rows - 1; r++) {
          const y = r * rowH;
          // Concrete floor ledge separating stories
          ctx.fillStyle = '#e2e8f0';
          ctx.fillRect(0, y, 512, 4);
          ctx.fillStyle = 'rgba(0,0,0,0.08)';
          ctx.fillRect(0, y + 4, 512, 2);

          for (let c = 0; c < cols; c++) {
            const winW = colW * 0.58;
            const winH = rowH * 0.56;
            const wx = c * colW + (colW - winW) * 0.5;
            const wy = r * rowH + (rowH - winH) * 0.46;

            // White concrete molding frame
            ctx.fillStyle = '#f1f5f9';
            ctx.fillRect(wx - 2.5, wy - 2.5, winW + 5, winH + 5);

            // Dark window frame
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(wx, wy, winW, winH);

            // Glass pane
            ctx.fillStyle = '#334155';
            ctx.fillRect(wx + 2, wy + 2, winW - 4, winH - 4);

            // Light cyan sky reflection
            ctx.fillStyle = 'rgba(56, 189, 248, 0.4)';
            ctx.fillRect(wx + 3, wy + 3, (winW - 6) * 0.65, winH - 6);

            // Window division mullion
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(wx + winW * 0.5 - 1, wy, 2, winH);

            // Balcony railing
            ctx.fillStyle = '#475569';
            ctx.fillRect(wx - 3, wy + winH - 5, winW + 6, 7);

            // AC unit condenser on 35% of windows
            if ((c + r) % 3 === 0) {
              const acW = 18;
              const acH = 12;
              const acX = wx + winW + 3;
              if (acX + acW < (c + 1) * colW) {
                ctx.fillStyle = '#e2e8f0';
                ctx.fillRect(acX, wy + winH - 12, acW, acH);
                ctx.fillStyle = '#94a3b8';
                ctx.fillRect(acX + 3, wy + winH - 9, 7, 7);
              }
            }
          }
        }

        // 2. Ground Floor Commercial Storefronts
        const gY = (rows - 1) * rowH;
        // Floor slab
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(0, gY, 512, 4);

        for (let c = 0; c < cols; c++) {
          const shop = shopSigns[c % shopSigns.length];
          const sx = c * colW + 4;
          const sw = colW - 8;
          const signH = rowH * 0.28;

          // Signboard background
          ctx.fillStyle = shop.bg;
          ctx.fillRect(sx, gY + 5, sw, signH);

          // Signboard inner border
          ctx.strokeStyle = shop.fg;
          ctx.lineWidth = 1.2;
          ctx.strokeRect(sx + 2, gY + 7, sw - 4, signH - 4);

          // Vietnamese Signboard Text
          ctx.fillStyle = shop.fg;
          ctx.font = 'bold 11px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(shop.text, sx + sw * 0.5, gY + 5 + signH * 0.42);

          ctx.font = '7px sans-serif';
          ctx.fillText(shop.sub, sx + sw * 0.5, gY + 5 + signH * 0.8);

          // Below sign: Storefront door & awning
          const storeTop = gY + 5 + signH + 2;
          const storeH = 512 - storeTop - 2;

          // Striped awning on 50% of shops
          if (c % 2 === 0) {
            const awnH = Math.min(18, storeH * 0.32);
            for (let ax = 0; ax < sw; ax += 8) {
              ctx.fillStyle = (ax / 8) % 2 === 0 ? shop.bg : '#ffffff';
              ctx.fillRect(sx + ax, storeTop, Math.min(8, sw - ax), awnH);
            }
            // Scalloped bottom edge
            ctx.fillStyle = shop.bg;
            ctx.fillRect(sx, storeTop + awnH - 2, sw, 2.5);

            // Shutter / Glass door below awning
            const doorTop = storeTop + awnH + 2;
            const doorH = 512 - doorTop - 2;
            ctx.fillStyle = '#cbd5e1';
            ctx.fillRect(sx + 2, doorTop, sw - 4, doorH);
            ctx.fillStyle = '#94a3b8';
            for (let sy = doorTop; sy < 510; sy += 4) {
              ctx.fillRect(sx + 2, sy, sw - 4, 1.5);
            }
          } else {
            // Full-height roll-up steel shutter door (cửa cuốn Ausdoor) with center glass entry
            ctx.fillStyle = '#e2e8f0';
            ctx.fillRect(sx + 2, storeTop, sw - 4, storeH);
            ctx.fillStyle = '#94a3b8';
            for (let sy = storeTop; sy < 510; sy += 4) {
              ctx.fillRect(sx + 2, sy, sw - 4, 1.5);
            }
            // Glass entrance door
            const entryW = sw * 0.45;
            const entryX = sx + (sw - entryW) * 0.5;
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(entryX, storeTop + 8, entryW, storeH - 8);
            ctx.fillStyle = 'rgba(56, 189, 248, 0.45)';
            ctx.fillRect(entryX + 2, storeTop + 10, entryW - 4, storeH - 12);
          }
        }
      } else if (style === 'kttVintage') {
        // Vintage 5-story KTT apartment block (nhà tập thể cũ với chuồng cọp & hành lang)
        ctx.fillStyle = '#fef9c3';
        ctx.fillRect(0, 0, 512, 512);

        for (let r = 0; r < rows; r++) {
          const y = r * rowH;
          // Concrete floor balcony walkway with rain stain patina
          ctx.fillStyle = '#a16207';
          ctx.fillRect(0, y, 512, 4);

          for (let c = 0; c < cols; c++) {
            const winW = colW * 0.58;
            const winH = rowH * 0.54;
            const wx = c * colW + (colW - winW) * 0.5;
            const wy = r * rowH + (rowH - winH) * 0.46;

            // Green window frame
            ctx.fillStyle = '#15803d';
            ctx.fillRect(wx - 2, wy - 2, winW + 4, winH + 4);
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(wx, wy, winW, winH);

            // Metal security cage / "chuồng cọp" grid pattern
            ctx.fillStyle = 'rgba(100, 116, 139, 0.7)';
            for (let mx = wx + 4; mx < wx + winW; mx += 6) {
              ctx.fillRect(mx, wy, 1.5, winH);
            }
            for (let my = wy + 4; my < wy + winH; my += 6) {
              ctx.fillRect(wx, my, winW, 1.5);
            }
          }
        }
      } else {
        // French colonial villa with arched windows & white pilasters
        ctx.fillStyle = '#fef3c7';
        ctx.fillRect(0, 0, 512, 512);

        for (let r = 0; r < rows; r++) {
          const y = r * rowH;
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, y, 512, 5);

          for (let c = 0; c < cols; c++) {
            const wx = c * colW + colW * 0.25;
            const wy = y + rowH * 0.25;
            const ww = colW * 0.5;
            const wh = rowH * 0.55;

            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(wx + ww * 0.5, wy + 2, ww * 0.5, Math.PI, 0);
            ctx.fill();

            ctx.fillStyle = '#1e293b';
            ctx.fillRect(wx, wy, ww, wh);

            ctx.fillStyle = 'rgba(255,255,255,0.7)';
            ctx.fillRect(wx + ww * 0.48, wy, 2, wh);
            ctx.fillRect(wx, wy + wh * 0.45, ww, 2);
          }
        }
      }
    } else {
      // Night mode with realistic scattered warm interior glows
      const isTower =
        style === 'towerGlassAzure' ||
        style === 'towerGlassTeal' ||
        style === 'towerBronze' ||
        style === 'towerRibbon';
      ctx.fillStyle = isTower ? '#0f172a' : '#1e293b';
      ctx.fillRect(0, 0, 512, 512);

      for (let r = 0; r < rows; r++) {
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.fillRect(0, r * rowH, 512, 3.5);
      }

      for (let r = 0; r < rows; r++) {
        const isTowerBand = isTower && r % 4 === 1;
        for (let c = 0; c < cols; c++) {
          const litProb = isTower ? 0.65 : style === 'tubeCommercial' ? 0.72 : 0.48;
          const isLit = isTowerBand || rand() < litProb;

          const winW = colW * (isTower ? 0.72 : 0.48);
          const winH = rowH * (isTower ? 0.58 : 0.48);
          const wx = c * colW + (colW - winW) * 0.5;
          const wy = r * rowH + (rowH - winH) * 0.5;

          if (isLit) {
            const roll = rand();
            if (isTowerBand || roll < 0.55) {
              ctx.fillStyle = '#fef08a'; // Warm incandescent
            } else if (roll < 0.85) {
              ctx.fillStyle = '#fb923c'; // Amber evening lamp
            } else {
              ctx.fillStyle = '#e0f2fe'; // Cool white LED
            }
          } else {
            ctx.fillStyle = '#090d16';
          }
          ctx.fillRect(wx, wy, winW, winH);
        }
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = 4;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  };

  const tubeModernTex = makeFacade(4, 5, 'tubeModern');
  const tubeClassicTex = makeFacade(4, 5, 'tubeClassic');
  const tubeCommercialTex = makeFacade(4, 5, 'tubeCommercial');
  const kttVintageTex = makeFacade(6, 5, 'kttVintage');
  const frenchColonialTex = makeFacade(5, 5, 'frenchColonial');
  const towerGlassAzureTex = makeFacade(7, 8, 'towerGlassAzure');
  const towerGlassTealTex = makeFacade(6, 8, 'towerGlassTeal');
  const towerRibbonTex = makeFacade(8, 8, 'towerRibbon');
  const towerBronzeTex = makeFacade(6, 8, 'towerBronze');

  // 1. Vietnamese Clay Tile Roof Texture (Ngói đỏ đất nung Hạ Long / ngói vảy cá)
  const clayCanvas = document.createElement('canvas');
  clayCanvas.width = 256;
  clayCanvas.height = 256;
  const cCtx = clayCanvas.getContext('2d')!;
  cCtx.fillStyle = '#e2e8f0'; // Neutral bright base so material color tint controls terracotta/blue/grey shade
  cCtx.fillRect(0, 0, 256, 256);
  const tileRows = 16;
  const tileCols = 12;
  const tRowH = 256 / tileRows;
  const tColW = 256 / tileCols;
  for (let r = 0; r < tileRows; r++) {
    const ty = r * tRowH;
    // Overlapping tile bottom shadow course
    cCtx.fillStyle = 'rgba(15, 23, 42, 0.32)';
    cCtx.fillRect(0, ty + tRowH - 3.5, 256, 3.5);
    // Sunlit tile top ridge highlight
    cCtx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    cCtx.fillRect(0, ty, 256, 2.5);
    const offset = (r % 2) * (tColW * 0.5);
    for (let c = -1; c <= tileCols; c++) {
      const tx = c * tColW + offset;
      cCtx.fillStyle = 'rgba(15, 23, 42, 0.22)';
      cCtx.fillRect(tx, ty, 2, tRowH);
      cCtx.fillStyle = 'rgba(255, 255, 255, 0.28)';
      cCtx.fillRect(tx + 2, ty + 2, tColW * 0.45, tRowH - 5);
    }
  }
  const clayTileRoofTex = new THREE.CanvasTexture(clayCanvas);
  clayTileRoofTex.wrapS = THREE.RepeatWrapping;
  clayTileRoofTex.wrapT = THREE.RepeatWrapping;
  clayTileRoofTex.anisotropy = 4;
  clayTileRoofTex.colorSpace = THREE.SRGBColorSpace;

  // 2. Corrugated Sheet-Metal Roof Texture (Tôn sóng lạnh chống nóng Việt Nam)
  const corrCanvas = document.createElement('canvas');
  corrCanvas.width = 256;
  corrCanvas.height = 256;
  const mCtx = corrCanvas.getContext('2d')!;
  mCtx.fillStyle = '#e2e8f0';
  mCtx.fillRect(0, 0, 256, 256);
  // Parallel corrugated ribs (sóng tôn)
  for (let x = 0; x < 256; x += 8) {
    mCtx.fillStyle = 'rgba(255, 255, 255, 0.55)';
    mCtx.fillRect(x, 0, 3, 256);
    mCtx.fillStyle = 'rgba(15, 23, 42, 0.28)';
    mCtx.fillRect(x + 4, 0, 2.5, 256);
  }
  // Horizontal purlin overlap seams (mối nối tôn & vít xà gồ)
  for (let y = 0; y < 256; y += 64) {
    mCtx.fillStyle = 'rgba(15, 23, 42, 0.35)';
    mCtx.fillRect(0, y, 256, 2.5);
    mCtx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    mCtx.fillRect(0, y + 2.5, 256, 1.5);
  }
  const corrugatedRoofTex = new THREE.CanvasTexture(corrCanvas);
  corrugatedRoofTex.wrapS = THREE.RepeatWrapping;
  corrugatedRoofTex.wrapT = THREE.RepeatWrapping;
  corrugatedRoofTex.anisotropy = 4;
  corrugatedRoofTex.colorSpace = THREE.SRGBColorSpace;

  // 3. Rooftop Terrace Ceramic Paver Slab Texture (Sân thượng lát gạch chống thấm)
  const terrCanvas = document.createElement('canvas');
  terrCanvas.width = 256;
  terrCanvas.height = 256;
  const trCtx = terrCanvas.getContext('2d')!;
  trCtx.fillStyle = '#cbd5e1';
  trCtx.fillRect(0, 0, 256, 256);
  for (let x = 0; x < 256; x += 32) {
    for (let y = 0; y < 256; y += 32) {
      trCtx.fillStyle = (x / 32 + y / 32) % 2 === 0 ? '#cbd5e1' : '#d8e0e9';
      trCtx.fillRect(x + 1, y + 1, 30, 30);
      trCtx.strokeStyle = 'rgba(51, 65, 85, 0.28)';
      trCtx.lineWidth = 1.5;
      trCtx.strokeRect(x + 0.5, y + 0.5, 31, 31);
    }
  }
  const terraceSlabTex = new THREE.CanvasTexture(terrCanvas);
  terraceSlabTex.wrapS = THREE.RepeatWrapping;
  terraceSlabTex.wrapT = THREE.RepeatWrapping;
  terraceSlabTex.anisotropy = 4;
  terraceSlabTex.colorSpace = THREE.SRGBColorSpace;

  return {
    tubeModernTex,
    tubeClassicTex,
    tubeCommercialTex,
    kttVintageTex,
    frenchColonialTex,
    towerGlassAzureTex,
    towerGlassTealTex,
    towerRibbonTex,
    towerBronzeTex,
    clayTileRoofTex,
    corrugatedRoofTex,
    terraceSlabTex,
    // Backwards-compatible aliases
    tubeTex: tubeModernTex,
    kttTex: kttVintageTex,
    towerGlassTex: towerGlassTealTex,
  };
}

// Create a solid upward-facing (+Y normal) ribbon mesh along a 2D polyline with support for dynamic elevation curves
export function createRibbonGeometry(
  points: [number, number][],
  width: number,
  yOffset: number | ((progress: number, dist: number, totalLen: number) => number)
): THREE.BufferGeometry | null {
  if (points.length < 2) return null;

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const halfW = width * 0.5;
  let totalLen = 0;
  for (let i = 1; i < points.length; i++) {
    totalLen += Math.hypot(
      points[i][0] - points[i - 1][0],
      points[i][1] - points[i - 1][1]
    );
  }
  totalLen = Math.max(1, totalLen);

  let totalDist = 0;

  for (let i = 0; i < points.length; i++) {
    const [x, z] = points[i];
    if (i > 0) {
      totalDist += Math.hypot(x - points[i - 1][0], z - points[i - 1][1]);
    }
    const curY =
      typeof yOffset === 'function'
        ? yOffset(totalDist / totalLen, totalDist, totalLen)
        : yOffset;

    let nx = 0;
    let nz = 0;

    if (i === 0) {
      const dx = points[1][0] - x;
      const dz = points[1][1] - z;
      const len = Math.hypot(dx, dz) || 1;
      nx = -dz / len;
      nz = dx / len;
    } else if (i === points.length - 1) {
      const dx = x - points[i - 1][0];
      const dz = z - points[i - 1][1];
      const len = Math.hypot(dx, dz) || 1;
      nx = -dz / len;
      nz = dx / len;
    } else {
      const dx1 = x - points[i - 1][0];
      const dz1 = z - points[i - 1][1];
      const len1 = Math.hypot(dx1, dz1) || 1;
      const dx2 = points[i + 1][0] - x;
      const dz2 = points[i + 1][1] - z;
      const len2 = Math.hypot(dx2, dz2) || 1;
      nx = -(dz1 / len1 + dz2 / len2) * 0.5;
      nz = (dx1 / len1 + dx2 / len2) * 0.5;
      const nLen = Math.hypot(nx, nz) || 1;
      nx /= nLen;
      nz /= nLen;
    }

    positions.push(x + nx * halfW, curY, z + nz * halfW);
    positions.push(x - nx * halfW, curY, z - nz * halfW);

    const v = totalDist / Math.max(1, width);
    uvs.push(0, v, 1, v);

    if (i < points.length - 1) {
      const base = i * 2;
      indices.push(base, base + 2, base + 1);
      indices.push(base + 1, base + 2, base + 3);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

// ==========================================
// 3D ICONIC BRIDGES OF ĐÀ NẴNG (RECONSTRUCTED)
// ==========================================

// 1. CẦU RỒNG ĐÀ NẴNG (DRAGON BRIDGE)
// Features: 5 continuous golden undulating steel arch tubes, transverse braces,
// dorsal fins/scales, hanger cables, sculpted dragon head with glowing ruby eyes & fire breath,
// and stylized lotus tail on West bank.
function buildDragonBridge3D(
  rootGroup: THREE.Group,
  road: RoadFeature,
  targetBridgeY: number,
  disposables: { dispose: () => void }[],
  isDay: boolean,
  clipPlanes: THREE.Plane[]
) {
  const pStart = road.points[0];
  const pEnd = road.points[road.points.length - 1];
  const bDx = pEnd[0] - pStart[0];
  const bDz = pEnd[1] - pStart[1];
  const bLen = Math.hypot(bDx, bDz) || 1;
  const bAngle = Math.atan2(bDx, bDz);
  const nx = -bDz / bLen;
  const nz = bDx / bLen;

  const dragonGroup = new THREE.Group();
  dragonGroup.name = 'dragon-bridge-superstructure';

  const goldBodyMat = new THREE.MeshStandardMaterial({
    color: '#f59e0b',
    roughness: 0.2,
    metalness: 0.85,
    emissive: isDay ? '#92400e' : '#d97706',
    emissiveIntensity: isDay ? 0.18 : 0.55,
    clippingPlanes: clipPlanes,
  });
  const goldFinMat = new THREE.MeshStandardMaterial({
    color: '#fbbf24',
    roughness: 0.16,
    metalness: 0.9,
    emissive: isDay ? '#b45309' : '#f59e0b',
    emissiveIntensity: isDay ? 0.22 : 0.65,
    side: THREE.DoubleSide,
    clippingPlanes: clipPlanes,
  });
  const cableMat = new THREE.MeshStandardMaterial({
    color: '#f8fafc',
    roughness: 0.28,
    metalness: 0.8,
    clippingPlanes: clipPlanes,
  });
  const dragonEyeMat = new THREE.MeshBasicMaterial({
    color: '#ef4444',
  });
  const flameMat = new THREE.MeshBasicMaterial({
    color: '#ff6a00',
    transparent: true,
    opacity: isDay ? 0.68 : 0.92,
  });
  const flameCoreMat = new THREE.MeshBasicMaterial({
    color: '#fef08a',
    transparent: true,
    opacity: isDay ? 0.85 : 0.98,
  });
  disposables.push(goldBodyMat, goldFinMat, cableMat, dragonEyeMat, flameMat, flameCoreMat);

  // 1. Five Continuous Undulating Golden Steel Arches (Thân Rồng Vàng Rực Rỡ 5 Nhịp Vòm)
  const archSteps = 110;
  const centerSpinePts: THREE.Vector3[] = [];
  const leftArchPts: THREE.Vector3[] = [];
  const rightArchPts: THREE.Vector3[] = [];
  const bellyArchPts: THREE.Vector3[] = [];
  const spineCenterPts: { x: number; y: number; z: number; waveH: number }[] = [];

  const archStartT = 0.07;
  const archEndT = 0.91;
  const archSpanT = archEndT - archStartT;
  const mainSpineRadius = 1.65;
  const sideTubeRadius = 1.05;
  const halfGap = 2.6;

  for (let s = 0; s <= archSteps; s++) {
    const t = archStartT + (s / archSteps) * archSpanT;
    const px = pStart[0] + bDx * t;
    const pz = pStart[1] + bDz * t;
    const normT = s / archSteps;
    const rawSin = Math.sin(normT * Math.PI * 5);
    const wave = Math.max(0, rawSin);
    const envelope = Math.sin(normT * Math.PI);
    const waveH = wave * (26.5 * (0.68 + 0.32 * envelope));
    const py = targetBridgeY + 1.4 + waveH;

    centerSpinePts.push(new THREE.Vector3(px, py + 1.1, pz));
    leftArchPts.push(new THREE.Vector3(px + nx * -halfGap, py, pz + nz * -halfGap));
    rightArchPts.push(new THREE.Vector3(px + nx * halfGap, py, pz + nz * halfGap));

    // Undulating dragon belly dipping beneath the deck between piers
    const bellyY =
      rawSin < 0
        ? targetBridgeY - 0.5 + rawSin * 3.2
        : targetBridgeY + 0.8 + waveH * 0.68;
    bellyArchPts.push(new THREE.Vector3(px, bellyY, pz));

    spineCenterPts.push({ x: px, y: py, z: pz, waveH });
  }

  const centerCurve = new THREE.CatmullRomCurve3(centerSpinePts);
  const leftCurve = new THREE.CatmullRomCurve3(leftArchPts);
  const rightCurve = new THREE.CatmullRomCurve3(rightArchPts);
  const bellyCurve = new THREE.CatmullRomCurve3(bellyArchPts);

  const centerTubeGeo = new THREE.TubeGeometry(centerCurve, archSteps, mainSpineRadius, 10, false);
  const leftTubeGeo = new THREE.TubeGeometry(leftCurve, archSteps, sideTubeRadius, 8, false);
  const rightTubeGeo = new THREE.TubeGeometry(rightCurve, archSteps, sideTubeRadius, 8, false);
  const bellyTubeGeo = new THREE.TubeGeometry(bellyCurve, archSteps, 1.1, 8, false);

  const centerTubeMesh = new THREE.Mesh(centerTubeGeo, goldFinMat);
  const leftTubeMesh = new THREE.Mesh(leftTubeGeo, goldBodyMat);
  const rightTubeMesh = new THREE.Mesh(rightTubeGeo, goldBodyMat);
  const bellyTubeMesh = new THREE.Mesh(bellyTubeGeo, goldBodyMat);
  centerTubeMesh.castShadow = true;
  leftTubeMesh.castShadow = true;
  rightTubeMesh.castShadow = true;
  dragonGroup.add(centerTubeMesh, leftTubeMesh, rightTubeMesh, bellyTubeMesh);
  disposables.push(centerTubeGeo, leftTubeGeo, rightTubeGeo, bellyTubeGeo);

  // 1.5 Six Streamlined V-Pier River Supports under the 5 arch spans
  const riverPierMat = new THREE.MeshStandardMaterial({
    color: isDay ? '#e2e8f0' : '#475569',
    roughness: 0.72,
    clippingPlanes: clipPlanes,
  });
  disposables.push(riverPierMat);

  for (let pIdx = 0; pIdx < 6; pIdx++) {
    const t = archStartT + (pIdx / 5) * archSpanT;
    const px = pStart[0] + bDx * t;
    const pz = pStart[1] + bDz * t;
    const pierGeo = new THREE.CylinderGeometry(
      road.width * 0.45,
      road.width * 0.5,
      targetBridgeY + 1.2,
      20
    );
    pierGeo.scale(1.0, 1.0, 0.44);
    const pierMesh = new THREE.Mesh(pierGeo, riverPierMat);
    pierMesh.position.set(px, (targetBridgeY + 1.2) * 0.5, pz);
    pierMesh.rotation.y = bAngle + Math.PI / 2;
    pierMesh.castShadow = true;
    pierMesh.receiveShadow = true;
    dragonGroup.add(pierMesh);
    disposables.push(pierGeo);
  }

  // 2. Transverse Connecting Braces, Dorsal Scales/Fins & Hanger Cables
  const finGeo = new THREE.ConeGeometry(1.4, 3.6, 4);
  finGeo.rotateY(Math.PI / 4);
  disposables.push(finGeo);

  for (let i = 0; i < spineCenterPts.length; i++) {
    const pt = spineCenterPts[i];
    if (i % 3 === 0) {
      const braceGeo = new THREE.CylinderGeometry(0.45, 0.45, halfGap * 2, 6);
      braceGeo.rotateZ(Math.PI / 2);
      const braceMesh = new THREE.Mesh(braceGeo, goldBodyMat);
      braceMesh.position.set(pt.x, pt.y, pt.z);
      braceMesh.rotation.y = bAngle;
      dragonGroup.add(braceMesh);
      disposables.push(braceGeo);
    }

    if (i % 2 === 0 && pt.waveH > 1.0) {
      const finMesh = new THREE.Mesh(finGeo, goldFinMat);
      finMesh.position.set(pt.x, pt.y + 2.2, pt.z);
      finMesh.rotation.y = bAngle;
      const finScale = Math.min(1.6, 0.85 + pt.waveH * 0.035);
      finMesh.scale.set(0.55 * finScale, 1.25 * finScale, 1.15 * finScale);
      finMesh.castShadow = true;
      dragonGroup.add(finMesh);
    }

    if (i % 2 === 1 && pt.waveH > 2.2) {
      for (const side of [-halfGap, halfGap]) {
        const hx = pt.x + nx * side;
        const hz = pt.z + nz * side;
        const hLen = pt.y - targetBridgeY;
        const hangerGeo = new THREE.CylinderGeometry(0.11, 0.11, hLen, 5);
        const hangerMesh = new THREE.Mesh(hangerGeo, cableMat);
        hangerMesh.position.set(hx, targetBridgeY + hLen * 0.5, hz);
        dragonGroup.add(hangerMesh);
        disposables.push(hangerGeo);
      }
    }
  }

  // 3. ĐẦU RỒNG ĐÀ NẴNG (East bank facing Sơn Trà & East Sea)
  const neckStartPt = spineCenterPts[spineCenterPts.length - 1];
  const headPosT = 0.945;
  const headX = pStart[0] + bDx * headPosT;
  const headZ = pStart[1] + bDz * headPosT;
  const headY = targetBridgeY + 13.5;

  // Sculpted S-Curved Golden Dragon Neck rising from the 5th arch to the Dragon Head
  const neckCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(neckStartPt.x, targetBridgeY + 1.5, neckStartPt.z),
    new THREE.Vector3(
      (neckStartPt.x + headX) * 0.5,
      targetBridgeY + 6.5,
      (neckStartPt.z + headZ) * 0.5
    ),
    new THREE.Vector3(headX, headY - 0.5, headZ),
  ]);
  const neckGeo = new THREE.TubeGeometry(neckCurve, 20, 2.3, 10, false);
  const neckMesh = new THREE.Mesh(neckGeo, goldBodyMat);
  neckMesh.castShadow = true;
  dragonGroup.add(neckMesh);
  disposables.push(neckGeo);

  const headGroup = new THREE.Group();
  headGroup.position.set(headX, headY, headZ);
  headGroup.rotation.y = bAngle;
  headGroup.scale.set(1.65, 1.65, 1.65);

  const snoutGeo = new THREE.BoxGeometry(5.2, 3.2, 7.2);
  const snoutMesh = new THREE.Mesh(snoutGeo, goldBodyMat);
  snoutMesh.position.set(0, 1.3, 2.5);
  snoutMesh.rotation.x = -0.16;
  snoutMesh.castShadow = true;
  headGroup.add(snoutMesh);
  disposables.push(snoutGeo);

  const jawGeo = new THREE.BoxGeometry(4.4, 1.6, 5.8);
  const jawMesh = new THREE.Mesh(jawGeo, goldBodyMat);
  jawMesh.position.set(0, -1.0, 2.0);
  jawMesh.rotation.x = 0.3;
  jawMesh.castShadow = true;
  headGroup.add(jawMesh);
  disposables.push(jawGeo);

  const toothMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
  disposables.push(toothMat);
  for (const tx of [-1.7, -0.7, 0.7, 1.7]) {
    const tGeo = new THREE.ConeGeometry(0.32, 1.2, 4);
    tGeo.rotateX(Math.PI);
    const tMesh = new THREE.Mesh(tGeo, toothMat);
    tMesh.position.set(tx, 0.05, 5.2);
    headGroup.add(tMesh);
    disposables.push(tGeo);
  }

  const hornPositions: [number, number, number, number, number][] = [
    [-2.0, 3.8, -2.0, -0.45, -0.22],
    [2.0, 3.8, -2.0, -0.45, 0.22],
    [-1.3, 4.8, -3.0, -0.55, -0.12],
    [1.3, 4.8, -3.0, -0.55, 0.12],
    [0.0, 5.5, -2.5, -0.5, 0.0],
  ];
  for (const [hx, hy, hz, rx, rz] of hornPositions) {
    const hornGeo = new THREE.ConeGeometry(0.6, 6.8, 5);
    const hornMesh = new THREE.Mesh(hornGeo, goldFinMat);
    hornMesh.position.set(hx, hy, hz);
    hornMesh.rotation.set(rx, 0, rz);
    hornMesh.castShadow = true;
    headGroup.add(hornMesh);
    disposables.push(hornGeo);
  }

  const eyeGeo = new THREE.SphereGeometry(0.75, 10, 10);
  const leftEye = new THREE.Mesh(eyeGeo, dragonEyeMat);
  leftEye.position.set(-2.5, 2.2, 1.8);
  const rightEye = new THREE.Mesh(eyeGeo, dragonEyeMat);
  rightEye.position.set(2.5, 2.2, 1.8);
  headGroup.add(leftEye, rightEye);
  disposables.push(eyeGeo);

  const flameOuterGeo = new THREE.ConeGeometry(3.2, 18, 12);
  flameOuterGeo.rotateX(Math.PI / 2);
  const flameOuter = new THREE.Mesh(flameOuterGeo, flameMat);
  flameOuter.position.set(0, 0.3, 14.0);

  const flameInnerGeo = new THREE.ConeGeometry(1.6, 13, 10);
  flameInnerGeo.rotateX(Math.PI / 2);
  const flameInner = new THREE.Mesh(flameInnerGeo, flameCoreMat);
  flameInner.position.set(0, 0.3, 11.5);

  headGroup.add(flameOuter, flameInner);
  disposables.push(flameOuterGeo, flameInnerGeo);

  dragonGroup.add(headGroup);

  // 4. ĐUÔI RỒNG HOA SEN (West bank facing Hải Châu)
  const tailStartPt = spineCenterPts[0];
  const tailPosT = 0.04;
  const tailX = pStart[0] + bDx * tailPosT;
  const tailZ = pStart[1] + bDz * tailPosT;
  const tailY = targetBridgeY + 6.5;

  const tailStemCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(tailStartPt.x, targetBridgeY + 1.5, tailStartPt.z),
    new THREE.Vector3(
      (tailStartPt.x + tailX) * 0.5,
      targetBridgeY + 3.8,
      (tailStartPt.z + tailZ) * 0.5
    ),
    new THREE.Vector3(tailX, tailY, tailZ),
  ]);
  const tailStemGeo = new THREE.TubeGeometry(tailStemCurve, 14, 1.6, 8, false);
  const tailStemMesh = new THREE.Mesh(tailStemGeo, goldBodyMat);
  dragonGroup.add(tailStemMesh);
  disposables.push(tailStemGeo);

  const tailGroup = new THREE.Group();
  tailGroup.position.set(tailX, tailY, tailZ);
  tailGroup.rotation.y = bAngle;
  tailGroup.scale.set(1.5, 1.5, 1.5);

  const petalConfigs: [number, number, number, number, number, number][] = [
    [0.0, 4.6, -1.4, 0.4, 0.0, 1.4],
    [-1.8, 3.8, -0.8, 0.3, -0.42, 1.2],
    [1.8, 3.8, -0.8, 0.3, 0.42, 1.2],
    [-3.2, 2.6, 0.0, 0.18, -0.78, 1.0],
    [3.2, 2.6, 0.0, 0.18, 0.78, 1.0],
  ];
  for (const [px, py, pz, rx, rz, pScale] of petalConfigs) {
    const petalGeo = new THREE.ConeGeometry(1.2 * pScale, 6.8 * pScale, 4);
    petalGeo.scale(1.0, 1.0, 0.38);
    const petalMesh = new THREE.Mesh(petalGeo, goldFinMat);
    petalMesh.position.set(px, py, pz);
    petalMesh.rotation.set(rx, 0, rz);
    petalMesh.castShadow = true;
    tailGroup.add(petalMesh);
    disposables.push(petalGeo);
  }

  dragonGroup.add(tailGroup);
  rootGroup.add(dragonGroup);
}

// 2. CẦU QUAY SÔNG HÀN (HAN RIVER SWING BRIDGE)
// Features: Massive circular swing turntable pivot pier, upstream/downstream boat-fender dolphins,
// continuous 122.7m steel truss swing span, Central Steel A-Frame Pylon Tower straddling the roadway,
// and 2 planes of radiating stay cables with mathematical vector alignment.
function buildHanRiverSwingBridge3D(
  rootGroup: THREE.Group,
  road: RoadFeature,
  targetBridgeY: number,
  disposables: { dispose: () => void }[],
  isDay: boolean,
  clipPlanes: THREE.Plane[]
) {
  const pStart = road.points[0];
  const pEnd = road.points[road.points.length - 1];
  const bDx = pEnd[0] - pStart[0];
  const bDz = pEnd[1] - pStart[1];
  const bLen = Math.hypot(bDx, bDz) || 1;
  const uX = bDx / bLen;
  const uZ = bDz / bLen;
  const vX = -uZ; // Perpendicular vector across bridge (transverse)
  const vZ = uX;

  const swingGroup = new THREE.Group();
  swingGroup.name = 'han-river-swing-bridge';

  const towerMat = new THREE.MeshStandardMaterial({
    color: '#f8fafc',
    roughness: 0.28,
    metalness: 0.72,
    clippingPlanes: clipPlanes,
  });
  const steelTrussMat = new THREE.MeshStandardMaterial({
    color: '#0284c7',
    roughness: 0.35,
    metalness: 0.8,
    clippingPlanes: clipPlanes,
  });
  const pivotMat = new THREE.MeshStandardMaterial({
    color: isDay ? '#cbd5e1' : '#475569',
    roughness: 0.75,
    clippingPlanes: clipPlanes,
  });
  const stayCableMat = new THREE.MeshStandardMaterial({
    color: '#e0f2fe',
    emissive: isDay ? '#38bdf8' : '#7dd3fc',
    emissiveIntensity: isDay ? 0.35 : 0.85,
    roughness: 0.2,
    metalness: 0.85,
    clippingPlanes: clipPlanes,
  });
  const beaconMat = new THREE.MeshBasicMaterial({ color: '#ef4444' });
  disposables.push(towerMat, steelTrussMat, pivotMat, stayCableMat, beaconMat);

  // Exact center pivot point in mid-river
  const midX = (pStart[0] + pEnd[0]) * 0.5;
  const midZ = (pStart[1] + pEnd[1]) * 0.5;

  // 1. Massive circular central swing pivot pier (Trụ quay tròn giữa sông)
  const pivotH = targetBridgeY + 1.2;
  const pivotGeo = new THREE.CylinderGeometry(11.5, 12.8, pivotH, 32);
  const pivotMesh = new THREE.Mesh(pivotGeo, pivotMat);
  pivotMesh.position.set(midX, pivotH * 0.5, midZ);
  pivotMesh.castShadow = true;
  swingGroup.add(pivotMesh);
  disposables.push(pivotGeo);

  // Turntable circular gear ring beneath the deck
  const turntableGeo = new THREE.CylinderGeometry(9.6, 9.6, 0.9, 32);
  const turntableMesh = new THREE.Mesh(turntableGeo, steelTrussMat);
  turntableMesh.position.set(midX, targetBridgeY - 0.45, midZ);
  swingGroup.add(turntableMesh);
  disposables.push(turntableGeo);

  // Upstream & downstream boat fender protection dolphins (Trụ bảo vệ chống va chạm)
  for (const dir of [-1, 1]) {
    const fX = midX + vX * (20 * dir);
    const fZ = midZ + vZ * (20 * dir);
    const fenGeo = new THREE.CylinderGeometry(2.4, 2.8, targetBridgeY + 1.8, 16);
    const fenMesh = new THREE.Mesh(fenGeo, pivotMat);
    fenMesh.position.set(fX, (targetBridgeY + 1.8) * 0.5, fZ);
    swingGroup.add(fenMesh);
    disposables.push(fenGeo);
  }

  // 2. Continuous 122.7m steel truss swing span girders (Dầm thép định hình màu xanh hai bên nhịp quay)
  const swingHalfLen = 61.5;
  const halfDeckW = road.width * 0.52;

  for (const side of [-1, 1]) {
    const gStartX = midX - uX * swingHalfLen + vX * (halfDeckW * side);
    const gStartZ = midZ - uZ * swingHalfLen + vZ * (halfDeckW * side);
    const gEndX = midX + uX * swingHalfLen + vX * (halfDeckW * side);
    const gEndZ = midZ + uZ * swingHalfLen + vZ * (halfDeckW * side);

    const girderGeo = new THREE.BoxGeometry(1.2, 2.2, swingHalfLen * 2);
    girderGeo.rotateY(Math.atan2(uX, uZ));
    const girderMesh = new THREE.Mesh(girderGeo, steelTrussMat);
    girderMesh.position.set((gStartX + gEndX) * 0.5, targetBridgeY + 0.4, (gStartZ + gEndZ) * 0.5);
    girderMesh.castShadow = true;
    swingGroup.add(girderMesh);
    disposables.push(girderGeo);
  }

  // 3. Central Steel A-Frame Pylon Tower (Tháp thép hình chữ A vươn cao 32m)
  const towerH = 32;
  const legBaseOffset = halfDeckW + 1.0; // Bases placed cleanly outside roadway lanes!
  const pylonApex = new THREE.Vector3(midX, targetBridgeY + towerH, midZ);

  // The 2 inclined legs rising from the deck to the apex
  for (const side of [-1, 1]) {
    const legBase = new THREE.Vector3(
      midX + vX * (legBaseOffset * side),
      targetBridgeY,
      midZ + vZ * (legBaseOffset * side)
    );
    const legVec = new THREE.Vector3().subVectors(pylonApex, legBase);
    const legLen = legVec.length();

    const legGeo = new THREE.CylinderGeometry(0.85, 1.45, legLen, 12);
    const legMesh = new THREE.Mesh(legGeo, towerMat);
    legMesh.position.copy(legBase).addScaledVector(legVec, 0.5);
    legMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), legVec.clone().normalize());
    legMesh.castShadow = true;
    swingGroup.add(legMesh);
    disposables.push(legGeo);
  }

  // Horizontal and diagonal cross struts between the 2 pylon legs
  for (const hRatio of [0.45, 0.78]) {
    const crossY = targetBridgeY + towerH * hRatio;
    const spanW = legBaseOffset * 2 * (1 - hRatio * 0.88);
    const crossGeo = new THREE.BoxGeometry(spanW, 1.2, 1.4);
    crossGeo.rotateY(Math.atan2(vX, vZ));
    const crossMesh = new THREE.Mesh(crossGeo, towerMat);
    crossMesh.position.set(midX, crossY, midZ);
    swingGroup.add(crossMesh);
    disposables.push(crossGeo);
  }

  // Apex diamond cap & aircraft warning beacon
  const capGeo = new THREE.OctahedronGeometry(2.2);
  const capMesh = new THREE.Mesh(capGeo, towerMat);
  capMesh.position.copy(pylonApex).add(new THREE.Vector3(0, 1.2, 0));
  swingGroup.add(capMesh);
  disposables.push(capGeo);

  const beaconGeo = new THREE.SphereGeometry(0.65, 8, 8);
  const beaconMesh = new THREE.Mesh(beaconGeo, beaconMat);
  beaconMesh.position.copy(pylonApex).add(new THREE.Vector3(0, 3.2, 0));
  swingGroup.add(beaconMesh);
  disposables.push(beaconGeo);

  // 4. Stay Cables (2 planes of 12 radiating cables = 24 cables on each side)
  const cableDistances = [10, 17, 25, 34, 43, 52, 60];

  for (let idx = 0; idx < cableDistances.length; idx++) {
    const dist = cableDistances[idx];
    const topRatio = 0.55 + (idx / cableDistances.length) * 0.42;
    const topY = targetBridgeY + towerH * topRatio;

    for (const dir of [-1, 1]) { // +u (East) and -u (West) along the swing span
      const deckX = midX + uX * (dist * dir);
      const deckZ = midZ + uZ * (dist * dir);

      for (const side of [-1, 1]) { // Left and right cable planes
        const topPt = new THREE.Vector3(
          midX + vX * (legBaseOffset * (1 - topRatio * 0.85) * side),
          topY,
          midZ + vZ * (legBaseOffset * (1 - topRatio * 0.85) * side)
        );
        const botPt = new THREE.Vector3(
          deckX + vX * (halfDeckW * side),
          targetBridgeY + 0.6,
          deckZ + vZ * (halfDeckW * side)
        );

        const cVec = new THREE.Vector3().subVectors(botPt, topPt);
        const cLen = cVec.length();

        const cableGeo = new THREE.CylinderGeometry(0.12, 0.12, cLen, 5);
        const cableMesh = new THREE.Mesh(cableGeo, stayCableMat);
        cableMesh.position.copy(topPt).addScaledVector(cVec, 0.5);
        cableMesh.quaternion.setFromUnitVectors(
          new THREE.Vector3(0, 1, 0),
          cVec.clone().normalize()
        );
        swingGroup.add(cableMesh);
        disposables.push(cableGeo);
      }
    }
  }

  // 5. River approach piers (Trụ cầu các nhịp dẫn)
  for (const tPier of [0.14, 0.28, 0.72, 0.86]) {
    const px = pStart[0] + bDx * tPier;
    const pz = pStart[1] + bDz * tPier;
    const pGeo = new THREE.CylinderGeometry(
      road.width * 0.36,
      road.width * 0.42,
      targetBridgeY + 1.0,
      16
    );
    pGeo.scale(1.0, 1.0, 0.45);
    pGeo.rotateY(Math.atan2(vX, vZ));
    const pMesh = new THREE.Mesh(pGeo, pivotMat);
    pMesh.position.set(px, (targetBridgeY + 1.0) * 0.5, pz);
    pMesh.castShadow = true;
    swingGroup.add(pMesh);
    disposables.push(pGeo);
  }

  rootGroup.add(swingGroup);
}

// 3. CẦU TRẦN THỊ LÝ (INCLINED SAIL PYLON CABLE-STAYED BRIDGE)
function buildTranThiLyBridge3D(
  rootGroup: THREE.Group,
  road: RoadFeature,
  targetBridgeY: number,
  disposables: { dispose: () => void }[],
  isDay: boolean,
  clipPlanes: THREE.Plane[]
) {
  const pStart = road.points[0];
  const pEnd = road.points[road.points.length - 1];
  const bDx = pEnd[0] - pStart[0];
  const bDz = pEnd[1] - pStart[1];
  const bLen = Math.hypot(bDx, bDz) || 1;
  const nx = -bDz / bLen;
  const nz = bDx / bLen;

  const bridgeGroup = new THREE.Group();
  bridgeGroup.name = 'tran-thi-ly-sail-bridge';

  const pylonMat = new THREE.MeshStandardMaterial({
    color: '#fb923c',
    roughness: 0.28,
    metalness: 0.6,
    clippingPlanes: clipPlanes,
  });
  const sailCableMat = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    roughness: 0.2,
    metalness: 0.8,
    clippingPlanes: clipPlanes,
  });
  disposables.push(pylonMat, sailCableMat);

  const pylonBaseT = 0.38;
  const pylonX = pStart[0] + bDx * pylonBaseT;
  const pylonZ = pStart[1] + bDz * pylonBaseT;
  const pylonH = 42;

  const pylonGeo = new THREE.CylinderGeometry(1.6, 2.6, pylonH, 12);
  const pylonMesh = new THREE.Mesh(pylonGeo, pylonMat);
  pylonMesh.position.set(pylonX - (bDx / bLen) * 4.5, targetBridgeY + pylonH * 0.48, pylonZ - (bDz / bLen) * 4.5);
  pylonMesh.quaternion.setFromAxisAngle(new THREE.Vector3(nx, 0, nz), 0.21);
  pylonMesh.castShadow = true;
  bridgeGroup.add(pylonMesh);
  disposables.push(pylonGeo);

  const pylonTop = new THREE.Vector3(
    pylonX - (bDx / bLen) * 9.0,
    targetBridgeY + pylonH,
    pylonZ - (bDz / bLen) * 9.0
  );

  const mainSpanLen = bLen * 0.48;

  for (let c = 1; c <= 16; c++) {
    const tDist = (c / 16) * mainSpanLen;
    const deckPt = new THREE.Vector3(
      pylonX + (bDx / bLen) * tDist,
      targetBridgeY,
      pylonZ + (bDz / bLen) * tDist
    );

    for (const offset of [-road.width * 0.42, 0, road.width * 0.42]) {
      const topPt = new THREE.Vector3(
        pylonTop.x,
        pylonTop.y - ((16 - c) / 16) * 11,
        pylonTop.z
      );
      const botPt = new THREE.Vector3(
        deckPt.x + nx * offset,
        deckPt.y,
        deckPt.z + nz * offset
      );
      const cVec = new THREE.Vector3().subVectors(botPt, topPt);
      const cLen = cVec.length();

      const cGeo = new THREE.CylinderGeometry(0.06, 0.06, cLen, 4);
      const cMesh = new THREE.Mesh(cGeo, sailCableMat);
      cMesh.position.copy(topPt).addScaledVector(cVec, 0.5);
      cMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), cVec.normalize());
      bridgeGroup.add(cMesh);
      disposables.push(cGeo);
    }
  }

  rootGroup.add(bridgeGroup);
}

// 4. CẦU THUẬN PHƯỚC (SUSPENSION BRIDGE)
function buildThuanPhuocBridge3D(
  rootGroup: THREE.Group,
  road: RoadFeature,
  targetBridgeY: number,
  disposables: { dispose: () => void }[],
  isDay: boolean,
  clipPlanes: THREE.Plane[]
) {
  const pStart = road.points[0];
  const pEnd = road.points[road.points.length - 1];
  const bDx = pEnd[0] - pStart[0];
  const bDz = pEnd[1] - pStart[1];
  const bLen = Math.hypot(bDx, bDz) || 1;
  const nx = -bDz / bLen;
  const nz = bDx / bLen;

  const suspGroup = new THREE.Group();
  suspGroup.name = 'thuan-phuoc-suspension-bridge';

  const towerMat = new THREE.MeshStandardMaterial({
    color: '#e2e8f0',
    roughness: 0.4,
    metalness: 0.6,
    clippingPlanes: clipPlanes,
  });
  const mainCableMat = new THREE.MeshStandardMaterial({
    color: '#38bdf8',
    roughness: 0.25,
    metalness: 0.8,
    clippingPlanes: clipPlanes,
  });
  disposables.push(towerMat, mainCableMat);

  const t1 = 0.26;
  const t2 = 0.74;
  const towerH = 34;
  const halfGap = road.width * 0.44;

  for (const t of [t1, t2]) {
    const tx = pStart[0] + bDx * t;
    const tz = pStart[1] + bDz * t;

    for (const side of [-halfGap, halfGap]) {
      const colGeo = new THREE.BoxGeometry(2.0, towerH, 2.0);
      const colMesh = new THREE.Mesh(colGeo, towerMat);
      colMesh.position.set(tx + nx * side, targetBridgeY + towerH * 0.5, tz + nz * side);
      colMesh.castShadow = true;
      suspGroup.add(colMesh);
      disposables.push(colGeo);
    }

    for (const hRatio of [0.55, 0.95]) {
      const beamGeo = new THREE.BoxGeometry(halfGap * 2 + 2, 1.4, 1.6);
      beamGeo.rotateY(Math.atan2(bDx, bDz));
      const beamMesh = new THREE.Mesh(beamGeo, towerMat);
      beamMesh.position.set(tx, targetBridgeY + towerH * hRatio, tz);
      suspGroup.add(beamMesh);
      disposables.push(beamGeo);
    }
  }

  for (const side of [-halfGap, halfGap]) {
    const cablePts: THREE.Vector3[] = [];
    const steps = 60;
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const px = pStart[0] + bDx * t + nx * side;
      const pz = pStart[1] + bDz * t + nz * side;
      let py = targetBridgeY + 2.5;

      if (t < t1) {
        py = targetBridgeY + (towerH - 1) * (t / t1);
      } else if (t > t2) {
        py = targetBridgeY + (towerH - 1) * ((1 - t) / (1 - t2));
      } else {
        const midT = (t - t1) / (t2 - t1);
        const sag = 4 * midT * (1 - midT);
        py = targetBridgeY + towerH - sag * (towerH - 3.5);
      }
      cablePts.push(new THREE.Vector3(px, py, pz));

      if (s % 3 === 0 && t > 0.05 && t < 0.95) {
        const suspLen = py - targetBridgeY;
        if (suspLen > 1.0) {
          const suspGeo = new THREE.CylinderGeometry(0.04, 0.04, suspLen, 4);
          const suspMesh = new THREE.Mesh(suspGeo, mainCableMat);
          suspMesh.position.set(px, targetBridgeY + suspLen * 0.5, pz);
          suspGroup.add(suspMesh);
          disposables.push(suspGeo);
        }
      }
    }

    const curve = new THREE.CatmullRomCurve3(cablePts);
    const mainCableGeo = new THREE.TubeGeometry(curve, 60, 0.35, 8, false);
    const mainCableMesh = new THREE.Mesh(mainCableGeo, mainCableMat);
    suspGroup.add(mainCableMesh);
    disposables.push(mainCableGeo);
  }

  rootGroup.add(suspGroup);
}

// ==========================================
// 3D ICONIC LANDMARKS OF VIETNAM & ĐÀ NẴNG
// ==========================================

// 1. TRUNG TÂM HÀNH CHÍNH ĐÀ NẴNG (TÒA NHÀ "TRÁI BẮP" / NGỌN HẢI ĐĂNG - 167m, 34 tầng)
function buildDaNangAdminCenter3D(
  rootGroup: THREE.Group,
  b: BuildingFeature,
  cx: number,
  cz: number,
  disposables: { dispose: () => void }[],
  isDay: boolean,
  clipPlanes: THREE.Plane[],
  buildingMeshes: THREE.Mesh[]
) {
  const adminGroup = new THREE.Group();
  adminGroup.name = 'danang-admin-center';

  const glassMat = new THREE.MeshStandardMaterial({
    color: '#0284c7',
    emissive: isDay ? '#0369a1' : '#38bdf8',
    emissiveIntensity: isDay ? 0.22 : 0.75,
    roughness: 0.12,
    metalness: 0.45,
    clippingPlanes: clipPlanes,
  });
  const steelRibMat = new THREE.MeshStandardMaterial({
    color: '#f8fafc',
    roughness: 0.3,
    metalness: 0.8,
    clippingPlanes: clipPlanes,
  });
  const podiumMat = new THREE.MeshStandardMaterial({
    color: isDay ? '#cbd5e1' : '#334155',
    roughness: 0.65,
    clippingPlanes: clipPlanes,
  });
  const beaconMat = new THREE.MeshBasicMaterial({ color: '#ef4444' });
  disposables.push(glassMat, steelRibMat, podiumMat, beaconMat);

  // Circular flared entrance plaza & glass podium
  const podGeo = new THREE.CylinderGeometry(26, 30, 8.5, 32);
  const podMesh = new THREE.Mesh(podGeo, podiumMat);
  podMesh.position.set(cx, 4.25, cz);
  podMesh.castShadow = true;
  podMesh.receiveShadow = true;
  podMesh.userData = { kind: 'building', building: b };
  buildingMeshes.push(podMesh);
  adminGroup.add(podMesh);
  disposables.push(podGeo);

  // 4 Stepped Tapering Concentric Glass Cylindrical Drums (The iconic "Corn Cob" / "Trái bắp" silhouette)
  const drums = [
    { rBot: 18.5, rTop: 18.2, y1: 8.5, h: 42 },
    { rBot: 18.0, rTop: 16.5, y1: 50.5, h: 42 },
    { rBot: 16.2, rTop: 14.0, y1: 92.5, h: 36 },
    { rBot: 13.8, rTop: 10.5, y1: 128.5, h: 26 },
  ];

  for (const drum of drums) {
    const dGeo = new THREE.CylinderGeometry(drum.rTop, drum.rBot, drum.h, 32);
    const dMesh = new THREE.Mesh(dGeo, glassMat);
    dMesh.position.set(cx, drum.y1 + drum.h * 0.5, cz);
    dMesh.castShadow = true;
    dMesh.receiveShadow = true;
    dMesh.userData = { kind: 'building', building: b };
    buildingMeshes.push(dMesh);
    adminGroup.add(dMesh);
    disposables.push(dGeo);

    // Horizontal architectural rings between tiers
    const ringGeo = new THREE.TorusGeometry(drum.rBot + 0.35, 0.45, 8, 32);
    ringGeo.rotateX(Math.PI / 2);
    const ringMesh = new THREE.Mesh(ringGeo, steelRibMat);
    ringMesh.position.set(cx, drum.y1, cz);
    adminGroup.add(ringMesh);
    disposables.push(ringGeo);
  }

  // 16 Vertical Aerodynamic Curved Spaceframe Steel Ribs
  for (let i = 0; i < 16; i++) {
    const angle = (i / 16) * Math.PI * 2;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const ribPts: THREE.Vector3[] = [];
    ribPts.push(new THREE.Vector3(cx + cos * 20.5, 8.5, cz + sin * 20.5));
    ribPts.push(new THREE.Vector3(cx + cos * 19.8, 50.5, cz + sin * 19.8));
    ribPts.push(new THREE.Vector3(cx + cos * 17.5, 92.5, cz + sin * 17.5));
    ribPts.push(new THREE.Vector3(cx + cos * 14.5, 128.5, cz + sin * 14.5));
    ribPts.push(new THREE.Vector3(cx + cos * 10.8, 154.5, cz + sin * 10.8));

    const ribCurve = new THREE.CatmullRomCurve3(ribPts);
    const ribGeo = new THREE.TubeGeometry(ribCurve, 28, 0.38, 6, false);
    const ribMesh = new THREE.Mesh(ribGeo, steelRibMat);
    adminGroup.add(ribMesh);
    disposables.push(ribGeo);
  }

  // Crown Glass Dome
  const domeGeo = new THREE.SphereGeometry(10.5, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.48);
  const domeMesh = new THREE.Mesh(domeGeo, glassMat);
  domeMesh.position.set(cx, 154.5, cz);
  adminGroup.add(domeMesh);
  disposables.push(domeGeo);

  // Central Antenna Spire reaching 167m + Blinking Red Aircraft Warning Beacon
  const spireGeo = new THREE.CylinderGeometry(0.3, 1.2, 16, 8);
  const spireMesh = new THREE.Mesh(spireGeo, steelRibMat);
  spireMesh.position.set(cx, 162.5, cz);
  adminGroup.add(spireMesh);
  disposables.push(spireGeo);

  const beaconGeo = new THREE.SphereGeometry(0.65, 8, 8);
  const beaconMesh = new THREE.Mesh(beaconGeo, beaconMat);
  beaconMesh.position.set(cx, 171, cz);
  adminGroup.add(beaconMesh);
  disposables.push(beaconGeo);

  rootGroup.add(adminGroup);
}

// 2. KHÁCH SẠN NOVOTEL DANANG PREMIER HAN RIVER (155m, 37 tầng + Sky36 Lounge)
function buildNovotelDanang3D(
  rootGroup: THREE.Group,
  b: BuildingFeature,
  cx: number,
  cz: number,
  disposables: { dispose: () => void }[],
  isDay: boolean,
  clipPlanes: THREE.Plane[],
  buildingMeshes: THREE.Mesh[],
  facades: FacadeTextureSet
) {
  const novoGroup = new THREE.Group();
  novoGroup.name = 'novotel-danang-premier';

  const azureMat = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    map: facades.towerGlassAzureTex,
    roughness: 0.28,
    metalness: 0.10,
    emissive: isDay ? new THREE.Color('#0284c7') : new THREE.Color('#38bdf8'),
    emissiveIntensity: isDay ? 0.25 : 0.85,
    clippingPlanes: clipPlanes,
  });
  const capMat = new THREE.MeshStandardMaterial({
    color: '#f8fafc',
    roughness: 0.4,
    metalness: 0.6,
    clippingPlanes: clipPlanes,
  });
  const woodDeckMat = new THREE.MeshStandardMaterial({
    color: '#78350f',
    roughness: 0.7,
    clippingPlanes: clipPlanes,
  });
  const poolWaterMat = new THREE.MeshStandardMaterial({
    color: '#06b6d4',
    emissive: '#0891b2',
    emissiveIntensity: 0.35,
    roughness: 0.08,
    metalness: 0.8,
    clippingPlanes: clipPlanes,
  });
  disposables.push(azureMat, capMat, woodDeckMat, poolWaterMat);

  // Stepped 37-story vertical rectilinear glass skyscraper (155m)
  const mainH = 138;
  const bGeo = new THREE.BoxGeometry(26, mainH, 24);
  applyCleanArchitecturalUVs(bGeo, 16);
  const bMesh = new THREE.Mesh(bGeo, [azureMat, azureMat, capMat, capMat, azureMat, azureMat]);
  bMesh.position.set(cx, mainH * 0.5, cz);
  bMesh.castShadow = true;
  bMesh.receiveShadow = true;
  bMesh.userData = { kind: 'building', building: b };
  buildingMeshes.push(bMesh);
  novoGroup.add(bMesh);
  disposables.push(bGeo);

  // Stepped Sky Lounge & Penthouse (Floors 34-37)
  const skyH = 17;
  const skyGeo = new THREE.BoxGeometry(22, skyH, 20);
  applyCleanArchitecturalUVs(skyGeo, 14);
  const skyMesh = new THREE.Mesh(skyGeo, [azureMat, azureMat, capMat, capMat, azureMat, azureMat]);
  skyMesh.position.set(cx, mainH + skyH * 0.5, cz);
  skyMesh.castShadow = true;
  skyMesh.receiveShadow = true;
  skyMesh.userData = { kind: 'building', building: b };
  buildingMeshes.push(skyMesh);
  novoGroup.add(skyMesh);
  disposables.push(skyGeo);

  // Sky36 Rooftop Lounge Pavilion & Infinity Pool Deck
  const deckGeo = new THREE.BoxGeometry(19, 0.4, 17);
  const deckMesh = new THREE.Mesh(deckGeo, woodDeckMat);
  deckMesh.position.set(cx, mainH + skyH + 0.2, cz);
  novoGroup.add(deckMesh);
  disposables.push(deckGeo);

  const poolGeo = new THREE.BoxGeometry(12, 0.25, 6.5);
  const poolMesh = new THREE.Mesh(poolGeo, poolWaterMat);
  poolMesh.position.set(cx, mainH + skyH + 0.35, cz + 3.5);
  novoGroup.add(poolMesh);
  disposables.push(poolGeo);

  // Illuminated Rooftop Crown Pergola Canopy
  const crownGeo = new THREE.BoxGeometry(20, 2.5, 18);
  const crownMesh = new THREE.Mesh(crownGeo, capMat);
  crownMesh.position.set(cx, mainH + skyH + 3.5, cz);
  novoGroup.add(crownMesh);
  disposables.push(crownGeo);

  // Telecom Spire with aircraft warning beacon (reaching 162m)
  const spireGeo = new THREE.CylinderGeometry(0.2, 0.8, 12, 6);
  const spireMesh = new THREE.Mesh(spireGeo, capMat);
  spireMesh.position.set(cx, mainH + skyH + 10, cz);
  novoGroup.add(spireMesh);
  disposables.push(spireGeo);

  rootGroup.add(novoGroup);
}

// 3. TÒA NHÀ AZURA ĐÀ NẴNG (122m, 34 tầng - Tháp vòng cung uốn lượn ven Sông Hàn)
function buildAzuraTower3D(
  rootGroup: THREE.Group,
  b: BuildingFeature,
  cx: number,
  cz: number,
  disposables: { dispose: () => void }[],
  isDay: boolean,
  clipPlanes: THREE.Plane[],
  buildingMeshes: THREE.Mesh[],
  facades: FacadeTextureSet
) {
  const azuraGroup = new THREE.Group();
  azuraGroup.name = 'azura-tower-danang';

  const arcGlassMat = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    map: facades.towerGlassAzureTex,
    roughness: 0.28,
    metalness: 0.10,
    emissive: isDay ? new THREE.Color('#0284c7') : new THREE.Color('#38bdf8'),
    emissiveIntensity: isDay ? 0.25 : 0.85,
    clippingPlanes: clipPlanes,
  });
  const spandrelWhiteMat = new THREE.MeshStandardMaterial({
    color: '#f8fafc',
    roughness: 0.45,
    metalness: 0.1,
    clippingPlanes: clipPlanes,
  });
  disposables.push(arcGlassMat, spandrelWhiteMat);

  // 34-story sweeping aerodynamic crescent / arc profile (Foster + Partners design)
  const totalH = 122;
  const arcShape = new THREE.Shape();
  // Draw an aerodynamic curved crescent footprint overlooking the river
  arcShape.moveTo(-16, -11);
  arcShape.quadraticCurveTo(0, -14, 16, -11);
  arcShape.quadraticCurveTo(18, 0, 15, 12);
  arcShape.quadraticCurveTo(0, 16, -15, 12);
  arcShape.quadraticCurveTo(-18, 0, -16, -11);

  const extrudeGeo = new THREE.ExtrudeGeometry(arcShape, {
    depth: totalH,
    bevelEnabled: false,
  });
  extrudeGeo.rotateX(-Math.PI / 2);
  applyCleanArchitecturalUVs(extrudeGeo, 16);

  const mesh = new THREE.Mesh(extrudeGeo, [spandrelWhiteMat, arcGlassMat]);
  mesh.position.set(cx, 0, cz);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData = { kind: 'building', building: b };
  buildingMeshes.push(mesh);
  azuraGroup.add(mesh);
  disposables.push(extrudeGeo);

  // Curved wrap-around white balcony bands every 4 stories
  for (let fl = 4; fl <= 34; fl += 4) {
    const by = fl * 3.5;
    const bandGeo = new THREE.ExtrudeGeometry(arcShape, {
      depth: 0.8,
      bevelEnabled: true,
      bevelThickness: 0.3,
      bevelSize: 0.6,
      bevelSegments: 1,
    });
    bandGeo.rotateX(-Math.PI / 2);
    const bandMesh = new THREE.Mesh(bandGeo, spandrelWhiteMat);
    bandMesh.position.set(cx, by, cz);
    azuraGroup.add(bandMesh);
    disposables.push(bandGeo);
  }

  // Illuminated Rooftop Architectural Crown Cap
  const crownGeo = new THREE.ExtrudeGeometry(arcShape, {
    depth: 3.2,
    bevelEnabled: true,
    bevelThickness: 0.45,
    bevelSize: -0.4,
    bevelSegments: 1,
  });
  crownGeo.rotateX(-Math.PI / 2);
  const crownMesh = new THREE.Mesh(crownGeo, spandrelWhiteMat);
  crownMesh.position.set(cx, totalH, cz);
  azuraGroup.add(crownMesh);
  disposables.push(crownGeo);

  // Spire beacon
  const spireGeo = new THREE.CylinderGeometry(0.15, 0.4, 8, 6);
  const spireMesh = new THREE.Mesh(spireGeo, spandrelWhiteMat);
  spireMesh.position.set(cx, totalH + 4, cz);
  azuraGroup.add(spireMesh);
  disposables.push(spireGeo);

  rootGroup.add(azuraGroup);
}

// 4. INDOCHINA RIVERSIDE TOWERS (Twin Glass Towers with 4-story shopping atrium)
function buildIndochinaRiverside3D(
  rootGroup: THREE.Group,
  b: BuildingFeature,
  cx: number,
  cz: number,
  disposables: { dispose: () => void }[],
  isDay: boolean,
  clipPlanes: THREE.Plane[],
  buildingMeshes: THREE.Mesh[],
  facades: FacadeTextureSet
) {
  const indoGroup = new THREE.Group();
  indoGroup.name = 'indochina-riverside-towers';

  const towerMat = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    map: facades.towerRibbonTex,
    roughness: 0.48,
    metalness: 0.08,
    clippingPlanes: clipPlanes,
  });
  const mallMat = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    map: facades.towerGlassTealTex,
    roughness: 0.3,
    metalness: 0.1,
    emissive: isDay ? new THREE.Color('#0e4860') : new THREE.Color('#38bdf8'),
    emissiveIntensity: isDay ? 0.22 : 0.8,
    clippingPlanes: clipPlanes,
  });
  const capMat = new THREE.MeshStandardMaterial({
    color: '#475569',
    roughness: 0.6,
    clippingPlanes: clipPlanes,
  });
  disposables.push(towerMat, mallMat, capMat);

  // 4-story retail shopping podium base (16m tall)
  const podGeo = new THREE.BoxGeometry(44, 16, 32);
  applyCleanArchitecturalUVs(podGeo, 12);
  const podMesh = new THREE.Mesh(podGeo, [mallMat, mallMat, capMat, capMat, mallMat, mallMat]);
  podMesh.position.set(cx, 8, cz);
  podMesh.castShadow = true;
  podMesh.receiveShadow = true;
  podMesh.userData = { kind: 'building', building: b };
  buildingMeshes.push(podMesh);
  indoGroup.add(podMesh);
  disposables.push(podGeo);

  // Twin 25-story towers (North Tower A and South Tower B, 95m tall)
  const towerH = 79;
  for (const xOff of [-12.5, 12.5]) {
    const tGeo = new THREE.BoxGeometry(15, towerH, 24);
    applyCleanArchitecturalUVs(tGeo, 16);
    const tMesh = new THREE.Mesh(tGeo, [towerMat, towerMat, capMat, capMat, towerMat, towerMat]);
    tMesh.position.set(cx + xOff, 16 + towerH * 0.5, cz);
    tMesh.castShadow = true;
    tMesh.receiveShadow = true;
    tMesh.userData = { kind: 'building', building: b };
    buildingMeshes.push(tMesh);
    indoGroup.add(tMesh);
    disposables.push(tGeo);
  }

  rootGroup.add(indoGroup);
}

// 5. TƯỢNG CÁ CHÉP HÓA RỒNG & CẦU TÌNH YÊU ĐÀ NẴNG
function buildDragonCarpAndLoveBridge3D(
  rootGroup: THREE.Group,
  b: BuildingFeature,
  cx: number,
  cz: number,
  disposables: { dispose: () => void }[],
  isDay: boolean,
  clipPlanes: THREE.Plane[],
  buildingMeshes: THREE.Mesh[]
) {
  const dcGroup = new THREE.Group();
  dcGroup.name = 'dragon-carp-and-love-bridge';

  const marbleMat = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    roughness: 0.25,
    metalness: 0.1,
    clippingPlanes: clipPlanes,
  });
  const graniteMat = new THREE.MeshStandardMaterial({
    color: isDay ? '#475569' : '#1e293b',
    roughness: 0.8,
    clippingPlanes: clipPlanes,
  });
  const woodDeckMat = new THREE.MeshStandardMaterial({
    color: '#78350f',
    roughness: 0.75,
    clippingPlanes: clipPlanes,
  });
  const redHeartMat = new THREE.MeshBasicMaterial({
    color: '#ef4444',
  });
  const waterSprayMat = new THREE.MeshBasicMaterial({
    color: '#bae6fd',
    transparent: true,
    opacity: 0.85,
  });
  disposables.push(marbleMat, graniteMat, woodDeckMat, redHeartMat, waterSprayMat);

  // Multi-tier granite pedestal on riverbank
  const baseGeo = new THREE.BoxGeometry(10, 2.8, 10);
  const baseMesh = new THREE.Mesh(baseGeo, graniteMat);
  baseMesh.position.set(cx, 1.4, cz);
  baseMesh.castShadow = true;
  baseMesh.receiveShadow = true;
  baseMesh.userData = { kind: 'building', building: b };
  buildingMeshes.push(baseMesh);
  dcGroup.add(baseMesh);
  disposables.push(baseGeo);

  // Sculpted White Marble Dragon-Carp Statue (7.5m tall with curved dragon body & head)
  const bodyPts: THREE.Vector3[] = [
    new THREE.Vector3(cx, 2.8, cz),
    new THREE.Vector3(cx - 0.8, 5.5, cz),
    new THREE.Vector3(cx - 0.2, 8.2, cz),
    new THREE.Vector3(cx + 1.2, 9.8, cz),
  ];
  const bodyCurve = new THREE.CatmullRomCurve3(bodyPts);
  const bodyGeo = new THREE.TubeGeometry(bodyCurve, 24, 1.4, 12, false);
  const bodyMesh = new THREE.Mesh(bodyGeo, marbleMat);
  bodyMesh.castShadow = true;
  dcGroup.add(bodyMesh);
  disposables.push(bodyGeo);

  // Dragon Head with crown horns
  const headGeo = new THREE.ConeGeometry(1.6, 3.2, 10);
  headGeo.rotateZ(-Math.PI * 0.35);
  const headMesh = new THREE.Mesh(headGeo, marbleMat);
  headMesh.position.set(cx + 2.2, 10.2, cz);
  headMesh.castShadow = true;
  dcGroup.add(headMesh);
  disposables.push(headGeo);

  // Parabolic water jet spraying from the dragon mouth out into Han River!
  const jetPts: THREE.Vector3[] = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    const jx = cx + 3.2 + t * 14;
    const jy = 10.4 + 2.5 * Math.sin(t * Math.PI) - t * 9.8;
    jetPts.push(new THREE.Vector3(jx, Math.max(0.3, jy), cz));
  }
  const jetCurve = new THREE.CatmullRomCurve3(jetPts);
  const jetGeo = new THREE.TubeGeometry(jetCurve, 24, 0.22, 6, false);
  const jetMesh = new THREE.Mesh(jetGeo, waterSprayMat);
  dcGroup.add(jetMesh);
  disposables.push(jetGeo);

  // Cầu Tình Yêu (Love Bridge wooden boardwalk extending into the river with heart lanterns)
  const pierGeo = new THREE.BoxGeometry(22, 0.4, 4.5);
  const pierMesh = new THREE.Mesh(pierGeo, woodDeckMat);
  pierMesh.position.set(cx + 6, 1.6, cz + 10);
  pierMesh.castShadow = true;
  dcGroup.add(pierMesh);
  disposables.push(pierGeo);

  // Red heart-shaped lantern poles along Love Bridge
  for (let d = -8; d <= 8; d += 4) {
    const poleGeo = new THREE.CylinderGeometry(0.08, 0.08, 3.5, 6);
    const poleMesh = new THREE.Mesh(poleGeo, graniteMat);
    poleMesh.position.set(cx + 6 + d, 3.35, cz + 12);
    dcGroup.add(poleMesh);

    const heartGeo = new THREE.OctahedronGeometry(0.55);
    const heartMesh = new THREE.Mesh(heartGeo, redHeartMat);
    heartMesh.position.set(cx + 6 + d, 5.2, cz + 12);
    dcGroup.add(heartMesh);
    disposables.push(poleGeo, heartGeo);
  }

  rootGroup.add(dcGroup);
}

// 6. NHÀ THỜ CHÍNH TÒA ĐÀ NẴNG (NHÀ THỜ CON GÀ - 70m Gothic Cathedral hồng phấn)
function buildPinkCathedral3D(
  rootGroup: THREE.Group,
  b: BuildingFeature,
  cx: number,
  cz: number,
  disposables: { dispose: () => void }[],
  isDay: boolean,
  clipPlanes: THREE.Plane[],
  buildingMeshes: THREE.Mesh[]
) {
  const catGroup = new THREE.Group();
  catGroup.name = 'danang-pink-cathedral';

  const pinkMat = new THREE.MeshStandardMaterial({
    color: '#f472b6',
    roughness: 0.72,
    metalness: 0.04,
    clippingPlanes: clipPlanes,
  });
  const roofPinkMat = new THREE.MeshStandardMaterial({
    color: '#db2777',
    roughness: 0.55,
    clippingPlanes: clipPlanes,
  });
  const crossMat = new THREE.MeshStandardMaterial({
    color: '#facc15',
    metalness: 0.85,
    roughness: 0.2,
    clippingPlanes: clipPlanes,
  });
  disposables.push(pinkMat, roofPinkMat, crossMat);

  // Main Cathedral Nave (Thân nhà thờ 3 gian)
  const naveGeo = new THREE.BoxGeometry(32, 18, 16);
  const naveMesh = new THREE.Mesh(naveGeo, pinkMat);
  naveMesh.position.set(cx, 9, cz);
  naveMesh.castShadow = true;
  naveMesh.receiveShadow = true;
  naveMesh.userData = { kind: 'building', building: b };
  buildingMeshes.push(naveMesh);
  catGroup.add(naveMesh);
  disposables.push(naveGeo);

  // Sloped Gothic Roof
  const roofGeo = new THREE.ConeGeometry(13, 8, 4);
  roofGeo.rotateY(Math.PI / 4);
  roofGeo.scale(1.3, 1.0, 0.7);
  const roofMesh = new THREE.Mesh(roofGeo, roofPinkMat);
  roofMesh.position.set(cx, 22, cz);
  roofMesh.castShadow = true;
  catGroup.add(roofMesh);
  disposables.push(roofGeo);

  // Iconic Bell Tower with 70m Spire & Weathercock (Tháp chuông Nhà thờ Con Gà)
  const towerGeo = new THREE.BoxGeometry(7, 44, 7);
  const towerMesh = new THREE.Mesh(towerGeo, pinkMat);
  towerMesh.position.set(cx - 15, 22, cz);
  towerMesh.castShadow = true;
  catGroup.add(towerMesh);
  disposables.push(towerGeo);

  // Steep Gothic Spire
  const spireGeo = new THREE.ConeGeometry(4.2, 24, 8);
  const spireMesh = new THREE.Mesh(spireGeo, roofPinkMat);
  spireMesh.position.set(cx - 15, 56, cz);
  spireMesh.castShadow = true;
  catGroup.add(spireMesh);
  disposables.push(spireGeo);

  // The Weathercock (Tượng con gà bằng hợp kim màu đồng trên đỉnh tháp chuông)
  const cockGeo = new THREE.ConeGeometry(0.8, 1.6, 6);
  cockGeo.rotateZ(Math.PI / 2);
  const cockMesh = new THREE.Mesh(cockGeo, crossMat);
  cockMesh.position.set(cx - 15, 69, cz);
  catGroup.add(cockMesh);
  disposables.push(cockGeo);

  rootGroup.add(catGroup);
}

// 7. BITEXCO FINANCIAL TOWER (TP.HCM - 262m, 68 tầng + Sân đỗ trực thăng tầng 52)
function buildBitexcoTower3D(
  rootGroup: THREE.Group,
  b: BuildingFeature,
  cx: number,
  cz: number,
  disposables: { dispose: () => void }[],
  isDay: boolean,
  clipPlanes: THREE.Plane[],
  buildingMeshes: THREE.Mesh[],
  facades: FacadeTextureSet
) {
  const bitexGroup = new THREE.Group();
  bitexGroup.name = 'bitexco-financial-tower';

  const glassMat = new THREE.MeshStandardMaterial({
    color: '#0284c7',
    map: facades.towerGlassAzureTex,
    roughness: 0.16,
    metalness: 0.45,
    clippingPlanes: clipPlanes,
  });
  const helipadMat = new THREE.MeshStandardMaterial({
    color: '#334155',
    roughness: 0.7,
    clippingPlanes: clipPlanes,
  });
  const heliPadRingMat = new THREE.MeshBasicMaterial({ color: '#facc15' });
  const beaconMat = new THREE.MeshBasicMaterial({ color: '#ef4444' });
  disposables.push(glassMat, helipadMat, heliPadRingMat, beaconMat);

  // Lotus bud curving profile tapering up to 262m
  const drumH = 240;
  const bitexGeo = new THREE.CylinderGeometry(8.5, 20, drumH, 32);
  bitexGeo.scale(1.2, 1.0, 0.85); // Elliptical lotus bud footprint
  applyCleanArchitecturalUVs(bitexGeo, 16);
  const bitexMesh = new THREE.Mesh(bitexGeo, glassMat);
  bitexMesh.position.set(cx, drumH * 0.5, cz);
  bitexMesh.castShadow = true;
  bitexMesh.receiveShadow = true;
  bitexMesh.userData = { kind: 'building', building: b };
  buildingMeshes.push(bitexMesh);
  bitexGroup.add(bitexMesh);
  disposables.push(bitexGeo);

  // Cantilevered circular helipad on Floor 52 (height 191m) projecting outward 22m!
  const heliBeamGeo = new THREE.BoxGeometry(18, 2.2, 4);
  const heliBeamMesh = new THREE.Mesh(heliBeamGeo, helipadMat);
  heliBeamMesh.position.set(cx + 14, 191, cz);
  bitexGroup.add(heliBeamMesh);

  const heliGeo = new THREE.CylinderGeometry(10.5, 10.5, 0.8, 24);
  const heliMesh = new THREE.Mesh(heliGeo, helipadMat);
  heliMesh.position.set(cx + 22, 191.4, cz);
  bitexGroup.add(heliMesh);

  // Yellow landing ring & "H" mark
  const ringGeo = new THREE.RingGeometry(6.5, 7.5, 24);
  ringGeo.rotateX(-Math.PI / 2);
  const ringMesh = new THREE.Mesh(ringGeo, heliPadRingMat);
  ringMesh.position.set(cx + 22, 191.85, cz);
  bitexGroup.add(ringMesh);
  disposables.push(heliBeamGeo, heliGeo, ringGeo);

  // Angled slanted crown spire with aircraft beacon
  const spireGeo = new THREE.CylinderGeometry(0.3, 1.2, 22, 8);
  const spireMesh = new THREE.Mesh(spireGeo, glassMat);
  spireMesh.position.set(cx, drumH + 11, cz);
  bitexGroup.add(spireMesh);

  const beaconGeo = new THREE.SphereGeometry(0.7, 8, 8);
  const beaconMesh = new THREE.Mesh(beaconGeo, beaconMat);
  beaconMesh.position.set(cx, drumH + 22.5, cz);
  bitexGroup.add(beaconMesh);
  disposables.push(spireGeo, beaconGeo);

  rootGroup.add(bitexGroup);
}

// 8. THÁP RÙA HỒ GƯƠM (HÀ NỘI - 3 tầng cổ kính giữa Hồ Hoàn Kiếm)
function buildThapRua3D(
  rootGroup: THREE.Group,
  b: BuildingFeature,
  cx: number,
  cz: number,
  disposables: { dispose: () => void }[],
  isDay: boolean,
  clipPlanes: THREE.Plane[],
  buildingMeshes: THREE.Mesh[]
) {
  const ruaGroup = new THREE.Group();
  ruaGroup.name = 'thap-rua-ho-guom';

  const stoneMat = new THREE.MeshStandardMaterial({
    color: '#cbd5e1',
    roughness: 0.85,
    clippingPlanes: clipPlanes,
  });
  const tileRoofMat = new THREE.MeshStandardMaterial({
    color: '#b91c1c',
    roughness: 0.65,
    clippingPlanes: clipPlanes,
  });
  const islandMat = new THREE.MeshStandardMaterial({
    color: isDay ? '#4ade80' : '#14532d',
    roughness: 0.9,
    clippingPlanes: clipPlanes,
  });
  disposables.push(stoneMat, tileRoofMat, islandMat);

  // Grassy islet in Hoàn Kiếm Lake
  const islandGeo = new THREE.CylinderGeometry(14, 18, 1.2, 24);
  const islandMesh = new THREE.Mesh(islandGeo, islandMat);
  islandMesh.position.set(cx, 0.6, cz);
  ruaGroup.add(islandMesh);
  disposables.push(islandGeo);

  // Tier 1 (Tầng 1 - 3 vòm cửa)
  const t1Geo = new THREE.BoxGeometry(9.5, 4.2, 6.8);
  const t1Mesh = new THREE.Mesh(t1Geo, stoneMat);
  t1Mesh.position.set(cx, 3.3, cz);
  t1Mesh.castShadow = true;
  t1Mesh.userData = { kind: 'building', building: b };
  buildingMeshes.push(t1Mesh);
  ruaGroup.add(t1Mesh);
  disposables.push(t1Geo);

  // Tier 2 (Tầng 2)
  const t2Geo = new THREE.BoxGeometry(7.2, 3.6, 5.0);
  const t2Mesh = new THREE.Mesh(t2Geo, stoneMat);
  t2Mesh.position.set(cx, 7.2, cz);
  t2Mesh.castShadow = true;
  ruaGroup.add(t2Mesh);
  disposables.push(t2Geo);

  // Tier 3 & Curved Tile Roof (Tầng 3 với mái cong)
  const t3Geo = new THREE.BoxGeometry(4.8, 2.6, 3.5);
  const t3Mesh = new THREE.Mesh(t3Geo, stoneMat);
  t3Mesh.position.set(cx, 10.3, cz);
  ruaGroup.add(t3Mesh);
  disposables.push(t3Geo);

  const roofGeo = new THREE.ConeGeometry(4.2, 1.8, 4);
  roofGeo.rotateY(Math.PI / 4);
  const roofMesh = new THREE.Mesh(roofGeo, tileRoofMat);
  roofMesh.position.set(cx, 12.4, cz);
  roofMesh.castShadow = true;
  ruaGroup.add(roofMesh);
  disposables.push(roofGeo);

  rootGroup.add(ruaGroup);
}

// 9. CHỢ HÀN ĐÀ NẴNG
function buildHanMarket3D(
  rootGroup: THREE.Group,
  b: BuildingFeature,
  cx: number,
  cz: number,
  disposables: { dispose: () => void }[],
  isDay: boolean,
  clipPlanes: THREE.Plane[],
  buildingMeshes: THREE.Mesh[],
  facades: FacadeTextureSet
) {
  const mGroup = new THREE.Group();
  mGroup.name = 'cho-han-danang';

  const wallMat = new THREE.MeshStandardMaterial({
    color: '#fef08a',
    map: facades.tubeClassicTex,
    roughness: 0.75,
    clippingPlanes: clipPlanes,
  });
  const roofMat = new THREE.MeshStandardMaterial({
    color: '#dc2626',
    roughness: 0.6,
    clippingPlanes: clipPlanes,
  });
  disposables.push(wallMat, roofMat);

  const bGeo = new THREE.BoxGeometry(44, 11, 36);
  applyCleanArchitecturalUVs(bGeo, 12);
  const bMesh = new THREE.Mesh(bGeo, [wallMat, wallMat, roofMat, roofMat, wallMat, wallMat]);
  bMesh.position.set(cx, 5.5, cz);
  bMesh.castShadow = true;
  bMesh.receiveShadow = true;
  bMesh.userData = { kind: 'building', building: b };
  buildingMeshes.push(bMesh);
  mGroup.add(bMesh);

  // Large hipped market roof
  const rGeo = new THREE.ConeGeometry(28, 6.5, 4);
  rGeo.rotateY(Math.PI / 4);
  rGeo.scale(1.2, 1.0, 0.95);
  const rMesh = new THREE.Mesh(rGeo, roofMat);
  rMesh.position.set(cx, 14.25, cz);
  rMesh.castShadow = true;
  mGroup.add(rMesh);
  disposables.push(bGeo, rGeo);

  rootGroup.add(mGroup);
}

// 10. BẢO TÀNG ĐIÊU KHẮC CHĂM ĐÀ NẴNG
function buildChamMuseum3D(
  rootGroup: THREE.Group,
  b: BuildingFeature,
  cx: number,
  cz: number,
  disposables: { dispose: () => void }[],
  isDay: boolean,
  clipPlanes: THREE.Plane[],
  buildingMeshes: THREE.Mesh[]
) {
  const cGroup = new THREE.Group();
  cGroup.name = 'cham-sculpture-museum';

  const ochreMat = new THREE.MeshStandardMaterial({
    color: '#f59e0b',
    roughness: 0.78,
    clippingPlanes: clipPlanes,
  });
  const roofMat = new THREE.MeshStandardMaterial({
    color: '#b45309',
    roughness: 0.6,
    clippingPlanes: clipPlanes,
  });
  disposables.push(ochreMat, roofMat);

  const bGeo = new THREE.BoxGeometry(34, 9, 24);
  applyCleanArchitecturalUVs(bGeo, 12);
  const bMesh = new THREE.Mesh(bGeo, [ochreMat, ochreMat, roofMat, roofMat, ochreMat, ochreMat]);
  bMesh.position.set(cx, 4.5, cz);
  bMesh.castShadow = true;
  bMesh.receiveShadow = true;
  bMesh.userData = { kind: 'building', building: b };
  buildingMeshes.push(bMesh);
  cGroup.add(bMesh);

  const rGeo = new THREE.ConeGeometry(22, 5.5, 4);
  rGeo.rotateY(Math.PI / 4);
  rGeo.scale(1.15, 1.0, 0.85);
  const rMesh = new THREE.Mesh(rGeo, roofMat);
  rMesh.position.set(cx, 11.75, cz);
  cGroup.add(rMesh);
  disposables.push(bGeo, rGeo);

  rootGroup.add(cGroup);
}

// -------------------------------------------------------------
// AUTHENTIC VIETNAMESE 3D ROOF BUILDERS (BATCHED FOR 60 FPS!)
// -------------------------------------------------------------

// Helper: Compute street-aligned local orthonormal frame for a building footprint
// u = depth axis pointing from back wall toward front street facade (pts[0]->pts[1])
// v = (-uZ, uX) = width axis running parallel to the front street facade
function computeBuildingLocalFrame(
  pts: [number, number][],
  cx: number,
  cz: number,
  isTube: boolean
) {
  let uX = 1;
  let uZ = 0;

  if (isTube && pts.length >= 3) {
    // pts[0] -> pts[1] is the front street-facing edge
    const p1 = pts[0];
    const p2 = pts[1];
    const edx = p2[0] - p1[0];
    const edz = p2[1] - p1[1];
    const eLen = Math.hypot(edx, edz) || 1;
    const tX = edx / eLen;
    const tZ = edz / eLen;
    // Outward normal from building center toward front street edge midpoint
    const midX = (p1[0] + p2[0]) * 0.5;
    const midZ = (p1[1] + p2[1]) * 0.5;
    const n1X = -tZ;
    const n1Z = tX;
    if (n1X * (midX - cx) + n1Z * (midZ - cz) >= 0) {
      uX = n1X;
      uZ = n1Z;
    } else {
      uX = tZ;
      uZ = -tX;
    }
  } else {
    // Find longest edge direction
    let maxLen = 0;
    for (let i = 0; i < pts.length; i++) {
      const p1 = pts[i];
      const p2 = pts[(i + 1) % pts.length];
      const dx = p2[0] - p1[0];
      const dz = p2[1] - p1[1];
      const len = Math.hypot(dx, dz);
      if (len > maxLen) {
        maxLen = len;
        uX = dx / len;
        uZ = dz / len;
      }
    }
  }

  // Right-handed horizontal perpendicular v = (-uZ, uX) so det([u, Y, v]) = uX^2 + uZ^2 = +1
  const vX = -uZ;
  const vZ = uX;

  let minLx = Infinity,
    maxLx = -Infinity,
    minLz = Infinity,
    maxLz = -Infinity;
  for (const [px, pz] of pts) {
    const rx = px - cx;
    const rz = pz - cz;
    const lx = rx * uX + rz * uZ;
    const lz = rx * vX + rz * vZ;
    if (lx < minLx) minLx = lx;
    if (lx > maxLx) maxLx = lx;
    if (lz < minLz) minLz = lz;
    if (lz > maxLz) maxLz = lz;
  }

  // Basis Matrix4 mapping local (lx, y, lz) -> world (cx + lx*uX + lz*vX, y, cz + lx*uZ + lz*vZ)
  const basisMat = new THREE.Matrix4().set(
    uX, 0, vX, cx,
    0,  1, 0,  0,
    uZ, 0, vZ, cz,
    0,  0, 0,  1
  );

  return { uX, uZ, vX, vZ, minLx, maxLx, minLz, maxLz, basisMat };
}

// 1. Traditional Vietnamese 3D Pitched Clay Tile Roof & Stepped Thai Gable Roof (Mái ngói đỏ đất nung & Mái Thái giật cấp chữ A)
function buildVietnamesePitchedRoof(
  b: BuildingFeature,
  cx: number,
  cz: number,
  roofMat: THREE.Material,
  wallMatPlain: THREE.Material,
  trimMat: THREE.Material,
  addGeoToBatch: (mat: THREE.Material, geo: THREE.BufferGeometry) => void,
  buildingEdgeParts: THREE.BufferGeometry[]
) {
  const pts = b.footprint;
  if (pts.length < 3) return;

  const isTube = b.styleType === 'tube';
  const { minLx, maxLx, minLz, maxLz, basisMat } = computeBuildingLocalFrame(
    pts,
    cx,
    cz,
    isTube
  );

  const spanX = maxLx - minLx; // Depth along u (front is maxLx)
  const spanZ = maxLz - minLz; // Width along v
  if (spanX < 1.5 || spanZ < 1.5) return;

  const eaveOverhang = 0.36;
  // For tube houses, always run main ridge along X (depth) so the A-frame gable faces the street at maxLx!
  const ridgeAlongX = isTube || spanX >= spanZ;
  const spanCross = ridgeAlongX ? spanZ : spanX;
  const ridgeH = Math.min(3.0, Math.max(1.45, spanCross * 0.38));

  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];

  const addRoofQuad = (
    p1: [number, number, number],
    p2: [number, number, number],
    p3: [number, number, number],
    p4: [number, number, number],
    uScale: number,
    vScale: number
  ) => {
    const vA = new THREE.Vector3(...p2).sub(new THREE.Vector3(...p1));
    const vB = new THREE.Vector3(...p3).sub(new THREE.Vector3(...p1));
    const n = new THREE.Vector3().crossVectors(vA, vB).normalize();

    positions.push(...p1, ...p2, ...p3, ...p1, ...p3, ...p4);
    for (let k = 0; k < 6; k++) normals.push(n.x, n.y, n.z);
    uvs.push(0, 0, uScale, 0, uScale, vScale, 0, 0, uScale, vScale, 0, vScale);
  };

  const gPos: number[] = [];
  const gNorm: number[] = [];
  const gUvs: number[] = [];

  const rY = b.height + ridgeH;
  const eY = b.height;

  if (ridgeAlongX) {
    const x0 = minLx - eaveOverhang;
    const x1 = maxLx + eaveOverhang;
    const zMid = (minLz + maxLz) * 0.5;
    const z0 = minLz - eaveOverhang;
    const z1 = maxLz + eaveOverhang;
    const uTile = Math.max(1, (x1 - x0) / 3.5);
    const vTile = Math.max(1, Math.hypot(spanZ * 0.5, ridgeH) / 2.5);

    // Two main roof slopes
    addRoofQuad([x0, eY, z0], [x1, eY, z0], [x1, rY, zMid], [x0, rY, zMid], uTile, vTile);
    addRoofQuad([x0, rY, zMid], [x1, rY, zMid], [x1, eY, z1], [x0, eY, z1], uTile, vTile);

    // Back gable triangle (x = minLx)
    gPos.push(minLx, eY, minLz, minLx, rY, zMid, minLx, eY, maxLz);
    gNorm.push(-1, 0, 0, -1, 0, 0, -1, 0, 0);
    gUvs.push(0, 0, 0.5, 1, 1, 0);

    // Front street-facing gable triangle (x = maxLx)
    gPos.push(maxLx, eY, minLz, maxLx, eY, maxLz, maxLx, rY, zMid);
    gNorm.push(1, 0, 0, 1, 0, 0, 1, 0, 0);
    gUvs.push(0, 0, 1, 0, 0.5, 1);

    // Stepped Front Thai Gable (Mái Thái giật cấp chữ A mặt tiền) on 55% of tube/villa houses
    const hasSteppedGable = ((b.windowSeed || Math.round(Math.abs(cx))) % 9) < 5;
    if (hasSteppedGable && spanZ >= 3.6) {
      const subSpanZ = spanZ * 0.68;
      const subZ0 = zMid - subSpanZ * 0.5 - 0.22;
      const subZ1 = zMid + subSpanZ * 0.5 + 0.22;
      const subRidgeH = ridgeH * 0.68;
      const subRY = eY + subRidgeH;
      const subX0 = maxLx - 0.4;
      const subX1 = maxLx + eaveOverhang + 0.65;

      addRoofQuad([subX0, eY, subZ0], [subX1, eY, subZ0], [subX1, subRY, zMid], [subX0, subRY, zMid], 1, 1);
      addRoofQuad([subX0, subRY, zMid], [subX1, subRY, zMid], [subX1, eY, subZ1], [subX0, eY, subZ1], 1, 1);

      // Protruding front gable wall
      const gx = maxLx + 0.35;
      gPos.push(gx, eY, zMid - subSpanZ * 0.5, gx, eY, zMid + subSpanZ * 0.5, gx, subRY, zMid);
      gNorm.push(1, 0, 0, 1, 0, 0, 1, 0, 0);
      gUvs.push(0, 0, 1, 0, 0.5, 1);
    }

    // White Fascia Board Trim along front & back eaves (Diềm mái sơn trắng nổi bật)
    const fasciaLen = Math.hypot(spanZ * 0.5 + eaveOverhang, ridgeH);
    const slopeAng = Math.atan2(ridgeH, spanZ * 0.5 + eaveOverhang);
    for (const side of [-1, 1]) {
      const fGeo = new THREE.BoxGeometry(0.14, 0.16, fasciaLen);
      fGeo.rotateX(side * slopeAng);
      fGeo.translate(maxLx + eaveOverhang - 0.05, eY + ridgeH * 0.5, zMid + side * (spanZ * 0.25 + eaveOverhang * 0.5));
      fGeo.applyMatrix4(basisMat);
      addGeoToBatch(trimMat, fGeo);
    }

    // Ridge cap tile (Ngói bò úp nóc)
    const capGeo = new THREE.BoxGeometry(spanX + eaveOverhang * 2, 0.22, 0.26);
    capGeo.translate((minLx + maxLx) * 0.5, rY + 0.06, zMid);
    capGeo.applyMatrix4(basisMat);
    addGeoToBatch(roofMat, capGeo);
  } else {
    const z0 = minLz - eaveOverhang;
    const z1 = maxLz + eaveOverhang;
    const xMid = (minLx + maxLx) * 0.5;
    const x0 = minLx - eaveOverhang;
    const x1 = maxLx + eaveOverhang;
    const uTile = Math.max(1, (z1 - z0) / 3.5);
    const vTile = Math.max(1, Math.hypot(spanX * 0.5, ridgeH) / 2.5);

    addRoofQuad([x0, eY, z0], [xMid, rY, z0], [xMid, rY, z1], [x0, eY, z1], uTile, vTile);
    addRoofQuad([xMid, rY, z0], [x1, eY, z0], [x1, eY, z1], [xMid, rY, z1], uTile, vTile);

    gPos.push(minLx, eY, minLz, xMid, rY, minLz, maxLx, eY, minLz);
    gNorm.push(0, 0, -1, 0, 0, -1, 0, 0, -1);
    gUvs.push(0, 0, 0.5, 1, 1, 0);

    gPos.push(minLx, eY, maxLz, maxLx, eY, maxLz, xMid, rY, maxLz);
    gNorm.push(0, 0, 1, 0, 0, 1, 0, 0, 1);
    gUvs.push(0, 0, 1, 0, 0.5, 1);

    const capGeo = new THREE.BoxGeometry(0.26, 0.22, spanZ + eaveOverhang * 2);
    capGeo.translate(xMid, rY + 0.06, (minLz + maxLz) * 0.5);
    capGeo.applyMatrix4(basisMat);
    addGeoToBatch(roofMat, capGeo);
  }

  const roofGeo = new THREE.BufferGeometry();
  roofGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  roofGeo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  roofGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  roofGeo.applyMatrix4(basisMat);

  const roofEdges = new THREE.EdgesGeometry(roofGeo, 24);
  buildingEdgeParts.push(roofEdges);
  addGeoToBatch(roofMat, roofGeo);

  const gableGeo = new THREE.BufferGeometry();
  gableGeo.setAttribute('position', new THREE.Float32BufferAttribute(gPos, 3));
  gableGeo.setAttribute('normal', new THREE.Float32BufferAttribute(gNorm, 3));
  gableGeo.setAttribute('uv', new THREE.Float32BufferAttribute(gUvs, 2));
  gableGeo.applyMatrix4(basisMat);
  addGeoToBatch(wallMatPlain, gableGeo);
}

// 2. Modern Vietnamese Flat Terrace Roof (Sân thượng lát gạch + Khung lam mặt tiền + Tum thang + Bồn nước Inox Sơn Hà + Thái Dương Năng)
function buildVietnameseTerraceRoof(
  b: BuildingFeature,
  cx: number,
  cz: number,
  wallMatPlain: THREE.Material,
  trimMat: THREE.Material,
  darkMetalMat: THREE.Material,
  plantMat: THREE.Material,
  addGeoToBatch: (mat: THREE.Material, geo: THREE.BufferGeometry) => void,
  waterTankMatrices: THREE.Matrix4[],
  tankStandMatrices: THREE.Matrix4[],
  solarMatrices: THREE.Matrix4[]
) {
  const pts = b.footprint;
  const nPts = pts.length;
  if (nPts < 3) return;

  const isTube = b.styleType === 'tube';
  const { minLx, maxLx, minLz, maxLz, basisMat } = computeBuildingLocalFrame(
    pts,
    cx,
    cz,
    isTube
  );
  const spanX = maxLx - minLx;
  const spanZ = maxLz - minLz;
  if (spanX < 2.2 || spanZ < 2.2) return;

  const parapetH = 0.88;
  const parapetW = 0.22;

  // 1. Perimeter Parapet Wall (Tường lan can sân thượng cao 0.88m quanh chu vi)
  for (let i = 0; i < nPts; i++) {
    const p1 = pts[i];
    const p2 = pts[(i + 1) % nPts];
    const dx = p2[0] - p1[0];
    const dz = p2[1] - p1[1];
    const len = Math.hypot(dx, dz);
    if (len < 0.6) continue;

    const angle = Math.atan2(dx, dz);
    const wallGeo = new THREE.BoxGeometry(parapetW, parapetH, len);
    wallGeo.rotateY(angle);
    wallGeo.translate(
      (p1[0] + p2[0]) * 0.5,
      b.height + parapetH * 0.5,
      (p1[1] + p2[1]) * 0.5
    );
    addGeoToBatch(wallMatPlain, wallGeo);
  }

  const zMid = (minLz + maxLz) * 0.5;
  const xMid = (minLx + maxLx) * 0.5;

  // 2. Front Street-Facing Concrete Pergola Portal Frame (Khung đà lam bê tông sân thượng mặt tiền)
  if (isTube && spanZ >= 3.2) {
    const portalH = 2.35;
    const frontX = maxLx - 0.25;
    // Left & right front pillars
    for (const pz of [minLz + 0.18, maxLz - 0.18]) {
      const pilGeo = new THREE.BoxGeometry(0.28, portalH, 0.28);
      pilGeo.translate(frontX, b.height + portalH * 0.5, pz);
      pilGeo.applyMatrix4(basisMat);
      addGeoToBatch(trimMat, pilGeo);
    }
    // Top horizontal header beam across street frontage
    const beamGeo = new THREE.BoxGeometry(0.42, 0.26, spanZ + 0.1);
    beamGeo.translate(frontX, b.height + portalH + 0.1, zMid);
    beamGeo.applyMatrix4(basisMat);
    addGeoToBatch(trimMat, beamGeo);

    // Front terrace greenery planter box behind parapet
    const plantGeo = new THREE.BoxGeometry(0.45, 0.45, Math.max(1.2, spanZ * 0.65));
    plantGeo.translate(frontX - 0.35, b.height + 0.65, zMid);
    plantGeo.applyMatrix4(basisMat);
    addGeoToBatch(plantMat, plantGeo);
  }

  // 3. Stucco Tum Thang (Rooftop Staircase Penthouse with overhanging roof slab & door)
  const tumW = Math.min(2.6, spanX * 0.32); // along X (depth)
  const tumD = Math.min(2.4, spanZ * 0.58); // along Z (width)
  const tumH = 2.35;
  const tumX = xMid + spanX * 0.04;
  const tumZ = minLz + tumD * 0.5 + 0.25;

  const tumGeo = new THREE.BoxGeometry(tumW, tumH, tumD);
  tumGeo.translate(tumX, b.height + tumH * 0.5, tumZ);
  tumGeo.applyMatrix4(basisMat);
  addGeoToBatch(wallMatPlain, tumGeo);

  const tumRoofGeo = new THREE.BoxGeometry(tumW + 0.38, 0.15, tumD + 0.38);
  tumRoofGeo.translate(tumX, b.height + tumH + 0.075, tumZ);
  tumRoofGeo.applyMatrix4(basisMat);
  addGeoToBatch(trimMat, tumRoofGeo);

  // Tum access door facing front terrace (+X)
  const doorGeo = new THREE.BoxGeometry(0.06, 1.85, Math.min(0.85, tumD * 0.45));
  doorGeo.translate(tumX + tumW * 0.5 + 0.03, b.height + 0.92, tumZ);
  doorGeo.applyMatrix4(basisMat);
  addGeoToBatch(darkMetalMat, doorGeo);

  // 4. Instanced Horizontal Stainless Steel Water Tank (Bồn nước Inox Sơn Hà) & Stand on back roof (lx < xMid)
  const backX = minLx + Math.max(1.3, spanX * 0.22);
  const tankZ = maxLz - Math.min(1.1, spanZ * 0.32);

  const tankLocal = new THREE.Matrix4().makeTranslation(backX, b.height + 0.82, tankZ);
  waterTankMatrices.push(new THREE.Matrix4().multiplyMatrices(basisMat, tankLocal));

  const standLocal = new THREE.Matrix4().makeTranslation(backX, b.height + 0.25, tankZ);
  tankStandMatrices.push(new THREE.Matrix4().multiplyMatrices(basisMat, standLocal));

  // 5. Instanced Solar Water Heater (Thái Dương Năng ống chân không xanh coban)
  const solarZ = minLz + Math.min(1.1, spanZ * 0.32);
  const solarLocal = new THREE.Matrix4().makeTranslation(backX, b.height + 0.58, solarZ);
  solarMatrices.push(new THREE.Matrix4().multiplyMatrices(basisMat, solarLocal));
}

// 3. Authentic Vietnamese Corrugated Sheet-Metal Roof (Mái tôn sóng lạnh chống nóng lợp dốc nhẹ + diềm mái)
function buildVietnameseFlatRoof(
  b: BuildingFeature,
  cx: number,
  cz: number,
  roofMat: THREE.Material,
  wallMatPlain: THREE.Material,
  trimMat: THREE.Material,
  addGeoToBatch: (mat: THREE.Material, geo: THREE.BufferGeometry) => void,
  buildingEdgeParts: THREE.BufferGeometry[],
  waterTankMatrices: THREE.Matrix4[],
  tankStandMatrices: THREE.Matrix4[]
) {
  const pts = b.footprint;
  const nPts = pts.length;
  if (nPts < 3) return;

  const isTube = b.styleType === 'tube';
  const { minLx, maxLx, minLz, maxLz, basisMat } = computeBuildingLocalFrame(
    pts,
    cx,
    cz,
    isTube
  );
  const spanX = maxLx - minLx;
  const spanZ = maxLz - minLz;
  if (spanX < 1.8 || spanZ < 1.8) return;

  // Low perimeter parapet / side flashing walls (Tường thu hồi che mái tôn hai bên)
  const parapetH = 0.62;
  const parapetW = 0.20;
  for (let i = 0; i < nPts; i++) {
    const p1 = pts[i];
    const p2 = pts[(i + 1) % nPts];
    const dx = p2[0] - p1[0];
    const dz = p2[1] - p1[1];
    const len = Math.hypot(dx, dz);
    if (len < 0.6) continue;

    const angle = Math.atan2(dx, dz);
    const wallGeo = new THREE.BoxGeometry(parapetW, parapetH, len);
    wallGeo.rotateY(angle);
    wallGeo.translate(
      (p1[0] + p2[0]) * 0.5,
      b.height + parapetH * 0.5,
      (p1[1] + p2[1]) * 0.5
    );
    addGeoToBatch(wallMatPlain, wallGeo);
  }

  // Gently pitched Corrugated Metal Sheet Roof (Mái tôn chống nóng lợp sóng đua ra trước/sau)
  const overhang = 0.28;
  const sheetW = spanX + overhang * 2;
  const sheetD = spanZ + 0.16;
  const sheetGeo = new THREE.BoxGeometry(sheetW, 0.14, sheetD);
  // Scale UVs so corrugated ribs run cleanly along the roof slope
  const uv = sheetGeo.attributes.uv;
  if (uv) {
    const uRep = Math.max(1, sheetD / 2.2);
    const vRep = Math.max(1, sheetW / 3.5);
    for (let i = 0; i < uv.count; i++) {
      uv.setXY(i, uv.getX(i) * uRep, uv.getY(i) * vRep);
    }
  }
  // Gentle 4-degree drainage slope from front to back
  sheetGeo.rotateZ(-0.065);
  sheetGeo.translate(
    (minLx + maxLx) * 0.5,
    b.height + parapetH + 0.18,
    (minLz + maxLz) * 0.5
  );
  sheetGeo.applyMatrix4(basisMat);

  const sheetEdges = new THREE.EdgesGeometry(sheetGeo, 25);
  buildingEdgeParts.push(sheetEdges);
  addGeoToBatch(roofMat, sheetGeo);

  // Front decorative fascia brow on tube houses with corrugated metal roofs
  if (isTube) {
    const browGeo = new THREE.BoxGeometry(0.24, 0.36, spanZ + 0.24);
    browGeo.translate(maxLx + 0.08, b.height + parapetH + 0.28, (minLz + maxLz) * 0.5);
    browGeo.applyMatrix4(basisMat);
    addGeoToBatch(trimMat, browGeo);
  }

  // 45% of flat/corrugated-roof houses also have a rooftop Inox water tank at the back
  if (((b.windowSeed || Math.round(Math.abs(cx))) % 9) < 4 && spanX >= 6 && spanZ >= 3.2) {
    const backX = minLx + Math.max(1.3, spanX * 0.22);
    const zMid = (minLz + maxLz) * 0.5;
    const tankLocal = new THREE.Matrix4().makeTranslation(backX, b.height + parapetH + 0.72, zMid);
    waterTankMatrices.push(new THREE.Matrix4().multiplyMatrices(basisMat, tankLocal));
    const standLocal = new THREE.Matrix4().makeTranslation(backX, b.height + parapetH + 0.18, zMid);
    tankStandMatrices.push(new THREE.Matrix4().multiplyMatrices(basisMat, standLocal));
  }
}

export interface VehicleAgent {
  points: [number, number][];
  y: number;
  segIndex: number;
  t: number;
  speed: number;
  laneOffset: number;
  scaleX: number;
  scaleY: number;
  scaleZ: number;
  elevationFn?: (progress: number) => number;
}

export function buildThreeCityScene(
  scene: THREE.Scene,
  data: CityModelData,
  showTraffic: boolean,
  theme: RenderTheme = 'default',
  weatherType: WeatherConditionType = 'clear'
): {
  vehicles: VehicleAgent[];
  vehicleMesh: THREE.InstancedMesh;
  rainSystem: THREE.LineSegments;
  cloudGroup: THREE.Group;
  buildingMeshes: THREE.Mesh[];
  dispose: () => void;
} {
  const disposables: { dispose: () => void }[] = [];
  const buildingMeshes: THREE.Mesh[] = [];
  const rootGroup = new THREE.Group();
  rootGroup.name = 'city-root';
  scene.add(rootGroup);

  const isDay = theme === 'default';
  const isWet = weatherType === 'rain';
  const w = data.widthMeters;
  const d = data.depthMeters;
  const halfW = w * 0.5;
  const halfD = d * 0.5;

  // 4 Clipping Planes so rivers, bridges & roads never overflow outside the 3D diorama base!
  const clipPlanes = [
    new THREE.Plane(new THREE.Vector3(1, 0, 0), halfW * 1.02),
    new THREE.Plane(new THREE.Vector3(-1, 0, 0), halfW * 1.02),
    new THREE.Plane(new THREE.Vector3(0, 0, 1), halfD * 1.02),
    new THREE.Plane(new THREE.Vector3(0, 0, -1), halfD * 1.02),
  ];

  // 1. Diorama Ground Base & Architectural Pedestal
  const groundGeo = new THREE.BoxGeometry(w * 1.04, 10, d * 1.04);
  const groundMat = new THREE.MeshStandardMaterial({
    color: isDay ? (isWet ? '#b5afa2' : '#dcd5c6') : '#131b29',
    roughness: isWet ? 0.35 : 0.92,
    metalness: isWet ? 0.25 : 0.02,
  });
  const groundMesh = new THREE.Mesh(groundGeo, groundMat);
  groundMesh.position.set(0, -5.0, 0);
  groundMesh.receiveShadow = true;
  rootGroup.add(groundMesh);
  disposables.push(groundGeo, groundMat);

  const pedestalGeo = new THREE.BoxGeometry(w * 1.055, 6, d * 1.055);
  const pedestalMat = new THREE.MeshStandardMaterial({
    color: isDay ? '#8c8476' : '#0b1019',
    roughness: 0.95,
  });
  const pedestalMesh = new THREE.Mesh(pedestalGeo, pedestalMat);
  pedestalMesh.position.set(0, -6.8, 0);
  rootGroup.add(pedestalMesh);
  disposables.push(pedestalGeo, pedestalMat);

  // 2. Parks & Green Courtyards
  const parkMat = new THREE.MeshStandardMaterial({
    color: isDay ? '#a3c98f' : '#132e24',
    roughness: 0.9,
    side: THREE.DoubleSide,
    clippingPlanes: clipPlanes,
  });
  disposables.push(parkMat);

  for (const park of data.parks) {
    if (park.polygon.length < 3) continue;
    const shape = new THREE.Shape();
    shape.moveTo(park.polygon[0][0], -park.polygon[0][1]);
    for (let i = 1; i < park.polygon.length; i++) {
      shape.lineTo(park.polygon[i][0], -park.polygon[i][1]);
    }
    const geo = new THREE.ShapeGeometry(shape);
    geo.rotateX(-Math.PI / 2);
    const mesh = new THREE.Mesh(geo, parkMat);
    mesh.position.y = 0.06;
    mesh.receiveShadow = true;
    rootGroup.add(mesh);
    disposables.push(geo);
  }

  // 3. Waterways (Deep cyan/emerald with realistic specular gloss & revetment embankments)
  const waterMat = new THREE.MeshStandardMaterial({
    color: isDay ? '#0e7490' : '#0369a1',
    emissive: isDay ? '#083344' : '#075985',
    emissiveIntensity: isDay ? 0.16 : 0.45,
    roughness: 0.08,
    metalness: 0.72,
    side: THREE.DoubleSide,
    clippingPlanes: clipPlanes,
  });
  const bankMat = new THREE.MeshStandardMaterial({
    color: isDay ? '#94a3b8' : '#334155',
    roughness: 0.75,
    side: THREE.DoubleSide,
    clippingPlanes: clipPlanes,
  });
  const fountainMat = new THREE.MeshBasicMaterial({
    color: '#f8fafc',
    transparent: true,
    opacity: 0.85,
    clippingPlanes: clipPlanes,
  });
  disposables.push(waterMat, bankMat, fountainMat);

  for (const water of data.waters) {
    if (water.isPolygon && water.points.length >= 3) {
      const shape = new THREE.Shape();
      shape.moveTo(water.points[0][0], -water.points[0][1]);
      for (let i = 1; i < water.points.length; i++) {
        shape.lineTo(water.points[i][0], -water.points[i][1]);
      }
      if (water.holes && water.holes.length > 0) {
        for (const holePts of water.holes) {
          if (holePts.length < 3) continue;
          const holePath = new THREE.Path();
          holePath.moveTo(holePts[0][0], -holePts[0][1]);
          for (let j = 1; j < holePts.length; j++) {
            holePath.lineTo(holePts[j][0], -holePts[j][1]);
          }
          shape.holes.push(holePath);
        }
      }
      const geo = new THREE.ShapeGeometry(shape);
      geo.rotateX(-Math.PI / 2);
      const mesh = new THREE.Mesh(geo, waterMat);
      mesh.position.y = 0.16;
      mesh.receiveShadow = true;
      rootGroup.add(mesh);
      disposables.push(geo);
    } else if (water.points.length >= 2) {
      // Concrete embankment base (y = 0.12) flanked around the blue river channel (y = 0.18)
      const bankGeo = createRibbonGeometry(water.points, water.width + 8.5, 0.12);
      if (bankGeo) {
        const bm = new THREE.Mesh(bankGeo, bankMat);
        bm.receiveShadow = true;
        rootGroup.add(bm);
        disposables.push(bankGeo);
      }
      const rivGeo = createRibbonGeometry(water.points, water.width, 0.18);
      if (rivGeo) {
        const wm = new THREE.Mesh(rivGeo, waterMat);
        wm.receiveShadow = true;
        rootGroup.add(wm);
        disposables.push(rivGeo);
      }

      // Add iconic white water fountain / aerator spray in the river (matching reference screenshot!)
      const midIdx = Math.min(water.points.length - 1, Math.floor(water.points.length * 0.4));
      const [fx, fz] = water.points[midIdx];
      if (Math.abs(fx) < halfW * 0.85 && Math.abs(fz) < halfD * 0.85) {
        const ringGeo = new THREE.RingGeometry(1.8, 5.2, 16);
        ringGeo.rotateX(-Math.PI / 2);
        const ringMesh = new THREE.Mesh(ringGeo, fountainMat);
        ringMesh.position.set(fx, 0.24, fz);
        rootGroup.add(ringMesh);

        const jetGeo = new THREE.ConeGeometry(3.2, 8.5, 12, 1, true);
        jetGeo.rotateX(Math.PI); // Flare upward like a fountain spray
        const jetMesh = new THREE.Mesh(jetGeo, fountainMat);
        jetMesh.position.set(fx, 4.4, fz);
        rootGroup.add(jetMesh);
        disposables.push(ringGeo, jetGeo);
      }
    }
  }

  // 4. Real Roads, Sidewalks, 3D Bridges (Dragon Bridge / Cable-Stayed / Overpasses) & Lane Markings
  const sidewalkMat = new THREE.MeshStandardMaterial({
    color: isDay ? '#c4beb2' : '#263040',
    roughness: isWet ? 0.4 : 0.88,
    side: THREE.DoubleSide,
    clippingPlanes: clipPlanes,
  });
  const roadAsphaltMat = new THREE.MeshStandardMaterial({
    color: isDay ? (isWet ? '#1f242b' : '#2d323b') : '#1e293b',
    roughness: isWet ? 0.22 : 0.82,
    metalness: isWet ? 0.35 : 0.04,
    side: THREE.DoubleSide,
    clippingPlanes: clipPlanes,
  });
  const bridgeDeckMat = new THREE.MeshStandardMaterial({
    color: isDay ? '#475569' : '#334155',
    roughness: isWet ? 0.25 : 0.65,
    side: THREE.DoubleSide,
    clippingPlanes: clipPlanes,
  });
  const parapetMat = new THREE.MeshStandardMaterial({
    color: isDay ? '#f1f5f9' : '#94a3b8',
    roughness: 0.5,
    side: THREE.DoubleSide,
    clippingPlanes: clipPlanes,
  });
  const dragonGoldMat = new THREE.MeshStandardMaterial({
    color: '#f59e0b',
    emissive: '#d97706',
    emissiveIntensity: isDay ? 0.25 : 0.75,
    roughness: 0.3,
    metalness: 0.3,
    clippingPlanes: clipPlanes,
  });
  const cableWhiteMat = new THREE.MeshStandardMaterial({
    color: '#f8fafc',
    roughness: 0.4,
    clippingPlanes: clipPlanes,
  });
  const streetGlowMat = new THREE.MeshBasicMaterial({
    color: '#f59e0b',
    transparent: true,
    opacity: 0.34,
    side: THREE.DoubleSide,
    clippingPlanes: clipPlanes,
  });
  const trafficGreenMat = new THREE.MeshBasicMaterial({
    color: '#22c55e',
    side: THREE.DoubleSide,
    clippingPlanes: clipPlanes,
  });
  const trafficOrangeMat = new THREE.MeshBasicMaterial({
    color: '#f97316',
    side: THREE.DoubleSide,
    clippingPlanes: clipPlanes,
  });
  const laneLineMat = new THREE.MeshBasicMaterial({
    color: '#e2e8f0',
    side: THREE.DoubleSide,
    clippingPlanes: clipPlanes,
  });
  const pillarMat = new THREE.MeshStandardMaterial({
    color: isDay ? '#cbd5e1' : '#475569',
    roughness: 0.75,
    clippingPlanes: clipPlanes,
  });

  const pillarGeo = new THREE.CylinderGeometry(1.2, 1.4, 1, 10);
  const dashGeo = new THREE.PlaneGeometry(0.42, 3.8);
  dashGeo.rotateX(-Math.PI / 2);

  disposables.push(
    sidewalkMat,
    roadAsphaltMat,
    bridgeDeckMat,
    parapetMat,
    dragonGoldMat,
    cableWhiteMat,
    streetGlowMat,
    trafficGreenMat,
    trafficOrangeMat,
    laneLineMat,
    pillarMat,
    pillarGeo,
    dashGeo
  );

  const dashMatrices: THREE.Matrix4[] = [];
  const tempObj = new THREE.Object3D();

  const isDaNangDragonArea =
    Math.abs(data.centerLat - 16.061) < 0.02 &&
    Math.abs(data.centerLon - 108.227) < 0.02;

  let dragonArchesBuilt = false;
  let songHanBuilt = false;
  let tranThiLyBuilt = false;
  let thuanPhuocBuilt = false;

  // Materials for rich 3D bridge superstructures, retaining walls, lampposts & zebra crosswalks
  const girderMat = new THREE.MeshStandardMaterial({
    color: isDay ? '#334155' : '#1e293b',
    roughness: 0.82,
    side: THREE.DoubleSide,
    clippingPlanes: clipPlanes,
  });
  const retainingWallMat = new THREE.MeshStandardMaterial({
    color: isDay ? '#cbd5e1' : '#475569',
    roughness: 0.78,
    side: THREE.DoubleSide,
    clippingPlanes: clipPlanes,
  });
  const lamppostMat = new THREE.MeshStandardMaterial({
    color: isDay ? '#94a3b8' : '#64748b',
    roughness: 0.45,
    metalness: 0.8,
    clippingPlanes: clipPlanes,
  });
  const crosswalkMat = new THREE.MeshBasicMaterial({
    color: '#ffffff',
    side: THREE.DoubleSide,
    clippingPlanes: clipPlanes,
  });
  disposables.push(girderMat, retainingWallMat, lamppostMat, crosswalkMat);

  // Store elevation curves for roads so vehicles can smoothly follow bridge ramps
  const roadElevationMap = new Map<string, (progress: number, dist: number, totalLen: number) => number>();

  for (let rIdx = 0; rIdx < data.roads.length; rIdx++) {
    const road = data.roads[rIdx];
    const isBridge = road.isBridge;
    const targetBridgeY = Math.max(6.8, road.layer * 7.5);

    let totalLen = 0;
    for (let i = 1; i < road.points.length; i++) {
      totalLen += Math.hypot(
        road.points[i][0] - road.points[i - 1][0],
        road.points[i][1] - road.points[i - 1][1]
      );
    }
    totalLen = Math.max(1, totalLen);

    const p0 = road.points[0];
    const pN = road.points[road.points.length - 1];
    const startInternal =
      road.highway !== 'rail' &&
      Math.abs(p0[0]) < halfW * 0.88 &&
      Math.abs(p0[1]) < halfD * 0.88;
    const endInternal =
      road.highway !== 'rail' &&
      Math.abs(pN[0]) < halfW * 0.88 &&
      Math.abs(pN[1]) < halfD * 0.88;
    const rampLen = Math.min(85, totalLen * 0.28);

    const getElev = (prog: number, dist: number, tLen: number): number => {
      if (!isBridge) return 0.22 + (rIdx % 7) * 0.004;
      if (startInternal && dist < rampLen) {
        const t = dist / rampLen;
        return 0.26 + (targetBridgeY - 0.26) * (t * t * (3 - 2 * t));
      }
      if (endInternal && tLen - dist < rampLen) {
        const t = (tLen - dist) / rampLen;
        return 0.26 + (targetBridgeY - 0.26) * (t * t * (3 - 2 * t));
      }
      return targetBridgeY;
    };
    roadElevationMap.set(road.id, getElev);

    const baseY = isBridge ? getElev : 0.22 + (rIdx % 7) * 0.004;

    if (!isDay && !road.isBridge && road.width >= 8) {
      const glowGeo = createRibbonGeometry(
        road.points,
        road.width + 6.5,
        (p, d, l) => (typeof baseY === 'function' ? baseY(p, d, l) : baseY) - 0.03
      );
      if (glowGeo) {
        rootGroup.add(new THREE.Mesh(glowGeo, streetGlowMat));
        disposables.push(glowGeo);
      }
    }

    if (isDay && !road.isBridge && road.width >= 8.5) {
      const swGeo = createRibbonGeometry(
        road.points,
        road.width + 4.5,
        (p, d, l) => (typeof baseY === 'function' ? baseY(p, d, l) : baseY) - 0.03
      );
      if (swGeo) {
        const swMesh = new THREE.Mesh(swGeo, sidewalkMat);
        swMesh.receiveShadow = true;
        rootGroup.add(swMesh);
        disposables.push(swGeo);
      }
    }

    // Main road or bridge deck
    const rGeo = createRibbonGeometry(road.points, road.width, baseY);
    if (rGeo) {
      const mesh = new THREE.Mesh(
        rGeo,
        road.isBridge ? bridgeDeckMat : roadAsphaltMat
      );
      mesh.receiveShadow = true;
      mesh.castShadow = road.isBridge;
      rootGroup.add(mesh);
      disposables.push(rGeo);
    }

    // 3D Bridge Superstructures (Ramp Retaining Walls, Box Girders, T-Piers, Streetlights, Barriers)
    if (road.isBridge) {
      const rHalfW = road.width * 0.5;

      // Bottom Concrete Box Girder under the deck
      const girderGeo = createRibbonGeometry(
        road.points,
        road.width * 0.84,
        (p, d, l) => getElev(p, d, l) - 0.95
      );
      if (girderGeo) {
        const gMesh = new THREE.Mesh(girderGeo, girderMat);
        gMesh.castShadow = true;
        gMesh.receiveShadow = true;
        rootGroup.add(gMesh);
        disposables.push(girderGeo);
      }

      // Outer Parapet Safety Barriers with Dark Metal Handrails
      const leftWallPts: [number, number][] = [];
      const rightWallPts: [number, number][] = [];

      for (let i = 0; i < road.points.length; i++) {
        const [x, z] = road.points[i];
        const next = road.points[Math.min(road.points.length - 1, i + 1)];
        const prev = road.points[Math.max(0, i - 1)];
        const dx = next[0] - prev[0];
        const dz = next[1] - prev[1];
        const len = Math.hypot(dx, dz) || 1;
        const nx = -dz / len;
        const nz = dx / len;
        leftWallPts.push([x + nx * (rHalfW - 0.4), z + nz * (rHalfW - 0.4)]);
        rightWallPts.push([x - nx * (rHalfW - 0.4), z - nz * (rHalfW - 0.4)]);
      }

      for (const wallPts of [leftWallPts, rightWallPts]) {
        const wGeo = createRibbonGeometry(
          wallPts,
          0.85,
          (p, d, l) => getElev(p, d, l) + 0.65
        );
        if (wGeo) {
          const wMesh = new THREE.Mesh(wGeo, parapetMat);
          wMesh.castShadow = true;
          rootGroup.add(wMesh);
          disposables.push(wGeo);
        }
      }

      // Sloped concrete retaining walls along the approach ramps
      if (startInternal || endInternal) {
        for (const wallPts of [leftWallPts, rightWallPts]) {
          const retGeo = createRibbonGeometry(
            wallPts,
            0.6,
            (p, d, l) => (getElev(p, d, l) < targetBridgeY ? getElev(p, d, l) * 0.5 : targetBridgeY)
          );
          if (retGeo) {
            const retMesh = new THREE.Mesh(retGeo, retainingWallMat);
            retMesh.castShadow = true;
            rootGroup.add(retMesh);
            disposables.push(retGeo);
          }
        }
      }

      // Center Concrete Median Divider on multi-lane flyover bridges
      if (road.width >= 12 && road.highway !== 'rail') {
        const medGeo = createRibbonGeometry(
          road.points,
          0.65,
          (p, d, l) => getElev(p, d, l) + 0.45
        );
        if (medGeo) {
          const medMesh = new THREE.Mesh(medGeo, parapetMat);
          medMesh.castShadow = true;
          rootGroup.add(medMesh);
          disposables.push(medGeo);
        }
      }

      // T-Piers with Hammerhead Crossbeams (Trụ cầu chữ T với xà mũ) supporting the bridge deck
      let distAcc = 0;
      for (let i = 0; i < road.points.length - 1; i++) {
        const [x1, z1] = road.points[i];
        const [x2, z2] = road.points[i + 1];
        const dx = x2 - x1;
        const dz = z2 - z1;
        const segLen = Math.hypot(dx, dz);
        if (segLen < 4) continue;
        const angle = Math.atan2(dx, dz);

        for (let d = 16; d < segLen; d += 32) {
          const px = x1 + (dx * d) / segLen;
          const pz = z1 + (dz * d) / segLen;
          const currentTotalD = distAcc + d;
          const curH = getElev(currentTotalD / totalLen, currentTotalD, totalLen);

          // Place standard highway T-piers only on generic flyover bridges (Iconic bridges have custom river piers)
          if (curH >= 3.0 && !road.bridgeType) {
            const pierGroup = new THREE.Group();
            pierGroup.position.set(px, 0, pz);
            pierGroup.rotation.y = angle;

            // Pier Column
            const colH = Math.max(1, curH - 2.1);
            const colGeo = new THREE.BoxGeometry(1.5, colH, 1.5);
            const colMesh = new THREE.Mesh(colGeo, pillarMat);
            colMesh.position.y = colH * 0.5;
            colMesh.castShadow = true;
            pierGroup.add(colMesh);
            disposables.push(colGeo);

            // Hammerhead Crossbeam (Xà mũ trụ cầu - placed strictly underneath the deck girder!)
            const capW = road.width * 0.88;
            const capGeo = new THREE.BoxGeometry(capW, 1.0, 2.2);
            const capMesh = new THREE.Mesh(capGeo, pillarMat);
            capMesh.position.y = curH - 1.45;
            capMesh.castShadow = true;
            pierGroup.add(capMesh);
            disposables.push(capGeo);

            // Footing pad
            const padGeo = new THREE.BoxGeometry(3.0, 0.6, 3.0);
            const padMesh = new THREE.Mesh(padGeo, pillarMat);
            padMesh.position.y = 0.3;
            pierGroup.add(padMesh);
            disposables.push(padGeo);

            rootGroup.add(pierGroup);
          }

          // Dual-Arm Streetlights on center median (Skip on Dragon Bridge where dragon arches occupy center!)
          if (road.highway !== 'rail' && curH >= 2.0 && road.bridgeType !== 'dragon') {
            const lightGroup = new THREE.Group();
            lightGroup.position.set(px, curH + 0.45, pz);
            lightGroup.rotation.y = angle;

            // Mast
            const mastGeo = new THREE.CylinderGeometry(0.12, 0.18, 6.2, 6);
            const mast = new THREE.Mesh(mastGeo, lamppostMat);
            mast.position.y = 3.1;
            lightGroup.add(mast);
            disposables.push(mastGeo);

            // Dual arms
            const armGeo = new THREE.BoxGeometry(road.width * 0.65, 0.1, 0.1);
            const arm = new THREE.Mesh(armGeo, lamppostMat);
            arm.position.y = 5.9;
            lightGroup.add(arm);
            disposables.push(armGeo);

            rootGroup.add(lightGroup);
          }
        }
        distAcc += segLen;
      }

      // 3D Architectural Sculpting for Iconic Vietnamese Bridges (Cầu Rồng, Cầu Sông Hàn, Cầu Trần Thị Lý, Cầu Thuận Phước)
      const rName = (road.name || '').toLowerCase();
      const isDragon =
        !dragonArchesBuilt &&
        (road.bridgeType === 'dragon' ||
          rName.includes('cầu rồng') ||
          rName.includes('dragon'));
      const isSongHan =
        !songHanBuilt &&
        (road.bridgeType === 'song_han_swing' ||
          rName.includes('sông hàn') ||
          rName.includes('cầu quay'));
      const isTranThiLy =
        !tranThiLyBuilt &&
        (road.bridgeType === 'tran_thi_ly' || rName.includes('trần thị lý'));
      const isThuanPhuoc =
        !thuanPhuocBuilt &&
        (road.bridgeType === 'thuan_phuoc' || rName.includes('thuận phước'));

      if (isDragon) {
        dragonArchesBuilt = true;
        buildDragonBridge3D(rootGroup, road, targetBridgeY, disposables, isDay, clipPlanes);
      } else if (isSongHan) {
        songHanBuilt = true;
        buildHanRiverSwingBridge3D(rootGroup, road, targetBridgeY, disposables, isDay, clipPlanes);
      } else if (isTranThiLy) {
        tranThiLyBuilt = true;
        buildTranThiLyBridge3D(rootGroup, road, targetBridgeY, disposables, isDay, clipPlanes);
      } else if (isThuanPhuoc) {
        thuanPhuocBuilt = true;
        buildThuanPhuocBridge3D(rootGroup, road, targetBridgeY, disposables, isDay, clipPlanes);
      } else if (road.highway === 'rail') {
        // Metro Viaduct: Dual Tracks on gravel ballast
        const trackGeo = createRibbonGeometry(
          road.points,
          2.6,
          (p, d, l) => getElev(p, d, l) + 0.12
        );
        if (trackGeo) {
          const trackMesh = new THREE.Mesh(trackGeo, girderMat);
          rootGroup.add(trackMesh);
          disposables.push(trackGeo);
        }
      }
    }

    // Night Mode Neon Green/Orange Traffic Flow Lines
    if (!isDay && showTraffic && road.hasTraffic && road.width >= 8) {
      const laneOffset = road.width * 0.22;
      const leftPts: [number, number][] = [];
      const rightPts: [number, number][] = [];

      for (let i = 0; i < road.points.length; i++) {
        const [x, z] = road.points[i];
        const next = road.points[Math.min(road.points.length - 1, i + 1)];
        const prev = road.points[Math.max(0, i - 1)];
        const dx = next[0] - prev[0];
        const dz = next[1] - prev[1];
        const len = Math.hypot(dx, dz) || 1;
        const nx = -dz / len;
        const nz = dx / len;
        leftPts.push([x + nx * laneOffset, z + nz * laneOffset]);
        rightPts.push([x - nx * laneOffset, z - nz * laneOffset]);
      }

      const lineW = Math.max(1.0, road.width * 0.11);
      const elevOffset = (prog: number, dist: number, totalLen: number) =>
        (typeof baseY === 'function' ? baseY(prog, dist, totalLen) : baseY) + 0.08;
      const lGeo = createRibbonGeometry(leftPts, lineW, elevOffset);
      const rLaneGeo = createRibbonGeometry(rightPts, lineW, elevOffset);
      const mat =
        road.congestion === 'free' ? trafficGreenMat : trafficOrangeMat;
      if (lGeo) {
        rootGroup.add(new THREE.Mesh(lGeo, mat));
        disposables.push(lGeo);
      }
      if (rLaneGeo) {
        rootGroup.add(new THREE.Mesh(rLaneGeo, mat));
        disposables.push(rLaneGeo);
      }
    }

    // Day Mode White Dashed Lane Markings
    if (isDay && road.width >= 10) {
      for (let i = 0; i < road.points.length - 1; i++) {
        const [x1, z1] = road.points[i];
        const [x2, z2] = road.points[i + 1];
        const dx = x2 - x1;
        const dz = z2 - z1;
        const segLen = Math.hypot(dx, dz);
        if (segLen < 12) continue;
        const angle = Math.atan2(dx, dz);

        for (let d = 6; d < segLen - 6; d += 11) {
          const px = x1 + (dx * d) / segLen;
          const pz = z1 + (dz * d) / segLen;
          const curY =
            typeof baseY === 'function'
              ? baseY(d / segLen, d, segLen)
              : baseY;
          tempObj.position.set(px, curY + 0.05, pz);
          tempObj.rotation.set(0, angle, 0);
          tempObj.scale.set(1, 1, 1);
          tempObj.updateMatrix();
          dashMatrices.push(tempObj.matrix.clone());
        }
      }
    }
  }

  if (dashMatrices.length > 0) {
    const dashInst = new THREE.InstancedMesh(
      dashGeo,
      laneLineMat,
      dashMatrices.length
    );
    dashMatrices.forEach((m, idx) => dashInst.setMatrixAt(idx, m));
    dashInst.instanceMatrix.needsUpdate = true;
    rootGroup.add(dashInst);
  }

  // Paint realistic white Zebra Crosswalks at major intersections (matching reference photo!)
  const crosswalkGeo = new THREE.PlaneGeometry(0.65, 4.4);
  crosswalkGeo.rotateX(-Math.PI / 2);
  const crosswalkMatrices: THREE.Matrix4[] = [];

  for (const r of data.roads) {
    if (r.isBridge || r.width < 12) continue;
    for (const pt of [r.points[0], r.points[r.points.length - 1]]) {
      if (Math.hypot(pt[0], pt[1]) < 90) {
        for (let s = -r.width * 0.42; s <= r.width * 0.42; s += 1.25) {
          tempObj.position.set(pt[0] + (Math.abs(pt[0]) < 10 ? s : 0), 0.25, pt[1] + (Math.abs(pt[1]) < 10 ? s : 0));
          tempObj.rotation.set(0, pt[0] === 0 ? 0 : Math.PI / 2, 0);
          tempObj.scale.set(1, 1, 1);
          tempObj.updateMatrix();
          crosswalkMatrices.push(tempObj.matrix.clone());
        }
      }
    }
  }

  if (crosswalkMatrices.length > 0) {
    const cwInst = new THREE.InstancedMesh(crosswalkGeo, crosswalkMat, crosswalkMatrices.length);
    crosswalkMatrices.forEach((m, idx) => cwInst.setMatrixAt(idx, m));
    cwInst.instanceMatrix.needsUpdate = true;
    rootGroup.add(cwInst);
    disposables.push(crosswalkGeo);
  }

  // 5. Crisp 3D Buildings & Diverse Architectural Archetypes
  const facades = createFacadeTextures(theme);
  disposables.push(
    facades.tubeModernTex,
    facades.tubeClassicTex,
    facades.tubeCommercialTex,
    facades.kttVintageTex,
    facades.frenchColonialTex,
    facades.towerGlassAzureTex,
    facades.towerGlassTealTex,
    facades.towerRibbonTex,
    facades.towerBronzeTex,
    facades.clayTileRoofTex,
    facades.corrugatedRoofTex,
    facades.terraceSlabTex
  );

  const wallMatCache = new Map<string, THREE.MeshStandardMaterial>();
  const getWallMat = (b: BuildingFeature) => {
    const fStyle =
      b.facadeStyle ||
      (b.styleType === 'tower'
        ? 'glass_azure'
        : b.styleType === 'ktt'
        ? 'ktt_vintage'
        : 'tube_modern');
    const key = `${fStyle}-${b.wallColor}-${theme}`;
    let m = wallMatCache.get(key);
    if (!m) {
      let tex = facades.tubeModernTex;
      let roughness = 0.78;
      let metalness = 0.04;
      let tintColor = isDay ? b.wallColor : '#ffffff';

      if (fStyle === 'glass_azure') {
        tex = facades.towerGlassAzureTex;
        roughness = 0.16;
        metalness = 0.42;
        tintColor = '#ffffff';
      } else if (fStyle === 'glass_teal') {
        tex = facades.towerGlassTealTex;
        roughness = 0.2;
        metalness = 0.38;
        tintColor = '#ffffff';
      } else if (fStyle === 'bronze_curtain') {
        tex = facades.towerBronzeTex;
        roughness = 0.22;
        metalness = 0.48;
        tintColor = '#ffffff';
      } else if (fStyle === 'ribbon_travertine') {
        tex = facades.towerRibbonTex;
        roughness = 0.52;
        metalness = 0.08;
        tintColor = isDay ? b.wallColor : '#ffffff';
      } else if (fStyle === 'ktt_vintage') {
        tex = facades.kttVintageTex;
        roughness = 0.85;
        tintColor = isDay ? b.wallColor : '#ffffff';
      } else if (fStyle === 'french_colonial') {
        tex = facades.frenchColonialTex;
        roughness = 0.72;
        tintColor = isDay ? b.wallColor : '#ffffff';
      } else if (fStyle === 'tube_commercial') {
        tex = facades.tubeCommercialTex;
        roughness = 0.7;
        tintColor = '#ffffff';
      } else if (fStyle === 'tube_classic') {
        tex = facades.tubeClassicTex;
        roughness = 0.82;
        tintColor = isDay ? b.wallColor : '#ffffff';
      } else {
        tex = facades.tubeModernTex;
        roughness = 0.76;
        tintColor = isDay ? b.wallColor : '#ffffff';
      }

      m = new THREE.MeshStandardMaterial({
        color: tintColor,
        map: tex,
        emissiveMap: isDay ? null : tex,
        emissive: isDay
          ? new THREE.Color('#0f172a')
          : new THREE.Color('#fef08a'),
        emissiveIntensity: isDay ? 0 : 0.8,
        roughness,
        metalness,
        clippingPlanes: clipPlanes,
      });
      wallMatCache.set(key, m);
      disposables.push(m);
    }
    return m;
  };

  const capMatCache = new Map<string, THREE.MeshStandardMaterial>();
  const getCapMat = (hex: string, roofType?: 'pitched' | 'flat' | 'terrace') => {
    const key = `${hex}-${roofType || 'plain'}`;
    let m = capMatCache.get(key);
    if (!m) {
      const mapTex =
        roofType === 'pitched'
          ? facades.clayTileRoofTex
          : roofType === 'flat'
          ? facades.corrugatedRoofTex
          : roofType === 'terrace'
          ? facades.terraceSlabTex
          : null;
      m = new THREE.MeshStandardMaterial({
        color: hex,
        map: mapTex,
        roughness: roofType === 'flat' ? 0.46 : 0.72,
        metalness: roofType === 'flat' ? 0.24 : 0.04,
        clippingPlanes: clipPlanes,
      });
      capMatCache.set(key, m);
      disposables.push(m);
    }
    return m;
  };

  const wallMatPlainCache = new Map<string, THREE.MeshStandardMaterial>();
  const getWallMatPlain = (hex: string) => {
    let m = wallMatPlainCache.get(hex);
    if (!m) {
      m = new THREE.MeshStandardMaterial({
        color: hex,
        roughness: 0.82,
        metalness: 0.02,
        clippingPlanes: clipPlanes,
      });
      wallMatPlainCache.set(hex, m);
      disposables.push(m);
    }
    return m;
  };

  // Materials for Vietnamese commercial awnings, facade box-frames, wood louvers & iron railings
  const awningColors = ['#e11d48', '#2563eb', '#059669', '#ea580c', '#7c3aed'];
  const awningMats = awningColors.map(
    (c) =>
      new THREE.MeshStandardMaterial({
        color: c,
        roughness: 0.65,
        clippingPlanes: clipPlanes,
      })
  );
  disposables.push(...awningMats);

  const trimWhiteMat = new THREE.MeshStandardMaterial({
    color: isDay ? '#f8fafc' : '#cbd5e1',
    roughness: 0.65,
    metalness: 0.05,
    clippingPlanes: clipPlanes,
  });
  const woodLouverMat = new THREE.MeshStandardMaterial({
    color: '#b45309',
    roughness: 0.68,
    metalness: 0.08,
    clippingPlanes: clipPlanes,
  });
  const ironRailingMat = new THREE.MeshStandardMaterial({
    color: '#1e293b',
    roughness: 0.6,
    metalness: 0.7,
    clippingPlanes: clipPlanes,
  });
  const podiumMat = new THREE.MeshStandardMaterial({
    color: isDay ? '#cbd5e1' : '#334155',
    roughness: 0.7,
    clippingPlanes: clipPlanes,
  });
  const helipadMat = new THREE.MeshStandardMaterial({
    color: '#334155',
    roughness: 0.65,
    clippingPlanes: clipPlanes,
  });
  const helipadRingMat = new THREE.MeshBasicMaterial({ color: '#facc15' });
  const poolMat = new THREE.MeshStandardMaterial({
    color: '#06b6d4',
    emissive: '#0891b2',
    emissiveIntensity: 0.35,
    roughness: 0.08,
    metalness: 0.8,
    clippingPlanes: clipPlanes,
  });
  const beaconMat = new THREE.MeshBasicMaterial({ color: '#ef4444' });
  const acMat = new THREE.MeshStandardMaterial({
    color: '#e2e8f0',
    roughness: 0.7,
    clippingPlanes: clipPlanes,
  });
  const solarBlueMat = new THREE.MeshStandardMaterial({
    color: '#1e3a8a',
    metalness: 0.8,
    roughness: 0.2,
    clippingPlanes: clipPlanes,
  });
  const plantGreenMat = new THREE.MeshStandardMaterial({
    color: '#15803d',
    roughness: 0.85,
    clippingPlanes: clipPlanes,
  });
  const inoxTankMat = new THREE.MeshStandardMaterial({
    color: '#f1f5f9',
    metalness: 0.92,
    roughness: 0.14,
    clippingPlanes: clipPlanes,
  });
  const tankStandMat = new THREE.MeshStandardMaterial({
    color: '#475569',
    metalness: 0.75,
    roughness: 0.45,
    clippingPlanes: clipPlanes,
  });
  disposables.push(
    trimWhiteMat,
    woodLouverMat,
    ironRailingMat,
    podiumMat,
    helipadMat,
    helipadRingMat,
    poolMat,
    beaconMat,
    acMat,
    solarBlueMat,
    plantGreenMat,
    inoxTankMat,
    tankStandMat
  );

  // High-performance Geometry Batch Collector by Material (reduces ~20,000 meshes to ~30 merged draw calls!)
  const matBatchMap = new Map<THREE.Material, THREE.BufferGeometry[]>();
  const addGeoToBatch = (mat: THREE.Material, geo: THREE.BufferGeometry) => {
    const nonIdx = geo.index ? geo.toNonIndexed() : geo;
    if (nonIdx !== geo) geo.dispose();
    const pos = nonIdx.attributes.position;
    if (!pos || pos.count === 0) {
      nonIdx.dispose();
      return;
    }
    if (!nonIdx.attributes.normal) {
      nonIdx.computeVertexNormals();
    }
    if (!nonIdx.attributes.uv) {
      nonIdx.setAttribute(
        'uv',
        new THREE.BufferAttribute(new Float32Array(pos.count * 2), 2)
      );
    }
    nonIdx.clearGroups();
    let list = matBatchMap.get(mat);
    if (!list) {
      list = [];
      matBatchMap.set(mat, list);
    }
    list.push(nonIdx);
  };

  // InstancedMesh transform collectors for rooftop equipment & AC units
  const waterTankMatrices: THREE.Matrix4[] = [];
  const tankStandMatrices: THREE.Matrix4[] = [];
  const solarMatrices: THREE.Matrix4[] = [];
  const acMatrices: THREE.Matrix4[] = [];

  const buildingEdgeParts: THREE.BufferGeometry[] = [];

  for (let bIdx = 0; bIdx < data.buildings.length; bIdx++) {
    const b = data.buildings[bIdx];
    if (b.footprint.length < 3) continue;
    const [fx, fz] = b.footprint[0];
    if (Math.abs(fx) > halfW * 1.02 || Math.abs(fz) > halfD * 1.02) continue;

    const minH = b.minHeight || 0;
    const extrudeDepth = Math.max(2, b.height - minH);

    let cx = 0, cz = 0;
    for (const [px, pz] of b.footprint) { cx += px; cz += pz; }
    cx /= b.footprint.length;
    cz /= b.footprint.length;

    // Dedicated 3D Landmark Sculptures (Đà Nẵng & Việt Nam)
    if (b.landmarkType === 'admin_center') {
      buildDaNangAdminCenter3D(rootGroup, b, cx, cz, disposables, isDay, clipPlanes, buildingMeshes);
      continue;
    }
    if (b.landmarkType === 'novotel') {
      buildNovotelDanang3D(rootGroup, b, cx, cz, disposables, isDay, clipPlanes, buildingMeshes, facades);
      continue;
    }
    if (b.landmarkType === 'azura') {
      buildAzuraTower3D(rootGroup, b, cx, cz, disposables, isDay, clipPlanes, buildingMeshes, facades);
      continue;
    }
    if (b.landmarkType === 'indochina') {
      buildIndochinaRiverside3D(rootGroup, b, cx, cz, disposables, isDay, clipPlanes, buildingMeshes, facades);
      continue;
    }
    if (b.landmarkType === 'dragon_carp') {
      buildDragonCarpAndLoveBridge3D(rootGroup, b, cx, cz, disposables, isDay, clipPlanes, buildingMeshes);
      continue;
    }
    if (b.landmarkType === 'pink_church') {
      buildPinkCathedral3D(rootGroup, b, cx, cz, disposables, isDay, clipPlanes, buildingMeshes);
      continue;
    }
    if (b.landmarkType === 'bitexco') {
      buildBitexcoTower3D(rootGroup, b, cx, cz, disposables, isDay, clipPlanes, buildingMeshes, facades);
      continue;
    }
    if (b.landmarkType === 'thap_rua') {
      buildThapRua3D(rootGroup, b, cx, cz, disposables, isDay, clipPlanes, buildingMeshes);
      continue;
    }
    if (b.landmarkType === 'han_market') {
      buildHanMarket3D(rootGroup, b, cx, cz, disposables, isDay, clipPlanes, buildingMeshes, facades);
      continue;
    }
    if (b.landmarkType === 'cham_museum') {
      buildChamMuseum3D(rootGroup, b, cx, cz, disposables, isDay, clipPlanes, buildingMeshes);
      continue;
    }

    // Check if this is a supertall landmark (like Landmark 81, height > 180m)
    if (b.height >= 180 && minH === 0) {
      const tubeW = 10.5;
      const wallMat = getWallMat({ ...b, styleType: 'tower', facadeStyle: 'glass_azure' });
      const capMat = getCapMat('#cbd5e1');

      for (let gx = -2; gx <= 2; gx++) {
        for (let gz = -2; gz <= 2; gz++) {
          const dist = Math.hypot(gx, gz);
          const ratio =
            dist === 0
              ? 1.0
              : dist <= 1.1
              ? 0.78 - ((gx + gz + 4) % 3) * 0.07
              : dist <= 1.6
              ? 0.56 - ((gx * 2 + gz + 5) % 4) * 0.06
              : 0.36 - ((gx + gz * 3 + 7) % 3) * 0.05;

          const th = b.height * ratio;
          const tGeo = new THREE.BoxGeometry(tubeW - 0.3, th, tubeW - 0.3);
          applyCleanArchitecturalUVs(tGeo, 16);
          const tMesh = new THREE.Mesh(tGeo, [
            wallMat,
            wallMat,
            capMat,
            capMat,
            wallMat,
            wallMat,
          ]);
          tMesh.position.set(cx + gx * tubeW, th * 0.5, cz + gz * tubeW);
          tMesh.castShadow = true;
          tMesh.receiveShadow = true;
          tMesh.userData = { kind: 'building', building: b };
          buildingMeshes.push(tMesh);
          rootGroup.add(tMesh);
          disposables.push(tGeo);
        }
      }

      const spireGeo = new THREE.CylinderGeometry(0.4, 1.4, 38, 8);
      const spireMesh = new THREE.Mesh(spireGeo, capMat);
      spireMesh.position.set(cx, b.height + 19, cz);
      spireMesh.userData = { kind: 'building', building: b };
      buildingMeshes.push(spireMesh);
      rootGroup.add(spireMesh);
      disposables.push(spireGeo);
      continue;
    }

    const shape = new THREE.Shape();
    shape.moveTo(b.footprint[0][0], -b.footprint[0][1]);
    for (let i = 1; i < b.footprint.length; i++) {
      shape.lineTo(b.footprint[i][0], -b.footprint[i][1]);
    }

    // High-Rise Podium Base (2-story commercial base extruded from the building's exact footprint polygon!)
    if (b.styleType === 'tower' && b.height >= 45 && minH === 0) {
      const podGeo = new THREE.ExtrudeGeometry(shape, {
        depth: 7.2,
        bevelEnabled: true,
        bevelThickness: 0.4,
        bevelSize: 1.2,
        bevelSegments: 1,
      });
      podGeo.rotateX(-Math.PI / 2);
      const podEdges = new THREE.EdgesGeometry(podGeo, 28);
      buildingEdgeParts.push(podEdges);
      addGeoToBatch(podiumMat, podGeo);
    }

    const extrudeGeo = new THREE.ExtrudeGeometry(shape, {
      depth: extrudeDepth,
      bevelEnabled: false,
    });
    extrudeGeo.rotateX(-Math.PI / 2);
    if (minH !== 0) {
      extrudeGeo.translate(0, minH, 0);
    }

    // Architectural Edge Outlines for Building Walls
    const wallEdges = new THREE.EdgesGeometry(extrudeGeo, 28);
    buildingEdgeParts.push(wallEdges);

    const wallMat = getWallMat(b);
    const roofHex =
      b.styleType === 'tower'
        ? b.roofColor || '#334155'
        : b.roofColor;
    const roofMat = getCapMat(
      roofHex,
      b.styleType === 'tower' ? undefined : b.roofType
    );
    const wallMatPlain = getWallMatPlain(b.wallColor);

    const isInteractive = Boolean(
      b.isLandmark || b.styleType === 'tower' || (b.name && b.styleType !== 'tube')
    );

    if (isInteractive) {
      applyCleanArchitecturalUVs(
        extrudeGeo,
        b.styleType === 'tower' ? 16 : 14
      );
      const mesh = new THREE.Mesh(extrudeGeo, [roofMat, wallMat]);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData = { kind: 'building', building: b };
      buildingMeshes.push(mesh);
      rootGroup.add(mesh);
      disposables.push(extrudeGeo);
    } else if (b.styleType === 'tube' && b.footprint.length >= 3) {
      // Authentic Vietnamese Tube House Wall Splitting:
      // - Top roof cap -> roofMat
      // - Front & back street facades -> wallMat with floor-exact UVs (1 centered shopfront/window bay per house, ground floor strictly at y=minH!)
      // - Left & right party walls (tường hông sát vách) -> wallMatPlain (clean painted stucco without floating shop signs!)
      const p1 = b.footprint[0];
      const p2 = b.footprint[1];
      const edx = p2[0] - p1[0];
      const edz = p2[1] - p1[1];
      const eLen = Math.hypot(edx, edz) || 1;
      const tX = edx / eLen;
      const tZ = edz / eLen;
      const outX = -tZ;
      const outZ = tX;

      const levels = Math.max(1, Math.min(5, b.levels || Math.round(extrudeDepth / 3.4)));
      const vTop = levels * 0.2; // 5 rows in facade texture -> 0.20 V per story
      const colIdx = (bIdx + Math.round(Math.abs(cx))) % 4;

      const posAttr = extrudeGeo.attributes.position;
      const normAttr = extrudeGeo.attributes.normal;

      const capPos: number[] = [], capNorm: number[] = [], capUv: number[] = [];
      const fbPos: number[] = [], fbNorm: number[] = [], fbUv: number[] = [];
      const sidePos: number[] = [], sideNorm: number[] = [], sideUv: number[] = [];

      for (let i = 0; i < posAttr.count; i += 3) {
        const nx = normAttr.getX(i);
        const ny = normAttr.getY(i);
        const nz = normAttr.getZ(i);

        if (ny > 0.75) {
          for (let k = 0; k < 3; k++) {
            const vx = posAttr.getX(i + k);
            const vy = posAttr.getY(i + k);
            const vz = posAttr.getZ(i + k);
            capPos.push(vx, vy, vz);
            capNorm.push(nx, ny, nz);
            capUv.push((vx - cx) / 4.0, (vz - cz) / 4.0);
          }
        } else if (ny >= -0.75) {
          // Vertical wall triangle: check alignment with front/back normal (outX, outZ)
          const alignFrontBack = Math.abs(nx * outX + nz * outZ);
          if (alignFrontBack > 0.58) {
            for (let k = 0; k < 3; k++) {
              const vx = posAttr.getX(i + k);
              const vy = posAttr.getY(i + k);
              const vz = posAttr.getZ(i + k);
              fbPos.push(vx, vy, vz);
              fbNorm.push(nx, ny, nz);
              const tAlong = Math.max(
                0.02,
                Math.min(0.98, ((vx - p1[0]) * tX + (vz - p1[1]) * tZ) / eLen)
              );
              const u = (colIdx + tAlong) * 0.25;
              const v = Math.max(
                0.004,
                Math.min(0.996, ((vy - minH) / extrudeDepth) * vTop)
              );
              fbUv.push(u, v);
            }
          } else {
            for (let k = 0; k < 3; k++) {
              const vx = posAttr.getX(i + k);
              const vy = posAttr.getY(i + k);
              const vz = posAttr.getZ(i + k);
              sidePos.push(vx, vy, vz);
              sideNorm.push(nx, ny, nz);
              sideUv.push(0.5, 0.5);
            }
          }
        }
      }
      extrudeGeo.dispose();

      if (capPos.length > 0) {
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(capPos, 3));
        g.setAttribute('normal', new THREE.Float32BufferAttribute(capNorm, 3));
        g.setAttribute('uv', new THREE.Float32BufferAttribute(capUv, 2));
        addGeoToBatch(roofMat, g);
      }
      if (fbPos.length > 0) {
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(fbPos, 3));
        g.setAttribute('normal', new THREE.Float32BufferAttribute(fbNorm, 3));
        g.setAttribute('uv', new THREE.Float32BufferAttribute(fbUv, 2));
        addGeoToBatch(wallMat, g);
      }
      if (sidePos.length > 0) {
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(sidePos, 3));
        g.setAttribute('normal', new THREE.Float32BufferAttribute(sideNorm, 3));
        g.setAttribute('uv', new THREE.Float32BufferAttribute(sideUv, 2));
        addGeoToBatch(wallMatPlain, g);
      }
    } else {
      // KTT / Villa / Other non-interactive buildings: batch cap & walls
      applyCleanArchitecturalUVs(extrudeGeo, 14);
      const posAttr = extrudeGeo.attributes.position;
      const normAttr = extrudeGeo.attributes.normal;
      const uvAttr = extrudeGeo.attributes.uv;
      const capPos: number[] = [], capNorm: number[] = [], capUv: number[] = [];
      const wPos: number[] = [], wNorm: number[] = [], wUv: number[] = [];

      for (let i = 0; i < posAttr.count; i += 3) {
        const ny = normAttr.getY(i);
        if (ny > 0.75) {
          for (let k = 0; k < 3; k++) {
            capPos.push(posAttr.getX(i + k), posAttr.getY(i + k), posAttr.getZ(i + k));
            capNorm.push(normAttr.getX(i + k), normAttr.getY(i + k), normAttr.getZ(i + k));
            capUv.push(uvAttr.getX(i + k), uvAttr.getY(i + k));
          }
        } else if (ny >= -0.75) {
          for (let k = 0; k < 3; k++) {
            wPos.push(posAttr.getX(i + k), posAttr.getY(i + k), posAttr.getZ(i + k));
            wNorm.push(normAttr.getX(i + k), normAttr.getY(i + k), normAttr.getZ(i + k));
            wUv.push(uvAttr.getX(i + k), uvAttr.getY(i + k));
          }
        }
      }
      extrudeGeo.dispose();

      if (capPos.length > 0) {
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(capPos, 3));
        g.setAttribute('normal', new THREE.Float32BufferAttribute(capNorm, 3));
        g.setAttribute('uv', new THREE.Float32BufferAttribute(capUv, 2));
        addGeoToBatch(roofMat, g);
      }
      if (wPos.length > 0) {
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(wPos, 3));
        g.setAttribute('normal', new THREE.Float32BufferAttribute(wNorm, 3));
        g.setAttribute('uv', new THREE.Float32BufferAttribute(wUv, 2));
        addGeoToBatch(wallMat, g);
      }
    }

    if (b.styleType === 'tower') {
      // Modern Rooftop Parapet Crown for High-Rise Towers
      const towerCrownGeo = new THREE.ExtrudeGeometry(shape, {
        depth: 1.8,
        bevelEnabled: true,
        bevelThickness: 0.35,
        bevelSize: -0.4,
        bevelSegments: 1,
      });
      towerCrownGeo.rotateX(-Math.PI / 2);
      towerCrownGeo.translate(0, b.height, 0);

      const capEdges = new THREE.EdgesGeometry(towerCrownGeo, 28);
      buildingEdgeParts.push(capEdges);
      addGeoToBatch(roofMat, towerCrownGeo);
    } else {
      // Authentic Vietnamese 3D Roof Systems (Batched for 60 FPS!)
      if (b.roofType === 'pitched') {
        buildVietnamesePitchedRoof(
          b,
          cx,
          cz,
          roofMat,
          wallMatPlain,
          trimWhiteMat,
          addGeoToBatch,
          buildingEdgeParts
        );
      } else if (b.roofType === 'terrace') {
        buildVietnameseTerraceRoof(
          b,
          cx,
          cz,
          wallMatPlain,
          trimWhiteMat,
          ironRailingMat,
          plantGreenMat,
          addGeoToBatch,
          waterTankMatrices,
          tankStandMatrices,
          solarMatrices
        );
      } else {
        buildVietnameseFlatRoof(
          b,
          cx,
          cz,
          roofMat,
          wallMatPlain,
          trimWhiteMat,
          addGeoToBatch,
          buildingEdgeParts,
          waterTankMatrices,
          tankStandMatrices
        );
      }
    }

    // High-Rise Tower Modular Additions: Helipads, Rooftop Pools & Antenna Beacons
    if (b.styleType === 'tower' && b.height >= 48) {
      const antH = 8.5;
      const antGeo = new THREE.CylinderGeometry(0.12, 0.28, antH, 6);
      antGeo.translate(cx, b.height + antH * 0.5, cz);
      addGeoToBatch(ironRailingMat, antGeo);

      const bcnGeo = new THREE.SphereGeometry(0.5, 6, 6);
      bcnGeo.translate(cx, b.height + antH + 0.35, cz);
      addGeoToBatch(beaconMat, bcnGeo);

      if (b.height >= 68 && bIdx % 4 === 0) {
        const heliGeo = new THREE.CylinderGeometry(8.5, 8.5, 0.6, 24);
        heliGeo.translate(cx + 4, b.height + 2.8, cz);
        addGeoToBatch(helipadMat, heliGeo);

        const ringGeo = new THREE.RingGeometry(5.2, 6.2, 24);
        ringGeo.rotateX(-Math.PI / 2);
        ringGeo.translate(cx + 4, b.height + 3.15, cz);
        addGeoToBatch(helipadRingMat, ringGeo);
      } else if (b.height >= 55 && bIdx % 5 === 1) {
        const poolGeo = new THREE.BoxGeometry(9.5, 0.25, 5.5);
        poolGeo.translate(cx, b.height + 2.4, cz);
        addGeoToBatch(poolMat, poolGeo);
      }
    }

    // Authentic Vietnamese Tube House 3D Facade Sculpting:
    // - C-Shaped / Box-Frame Concrete Facade Borders (Khung hộp bê tông mặt tiền)
    // - Vertical Timber Sun Louvers (Hệ lam gỗ nhựa Conwood chắn nắng)
    // - Street-Aligned Balconies, Iron/Glass Railings, Bougainvillea Planters & Commercial Awnings
    if (b.styleType === 'tube' && b.levels >= 2 && b.footprint.length >= 3) {
      const p1 = b.footprint[0];
      const p2 = b.footprint[1];
      const edx = p2[0] - p1[0];
      const edz = p2[1] - p1[1];
      const eLen = Math.hypot(edx, edz);

      if (eLen >= 3.0) {
        const midX = (p1[0] + p2[0]) * 0.5;
        const midZ = (p1[1] + p2[1]) * 0.5;
        const tX = edx / eLen;
        const tZ = edz / eLen;
        // Outward normal pointing strictly perpendicular to front wall toward the street
        const n1X = -tZ;
        const n1Z = tX;
        const dotOut = n1X * (midX - cx) + n1Z * (midZ - cz);
        const outX = dotOut >= 0 ? n1X : -n1X;
        const outZ = dotOut >= 0 ? n1Z : -n1Z;
        // Right-handed horizontal tangent r = (outZ, -outX) so det([r, Y, out]) = +1
        const rX = outZ;
        const rZ = -outX;

        const facadeBasisMat = new THREE.Matrix4().set(
          rX, 0, outX, midX,
          0,  1, 0,    0,
          rZ, 0, outZ, midZ,
          0,  0, 0,    1
        );

        const placeFacadeBox = (
          mat: THREE.Material,
          w: number,
          h: number,
          d: number,
          alongOffset: number,
          yCenter: number,
          outOffset: number,
          tiltX = 0
        ) => {
          const geo = new THREE.BoxGeometry(w, h, d);
          if (tiltX !== 0) geo.rotateX(tiltX);
          geo.translate(alongOffset, yCenter, outOffset);
          geo.applyMatrix4(facadeBasisMat);
          addGeoToBatch(mat, geo);
        };

        const levels = Math.max(2, Math.min(5, b.levels));
        const floorH = extrudeDepth / levels;

        // 1. Modern Vietnamese C-Shaped Concrete Facade Box-Frame (Khung viền bê tông mặt tiền)
        if (b.facadeStyle !== 'tube_classic') {
          const upperH = extrudeDepth - floorH;
          const upperMidY = minH + floorH + upperH * 0.5;
          const frameDepth = 0.54;
          // Left & right protruding vertical wing walls
          placeFacadeBox(trimWhiteMat, 0.20, upperH, frameDepth, -eLen * 0.5 + 0.11, upperMidY, frameDepth * 0.5);
          placeFacadeBox(trimWhiteMat, 0.20, upperH, frameDepth, eLen * 0.5 - 0.11, upperMidY, frameDepth * 0.5);
          // Top horizontal roof brow connecting the wing walls
          placeFacadeBox(trimWhiteMat, eLen, 0.24, frameDepth + 0.08, 0, b.height - 0.12, (frameDepth + 0.08) * 0.5);

          // Decorative vertical timber sun-breaker louvers (lam gỗ nhựa mặt tiền) on 50% of modern houses
          if (bIdx % 2 === 0 && upperH >= 2.8) {
            const sideSign = bIdx % 4 === 0 ? 1 : -1;
            const baseAlong = sideSign * (eLen * 0.28);
            for (let s = -1; s <= 1; s++) {
              placeFacadeBox(
                woodLouverMat,
                0.08,
                upperH - 0.3,
                0.22,
                baseAlong + s * 0.22,
                upperMidY,
                0.42
              );
            }
          }
        }

        // 2. Ground-Floor Commercial Awning (Mái hiên di động tầng trệt)
        if (b.facadeStyle === 'tube_commercial' || bIdx % 2 === 0) {
          const awnMat = awningMats[bIdx % awningMats.length];
          placeFacadeBox(
            awnMat,
            Math.min(4.2, eLen * 0.86),
            0.12,
            1.15,
            0,
            minH + floorH * 0.88,
            0.55,
            0.22
          );
        }

        // 3. Floor-by-Floor Cantilevered Balconies, Iron/Glass Railings & Bougainvillea Planters
        const balW = Math.min(3.8, eLen * 0.78);
        for (let fl = 2; fl <= levels; fl++) {
          const bY = minH + (fl - 1) * floorH;
          // Balcony floor slab
          placeFacadeBox(trimWhiteMat, balW, 0.18, 0.76, 0, bY + 0.08, 0.38);
          // Front railing parallel to street
          placeFacadeBox(ironRailingMat, balW - 0.06, 0.78, 0.06, 0, bY + 0.52, 0.73);

          // Green bougainvillea planter box (Bồn hoa giấy / cây xanh ban công)
          if ((fl + bIdx) % 2 === 0) {
            const pSign = fl % 2 === 0 ? 1 : -1;
            placeFacadeBox(
              plantGreenMat,
              Math.min(1.6, balW * 0.45),
              0.34,
              0.32,
              pSign * (balW * 0.22),
              bY + 0.34,
              0.54
            );
          }
        }

        // 4. Instanced Outdoor Air Conditioner Condenser Unit (Cục nóng điều hòa)
        const acLocal = new THREE.Matrix4().makeTranslation(
          eLen * 0.28,
          minH + floorH * 1.68,
          0.22
        );
        acMatrices.push(new THREE.Matrix4().multiplyMatrices(facadeBasisMat, acLocal));
      }
    }

    // KTT Apartment Blocks: Street-Aligned Cantilevered "Chuồng cọp" iron security cages
    if (b.styleType === 'ktt' && b.levels >= 3 && b.footprint.length >= 3) {
      const p1 = b.footprint[0];
      const p2 = b.footprint[1];
      const edx = p2[0] - p1[0];
      const edz = p2[1] - p1[1];
      const eLen = Math.hypot(edx, edz);
      if (eLen >= 6) {
        const midX = (p1[0] + p2[0]) * 0.5;
        const midZ = (p1[1] + p2[1]) * 0.5;
        const tX = edx / eLen;
        const tZ = edz / eLen;
        const n1X = -tZ;
        const n1Z = tX;
        const dotOut = n1X * (midX - cx) + n1Z * (midZ - cz);
        const outX = dotOut >= 0 ? n1X : -n1X;
        const outZ = dotOut >= 0 ? n1Z : -n1Z;
        const rX = outZ;
        const rZ = -outX;
        const kttBasis = new THREE.Matrix4().set(
          rX, 0, outX, midX,
          0,  1, 0,    0,
          rZ, 0, outZ, midZ,
          0,  0, 0,    1
        );

        for (let fl = 2; fl <= Math.min(5, b.levels); fl++) {
          const cY = (fl - 1) * 3.4 + 1.4;
          const cageGeo = new THREE.BoxGeometry(3.6, 2.1, 1.15);
          cageGeo.translate(0, cY, 0.58);
          cageGeo.applyMatrix4(kttBasis);
          addGeoToBatch(ironRailingMat, cageGeo);
        }
      }
    }
  }

  // Flush all batched building & roof geometries by Material (1 Mesh per Material!)
  for (const [mat, geoList] of matBatchMap.entries()) {
    if (geoList.length === 0) continue;
    const mergedGeo = mergeGeometries(geoList, false);
    geoList.forEach((g) => g.dispose());
    if (!mergedGeo) continue;
    const batchMesh = new THREE.Mesh(mergedGeo, mat);
    batchMesh.castShadow = true;
    batchMesh.receiveShadow = true;
    rootGroup.add(batchMesh);
    disposables.push(mergedGeo);
  }

  // Flush InstancedMeshes for Rooftop Inox Water Tanks, Stands, Solar Heaters & AC Units (4 draw calls total!)
  if (waterTankMatrices.length > 0) {
    const tankGeo = new THREE.CylinderGeometry(0.38, 0.38, 1.45, 10);
    tankGeo.rotateZ(Math.PI / 2);
    const tankInst = new THREE.InstancedMesh(tankGeo, inoxTankMat, waterTankMatrices.length);
    tankInst.castShadow = true;
    waterTankMatrices.forEach((m, idx) => tankInst.setMatrixAt(idx, m));
    tankInst.instanceMatrix.needsUpdate = true;
    rootGroup.add(tankInst);
    disposables.push(tankGeo);
  }
  if (tankStandMatrices.length > 0) {
    const standGeo = new THREE.BoxGeometry(1.15, 0.45, 0.68);
    const standInst = new THREE.InstancedMesh(standGeo, tankStandMat, tankStandMatrices.length);
    tankStandMatrices.forEach((m, idx) => standInst.setMatrixAt(idx, m));
    standInst.instanceMatrix.needsUpdate = true;
    rootGroup.add(standInst);
    disposables.push(standGeo);
  }
  if (solarMatrices.length > 0) {
    const solarGeo = new THREE.BoxGeometry(1.25, 0.12, 1.05);
    solarGeo.rotateX(0.42);
    const solarInst = new THREE.InstancedMesh(solarGeo, solarBlueMat, solarMatrices.length);
    solarInst.castShadow = true;
    solarMatrices.forEach((m, idx) => solarInst.setMatrixAt(idx, m));
    solarInst.instanceMatrix.needsUpdate = true;
    rootGroup.add(solarInst);
    disposables.push(solarGeo);
  }
  if (acMatrices.length > 0) {
    const acGeo = new THREE.BoxGeometry(0.82, 0.54, 0.34);
    const acInst = new THREE.InstancedMesh(acGeo, acMat, acMatrices.length);
    acMatrices.forEach((m, idx) => acInst.setMatrixAt(idx, m));
    acInst.instanceMatrix.needsUpdate = true;
    rootGroup.add(acInst);
    disposables.push(acGeo);
  }

  // Merge all building & roof edge outlines into a single high-performance LineSegments draw call
  if (buildingEdgeParts.length > 0) {
    const mergedEdges = mergeGeometries(buildingEdgeParts, false);
    buildingEdgeParts.forEach((eg) => eg.dispose());
    const edgeMat = new THREE.LineBasicMaterial({
      color: isDay ? '#262b33' : '#475569',
      transparent: true,
      opacity: isDay ? 0.36 : 0.25,
      clippingPlanes: clipPlanes,
    });
    const edgeLines = new THREE.LineSegments(mergedEdges, edgeMat);
    rootGroup.add(edgeLines);
    disposables.push(mergedEdges, edgeMat);
  }

  // 6. Lush Multi-Puff 3D Trees (Compound spherical crowns with vertical sunlit shading)
  const treeCount = data.trees.length;
  if (treeCount > 0) {
    const canopyGeo = createLushTreeCanopyGeometry();
    const canopyMat = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      vertexColors: true,
      roughness: 0.8,
      flatShading: true,
      clippingPlanes: clipPlanes,
    });
    const trunkGeo = new THREE.CylinderGeometry(0.38, 0.56, 2.8, 6);
    const trunkMat = new THREE.MeshStandardMaterial({
      color: '#5c4033',
      roughness: 0.9,
      clippingPlanes: clipPlanes,
    });

    const canopyInst = new THREE.InstancedMesh(canopyGeo, canopyMat, treeCount);
    const trunkInst = new THREE.InstancedMesh(trunkGeo, trunkMat, treeCount);
    canopyInst.castShadow = true;
    canopyInst.receiveShadow = true;
    trunkInst.castShadow = true;

    const dummy = new THREE.Object3D();
    const colorVar = new THREE.Color();

    data.trees.forEach((t: TreeInstance, idx: number) => {
      const s = t.scale;
      dummy.position.set(t.x, 1.4 * s, t.z);
      dummy.rotation.set(0, idx * 1.37, 0);
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      trunkInst.setMatrixAt(idx, dummy.matrix);

      dummy.position.set(t.x, 4.15 * s, t.z);
      dummy.scale.set(s, s * 0.95, s);
      dummy.updateMatrix();
      canopyInst.setMatrixAt(idx, dummy.matrix);

      if (isDay) {
        if (idx % 23 === 0) colorVar.set('#ea580c'); // Hoa phượng đỏ rực rỡ
        else if (idx % 29 === 0) colorVar.set('#eab308'); // Hoa điệp vàng hoàng yến
        else if (idx % 37 === 0) colorVar.set('#a855f7'); // Hoa bằng lăng tím
        else if (t.variant === 0) colorVar.set('#4d7c0f'); // Cây xà cừ lá sẫm
        else if (t.variant === 1) colorVar.set('#365314'); // Cây cổ thụ
        else colorVar.set('#65a30d'); // Lộc vừng xanh non
      } else {
        if (t.variant === 0) colorVar.set('#16a34a');
        else if (t.variant === 1) colorVar.set('#15803d');
        else colorVar.set('#166534');
      }
      canopyInst.setColorAt(idx, colorVar);
    });

    canopyInst.instanceMatrix.needsUpdate = true;
    if (canopyInst.instanceColor) canopyInst.instanceColor.needsUpdate = true;
    trunkInst.instanceMatrix.needsUpdate = true;

    rootGroup.add(trunkInst, canopyInst);
    disposables.push(canopyGeo, canopyMat, trunkGeo, trunkMat);
  }

  // 7. Optimized Sculpted 3D Vehicles (Lightweight count for buttery 60 FPS performance!)
  const vehicles: VehicleAgent[] = [];
  const mainRoads = data.roads.filter(
    (r) => r.points.length >= 2 && r.width >= 7.5
  );
  // Cap at 56 vehicles maximum: perfectly balanced traffic without CPU matrix bottleneck!
  const carCount = Math.min(56, Math.max(16, mainRoads.length * 3));

  const sculptedCarGeo = createSculptedVehicleGeometry();
  const carMat = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    vertexColors: true,
    roughness: 0.35,
    metalness: 0.1,
    clippingPlanes: clipPlanes,
  });
  const vehicleMesh = new THREE.InstancedMesh(sculptedCarGeo, carMat, carCount);
  vehicleMesh.castShadow = true;
  disposables.push(sculptedCarGeo, carMat);

  const vehicleTypes = [
    // Green City Bus
    { color: new THREE.Color('#22c55e'), sx: 2.5, sy: 2.7, sz: 8.4, speed: 15 },
    // Blue City Bus
    { color: new THREE.Color('#3b82f6'), sx: 2.5, sy: 2.7, sz: 8.2, speed: 16 },
    // Yellow Coach Bus
    { color: new THREE.Color('#eab308'), sx: 2.4, sy: 2.6, sz: 7.4, speed: 16 },
    // Red SUV / Crossover
    { color: new THREE.Color('#ef4444'), sx: 2.0, sy: 1.65, sz: 4.4, speed: 21 },
    // Pearl White Sedan
    { color: new THREE.Color('#f8fafc'), sx: 1.9, sy: 1.45, sz: 4.1, speed: 23 },
    // Cyan Electric Taxi (Xanh SM style!)
    { color: new THREE.Color('#06b6d4'), sx: 1.9, sy: 1.48, sz: 4.1, speed: 22 },
    // Silver Sedan
    { color: new THREE.Color('#cbd5e1'), sx: 1.9, sy: 1.45, sz: 4.0, speed: 24 },
  ];

  for (let i = 0; i < carCount; i++) {
    const r = mainRoads[i % Math.max(1, mainRoads.length)];
    if (!r) break;
    const isReverse = i % 2 === 1;
    const pts = isReverse ? [...r.points].reverse() : r.points;
    const baseY = r.isBridge ? r.layer * 7.2 : 0.24;

    const elevFn = roadElevationMap.get(r.id);
    let vehicleElevationFn: ((progress: number) => number) | undefined = undefined;
    if (r.isBridge && elevFn) {
      let totalRlen = 0;
      for (let k = 1; k < r.points.length; k++) {
        totalRlen += Math.hypot(
          r.points[k][0] - r.points[k - 1][0],
          r.points[k][1] - r.points[k - 1][1]
        );
      }
      totalRlen = Math.max(1, totalRlen);
      vehicleElevationFn = (prog: number) => {
        const actualProg = isReverse ? Math.max(0, Math.min(1, 1 - prog)) : Math.max(0, Math.min(1, prog));
        return elevFn(actualProg, actualProg * totalRlen, totalRlen) + 0.28;
      };
    }

    const vType =
      i % 9 === 0
        ? vehicleTypes[0]
        : i % 13 === 0
        ? vehicleTypes[1]
        : i % 15 === 0
        ? vehicleTypes[2]
        : vehicleTypes[3 + (i % 4)];

    // Support inner & outer lanes (on Dragon Bridge, keep lanes outside dragon spine arches)
    const subLane =
      r.bridgeType === 'dragon'
        ? (i % 2 === 0 ? 0.24 : 0.36)
        : r.width >= 14
        ? (i % 4 < 2 ? 0.14 : 0.31)
        : 0.22;
    const laneMag = r.width * subLane;

    vehicles.push({
      points: pts,
      y: baseY,
      segIndex: i % Math.max(1, pts.length - 1),
      t: (i * 0.137) % 1,
      speed: vType.speed + (i % 5) * 1.5,
      laneOffset: laneMag,
      scaleX: vType.sx,
      scaleY: vType.sy,
      scaleZ: vType.sz,
      elevationFn: vehicleElevationFn,
    });
    vehicleMesh.setColorAt(i, vType.color);
  }
  if (vehicleMesh.instanceColor) vehicleMesh.instanceColor.needsUpdate = true;
  rootGroup.add(vehicleMesh);

  // 8. 3D Weather Effects: Rain Streak Particle System & Low-Poly Drifting Clouds
  const rainCount = 1500;
  const rainPositions = new Float32Array(rainCount * 6);
  for (let i = 0; i < rainCount; i++) {
    const rx = (Math.random() - 0.5) * w;
    const ry = Math.random() * 220;
    const rz = (Math.random() - 0.5) * d;
    const idx = i * 6;
    rainPositions[idx] = rx;
    rainPositions[idx + 1] = ry;
    rainPositions[idx + 2] = rz;
    rainPositions[idx + 3] = rx - 1.5;
    rainPositions[idx + 4] = ry - 10.5;
    rainPositions[idx + 5] = rz;
  }
  const rainGeo = new THREE.BufferGeometry();
  rainGeo.setAttribute(
    'position',
    new THREE.BufferAttribute(rainPositions, 3)
  );
  const rainMat = new THREE.LineBasicMaterial({
    color: '#93c5fd',
    transparent: true,
    opacity: 0.6,
  });
  const rainSystem = new THREE.LineSegments(rainGeo, rainMat);
  rainSystem.visible = weatherType === 'rain';
  rootGroup.add(rainSystem);
  disposables.push(rainGeo, rainMat);

  const cloudGroup = new THREE.Group();
  const cloudGeo = new THREE.DodecahedronGeometry(14, 1);
  const cloudMat = new THREE.MeshStandardMaterial({
    color: isDay ? '#f8fafc' : '#334155',
    roughness: 0.9,
    transparent: true,
    opacity: 0.82,
    flatShading: true,
  });
  for (let c = 0; c < 10; c++) {
    const cluster = new THREE.Group();
    const cx = ((c % 5) - 2) * (w * 0.22);
    const cz = (Math.floor(c / 5) - 0.5) * (d * 0.45);
    cluster.position.set(cx, 155 + (c % 3) * 15, cz);
    for (let p = 0; p < 3; p++) {
      const puff = new THREE.Mesh(cloudGeo, cloudMat);
      puff.position.set((p - 1) * 14, (p % 2) * 4, (p - 1) * 4);
      puff.scale.set(1.4, 0.55, 1.0);
      puff.castShadow = true;
      cluster.add(puff);
    }
    cloudGroup.add(cluster);
  }
  cloudGroup.visible = weatherType === 'cloudy' || weatherType === 'rain';
  rootGroup.add(cloudGroup);
  disposables.push(cloudGeo, cloudMat);

  return {
    vehicles,
    vehicleMesh,
    rainSystem,
    cloudGroup,
    buildingMeshes,
    dispose: () => {
      scene.remove(rootGroup);
      disposables.forEach((d) => d.dispose());
    },
  };
}
