import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Box, Maximize, Minimize } from 'lucide-react';
import {
  BoundingBox,
  BuildProgress,
  CityModelData,
  WeatherInfo,
} from './types';
import {
  buildCityModel,
  fetchWeather,
  MapboxExtractedData,
  PRESET_LOCATIONS,
} from './services/cityBuilder';
import { Map2DPanel } from './components/Map2DPanel';
import { City3DViewport } from './components/City3DViewport';

export function App() {
  const defaultPreset = PRESET_LOCATIONS.nga_tu_so;

  const [bbox, setBbox] = useState<BoundingBox>(defaultPreset.bbox);
  const [regionTitle, setRegionTitle] = useState<string>(defaultPreset.title);
  const [cityData, setCityData] = useState<CityModelData | null>(null);
  const [weather, setWeather] = useState<WeatherInfo>({
    tempC: 28,
    condition: 'Trời quang',
    conditionType: 'clear',
    isNight: false,
    timeStr: '07:49',
    timeMinutes: 7 * 60 + 49,
  });

  const [progress, setProgress] = useState<BuildProgress>({
    active: true,
    regionName: defaultPreset.title,
    percent: 12,
    elapsedSec: 0.1,
    areaKm2: 0.93,
    stepOsm: { done: false, count: 0 },
    stepOpenBuildings: { done: false, count: 0 },
    stepMerge: { done: false, count: 0 },
    stepRender: { done: false, pct: 0 },
  });

  const [splitPct, setSplitPct] = useState<number>(38.5);
  const [isDraggingSplit, setIsDraggingSplit] = useState<boolean>(false);
  const [isExpanded3D, setIsExpanded3D] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const buildSeqRef = useRef<number>(0);

  const triggerBuildCity = useCallback(
    async (
      targetBBox: BoundingBox,
      title: string,
      mapboxData?: MapboxExtractedData | null
    ) => {
      const seq = ++buildSeqRef.current;
      setBbox(targetBBox);
      setRegionTitle(title);

      const cLat = (targetBBox.south + targetBBox.north) / 2;
      const cLon = (targetBBox.west + targetBBox.east) / 2;

      fetchWeather(cLat, cLon).then((w) => {
        if (seq === buildSeqRef.current) setWeather(w);
      });

      const model = await buildCityModel(
        targetBBox,
        title,
        (p) => {
          if (seq === buildSeqRef.current) {
            setProgress({ ...p });
          }
        },
        mapboxData
      );

      if (seq !== buildSeqRef.current) return;
      setCityData(model);
      setTimeout(() => {
        if (seq === buildSeqRef.current) {
          setProgress((prev) => ({ ...prev, active: false }));
        }
      }, 220);
    },
    []
  );

  // Switch preset region: update bbox & title so Map2DPanel flies to the region, loads z15+ vector tiles, and triggers build with full Mapbox data!
  const handleSelectPreset = useCallback(
    (targetBBox: BoundingBox, title: string) => {
      setBbox({ ...targetBBox });
      setRegionTitle(title);
      setProgress((prev) => ({
        ...prev,
        active: true,
        regionName: title,
        percent: 12,
        elapsedSec: 0.1,
      }));
    },
    []
  );

  // Resizable Split Pane Handler
  useEffect(() => {
    if (!isDraggingSplit) return;
    const onMove = (e: MouseEvent) => {
      const pct = Math.min(72, Math.max(24, (e.clientX / window.innerWidth) * 100));
      setSplitPct(pct);
    };
    const onUp = () => setIsDraggingSplit(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [isDraggingSplit]);

  const toggleBrowserFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <div className="flex flex-col w-screen h-screen bg-[#0b0f17] text-slate-100 select-none overflow-hidden">
      {/* Top Header Bar (Matches Tiny Map header in all screenshots) */}
      <header className="h-12 shrink-0 bg-[#0d1117] border-b border-white/10 px-4 flex items-center justify-between z-30">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-white/5 border border-white/15 flex items-center justify-center text-slate-100 shadow-inner">
            <Box className="w-4 h-4 text-orange-400" />
          </div>
          <span className="font-bold text-[14px] tracking-tight text-white">
            Tiny Map
          </span>
          <span className="text-white/20 mx-0.5">|</span>
          <span className="text-xs text-slate-400 truncate">
            Vẽ một khu, dựng thành mô hình 3D
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const p = PRESET_LOCATIONS.cau_rong;
              handleSelectPreset(p.bbox, p.title);
            }}
            className="px-3 py-1.5 rounded-xl bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/40 text-xs font-semibold text-orange-200 transition-colors"
          >
            🐉 Cầu Rồng Đà Nẵng
          </button>

          <button
            onClick={() => {
              const p = PRESET_LOCATIONS.cau_song_han;
              handleSelectPreset(p.bbox, p.title);
            }}
            className="px-3 py-1.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/40 text-xs font-semibold text-sky-200 transition-colors"
          >
            🌉 Cầu Sông Hàn
          </button>

          <button
            onClick={() => {
              const p = PRESET_LOCATIONS.novotel_admin_dn;
              handleSelectPreset(p.bbox, p.title);
            }}
            className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-xs font-semibold text-cyan-200 transition-colors"
          >
            🏙️ TT Hành Chính & Novotel
          </button>

          <button
            onClick={() => {
              const p = PRESET_LOCATIONS.ho_guom_hanoi;
              handleSelectPreset(p.bbox, p.title);
            }}
            className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-xs font-semibold text-emerald-200 transition-colors"
          >
            🐢 Hồ Gươm – Tháp Rùa
          </button>

          <button
            onClick={() => {
              const p = PRESET_LOCATIONS.landmark81_hcm;
              handleSelectPreset(p.bbox, p.title);
            }}
            className="px-3 py-1.5 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/40 text-xs font-semibold text-indigo-200 transition-colors"
          >
            🗼 Landmark 81 TP.HCM
          </button>

          <button
            onClick={() => {
              const p = PRESET_LOCATIONS.nga_tu_so;
              handleSelectPreset(p.bbox, p.title);
            }}
            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-slate-200 transition-colors"
          >
            Ví dụ Ngã Tư Sở
          </button>

          <button
            onClick={toggleBrowserFullscreen}
            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-slate-200 flex items-center gap-1.5 transition-colors"
          >
            {isFullscreen ? (
              <>
                <Minimize className="w-3.5 h-3.5 text-slate-300" />
                <span>Thoát toàn màn hình</span>
              </>
            ) : (
              <>
                <Maximize className="w-3.5 h-3.5 text-slate-300" />
                <span>Toàn màn hình</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main Split Workspace */}
      <main className="relative flex-1 flex w-full overflow-hidden">
        {/* Left Panel: 2D Map + Search + Bounding Box Draw (Always stays mounted so Mapbox vector tiles can always be extracted!) */}
        <div
          style={{ width: isExpanded3D ? 0 : `${splitPct}%` }}
          className={
            isExpanded3D
              ? 'h-full overflow-hidden opacity-0 pointer-events-none shrink-0'
              : 'h-full shrink-0 relative'
          }
        >
          <Map2DPanel
            bbox={bbox}
            regionTitle={regionTitle}
            cityData={cityData}
            onSelectBBox={triggerBuildCity}
          />
        </div>

        {/* Resizable Divider Handle (Matches orange center thumb in Image 4) */}
        {!isExpanded3D && (
          <div
            onMouseDown={() => setIsDraggingSplit(true)}
            title="Kéo để thay đổi kích thước 2 khung"
            className="w-1.5 h-full bg-[#0d1117] hover:bg-orange-500/40 cursor-col-resize flex items-center justify-center z-30 transition-colors group"
          >
            <div className="w-1 h-10 rounded-full bg-orange-500/80 group-hover:bg-orange-400 transition-colors" />
          </div>
        )}

        {/* Right Panel: 3D City Viewport */}
        <div className="flex-1 h-full relative min-w-0">
          <City3DViewport
            cityData={cityData}
            progress={progress}
            weather={weather}
            isExpanded3D={isExpanded3D}
            onToggleExpand3D={() => setIsExpanded3D(!isExpanded3D)}
          />
        </div>
      </main>
    </div>
  );
}
export default App;
