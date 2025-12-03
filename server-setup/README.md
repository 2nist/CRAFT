# Craft Automation Server Setup (SQL Server + API)

This guide prepares a Windows office server to host the master SQL database and the REST API that your Electron app syncs with.

## Overview
- Goal: Reliable multi‑user DB on a dedicated Windows PC, with nightly backups to your NAS.
- Stack: SQL Server Express 2022, Node.js REST API (Express + `mssql`), pm2 as Windows service.
- Network: Server reachable on ports 1433 (SQL) and 3000 (API) from office LAN.

---

## 1) Prerequisites
- Windows 10/11 Pro or Windows Server (admin access)
- Local static IP reserved via router/DHCP (e.g., 192.168.1.50)
- NAS share for backups (e.g., `\\NAS\Backups\CraftDB`)
- Internet access to install packages

---

## 2) Install SQL Server Express + SSMS
1. Download SQL Server Express 2022:
   - https://www.microsoft.com/en-us/sql-server/sql-server-downloads → "Express"
2. Run installer:
   - Choose "Basic" or "Custom"; accept defaults unless you want a custom instance name.
3. Install SQL Server Management Studio (SSMS):
   - https://aka.ms/ssmsfullsetup
   - Connect to `localhost` after install to verify.

---

## 3) Enable Remote Access (TCP/IP) + Set Static Port
1. Open "SQL Server Configuration Manager" → SQL Server Network Configuration → Protocols for `SQLEXPRESS` (or your instance):
   - Enable `TCP/IP`.
2. Double‑click `TCP/IP` → `IP Addresses` tab:
   - Set `TCP Port` to `1433` for all active IPs.
   - Ensure `TCP Dynamic Ports` is blank.
3. Restart the SQL Server service.

Firewall:
- Windows Defender Firewall → Advanced settings → Inbound Rules:
  - Add a new rule to allow TCP on port `1433`.

Test locally:
- In SSMS, connect using `localhost,1433`.

---

## 4) Create Database and Login
In SSMS:
1. Databases → New Database → Name: `CraftAutomation`.
2. Security → Logins → New Login:
   - Login name: `craft_app_user` (SQL authentication)
   - Password: strong unique password
   - Default database: `CraftAutomation`
   - Server Roles: public
   - User Mapping: map to `CraftAutomation`, grant `db_datareader`, `db_datawriter`.

Optional (schema):
- Create tables for `customers`, `quotes`, `orders`, and `sync_metadata` per your app’s schema.

---

## 5) Install Node.js and pm2
1. Install Node.js LTS: https://nodejs.org/en/download
2. Open PowerShell (Admin) and install pm2:
```powershell
npm install -g pm2
pm2 install pm2-windows-startup
pm2-startup install
```

---

## 6) Deploy the REST API
On the server, create a folder for the API, e.g., `C:\CraftAPI`.

Example minimal API (`server.js`):
```js
require('dotenv').config();
const express = require('express');
const sql = require('mssql');
const morgan = require('morgan');

const app = express();
app.use(express.json());
app.use(morgan('tiny'));

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER, // e.g., '192.168.1.50'
  database: process.env.DB_NAME, // 'CraftAutomation'
  options: {
    trustServerCertificate: true,
    enableArithAbort: true
  }
};

// Simple API key auth (optional)
app.use((req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (!process.env.API_KEY) return next();
  if (apiKey && apiKey === process.env.API_KEY) return next();
  return res.status(401).json({ error: 'Unauthorized' });
});

// Health check
app.get('/health', async (req, res) => {
  try {
    await sql.connect(config);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Customers
app.get('/customers', async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const result = await pool.request().query('SELECT * FROM dbo.customers');
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/customers', async (req, res) => {
  const { id, name, email } = req.body;
  try {
    const pool = await sql.connect(config);
    const q = `MERGE dbo.customers AS target
              USING (SELECT @id AS id, @name AS name, @email AS email) AS src
              ON target.id = src.id
              WHEN MATCHED THEN UPDATE SET name = src.name, email = src.email
              WHEN NOT MATCHED THEN INSERT (id, name, email) VALUES (src.id, src.name, src.email);
             `;
    await pool.request()
      .input('id', sql.VarChar(64), id)
      .input('name', sql.NVarChar(255), name)
      .input('email', sql.NVarChar(255), email)
      .query(q);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Craft API listening on ${port}`));
```

Create `.env` (same folder):
```
PORT=3000
DB_SERVER=192.168.1.50
DB_NAME=CraftAutomation
DB_USER=craft_app_user
DB_PASSWORD=ChangeMeStrong!
API_KEY=ChangeMeStrong!
```

Install dependencies and run with pm2:
```powershell
cd C:\CraftAPI
npm init -y
npm install express mssql dotenv morgan
pm2 start server.js --name CraftAPI --env production
pm2 save
```

Firewall:
- Allow TCP inbound on port `3000`.

Test:
```powershell
curl http://localhost:3000/health
```

---

## 7) Configure the Electron App
On each workstation, set `.env` or app settings to point to the API:
- `REMOTE_API_URL=http://192.168.1.50:3000`
- `REMOTE_API_KEY=ChangeMeStrong!`

Verify in the app via the Sync Settings Panel and Test Connection.

---

## 8) Backups to NAS (Nightly)
Use Task Scheduler with a PowerShell script (`Backup-CraftAutomation.ps1`):
```powershell
param(
  [string]$SqlInstance = 'localhost',
  [string]$Database = 'CraftAutomation',
  [string]$NasPath = "\\\\NAS\\Backups\\CraftDB",
  [int]$RetentionDays = 30
)

$DateStamp = Get-Date -Format 'yyyy-MM-dd_HH-mm-ss'
$BackupFile = Join-Path $NasPath "$Database-$DateStamp.bak"

if (!(Test-Path $NasPath)) { New-Item -ItemType Directory -Path $NasPath | Out-Null }

$sql = "BACKUP DATABASE [$Database] TO DISK = N'$BackupFile' WITH INIT, COMPRESSION" 
& sqlcmd -S $SqlInstance -Q $sql

Get-ChildItem $NasPath -Filter "$Database-*.bak" | Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-$RetentionDays) } | Remove-Item -Force
```

Task Scheduler:
- Trigger: Daily at 2:00 AM
- Action: Start Program → `powershell.exe` with args: `-ExecutionPolicy Bypass -File C:\CraftAPI\Backup-CraftAutomation.ps1`
- Run whether user is logged on or not.

---

## 9) Verification Checklist
- SQL Server: TCP/IP enabled, listening on port 1433
- Firewall: inbound rules for 1433 and 3000
- DB: `CraftAutomation` exists; login `craft_app_user` works
- API: `http://<server>:3000/health` returns `{ ok: true }`
- App: Sync connection test passes; can read/write customers/quotes/orders
- Backups: `.bak` files appear on NAS, and can be restored in SSMS

---

## 10) Troubleshooting
- "Cannot connect to server": verify port 1433 open, test `telnet <server> 1433`.
- "Login failed": check user mapping/roles in SSMS.
- API 500 errors: check pm2 logs `pm2 logs CraftAPI` and SQL permissions.
- Slow performance: ensure server on LAN, use wired Ethernet, confirm no NAS is used for active DB files.

---

## 11) Security Tips
- Use strong unique passwords and rotate periodically.
- Restrict inbound firewall rules to office subnet.
- Change default instance names and disable unused protocols.
- Keep Windows, SQL Server, and Node packages up to date.
