/**
 * Script INTERATIVO para cadastro rápido de clientes em uma rota por CPF
 * 
 * USO:
 * node scripts/cadastroRapidoInterativo.js
 */

const axios = require('axios');
const readline = require('readline');

// ===== CONFIGURAÇÃO =====
const API_BASE_URL = 'http://localhost:3000/api';

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

// Interface para input do usuário
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function pergunta(texto) {
  return new Promise((resolve) => {
    rl.question(texto, resolve);
  });
}

// Busca rotas disponíveis
async function listarRotas() {
  try {
    const response = await axios.get(`${API_BASE_URL}/database/tables`);
    
    // Busca todas as rotas do banco
    const rotasResponse = await axios.post(`http://localhost:3000`, {
      query: 'SELECT id, nome, vendedor_id FROM rotas ORDER BY nome'
    });
    
    return rotasResponse.data || [];
  } catch (error) {
    // Se não conseguir listar rotas, retorna vazio
    return [];
  }
}

// Cadastra clientes
async function cadastrarClientes(rotaId) {
  try {
    console.log('\n🚀 Iniciando cadastro rápido...');
    console.log(`📋 Total de CPFs: ${CPFs.length}`);
    console.log(`🛣️  Rota ID: ${rotaId}\n`);

    const response = await axios.post(`${API_BASE_URL}/cadastro-rapido/clientes-por-cpf`, {
      rota_id: rotaId,
      cpfs: CPFs
    });

    const resultado = response.data;

    console.log('\n========================================');
    console.log('✅ PROCESSAMENTO CONCLUÍDO!');
    console.log('========================================');
    console.log(`Rota: ${resultado.rota.nome} (${resultado.rota.id})`);
    console.log('');
    console.log(`📊 Estatísticas:`);
    console.log(`   Total processado: ${resultado.processamento.total}`);
    console.log(`   ✅ Cadastrados: ${resultado.processamento.cadastrados}`);
    console.log(`   ⚠️  Ignorados: ${resultado.processamento.ignorados}`);
    console.log(`   ❌ Erros: ${resultado.processamento.erros}`);
    console.log(`   ⏱️  Tempo: ${resultado.processamento.tempoTotal}`);
    console.log('========================================\n');

    // Mostra clientes cadastrados com sucesso
    if (resultado.detalhes.sucesso.length > 0) {
      console.log('✅ CLIENTES CADASTRADOS:');
      resultado.detalhes.sucesso.forEach(c => {
        console.log(`   ${c.cpf} - ${c.clienteNome} (R$ ${c.valor} em ${c.parcelas}x)`);
      });
      console.log('');
    }

    // Mostra clientes ignorados (apenas primeiros 10)
    if (resultado.detalhes.ignorados.length > 0) {
      console.log(`⚠️  CLIENTES IGNORADOS (${resultado.detalhes.ignorados.length}):`);
      const mostrar = resultado.detalhes.ignorados.slice(0, 10);
      mostrar.forEach(c => {
        const nome = c.clienteNome ? ` - ${c.clienteNome}` : '';
        console.log(`   ${c.cpf}${nome} - ${c.motivo}`);
      });
      if (resultado.detalhes.ignorados.length > 10) {
        console.log(`   ... e mais ${resultado.detalhes.ignorados.length - 10} ignorados`);
      }
      console.log('');
    }

    // Mostra erros
    if (resultado.detalhes.erros.length > 0) {
      console.log('❌ ERROS:');
      resultado.detalhes.erros.forEach(c => {
        console.log(`   ${c.cpf} - ${c.erro}`);
      });
      console.log('');
    }

    console.log('🎉 Processo finalizado!\n');

  } catch (error) {
    console.error('\n❌ ERRO:', error.message);
    if (error.response) {
      console.error('Detalhes:', error.response.data);
    }
    throw error;
  }
}

// Função principal
async function main() {
  try {
    console.log('\n========================================');
    console.log('🚀 CADASTRO RÁPIDO DE CLIENTES POR CPF');
    console.log('========================================\n');
    console.log(`📋 ${CPFs.length} CPFs prontos para cadastro\n`);

    // Pergunta o ID da rota diretamente
    const rotaId = await pergunta('Digite o ID da rota onde deseja cadastrar os clientes: ');
    
    if (!rotaId || rotaId.trim() === '') {
      console.log('\n❌ ID da rota não fornecido. Cancelando...\n');
      rl.close();
      return;
    }

    // Confirma
    console.log(`\n📌 Você escolheu a rota ID: ${rotaId}`);
    const confirma = await pergunta('Confirma o cadastro? (s/n): ');
    
    if (confirma.toLowerCase() !== 's' && confirma.toLowerCase() !== 'sim') {
      console.log('\n❌ Operação cancelada pelo usuário.\n');
      rl.close();
      return;
    }

    // Fecha interface antes de iniciar o processamento
    rl.close();

    // Inicia cadastro
    await cadastrarClientes(rotaId.trim());

  } catch (error) {
    console.error('\n❌ Erro fatal:', error.message);
    rl.close();
    process.exit(1);
  }
}

// Executa
main();
