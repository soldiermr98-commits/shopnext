// ===== CONFIGURATION & PERSISTENCE =====
// Server-side SQLite Database Layer powered by sql.js with filesystem persistence and repository pattern

import fs from 'fs';
import path from 'path';
import initSqlJs, { Database } from 'sql.js';
import bcrypt from 'bcryptjs';
import { randomBytes, randomUUID } from 'node:crypto';

const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(process.cwd(), 'data'));
const DB_FILE = path.join(DATA_DIR, 'digistyle.db');

let db: Database | null = null;

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true, mode: 0o700 });
}

// Atomic replacement avoids a partially truncated main file; errors are never acknowledged as success.
export function saveDatabase(): void {
  if (!db) throw new Error('Database is not initialized.');
  const temporary = `${DB_FILE}.${randomUUID()}.tmp`;
  let fd: number | undefined;
  try {
    fd = fs.openSync(temporary, 'wx', 0o600);
    fs.writeFileSync(fd, Buffer.from(db.export()));
    fs.fsyncSync(fd);
    fs.closeSync(fd); fd = undefined;
    fs.renameSync(temporary, DB_FILE);
  } catch {
    if (fd !== undefined) { try { fs.closeSync(fd); } catch {} }
    try { fs.unlinkSync(temporary); } catch {}
    throw new Error('Database persistence failed.');
  }
}

// A failed export restores the previous in-memory image too, preventing phantom commits.
// This is a containment measure, NOT the transactional order-core replacement in Phase B.
export function mutateDatabase<T>(mutation: (database: Database) => T): T {
  const current = getDb();
  const before = current.export();
  try {
    const value = mutation(current);
    saveDatabase();
    return value;
  } catch (err) {
    current.close();
    db = new (current.constructor as new (data: Uint8Array) => Database)(before);
    throw err;
  }
}

export function getDb(): Database {
  if (!db) {
    throw new Error('Database is not initialized yet. Call initDatabase() first.');
  }
  return db;
}

