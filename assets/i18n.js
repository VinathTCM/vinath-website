/* ============================================================
 * VINATH TCM - 全站国际化 i18n
 * 语言：中文(zh) / 英文(en) / 马来语(bm)
 * 默认：中文
 * 用法：在元素上加 data-i18n="key"，JS 自动替换 textContent
 * ============================================================ */

(function() {
  'use strict';

  // ========== 翻译字典 ==========
  const I18N = {
    zh: {
      // 导航
      'nav.home': '首页',
      'nav.journeys': '健康旅程',
      'nav.shop': '商店',
      'nav.consult': '居家会诊',
      'nav.about': '关于我们',
      'nav.support': '支持中心',
      'nav.admin': '后台管理',
      // 页脚
      'footer.privacy': 'Privacy Policy',
      'footer.terms': 'Terms of Use',
      'footer.sales': 'Sales & Refund Policy',
      'footer.legal': 'Legal Notice',
      'footer.sitemap': 'Sitemap',
      'footer.rights': '版权所有',
      // 通用按钮
      'common.submit': '提交',
      'common.save': '保存',
      'common.cancel': '取消',
      'common.confirm': '确认',
      'common.delete': '删除',
      'common.edit': '编辑',
      'common.search': '搜索',
      'common.loading': '加载中...',
      'common.success': '成功',
      'common.error': '错误',
      'common.close': '关闭',
      'common.back': '返回',
      'common.next': '下一步',
      'common.prev': '上一步',
      'common.view': '查看',
      'common.print': '打印',
      'common.download': '下载',
      'common.upload': '上传',
      'common.all': '全部',
      'common.none': '无',
      'common.status': '状态',
      'common.date': '日期',
      'common.name': '姓名',
      'common.phone': '电话',
      'common.email': '邮箱',
      'common.address': '地址',
      'common.price': '价格',
      'common.quantity': '数量',
      'common.total': '总计',
      'common.action': '操作',
      'common.yes': '是',
      'common.no': '否',
      'common.required': '必填',
      'common.optional': '可选',
      // 语言切换
      'lang.label': '语言',
      'lang.zh': '中文',
      'lang.en': 'EN',
      'lang.bm': 'BM',
      // 首页
      'home.hero.title': 'VINATH TCM',
      'home.hero.subtitle': '传统中医 · 现代调理',
      'home.hero.cta': '开启你的健康旅程',
      'home.journeys.title': '选择你的旅程',
      'home.journeys.subtitle': '根据你的需求，找到最适合的调理方案',
      'home.consult.title': '居家会诊',
      'home.consult.subtitle': '注册中医师上门服务，足不出户享受专业调理',
      'home.consult.cta': '立即预约',
      'home.shop.title': '精选商城',
      'home.shop.subtitle': '道地药材，品质保证',
      'home.shop.cta': '前往商店',
      'home.about.title': '关于 VINATH',
      'home.about.cta': '了解更多',
      // 商店
      'shop.title': '商店',
      'shop.subtitle': '精选中医调理产品',
      'shop.addToCart': '加入购物车',
      'shop.buyNow': '立即购买',
      'shop.cart': '购物车',
      'shop.checkout': '结算',
      'shop.empty': '购物车是空的',
      'shop.continue': '继续购物',
      // 会诊
      'consult.title': '居家会诊',
      'consult.subtitle': '注册中医师上门服务',
      'consult.book': '立即预约',
      'consult.selectDoctor': '选择医师',
      'consult.selectDate': '选择日期',
      'consult.selectTime': '选择时段',
      'consult.yourInfo': '你的信息',
      'consult.agree': '我同意',
      'consult.submit': '提交预约',
      // 关于
      'about.title': '关于我们',
      'about.story': '品牌故事',
      'about.team': '医师团队',
      'about.license': '资质认证',
      // 旅程
      'journeys.title': '健康旅程',
      'journeys.subtitle': '选择适合你的调理方案',
      'journeys.womens': '女性调理',
      'journeys.slimming': '中医塑体',
      'journeys.beauty': '美容养颜',
      'journeys.wellness': '日常养生',
      'journeys.pain': '舒缓疼痛',
      'journeys.sleep': '优质睡眠',
      'journeys.start': '开启旅程',
      'journeys.learnMore': '了解更多',
      // 查询
      'query.order': '查询订单',
      'query.booking': '查询预约',
      'query.orderNumber': '订单编号',
      'query.bookingNumber': '预约编号',
      'query.phone': '联系电话',
      'query.search': '查询',
      'query.notFound': '未找到相关记录',
      // 支持
      'support.title': '支持中心',
      'support.faq': '常见问题',
      'support.contact': '联系我们',
      'support.whatsapp': 'WhatsApp 客服',
      // 后台
      'admin.title': '后台管理',
      'admin.orders': '订单管理',
      'admin.bookings': '预约管理',
      'admin.medical': '病历管理',
      'admin.products': '商品管理',
      'admin.content': '内容管理',
      'admin.reports': '报表',
      'admin.admins': '管理员管理',
      'admin.logout': '登出',
      'admin.login': '管理员登录',
      'admin.password': '密码',
      'admin.loginBtn': '登录',
      'shop.plaster': '膏药系列',
      'shop.tea': '茶饮系列',
      'shop.soak': '汤包系列',
      'shop.topical': '外用系列',
      'shop.all': '全部商品',
      'consult.personal': '个人定制',
      'consult.home': '居家会诊',
      'support.faq': '常见问题',
      'support.shipping': '配送与退换',
      'support.contact': '联系客服',
      'about.follow': '关注我们',
      'nav.searchPlaceholder': '搜索商品，例如：茶、痛经',
      'home.hero.eyebrow': '现代中医',
      'home.hero.cta1': '开启你的旅程',
      'home.hero.cta2': '探索产品',
      'home.vitals.journeys': '健康旅程',
      'home.vitals.licensed': '持证中医师',
      'home.vitals.ancient': '古法配方',
      'home.vitals.smallbatch': '小批量精制',
      'home.journeys.eyebrow': '你的旅程',
      'home.consult.eyebrow': '在线问诊 · 预约咨询',
      'home.consult.sub': '无论线上咨询还是居家会诊，都从读懂你此刻的身体开始。',
      'home.consult.tab': '相约',
      'home.consult.personalDesc': '根据体质与需求，量身定制专属方案。',
      'home.consult.homeDesc': '预约执业中医师，足不出户，收获健康。',
      'home.consult.slogan': '健康，本该简单 · Easy Health',
      'home.chat.title': '在线咨询',
      'home.chat.sub': '正在与 龚诗宏医师 对话',
      'home.chat.empty': '您好，有任何问题都可以在这里留言，我们会尽快回复您。',
    },
    en: {
      // Nav
      'nav.home': 'Home',
      'nav.journeys': 'Journeys',
      'nav.shop': 'Shop',
      'nav.consult': 'Home Consultation',
      'nav.about': 'About Us',
      'nav.support': 'Support',
      'nav.admin': 'Admin',
      // Footer
      'footer.privacy': 'Privacy Policy',
      'footer.terms': 'Terms of Use',
      'footer.sales': 'Sales & Refund Policy',
      'footer.legal': 'Legal Notice',
      'footer.sitemap': 'Sitemap',
      'footer.rights': 'All rights reserved',
      // Common buttons
      'common.submit': 'Submit',
      'common.save': 'Save',
      'common.cancel': 'Cancel',
      'common.confirm': 'Confirm',
      'common.delete': 'Delete',
      'common.edit': 'Edit',
      'common.search': 'Search',
      'common.loading': 'Loading...',
      'common.success': 'Success',
      'common.error': 'Error',
      'common.close': 'Close',
      'common.back': 'Back',
      'common.next': 'Next',
      'common.prev': 'Previous',
      'common.view': 'View',
      'common.print': 'Print',
      'common.download': 'Download',
      'common.upload': 'Upload',
      'common.all': 'All',
      'common.none': 'None',
      'common.status': 'Status',
      'common.date': 'Date',
      'common.name': 'Name',
      'common.phone': 'Phone',
      'common.email': 'Email',
      'common.address': 'Address',
      'common.price': 'Price',
      'common.quantity': 'Qty',
      'common.total': 'Total',
      'common.action': 'Action',
      'common.yes': 'Yes',
      'common.no': 'No',
      'common.required': 'Required',
      'common.optional': 'Optional',
      // Language
      'lang.label': 'Language',
      'lang.zh': '中',
      'lang.en': 'EN',
      'lang.bm': 'BM',
      // Home
      'home.hero.title': 'VINATH TCM',
      'home.hero.subtitle': 'Traditional Chinese Medicine · Modern Wellness',
      'home.hero.cta': 'Start Your Health Journey',
      'home.journeys.title': 'Choose Your Journey',
      'home.journeys.subtitle': 'Find the wellness plan that suits you best',
      'home.consult.title': 'Home Consultation',
      'home.consult.subtitle': 'Registered TCM physicians at your doorstep',
      'home.consult.cta': 'Book Now',
      'home.shop.title': 'Featured Shop',
      'home.shop.subtitle': 'Premium herbs, quality guaranteed',
      'home.shop.cta': 'Go to Shop',
      'home.about.title': 'About VINATH',
      'home.about.cta': 'Learn More',
      // Shop
      'shop.title': 'Shop',
      'shop.subtitle': 'Premium TCM wellness products',
      'shop.addToCart': 'Add to Cart',
      'shop.buyNow': 'Buy Now',
      'shop.cart': 'Cart',
      'shop.checkout': 'Checkout',
      'shop.empty': 'Your cart is empty',
      'shop.continue': 'Continue Shopping',
      // Consult
      'consult.title': 'Home Consultation',
      'consult.subtitle': 'Registered TCM physician home visit',
      'consult.book': 'Book Now',
      'consult.selectDoctor': 'Select Physician',
      'consult.selectDate': 'Select Date',
      'consult.selectTime': 'Select Time Slot',
      'consult.yourInfo': 'Your Information',
      'consult.agree': 'I agree',
      'consult.submit': 'Submit Booking',
      // About
      'about.title': 'About Us',
      'about.story': 'Our Story',
      'about.team': 'Physician Team',
      'about.license': 'Certifications',
      // Journeys
      'journeys.title': 'Health Journeys',
      'journeys.subtitle': 'Choose the wellness plan for you',
      'journeys.womens': "Women's Care",
      'journeys.slimming': 'Body Shaping',
      'journeys.beauty': 'Beauty & Skincare',
      'journeys.wellness': 'Daily Wellness',
      'journeys.pain': 'Pain Relief',
      'journeys.sleep': 'Quality Sleep',
      'journeys.start': 'Start Journey',
      'journeys.learnMore': 'Learn More',
      // Query
      'query.order': 'Track Order',
      'query.booking': 'Track Booking',
      'query.orderNumber': 'Order Number',
      'query.bookingNumber': 'Booking Number',
      'query.phone': 'Phone Number',
      'query.search': 'Search',
      'query.notFound': 'No records found',
      // Support
      'support.title': 'Support Center',
      'support.faq': 'FAQ',
      'support.contact': 'Contact Us',
      'support.whatsapp': 'WhatsApp Support',
      // Admin
      'admin.title': 'Admin Panel',
      'admin.orders': 'Orders',
      'admin.bookings': 'Bookings',
      'admin.medical': 'Medical Records',
      'admin.products': 'Products',
      'admin.content': 'Content',
      'admin.reports': 'Reports',
      'admin.admins': 'Admins',
      'admin.logout': 'Logout',
      'admin.login': 'Admin Login',
      'admin.password': 'Password',
      'admin.loginBtn': 'Login',
      'shop.plaster': 'Plaster Series',
      'shop.tea': 'Tea Series',
      'shop.soak': 'Herbal Soup Series',
      'shop.topical': 'Topical Series',
      'shop.all': 'All Products',
      'consult.personal': 'Personalized Care',
      'consult.home': 'Home Consultation',
      'support.faq': 'FAQ',
      'support.shipping': 'Shipping & Returns',
      'support.contact': 'Contact Support',
      'about.follow': 'Follow Us',
      'nav.searchPlaceholder': 'Search products, e.g.: tea, menstrual pain',
      'home.hero.eyebrow': 'Modern TCM',
      'home.hero.cta1': 'Start Your Journey',
      'home.hero.cta2': 'Explore Products',
      'home.vitals.journeys': 'Health Journeys',
      'home.vitals.licensed': 'Licensed Physicians',
      'home.vitals.ancient': 'Ancient Formulas',
      'home.vitals.smallbatch': 'Small Batch Crafted',
      'home.journeys.eyebrow': 'Your Journey',
      'home.consult.eyebrow': 'Online Consult · Booking',
      'home.consult.sub': 'Whether online consultation or home visit, it starts with understanding your body.',
      'home.consult.tab': 'Consult',
      'home.consult.personalDesc': 'Tailored exclusive plan based on your constitution and needs.',
      'home.consult.homeDesc': 'Book a licensed TCM physician, stay home and gain health.',
      'home.consult.slogan': 'Health, made simple · Easy Health',
      'home.chat.title': 'Online Consultation',
      'home.chat.sub': 'Chatting with Dr. Gong Shihong',
      'home.chat.empty': 'Hello, feel free to leave a message here, we will reply soon.',
    },
    bm: {
      // Nav
      'nav.home': 'Laman Utama',
      'nav.journeys': 'Perjalanan',
      'nav.shop': 'Kedai',
      'nav.consult': 'Perundingan Rumah',
      'nav.about': 'Tentang Kami',
      'nav.support': 'Sokongan',
      'nav.admin': 'Pentadbiran',
      // Footer
      'footer.privacy': 'Privacy Policy',
      'footer.terms': 'Terms of Use',
      'footer.sales': 'Sales & Refund Policy',
      'footer.legal': 'Legal Notice',
      'footer.sitemap': 'Sitemap',
      'footer.rights': 'Hak cipta terpelihara',
      // Common buttons
      'common.submit': 'Hantar',
      'common.save': 'Simpan',
      'common.cancel': 'Batal',
      'common.confirm': 'Sahkan',
      'common.delete': 'Padam',
      'common.edit': 'Edit',
      'common.search': 'Cari',
      'common.loading': 'Memuatkan...',
      'common.success': 'Berjaya',
      'common.error': 'Ralat',
      'common.close': 'Tutup',
      'common.back': 'Kembali',
      'common.next': 'Seterusnya',
      'common.prev': 'Sebelumnya',
      'common.view': 'Lihat',
      'common.print': 'Cetak',
      'common.download': 'Muat Turun',
      'common.upload': 'Muat Naik',
      'common.all': 'Semua',
      'common.none': 'Tiada',
      'common.status': 'Status',
      'common.date': 'Tarikh',
      'common.name': 'Nama',
      'common.phone': 'Telefon',
      'common.email': 'E-mel',
      'common.address': 'Alamat',
      'common.price': 'Harga',
      'common.quantity': 'Kuantiti',
      'common.total': 'Jumlah',
      'common.action': 'Tindakan',
      'common.yes': 'Ya',
      'common.no': 'Tidak',
      'common.required': 'Wajib',
      'common.optional': 'Pilihan',
      // Language
      'lang.label': 'Bahasa',
      'lang.zh': '中',
      'lang.en': 'EN',
      'lang.bm': 'BM',
      // Home
      'home.hero.title': 'VINATH TCM',
      'home.hero.subtitle': 'Perubatan Tradisional Cina · Kesejahteraan Moden',
      'home.hero.cta': 'Mula Perjalanan Kesihatan Anda',
      'home.journeys.title': 'Pilih Perjalanan Anda',
      'home.journeys.subtitle': 'Cari pelan kesejahteraan yang paling sesuai untuk anda',
      'home.consult.title': 'Perundingan Rumah',
      'home.consult.subtitle': 'Doktor TCM berdaftar di pintu rumah anda',
      'home.consult.cta': 'Tempah Sekarang',
      'home.shop.title': 'Kedai Pilihan',
      'home.shop.subtitle': 'Herba berkualiti, dijamin',
      'home.shop.cta': 'Pergi ke Kedai',
      'home.about.title': 'Tentang VINATH',
      'home.about.cta': 'Ketahui Lebih Lanjut',
      // Shop
      'shop.title': 'Kedai',
      'shop.subtitle': 'Produk kesejahteraan TCM premium',
      'shop.addToCart': 'Tambah ke Troli',
      'shop.buyNow': 'Beli Sekarang',
      'shop.cart': 'Troli',
      'shop.checkout': 'Bayar',
      'shop.empty': 'Troli anda kosong',
      'shop.continue': 'Terus Membeli-belah',
      // Consult
      'consult.title': 'Perundingan Rumah',
      'consult.subtitle': 'Lawatan rumah doktor TCM berdaftar',
      'consult.book': 'Tempah Sekarang',
      'consult.selectDoctor': 'Pilih Doktor',
      'consult.selectDate': 'Pilih Tarikh',
      'consult.selectTime': 'Pilih Slot Masa',
      'consult.yourInfo': 'Maklumat Anda',
      'consult.agree': 'Saya bersetuju',
      'consult.submit': 'Hantar Tempahan',
      // About
      'about.title': 'Tentang Kami',
      'about.story': 'Cerita Kami',
      'about.team': 'Pasukan Doktor',
      'about.license': 'Pensijilan',
      // Journeys
      'journeys.title': 'Perjalanan Kesihatan',
      'journeys.subtitle': 'Pilih pelan kesejahteraan untuk anda',
      'journeys.womens': 'Penjagaan Wanita',
      'journeys.slimming': 'Pembentukan Badan',
      'journeys.beauty': 'Kecantikan & Kulit',
      'journeys.wellness': 'Kesejahteraan Harian',
      'journeys.pain': 'Pelepasan Sakit',
      'journeys.sleep': 'Tidur Berkualiti',
      'journeys.start': 'Mula Perjalanan',
      'journeys.learnMore': 'Ketahui Lebih Lanjut',
      // Query
      'query.order': 'Jejak Pesanan',
      'query.booking': 'Jejak Tempahan',
      'query.orderNumber': 'Nombor Pesanan',
      'query.bookingNumber': 'Nombor Tempahan',
      'query.phone': 'Nombor Telefon',
      'query.search': 'Cari',
      'query.notFound': 'Tiada rekod ditemui',
      // Support
      'support.title': 'Pusat Sokongan',
      'support.faq': 'Soalan Lazim',
      'support.contact': 'Hubungi Kami',
      'support.whatsapp': 'Sokongan WhatsApp',
      // Admin
      'admin.title': 'Panel Pentadbiran',
      'admin.orders': 'Pesanan',
      'admin.bookings': 'Tempahan',
      'admin.medical': 'Rekod Perubatan',
      'admin.products': 'Produk',
      'admin.content': 'Kandungan',
      'admin.reports': 'Laporan',
      'admin.admins': 'Pentadbir',
      'admin.logout': 'Log Keluar',
      'admin.login': 'Log Masuk Pentadbir',
      'admin.password': 'Kata Laluan',
      'admin.loginBtn': 'Log Masuk',
      'shop.plaster': 'Siri Plaster',
      'shop.tea': 'Siri Teh',
      'shop.soak': 'Siri Sup Herba',
      'shop.topical': 'Siri Topikal',
      'shop.all': 'Semua Produk',
      'consult.personal': 'Penjagaan Peribadi',
      'consult.home': 'Perundingan Rumah',
      'support.faq': 'Soalan Lazim',
      'support.shipping': 'Penghantaran & Pulangan',
      'support.contact': 'Hubungi Sokongan',
      'about.follow': 'Ikuti Kami',
      'nav.searchPlaceholder': 'Cari produk, cth: teh, sakit haid',
      'home.hero.eyebrow': 'TCM Moden',
      'home.hero.cta1': 'Mula Perjalanan Anda',
      'home.hero.cta2': 'Terokai Produk',
      'home.vitals.journeys': 'Perjalanan Kesihatan',
      'home.vitals.licensed': 'Doktor Berlesen',
      'home.vitals.ancient': 'Formula Purba',
      'home.vitals.smallbatch': 'Dihasilkan Kumpulan Kecil',
      'home.journeys.eyebrow': 'Perjalanan Anda',
      'home.consult.eyebrow': 'Perundingan Dalam Talian · Tempahan',
      'home.consult.sub': 'Sama ada perundingan dalam talian atau lawatan rumah, ia bermula dengan memahami badan anda.',
      'home.consult.tab': 'Perundingan',
      'home.consult.personalDesc': 'Pelan eksklusif yang disesuaikan mengikut perlembagaan dan keperluan anda.',
      'home.consult.homeDesc': 'Tempah doktor TCM berlesen, tinggal di rumah dan perolehi kesihatan.',
      'home.consult.slogan': 'Kesihatan, dipermudahkan · Easy Health',
      'home.chat.title': 'Perundingan Dalam Talian',
      'home.chat.sub': 'Berbual dengan Dr. Gong Shihong',
      'home.chat.empty': 'Halo, sila tinggalkan mesej di sini, kami akan membalas tidak lama lagi.',
    }
  };

  // ========== 核心逻辑 ==========
  const STORAGE_KEY = 'vinath_lang';
  const LANGS = ['zh', 'en', 'bm'];
  let currentLang = localStorage.getItem(STORAGE_KEY) || 'zh';

  function t(key) {
    return (I18N[currentLang] && I18N[currentLang][key]) ||
           (I18N.zh && I18N.zh[key]) || key;
  }

  function applyTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(function(el) {
      var key = el.getAttribute('data-i18n');
      var translation = t(key);
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        el.placeholder = translation;
      } else if (el.tagName === 'OPTION') {
        el.textContent = translation;
      } else {
        el.textContent = translation;
      }
    });
    // data-i18n-placeholder: 专门用于 input/textarea 的 placeholder
    document.querySelectorAll('[data-i18n-placeholder]').forEach(function(el) {
      var key = el.getAttribute('data-i18n-placeholder');
      el.placeholder = t(key);
    });
    // 更新 html lang 属性
    document.documentElement.setAttribute('lang', currentLang);
    // 更新语言切换按钮状态
    updateLangSwitcher();
  }

  function setLang(lang) {
    if (LANGS.indexOf(lang) === -1) return;
    currentLang = lang;
    localStorage.setItem(STORAGE_KEY, lang);
    applyTranslations();
    // 触发自定义事件，方便页面监听
    document.dispatchEvent(new CustomEvent('vinath-lang-change', { detail: { lang: lang } }));
  }

  // ========== 语言切换 UI ==========
  function createLangSwitcher() {
    if (document.getElementById('vinath-lang-switcher')) return;

    var container = document.createElement('div');
    container.id = 'vinath-lang-switcher';
    container.style.cssText = [
      'position:fixed',
      'top:12px',
      'right:12px',
      'z-index:99999',
      'display:flex',
      'gap:2px',
      'background:rgba(255,255,255,0.95)',
      'border-radius:20px',
      'padding:3px',
      'box-shadow:0 2px 10px rgba(0,0,0,0.15)',
      'font-family:system-ui,-apple-system,sans-serif',
      'font-size:12px',
      'backdrop-filter:blur(8px)'
    ].join(';');

    LANGS.forEach(function(lang) {
      var btn = document.createElement('button');
      btn.className = 'vinath-lang-btn';
      btn.setAttribute('data-lang', lang);
      btn.textContent = t('lang.' + lang);
      btn.style.cssText = [
        'border:none',
        'background:transparent',
        'padding:4px 10px',
        'border-radius:15px',
        'cursor:pointer',
        'color:#666',
        'font-weight:500',
        'font-size:12px',
        'transition:all 0.2s'
      ].join(';');
      btn.addEventListener('click', function() {
        setLang(lang);
      });
      container.appendChild(btn);
    });

    document.body.appendChild(container);
    updateLangSwitcher();
  }

  function updateLangSwitcher() {
    var container = document.getElementById('vinath-lang-switcher');
    if (!container) return;
    container.querySelectorAll('.vinath-lang-btn').forEach(function(btn) {
      var lang = btn.getAttribute('data-lang');
      btn.textContent = t('lang.' + lang);
      if (lang === currentLang) {
        btn.style.background = '#1a5c3a';
        btn.style.color = '#fff';
        btn.style.fontWeight = '600';
      } else {
        btn.style.background = 'transparent';
        btn.style.color = '#666';
        btn.style.fontWeight = '500';
      }
    });
  }

  // ========== 初始化 ==========
  function init() {
    createLangSwitcher();
    applyTranslations();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // 暴露全局 API
  window.VinathI18n = {
    t: t,
    setLang: setLang,
    getLang: function() { return currentLang; },
    dict: I18N
  };
})();
