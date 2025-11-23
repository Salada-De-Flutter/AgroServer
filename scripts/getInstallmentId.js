require('dotenv').config();
const axios = require('axios');

/**
 * Script para buscar ID de parcelamento do último cliente cadastrado
 */
async function getLastInstallmentId() {
  try {
    console.log('\n🔍 Buscando último cliente cadastrado...\n');

    const client = axios.create({
      baseURL: process.env.ASAAS_API_URL,
      headers: {
        'access_token': process.env.ASAAS_API_KEY,
        'Content-Type': 'application/json'
      }
    });

    // Busca o último cliente cadastrado
    const customersResponse = await client.get('/customers', {
      params: {
        limit: 1,
        offset: 0,
        order: 'desc'
      }
    });

    if (!customersResponse.data.data || customersResponse.data.data.length === 0) {
      console.log('❌ Nenhum cliente encontrado.');
      return;
    }

    const ultimoCliente = customersResponse.data.data[0];
    
    console.log('👤 ÚLTIMO CLIENTE CADASTRADO:');
    console.log('  → ID:', ultimoCliente.id);
    console.log('  → Nome:', ultimoCliente.name);
    console.log('  → Email:', ultimoCliente.email || 'N/A');
    console.log('  → CPF/CNPJ:', ultimoCliente.cpfCnpj || 'N/A');
    console.log('  → Data de Cadastro:', ultimoCliente.dateCreated);
    console.log('');

    // Busca parcelamentos deste cliente
    console.log('🔍 Buscando parcelamentos do cliente...\n');
    
    const installmentsResponse = await client.get('/installments', {
      params: {
        customer: ultimoCliente.id,
        limit: 1,
        offset: 0,
        order: 'desc'
      }
    });

    if (!installmentsResponse.data.data || installmentsResponse.data.data.length === 0) {
      console.log('⚠️  Nenhum parcelamento encontrado para este cliente.');
      console.log('');
      console.log('💡 Dica: Você pode criar um parcelamento manualmente no painel do Asaas');
      console.log('   ou buscar parcelamentos de outro cliente.\n');
      return;
    }

    const ultimoParcelamento = installmentsResponse.data.data[0];

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('💳 ÚLTIMO PARCELAMENTO ENCONTRADO:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  → ID:', ultimoParcelamento.id);
    console.log('  → Valor Total:', `R$ ${ultimoParcelamento.value}`);
    console.log('  → Status:', ultimoParcelamento.status);
    console.log('  → Número de Parcelas:', ultimoParcelamento.installmentCount);
    console.log('  → Descrição:', ultimoParcelamento.description || 'N/A');
    console.log('  → Data de Criação:', ultimoParcelamento.dateCreated);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('📋 Use este ID para testar a API:');
    console.log(`   ${ultimoParcelamento.id}`);
    console.log('');
    console.log('📝 Exemplo de requisição:');
    console.log('   POST http://localhost:3000/api/parcelamento');
    console.log('   Body: { "id": "' + ultimoParcelamento.id + '" }');
    console.log('');

  } catch (error) {
    console.error('❌ Erro ao buscar parcelamento:', error.response?.data || error.message);
    console.log('');
  }
}

// Executa o script
getLastInstallmentId();
