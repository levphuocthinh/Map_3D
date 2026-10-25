# 🏙️ Map 3D (Tiny Map 3D) — Bản Đồ Đô Thị 3D Việt Nam Thời Gian Thực

Ứng dụng web tương tác dựng mô hình **Đô thị 3D thời gian thực** từ dữ liệu bản đồ vệ tinh và địa hình thực tế tại Việt Nam (**Đà Nẵng, Hà Nội, TP. Hồ Chí Minh** và bất kỳ khu vực nào được khoanh vùng hoặc định vị GPS). Dự án kết hợp **Mapbox GL JS (Chế độ Vệ tinh & Vector Tiles)**, **OpenStreetMap Overpass API**, và **Three.js WebGL** để tái hiện sống động kiến trúc nhà ống, nhà phố thương mại, cầu biểu tượng và danh lam thắng cảnh Việt Nam ở tốc độ **60 FPS**.

---

## ✨ Tính Năng Nổi Bật

### 1. 🛰️ Bản Đồ Vệ Tinh 2D & Khoanh Vùng Dựng 3D Trực Tiếp
- **Chế độ Vệ tinh (`🛰️ Vệ tinh` / `🗺️ Bản đồ`):** Chuyển đổi trực tiếp giữa ảnh chụp vệ tinh độ phân giải cao (`satellite-streets-v12`) và bản đồ tối (`dark-v11`), đồng bộ 100% viền footprint các tòa nhà giữa bản đồ 2D và khung cảnh 3D.
- **Định vị GPS người dùng (`📍 Lấy vị trí hiện tại`):** Tự động xác định tọa độ GPS hiện tại, bay tới khu vực đang đứng và dựng ngay mô hình 3D khu phố xung quanh.
- **Khoanh vùng tùy chọn & Tìm kiếm địa danh:** Hỗ trợ kéo thả khung chữ nhật chọn vùng bất kỳ hoặc tìm kiếm nhanh các địa điểm trên toàn quốc.

### 2. 🏘️ Kiến Trúc Nhà Ống & Đô Thị Việt Nam Sát Thực Tế
- **Quy hoạch dãy nhà ống liền kề sát vách (`Terraced Tube Houses`):** Tự động phân tách các khối nhà gộp và sắp xếp các dãy nhà ống hẹp ngang (`4.2m – 5.4m`), sâu (`13.5m – 18m`) bám sát mặt đường chính và hệ thống ngõ/kiệt (`2.8m`).
- **Mặt tiền nhà phố Việt Nam đặc trưng:**
  - **Tầng trệt:** Biển hiệu cửa hàng Việt Nam (`PHỞ BÒ`, `CÀ PHÊ`, `NHÀ THUỐC`, `KHÁCH SẠN`, `BÁNH MÌ`, `CƠM TẤM`, `TRÀ SỮA`, `TIỆM VÀNG`), mái hiên di động, cửa cuốn và cổng sắt 4 cánh ốp đá granite.
  - **Các tầng trên:** Khung hộp bê tông chữ C đua ra ở mặt tiền, hệ lam gỗ nhựa Conwood chắn nắng, ban công kính/sắt hộp, bồn hoa giấy và cục nóng điều hòa.
  - **Tường hông sát vách (`Party Walls`):** Trát phẳng sơn chống thấm tách biệt hoàn toàn với mặt tiền.
- **Hệ mái nhà chuẩn góc nhìn vệ tinh:**
  - **Mái ngói đỏ đất nung & Mái Thái giật cấp chữ A** hướng thẳng ra mặt phố kèm diềm mái sơn trắng.
  - **Mái tôn sóng chống nóng** (đỏ sẫm, xanh dương đậm, xanh rêu, xám bạc) lợp dốc thoát nước.
  - **Sân thượng lát gạch** có khung đà lam bê tông, tum thang, **bồn nước Inox Sơn Hà nằm ngang** và dàn **nước nóng năng lượng mặt trời Thái Dương Năng**.

### 3. 🌉 Công Trình Biểu Tượng & Danh Thắng 3D Đặc Trưng
- **Đà Nẵng:**
  - **Cầu Rồng** (vòm thép vàng uốn lượn, đầu & đuôi Rồng, hiệu ứng phun lửa và phun nước).
  - **Cầu Quay Sông Hàn** (tháp dây văng chữ A trên trụ tròn giữa sông) & **Cầu Trần Thị Lý** (trụ tháp nghiêng chữ Y đỏ).
  - **Trung tâm Hành chính Đà Nẵng** (tòa tháp tròn hình ngọn hải đăng kính xanh), **Novotel Danang Premier Han River**, **Azura Tower**, **Indochina Riverside Towers**.
  - **Tượng Cá Chép Hóa Rồng & Cầu Tình Yêu**, **Nhà thờ Chính tòa Đà Nẵng (Nhà thờ Con Gà)**, **Chợ Hàn**, **Bảo tàng Điêu khắc Chăm**.
