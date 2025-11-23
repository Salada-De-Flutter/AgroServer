/**
 * MÓDULO STANDALONE - CADASTRO RÁPIDO DE CLIENTES POR CPF
 * 
 * Este é um módulo separado da API, usado apenas para cadastros em lote.
 * Não faz parte da API principal.
 * 
 * USO: node scripts/cadastroRapidoStandalone.js
 */

const { Client } = require('pg');
const readline = require('readline');
require('dotenv').config();

// ===== CONFIGURAÇÃO DO BANCO =====
const DB_CONFIG = {
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Necessário para Supabase
  }
};

// ===== CONFIGURAÇÃO ASAAS =====
const ASAAS_API_KEY = process.env.ASAAS_API_KEY;
const ASAAS_BASE_URL = process.env.ASAAS_API_URL || 'https://api.asaas.com/v3';

// ===== LISTA DE CPFs =====
const CPFs = [
  '722.644.383-04',
  '799.624.243-72',
  '904.931.253-53',
  '887.368.813-68',
  '051.870.433-58',
  '002.831.203-12',
  '605.487.553-10',
  '994.096.903-15',
  '031.488.293-60',
  '783.311.613-00',
  '649.398.393-20',
  '051.009.323-09',
  '013.254.963-83',
  '505.628.943-49',
  '608.161.853-60',
  '021.666.113-70',
  '040.494.043-97',
  '058.986.823-33',
  '023.215.583-69',
  '603.043.133-19',
  '023.163.853-11',
  '009.243.733-85',
  '270.363.913-91',
  '848.984.533-68',
  '017.624.563-46',
  '057.696.643-63',
  '836.318.103-00',
  '405.603.413-34',
  '016.834.613-39',
  '030.912.093-42',
  '897.900.303-04',
  '608.428.583-00',
  '112.666.313-13',
  '048.836.473-66',
  '051.798.463-66',
  '867.610.563-49',
  '272.373.203-78',
  '069.021.343-32',
  '020.700.003-46',
  '044.634.523-76',
  '829.929.323-53',
  '623.455.873-93',
  '041.077.733-10',
  '017.000.203-90',
  '825.768.743-04',
  '819.406.703-06',
  '731.097.463-87',
  '038.397.873-43',
  '602.057.223-42',
  '279.321.413-20',
  '605.478.013-19',
  '009.344.413-32',
  '252.473.363-72',
  '466.640.923-87',
  '483.723.583-20',
  '610.114.183-71',
  '020.150.613-04',
  '018.432.873-07',
  '069.353.393-59',
  '281.558.743-20',
  '034.052.103-13',
  '973.803.933-91',
  '451.406.774-15',
  '041.349.603-12',
  '624.730.063-85',
  '805.791.163-87',
  '639.775.753-68',
  '046.098.563-95'
];

// Interface para input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function pergunta(texto) {
  return new Promise((resolve) => {
    rl.question(texto, resolve);
  });
}

// Função para fazer requisições ao Asaas
async function asaasRequest(endpoint, params = {}) {
  const https = require('https');
  const queryString = new URLSearchParams(params).toString();
  const url = `${ASAAS_BASE_URL}${endpoint}${queryString ? '?' + queryString : ''}`;
  
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
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error('Erro ao parsear resposta da API'));
        }
      });
    }).on('error', reject);
  });
}

// Lista rotas do banco
async function listarRotas(client) {
  const result = await client.query(`
    SELECT r.id, r.nome, v.nome as vendedor_nome 
    FROM rotas r 
    LEFT JOIN vendedores v ON r.vendedor_id = v.id 
    ORDER BY r.nome
  `);
  return result.rows;
}

// Processa um CPF
async function processarCPF(cpf, rotaId, client) {
  const cpfLimpo = cpf.replace(/\D/g, '');
  
  try {
    // 1. Busca cliente no Asaas
    const clienteResponse = await asaasRequest('/customers', { cpfCnpj: cpfLimpo });
    
    if (!clienteResponse.data || clienteResponse.data.length === 0) {
      return {
        cpf,
        status: 'ignorado',
        motivo: 'Cliente não encontrado no Asaas'
      };
    }

    const cliente = clienteResponse.data[0];

    // 2. Busca parcelamentos
    const parcelamentosResponse = await asaasRequest('/installments', { customer: cliente.id });
    const parcelamentos = parcelamentosResponse.data || [];

    // 3. Valida quantidade
    if (parcelamentos.length === 0) {
      return {
        cpf,
        clienteNome: cliente.name,
        status: 'ignorado',
        motivo: 'Cliente sem parcelamento'
      };
    }

    if (parcelamentos.length > 1) {
      return {
        cpf,
        clienteNome: cliente.name,
        status: 'ignorado',
        motivo: `Cliente com ${parcelamentos.length} parcelamentos (esperado: 1)`
      };
    }

    const parcelamento = parcelamentos[0];

    // 4. Verifica se já existe
    const existe = await client.query(
      'SELECT id FROM vendas WHERE id = $1 AND rota_id = $2',
      [parcelamento.id, rotaId]
    );

    if (existe.rows.length > 0) {
      return {
        cpf,
        clienteNome: cliente.name,
        status: 'ignorado',
        motivo: 'Já cadastrado nesta rota'
      };
    }

    // 5. Cadastra
    await client.query(
      `INSERT INTO vendas (id, rota_id) 
       VALUES ($1, $2) 
       ON CONFLICT (id) DO UPDATE SET rota_id = $2`,
      [parcelamento.id, rotaId]
    );

    return {
      cpf,
      clienteId: cliente.id,
      clienteNome: cliente.name,
      parcelamentoId: parcelamento.id,
      valor: parcelamento.value,
      parcelas: parcelamento.installmentCount,
      status: 'sucesso'
    };

  } catch (error) {
    return {
      cpf,
      status: 'erro',
      erro: error.message
    };
  }
}

