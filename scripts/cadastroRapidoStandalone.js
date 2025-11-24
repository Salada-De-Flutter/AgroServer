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
  '035.687.163-05',
  '068.757.663-61',
  '836.318.103-00',
  '022.098.783-14',
  '036.030.433-83',
  '475.630.953-49',
  '021.991.783-31',
  '013.235.333-46',
  '030.441.183-36',
  '749.592.473-04',
  '029.081.303-43',
  '036.765.143-27',
  '612.208.483-28',
  '022.219.853-20',
  '849.155.603-68',
  '602.283.153-95',
  '611.191.693-99',
  '602.850.023-25',
  '087.163.133-48',
  '053.208.453-59',
  '053.578.853-38',
  '723.611.663-72',
  '006.986.983-98',
  '626.382.863-38',
  '040.086.023-64',
  '006.861.503-50',
  '795.846.833-49',
  '612.068.123-03',
  '050.126.383-79',
  '009.742.493-51',
  '471.604.703-20',
  '016.920.903-21',
  '804.881.883-34',
  '638.924.693-50',
  '001.007.243-88',
  '718.236.893-53',
  '017.027.593-00',
  '019.958.253-01',
  '061.843.763-06',
  '033.577.093-25',
  '015.634.783-07',
  '608.161.853-60',
  '008.931.943-52',
  '645.867.313-20',
  '953.721.993-34',
  '625.550.733-53',
  '020.283.573-12',
  '018.221.433-81',
  '602.849.823-85',
  '049.688.983-47',
  '121.933.933-46',
  '605.526.523-00',
  '863.014.973-68',
  '018.160.603-80',
  '715.747.603-75',
  '053.224.383-86',
  '021.130.953-27',
  '888.352.193-53',
  '811.507.763-15',
  '781.320.103-53',
  '146.455.563-04',
  '268.963.383-34',
  '920.797.333-20',
  '968.600.143-34',
  '271.925.393-68',
  '602.241.923-96',
  '171.901.852-91',
  '084.710.803-11',
  '764.089.733-53',
  '018.946.063-61',
  '183.986.853-87',
  '004.659.663-14',
  '502.120.013-53',
  '235.282.223-87',
  '799.747.403-04',
  '624.477.873-16',
  '005.554.843-19',
  '600.507.493-82',
  '865.086.523-20',
  '082.264.133-03',
  '016.531.573-30',
  '601.486.183-16',
  '147.238.753-87',
  '747.714.423-04',
  '013.560.773-66',
  '604.929.083-03',
  '002.723.933-04',
  '857.406.593-53',
  '062.348.583-41',
  '837.984.713-04',
  '672.578.793-20',
  '315.067.633-91',
  '395.187.283-72',
  '052.050.363-54',
  '022.456.883-33',
  '029.697.603-20',
  '471.120.693-00',
  '100.057.493-87',
  '263.101.553-34',
  '737.396.261-00',
  '372.950.474-68',
  '003.545.883-62',
  '347.333.023-04',
  '039.301.123-29',
  '530.627.953-87',
  '044.838.823-50'
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

    // Processa em lotes de 10 (desempenho máximo com proteção automática)
    const BATCH_SIZE = 10;
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

      // Delay entre lotes (100ms para desempenho máximo)
      if (i + BATCH_SIZE < CPFs.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
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
