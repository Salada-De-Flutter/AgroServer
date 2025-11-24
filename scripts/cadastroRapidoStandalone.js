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
  '105.140.313-87',
  '552.476.443-87',
  '032.771.203-17',
  '260.048.013-72',
  '537.285.643-20',
  '039.693.533-86',
  '133.667.003-78',
  '019.221.383-04',
  '112.100.953-00',
  '207.840.313-04',
  '316.651.951-34',
  '010.347.918-00',
  '046.817.453-24',
  '417.502.411-53',
  '662.554.813-87',
  '199.269.953-49',
  '145.344.628-16',
  '054.676.813-03',
  '766.299.453-87',
  '076.319.083-70',
  '398.184.623-00',
  '046.817.483-40',
  '133.661.813-20',
  '533.371.745-15',
  '133.658.943-49',
  '033.299.453-89',
  '184.951.843-20',
  '082.034.307-24',
  '490.225.123-04',
  '044.758.313-18'
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

    // Processa em lotes de 5 (velocidade otimizada com proteção global)
    // Sistema global verifica estado ANTES de cada requisição (instantâneo!)
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

      // Sem delay artificial - proteção automática controla o ritmo
    }

    const tempoTotal = ((Date.now() - tempoInicio) / 1000).toFixed(2);

    // Calcula CPFs NÃO cadastrados (EXCLUI os "já cadastrados")
    const naoCadastrados = [...resultados.ignorados, ...resultados.erros].filter(item => {
      const motivo = item.motivo || item.erro || '';
      // Remove "já cadastrado na rota" da lista
      return !motivo.toLowerCase().includes('já cadastrado');
    });

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

    // Lista detalhada dos NÃO cadastrados (SEM os "já cadastrados")
    if (naoCadastrados.length > 0) {
      console.log('📋 CPFs NÃO CADASTRADOS NA ROTA (excluindo já cadastrados):');
      console.log('========================================');
      naoCadastrados.forEach(item => {
        const motivo = item.motivo || item.erro;
        console.log(`❌ ${item.cpf} - ${motivo}`);
      });
      console.log('========================================\n');
    }

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
