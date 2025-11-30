require('dotenv').config();
const asaasService = require('../src/services/asaasService');
const databaseService = require('../src/services/databaseService');

const PAGE_SIZE = 50;

async function getAllAsaasClienteIds() {
  let page = 0;
  let hasMore = true;
  const ids = new Set();

  while (hasMore) {
    const params = {
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE
    };
    await asaasService.beforeRequest();
    const response = await asaasService.listCustomers(params);
    const clientes = response.data || [];
    clientes.forEach(cliente => ids.add(cliente.id));
    hasMore = response.hasMore || false;
    page++;
  }
  return ids;
}

async function getAllDbClienteIds() {
  const result = await databaseService.query('SELECT id FROM clientes');
  return new Set(result.rows.map(row => row.id));
}

async function main() {
  console.log('Verificando clientes faltantes...');
  const asaasIds = await getAllAsaasClienteIds();
  const dbIds = await getAllDbClienteIds();

  const faltantes = [...asaasIds].filter(id => !dbIds.has(id));

  if (faltantes.length === 0) {
    console.log('✅ Todos os clientes do Asaas estão sincronizados no banco!');
  } else {
    console.log(`❌ Encontrados ${faltantes.length} cliente(s) no Asaas que não estão no banco:`);
    faltantes.forEach(id => console.log('  -', id));
  }
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Erro ao verificar clientes:', err);
    process.exit(1);
  });
