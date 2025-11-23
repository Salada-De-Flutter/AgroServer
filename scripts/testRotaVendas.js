require('dotenv').config();
const axios = require('axios');

/**
 * Script para testar a rota de vendas
 */
async function testRotaVendas() {
  try {
    const rotaId = '6ef29731-be00-42c1-aa49-616c74be84d7';

    console.log('\n🧪 TESTANDO ROTA DE VENDAS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📤 Enviando requisição para: POST http://localhost:3000/api/rota/vendas');
    console.log('📦 Body:', JSON.stringify({ rota_id: rotaId }, null, 2));
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const response = await axios.post('http://localhost:3000/api/rota/vendas', {
      rota_id: rotaId
    });

    console.log('✅ RESPOSTA DA API:');
    console.log(JSON.stringify(response.data, null, 2));
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ Total de vendas processadas: ${response.data.data.totalVendas}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('\n❌ ERRO NO TESTE:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Resposta:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error('Nenhuma resposta recebida. O servidor está rodando?');
      console.error('Verifique se o servidor está ativo na porta 3000.');
    } else {
      console.error('Erro:', error.message);
    }
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  }
}

// Executa o teste
testRotaVendas();
