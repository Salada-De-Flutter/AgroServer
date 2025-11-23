require('dotenv').config();
const axios = require('axios');

/**
 * Script para buscar qualquer ID de parcelamento disponível
 */
async function getAnyInstallmentId() {
  try {
    console.log('\n🔍 Buscando parcelamentos disponíveis...\n');

    const client = axios.create({
      baseURL: process.env.ASAAS_API_URL,
      headers: {
        'access_token': process.env.ASAAS_API_KEY,
        'Content-Type': 'application/json'
      }
    });

    // Busca parcelamentos (mais recentes primeiro)
    const installmentsResponse = await client.get('/installments', {
      params: {
        limit: 5,
        offset: 0,
        order: 'desc'
      }
    });

    if (!installmentsResponse.data.data || installmentsResponse.data.data.length === 0) {
      console.log('❌ Nenhum parcelamento encontrado na conta.');
      console.log('');
      console.log('💡 Dica: Crie um parcelamento manualmente no painel do Asaas:');
      console.log('   https://www.asaas.com');
      console.log('');
      return;
    }

    console.log(`✅ Encontrados ${installmentsResponse.data.data.length} parcelamento(s)\n`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Lista todos os parcelamentos encontrados
    installmentsResponse.data.data.forEach((parcelamento, index) => {
      console.log(`\n💳 PARCELAMENTO ${index + 1}:`);
      console.log('  → ID:', parcelamento.id);
      console.log('  → Valor Total:', `R$ ${parcelamento.value}`);
      console.log('  → Status:', parcelamento.status);
      console.log('  → Número de Parcelas:', parcelamento.installmentCount);
      console.log('  → Descrição:', parcelamento.description || 'N/A');
      console.log('  → Data de Criação:', parcelamento.dateCreated);
      console.log('  → Cliente ID:', parcelamento.customer);
    });

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Pega o primeiro parcelamento como sugestão
    const primeiroParcelamento = installmentsResponse.data.data[0];

    console.log('\n📋 Use este ID para testar a API:');
    console.log(`   ${primeiroParcelamento.id}`);
    console.log('');
    console.log('📝 Exemplo de requisição:');
    console.log('   POST http://localhost:3000/api/parcelamento');
    console.log('   Body: { "id": "' + primeiroParcelamento.id + '" }');
    console.log('');
    console.log('🔧 Ou use o curl:');
    console.log(`   curl -X POST http://localhost:3000/api/parcelamento -H "Content-Type: application/json" -d "{\\"id\\": \\"${primeiroParcelamento.id}\\"}"`);
    console.log('');

  } catch (error) {
    console.error('❌ Erro ao buscar parcelamentos:', error.response?.data || error.message);
    console.log('');
  }
}

// Executa o script
getAnyInstallmentId();
