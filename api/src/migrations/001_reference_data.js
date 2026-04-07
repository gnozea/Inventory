const sql = require('mssql');
async function run() {
  const pool = await sql.connect({
    server: 'emergency-portal-srv.database.windows.net',
    database: 'emergency-portal-db',
    authentication: { type: 'azure-active-directory-default' },
    options: { encrypt: true },
  });
  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'reference_data')
    CREATE TABLE reference_data (
      id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
      type NVARCHAR(50) NOT NULL,
      name NVARCHAR(200) NOT NULL,
      description NVARCHAR(500) NULL,
      sort_order INT DEFAULT 0,
      active BIT DEFAULT 1,
      created_at DATETIME2 DEFAULT GETUTCDATE()
    )
  `);
  const existing = await pool.request().query("SELECT COUNT(*) as cnt FROM reference_data");
  if (existing.recordset[0].cnt === 0) {
    const items = [
      ['category', 'Vehicle', 'Cars, trucks, boats, aircraft', 1],
      ['category', 'PPE', 'Personal protective equipment', 2],
      ['category', 'Communication', 'Radios, phones, command centers', 3],
      ['category', 'Medical', 'AEDs, trauma kits, ventilators', 4],
      ['category', 'Detection', 'Gas detectors, cameras, monitors', 5],
      ['category', 'Rescue', 'Hydraulic tools, ropes, cutting equipment', 6],
      ['category', 'Electronics', 'Laptops, tablets, drones', 7],
      ['category', 'Shelter', 'Tents, decon shelters, inflatables', 8],
      ['status', 'Active', 'In service and operational', 1],
      ['status', 'Maintenance', 'Under repair or scheduled service', 2],
      ['status', 'Deployed', 'Currently deployed to an incident', 3],
      ['status', 'Decommissioned', 'Retired from service', 4],
    ];
    for (const [type, name, desc, order] of items) {
      await pool.request().input('type', type).input('name', name).input('desc', desc).input('order', order)
        .query("INSERT INTO reference_data (type, name, description, sort_order) VALUES (@type, @name, @desc, @order)");
    }
    console.log('Seeded reference data');
  } else { console.log('Reference data already exists'); }
  console.log('Migration complete');
  await pool.close();
  process.exit(0);
}
run().catch(e => { console.error(e.message); process.exit(1); });