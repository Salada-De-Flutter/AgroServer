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
  '931.830.541-91',
  '883.304.353-34',
  '054.415.138-02',
  '008.347.123-50',
  '028.348.253-27',
  '015.451.143-90',
  '754.686.033-49',
  '350.888.933-53',
  '038.884.383-73',
  '288.426.693-34',
  '689.236.863-87',
  '336.749.653-72',
  '106.445.983-87',
  '999.925.903-00',
  '016.926.433-55',
  '406.928.683-72',
  '613.469.013-92',
  '876.274.343-00',
  '715.004.563-49',
  '183.304.598-02',
  '016.278.603-47',
  '068.881.743-28',
  '044.344.583-45',
  '094.116.673-25',
  '036.136.453-94',
  '779.349.893-34',
  '043.218.703-05',
  '016.163.673-00',
  '249.728.353-20',
  '035.720.923-02',
  '067.443.863-95',
  '166.575.433-87',
  '402.736.378-78',
  '060.566.023.97',
  '929.682.873-20',
  '888.363.393-87',
  '248.658.503-68',
  '128.257.563-50',
  '006.762.343-30',
  '009.369.253-61',
  '607.306.633-37',
  '612.067.463-27',
  '035.942.103-24',
  '079.490.023-28',
  '411.822.508-58',
  '039.300.083-43',
  '624.465.183-97',
  '989.228.313-91',
  '997.392.673-00',
  '000.103.333-63',
  '117.215.223-36',
  '610.826.303-22',
  '861.128.993-53',
  '909.009.013-49',
  '339.796.003-78',
  '080.302.343-09',
  '736.085.303-63',
  '602.437.213-23',
  '339.814.183-87',
  '005.181.923-69',
  '050.056.343-80',
  '049.002.553-60',
  '029.998.833-31',
  '023.062.003-51',
  '447.937.878-27',
  '003.269.273-01',
  '045.760.373-90',
  '352.543.003-53',
  '606.490.913-70',
  '019.637.273-98',
  '029.549.023-37',
  '292.420.292-20',
  '716.739.893-49',
  '748.280.103-00',
  '602.424.233-61',
  '088.216.863-02',
  '789.815.303-00',
  '000.713.093-73',
  '049.214.433-86',
  '012.272.903-06',
  '870.237.763-20',
  '601.881.593-12'
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
