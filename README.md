# ADS - Oxi Badminton Biên Hòa (Hệ Thống Đặt Sân & Quản Lý)

Dự án Web đặt sân cầu lông trực tuyến & Bảng điều khiển Quản trị dành cho **Sân Cầu Lông Oxi Badminton - Biên Hòa**.

---

## 📌 Tính năng chính

### 1. Giao diện Đặt Sân (Khách hàng - `index.html` / `mockup.html`)
- **Bộ nhận diện thương hiệu:** Tone màu Volt / Xanh Neon thể thao kết hợp nền tối Dark Mode hiện đại chuẩn phong cách giải đấu BWF.
- **Mô phỏng 2 chế độ hiển thị (Simulator):**
  - Giao diện Điện thoại (Mobile Mockup 440px bo cong thực tế).
  - Giao diện Toàn màn hình (Full Responsive cho PC/Tablet).
- **Lưới chọn sân & Giờ chơi:**
  - Chọn ngày, chọn khung giờ trực quan (Sân 1, Sân 2, Sân 3...).
  - Tự động phân loại giá giờ thường / giờ vàng (cao điểm) & tính tổng tiền tức thì.
- **Hệ thống Hội viên & Chiết khấu:**
  - Tra cứu cấp độ hội viên (Gold, Platinum, Diamond) qua số điện thoại.
  - Tự động áp dụng chiết khấu giảm giá theo hạng thành viên.
- **Thanh toán VietQR tiện lợi:**
  - Tích hợp tạo mã QR thanh toán nhanh qua Ngân hàng số VIB kèm nội dung chuyển khoản tự động.
- **Album hình ảnh thực tế:**
  - Slider 7 hình ảnh cơ sở vật chất tiêu chuẩn BWF (`anh-san/`).
  - Bộ sưu tập 10 hình ảnh hoạt động & giải đấu phong trào (`anh-web/`).

### 2. Trang Quản Trị Chủ Sân (`admin.html`)
- **Bảng điều khiển (Dashboard):** Thống kê doanh thu, số lượt đặt trong ngày, tỷ lệ cọc và trạng thái sân.
- **Quản lý Đặt sân (Bookings):** Xác nhận cọc, duyệt đơn, hủy đơn, lọc theo trạng thái (Chờ cọc / Đã cọc / Đã hoàn thành).
- **Quản lý Hội viên (Members):** Thêm mới, chỉnh sửa tích lũy giờ, phân hạng thành viên.
- **Cấu hình Sân & Bảng giá:** Thay đổi linh hoạt giá theo khung giờ trong tuần / cuối tuần, tỷ lệ tiền cọc, số tài khoản ngân hàng VIB.

### 3. Động cơ Đồng bộ Dữ liệu (`oxi-db.js`)
- **Chế độ Cloud (Supabase):** Kết nối PostgreSQL và Realtime Subscription qua Supabase.
- **Chế độ Hybrid Local (Mặc định):** Đồng bộ tự động giữa các tab trình duyệt (khách đặt -> admin nhận tức thì) thông qua `BroadcastChannel` và `LocalStorage` mà không cần cấu hình backend phức tạp.

---

## 🛠 Công nghệ sử dụng
- **HTML5 & CSS3 modern**
- **Tailwind CSS (CDN)**
- **JavaScript ES6+ (Realtime Engine & BroadcastChannel)**
- **Supabase JS Client (Hỗ trợ PostgreSQL Cloud)**
- **Google Fonts:** Montserrat & Plus Jakarta Sans

---

## 🚀 Hướng dẫn sử dụng & Khởi chạy

1. **Mở giao diện người dùng:** Mở file [index.html](index.html) hoặc [mockup.html](mockup.html) trên trình duyệt.
2. **Mở bảng quản trị:** Mở file [admin.html](admin.html) trên trình duyệt (Mã PIN mặc định: `0839`).
3. **Mở cùng lúc 2 tab:** Khi khách đặt sân ở tab `index.html`, đơn sẽ lập tức xuất hiện theo thời gian thực trên tab `admin.html`.
4. **Deploy Vercel / GitHub Pages:**
   - Đã cấu hình sẵn file [vercel.json](vercel.json).
   - Website GitHub Pages trực tiếp: [https://phantrungkien1910-a11y.github.io/ADS/](https://phantrungkien1910-a11y.github.io/ADS/)
