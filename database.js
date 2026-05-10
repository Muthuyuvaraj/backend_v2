// database.js — uses 'sql.js' (pure JavaScript, no C++ / Visual Studio needed on Windows)
const fs   = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'vignesh_agency.db');

let SQL;
let db;

async function initDB() {
  if (db) return db;
  const initSqlJs = require('sql.js');
  SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  createSchema();
  seedInitialData();
  saveDB();
  return db;
}

function saveDB() {
  if (!db) return;
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

function getDB() {
  if (!db) throw new Error('DB not initialized');
  return db;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function run(sql, params = []) {
  getDB().run(sql, params);
  saveDB();
}

function get(sql, params = []) {
  const stmt = getDB().prepare(sql);
  stmt.bind(params);
  const row = stmt.step() ? stmt.getAsObject() : null;
  stmt.free();
  return row;
}

function all(sql, params = []) {
  const results = [];
  const stmt = getDB().prepare(sql);
  stmt.bind(params);
  while (stmt.step()) results.push(stmt.getAsObject());
  stmt.free();
  return results;
}

function lastId() {
  const row = get('SELECT last_insert_rowid() as id');
  return row ? Number(row.id) : null;
}

function transaction(fn) {
  getDB().run('BEGIN');
  try {
    const result = fn();
    getDB().run('COMMIT');
    saveDB();
    return result;
  } catch (e) {
    getDB().run('ROLLBACK');
    throw e;
  }
}

// ── Schema ───────────────────────────────────────────────────────────────────

function createSchema() {
  const d = getDB();

  d.run(`CREATE TABLE IF NOT EXISTS agency_info (
    id INTEGER PRIMARY KEY CHECK(id=1),
    name TEXT NOT NULL DEFAULT 'VIGNESH AGENCY',
    type TEXT NOT NULL DEFAULT 'Milk Distributor',
    owner_name TEXT, address1 TEXT, address2 TEXT,
    city TEXT, state TEXT, pincode TEXT, phone TEXT, gstin TEXT
  )`);

  d.run(`CREATE TABLE IF NOT EXISTS dealers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dealer_code INTEGER UNIQUE NOT NULL,
    name TEXT NOT NULL,
    phone TEXT, area TEXT, address TEXT, gstin TEXT,
    balance REAL NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  )`);

  d.run(`CREATE TABLE IF NOT EXISTS product_groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL DEFAULT 'Milk'
  )`);

  d.run(`CREATE TABLE IF NOT EXISTS product_variants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id INTEGER NOT NULL,
    size_label TEXT NOT NULL,
    units_per_crate REAL NOT NULL,
    price_per_unit REAL NOT NULL,
    hsn_code TEXT NOT NULL DEFAULT '04011000',
    uom TEXT NOT NULL DEFAULT 'L',
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  )`);

  d.run(`CREATE TABLE IF NOT EXISTS bills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bill_no TEXT NOT NULL UNIQUE,
    dealer_id INTEGER NOT NULL,
    bill_date TEXT NOT NULL DEFAULT (date('now','localtime')),
    total_amount REAL NOT NULL DEFAULT 0,
    paid_amount REAL NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending',
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  )`);

  d.run(`CREATE TABLE IF NOT EXISTS bill_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bill_id INTEGER NOT NULL,
    variant_id INTEGER NOT NULL,
    product_name TEXT NOT NULL,
    size_label TEXT NOT NULL,
    crates REAL NOT NULL,
    units REAL NOT NULL,
    unit_price REAL NOT NULL,
    total_price REAL NOT NULL
  )`);

  d.run(`CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dealer_id INTEGER NOT NULL,
    bill_id INTEGER,
    amount REAL NOT NULL,
    mode TEXT NOT NULL DEFAULT 'cash',
    note TEXT,
    paid_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  )`);
}

// ── Seed Data ────────────────────────────────────────────────────────────────

function seedInitialData() {
  if (!get('SELECT id FROM agency_info WHERE id=1')) {
    run(`INSERT INTO agency_info (id,name,type,owner_name,address1,address2,city,state,pincode,phone,gstin)
         VALUES (1,'VIGNESH AGENCY','Milk Distributor','Swami Sannathi',
         'Thiru Uthrakosamangai','Ramanathapuram','Tamil Nadu','Tamil Nadu',
         '623533','9994437531','33ASIPR1335F2ZX')`);
  }

  if (Number(get('SELECT COUNT(*) as c FROM dealers').c) === 0) {
    [
      [101,'Ramesh Stores',    '9876543210','Uthrakosamangai',2500],
      [102,'Suresh Babu',       '9876543211','T. Nagar',        1200],
      [103,'Lakshmi Stores',    '9876543212','Adyar',              0],
      [104,'Ganesh Milk Center','9876543213','Velachery',        3400],
      [105,'Priya Dairy',       '9876543214','Tambaram',          800],
      [106,'Murugan Stores',    '9876543215','Chromepet',        1500],
    ].forEach(([code,name,phone,area,balance]) =>
      run(`INSERT INTO dealers (dealer_code,name,phone,area,balance) VALUES (?,?,?,?,?)`,
        [code,name,phone,area,balance]));
  }

  if (Number(get('SELECT COUNT(*) as c FROM product_groups').c) === 0) {
    run(`INSERT INTO product_groups (name,category) VALUES ('Full Cream Milk','Milk')`);
    const milkId = lastId();
    [['500ml',14,69.80],['1L',14,68.00],['2L',12,67.50],['120ml',10.8,67.30]]
      .forEach(([s,u,p]) => run(
        `INSERT INTO product_variants (group_id,size_label,units_per_crate,price_per_unit,hsn_code,uom) VALUES (?,?,?,?,'04011000','L')`,
        [milkId,s,u,p]));

    run(`INSERT INTO product_groups (name,category) VALUES ('Curd','Curd')`);
    const curdId = lastId();
    // Curd mock — aligns with Mongo simple curd billing; SQLite bill math = crates * units * price/unit
    // 125g: 90 units/crate @ 704/90; 475g/1kg: liters/crate × ₹/L
    [['125g',90,704 / 90],['475g',11,64],['1kg',12,64]].forEach(([s, u, p]) =>
      run(
        `INSERT INTO product_variants (group_id,size_label,units_per_crate,price_per_unit,hsn_code,uom) VALUES (?,?,?,?,'04039000','L')`,
        [curdId, s, u, p]
      ));
  }
}

module.exports = { initDB, getDB, run, get, all, transaction, lastId, saveDB };
