require('dotenv').config();
const readline = require('readline');
const asaasService = require('../src/services/asaasService');
const databaseService = require('../src/services/databaseService');

// Cria interface de leitura do terminal
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Função para fazer perguntas no terminal
function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

/**
 * Script interativo para cadastrar vendas
 */
async function cadastrarVenda() {
  try {
    console.log('\n╔══════════════════════════════════════════════════╗');
    console.log('║  📝 CADASTRO DE VENDA - Sistema AgroServer      ║');
    console.log('╚══════════════════════════════════════════════════╝\n');

    // 1. Pedir CPF do cliente
    const cpf = await question('Digite o CPF do cliente (apenas números): ');
    console.log('\n🔍 Buscando cliente no Asaas...');

    // Buscar cliente pelo CPF
    const clientesResponse = await asaasService.listCustomers({ cpfCnpj: cpf });
    
    if (!clientesResponse.data || clientesResponse.data.length === 0) {
      console.log('❌ Cliente não encontrado com este CPF.\n');
      rl.close();
      return;
    }

    const cliente = clientesResponse.data[0];
    console.log('✅ Cliente encontrado:');
    console.log(`   Nome: ${cliente.name}`);
    console.log(`   ID: ${cliente.id}\n`);

    // 2. Buscar parcelamentos do cliente
    console.log('🔍 Buscando parcelamentos do cliente...');
    const installmentsResponse = await asaasService.client.get('/installments', {
      params: { customer: cliente.id }
    });

    const parcelamentos = installmentsResponse.data.data || [];
    
    if (parcelamentos.length === 0) {
      console.log('❌ Este cliente não possui parcelamentos.\n');
      rl.close();
      return;
    }

    console.log(`\n✅ Encontrados ${parcelamentos.length} parcelamento(s):\n`);
    parcelamentos.forEach((p, index) => {
      console.log(`[${index + 1}] ID: ${p.id}`);
      console.log(`    Valor: R$ ${p.value}`);
      console.log(`    Parcelas: ${p.installmentCount}x`);
      console.log(`    Descrição: ${p.description || 'N/A'}`);
      console.log(`    Data: ${p.dateCreated}\n`);
    });

    // 3. Selecionar parcelamento
    const parcelamentoIndex = await question(`Selecione o parcelamento [1-${parcelamentos.length}]: `);
    const parcelamentoSelecionado = parcelamentos[parseInt(parcelamentoIndex) - 1];

    if (!parcelamentoSelecionado) {
      console.log('❌ Opção inválida.\n');
      rl.close();
      return;
    }

    console.log(`\n✅ Parcelamento selecionado: ${parcelamentoSelecionado.id}\n`);

    // 4. Listar rotas disponíveis
    console.log('🔍 Buscando rotas disponíveis...');
    const rotasResult = await databaseService.query(`
      SELECT r.id, r.nome, v.nome as vendedor_nome 
      FROM rotas r 
      LEFT JOIN vendedores v ON r.vendedor_id = v.id 
      ORDER BY r.data_criacao DESC
    `);

    if (rotasResult.rows.length === 0) {
      console.log('❌ Nenhuma rota cadastrada no sistema.\n');
      rl.close();
      return;
    }

    console.log(`\n✅ Encontradas ${rotasResult.rows.length} rota(s):\n`);
    rotasResult.rows.forEach((r, index) => {
      console.log(`[${index + 1}] ${r.nome}`);
      console.log(`    Vendedor: ${r.vendedor_nome || 'N/A'}`);
      console.log(`    ID: ${r.id}\n`);
    });

    // 5. Selecionar rota
    const rotaIndex = await question(`Selecione a rota [1-${rotasResult.rows.length}]: `);
    const rotaSelecionada = rotasResult.rows[parseInt(rotaIndex) - 1];

    if (!rotaSelecionada) {
      console.log('❌ Opção inválida.\n');
      rl.close();
      return;
    }

    console.log(`\n✅ Rota selecionada: ${rotaSelecionada.nome}\n`);

    // 6. Confirmar cadastro
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 RESUMO DO CADASTRO:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Cliente: ${cliente.name}`);
    console.log(`CPF: ${cpf}`);
    console.log(`Parcelamento: ${parcelamentoSelecionado.id}`);
    console.log(`Valor: R$ ${parcelamentoSelecionado.value} (${parcelamentoSelecionado.installmentCount}x)`);
    console.log(`Rota: ${rotaSelecionada.nome}`);
    console.log(`Vendedor: ${rotaSelecionada.vendedor_nome || 'N/A'}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const confirmar = await question('Confirma o cadastro? (s/n): ');

    if (confirmar.toLowerCase() !== 's') {
      console.log('\n❌ Cadastro cancelado.\n');
      rl.close();
      return;
    }

    // 7. Cadastrar no banco de dados
    console.log('\n💾 Cadastrando venda no banco de dados...');
    
    await databaseService.query(
      `INSERT INTO vendas (id, rota_id) 
       VALUES ($1, $2) 
       ON CONFLICT (id) DO UPDATE SET rota_id = $2`,
      [parcelamentoSelecionado.id, rotaSelecionada.id]
    );

    console.log('\n╔══════════════════════════════════════════════════╗');
    console.log('║  ✅ VENDA CADASTRADA COM SUCESSO!               ║');
    console.log('╚══════════════════════════════════════════════════╝\n');
    console.log(`ID da Venda: ${parcelamentoSelecionado.id}`);
    console.log(`Rota: ${rotaSelecionada.nome}\n`);

    rl.close();
    process.exit(0);

  } catch (error) {
    console.error('\n❌ ERRO:', error.message);
    console.error(error);
    rl.close();
    process.exit(1);
  }
}

// Executa o script
cadastrarVenda();
