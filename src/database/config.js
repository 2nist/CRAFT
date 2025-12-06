/**
 * SQL Server Database Configuration
 * Craft CPQ Application
 */

export const sqlConfig = {
  server: '192.168.1.150\\SQLEXPRESS',
  database: 'CraftCPQ',
  user: 'craft_cpq_app',
  password: 'Cra3ty1!',
  options: {
    encrypt: true,
    trustServerCertificate: true,
    enableArithAbort: true,
    instanceName: 'SQLEXPRESS'
  }
};
