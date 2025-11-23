require('dotenv').config();
const axios = require('axios');

/**
 * Script para testar a rota de parcelamento
 */
async function testParcelamentoRoute() {
  try {
    const parcelamentoId = '3ef2fc4b-8459-4270-822d-b6dc9dc61369';

    console.log('\n🧪 TESTANDO ROTA DE PARCELAMENTO');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📤 Enviando requisição para: POST http://localhost:3000/api/parcelamento');
    console.log('📦 Body:', JSON.stringify({ id: parcelamentoId }, null, 2));
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const response = await axios.post('http://localhost:3000/api/parcelamento', {
      id: parcelamentoId
    });

    console.log('✅ RESPOSTA DA API:');
    console.log(JSON.stringify(response.data, null, 2));
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('✅ Teste concluído com sucesso!\n');

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
testParcelamentoRoute();