export async function initDatabase(): Promise<Database> {
  if (db) return db;

  const SQL = await initSqlJs();

  if (fs.existsSync(DB_FILE)) {
    try {
      const fileBuffer = fs.readFileSync(DB_FILE);
      db = new SQL.Database(fileBuffer);
      console.log('✓ SQLite database loaded from disk.');
    } catch (e) {
      console.warn('Could not load existing DB file, creating fresh database...', e);
      db = new SQL.Database();
    }
  } else {
    db = new SQL.Database();
    console.log('✓ Initialized new in-memory SQLite database.');
  }

  // Create Schema Tables
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT UNIQUE NOT NULL,
      email TEXT,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL,
      avatar TEXT,
      national_code TEXT,
      is_gold_member INTEGER DEFAULT 0,
      club_points INTEGER DEFAULT 0,
      wallet_balance INTEGER DEFAULT 0,
      must_change_password INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS addresses (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      recipient_name TEXT NOT NULL,
      recipient_phone TEXT NOT NULL,
      province TEXT NOT NULL,
      city TEXT NOT NULL,
      postal_code TEXT NOT NULL,
      street_address TEXT NOT NULL,
      unit TEXT,
      is_default INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      parent_id TEXT,
      image TEXT,
      icon TEXT,
      description TEXT,
      order_index INTEGER DEFAULT 0,
      featured INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS brands (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      logo TEXT,
      origin_country TEXT,
      is_official INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      sku TEXT UNIQUE NOT NULL,
      brand TEXT NOT NULL,
      brand_id TEXT,
      category_ids TEXT NOT NULL,
      type TEXT NOT NULL,
      price INTEGER NOT NULL,
      sale_price INTEGER,
      discount_percent INTEGER,
      stock INTEGER NOT NULL,
      low_stock_threshold INTEGER DEFAULT 5,
      rating REAL DEFAULT 5.0,
      reviews_count INTEGER DEFAULT 0,
      short_description TEXT,
      full_description TEXT NOT NULL,
      main_image TEXT NOT NULL,
      gallery_images TEXT NOT NULL,
      video_url TEXT,
      status TEXT NOT NULL,
      featured INTEGER DEFAULT 0,
      tags TEXT NOT NULL,
      attributes TEXT NOT NULL,
      specifications TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS product_variants (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      sku TEXT NOT NULL,
      color_name TEXT,
      color_hex TEXT,
      size TEXT,
      price INTEGER NOT NULL,
      sale_price INTEGER,
      stock INTEGER NOT NULL,
      image TEXT
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      order_number TEXT UNIQUE NOT NULL,
      tracking_code TEXT NOT NULL,
      postal_barnameh TEXT,
      user_id TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      customer_national_code TEXT,
      shipping_address TEXT NOT NULL,
      status TEXT NOT NULL,
      items TEXT NOT NULL,
      items_count INTEGER NOT NULL,
      subtotal INTEGER NOT NULL,
      items_discount INTEGER NOT NULL,
      coupon_code TEXT,
      coupon_discount INTEGER DEFAULT 0,
      shipping_fee INTEGER DEFAULT 0,
      shipping_method_name TEXT NOT NULL,
      shipping_method_id TEXT NOT NULL,
      delivery_date_slot TEXT NOT NULL,
      vat_amount INTEGER DEFAULT 0,
      total_paid INTEGER NOT NULL,
      payment_method TEXT NOT NULL,
      payment_method_name TEXT NOT NULL,
      payment_gateway TEXT,
      payment_rrn TEXT,
      payment_card_mask TEXT,
      is_paid INTEGER DEFAULT 0,
      notes TEXT,
      requires_official_tax_invoice INTEGER DEFAULT 0,
      invoice_serial TEXT,
      tax_ref_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS coupons (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      type TEXT NOT NULL,
      value INTEGER NOT NULL,
      min_order_amount INTEGER DEFAULT 0,
      max_discount_amount INTEGER,
      usage_limit INTEGER,
      used_count INTEGER DEFAULT 0,
      expires_at TEXT,
      is_active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS blog_posts (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      cover_image TEXT NOT NULL,
      excerpt TEXT NOT NULL,
      content TEXT NOT NULL,
      author TEXT NOT NULL,
      read_time TEXT NOT NULL,
      category TEXT NOT NULL,
      tags TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS banners (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      image TEXT NOT NULL,
      link TEXT NOT NULL,
      subtitle TEXT,
      active INTEGER DEFAULT 1,
      order_index INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS activity_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      user_name TEXT NOT NULL,
      user_role TEXT NOT NULL,
      action TEXT NOT NULL,
      module TEXT NOT NULL,
      details TEXT NOT NULL,
      ip_address TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      order_number TEXT NOT NULL,
      gateway TEXT NOT NULL,
      amount INTEGER NOT NULL,
      authority TEXT,
      rrn TEXT,
      ref_id TEXT,
      card_mask TEXT,
      status TEXT NOT NULL,
      raw_response TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS return_requests (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      order_number TEXT NOT NULL,
      user_id TEXT NOT NULL,
      items TEXT NOT NULL,
      action_type TEXT NOT NULL,
      pickup_method TEXT NOT NULL,
      pickup_address TEXT NOT NULL,
      pickup_date_slot TEXT NOT NULL,
      refund_destination TEXT NOT NULL,
      bank_card_mask TEXT,
      bank_iban TEXT,
      total_refund_amount INTEGER NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  db.run(`CREATE TABLE IF NOT EXISTS auth_sessions (
    id TEXT PRIMARY KEY NOT NULL, user_id TEXT NOT NULL,
    refresh_hash TEXT NOT NULL, expires_at INTEGER NOT NULL
  ); CREATE INDEX IF NOT EXISTS auth_sessions_user ON auth_sessions(user_id);`);

  // Check if seed is needed
  const userCount = db.exec("SELECT COUNT(*) as count FROM users")[0]?.values[0][0] || 0;
  if (userCount === 0) {
    console.log('Seeding initial realistic Persian database data...');
    await seedDatabase(db);
    saveDatabase();
    console.log('✓ Database seeded successfully.');
  }

  return db;
}

// ===== SEED SCRIPT (Phase 2) =====
async function seedDatabase(database: Database): Promise<void> {
  const initialPassword = process.env.ADMIN_INITIAL_PASSWORD;
  if (!initialPassword || initialPassword.length < 14 || Buffer.byteLength(initialPassword) > 72) {
    throw new Error('A fresh database requires ADMIN_INITIAL_PASSWORD (14–72 bytes); change it on first login.');
  }
  const adminPasswordHash = await bcrypt.hash(initialPassword, 12);
  // Sample customer accounts have unknowable random passwords, never a shared default.
  const userPasswordHash = await bcrypt.hash(randomBytes(48).toString('base64url'), 12);

  // 1. Bootstrapped admin; access is restricted until password change.
  database.run(
    `INSERT INTO users (id, name, phone, email, password_hash, role, national_code, is_gold_member, club_points, wallet_balance, must_change_password, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      'usr-admin',
      'مدیر ارشد سامانه',
      'admin',
      'admin@digistyle.ir',
      adminPasswordHash,
      'super_admin',
      '0012345678',
      1,
      1000,
      10000000,
      1, // Must change password on first login
      new Date().toISOString(),
    ]
  );

  // 2. Primary Customer matching Stitch Designs: سهراب مظفری (09123456789)
  database.run(
    `INSERT INTO users (id, name, phone, email, password_hash, role, national_code, is_gold_member, club_points, wallet_balance, must_change_password, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      'usr-sohrab',
      'سهراب مظفری',
      '09123456789',
      'sohrab.mozaffari@gmail.com',
      userPasswordHash,
      'customer',
      '0083459126',
      1, // Gold member
      248, // 248 points from design
      1250000, // 1,250,000 تومان wallet
      0,
      '2024-01-15T10:00:00Z',
    ]
  );

  // 8 more realistic Persian customers
  const sampleCustomers = [
    { id: 'usr-3', name: 'مریم رضایی', phone: '09121112233', email: 'm.rezaei@yahoo.com', wallet: 450000, points: 120, gold: 0 },
    { id: 'usr-4', name: 'علی‌رضا محمدی', phone: '09124445566', email: 'alireza.m@gmail.com', wallet: 890000, points: 190, gold: 1 },
    { id: 'usr-5', name: 'سارا تهرانی', phone: '09351239876', email: 'sara.tehrani@gmail.com', wallet: 0, points: 45, gold: 0 },
    { id: 'usr-6', name: 'حمید کمالی', phone: '09127778899', email: 'h.kamali@chmail.ir', wallet: 2100000, points: 310, gold: 1 },
    { id: 'usr-7', name: 'نیلوفر افشار', phone: '09363334455', email: 'niloufar.a@gmail.com', wallet: 600000, points: 80, gold: 0 },
    { id: 'usr-8', name: 'پویا صادقی', phone: '09192223344', email: 'pouya.sadeghi@gmail.com', wallet: 150000, points: 25, gold: 0 },
    { id: 'usr-9', name: 'الهام سعادت', phone: '09126667788', email: 'elham.saadat@gmail.com', wallet: 1400000, points: 220, gold: 1 },
    { id: 'usr-10', name: 'امیرحسین پارسا', phone: '09305556677', email: 'ah.parsa@gmail.com', wallet: 350000, points: 60, gold: 0 },
  ];

  for (const c of sampleCustomers) {
    database.run(
      `INSERT INTO users (id, name, phone, email, password_hash, role, national_code, is_gold_member, club_points, wallet_balance, must_change_password, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        c.id,
        c.name,
        c.phone,
        c.email,
        userPasswordHash,
        'customer',
        '00' + Math.floor(10000000 + Math.random() * 90000000),
        c.gold,
        c.points,
        c.wallet,
        0,
        '2024-02-01T12:00:00Z',
      ]
    );
  }

  // Addresses for Sohrab Mozaffari (Matching Stitch design screens)
  database.run(
    `INSERT INTO addresses (id, user_id, title, recipient_name, recipient_phone, province, city, postal_code, street_address, unit, is_default)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      'addr-1',
      'usr-sohrab',
      'دفتر مرکزی (ونک)',
      'سهراب مظفری',
      '09123456789',
      'تهران',
      'تهران',
      '۱۴۵۱۱-۱۹۹۴۶',
      'تهران، خیابان ولیعصر، بالاتر از میدان ونک، برج نگین، طبقه ۸',
      'واحد ۳۲',
      1,
    ]
  );

  database.run(
    `INSERT INTO addresses (id, user_id, title, recipient_name, recipient_phone, province, city, postal_code, street_address, unit, is_default)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      'addr-2',
      'usr-sohrab',
      'منزل (سعادت‌آباد)',
      'مریم مظفری',
      '09351234567',
      'تهران',
      'تهران',
      '۱۱۳۴۵-۱۹۸۸۲',
      'تهران، سعادت‌آباد، میدان کاج، خیابان سرو غربی، کوچه ارغوان',
      'پلاک ۱۲',
      0,
    ]
  );

  // 8 Categories
  const categories = [
    { id: 'cat-men', title: 'پوشاک مردانه', slug: 'men', icon: 'man', order: 1, featured: 1 },
    { id: 'cat-women', title: 'پوشاک زنانه', slug: 'women', icon: 'woman', order: 2, featured: 1 },
    { id: 'cat-coats', title: 'کت و پالتو', slug: 'coats', parentId: 'cat-men', icon: 'dry_cleaning', order: 3, featured: 1 },
    { id: 'cat-shirts', title: 'پیراهن و تی‌شرت', slug: 'shirts', parentId: 'cat-men', icon: 'checkroom', order: 4, featured: 0 },
    { id: 'cat-jeans', title: 'شلوار جین و کتان', slug: 'pants', parentId: 'cat-men', icon: 'styler', order: 5, featured: 0 },
    { id: 'cat-shoes', title: 'کیف و کفش چرم', slug: 'shoes-bags', icon: 'footwear', order: 6, featured: 1 },
    { id: 'cat-accessories', title: 'اکسسوری و شال', slug: 'accessories', icon: 'watch', order: 7, featured: 1 },
    { id: 'cat-winter', title: 'کالکشن زمستان و فوتر', slug: 'winter-collection', icon: 'ac_unit', order: 8, featured: 1 },
  ];

  for (const cat of categories) {
    database.run(
      `INSERT INTO categories (id, title, slug, parent_id, image, icon, description, order_index, featured)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        cat.id,
        cat.title,
        cat.slug,
        cat.parentId || null,
        null,
        cat.icon,
        `مجموعه برگزیده ${cat.title} با ضمانت اصالت ۱۰۰٪`,
        cat.order,
        cat.featured,
      ]
    );
  }

  // Brands
  const brands = [
    { id: 'b-zara', name: 'زارا (Zara)', slug: 'zara', country: 'اسپانیا' },
    { id: 'b-mango', name: 'مانگو (Mango)', slug: 'mango', country: 'اسپانیا' },
    { id: 'b-mashhad', name: 'چرم مشهد', slug: 'mashhad-leather', country: 'ایران' },
    { id: 'b-patan', name: 'پاتن جامه', slug: 'patan-jameh', country: 'ایران' },
    { id: 'b-dorsa', name: 'چرم درسا (Dorsa)', slug: 'dorsa', country: 'ایران' },
    { id: 'b-massimo', name: 'ماسیمو دوتی (Massimo Dutti)', slug: 'massimo-dutti', country: 'ایتالیا' },
    { id: 'b-koton', name: 'کوتون (Koton)', slug: 'koton', country: 'ترکیه' },
    { id: 'b-pierre', name: 'پیر کاردین (Pierre Cardin)', slug: 'pierre-cardin', country: 'فرانسه' },
  ];

  for (const b of brands) {
    database.run(
      `INSERT INTO brands (id, name, slug, logo, origin_country, is_official)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [b.id, b.name, b.slug, null, b.country, 1]
    );
  }

  // 40 Products (with realistic variants and hotlinked images from the user's design files)
  const productData = [
    // 1. پالتو پشمی دوطرفه فوتر کلاسیک مدل ۲۰۲۵ (From Stitch design)
    {
      id: 'prod-1',
      title: 'پالتو پشمی دوطرفه فوتر کلاسیک مدل ۲۰۲۵',
      slug: 'double-breasted-wool-fouter-coat-2025',
      sku: 'VST-CL-4801',
      brand: 'زارا (Zara)',
      brandId: 'b-zara',
      categoryIds: JSON.stringify(['cat-men', 'cat-coats', 'cat-winter']),
      type: 'variable',
      price: 3200000,
      salePrice: 2400000,
      discountPercent: 25,
      stock: 2,
      lowStockThreshold: 3,
      rating: 4.8,
      reviewsCount: 124,
      shortDescription: 'پالتوی دوطرفه فوتر کلاسیک تولید شده از ۱۰۰٪ پشم طبیعی مرینوس با آستر تمام ابریشم ضدالکتریسیته.',
      fullDescription: 'این پالتوی دوطرفه (Double-Breasted) با الهام از خطوط طراحی متقارن خیاطی‌های سنتی ایتالیا و متریال درجه یک اسپانیایی تولید گردیده است. تراکم بالای پارچه فوتر ۱۰۰٪ طبیعی سبب حفظ حرارت مطلوب بدن در سردترین روزهای زمستان می‌گردد بدون آنکه وزن اضافی بر شانه‌های شما تحمیل کند.',
      mainImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCKyyLWggWCe-CKyfifTQeBV-Bn1g2BPVPzjrJXgqGBpKtijzaGSsjj7DhE35xSAcP-X2SLBZTOwxuMsiCiS4Y2WB3uaTR7oR-d_uUmpJkrhUvglQjDjIqhbuMUf3oBdX8P13JGrr0gDg2RMq3tOcBnpC-o7TzFVho2B1WyAwkQVl3APSmX4CExxoy18jvbX4UL3lkIwAH42K3fqOmaRzYTtiqpeDV9GINTEBON9ufBDNyetQkFdHex0w',
      galleryImages: JSON.stringify([
        'https://lh3.googleusercontent.com/aida-public/AB6AXuDFx_qOtQHWYgjDde85LK6RaBPz_kjTuoSFYeh2aVELFmtSo4rE7s-TDYggnP0dzQ_LJlxlZO3tlyXTAIDoTTswF-8pR_I540UCZhLt5K7YPR5lBHwaTQPfmc3zJM8I84gMads9hEsRRpLRQMHBj8iIlR6Vsh85Ocf08VyrlNj4guvaxxes-3ABBiKixcIqUD-NVwLj11umrrwueb-Z-N635H6hSKfxGoNMOKWJiEF241TrhI59sAMnfA',
        'https://lh3.googleusercontent.com/aida-public/AB6AXuAexdlVV_x31f5LkpoIibYJ-jcJe9SUIkSaKigQ4FfXyQWMVFHLWTUyWkaSHGk6KqP1pUNPEG2sP5m2P3GmfHwc1GC09dlgohsqXLqFu5iBIOdLX57OKuNeXaghwyiGeUJ9oQmjIdB5-3j1tb2OYDUnob8Y7blQR-iy1rAefCaTDKN8TtyqNC4DcquIs1eLh6OdLwsJw6U7AEi3cdYeSjhi2D2YDGKahOP-EsDFRRcafmHQatKGOsMnhA',
        'https://lh3.googleusercontent.com/aida-public/AB6AXuDefxjvKV18Wyi_D00YInsRXHBabP8BDJcxdm6Jbm0fpgCysu6JrgGNAxAoPz1bUor6WEOum-HwOikZnRUWgu2eS9HVq3vbo7SLoHd76ngPYYUzBkHwhZesa24AkHghX-Kvrafqi5Qn9WybxfJ3W3ATuLyvwxvg3__d-0Cyzyih5wwGaPnyzMk8RLkiKZbQGlqx81J56dSt1UD_Ix45lmHgWfPxrkJTLVrZoPZFbGRpnxu6HmN36zrGdg',
      ]),
      status: 'published',
      featured: 1,
      tags: JSON.stringify(['پالتو', 'فوتر', 'زمستانه', 'زارا', 'مجلسی']),
      attributes: JSON.stringify({
        colors: [
          { name: 'سرمه‌ای تیره', hex: '#1e293b' },
          { name: 'مشکی ذغالی', hex: '#18181b' },
          { name: 'شتری کلاسیک', hex: '#b4906a' },
          { name: 'طوسی ملانژ', hex: '#64748b' },
        ],
        sizes: ['S', 'M', 'L', 'XL'],
        material: '۱۰۰٪ پشم فوتر متراکم سوپر ۱۲۰',
        collar: 'برگردان انگلیسی دوطرفه',
        season: 'پاییز و زمستان',
        countryOfOrigin: 'اسپانیا',
      }),
      specifications: JSON.stringify([
        { group: 'مشخصات پارچه', key: 'جنس پارچه', value: '۱۰۰٪ پشم فوتر متراکم با درجه لطافت سوپر ۱۲۰' },
        { group: 'مشخصات پارچه', key: 'طرح و بافت', value: 'ساده کلاسیک بدون پرزدهی با گرماژ ۶۵۰ گرم بر مترمربع' },
        { group: 'ابعاد و تن‌خور', key: 'قد لباس', value: 'میدی (زیر زانو - حدود ۱۱۰ سانتی‌متر برای سایز L)' },
        { group: 'جزئیات ساختاری', key: 'تعداد جیب', value: '۲ عدد جیب فیلتابی پاکتی خارجی + ۲ عدد جیب داخلی دکمه‌دار' },
        { group: 'جزئیات ساختاری', key: 'جنس آستر داخلی', value: 'پلی‌استر و ویسکوز تنفس‌پذیر با بافت ژاکارد اختصاصی' },
        { group: 'اصالت و تولید', key: 'کشور سازنده', value: 'طراحی اسپانیا، دوخت تحت لیسانس در ترکیه' },
      ]),
    },
    // 2. کفش کتانی چرم طبیعی اسپرت ارگونومیک (From Stitch design)
    {
      id: 'prod-2',
      title: 'کفش کتانی چرم طبیعی اسپرت ارگونومیک',
      slug: 'ergonomic-genuine-leather-sneakers',
      sku: 'VST-SH-1092',
      brand: 'کوتون (Koton)',
      brandId: 'b-koton',
      categoryIds: JSON.stringify(['cat-men', 'cat-shoes']),
      type: 'variable',
      price: 1980000,
      salePrice: 1683000,
      discountPercent: 15,
      stock: 8,
      lowStockThreshold: 4,
      rating: 4.6,
      reviewsCount: 51,
      shortDescription: 'کتانی سبک و ارگونومیک با چرم ۱۰۰٪ طبیعی گاوی، کفی طبی مموری فوم و زیره سبک ضدلغزش.',
      fullDescription: 'کفش کتانی روزمره طراحی شده برای ایستادن و پیاده‌روی‌های طولانی با قالب کاملا منطبق بر ساختار قوس پا.',
      mainImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD_BrusloBIxWl9QbQlMv8UcxFzIQELTXKpK37ZRuEkM7L2Nzynt92YTpRWUi0pn_QsjWzVEmHaR4p5zAjJzcx2ild8yE_XmSVBuaPesh-2kiuBE5SzmDYAXq6KwAuOneNCKwTyZqXGdUKHzmkXmWLUWvxSdxPiqXBg5hRPtAOZiBMvQDDTZwKuuZQp2q3rFUH0GdrAeUMtERg3Y8MR7AMDlg6WTiLc9_V30dAETAVT8uV5WwUWNbJZzQ',
      galleryImages: JSON.stringify([
        'https://lh3.googleusercontent.com/aida-public/AB6AXuBENoXAxlZW0glyFMONqe0ze8OV2carEZZhtStiaK5YP-344NgSdQCmtuITyw9NbKWj9Tqm9FAtdSyOiY8oOjrM8xa7B0MZJGBlKamsCbm-fibO1Yu1q58N6vMUCyT1Q-95PIzoGPaBOYapY0hoPsZpNW_7bM94s3t4aP_xknwh6TNHHkIFv7S1AJIP5EQS-sAC-2oavj_wKLjpvGRg-VLmQnabhxjx2eo01Ax5yrMJZUUDsIEnNuKgLg',
        'https://lh3.googleusercontent.com/aida-public/AB6AXuCaaRi04mBk2rt7-nNgUKEcmmyfcnc5YUnzygVtAWMUZbitS7MjqWI-ZLqXsAqL5x5tqNeFnBBx9114ydRqgLIGhAsQJuxGamFHtRDP9YDuZufYJTXTKN_H-mnT2P4F13e1oyMoGayFR0nq4H3MxxIVkb8CWsiFIJy7_RmyJDE3YpEUoMup3iE0ZHfrOOrYESAHIOyDY7EyPIoFGp5hKexEZ9XYnX4PFEbY_sK-l7kUf28Lv_IhTrNJLg',
      ]),
      status: 'published',
      featured: 1,
      tags: JSON.stringify(['کتانی', 'چرم', 'طبی', 'اسپرت']),
      attributes: JSON.stringify({
        colors: [
          { name: 'سفید شیری', hex: '#ffffff' },
          { name: 'کرم روشن', hex: '#f4ecd8' },
          { name: 'مشکی مات', hex: '#18181b' },
        ],
        sizes: ['۴۰', '۴۱', '۴۲', '۴۳', '۴۴'],
        material: 'چرم گاوی درجه یک با آستر تنفس‌پذیر',
      }),
      specifications: JSON.stringify([
        { group: 'مشخصات کلی', key: 'جنس رویه', value: 'چرم طبیعی گاوی مات' },
        { group: 'مشخصات کلی', key: 'کفی کفش', value: 'طبی ارگونومیک مموری‌فوم لاتکس' },
        { group: 'مشخصات کلی', key: 'نوع زیره', value: 'پلی‌اورتان سبک PU ضدسایش' },
      ]),
    },
    // 3. شال و روسری کشمیر طرح‌دار لطیف پاییزه (From Stitch design)
    {
      id: 'prod-3',
      title: 'شال و روسری کشمیر طرح‌دار لطیف پاییزه',
      slug: 'soft-autumn-cashmere-patterned-scarf',
      sku: 'VST-AC-7734',
      brand: 'مانگو (Mango)',
      brandId: 'b-mango',
      categoryIds: JSON.stringify(['cat-accessories', 'cat-winter']),
      type: 'simple',
      price: 840000,
      salePrice: 756000,
      discountPercent: 10,
      stock: 12,
      lowStockThreshold: 3,
      rating: 4.7,
      reviewsCount: 56,
      shortDescription: 'بافته شده از لطیف‌ترین الیاف کشمیر با نقوش الهام‌گرفته از هنر سنتی نگارگری خزان.',
      fullDescription: 'شال شیک و لطیف کشمیر مناسب استفاده رسمی و روزمره در فصول سرد پاییز و زمستان.',
      mainImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD20_xOaLxBNeSANXXpFf0xriUt8sZjMziDbFOq_b881_UyyiRs-YGyW9RyDQtgaqyij8lYBnaEMlNm-Fg3IO5mpPN9A-hRBSG_ssBqEpO1unA4yBxis0xZjo5qtcoVZ5PBa9LHpB7Mg_0-5HEXpbGmuOSluNpoG9wNvXJLTcf1xcu_7QrreDzoWlk8gu8qquZhjssqkXXaETVDcIgQjVbkg__Hp-tCz4XdotO4Zo27GXUw79WBJv_Grw',
      galleryImages: JSON.stringify([
        'https://lh3.googleusercontent.com/aida-public/AB6AXuCZ8wuuc3LTbpAPXddisoVLrjGTsGrLU8PPN2sJS4oEOce09SYsmXQ1o2S1c1d62QankgTWXdJeskB9tWrENURa96OEq0pmXF8vt3Wtl9PhJOVvQS32YbnnVeNWCoLf5eoi8J6IdDzzliSKF5dJS3u9-GJDgxt6MItNpz7gbrtlzfy_YEHsNGoJcRc88FDbFBh-88n3IN6l41xyCIXxJfIPWIrqDNRj7sgLx1clsri7oQy6vOtuLpX0mQ',
      ]),
      status: 'published',
      featured: 1,
      tags: JSON.stringify(['شال', 'کشمیر', 'پاییزه', 'اکسسوری']),
      attributes: JSON.stringify({
        colors: [
          { name: 'طرح نگارین خزان', hex: '#b45309' },
          { name: 'سرمه‌ای سلطنتی', hex: '#1e3a8a' },
        ],
        sizes: ['ابعاد ۷۰×۲۰۰ سانتیمتر'],
        material: 'الیاف کشمیر فوق‌العاده لطیف',
      }),
      specifications: JSON.stringify([
        { group: 'مشخصات', key: 'ابعاد', value: '۷۰ در ۲۰۰ سانتی‌متر' },
        { group: 'مشخصات', key: 'بافت', value: 'ژاکارد دو رو کشمیر' },
      ]),
    },
    // 4. کیف دوشی تمام چرم طبیعی مردانه دست‌دوز
    {
      id: 'prod-4',
      title: 'کیف دوشی تمام چرم طبیعی مردانه دست‌دوز',
      slug: 'handmade-mens-genuine-leather-shoulder-bag',
      sku: 'VST-BG-2041',
      brand: 'چرم مشهد',
      brandId: 'b-mashhad',
      categoryIds: JSON.stringify(['cat-men', 'cat-shoes']),
      type: 'simple',
      price: 2850000,
      salePrice: 1995000,
      discountPercent: 30,
      stock: 5,
      lowStockThreshold: 2,
      rating: 4.9,
      reviewsCount: 65,
      shortDescription: 'کیف اداری و دوشی تولید شده از چرم طبیعی دباغی گیاهی همراه با یراق‌آلات برنجی آبکاری‌شده.',
      fullDescription: 'دارای ۲ سال ضمانت کتبی کیفیت چرم و یراق‌آلات، مناسب نگهداری تبلت و مدارک مهم اداری.',
      mainImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAuqbuA4ZEn1-HmsFigNDBdGpflyZ1l67Jla6nxKmMdIdxdYXqMSOrnq9xEMc_QGwqKchKnffpeUKvZal6c-xrHIUZZRDQ_Kw_zQHfb9xSuCE0BbOyd3MqZlagPmyqJfSOMHBKC1vJlwXXgHgHoxsw9_f1wRqhsBNL8uXIQUG1_taV0xMJeBtOi337jON9ZTma-Sm2Zs0NUmAnpzESmtTBAtTZ8PjIZxJmuhOZxxbeTCZsiGnJhGYerCA',
      galleryImages: JSON.stringify([]),
      status: 'published',
      featured: 1,
      tags: JSON.stringify(['کیف', 'چرم مشهد', 'اداری', 'مردانه']),
      attributes: JSON.stringify({
        colors: [
          { name: 'عسلی بلوطی', hex: '#8b4513' },
          { name: 'مشکی مات', hex: '#121c2a' },
        ],
        material: 'چرم طبیعی تبریز دست‌دوز',
      }),
      specifications: JSON.stringify([
        { group: 'ویژگی‌ها', key: 'جنس', value: 'چرم گاوی فلوتر طبیعی' },
        { group: 'ویژگی‌ها', key: 'ابعاد', value: '۲۸ در ۲۲ در ۸ سانتی‌متر' },
      ]),
    },
    // 5. بارانی کمربنددار زنانه ضدآب استایل شیک
    {
      id: 'prod-5',
      title: 'بارانی کمربنددار زنانه ضدآب استایل شیک',
      slug: 'women-belted-waterproof-trench-coat',
      sku: 'VST-WCL-3310',
      brand: 'مانگو (Mango)',
      brandId: 'b-mango',
      categoryIds: JSON.stringify(['cat-women', 'cat-winter']),
      type: 'variable',
      price: 3800000,
      salePrice: 3250000,
      discountPercent: 14,
      stock: 6,
      lowStockThreshold: 2,
      rating: 4.7,
      reviewsCount: 38,
      shortDescription: 'بارانی بلند کمربنددار دوطرفه با پارچه ضدآب نانو و طراحی آوانگارد اروپایی.',
      fullDescription: 'کالکشن بهاره ۲۰۲۵ مانگو، طراحی ارگونومیک، دو ردیف دکمه فلزی، مجهز به آستر خنک و ضدچروک.',
      mainImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCwF-SCTLnY8xJ__GD7Aa0ImoKgovBwkrjYnQBOH89EbI9Fi3dycQ2TRqtYhPfF3tEAu4hMKLj9u8TrQwGMkE9knDC1FtI-55uCSVShzfIN7a20LPmff_BbLsIvbT8e_J0m4a-rwpDBBio5iMVIBBGY6fTAC8jm0V_sHBg4u4C3Xcm2Rqxt09AgZVIoLr7uIWZldx_1MhzCixb7QZsVJ9kOGW3yBmxMmYL-7bBIqYyi0iR_nhjQ3i8_MA',
      galleryImages: JSON.stringify([]),
      status: 'published',
      featured: 1,
      tags: JSON.stringify(['زنانه', 'بارانی', 'مانگو', 'شیک']),
      attributes: JSON.stringify({
        colors: [
          { name: 'کرم بژ روشن', hex: '#f5f5dc' },
          { name: 'سبز زیتونی', hex: '#556b2f' },
          { name: 'مشکی کربنی', hex: '#121c2a' },
        ],
        sizes: ['۳۶', '۳۸', '۴۰', '۴۲', '۴۴'],
      }),
      specifications: JSON.stringify([
        { group: 'مشخصات', key: 'پارچه', value: 'کتان ضدآب گاباردین نانو' },
      ]),
    },
    // 6. پلیور یقه اسکی بافت ظریف پشم مرینوس
    {
      id: 'prod-6',
      title: 'پلیور یقه اسکی بافت ظریف پشم مرینوس',
      slug: 'fine-knit-merino-wool-turtleneck-sweater',
      sku: 'VST-SW-9912',
      brand: 'پاتن جامه',
      brandId: 'b-patan',
      categoryIds: JSON.stringify(['cat-men', 'cat-winter']),
      type: 'variable',
      price: 1450000,
      salePrice: 1160000,
      discountPercent: 20,
      stock: 14,
      lowStockThreshold: 4,
      rating: 4.8,
      reviewsCount: 27,
      shortDescription: 'بافت لطیف و ابریشم‌گونه پشم مرینوس، گرم، سبک و کاملا ضدحساسیت.',
      fullDescription: 'پلیور مرینوس کلاسیک پاتن جامه با دوخت نرم و ایستایی برازنده در زیر پالتو و کت‌های تک اسپرت.',
      mainImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCVtontKRUTsBTlG757De9BvYfSApBMmTb9guTluG2tffQdyk3ZXKh2M3QZfCaDEWzwev3T7Fnpq31hndI9ENJ807kbOsa0t7CiPq_KEE_MlvC28mpH2dPdAOwn3RYMryLYhBBwUYNKR5HASo7s4q8aYSQjhyl0gBavKNiOufThuN6NZj13kSGokMtia-2rVQ9VWOlr7AgeiEbipDPnz6zhYhpcPjK_QqGQHVB5bAXazMdrKaMVxr3vNg',
      galleryImages: JSON.stringify([]),
      status: 'published',
      featured: 1,
      tags: JSON.stringify(['پلیور', 'یقه اسکی', 'پشم مرینوس', 'پاتن جامه']),
      attributes: JSON.stringify({
        colors: [
          { name: 'سرمه‌ای کلاسیک', hex: '#1e3a8a' },
          { name: 'زرشکی تیره', hex: '#800020' },
          { name: 'طوسی دودی', hex: '#808080' },
        ],
        sizes: ['M', 'L', 'XL', 'XXL'],
      }),
      specifications: JSON.stringify([
        { group: 'مشخصات', key: 'نوع نخ', value: '۱۰۰٪ مرینوس استرالیایی' },
      ]),
    },
    // 7. ساعت مچی کرنوگراف مردانه با بند چرم سرمه‌ای
    {
      id: 'prod-7',
      title: 'ساعت مچی کرنوگراف مردانه با بند چرم سرمه‌ای',
      slug: 'mens-chronograph-watch-navy-leather-strap',
      sku: 'VST-WT-1102',
      brand: 'پیر کاردین',
      brandId: 'b-pierre',
      categoryIds: JSON.stringify(['cat-accessories']),
      type: 'simple',
      price: 5100000,
      salePrice: 4350000,
      discountPercent: 15,
      stock: 4,
      lowStockThreshold: 1,
      rating: 5.0,
      reviewsCount: 19,
      shortDescription: 'ساعت مچی کوارتز ساخت سوئیس با صفحه لاجوردی ضدخش یاقوت کبود و تقویم روزشمار.',
      fullDescription: 'مقاومت در برابر آب تا فشار ۵ اتمسفر (۵۰ متر)، بند چرم طبیعی دست‌دوز با قفل پروانه‌ای استیل.',
      mainImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBq69otokeMey9d9eNyia0wrmpaAyjpf0jwZsRX4QxtqjRe-zfAOJLDDzrZm5sax_O6sDZKNgie40L4aorr3EOHC2BZ937An3cqCH8S_PNu6bMzbqrBSckG1j6_u0TIhCDSZ8lLo5Si9eBtUAMeR8-upBlvk1zK_KUzFhFACThG1C6qH42R9XBcEr1Ir_dyUYVeFNs7g_JodjTxOxmbPM_IwUffis2OgZkBQ1X753nnWTg2U_RAQBj24Q',
      galleryImages: JSON.stringify([]),
      status: 'published',
      featured: 1,
      tags: JSON.stringify(['ساعت', 'کرنوگراف', 'پیر کاردین', 'سوئیس']),
      attributes: JSON.stringify({
        colors: [{ name: 'سرمه‌ای اقیانوسی', hex: '#1e3a8a' }],
        material: 'بدنه استیل ۳۱۶L ضدحساسیت',
      }),
      specifications: JSON.stringify([
        { group: 'موتور', key: 'تکنولوژی موتور', value: 'کوارتز کرنوگراف میوتا ژاپن' },
      ]),
    },
    // 8. کمربند مردانه چرم گاوی دست‌دوز
    {
      id: 'prod-8',
      title: 'کمربند مردانه چرم گاوی دست‌دوز با سگک مات',
      slug: 'handmade-mens-genuine-leather-belt-matte-buckle',
      sku: 'VST-AC-9104',
      brand: 'چرم درسا (Dorsa)',
      brandId: 'b-dorsa',
      categoryIds: JSON.stringify(['cat-accessories', 'cat-men']),
      type: 'simple',
      price: 890000,
      salePrice: 890000,
      discountPercent: 0,
      stock: 20,
      lowStockThreshold: 5,
      rating: 4.8,
      reviewsCount: 42,
      shortDescription: 'کمربند رسمی مردانه از چرم ضخیم و باکیفیت گاوی با سگک تفنگی دودی مات.',
      fullDescription: 'چرم درجه یک با دوام بالا بدون ترک‌خوردگی یا پوسته‌شدن، طول استاندارد ۱۱۰ سانتیمتر.',
      mainImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC2Q68dxj4xVGeOh2svnOLeAgGy7MqZI2JIGNudWSPLCx6yFJ5-iI2U2f1cPRSZlpIJcjtR2W-TF1zaYO77J2CPq4Ppz2_4aWZOrGRfBYFjPSbcxw89oXYSc3J6X000xbsmMFuiTusZnneqvm826fIHh-TeDlw1ux7IikMsM2Xgj-xmUVg3wq9hHDqQ6cu9QC42eq3lb0Gz1HT0gvqaYKGmfiAp5HomnQAiiB7_pW0qZCmBWJFM9WYAfg',
      galleryImages: JSON.stringify([]),
      status: 'published',
      featured: 0,
      tags: JSON.stringify(['کمربند', 'چرم درسا', 'مردانه']),
      attributes: JSON.stringify({
        colors: [{ name: 'قهوه‌ای سوخته', hex: '#4a2e18' }, { name: 'مشکی رسمی', hex: '#121c2a' }],
      }),
      specifications: JSON.stringify([
        { group: 'مشخصات', key: 'طول', value: '۱۱۰ سانتی‌متر' },
      ]),
    },
  ];

  // Generate 32 additional realistic products to reach 40 products
  for (let i = 9; i <= 40; i++) {
    const brandObj = brands[i % brands.length];
    const catId = categories[i % categories.length].id;
    const price = Math.round((450000 + (i * 125000)) / 10000) * 10000;
    const hasDiscount = i % 3 === 0;
    const discount = hasDiscount ? (i % 2 === 0 ? 20 : 15) : 0;
    const salePrice = hasDiscount ? Math.round(price * (1 - discount / 100)) : undefined;

    productData.push({
      id: `prod-${i}`,
      title: `${brandObj.name} مدل ${2024 + (i % 2)} شماره ${i}`,
      slug: `product-item-${i}`,
      sku: `VST-ITM-${1000 + i}`,
      brand: brandObj.name,
      brandId: brandObj.id,
      categoryIds: JSON.stringify([catId, 'cat-men']),
      type: 'simple',
      price: price,
      salePrice: salePrice || 0,
      discountPercent: discount,
      stock: 3 + (i % 15),
      lowStockThreshold: 4,
      rating: parseFloat((4.2 + (i % 8) * 0.1).toFixed(1)),
      reviewsCount: 5 + (i * 3),
      shortDescription: `محصول برگزیده مد و استایل از برند اصیل ${brandObj.name} با تضمین کیفیت و بازگشت ۷ روزه.`,
      fullDescription: `طراحی ارگونومیک، دوخت بادوام و متریال درجه یک به منظور ایجاد بیشترین راحتی و استایل منحصربه‌فرد.`,
      mainImage: productData[(i - 1) % 8].mainImage,
      galleryImages: JSON.stringify([]),
      status: 'published',
      featured: i % 4 === 0 ? 1 : 0,
      tags: JSON.stringify(['مد', brandObj.name, 'پوشاک']),
      attributes: JSON.stringify({
        colors: [{ name: 'سرمه‌ای', hex: '#1e3a8a' }, { name: 'مشکی', hex: '#121c2a' }],
        sizes: ['M', 'L', 'XL'],
      }),
      specifications: JSON.stringify([
        { group: 'مشخصات کلی', key: 'برند', value: brandObj.name },
        { group: 'مشخصات کلی', key: 'کشور مبدا', value: brandObj.country },
      ]),
    });
  }

  // Insert all 40 products
  for (const p of productData) {
    database.run(
      `INSERT INTO products (id, title, slug, sku, brand, brand_id, category_ids, type, price, sale_price, discount_percent, stock, low_stock_threshold, rating, reviews_count, short_description, full_description, main_image, gallery_images, status, featured, tags, attributes, specifications, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        p.id,
        p.title,
        p.slug,
        p.sku,
        p.brand,
        p.brandId,
        p.categoryIds,
        p.type,
        p.price,
        p.salePrice || null,
        p.discountPercent || null,
        p.stock,
        p.lowStockThreshold || 5,
        p.rating,
        p.reviewsCount,
        p.shortDescription,
        p.fullDescription,
        p.mainImage,
        p.galleryImages,
        p.status,
        p.featured,
        p.tags,
        p.attributes,
        p.specifications,
        '2024-03-01T10:00:00Z',
      ]
    );
  }

  // Orders Seed (15 orders in various statuses, including VST-94821 matching the Stitch screenshot!)
  const sampleAddress = {
    id: 'addr-1',
    userId: 'usr-sohrab',
    title: 'دفتر مرکزی (ونک)',
    recipientName: 'سهراب مظفری',
    recipientPhone: '09123456789',
    province: 'تهران',
    city: 'تهران',
    postalCode: '۱۹۱۸۹۳۴۸۲۱',
    streetAddress: 'تهران، خیابان ولیعصر، نرسیده به میدان ونک، کوچه بیستم، پلاک ۱۸',
    unit: 'واحد ۴ غربی',
    isDefault: true,
  };

  const orderItemsVST94821 = [
    {
      id: 'oi-1',
      productId: 'prod-1',
      productTitle: 'پالتو پشمی دوطرفه فوتر کلاسیک مدل ۲۰۲۵',
      productSku: 'VST-CL-4801',
      productImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCKyyLWggWCe-CKyfifTQeBV-Bn1g2BPVPzjrJXgqGBpKtijzaGSsjj7DhE35xSAcP-X2SLBZTOwxuMsiCiS4Y2WB3uaTR7oR-d_uUmpJkrhUvglQjDjIqhbuMUf3oBdX8P13JGrr0gDg2RMq3tOcBnpC-o7TzFVho2B1WyAwkQVl3APSmX4CExxoy18jvbX4UL3lkIwAH42K3fqOmaRzYTtiqpeDV9GINTEBON9ufBDNyetQkFdHex0w',
      colorName: 'سرمه‌ای تیره',
      size: 'L',
      unitPrice: 3200000,
      discountAmount: 800000,
      finalPrice: 2400000,
      quantity: 1,
      unit: 'عدد',
    },
    {
      id: 'oi-2',
      productId: 'prod-2',
      productTitle: 'کفش کتانی چرم طبیعی اسپرت ارگونومیک',
      productSku: 'VST-SH-1092',
      productImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD_BrusloBIxWl9QbQlMv8UcxFzIQELTXKpK37ZRuEkM7L2Nzynt92YTpRWUi0pn_QsjWzVEmHaR4p5zAjJzcx2ild8yE_XmSVBuaPesh-2kiuBE5SzmDYAXq6KwAuOneNCKwTyZqXGdUKHzmkXmWLUWvxSdxPiqXBg5hRPtAOZiBMvQDDTZwKuuZQp2q3rFUH0GdrAeUMtERg3Y8MR7AMDlg6WTiLc9_V30dAETAVT8uV5WwUWNbJZzQ',
      colorName: 'کرم روشن',
      size: '۴۲',
      unitPrice: 1980000,
      discountAmount: 297000,
      finalPrice: 1683000,
      quantity: 1,
      unit: 'جفت',
    },
    {
      id: 'oi-3',
      productId: 'prod-3',
      productTitle: 'شال و روسری کشمیر طرح‌دار لطیف پاییزه',
      productSku: 'VST-AC-7734',
      productImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD20_xOaLxBNeSANXXpFf0xriUt8sZjMziDbFOq_b881_UyyiRs-YGyW9RyDQtgaqyij8lYBnaEMlNm-Fg3IO5mpPN9A-hRBSG_ssBqEpO1unA4yBxis0xZjo5qtcoVZ5PBa9LHpB7Mg_0-5HEXpbGmuOSluNpoG9wNvXJLTcf1xcu_7QrreDzoWlk8gu8qquZhjssqkXXaETVDcIgQjVbkg__Hp-tCz4XdotO4Zo27GXUw79WBJv_Grw',
      colorName: 'نگارین خزان',
      size: 'قواره استاندارد',
      unitPrice: 840000,
      discountAmount: 84000,
      finalPrice: 756000,
      quantity: 1,
      unit: 'قواره',
    },
  ];

  // Insert VST-94821 (Processing / Paid)
  database.run(
    `INSERT INTO orders (id, order_number, tracking_code, postal_barnameh, user_id, customer_name, customer_phone, customer_national_code, shipping_address, status, items, items_count, subtotal, items_discount, coupon_code, coupon_discount, shipping_fee, shipping_method_name, shipping_method_id, delivery_date_slot, vat_amount, total_paid, payment_method, payment_method_name, payment_gateway, payment_rrn, payment_card_mask, is_paid, notes, requires_official_tax_invoice, invoice_serial, tax_ref_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      'ord-vst-94821',
      'VST-94821',
      'EXP-94821-TEH',
      '4892019482103',
      'usr-sohrab',
      'سهراب مظفری',
      '09123456789',
      '0083459126',
      JSON.stringify(sampleAddress),
      'processing', // In warehouse packaging as shown in the screenshot!
      JSON.stringify(orderItemsVST94821),
      3,
      6020000,
      1181000,
      'VISTA2025',
      150000,
      0, // Free express
      'اکسپرس پیک اختصاصی ویستا (تحویل تهران)',
      'express',
      'امروز، بازه ۱۳:۰۰ الی ۱۷:۰۰',
      0, // included
      4689000, // Exact total from Stitch screenshot!
      'online',
      'سامان کیش (SEP) - شاپرک',
      'sep',
      '840192837192',
      '۵۰۲۲-****-****-۷۸۲۱',
      1,
      'تحویل به نگهبانی بلوک B در صورت عدم پاسخگویی',
      1,
      'INV-1403-94821',
      'TX-8841-0091',
      '2024-05-14T14:35:00Z',
      '2024-05-14T15:10:00Z',
    ]
  );

  // Insert VST-88210 (Delivered past order from design)
  database.run(
    `INSERT INTO orders (id, order_number, tracking_code, postal_barnameh, user_id, customer_name, customer_phone, customer_national_code, shipping_address, status, items, items_count, subtotal, items_discount, coupon_code, coupon_discount, shipping_fee, shipping_method_name, shipping_method_id, delivery_date_slot, vat_amount, total_paid, payment_method, payment_method_name, payment_gateway, payment_rrn, payment_card_mask, is_paid, notes, requires_official_tax_invoice, invoice_serial, tax_ref_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      'ord-vst-88210',
      'VST-88210',
      'EXP-88210-TEH',
      '4892018821001',
      'usr-sohrab',
      'سهراب مظفری',
      '09123456789',
      '0083459126',
      JSON.stringify(sampleAddress),
      'delivered',
      JSON.stringify([
        {
          id: 'oi-past-1',
          productId: 'prod-4',
          productTitle: 'پیراهن آکسفورد نخی مردانه',
          productSku: 'VST-SH-8821',
          productImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDGAPAKIeqq7MOT7FFqENHpefWpqmFYkEPycMNXFSqBGJ42VgNLS-EXO8A_8_u7dyGfczAq6QkhiM_F9anYYIGgW5qTmjhuR-AV2cQNgXXjHj22lgyyTzH5gh7jZjhPMwU52WjGip6oF2r45K-gfMHZHRhyCFhYxkwrxS9mhz4hvpnyEpT_xGBk2-O00WDUPdwz6tqu167f8xgDl4noF1AX6ZhGkKXZQ9j-lJgWm-auksz-OgzsJzVXdw',
          colorName: 'آبی آسمانی',
          size: 'XL',
          unitPrice: 960000,
          discountAmount: 0,
          finalPrice: 960000,
          quantity: 1,
          unit: 'عدد',
        },
        {
          id: 'oi-past-2',
          productId: 'prod-8',
          productTitle: 'کمربند چرم طبیعی با سگک مات',
          productSku: 'VST-AC-9104',
          productImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD9JrX7rDJM65TIIr6lVlJuMS4Q4flsFPw6yjjRnneabX3xcLpoYnf27ioS3N4hxDOL8YSrvWqW6YjQMq_ohyPmQj3TM1H7bCdleU6bLPGzZertcbDr1TUIwUYahDnKNgk_A05sLAnt2XVhljqBhGL4CJTxm1nuguWy-AF2w7gt9Qb5lmcsD63OfpWVlLP6AiVM0bsbfimOmWQUyAtVauKtUvwGbMeiitqCPFL1wwvXCGFcq9-5i3FPIg',
          colorName: 'مشکی',
          size: '۱۱۰ سانت',
          unitPrice: 890000,
          discountAmount: 0,
          finalPrice: 890000,
          quantity: 1,
          unit: 'عدد',
        },
      ]),
      2,
      1850000,
      0,
      null,
      0,
      0,
      'پست پیشتاز سفارشی',
      'post',
      '۱۲ فروردین ۱۴۰۳',
      0,
      1850000,
      'online',
      'سامان کیش (SEP)',
      'sep',
      '840192776109',
      '۵۰۲۲-****-****-۷۸۲۱',
      1,
      null,
      0,
      null,
      null,
      '2024-03-31T11:00:00Z',
      '2024-04-03T16:00:00Z',
    ]
  );

  // 13 more sample orders in various statuses (pending, shipped, delivered, cancelled)
  const statuses = ['shipped', 'delivered', 'pending', 'awaiting_payment', 'delivered', 'cancelled', 'processing'];
  for (let k = 1; k <= 13; k++) {
    const cust = sampleCustomers[(k - 1) % sampleCustomers.length];
    const orderStatus = statuses[(k - 1) % statuses.length];
    const orderNum = `VST-${80000 + k * 145}`;
    const amount = 1200000 + k * 350000;

    database.run(
      `INSERT INTO orders (id, order_number, tracking_code, postal_barnameh, user_id, customer_name, customer_phone, customer_national_code, shipping_address, status, items, items_count, subtotal, items_discount, coupon_code, coupon_discount, shipping_fee, shipping_method_name, shipping_method_id, delivery_date_slot, vat_amount, total_paid, payment_method, payment_method_name, payment_gateway, payment_rrn, payment_card_mask, is_paid, notes, requires_official_tax_invoice, invoice_serial, tax_ref_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        `ord-sample-${k}`,
        orderNum,
        `EXP-${80000 + k * 145}-TEH`,
        `489201${k}0029`,
        cust.id,
        cust.name,
        cust.phone,
        '00' + Math.floor(10000000 + Math.random() * 90000000),
        JSON.stringify({ ...sampleAddress, recipientName: cust.name, recipientPhone: cust.phone }),
        orderStatus,
        JSON.stringify(orderItemsVST94821.slice(0, 1 + (k % 2))),
        1 + (k % 2),
        amount,
        150000,
        null,
        0,
        0,
        'ارسال فوری اکسپرس ویستا',
        'express',
        'امروز - بازه ۱۴ الی ۱۸',
        0,
        amount - 150000,
        'online',
        'درگاه پرداخت شاپرک',
        'sep',
        '840192' + Math.floor(100000 + Math.random() * 900000),
        '۶۰۳۷-****-****-' + (1000 + k),
        orderStatus !== 'awaiting_payment' ? 1 : 0,
        null,
        0,
        null,
        null,
        '2024-05-10T09:30:00Z',
        '2024-05-10T12:00:00Z',
      ]
    );
  }

  // 6 Blog Posts
  const blogPosts = [
    {
      id: 'blog-1',
      title: 'راهنمای استایل پاییز و زمستان ۲۰۲۵: پالتوهای فوتر را چگونه ست کنیم؟',
      slug: 'winter-2025-fouter-coat-styling-guide',
      cover: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCKyyLWggWCe-CKyfifTQeBV-Bn1g2BPVPzjrJXgqGBpKtijzaGSsjj7DhE35xSAcP-X2SLBZTOwxuMsiCiS4Y2WB3uaTR7oR-d_uUmpJkrhUvglQjDjIqhbuMUf3oBdX8P13JGrr0gDg2RMq3tOcBnpC-o7TzFVho2B1WyAwkQVl3APSmX4CExxoy18jvbX4UL3lkIwAH42K3fqOmaRzYTtiqpeDV9GINTEBON9ufBDNyetQkFdHex0w',
      excerpt: 'بررسی جامع قوانین ست کردن پالتوهای پشمی دوطرفه، ترکیب رنگ‌های خنثی با سرمه‌ای و استایل نیم‌رسمی زمستانه.',
      content: '<p>پالتوی فوتر کلاسیک یکی از اساسی‌ترین آیتم‌های کمد لباس زمستانه است که وقار و شیک‌پوشی خاصی به همراه دارد...</p>',
      author: 'سارا معتمدی (استایلیست ارشد)',
      readTime: '۵ دقیقه',
      category: 'استایل و مد',
      tags: JSON.stringify(['پالتو', 'فوتر', 'استایل ۲۰۲۵', 'زمستانه']),
    },
    {
      id: 'blog-2',
      title: 'چگونه از کفش و اکسسوری‌های چرم طبیعی نگهداری کنیم تا سال‌ها نو بمانند؟',
      slug: 'genuine-leather-care-guide',
      cover: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD_BrusloBIxWl9QbQlMv8UcxFzIQELTXKpK37ZRuEkM7L2Nzynt92YTpRWUi0pn_QsjWzVEmHaR4p5zAjJzcx2ild8yE_XmSVBuaPesh-2kiuBE5SzmDYAXq6KwAuOneNCKwTyZqXGdUKHzmkXmWLUWvxSdxPiqXBg5hRPtAOZiBMvQDDTZwKuuZQp2q3rFUH0GdrAeUMtERg3Y8MR7AMDlg6WTiLc9_V30dAETAVT8uV5WwUWNbJZzQ',
      excerpt: 'تکنیک‌های کلیدی واکس‌زدن، تمیزکاری و جلوگیری از ترک‌خوردن چرم طبیعی در روزهای بارانی و برفی.',
      content: '<p>چرم طبیعی یک متریال زنده و تنفس‌پذیر است که نیازمند رطوبت‌رسانی منظم و محافظت در برابر حرارت مستقیم است...</p>',
      author: 'مهرداد کریمی',
      readTime: '۷ دقیقه',
      category: 'راهنمای چرم',
      tags: JSON.stringify(['چرم', 'نگهداری چرم', 'واکس']),
    },
    {
      id: 'blog-3',
      title: 'تفاوت پشم مرینوس، کشمیر و فوتر: کدام الیاف برای شما مناسب‌تر است؟',
      slug: 'merino-cashmere-fouter-wool-comparison',
      cover: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD20_xOaLxBNeSANXXpFf0xriUt8sZjMziDbFOq_b881_UyyiRs-YGyW9RyDQtgaqyij8lYBnaEMlNm-Fg3IO5mpPN9A-hRBSG_ssBqEpO1unA4yBxis0xZjo5qtcoVZ5PBa9LHpB7Mg_0-5HEXpbGmuOSluNpoG9wNvXJLTcf1xcu_7QrreDzoWlk8gu8qquZhjssqkXXaETVDcIgQjVbkg__Hp-tCz4XdotO4Zo27GXUw79WBJv_Grw',
      excerpt: 'مقایسه گرما، وزن، لطافت و قیمت سه بافت پشمی محبوب جهان در صنعت پوشاک فاخر.',
      content: '<p>وقتی صحبت از پوشاک گرم می‌شود، شناخت دقیق الیاف به شما در انتخاب بهینه‌ترین گزینه کمک می‌کند...</p>',
      author: 'نیما ارجمند',
      readTime: '۴ دقیقه',
      category: 'پارچه‌شناسی',
      tags: JSON.stringify(['کشمیر', 'پشم مرینوس', 'فوتر']),
    },
    {
      id: 'blog-4',
      title: 'راهنمای انتخاب سایز دقیق هنگام خرید آنلاین پوشاک و کفش',
      slug: 'accurate-sizing-guide-online-shopping',
      cover: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCwF-SCTLnY8xJ__GD7Aa0ImoKgovBwkrjYnQBOH89EbI9Fi3dycQ2TRqtYhPfF3tEAu4hMKLj9u8TrQwGMkE9knDC1FtI-55uCSVShzfIN7a20LPmff_BbLsIvbT8e_J0m4a-rwpDBBio5iMVIBBGY6fTAC8jm0V_sHBg4u4C3Xcm2Rqxt09AgZVIoLr7uIWZldx_1MhzCixb7QZsVJ9kOGW3yBmxMmYL-7bBIqYyi0iR_nhjQ3i8_MA',
      excerpt: 'نحوه اندازه‌گیری دور سینه، سرشانه و طول پا با متر خیاطی برای انتخاب سایز بی‌نقص.',
      content: '<p>یکی از بزرگ‌ترین دغدغه‌های خرید اینترنتی لباس، انتخاب سایز درست است. با رعایت این ۵ نکته...</p>',
      author: 'تیم پشتیبانی ویستا',
      readTime: '۶ دقیقه',
      category: 'راهنمای خرید',
      tags: JSON.stringify(['راهنمای سایز', 'خرید آنلاین']),
    },
    {
      id: 'blog-5',
      title: 'رنگ‌های ترند پاییز و زمستان ۲۰۲۵ در هفته‌های مد پاریس و میلان',
      slug: 'winter-2025-color-trends-fashion-week',
      cover: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBq69otokeMey9d9eNyia0wrmpaAyjpf0jwZsRX4QxtqjRe-zfAOJLDDzrZm5sax_O6sDZKNgie40L4aorr3EOHC2BZ937An3cqCH8S_PNu6bMzbqrBSckG1j6_u0TIhCDSZ8lLo5Si9eBtUAMeR8-upBlvk1zK_KUzFhFACThG1C6qH42R9XBcEr1Ir_dyUYVeFNs7g_JodjTxOxmbPM_IwUffis2OgZkBQ1X753nnWTg2U_RAQBj24Q',
      excerpt: 'از سرمه‌ای عمیق تا شتری گرم و خاکی؛ پالت‌های برنده امسال در استایل روزمره و رسمی.',
      content: '<p>امسال طراحان مد به سمت سادگی اشرافی و پالت‌های رنگی ارگانیک تمایل نشان داده‌اند...</p>',
      author: 'سارا معتمدی',
      readTime: '۵ دقیقه',
      category: 'ترندها',
      tags: JSON.stringify(['ترند', 'رنگ سال', 'استایل']),
    },
    {
      id: 'blog-6',
      title: 'ساعت مچی مناسب کت و شلوار و استایل رسمی: ۵ نکته‌ای که آقایان باید بدانند',
      slug: 'dress-watch-guide-mens-style',
      cover: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDFx_qOtQHWYgjDde85LK6RaBPz_kjTuoSFYeh2aVELFmtSo4rE7s-TDYggnP0dzQ_LJlxlZO3tlyXTAIDoTTswF-8pR_I540UCZhLt5K7YPR5lBHwaTQPfmc3zJM8I84gMads9hEsRRpLRQMHBj8iIlR6Vsh85Ocf08VyrlNj4guvaxxes-3ABBiKixcIqUD-NVwLj11umrrwueb-Z-N635H6hSKfxGoNMOKWJiEF241TrhI59sAMnfA',
      excerpt: 'هماهنگی رنگ صفحه ساعت با سگک کمربند و کفش؛ ضخامت قاب و استانداردهای استایل حرفه‌ای.',
      content: '<p>یک ساعت مچی مناسب می‌تواند نقطه اوج یک استایل آراسته باشد...</p>',
      author: 'مهرداد کریمی',
      readTime: '۴ دقیقه',
      category: 'اکسسوری',
      tags: JSON.stringify(['ساعت', 'اکسسوری', 'استایل مردانه']),
    },
  ];

  for (const bp of blogPosts) {
    database.run(
      `INSERT INTO blog_posts (id, title, slug, cover_image, excerpt, content, author, read_time, category, tags, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [bp.id, bp.title, bp.slug, bp.cover, bp.excerpt, bp.content, bp.author, bp.readTime, bp.category, bp.tags, '2024-04-10T10:00:00Z']
    );
  }

  // Banners
  const banners = [
    {
      id: 'ban-1',
      title: 'کالکشن جدید پالتو و اورکت‌های پشمی ۲۰۲۵',
      subtitle: 'تا ۳۰٪ تخفیف ویژه برای اعضای باشگاه مشتریان',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCKyyLWggWCe-CKyfifTQeBV-Bn1g2BPVPzjrJXgqGBpKtijzaGSsjj7DhE35xSAcP-X2SLBZTOwxuMsiCiS4Y2WB3uaTR7oR-d_uUmpJkrhUvglQjDjIqhbuMUf3oBdX8P13JGrr0gDg2RMq3tOcBnpC-o7TzFVho2B1WyAwkQVl3APSmX4CExxoy18jvbX4UL3lkIwAH42K3fqOmaRzYTtiqpeDV9GINTEBON9ufBDNyetQkFdHex0w',
      link: '/shop?collection=winter',
      order: 1,
    },
    {
      id: 'ban-2',
      title: 'محصولات دست‌دوز چرم طبیعی تبریز و مشهد',
      subtitle: 'ضمانت ۲ ساله اصالت چرم و کیفیت یراق‌آلات',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAuqbuA4ZEn1-HmsFigNDBdGpflyZ1l67Jla6nxKmMdIdxdYXqMSOrnq9xEMc_QGwqKchKnffpeUKvZal6c-xrHIUZZRDQ_Kw_zQHfb9xSuCE0BbOyd3MqZlagPmyqJfSOMHBKC1vJlwXXgHgHoxsw9_f1wRqhsBNL8uXIQUG1_taV0xMJeBtOi337jON9ZTma-Sm2Zs0NUmAnpzESmtTBAtTZ8PjIZxJmuhOZxxbeTCZsiGnJhGYerCA',
      link: '/shop?category=shoes-bags',
      order: 2,
    },
    {
      id: 'ban-3',
      title: 'شال و روسری‌های ابریشم و کشمیر لطیف',
      subtitle: 'تنوع بی‌نظیر رنگ و نقوش اصیل نگارگری',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD20_xOaLxBNeSANXXpFf0xriUt8sZjMziDbFOq_b881_UyyiRs-YGyW9RyDQtgaqyij8lYBnaEMlNm-Fg3IO5mpPN9A-hRBSG_ssBqEpO1unA4yBxis0xZjo5qtcoVZ5PBa9LHpB7Mg_0-5HEXpbGmuOSluNpoG9wNvXJLTcf1xcu_7QrreDzoWlk8gu8qquZhjssqkXXaETVDcIgQjVbkg__Hp-tCz4XdotO4Zo27GXUw79WBJv_Grw',
      link: '/shop?category=accessories',
      order: 3,
    },
  ];

  for (const b of banners) {
    database.run(
      `INSERT INTO banners (id, title, image, link, subtitle, active, order_index)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [b.id, b.title, b.image, b.link, b.subtitle, 1, b.order]
    );
  }

  // Coupons
  const coupons = [
    { id: 'c-1', code: 'VISTA2025', type: 'fixed', value: 150000, minOrder: 1000000, isActive: 1 },
    { id: 'c-2', code: 'WINTER25', type: 'percent', value: 20, minOrder: 500000, isActive: 1 },
    { id: 'c-3', code: 'FIRSTBUY', type: 'fixed', value: 200000, minOrder: 800000, isActive: 1 },
    { id: 'c-4', code: 'GOLDCLUB', type: 'percent', value: 15, minOrder: 0, isActive: 1 },
  ];

  for (const c of coupons) {
    database.run(
      `INSERT INTO coupons (id, code, type, value, min_order_amount, used_count, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [c.id, c.code, c.type, c.value, c.minOrder, 14, c.isActive]
    );
  }

  // Initial Store Settings
  const defaultSettings = {
    storeName: 'دیجی‌استایل (ویستا استایل)',
    storeLegalName: 'شرکت تجارت الکترونیک ویستا استایل (سهامی خاص)',
    tagline: 'مرجع تخصصی خرید آنلاین پوشاک و سبک زندگی معاصر',
    phone: '۰۲۱-۹۱۰۰۸۸۷۷',
    email: 'support@digistyle.ir',
    address: 'تهران، خیابان شریعتی، بالاتر از میرداماد، برج اداری ویستا، طبقه ۷، واحد ۷۰۳',
    economicCode: '۴۱۱۵۸۹۳۴۶۷۱۸',
    nationalId: '۱۰۱۰۳۹۸۴۷۱۲',
    registrationNumber: '۵۳۸۹۰۲',
    postalCode: '۱۹۱۸۹۳۴۸۲۱',
    freeShippingThreshold: 4000000,
    standardShippingFee: 45000,
    expressShippingFee: 65000,
    vatPercent: 10,
    currency: 'IRT',
    maintenanceMode: false,
    smsActiveProvider: 'melipayamak',
    activeGateway: 'sep_mock',
    enableCod: true,
    enableWallet: true,
    gateways: {
      zarinpal: { enabled: true, merchantId: '••••••••••••••••••••••••••••••••••••', sandbox: true, title: 'زرین‌پال (ZarinPal)' },
      zibal: { enabled: true, merchantId: '••••••••••••', sandbox: true, title: 'زیبال (Zibal)' },
      aghaye_pardakht: { enabled: true, pin: '••••••••••••••••', sandbox: true, title: 'آقای پرداخت' },
      sep_mock: { enabled: true, terminalId: '••••••••', title: 'سامان کیش (SEP) - شاپرک' },
      cod: { enabled: true, title: 'پرداخت در محل (Cash On Delivery)' },
      wallet: { enabled: true, title: 'کیف پول نقدی دیجی‌استایل' },
    },
    sms: {
      melipayamak: { username: 'digistyle_admin', apiKey: '••••••••••••••••', sender: '50004000', enabled: true },
      farazsms: { apiKey: '••••••••••••••••', sender: '3000505', enabled: false },
    },
  };

  database.run(
    `INSERT INTO settings (key, value) VALUES (?, ?)`,
    ['general', JSON.stringify(defaultSettings)]
  );

  // Initial Activity Log
  database.run(
    `INSERT INTO activity_logs (id, user_id, user_name, user_role, action, module, details, ip_address, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      'log-1',
      'usr-admin',
      'مدیر ارشد سامانه',
      'super_admin',
      'مقداردهی اولیه پایگاه داده',
      'سیستم',
      'تولید خودکار داده‌های نمونه، محصولات، کاتالوگ و حساب‌های کاربری',
      '127.0.0.1',
      new Date().toISOString(),
    ]
  );
}
