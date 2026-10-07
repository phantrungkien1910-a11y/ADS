/**
 * ==============================================================================
 * OXI BADMINTON BIÊN HÒA - DATABASE & REALTIME ENGINE (SUPABASE + SMART FALLBACK)
 * ==============================================================================
 * Hỗ trợ 2 chế độ:
 * 1. CLOUD MODE (Khi có Supabase URL + Anon Key): Đồng bộ PostgreSQL Realtime qua mạng.
 * 2. HYBRID LOCAL MODE (Khi chưa tạo Supabase): Lưu trữ LocalStorage + BroadcastChannel
 *    cho phép 2 tab (index.html và admin.html) đồng bộ tức thì không cần mạng!
 */

const OXI_STORAGE_KEYS = {
  CONFIG: 'oxi_supabase_config',
  SETTINGS: 'oxi_settings_data',
  MEMBERS: 'oxi_members_data',
  BOOKINGS: 'oxi_bookings_data',
  SLOTS: 'oxi_slots_data',
  REVIEWS: 'oxi_reviews_data'
};

// Dữ liệu mẫu khởi tạo khi chạy lần đầu
const DEFAULT_SETTINGS = {
  id: 'main_config',
  hotline: '0839217679',
  bank_name: 'VIB',
  bank_account_no: '018412999',
  bank_account_name: 'PHAN TRUNG KIEN',
  price_weekday_day: 70000,
  price_weekday_night: 100000,
  price_weekend: 100000,
  deposit_percentage: 50,
  admin_pin: '0839'
};

const DEFAULT_MEMBERS = [
  { phone: '0839217679', full_name: 'Phan Trung Kiên', total_hours: 24, tier: 'gold', discount_rate: 0.05, notes: 'Khách VIP, đánh khung tối T3-T5-T7' },
  { phone: '0908123456', full_name: 'Nguyễn Văn Long', total_hours: 36, tier: 'platinum', discount_rate: 0.10, notes: 'Nhóm công ty, thanh toán nhanh' },
  { phone: '0912345678', full_name: 'Trần Minh Quân', total_hours: 55, tier: 'diamond', discount_rate: 0.20, notes: 'VĐV phong trào, đánh đôi nam' }
];

const DEFAULT_BOOKINGS = [
  {
    id: 'OXI-9421',
    customer_name: 'Nguyễn Văn Long',
    customer_phone: '0908123456',
    court_id: 2,
    court_name: 'Sân 2 (TIÊU CHUẨN BWF)',
    booking_date: new Date().toISOString().split('T')[0],
    time_slots: [17, 18],
    hours_label: '17h-19h (2 giờ)',
    base_total: 200000,
    discount_amount: 20000,
    deposit_amount: 90000,
    remaining_amount: 90000,
    status: 'pending',
    payment_method: 'vietqr_vib',
    created_at: new Date(Date.now() - 30 * 60000).toISOString()
  },
  {
    id: 'OXI-8812',
    customer_name: 'Trần Minh Quân',
    customer_phone: '0912345678',
    court_id: 1,
    court_name: 'Sân 1 (TIÊU CHUẨN BWF)',
    booking_date: new Date().toISOString().split('T')[0],
    time_slots: [19, 20],
    hours_label: '19h-21h (2 giờ)',
    base_total: 200000,
    discount_amount: 40000,
    deposit_amount: 80000,
    remaining_amount: 80000,
    status: 'approved',
    payment_method: 'vietqr_vib',
    created_at: new Date(Date.now() - 90 * 60000).toISOString()
  }
];

const DEFAULT_REVIEWS = [
  { id: '1', author_name: 'Anh Hùng (Trảng Dài)', rating_court: 5, rating_staff: 5, comment: 'Thảm sân bám rất êm chân, trần cao thoáng mát không bị cản cầu.', is_approved: true, created_at: new Date().toISOString() },
  { id: '2', author_name: 'Tuấn Badminton', rating_court: 5, rating_staff: 5, comment: 'Nhân viên hỗ trợ giữ xe và nước uống rất chu đáo. Đèn LED sáng chuẩn BWF.', is_approved: true, created_at: new Date().toISOString() },
  { id: '3', author_name: 'Hội Cầu Lông Biên Hòa', rating_court: 5, rating_staff: 5, comment: 'Sân tổ chức giải phong trào rất chuyên nghiệp, sẽ ủng hộ lâu dài.', is_approved: true, created_at: new Date().toISOString() }
];

