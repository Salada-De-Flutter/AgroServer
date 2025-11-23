require('dotenv').config();
const databaseService = require('../src/services/databaseService');

/**
 * Script para criar dados de teste no banco de dados
 */
async function setupTestData() {
  try {
    console.log('\n🔧 CONFIGURANDO DADOS DE TESTE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // 1. Criar vendedor
    console.log('👤 Criando vendedor...');
    const vendedorResult = await databaseService.query(
      `INSERT INTO vendedores (nome) 
       VALUES ('João Silva') 
       ON CONFLICT DO NOTHING
       RETURNING id, nome`
    );
    
    let vendedorId;
    if (vendedorResult.rows.length > 0) {
      vendedorId = vendedorResult.rows[0].id;
      console.log('✅ Vendedor criado:', vendedorResult.rows[0].nome);
      console.log('   ID:', vendedorId);
    } else {
      // Se já existe, busca o primeiro vendedor
      const existingVendedor = await databaseService.query('SELECT id, nome FROM vendedores LIMIT 1');
      vendedorId = existingVendedor.rows[0].id;
      console.log('✅ Usando vendedor existente:', existingVendedor.rows[0].nome);
      console.log('   ID:', vendedorId);
    }
    console.log('');

    // 2. Criar rota
    console.log('🛣️  Criando rota...');
    const rotaResult = await databaseService.query(
      `INSERT INTO rotas (nome, vendedor_id) 
       VALUES ('Rota Teste - Centro', $1) 
       RETURNING id, nome`,
      [vendedorId]
    );
    const rotaId = rotaResult.rows[0].id;
    console.log('✅ Rota criada:', rotaResult.rows[0].nome);
    console.log('   ID:', rotaId);
    console.log('');

    // 3. Adicionar vendas (IDs de parcelamentos do Asaas)
    console.log('💰 Adicionando vendas...');
    
    // Estes são os IDs dos parcelamentos que encontramos anteriormente
    const vendasIds = [
      '3ef2fc4b-8459-4270-822d-b6dc9dc61369',
      '880c6b02-df07-4c43-a550-007754ab317e',
      'afbf11a7-5ea2-4d82-a8f8-1b3a57cc5df6'
    ];

    for (const vendaId of vendasIds) {
      await databaseService.query(
        `INSERT INTO vendas (id, rota_id) 
         VALUES ($1, $2) 
         ON CONFLICT (id) DO NOTHING`,
        [vendaId, rotaId]
      );
      console.log(`  ✅ Venda adicionada: ${vendaId}`);
    }
    console.log('');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ DADOS DE TESTE CRIADOS COM SUCESSO!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📋 Use este ID de rota para testar:');
    console.log(`   ${rotaId}`);
    console.log('');
    console.log('📝 Exemplo de requisição:');
    console.log('   POST http://localhost:3000/api/rota/vendas');
    console.log(`   Body: { "rota_id": "${rotaId}" }`);
    console.log('');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ Erro ao criar dados de teste:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Executa o script
setupTestData();