- **Hà Nội & TP. Hồ Chí Minh:**
  - **Tháp Rùa Hồ Gươm**, **Tàu điện trên cao Cát Linh – Hà Đông**, **Bitexco Financial Tower** (sân đỗ trực thăng), **Landmark 81**.

### 4. 🌤️ Thời Gian Thực, Thời Tiết Động & Hiệu Năng 60 FPS
- **Chu kỳ Ngày / Đêm & Mặt trời thực tế:** Thanh trượt thời gian 24 giờ điều chỉnh góc chiếu nắng, bóng đổ thời gian thực, hoàng hôn/bình minh và ánh đèn đô thị ban đêm.
- **Thời tiết trực tuyến (Open-Meteo API):** Tự động đồng bộ thời tiết thực tế (Nắng, Nhiều mây, Sương mù, Mưa rơi 3D) kèm hệ thống âm thanh môi trường sống động.
- **Tối ưu hóa đồ họa 60 FPS:** Gộp hình học theo vật liệu (`mergeGeometries`) kết hợp `THREE.InstancedMesh` cho cây xanh, phương tiện giao thông và thiết bị sân thượng, giảm số lệnh vẽ (draw calls) từ hơn 20.000 xuống chỉ còn ~35–50 draw calls.

---

## 🛠️ Công Nghệ Sử Dụng

- **Frontend:** [React 18](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Tailwind CSS](https://tailwindcss.com/)
- **Đồ họa 3D:** [Three.js](https://threejs.org/) (`WebGLRenderer`, `ExtrudeGeometry`, `InstancedMesh`, `BufferGeometryUtils`, `PCFSoftShadowMap`)
- **Bản đồ 2D & Dữ liệu Không gian:** [Mapbox GL JS](https://docs.mapbox.com/mapbox-gl-js/) (Satellite Streets & Vector Tiles), OpenStreetMap Overpass API
- **Thời tiết & Địa lý:** Open-Meteo API, Browser Geolocation API, Mapbox Geocoding API
- **Công cụ Build:** [Vite](https://vitejs.dev/), [Lucide Icons](https://lucide.dev/)

---

## 📂 Cấu Trúc Thư Mục

```text
Map_3D/
├── index.html                  # Trang HTML chính & nạp CSS Mapbox GL
├── package.json                # Khai báo thư viện & scripts
├── tsconfig.json               # Cấu hình TypeScript
├── vite.config.ts              # Cấu hình Vite bundler
└── src/
    ├── main.tsx                # Điểm khởi chạy ứng dụng React
    ├── App.tsx                 # Bố cục chính: Bản đồ 2D (Trái) & Khung cảnh 3D (Phải)
    ├── index.css               # Tailwind CSS & tùy chỉnh giao diện
    ├── types.ts                # Định nghĩa kiểu dữ liệu (BuildingFeature, RoadFeature, CityModelData...)
    ├── components/
    │   ├── Map2DPanel.tsx      # Bản đồ vệ tinh 2D Mapbox, định vị GPS, tìm kiếm & khoanh vùng
    │   └── City3DViewport.tsx  # Khung nhìn 3D Three.js, điều khiển camera, thời gian & thời tiết
    ├── services/
    │   └── cityBuilder.ts      # Trích xuất dữ liệu Mapbox/OSM, phân tách nhà ống & tổng hợp đô thị
    └── utils/
        ├── geometryBuilder.ts  # Xây dựng hình học 3D tòa nhà, mái nhà Việt Nam, cầu & danh thắng
        └── soundEngine.ts      # Bộ tổng hợp âm thanh môi trường đô thị & thời tiết (Web Audio API)
```

---

## 🚀 Hướng Dẫn Cài Đặt & Chạy Dự Án

### 1. Yêu cầu hệ thống
- **Node.js** phiên bản `>= 18.0.0`
- **npm** hoặc **yarn**

### 2. Cài đặt thư viện
```bash
git clone https://github.com/levphuocthinh/Map_3D.git
cd Map_3D
npm install
```

### 3. Chạy môi trường phát triển (Development)
```bash
npm run dev
```
Sau khi chạy lệnh, mở trình duyệt tại địa chỉ `http://localhost:5173/`.

### 4. Đóng gói bản dựng (Production Build)
```bash
npm run build
npm run preview
```

---

## 🎮 Hướng Dẫn Điều Khiển Trong 3D

- **Chuột trái + Kéo:** Xoay góc nhìn camera 360° quanh thành phố.
- **Chuột phải + Kéo:** Di chuyển (Pan) tâm nhìn trên mặt phẳng bản đồ.
- **Con lăn chuột (Scroll):** Phóng to / Thu nhỏ chi tiết từng dãy phố.
- **Click vào Tòa nhà Lớn / Danh thắng:** Xem thẻ thông tin chi tiết chiều cao, số tầng và loại kiến trúc.
- **Thanh công cụ dưới cùng:** Điều chỉnh giờ trong ngày (`00:00 – 23:59`), bật/tắt luồng xe lưu thông, đổi thời tiết và chụp ảnh màn hình 3D.
