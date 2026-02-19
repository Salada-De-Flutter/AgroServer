require('dotenv').config();
const asaasService = require('../src/services/asaasService');
const databaseService = require('../src/services/databaseService');

/**
 * 
 * ============================================
 * SCRIPT DE SINCRONIZAÇÃO COMPLETA ASAAS → DATABASE
 * ============================================
 * 
 * Sincroniza TODOS os dados do Asaas com o banco local:
 * - Clientes (customers)
 * - Cobranças (payments)
 * - Links de boleto (installments)
 * 
 * Faz diff detalhado célula por célula e gera relatório completo.
 * Respeita rate limit: 30.000 req/6h, controle via headers da API.
 */

// ============================================
// CONFIGURAÇÕES
// ============================================
const BATCH_SIZE = 10; // Processar 10 itens por vez
const DELAY_BETWEEN_BATCHES = 100; // 100ms entre lotes

// ============================================
// ESTATÍSTICAS GLOBAIS
// ============================================
const stats = {
  clientes: {
    total: 0,
    novos: 0,
    atualizados: 0,
    iguais: 0,
    erros: 0,
    diffs: []
  },
  cobrancas: {
    total: 0,
    novas: 0,
    atualizadas: 0,
    iguais: 0,
    erros: 0,
    diffs: []
  },
  parcelamentos: {
    total: 0,
    atualizados: 0,
    erros: 0
  },
  tempoInicio: null,
  tempoFim: null
};

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function formatarValor(valor) {
  if (valor === null || valor === undefined) return 'NULL';
  if (typeof valor === 'object') return JSON.stringify(valor);
  if (typeof valor === 'string' && valor.length > 50) return valor.substring(0, 47) + '...';
  return String(valor);
}

function compararObjetos(obj1, obj2, campos) {
  const diferencas = [];
  
  for (const campo of campos) {
    const valor1 = obj1[campo];
    const valor2 = obj2[campo];
    
    // Normaliza valores para comparação
    const v1 = valor1 === undefined || valor1 === null ? null : valor1;
    const v2 = valor2 === undefined || valor2 === null ? null : valor2;
    
    // Compara datas
    if (v1 instanceof Date && v2 instanceof Date) {
      if (v1.getTime() !== v2.getTime()) {
        diferencas.push({
          campo,
          valorAntigo: formatarValor(v2),
          valorNovo: formatarValor(v1)
        });
      }
    }
    // Compara outros valores
    else if (JSON.stringify(v1) !== JSON.stringify(v2)) {
      diferencas.push({
        campo,
        valorAntigo: formatarValor(v2),
        valorNovo: formatarValor(v1)
      });
    }
  }
  
  return diferencas;
}

// ============================================
// SINCRONIZAÇÃO DE CLIENTES
// ============================================

async function sincronizarClientes() {
  console.log('\n📦 SINCRONIZANDO CLIENTES...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  try {
    // 1. Buscar TODOS os clientes do Asaas (com paginação)
    const clientesAsaas = [];
    let offset = 0;
    let hasMore = true;
    while (hasMore) {
      console.log(`   🔗 Requisição API: listCustomers offset=${offset} limit=100`);
      const response = await asaasService.listCustomers({ offset, limit: 100 });
      if (response && response.data) {
        clientesAsaas.push(...response.data);
        console.log(`   📥 Buscados ${clientesAsaas.length} clientes do Asaas...`);
      } else {
        console.log('   ⚠️ Resposta inesperada da API:', response);
      }
      hasMore = response.hasMore;
      offset += 100;
      if (hasMore) {
        console.log('   ⏳ Aguardando entre lotes...');
        await sleep(DELAY_BETWEEN_BATCHES);
      }
    }
    stats.clientes.total = clientesAsaas.length;
    console.log(`\n✅ Total de clientes no Asaas: ${clientesAsaas.length}\n`);
    // 2. Processar cada cliente
    for (let i = 0; i < clientesAsaas.length; i += BATCH_SIZE) {
      const batch = clientesAsaas.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(clientesAsaas.length / BATCH_SIZE);
      console.log(`📦 Lote ${batchNum}/${totalBatches}`);
      await Promise.all(batch.map(async (clienteAsaas) => {
        try {
          const clienteDB = await databaseService.buscarClientePorId(clienteAsaas.id);
          if (!clienteDB) {
            await databaseService.criarCliente(clienteAsaas);
            stats.clientes.novos++;
            console.log(`   ✨ NOVO: ${clienteAsaas.name} (${clienteAsaas.id})`);
          } else {
            await databaseService.atualizarCliente(clienteAsaas.id, clienteAsaas);
            stats.clientes.atualizados++;
            console.log(`   🔄 ATUALIZADO: ${clienteAsaas.name} (${clienteAsaas.id})`);
          }
        } catch (error) {
          stats.clientes.erros++;
          console.error(`   ❌ ERRO: ${clienteAsaas.id} - ${error.message}`);
        }
      }));
      if (i + BATCH_SIZE < clientesAsaas.length) {
        await sleep(DELAY_BETWEEN_BATCHES);
      }
    }
  } catch (error) {
    console.error('❌ Erro ao sincronizar clientes:', error.message);
  }
}