// Função principal
async function main() {
  const client = new Client(DB_CONFIG);
  
  try {
    console.log('\n========================================');
    console.log('🚀 CADASTRO RÁPIDO DE CLIENTES POR CPF');
    console.log('   (MÓDULO STANDALONE)');
    console.log('========================================\n');

    // Conecta ao banco
    console.log('🔌 Conectando ao banco de dados...');
    await client.connect();
    console.log('✅ Conectado!\n');

    // Lista rotas
    console.log('📋 Carregando rotas disponíveis...\n');
    const rotas = await listarRotas(client);

    if (rotas.length === 0) {
      console.log('❌ Nenhuma rota encontrada no banco de dados.\n');
      rl.close();
      await client.end();
      return;
    }

    console.log('ROTAS DISPONÍVEIS:');
    console.log('==================');
    rotas.forEach((rota, index) => {
      const vendedor = rota.vendedor_nome || 'Sem vendedor';
      console.log(`${index + 1}. [ID: ${rota.id}] ${rota.nome} - ${vendedor}`);
    });
    console.log('');

    // Pede para escolher
    const escolha = await pergunta('Digite o NÚMERO da rota (ou "c" para cancelar): ');
    
    if (escolha.toLowerCase() === 'c') {
      console.log('\n❌ Operação cancelada.\n');
      rl.close();
      await client.end();
      return;
    }

    const indice = parseInt(escolha) - 1;
    
    if (isNaN(indice) || indice < 0 || indice >= rotas.length) {
      console.log('\n❌ Opção inválida.\n');
      rl.close();
      await client.end();
      return;
    }

    const rotaEscolhida = rotas[indice];
    console.log(`\n✅ Rota selecionada: ${rotaEscolhida.nome} (ID: ${rotaEscolhida.id})`);
    console.log(`📋 ${CPFs.length} CPFs serão processados\n`);

    // Confirma
    const confirma = await pergunta('Confirma o cadastro? (s/n): ');
    
    if (confirma.toLowerCase() !== 's' && confirma.toLowerCase() !== 'sim') {
      console.log('\n❌ Operação cancelada.\n');
      rl.close();
      await client.end();
      return;
    }

    // Fecha readline
    rl.close();

    // Processa CPFs
    console.log('\n🚀 Iniciando processamento...\n');
    const tempoInicio = Date.now();
    
    const resultados = {
      sucesso: [],
      ignorados: [],
      erros: []
    };

    // Processa em lotes de 5
    const BATCH_SIZE = 5;
    for (let i = 0; i < CPFs.length; i += BATCH_SIZE) {
      const batch = CPFs.slice(i, i + BATCH_SIZE);
      
      console.log(`📦 Processando lote ${Math.floor(i / BATCH_SIZE) + 1} (CPFs ${i + 1}-${Math.min(i + BATCH_SIZE, CPFs.length)})...`);
      
      const batchResults = await Promise.all(
        batch.map(cpf => processarCPF(cpf, rotaEscolhida.id, client))
      );

      batchResults.forEach(result => {
        if (result.status === 'sucesso') {
          resultados.sucesso.push(result);
          console.log(`  ✅ ${result.cpf} - ${result.clienteNome}`);
        } else if (result.status === 'ignorado') {
          resultados.ignorados.push(result);
          console.log(`  ⚠️  ${result.cpf} - ${result.motivo}`);
        } else {
          resultados.erros.push(result);
          console.log(`  ❌ ${result.cpf} - ${result.erro}`);
        }
      });

      // Delay entre lotes
      if (i + BATCH_SIZE < CPFs.length) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }

    const tempoTotal = ((Date.now() - tempoInicio) / 1000).toFixed(2);

    // Resumo
    console.log('\n========================================');
    console.log('📊 RESUMO DO PROCESSAMENTO');
    console.log('========================================');
    console.log(`Rota: ${rotaEscolhida.nome}`);
    console.log(`Total processado: ${CPFs.length}`);
    console.log(`✅ Cadastrados: ${resultados.sucesso.length}`);
    console.log(`⚠️  Ignorados: ${resultados.ignorados.length}`);
    console.log(`❌ Erros: ${resultados.erros.length}`);
    console.log(`⏱️  Tempo total: ${tempoTotal}s`);
    console.log('========================================\n');

    console.log('🎉 Processo concluído!\n');

  } catch (error) {
    console.error('\n❌ ERRO FATAL:', error.message);
    console.error(error);
  } finally {
    await client.end();
    process.exit(0);
  }
}

// Executa
main();
