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
      // 商店页面
      'shop.breadcrumbHome': '首页',
      'shop.breadcrumbCurrent': '商店',
      'shop.title': '商店',
      'shop.wishlist': '我的收藏',
      'shop.itemCount': '{n} 件商品',
      'shop.featured': '当季主打',
      'shop.noProducts': '暂无精选商品',
      'shop.viewDetails': '查看完整详情 →',
      'shop.quantity': '数量',
      'shop.addToCart': '加入购物车',
      'shop.searchAll': '搜索全部商品，例如：茶、痛经、月舒贴',
      'shop.searchCategory': '搜索这个系列的商品',
      'shop.chatInput': '输入消息…',
      // 通用页面
      'page.queryOrder': '查询订单',
      'page.queryBooking': '查询预约',
      'page.onlineConsult': '在线咨询',
      'page.chattingWith': '正在与 {doctor} 对话',
      // 旅程卡片
      'journey.womens.title': '女性调理',
      'journey.womens.desc': '平衡，贯穿每一个周期。',
      'journey.slimming.title': '中医塑体',
      'journey.slimming.desc': '疏通气血，塑造轻盈体态。',
      'journey.beauty.title': '美容养颜',
      'journey.beauty.desc': '由内而外的光彩。',
      'journey.wellness.title': '日常养生',
      'journey.wellness.desc': '微小仪式，真实活力。',
      'journey.pain.title': '舒缓疼痛',
      'journey.pain.desc': '自在活动，畅快每一天。',
      'journey.sleep.title': '优质睡眠',
      'journey.sleep.desc': '睡得更深，醒得更轻盈。',
      'common.agreeSubmit': '同意并提交',
      'common.queryBooking': '查询此预约',
      'common.whatsappConsult': 'WhatsApp 咨询',
      'common.submitOrder': '提交订单',
      'common.viewDetail': '查看详情',
      'common.bookNow': '立即预约',
      'common.learnMore': '了解更多',
      'common.backToHome': '返回首页',
      'common.contactUs': '联系我们',
      'form.phone': '手机号',
      'form.name': '称呼',
      'form.selectArea': '请选择您所在的区域',
      'form.selectDoctor': '请选择医师',
      'form.selectDate': '请选择日期',
      'form.selectTime': '请选择时间',
      'form.notes': '备注',
      'form.email': '邮箱',
      'form.address': '地址',
      'area.johorBahru': '新山市区',
      'area.pasirGudang': '巴西古当',
      'area.tampoi': '淡杯',
      'area.kulai': '古来',
      'area.skudai': '士姑来',
      'area.mountAustin': '奥斯丁',
      'hint.afterArea': '选好区域后，下一步会为您显示这个区域可预约的医师',
      'hint.loading': '加载中，请稍候...',
      'hint.noResult': '暂无结果',
      'hint.required': '此为必填项',
      'journey.menopause': '更年期',
      'journey.hotFlashes': '潮热盗汗',
      'journey.benignLump': '良性增生结块',
      'journey.personalized': '个人定制',
      'journey.homeConsult': '居家会诊',
      'journey.followUp': '建议配合定期复查',
      'journey.ovarianMass': '卵巢部位常见的癥瘕积聚',
      'journey.nourishYin': '滋阴调和',
      'about.tcmMaster': '中医骨伤科学硕士',
      'about.tcmDoctor': '中医师',
      'about.personalizedFormula': '一人一方定制调理方案',
      'about.specializeMenopause': '擅长更年期不适',
      'about.formulaTested': '配方经过反复调试打磨',
      'about.persistence': '每一次坚持',
      'support.pregnancySafe': '孕期或哺乳期可以使用吗',
      'support.shippingFee': '运费',
      'support.returnPolicy': '退换政策',
      'support.consultDoctorFirst': '建议先咨询医师后再使用',
      'support.hygieneQuality': '从卫生与品质保障角度考虑',
      'support.saveOrderId': '建议在下单成功页面截图保存订单编号',
      'support.productIssue': '商品本身问题由我们承担',
      'support.orderQuestion': '有任何产品或订单上的疑问',
      'support.appointmentArrangement': '为保障各位客户的问诊安排',
      'support.cannotFind': '如果找不到了',
      'lang.zh': '中文',
    
      // 服务流程
      'process.eyebrow': '服务流程',
      'process.title': '简单5步流程',
      'process.sub': '从预约到跟进，让中医调理轻松无忧。',
      'process.step1.title': '预约',
      'process.step1.desc': '在线或通过WhatsApp选择您偏好的日期、时间和服务类型。',
      'process.step2.title': '医师上门',
      'process.step2.desc': '注册中医师按约定时间到达您家。',
      'process.step3.title': '诊断',
      'process.step3.desc': '全面咨询，包括脉诊、舌诊和健康评估。',
      'process.step4.title': '开方',
      'process.step4.desc': '根据您的具体情况定制个性化中药配方和治疗方案。',
      'process.step5.title': '后续跟进',
      'process.step5.desc': '我们跟进您的进展，并根据需要调整治疗方案以获得最佳效果。',

      // 页脚
      'footer.services': '服务项目',
      'footer.home_consult': '居家会诊',
      'footer.womens_care': '女性调理',
      'footer.beauty': '美容养颜',
      'footer.pain_relief': '止痛调理',
      'footer.herbal': '中药产品',
      'footer.quick_links': '快速链接',
      'footer.book': '预约咨询',
      'footer.shop': '商店',
      'footer.about': '关于我们',
      'footer.support': '支持中心',
      'footer.track_order': '订单追踪',
      'footer.track_booking': '预约追踪',
      'footer.contact': '联系我们',
      'footer.follow': '关注我们',
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
      'lang.zh': '中文',
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
      // Shop page
      'shop.breadcrumbHome': 'Home',
      'shop.breadcrumbCurrent': 'Shop',
      'shop.title': 'Shop',
      'shop.wishlist': 'My Wishlist',
      'shop.itemCount': '{n} items',
      'shop.featured': 'Seasonal Picks',
      'shop.noProducts': 'No featured products',
      'shop.viewDetails': 'View Full Details →',
      'shop.quantity': 'Quantity',
      'shop.addToCart': 'Add to Cart',
      'shop.searchAll': 'Search all products, e.g.: tea, menstrual pain',
      'shop.searchCategory': 'Search products in this category',
      'shop.chatInput': 'Type a message…',
      // Common pages
      'page.queryOrder': 'Track Order',
      'page.queryBooking': 'Track Booking',
      'page.onlineConsult': 'Online Consultation',
      'page.chattingWith': 'Chatting with {doctor}',
      // Journey cards
      'journey.womens.title': "Women's Care",
      'journey.womens.desc': 'Balance, through every cycle.',
      'journey.slimming.title': 'Body Shaping',
      'journey.slimming.desc': 'Unblock qi and blood, shape a lighter body.',
      'journey.beauty.title': 'Beauty & Skincare',
      'journey.beauty.desc': 'Radiance from within.',
      'journey.wellness.title': 'Daily Wellness',
      'journey.wellness.desc': 'Small rituals, real vitality.',
      'journey.pain.title': 'Pain Relief',
      'journey.pain.desc': 'Move freely, enjoy every day.',
      'journey.sleep.title': 'Quality Sleep',
      'journey.sleep.desc': 'Sleep deeper, wake lighter.',
      'common.agreeSubmit': 'Agree & Submit',
      'common.queryBooking': 'Query This Booking',
      'common.whatsappConsult': 'WhatsApp Consultation',
      'common.submitOrder': 'Submit Order',
      'common.viewDetail': 'View Details',
      'common.bookNow': 'Book Now',
      'common.learnMore': 'Learn More',
      'common.backToHome': 'Back to Home',
      'common.contactUs': 'Contact Us',
      'form.phone': 'Phone Number',
      'form.name': 'Name / Title',
      'form.selectArea': 'Please select your area',
      'form.selectDoctor': 'Please select a physician',
      'form.selectDate': 'Please select a date',
      'form.selectTime': 'Please select a time',
      'form.notes': 'Notes',
      'form.email': 'Email',
      'form.address': 'Address',
      'area.johorBahru': 'Johor Bahru City',
      'area.pasirGudang': 'Pasir Gudang',
      'area.tampoi': 'Tampoi',
      'area.kulai': 'Kulai',
      'area.skudai': 'Skudai',
      'area.mountAustin': 'Mount Austin',
      'hint.afterArea': 'After selecting an area, available physicians will be shown',
      'hint.loading': 'Loading, please wait...',
      'hint.noResult': 'No results found',
      'hint.required': 'This field is required',
      'journey.menopause': 'Menopause',
      'journey.hotFlashes': 'Hot Flashes & Night Sweats',
      'journey.benignLump': 'Benign Hyperplasia & Lumps',
      'journey.personalized': 'Personalized Care',
      'journey.homeConsult': 'Home Consultation',
      'journey.followUp': 'Recommended with regular follow-up',
      'journey.ovarianMass': 'Common ovarian masses and accumulations',
      'journey.nourishYin': 'Nourish Yin and Harmonize',
      'about.tcmMaster': 'Master of TCM Orthopedics',
      'about.tcmDoctor': 'TCM Physician',
      'about.personalizedFormula': 'Customized formula for each individual',
      'about.specializeMenopause': 'Specializes in menopausal discomfort',
      'about.formulaTested': 'Formulas经过反复调试打磨',
      'about.persistence': 'Every persistence',
      'support.pregnancySafe': 'Is it safe during pregnancy or breastfeeding?',
      'support.shippingFee': 'Shipping Fee',
      'support.returnPolicy': 'Return & Refund Policy',
      'support.consultDoctorFirst': 'Recommended to consult a physician before use',
      'support.hygieneQuality': 'From hygiene and quality assurance perspective',
      'support.saveOrderId': 'Recommended to screenshot and save the order number on the confirmation page',
      'support.productIssue': 'Product quality issues are borne by us',
      'support.orderQuestion': 'For any product or order questions',
      'support.appointmentArrangement': 'To ensure the consultation arrangement for all customers',
      'support.cannotFind': 'If you cannot find it',
      'lang.zh': '中文',
    
      // 服务流程
      'process.eyebrow': 'How It Works',
      'process.title': 'Simple 5-Step Process',
      'process.sub': 'From booking to follow-up, we make TCM care effortless.',
      'process.step1.title': 'Book Appointment',
      'process.step1.desc': 'Choose your preferred date, time, and service type online or via WhatsApp.',
      'process.step2.title': 'Practitioner Visits',
      'process.step2.desc': 'A licensed TCM practitioner arrives at your home at the scheduled time.',
      'process.step3.title': 'Diagnosis',
      'process.step3.desc': 'Comprehensive consultation including pulse reading, tongue analysis, and health assessment.',
      'process.step4.title': 'Prescription',
      'process.step4.desc': 'Personalized herbal formula and treatment plan tailored to your specific condition.',
      'process.step5.title': 'Follow-up Care',
      'process.step5.desc': 'We check on your progress and adjust the treatment plan as needed for optimal results.',

      // 页脚
      'footer.services': 'Services',
      'footer.home_consult': 'Home Consultation',
      'footer.womens_care': 'Women\'s Care',
      'footer.beauty': 'Beauty & Skincare',
      'footer.pain_relief': 'Pain Relief',
      'footer.herbal': 'Herbal Products',
      'footer.quick_links': 'Quick Links',
      'footer.book': 'Book Appointment',
      'footer.shop': 'Shop',
      'footer.about': 'About Us',
      'footer.support': 'Support',
      'footer.track_order': 'Track Order',
      'footer.track_booking': 'Track Booking',
      'footer.contact': 'Contact Us',
      'footer.follow': 'Follow Us',
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
      'lang.zh': '中文',
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
      // Halaman kedai
      'shop.breadcrumbHome': 'Laman Utama',
      'shop.breadcrumbCurrent': 'Kedai',
      'shop.title': 'Kedai',
      'shop.wishlist': 'Senarai Keinginan Saya',
      'shop.itemCount': '{n} produk',
      'shop.featured': 'Pilihan Musim',
      'shop.noProducts': 'Tiada produk pilihan',
      'shop.viewDetails': 'Lihat Butiran Penuh →',
      'shop.quantity': 'Kuantiti',
      'shop.addToCart': 'Tambah ke Troli',
      'shop.searchAll': 'Cari semua produk, cth: teh, sakit haid',
      'shop.searchCategory': 'Cari produk dalam kategori ini',
      'shop.chatInput': 'Taip mesej…',
      // Halaman umum
      'page.queryOrder': 'Jejak Pesanan',
      'page.queryBooking': 'Jejak Tempahan',
      'page.onlineConsult': 'Perundingan Dalam Talian',
      'page.chattingWith': 'Berbual dengan {doctor}',
      // Kad perjalanan
      'journey.womens.title': 'Penjagaan Wanita',
      'journey.womens.desc': 'Keseimbangan, sepanjang setiap kitaran.',
      'journey.slimming.title': 'Pembentukan Badan',
      'journey.slimming.desc': 'Buka qi dan darah, bentuk badan yang lebih ringan.',
      'journey.beauty.title': 'Kecantikan & Penjagaan Kulit',
      'journey.beauty.desc': 'Cahaya dari dalam.',
      'journey.wellness.title': 'Kesejahteraan Harian',
      'journey.wellness.desc': 'Ritual kecil, tenaga sebenar.',
      'journey.pain.title': 'Pelegaan Sakit',
      'journey.pain.desc': 'Bergerak bebas, nikmati setiap hari.',
      'journey.sleep.title': 'Tidur Berkualiti',
      'journey.sleep.desc': 'Tidur lebih lena, bangun lebih segar.',
      'common.agreeSubmit': 'Setuju & Hantar',
      'common.queryBooking': 'Cari Tempahan Ini',
      'common.whatsappConsult': 'Perundingan WhatsApp',
      'common.submitOrder': 'Hantar Pesanan',
      'common.viewDetail': 'Lihat Butiran',
      'common.bookNow': 'Tempah Sekarang',
      'common.learnMore': 'Ketahui Lebih Lanjut',
      'common.backToHome': 'Kembali ke Laman Utama',
      'common.contactUs': 'Hubungi Kami',
      'form.phone': 'Nombor Telefon',
      'form.name': 'Nama / Gelaran',
      'form.selectArea': 'Sila pilih kawasan anda',
      'form.selectDoctor': 'Sila pilih doktor',
      'form.selectDate': 'Sila pilih tarikh',
      'form.selectTime': 'Sila pilih masa',
      'form.notes': 'Catatan',
      'form.email': 'E-mel',
      'form.address': 'Alamat',
      'area.johorBahru': 'Bandar Johor Bahru',
      'area.pasirGudang': 'Pasir Gudang',
      'area.tampoi': 'Tampoi',
      'area.kulai': 'Kulai',
      'area.skudai': 'Skudai',
      'area.mountAustin': 'Mount Austin',
      'hint.afterArea': 'Selepas memilih kawasan, doktor yang tersedia akan dipaparkan',
      'hint.loading': 'Memuatkan, sila tunggu...',
      'hint.noResult': 'Tiada hasil dijumpai',
      'hint.required': 'Medan ini wajib diisi',
      'journey.menopause': 'Menopaus',
      'journey.hotFlashes': 'Rasa Panas & Berpeluh Malam',
      'journey.benignLump': 'Hiperplasia Benign & Ketulan',
      'journey.personalized': 'Penjagaan Peribadi',
      'journey.homeConsult': 'Perundingan Rumah',
      'journey.followUp': 'Disyorkan dengan susulan berkala',
      'journey.ovarianMass': 'Ketulan dan pengumpulan ovari yang biasa',
      'journey.nourishYin': 'Menyuburkan Yin dan Menyelaraskan',
      'about.tcmMaster': 'Sarjana Sains Ortopedik TCM',
      'about.tcmDoctor': 'Doktor TCM',
      'about.personalizedFormula': 'Formula tersuai untuk setiap individu',
      'about.specializeMenopause': 'Mengkhusus dalam ketidakselesaan menopaus',
      'about.formulaTested': 'Formula diuji dan diperhalusi berulang kali',
      'about.persistence': 'Setiap kegigihan',
      'support.pregnancySafe': 'Selamat digunakan semasa hamil atau menyusu?',
      'support.shippingFee': 'Yuran Penghantaran',
      'support.returnPolicy': 'Dasar Pulangan & Bayaran Balik',
      'support.consultDoctorFirst': 'Disyorkan berunding dengan doktor sebelum digunakan',
      'support.hygieneQuality': 'Dari perspektif kebersihan dan jaminan kualiti',
      'support.saveOrderId': 'Disyorkan membuat tangkapan skrin dan menyimpan nombor pesanan di halaman pengesahan',
      'support.productIssue': 'Isu kualiti produk ditanggung oleh kami',
      'support.orderQuestion': 'Untuk sebarang soalan produk atau pesanan',
      'support.appointmentArrangement': 'Bagi menjamin susunan perundingan semua pelanggan',
      'support.cannotFind': 'Jika anda tidak dapat mencarinya',
      'lang.zh': '中文',
    
      // 服务流程
      'process.eyebrow': 'Cara Kerja',
      'process.title': 'Proses 5 Langkah Mudah',
      'process.sub': 'Dari tempahan hingga susulan, kami memudahkan penjagaan TCM.',
      'process.step1.title': 'Tempa Janji',
      'process.step1.desc': 'Pilih tarikh, masa, dan jenis perkhidmatan pilihan anda dalam talian atau melalui WhatsApp.',
      'process.step2.title': 'Pengamal Berkunjung',
      'process.step2.desc': 'Pengamal TCM berlesen tiba di rumah anda pada masa yang dijadualkan.',
      'process.step3.title': 'Diagnosa',
      'process.step3.desc': 'Perundingan komprehensif termasuk pembacaan nadi, analisis lidah, dan penilaian kesihatan.',
      'process.step4.title': 'Preskripsi',
      'process.step4.desc': 'Formula herba peribadi dan pelan rawatan disesuaikan dengan keadaan khusus anda.',
      'process.step5.title': 'Penjagaan Susulan',
      'process.step5.desc': 'Kami memantau kemajuan anda dan menyesuaikan pelan rawatan mengikut keperluan untuk hasil optimum.',
}
  };

  // ========== 核心逻辑 ==========
  const STORAGE_KEY = 'vinath_lang';
  const LANGS = ['zh', 'en'];
  let currentLang = localStorage.getItem(STORAGE_KEY) || 'zh';

  function t(key) {
    return (I18N[currentLang] && I18N[currentLang][key]) ||
           (I18N.zh && I18N.zh[key]) || key;
  }

  function applyTranslations() {
    // 英文静态页面：内容已经是英文，不重复翻译
    if (window.VINATH_PAGE_LANG === 'en') return;
    
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
    // 自动翻译：扫描页面上所有中文文本，匹配翻译字典后自动替换
    autoTranslate();
  }

  // ========== 自动翻译（无需手动加 data-i18n） ==========
  // 构建反向字典：中文原文 -> key
  var reverseDict = null;
  function buildReverseDict() {
    if (reverseDict) return reverseDict;
    reverseDict = {};
    for (var key in I18N.zh) {
      if (I18N.zh.hasOwnProperty(key)) {
        var zhText = I18N.zh[key];
        // 只索引不含占位符的短文本
        if (zhText && zhText.length < 80 && zhText.indexOf('{') === -1) {
          reverseDict[zhText.trim()] = key;
        }
      }
    }
    return reverseDict;
  }

  function autoTranslate() {
    if (currentLang === 'zh') {
      // 切换回中文时，恢复被自动翻译的元素
      document.querySelectorAll('[data-i18n-auto]').forEach(function(el) {
        var original = el.getAttribute('data-i18n-original');
        if (original) {
          el.textContent = original;
        }
        el.removeAttribute('data-i18n-auto');
        el.removeAttribute('data-i18n-original');
      });
      return;
    }

    var dict = buildReverseDict();
    var count = 0;

    // 遍历所有元素，只处理纯文本节点（没有子元素的）
    var allElements = document.querySelectorAll('body *:not(script):not(style):not([data-i18n]):not([data-i18n-auto])');
    for (var i = 0; i < allElements.length; i++) {
      var el = allElements[i];
      // 跳过有子元素的容器
      if (el.children.length > 0) continue;
      // 跳过 input/textarea/option（这些由 data-i18n 处理）
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'OPTION') continue;
      // 跳过语言切换按钮
      if (el.classList && el.classList.contains('vinath-lang-btn')) continue;

      var text = el.textContent.trim();
      if (!text || text.length > 80) continue;

      var key = dict[text];
      if (key) {
        var translation = t(key);
        if (translation !== key && translation !== text) {
          // 保存原始中文文本，标记为自动翻译
          el.setAttribute('data-i18n-original', text);
          el.setAttribute('data-i18n-auto', key);
          el.textContent = translation;
          count++;
        }
      }
    }
  }

  // ========== API 自动翻译（MyMemory，免费无需密钥） ==========
  var translationCache = {};
  var CACHE_KEY = 'vinath_translation_cache';
  var apiQueue = [];
  var apiRunning = false;
  var API_CONCURRENCY = 2;
  var API_DELAY = 600;

  // 加载缓存
  try {
    var cached = localStorage.getItem(CACHE_KEY);
    if (cached) translationCache = JSON.parse(cached);
  } catch(e) {}

  function saveCache() {
    try {
      // 只保存最近1000条
      var keys = Object.keys(translationCache);
      if (keys.length > 1000) {
        var sorted = keys.sort(function(a,b) {
          return (translationCache[b].time || 0) - (translationCache[a].time || 0);
        });
        for (var i = 1000; i < sorted.length; i++) {
          delete translationCache[sorted[i]];
        }
      }
      localStorage.setItem(CACHE_KEY, JSON.stringify(translationCache));
    } catch(e) {}
  }

  function getCacheKey(text, lang) {
    return lang + ':' + text;
  }

  function translateWithAPI(text, targetLang, callback) {
    var cacheKey = getCacheKey(text, targetLang);
    if (translationCache[cacheKey]) {
      callback(translationCache[cacheKey].text);
      return;
    }

    // MyMemory API 语言代码
    var langMap = { 'en': 'en', 'bm': 'ms' };
    var apiLang = langMap[targetLang] || targetLang;

    apiQueue.push({ text: text, targetLang: targetLang, apiLang: apiLang, callback: callback });
    if (!apiRunning) processApiQueue();
  }

  function processApiQueue() {
    if (apiQueue.length === 0) { apiRunning = false; return; }
    apiRunning = true;

    var batch = apiQueue.splice(0, API_CONCURRENCY);
    var completed = 0;

    batch.forEach(function(item, idx) {
      setTimeout(function() {
        var url = 'https://api.mymemory.translated.net/get?q=' +
                  encodeURIComponent(item.text) +
                  '&langpair=zh|' + item.apiLang;

        var retryCount = 0;
        var maxRetries = 2;

        function doFetch() {
          fetch(url)
            .then(function(r) { return r.json(); })
            .then(function(data) {
              var translated = '';
              if (data && data.responseData && data.responseData.translatedText) {
                translated = data.responseData.translatedText;
                // 修复常见翻译问题
                translated = translated.replace(/&amp;/g, '&');
                translated = translated.replace(/&quot;/g, '"');
                translated = translated.replace(/&#39;/g, "'");
              }
              if (translated) {
                translationCache[getCacheKey(item.text, item.targetLang)] = {
                  text: translated,
                  time: Date.now()
                };
                saveCache();
                item.callback(translated);
              }
              completed++;
              if (completed === batch.length) {
                setTimeout(processApiQueue, API_DELAY);
              }
            })
            .catch(function() {
              if (retryCount < maxRetries) {
                retryCount++;
                setTimeout(doFetch, 1000 * retryCount);
              } else {
                completed++;
                if (completed === batch.length) {
                  setTimeout(processApiQueue, API_DELAY);
                }
              }
            });
        }
        doFetch();
      }, idx * API_DELAY);
    });
  }

  // 扩展 autoTranslate：不在字典中的中文文本，调用API翻译
  var originalAutoTranslate = autoTranslate;
  autoTranslate = function() {
    if (currentLang === 'zh') {
      // 恢复被API翻译的元素
      document.querySelectorAll('[data-i18n-api]').forEach(function(el) {
        var original = el.getAttribute('data-i18n-original');
        if (original) el.textContent = original;
        el.removeAttribute('data-i18n-api');
        el.removeAttribute('data-i18n-original');
      });
      originalAutoTranslate();
      return;
    }

    originalAutoTranslate();

    // 对剩余的中文文本调用API翻译
    setTimeout(function() {
      var allElements = document.querySelectorAll(
        'body *:not(script):not(style):not([data-i18n]):not([data-i18n-auto]):not([data-i18n-api])'
      );
      var toTranslate = [];

      for (var i = 0; i < allElements.length; i++) {
        var el = allElements[i];
        if (el.children.length > 0) continue;
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'OPTION') continue;
        if (el.classList && el.classList.contains('vinath-lang-btn')) continue;

        var text = el.textContent.trim();
        if (!text || text.length > 200 || text.length < 2) continue;
        // 只翻译包含中文的文本
        if (!/[\u4e00-\u9fa5]/.test(text)) continue;
        // 跳过纯数字、纯符号
        if (/^[\d\s\-\+\*\/\.\,\:\;\!\?\(\)\[\]\{\}]+$/.test(text)) continue;

        toTranslate.push({ el: el, text: text });
      }

      // 限制每次最多翻译60个元素
      toTranslate = toTranslate.slice(0, 60);

      toTranslate.forEach(function(item) {
        translateWithAPI(item.text, currentLang, function(translated) {
          if (translated && translated !== item.text) {
            item.el.setAttribute('data-i18n-original', item.text);
            item.el.setAttribute('data-i18n-api', 'true');
            item.el.textContent = translated;
          }
        });
      });
    }, 500);
  };

  function setLang(lang) {
    if (LANGS.indexOf(lang) === -1) return;
    currentLang = lang;
    localStorage.setItem(STORAGE_KEY, lang);
    
    // 方案C：子目录多语言 - 切换语言时跳转到对应版本
    var currentPath = window.location.pathname;
    var isEnPage = currentPath.indexOf('/en/') === 0;
    
    if (lang === 'en' && !isEnPage) {
      // 中文页面 -> 跳转到英文版本
      var enPath = '/en' + currentPath;
      if (currentPath === '/' || currentPath === '') enPath = '/en/';
      window.location.href = enPath;
      return;
    } else if (lang === 'zh' && isEnPage) {
      // 英文页面 -> 跳回中文版本
      var zhPath = currentPath.replace(/^\/en/, '');
      if (zhPath === '' || zhPath === '/') zhPath = '/';
      window.location.href = zhPath;
      return;
    }
    
    applyTranslations();
    // 延迟再执行一次，确保动态内容也被翻译
    scheduleAutoTranslate();
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

  // ========== MutationObserver：监听动态内容变化，自动重新翻译 ==========
  var observer = null;
  var translateTimer = null;
  var isTranslating = false;

  function scheduleAutoTranslate() {
    if (currentLang === 'zh') return;
    if (isTranslating) return;
    if (translateTimer) clearTimeout(translateTimer);
    translateTimer = setTimeout(function() {
      isTranslating = true;
      try {
        autoTranslate();
      } catch(e) {
        console.warn('autoTranslate error:', e);
      }
      isTranslating = false;
    }, 300);
  }

  function startObserver() {
    if (observer) return;
    if (!('MutationObserver' in window)) return;
    observer = new MutationObserver(function(mutations) {
      var needsTranslate = false;
      for (var i = 0; i < mutations.length; i++) {
        var m = mutations[i];
        if (m.type === 'childList' && m.addedNodes.length > 0) {
          // 检查是否有新的文本节点或包含中文的元素
          for (var j = 0; j < m.addedNodes.length; j++) {
            var node = m.addedNodes[j];
            if (node.nodeType === 1) { // Element
              if (node.textContent && /[\u4e00-\u9fa5]/.test(node.textContent)) {
                needsTranslate = true;
                break;
              }
            } else if (node.nodeType === 3) { // Text node
              if (node.textContent && /[\u4e00-\u9fa5]/.test(node.textContent)) {
                needsTranslate = true;
                break;
              }
            }
          }
        }
        if (needsTranslate) break;
      }
      if (needsTranslate) {
        scheduleAutoTranslate();
      }
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  // ========== 初始化 ==========
  var scrollTimer = null;
  function init() {
    createLangSwitcher();
    applyTranslations();
    startObserver();
    
    // 页面加载后多次触发翻译，确保动态内容都被翻译
    setTimeout(function() { scheduleAutoTranslate(); }, 1000);
    setTimeout(function() { scheduleAutoTranslate(); }, 3000);
    setTimeout(function() { scheduleAutoTranslate(); }, 5000);
    
    // 滚动时触发翻译（可见区域的新内容）
    window.addEventListener('scroll', function() {
      if (scrollTimer) clearTimeout(scrollTimer);
      scrollTimer = setTimeout(function() {
        scheduleAutoTranslate();
      }, 500);
    }, { passive: true });
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
    dict: I18N,
    refresh: function() { scheduleAutoTranslate(); }
  };
})();
