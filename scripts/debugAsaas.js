/**
 * Script de DEBUG - Testa busca de clientes no Asaas
 */

require('dotenv').config();
const https = require('https');

const ASAAS_API_KEY = process.env.ASAAS_API_KEY;
const ASAAS_BASE_URL = process.env.ASAAS_API_URL || 'https://api.asaas.com/v3';

console.log('🔧 Configurações carregadas:');
console.log(`   API URL: ${ASAAS_BASE_URL}`);
console.log(`   API Key: ${ASAAS_API_KEY ? ASAAS_API_KEY.substring(0, 25) + '...' : 'NÃO CONFIGURADA'}`);
console.log('');

async function asaasRequest(endpoint, params = {}) {
  const queryString = new URLSearchParams(params).toString();
  const url = `${ASAAS_BASE_URL}${endpoint}${queryString ? '?' + queryString : ''}`;
  
  console.log(`🔍 Requisição: ${url}`);
  console.log(`🔑 API Key (primeiros 20 chars): ${ASAAS_API_KEY.substring(0, 20)}...`);
  
  return new Promise((resolve, reject) => {
    const options = {
      method: 'GET',
      headers: {
        'access_token': ASAAS_API_KEY,
        'Content-Type': 'application/json'
      }
    };

    https.get(url, options, (res) => {
      let data = '';
      console.log(`📡 Status: ${res.statusCode}`);
      console.log(`📋 Headers:`, res.headers);
      
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          console.log(`📦 Resposta:`, JSON.stringify(parsed, null, 2));
          resolve(parsed);
        } catch (e) {
          console.error('❌ Erro ao parsear:', data);
          reject(new Error('Erro ao parsear resposta da API'));
        }
      });
    }).on('error', (err) => {
      console.error('❌ Erro na requisição:', err);
      reject(err);
    });
  });
}

async function main() {
  console.log('\n========================================');
  console.log('🔬 DEBUG - BUSCA DE CLIENTES ASAAS');
  console.log('========================================\n');

  // Teste 1: Lista TODOS os clientes (sem filtro)
  console.log('📋 TESTE 1: Listar primeiros 10 clientes sem filtro\n');
  try {
    const todosClientes = await asaasRequest('/customers', { limit: 10 });
    console.log(`\n✅ Total de clientes encontrados: ${todosClientes.totalCount || 0}`);
    if (todosClientes.data && todosClientes.data.length > 0) {
      console.log('\n👥 Primeiros clientes:');
      todosClientes.data.slice(0, 3).forEach(c => {
        console.log(`  - ${c.name} | CPF: ${c.cpfCnpj || 'N/A'}`);
      });
    }
  } catch (error) {
    console.error('❌ Erro no Teste 1:', error.message);
  }

  console.log('\n========================================\n');

  // Teste 2: Busca por CPF COM formatação
  const cpfFormatado = '931.830.541-91';
  console.log(`📋 TESTE 2: Buscar CPF COM formatação (${cpfFormatado})\n`);
  try {
    const resultado = await asaasRequest('/customers', { cpfCnpj: cpfFormatado });
    console.log(`\n✅ Encontrados: ${resultado.data?.length || 0} cliente(s)`);
  } catch (error) {
    console.error('❌ Erro no Teste 2:', error.message);
  }

  console.log('\n========================================\n');

  // Teste 3: Busca por CPF SEM formatação
  const cpfLimpo = '93183054191';
  console.log(`📋 TESTE 3: Buscar CPF SEM formatação (${cpfLimpo})\n`);
  try {
    const resultado = await asaasRequest('/customers', { cpfCnpj: cpfLimpo });
    console.log(`\n✅ Encontrados: ${resultado.data?.length || 0} cliente(s)`);
    if (resultado.data && resultado.data.length > 0) {
      console.log('📄 Dados do cliente:', resultado.data[0]);
    }
  } catch (error) {
    console.error('❌ Erro no Teste 3:', error.message);
  }

  console.log('\n========================================\n');
  console.log('🎯 FIM DO DEBUG\n');
}

main();