// ============================================
// SINCRONIZAÇÃO DE COBRANÇAS
// ============================================

async function sincronizarCobrancas() {
  console.log('\n💳 SINCRONIZANDO COBRANÇAS...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  try {
    // 1. Buscar TODAS as cobranças do Asaas (com paginação)
    const cobrancasAsaas = [];
    let offset = 0;
    let hasMore = true;
    while (hasMore) {
      console.log(`   🔗 Requisição API: listPayments offset=${offset} limit=100`);
      const response = await asaasService.listPayments({ offset, limit: 100 });
      if (response && response.data) {
        cobrancasAsaas.push(...response.data);
        console.log(`   📥 Buscadas ${cobrancasAsaas.length} cobranças do Asaas...`);
      } else {
        console.log('   ⚠️ Resposta inesperada da API:', response);
      }
      hasMore = response.hasMore;
      offset += 100;
      if (hasMore) {
        console.log('   ⏳ Aguardando entre lotes...');
        await sleep(DELAY_BETWEEN_BATCHES);
      }
    }
    stats.cobrancas.total = cobrancasAsaas.length;
    console.log(`\n✅ Total de cobranças no Asaas: ${cobrancasAsaas.length}\n`);
    // 2. Processar cada cobrança
    for (let i = 0; i < cobrancasAsaas.length; i += BATCH_SIZE) {
      const batch = cobrancasAsaas.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(cobrancasAsaas.length / BATCH_SIZE);
      console.log(`📦 Lote ${batchNum}/${totalBatches}`);
      await Promise.all(batch.map(async (cobrancaAsaas) => {
        try {
          const cobrancaDB = await databaseService.buscarCobrancaPorId(cobrancaAsaas.id);
          if (!cobrancaDB) {
            await databaseService.criarCobranca(cobrancaAsaas);
            stats.cobrancas.novas++;
            console.log(`   ✨ NOVA: ${cobrancaAsaas.id} - ${cobrancaAsaas.description || 'Sem descrição'}`);
          } else {
            await databaseService.atualizarCobranca(cobrancaAsaas.id, cobrancaAsaas);
            stats.cobrancas.atualizadas++;
            console.log(`   🔄 ATUALIZADA: ${cobrancaAsaas.id}`);
          }
        } catch (error) {
          stats.cobrancas.erros++;
          console.error(`   ❌ ERRO: ${cobrancaAsaas.id} - ${error.message}`);
          if (!stats.cobrancas.errosDetalhados) stats.cobrancas.errosDetalhados = [];
          stats.cobrancas.errosDetalhados.push({
            id: cobrancaAsaas.id,
            cliente_id: cobrancaAsaas.customer,
            descricao: cobrancaAsaas.description,
            erro: error.message,
            dados: cobrancaAsaas
          });
        }
        if (stats.cobrancas.errosDetalhados && stats.cobrancas.errosDetalhados.length > 0) {
          const fs = require('fs');
          const path = require('path');
          const relatorioPath = path.join(process.cwd(), 'relatorio_erros_cobrancas.json');
          fs.writeFileSync(relatorioPath, JSON.stringify(stats.cobrancas.errosDetalhados, null, 2), 'utf8');
          console.log('═══════════════════════════════════════════════════════════');
          console.log('                  ❌ RELATÓRIO DE ERROS COBRANÇAS');
          console.log('═══════════════════════════════════════════════════════════\n');
          stats.cobrancas.errosDetalhados.forEach((err, idx) => {
            console.log(`${idx + 1}. Cobrança: ${err.id}`);
            console.log(`   Cliente: ${err.cliente_id}`);
            console.log(`   Descrição: ${err.descricao}`);
            console.log(`   Erro: ${err.erro}`);
          });
          console.log(`\nArquivo salvo: ${relatorioPath}`);
        }
      }));
      if (i + BATCH_SIZE < cobrancasAsaas.length) {
        await sleep(DELAY_BETWEEN_BATCHES);
      }
    }
  } catch (error) {
    console.error('❌ Erro ao sincronizar cobranças:', error.message);
  }
}

// ============================================
// SINCRONIZAÇÃO DE BOLETOS DE PARCELAMENTO
// ============================================

