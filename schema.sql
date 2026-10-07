-- ==============================================================================
-- DATABASE SCHEMA CHO SÂN CẦU LÔNG OXI BADMINTON BIÊN HÒA (SUPABASE / POSTGRESQL)
-- Phiên bản Safe Re-run (Không bị lỗi khi chạy lại nhiều lần)
-- ==============================================================================

-- 1. BẢNG CÀI ĐẶT HỆ THỐNG & BẢNG GIÁ
CREATE TABLE IF NOT EXISTS oxi_settings (
    id TEXT PRIMARY KEY DEFAULT 'main_config',
    hotline TEXT DEFAULT '0839217679',
    bank_name TEXT DEFAULT 'VIB',
    bank_account_no TEXT DEFAULT '018412999',
    bank_account_name TEXT DEFAULT 'PHAN TRUNG KIEN',
    price_weekday_day INT DEFAULT 70000,
    price_weekday_night INT DEFAULT 100000,
    price_weekend INT DEFAULT 100000,
    deposit_percentage INT DEFAULT 50,
    admin_pin TEXT DEFAULT '0839',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Dữ liệu mặc định cho cài đặt
INSERT INTO oxi_settings (id) VALUES ('main_config')
ON CONFLICT (id) DO NOTHING;

-- 2. BẢNG HỘI VIÊN & TÍCH GIỜ (CRM LÔNG THỦ)
CREATE TABLE IF NOT EXISTS oxi_members (
    phone TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    total_hours INT DEFAULT 0,
    tier TEXT DEFAULT 'none',
    discount_rate NUMERIC DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Dữ liệu hội viên mẫu
INSERT INTO oxi_members (phone, full_name, total_hours, tier, discount_rate, notes) VALUES
('0839217679', 'Phan Trung Kiên', 24, 'gold', 0.05, 'Khách VIP, đánh khung tối T3-T5-T7'),
('0908123456', 'Nguyễn Văn Long', 36, 'platinum', 0.10, 'Nhóm công ty, thanh toán nhanh'),
('0912345678', 'Trần Minh Quân', 55, 'diamond', 0.20, 'VĐV phong trào, đánh đôi nam')
ON CONFLICT (phone) DO NOTHING;

-- 3. BẢNG ĐƠN ĐẶT SÂN
CREATE TABLE IF NOT EXISTS oxi_bookings (
    id TEXT PRIMARY KEY,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    court_id INT NOT NULL,
    court_name TEXT NOT NULL,
    booking_date DATE NOT NULL,
    time_slots INT[] NOT NULL,
    hours_label TEXT NOT NULL,
    base_total INT NOT NULL,
    discount_amount INT DEFAULT 0,
    deposit_amount INT NOT NULL,
    remaining_amount INT NOT NULL,
    status TEXT DEFAULT 'pending',
    payment_method TEXT DEFAULT 'vietqr_vib',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. BẢNG TRẠNG THÁI KHÓA KHUNG GIỜ SÂN (LIVE COURT SLOTS)
CREATE TABLE IF NOT EXISTS oxi_court_slots (
    id TEXT PRIMARY KEY,
    court_id INT NOT NULL,
    slot_date DATE NOT NULL,
    time_hour INT NOT NULL,
    status TEXT DEFAULT 'booked',
    booking_id TEXT REFERENCES oxi_bookings(id) ON DELETE SET NULL,
    locked_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 5. BẢNG ĐÁNH GIÁ & REVIEW
CREATE TABLE IF NOT EXISTS oxi_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_name TEXT NOT NULL,
    rating_court INT DEFAULT 5,
    rating_staff INT DEFAULT 5,
    comment TEXT,
    is_approved BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Dữ liệu review mẫu
INSERT INTO oxi_reviews (author_name, rating_court, rating_staff, comment, is_approved) VALUES
('Anh Hùng (Trảng Dài)', 5, 5, 'Thảm sân bám rất êm chân, trần cao thoáng mát không bị cản cầu.', true),
('Tuấn Badminton', 5, 5, 'Nhân viên hỗ trợ giữ xe và nước uống rất chu đáo. Đèn LED sáng chuẩn.', true),
('Hội Cầu Lông Biên Hòa', 5, 5, 'Sân tổ chức giải phong trào rất chuyên nghiệp, sẽ ủng hộ lâu dài.', true)
ON CONFLICT DO NOTHING;

-- 6. BẬT REALTIME AN TOÀN (Không báo lỗi nếu đã add)
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE oxi_settings;
  EXCEPTION WHEN others THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE oxi_members;
  EXCEPTION WHEN others THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE oxi_bookings;
  EXCEPTION WHEN others THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE oxi_court_slots;
  EXCEPTION WHEN others THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE oxi_reviews;
  EXCEPTION WHEN others THEN NULL;
  END;
END $$;

-- 7. CHÍNH SÁCH ROW LEVEL SECURITY (RLS) AN TOÀN
ALTER TABLE oxi_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read/Write Settings" ON oxi_settings;
CREATE POLICY "Public Read/Write Settings" ON oxi_settings FOR ALL USING (true);

ALTER TABLE oxi_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read/Write Members" ON oxi_members;
CREATE POLICY "Public Read/Write Members" ON oxi_members FOR ALL USING (true);

ALTER TABLE oxi_bookings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read/Write Bookings" ON oxi_bookings;
CREATE POLICY "Public Read/Write Bookings" ON oxi_bookings FOR ALL USING (true);

ALTER TABLE oxi_court_slots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read/Write Court Slots" ON oxi_court_slots;
CREATE POLICY "Public Read/Write Court Slots" ON oxi_court_slots FOR ALL USING (true);

ALTER TABLE oxi_reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read/Write Reviews" ON oxi_reviews;
CREATE POLICY "Public Read/Write Reviews" ON oxi_reviews FOR ALL USING (true);
