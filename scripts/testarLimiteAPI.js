/**
 * Script para testar se chegamos no limite da API Asaas
 */

require('dotenv').config();
const https = require('https');

const ASAAS_API_KEY = process.env.ASAAS_API_KEY;
const ASAAS_BASE_URL = process.env.ASAAS_API_URL || 'https://api.asaas.com/v3';

async function testarAPI(endpoint) {
  return new Promise((resolve, reject) => {
    const options = {
      method: 'GET',
      headers: {
        'access_token': ASAAS_API_KEY,
        'Content-Type': 'application/json'
      }
    };

    const url = `${ASAAS_BASE_URL}${endpoint}`;
    console.log(`\n🔍 Testando: ${url}`);

    https.get(url, options, (res) => {
      let data = '';
      
      console.log(`📡 Status: ${res.statusCode}`);
      console.log(`📋 Headers importantes:`);
      console.log(`   RateLimit-Limit: ${res.headers['ratelimit-limit'] || 'N/A'}`);
      console.log(`   RateLimit-Remaining: ${res.headers['ratelimit-remaining'] || 'N/A'}`);
      console.log(`   RateLimit-Reset: ${res.headers['ratelimit-reset'] || 'N/A'}`);
      
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode === 200) {
            console.log(`✅ Sucesso!`);
            resolve(parsed);
          } else {
            console.log(`❌ Erro:`, parsed);
            resolve(parsed);
          }
        } catch (e) {
          console.log(`❌ Resposta:`, data);
          resolve(data);
        }
      });
    }).on('error', (err) => {
      console.error('❌ Erro na requisição:', err.message);
      reject(err);
    });
  });
}

async function main() {
  console.log('\n========================================');
  console.log('🔬 TESTE DE QUOTA/LIMITE DA API ASAAS');
  console.log('========================================');

  // Teste 1: Conta
  console.log('\n📋 TESTE 1: Informações da conta');
  await testarAPI('/myAccount');
  
  await new Promise(r => setTimeout(r, 1000));

  // Teste 2: Lista clientes (1 apenas)
  console.log('\n📋 TESTE 2: Listar 1 cliente');
  await testarAPI('/customers?limit=1');
  
  await new Promise(r => setTimeout(r, 1000));

  // Teste 3: Lista parcelamentos (1 apenas)
  console.log('\n📋 TESTE 3: Listar 1 parcelamento');
  await testarAPI('/installments?limit=1');
  
  await new Promise(r => setTimeout(r, 1000));

  // Teste 4: Lista pagamentos/parcelas (1 apenas)
  console.log('\n📋 TESTE 4: Listar 1 pagamento');
  await testarAPI('/payments?limit=1');

  console.log('\n========================================');
  console.log('🎯 FIM DOS TESTES');
  console.log('========================================\n');
  
  console.log('💡 INTERPRETAÇÃO:');
  console.log('   - Status 200: API funcionando normalmente');
  console.log('   - Status 403: Chave inválida ou sem permissão');
  console.log('   - Status 429: Limite de requisições excedido');
  console.log('   - RateLimit-Remaining: Quantas requisições restam');
  console.log('   - RateLimit-Reset: Quando o limite reseta (timestamp)\n');
}

main();