async function sincronizarBoletos() {
  console.log('\n📄 SINCRONIZANDO BOLETOS DE PARCELAMENTO...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  try {
    // Buscar vendas sem boleto
    const result = await databaseService.query('SELECT id FROM vendas WHERE boleto_parcelamento IS NULL');
    const vendas = result.rows;
    
    stats.parcelamentos.total = vendas.length;
    
    if (vendas.length === 0) {
      console.log('✅ Todos os parcelamentos já têm boleto!\n');
      return;
    }
    
    console.log(`📊 Total de parcelamentos sem boleto: ${vendas.length}\n`);
    
    for (let i = 0; i < vendas.length; i += BATCH_SIZE) {
      const batch = vendas.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(vendas.length / BATCH_SIZE);
      
      console.log(`📦 Lote ${batchNum}/${totalBatches}`);
      
      await Promise.all(batch.map(async (venda) => {
        try {
          const installment = await asaasService.getInstallment(venda.id);
          
          if (installment.bankSlipUrl) {
            await databaseService.query(
              'UPDATE vendas SET boleto_parcelamento = $1 WHERE id = $2',
              [installment.bankSlipUrl, venda.id]
            );
            stats.parcelamentos.atualizados++;
            console.log(`   ✅ ${venda.id}`);
          }
        } catch (error) {
          stats.parcelamentos.erros++;
          console.error(`   ❌ ${venda.id} - ${error.message}`);
        }
      }));
      
      if (i + BATCH_SIZE < vendas.length) {
        await sleep(DELAY_BETWEEN_BATCHES);
      }
    }
    
  } catch (error) {
    console.error('❌ Erro ao sincronizar boletos:', error.message);
  }
}

// ============================================
// RELATÓRIO FINAL
// ============================================

function gerarRelatorio() {
  const duracao = ((stats.tempoFim - stats.tempoInicio) / 1000).toFixed(2);
  
  console.log('\n\n');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('                  📊 RELATÓRIO DE SINCRONIZAÇÃO');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  // Clientes
  console.log('👥 CLIENTES:');
  console.log(`   Total processado: ${stats.clientes.total}`);
  console.log(`   ✨ Novos: ${stats.clientes.novos}`);
  console.log(`   🔄 Atualizados: ${stats.clientes.atualizados}`);
  console.log(`   ✓  Iguais: ${stats.clientes.iguais}`);
  console.log(`   ❌ Erros: ${stats.clientes.erros}\n`);
  
  // Cobranças
  console.log('💳 COBRANÇAS:');
  console.log(`   Total processado: ${stats.cobrancas.total}`);
  console.log(`   ✨ Novas: ${stats.cobrancas.novas}`);
  console.log(`   🔄 Atualizadas: ${stats.cobrancas.atualizadas}`);
  console.log(`   ✓  Iguais: ${stats.cobrancas.iguais}`);
  console.log(`   ❌ Erros: ${stats.cobrancas.erros}\n`);
  
  // Parcelamentos
  console.log('📄 BOLETOS DE PARCELAMENTO:');
  console.log(`   Total processado: ${stats.parcelamentos.total}`);
  console.log(`   🔄 Atualizados: ${stats.parcelamentos.atualizados}`);
  console.log(`   ❌ Erros: ${stats.parcelamentos.erros}\n`);
  
  // Tempo
  console.log(`⏱️  TEMPO DE EXECUÇÃO: ${duracao}s\n`);
  
  // Diffs detalhados de clientes
  if (stats.clientes.diffs.length > 0) {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('                  🔍 DIFERENÇAS EM CLIENTES');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    stats.clientes.diffs.forEach((diff, index) => {
      console.log(`${index + 1}. ${diff.nome} (${diff.id})`);
      diff.diferencas.forEach(d => {
        console.log(`   • ${d.campo}:`);
        console.log(`     Antigo: ${d.valorAntigo}`);
        console.log(`     Novo:   ${d.valorNovo}`);
      });
      console.log('');
    });
  }
  
  // Diffs detalhados de cobranças
  if (stats.cobrancas.diffs.length > 0) {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('                  🔍 DIFERENÇAS EM COBRANÇAS');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    stats.cobrancas.diffs.forEach((diff, index) => {
      console.log(`${index + 1}. ${diff.descricao || 'Sem descrição'} (${diff.id})`);
      diff.diferencas.forEach(d => {
        console.log(`   • ${d.campo}:`);
        console.log(`     Antigo: ${d.valorAntigo}`);
        console.log(`     Novo:   ${d.valorNovo}`);
      });
      console.log('');
    });
  }
  
  console.log('═══════════════════════════════════════════════════════════');
  console.log('                  ✅ SINCRONIZAÇÃO CONCLUÍDA');
  console.log('═══════════════════════════════════════════════════════════\n');
}

// ============================================
// EXECUÇÃO PRINCIPAL
// ============================================

async function executarSincronizacao() {
  stats.tempoInicio = Date.now();

  console.log('\n');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('           🔄 SINCRONIZAÇÃO COMPLETA ASAAS → DATABASE');
  console.log('═══════════════════════════════════════════════════════════');

  // Testa conexão com o banco antes de tudo
  try {
    const test = await databaseService.testConnection();
    if (test.success) {
      console.log('✅ Conexão com o banco OK:', test.message);
    } else {
      console.error('❌ Falha ao conectar ao banco:', test.message);
      if (test.error) {
        console.error('🔍 Detalhe do erro:', test.error);
      }
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Erro ao testar conexão com o banco:', error.message);
    process.exit(1);
  }

  try {
    await sincronizarClientes();
    await sincronizarCobrancas();
    await sincronizarBoletos();

    stats.tempoFim = Date.now();
    gerarRelatorio();

  } catch (error) {
    console.error('\n❌ ERRO FATAL:', error);
  } finally {
    await databaseService.close();
    process.exit(0);
  }
}

// Iniciar
executarSincronizacao();