class OxiDatabase {
  constructor() {
    this.supabase = null;
    this.useSupabase = false;
    this.listeners = [];
    this.broadcastChannel = null;

    if (typeof BroadcastChannel !== 'undefined') {
      try {
        this.broadcastChannel = new BroadcastChannel('oxi_badminton_realtime');
        this.broadcastChannel.onmessage = (event) => {
          this._notifyListeners(event.data);
        };
      } catch (e) {
        console.warn('BroadcastChannel not supported', e);
      }
    }

    // Lắng nghe qua storage event (tab khác cập nhật)
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key && e.key.startsWith('oxi_')) {
          this._notifyListeners({ type: 'storage_sync', key: e.key });
        }
      });
    }

    this._initLocalStorageDefaults();
  }

  async init() {
    const config = this.getSupabaseConfig();
    if (config.url && config.key && window.supabase) {
      try {
        this.supabase = window.supabase.createClient(config.url, config.key);
        // Test query
        const { error } = await this.supabase.from('oxi_settings').select('id').limit(1);
        if (!error) {
          this.useSupabase = true;
          console.log('⚡ [OXI DB] Kết nối Supabase Cloud Realtime thành công!');
          this._subscribeSupabaseRealtime();
          return { success: true, mode: 'cloud' };
        } else {
          console.warn('⚠️ [OXI DB] Lỗi Supabase:', error.message);
        }
      } catch (err) {
        console.warn('⚠️ [OXI DB] Không thể kết nối Supabase:', err);
      }
    }
    
    console.log('📦 [OXI DB] Đang chạy chế độ Local Database Realtime (Smart LocalStorage + BroadcastChannel)');
    return { success: true, mode: 'local' };
  }

  getSupabaseConfig() {
    try {
      const raw = localStorage.getItem(OXI_STORAGE_KEYS.CONFIG);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.url && parsed.key) return parsed;
      }
      // Thông tin Supabase Cloud chính thức của Oxi Badminton
      return {
        url: 'https://vcpqhsvedjsojbafjkao.supabase.co',
        key: 'sb_publishable_Ds202Mulh6DzYsfy_atd3w_r_H1Mllh'
      };
    } catch {
      return {
        url: 'https://vcpqhsvedjsojbafjkao.supabase.co',
        key: 'sb_publishable_Ds202Mulh6DzYsfy_atd3w_r_H1Mllh'
      };
    }
  }

  async saveSupabaseConfig(url, key) {
    localStorage.setItem(OXI_STORAGE_KEYS.CONFIG, JSON.stringify({ url: url.trim(), key: key.trim() }));
    return await this.init();
  }

  isCloudMode() {
    return this.useSupabase;
  }

  onRealtimeEvent(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  _notifyListeners(event) {
    this.listeners.forEach(cb => {
      try { cb(event); } catch (e) { console.error(e); }
    });
  }

  _broadcast(type, payload) {
    const event = { type, payload, timestamp: Date.now() };
    this._notifyListeners(event);
    if (this.broadcastChannel) {
      try { this.broadcastChannel.postMessage(event); } catch (e) {}
    }
  }

  _subscribeSupabaseRealtime() {
    if (!this.supabase) return;
    this.supabase
      .channel('oxi_realtime_all')
      .on('postgres_changes', { event: '*', schema: 'public' }, (payload) => {
        this._notifyListeners({
          type: 'supabase_change',
          table: payload.table,
          eventType: payload.eventType,
          new: payload.new,
          old: payload.old
        });
      })
      .subscribe();
  }

  _initLocalStorageDefaults() {
    if (!localStorage.getItem(OXI_STORAGE_KEYS.SETTINGS)) {
      localStorage.setItem(OXI_STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
    }
    if (!localStorage.getItem(OXI_STORAGE_KEYS.MEMBERS)) {
      localStorage.setItem(OXI_STORAGE_KEYS.MEMBERS, JSON.stringify(DEFAULT_MEMBERS));
    }
    if (!localStorage.getItem(OXI_STORAGE_KEYS.BOOKINGS)) {
      localStorage.setItem(OXI_STORAGE_KEYS.BOOKINGS, JSON.stringify(DEFAULT_BOOKINGS));
    }
    if (!localStorage.getItem(OXI_STORAGE_KEYS.REVIEWS)) {
      localStorage.setItem(OXI_STORAGE_KEYS.REVIEWS, JSON.stringify(DEFAULT_REVIEWS));
    }
    if (!localStorage.getItem(OXI_STORAGE_KEYS.SLOTS)) {
      // Khởi tạo các slot mẫu cho hôm nay
      const todayStr = new Date().toISOString().split('T')[0];
      const initialSlots = {
        [`${todayStr}_2_17`]: { court_id: 2, slot_date: todayStr, time_hour: 17, status: 'booked', booking_id: 'OXI-9421' },
        [`${todayStr}_2_18`]: { court_id: 2, slot_date: todayStr, time_hour: 18, status: 'booked', booking_id: 'OXI-9421' },
        [`${todayStr}_1_19`]: { court_id: 1, slot_date: todayStr, time_hour: 19, status: 'booked', booking_id: 'OXI-8812' },
        [`${todayStr}_1_20`]: { court_id: 1, slot_date: todayStr, time_hour: 20, status: 'booked', booking_id: 'OXI-8812' }
      };
      localStorage.setItem(OXI_STORAGE_KEYS.SLOTS, JSON.stringify(initialSlots));
    }
  }

  // ================= 1. SETTINGS & CONFIG =================
  async getSettings() {
    if (this.useSupabase) {
      const { data, error } = await this.supabase.from('oxi_settings').select('*').eq('id', 'main_config').single();
      if (!error && data) return data;
    }
    try {
      return JSON.parse(localStorage.getItem(OXI_STORAGE_KEYS.SETTINGS)) || DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  }

  async updateSettings(newSettings) {
    const current = await this.getSettings();
    const merged = { ...current, ...newSettings, updated_at: new Date().toISOString() };

    if (this.useSupabase) {
      await this.supabase.from('oxi_settings').upsert(merged);
    }
    localStorage.setItem(OXI_STORAGE_KEYS.SETTINGS, JSON.stringify(merged));
    this._broadcast('settings_updated', merged);
    return merged;
  }

  // ================= 2. MEMBERS & CRM =================
  async getMembers() {
    if (this.useSupabase) {
      const { data, error } = await this.supabase.from('oxi_members').select('*').order('total_hours', { ascending: false });
      if (!error && data) return data;
    }
    try {
      return JSON.parse(localStorage.getItem(OXI_STORAGE_KEYS.MEMBERS)) || [];
    } catch {
      return [];
    }
  }

  async getMemberByPhone(phone) {
    const cleanPhone = (phone || '').trim().replace(/[^0-9]/g, '');
    if (!cleanPhone) return null;

    if (this.useSupabase) {
      const { data } = await this.supabase.from('oxi_members').select('*').eq('phone', cleanPhone).maybeSingle();
      if (data) return data;
    }

    const members = await this.getMembers();
    return members.find(m => m.phone === cleanPhone) || null;
  }

  calculateTier(hours) {
    if (hours >= 50) return { tier: 'diamond', discountRate: 0.20, label: 'Kim Cương (-20%)', nextHours: 0, nextLabel: 'Đạt hạng cao nhất' };
    if (hours >= 30) return { tier: 'platinum', discountRate: 0.10, label: 'Bạch Kim (-10%)', nextHours: 50 - hours, nextLabel: 'Kim Cương (-20%)' };
    if (hours >= 20) return { tier: 'gold', discountRate: 0.05, label: 'Hạng Vàng (-5%)', nextHours: 30 - hours, nextLabel: 'Bạch Kim (-10%)' };
    return { tier: 'none', discountRate: 0, label: 'Khách Thường (0%)', nextHours: 20 - hours, nextLabel: 'Hạng Vàng (-5%)' };
  }

  async saveMember(memberData) {
    const tierInfo = this.calculateTier(memberData.total_hours || 0);
    const member = {
      phone: memberData.phone.trim().replace(/[^0-9]/g, ''),
      full_name: memberData.full_name,
      total_hours: parseInt(memberData.total_hours, 10) || 0,
      tier: tierInfo.tier,
      discount_rate: tierInfo.discountRate,
      notes: memberData.notes || '',
      created_at: memberData.created_at || new Date().toISOString()
    };

    if (this.useSupabase) {
      await this.supabase.from('oxi_members').upsert(member);
    }

    const members = (await this.getMembers()).filter(m => m.phone !== member.phone);
    members.unshift(member);
    localStorage.setItem(OXI_STORAGE_KEYS.MEMBERS, JSON.stringify(members));
    this._broadcast('member_updated', member);
    return member;
  }

  async addMemberHours(phone, additionalHours) {
    let member = await this.getMemberByPhone(phone);
    if (!member) {
      member = { phone, full_name: 'Hội viên mới', total_hours: 0 };
    }
    member.total_hours = (member.total_hours || 0) + additionalHours;
    return await this.saveMember(member);
  }

  // ================= 3. BOOKINGS & ORDER MANAGEMENT =================
  async getBookings() {
    if (this.useSupabase) {
      const { data, error } = await this.supabase.from('oxi_bookings').select('*').order('created_at', { ascending: false });
      if (!error && data) return data;
    }
    try {
      return JSON.parse(localStorage.getItem(OXI_STORAGE_KEYS.BOOKINGS)) || [];
    } catch {
      return [];
    }
  }

  async createBooking(bookingData) {
    const id = bookingData.id || `OXI-${Math.floor(1000 + Math.random() * 9000)}`;
    const booking = {
      id,
      customer_name: bookingData.customer_name,
      customer_phone: bookingData.customer_phone,
      court_id: parseInt(bookingData.court_id, 10),
      court_name: bookingData.court_name,
      booking_date: bookingData.booking_date,
      time_slots: bookingData.time_slots,
      hours_label: bookingData.hours_label,
      base_total: parseInt(bookingData.base_total, 10),
      discount_amount: parseInt(bookingData.discount_amount || 0, 10),
      deposit_amount: parseInt(bookingData.deposit_amount, 10),
      remaining_amount: parseInt(bookingData.remaining_amount, 10),
      status: bookingData.status || 'pending',
      payment_method: bookingData.payment_method || 'vietqr_vib',
      notes: bookingData.notes || '',
      created_at: new Date().toISOString()
    };

    if (this.useSupabase) {
      await this.supabase.from('oxi_bookings').insert(booking);
    }

    const bookings = await this.getBookings();
    bookings.unshift(booking);
    localStorage.setItem(OXI_STORAGE_KEYS.BOOKINGS, JSON.stringify(bookings));

    // Khóa các slot tương ứng trong bảng slots
    for (const hour of booking.time_slots) {
      await this.lockSlot({
        court_id: booking.court_id,
        slot_date: booking.booking_date,
        time_hour: hour,
        status: 'booked',
        booking_id: booking.id,
        locked_reason: `${booking.customer_name} (${booking.customer_phone})`
      });
    }

    this._broadcast('booking_created', booking);
    return booking;
  }

  async updateBookingStatus(id, newStatus, extraNotes = '') {
    const bookings = await this.getBookings();
    const idx = bookings.findIndex(b => b.id === id);
    if (idx === -1) return null;

    bookings[idx].status = newStatus;
    if (extraNotes) {
      bookings[idx].notes = extraNotes;
    }

    if (this.useSupabase) {
      await this.supabase.from('oxi_bookings').update({ status: newStatus, notes: bookings[idx].notes }).eq('id', id);
    }

    localStorage.setItem(OXI_STORAGE_KEYS.BOOKINGS, JSON.stringify(bookings));

    // Nếu đơn bị hủy, tự động mở khóa các slot
    if (newStatus === 'cancelled') {
      const b = bookings[idx];
      for (const hour of b.time_slots) {
        await this.unlockSlot(b.court_id, b.booking_date, hour);
      }
    }

    // Nếu đơn hoàn tất (đã đánh xong và thu đủ tiền), tự động cộng giờ cho hội viên
    if (newStatus === 'completed') {
      const b = bookings[idx];
      const hoursPlayed = (b.time_slots || []).length;
      if (hoursPlayed > 0 && b.customer_phone) {
        await this.addMemberHours(b.customer_phone, hoursPlayed);
      }
    }

    this._broadcast('booking_status_updated', bookings[idx]);
    return bookings[idx];
  }

  // ================= 4. COURT SLOTS (LIVE SCHEDULE MATRIX) =================
  async getCourtSlots(dateStr) {
    if (this.useSupabase) {
      const { data, error } = await this.supabase.from('oxi_court_slots').select('*').eq('slot_date', dateStr);
      if (!error && data) {
        const map = {};
        data.forEach(s => {
          map[`${s.slot_date}_${s.court_id}_${s.time_hour}`] = s;
        });
        return map;
      }
    }

    try {
      const allSlots = JSON.parse(localStorage.getItem(OXI_STORAGE_KEYS.SLOTS)) || {};
      const filtered = {};
      Object.keys(allSlots).forEach(k => {
        if (allSlots[k].slot_date === dateStr) {
          filtered[k] = allSlots[k];
        }
      });
      return filtered;
    } catch {
      return {};
    }
  }

  async lockSlot(slotData) {
    const slotKey = `${slotData.slot_date}_${slotData.court_id}_${slotData.time_hour}`;
    const slotObj = {
      id: slotKey,
      court_id: parseInt(slotData.court_id, 10),
      slot_date: slotData.slot_date,
      time_hour: parseInt(slotData.time_hour, 10),
      status: slotData.status || 'locked',
      booking_id: slotData.booking_id || null,
      locked_reason: slotData.locked_reason || 'Chủ sân khóa',
      created_at: new Date().toISOString()
    };

    if (this.useSupabase) {
      await this.supabase.from('oxi_court_slots').upsert(slotObj);
    }

    const allSlots = JSON.parse(localStorage.getItem(OXI_STORAGE_KEYS.SLOTS)) || {};
    allSlots[slotKey] = slotObj;
    localStorage.setItem(OXI_STORAGE_KEYS.SLOTS, JSON.stringify(allSlots));
    this._broadcast('slot_locked', slotObj);
    return slotObj;
  }

  async unlockSlot(courtId, dateStr, hour) {
    const slotKey = `${dateStr}_${courtId}_${hour}`;

    if (this.useSupabase) {
      await this.supabase.from('oxi_court_slots').delete().eq('id', slotKey);
    }

    const allSlots = JSON.parse(localStorage.getItem(OXI_STORAGE_KEYS.SLOTS)) || {};
    delete allSlots[slotKey];
    localStorage.setItem(OXI_STORAGE_KEYS.SLOTS, JSON.stringify(allSlots));
    this._broadcast('slot_unlocked', { slotKey, courtId, dateStr, hour });
    return true;
  }

  // ================= 5. REVIEWS =================
  async getReviews() {
    if (this.useSupabase) {
      const { data, error } = await this.supabase.from('oxi_reviews').select('*').order('created_at', { ascending: false });
      if (!error && data) return data;
    }
    try {
      return JSON.parse(localStorage.getItem(OXI_STORAGE_KEYS.REVIEWS)) || DEFAULT_REVIEWS;
    } catch {
      return DEFAULT_REVIEWS;
    }
  }

  async submitReview(reviewData) {
    const review = {
      id: 'rev_' + Date.now(),
      author_name: reviewData.author_name || 'Lông thủ Biên Hòa',
      rating_court: parseInt(reviewData.rating_court || 5, 10),
      rating_staff: parseInt(reviewData.rating_staff || 5, 10),
      comment: reviewData.comment || '',
      is_approved: true,
      created_at: new Date().toISOString()
    };

    if (this.useSupabase) {
      await this.supabase.from('oxi_reviews').insert(review);
    }

    const reviews = await this.getReviews();
    reviews.unshift(review);
    localStorage.setItem(OXI_STORAGE_KEYS.REVIEWS, JSON.stringify(reviews));
    this._broadcast('review_submitted', review);
    return review;
  }
}

// Khởi tạo Global Singleton Instance
window.OxiDB = new OxiDatabase();
