/**
 * Script para testar a API de Dashboard localmente
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

async function testarDashboard() {
  console.log('\n🧪 TESTANDO API DE DASHBOARD\n');
  console.log('='.repeat(60));
  
  try {
    // Teste 1: Período padrão (mês atual)
    console.log('\n📊 Teste 1: Período Padrão (Mês Atual)');
    console.log('-'.repeat(60));
    
    const response1 = await axios.post(`${BASE_URL}/dashboard/metricas`, {
      usuario_id: '550e8400-e29b-41d4-a716-446655440000'
    });
    
    console.log('✅ Status:', response1.status);
    console.log('⏱️  Tempo:', response1.data.performance.tempoProcessamento);
    console.log('\n📈 Métricas Financeiras:');
    console.log(JSON.stringify(response1.data.data.metricasFinanceiras, null, 2));
    console.log('\n📊 Indicadores Operacionais:');
    console.log(JSON.stringify(response1.data.data.indicadoresOperacionais, null, 2));
    console.log('\n📦 Análise de Parcelas:');
    console.log(JSON.stringify(response1.data.data.analiseParcelas, null, 2));
    console.log('\n🚨 Alertas:');
    console.log(JSON.stringify(response1.data.data.alertas, null, 2));
    
    // Teste 2: Período específico
    console.log('\n\n📊 Teste 2: Período Específico (2025 completo)');
    console.log('-'.repeat(60));
    
    const response2 = await axios.post(`${BASE_URL}/dashboard/metricas`, {
      usuario_id: '550e8400-e29b-41d4-a716-446655440000',
      data_inicio: '2025-01-01',
      data_fim: '2025-12-31'
    });
    
    console.log('✅ Status:', response2.status);
    console.log('⏱️  Tempo:', response2.data.performance.tempoProcessamento);
    console.log('\n💰 Faturamento Total:', response2.data.data.metricasFinanceiras.faturamentoTotal);
    console.log('💵 Receita Recebida:', response2.data.data.metricasFinanceiras.receitaRecebida);
    console.log('⏳ Receita a Receber:', response2.data.data.metricasFinanceiras.receitaAReceber);
    console.log('⚠️  Receita Vencida:', response2.data.data.metricasFinanceiras.receitaVencida);
    console.log('📉 Taxa Inadimplência:', response2.data.data.metricasFinanceiras.taxaInadimplencia + '%');
    
    // Teste 3: Erro sem usuario_id
    console.log('\n\n📊 Teste 3: Validação (sem usuario_id)');
    console.log('-'.repeat(60));
    
    try {
      await axios.post(`${BASE_URL}/dashboard/metricas`, {
        data_inicio: '2025-01-01',
        data_fim: '2025-12-31'
      });
    } catch (error) {
      console.log('✅ Erro esperado capturado:');
      console.log('   Status:', error.response.status);
      console.log('   Mensagem:', error.response.data.message);
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ TODOS OS TESTES CONCLUÍDOS COM SUCESSO!\n');
    
  } catch (error) {
    console.error('\n❌ ERRO NO TESTE:');
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Dados:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('   Mensagem:', error.message);
      console.error('   Dica: Verifique se o servidor está rodando em http://localhost:3000');
    }
    console.log('');
    process.exit(1);
  }
}

// Executar teste
testarDashboard();
