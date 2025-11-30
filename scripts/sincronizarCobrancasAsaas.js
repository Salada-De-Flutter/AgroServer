require('dotenv').config();
const asaasService = require('../src/services/asaasService');
const databaseService = require('../src/services/databaseService');

const PAGE_SIZE = 50;

async function upsertCobranca(cobranca) {
  const query = `
    INSERT INTO cobrancas (
      id, data_criacao, cliente_id, assinatura_id, parcelamento_id, sessao_checkout, link_pagamento, valor, valor_liquido, valor_original, valor_juros, descricao, forma_cobranca, cartao_final, bandeira_cartao, token_cartao, pode_pagar_apos_vencimento, transacao_pix, qr_code_pix, status, data_vencimento, data_vencimento_original, data_pagamento, data_pagamento_cliente, numero_parcela, url_fatura, numero_fatura, referencia_externa, deletado, antecipado, antecipavel, data_credito, data_credito_estimada, url_recibo_transacao, nosso_numero, url_boleto, desconto, multa, juros, split, motivo_cancelamento, envio_correios, dias_apos_vencimento_cancelamento, chargeback, estornos, splits_estornados, criado_em, atualizado_em
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44, $45, $46, NOW(), NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      data_criacao = EXCLUDED.data_criacao,
      cliente_id = EXCLUDED.cliente_id,
      assinatura_id = EXCLUDED.assinatura_id,
      parcelamento_id = EXCLUDED.parcelamento_id,
      sessao_checkout = EXCLUDED.sessao_checkout,
      link_pagamento = EXCLUDED.link_pagamento,
      valor = EXCLUDED.valor,
      valor_liquido = EXCLUDED.valor_liquido,
      valor_original = EXCLUDED.valor_original,
      valor_juros = EXCLUDED.valor_juros,
      descricao = EXCLUDED.descricao,
      forma_cobranca = EXCLUDED.forma_cobranca,
      cartao_final = EXCLUDED.cartao_final,
      bandeira_cartao = EXCLUDED.bandeira_cartao,
      token_cartao = EXCLUDED.token_cartao,
      pode_pagar_apos_vencimento = EXCLUDED.pode_pagar_apos_vencimento,
      transacao_pix = EXCLUDED.transacao_pix,
      qr_code_pix = EXCLUDED.qr_code_pix,
      status = EXCLUDED.status,
      data_vencimento = EXCLUDED.data_vencimento,
      data_vencimento_original = EXCLUDED.data_vencimento_original,
      data_pagamento = EXCLUDED.data_pagamento,
      data_pagamento_cliente = EXCLUDED.data_pagamento_cliente,
      numero_parcela = EXCLUDED.numero_parcela,
      url_fatura = EXCLUDED.url_fatura,
      numero_fatura = EXCLUDED.numero_fatura,
      referencia_externa = EXCLUDED.referencia_externa,
      deletado = EXCLUDED.deletado,
      antecipado = EXCLUDED.antecipado,
      antecipavel = EXCLUDED.antecipavel,
      data_credito = EXCLUDED.data_credito,
      data_credito_estimada = EXCLUDED.data_credito_estimada,
      url_recibo_transacao = EXCLUDED.url_recibo_transacao,
      nosso_numero = EXCLUDED.nosso_numero,
      url_boleto = EXCLUDED.url_boleto,
      desconto = EXCLUDED.desconto,
      multa = EXCLUDED.multa,
      juros = EXCLUDED.juros,
      split = EXCLUDED.split,
      motivo_cancelamento = EXCLUDED.motivo_cancelamento,
      envio_correios = EXCLUDED.envio_correios,
      dias_apos_vencimento_cancelamento = EXCLUDED.dias_apos_vencimento_cancelamento,
      chargeback = EXCLUDED.chargeback,
      estornos = EXCLUDED.estornos,
      splits_estornados = EXCLUDED.splits_estornados,
      atualizado_em = NOW();
  `;
  const values = [
    cobranca.id,
    cobranca.dateCreated,
    cobranca.customer,
    cobranca.subscription,
    cobranca.installment,
    cobranca.checkoutSession,
    cobranca.paymentLink,
    cobranca.value,
    cobranca.netValue,
    cobranca.originalValue,
    cobranca.interestValue,
    cobranca.description,
    cobranca.billingType,
    cobranca.creditCardNumber,
    cobranca.creditCardBrand,
    cobranca.creditCardToken,
    cobranca.canBePaidAfterDueDate,
    cobranca.pixTransaction,
    cobranca.pixQrCodeId,
    cobranca.status,
    cobranca.dueDate,
    cobranca.originalDueDate,
    cobranca.paymentDate,
    cobranca.clientPaymentDate,
    cobranca.installmentNumber,
    cobranca.invoiceUrl,
    cobranca.invoiceNumber,
    cobranca.externalReference,
    cobranca.deleted,
    cobranca.anticipated,
    cobranca.anticipable,
    cobranca.creditDate,
    cobranca.estimatedCreditDate,
    cobranca.transactionReceiptUrl,
    cobranca.nossoNumero,
    cobranca.bankSlipUrl,
    cobranca.discount ? JSON.stringify(cobranca.discount) : null,
    cobranca.fine ? JSON.stringify(cobranca.fine) : null,
    cobranca.interest ? JSON.stringify(cobranca.interest) : null,
    cobranca.split ? JSON.stringify(cobranca.split) : null,
    cobranca.cancellationReason,
    cobranca.postalService,
    cobranca.daysAfterDueDateToRegistrationCancellation,
    cobranca.chargeback ? JSON.stringify(cobranca.chargeback) : null,
    cobranca.refunds ? JSON.stringify(cobranca.refunds) : null,
    cobranca.refundedSplits ? JSON.stringify(cobranca.refundedSplits) : null
  ];
  await databaseService.query(query, values);
}

async function sincronizarCobrancas() {
  let page = 0;
  let total = 0;
  let hasMore = true;

  console.log('Iniciando sincronização de cobranças do Asaas...');

  while (hasMore) {
    const params = {
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE
    };
    try {
      await asaasService.beforeRequest();
      const response = await asaasService.client.get('/payments', { params });
      const cobrancas = response.data.data || [];
      hasMore = response.data.hasMore || false;
      total = response.data.totalCount || 0;

      console.log(`Página ${page + 1} - ${cobrancas.length} cobranças encontradas`);

      for (const cobranca of cobrancas) {
        // Verifica se o cliente existe e não está deletado
        const clienteRes = await databaseService.query('SELECT deletado FROM clientes WHERE id = $1', [cobranca.customer]);
        if (clienteRes.rows.length === 0) {
          console.warn(`⚠️  Cliente ${cobranca.customer} não existe no banco. Ignorando cobrança ${cobranca.id}.`);
          continue;
        }
        if (clienteRes.rows[0].deletado) {
          console.warn(`⚠️  Cliente ${cobranca.customer} está deletado. Ignorando cobrança ${cobranca.id}.`);
          continue;
        }
        await upsertCobranca(cobranca);
        console.log(`  → Cobrança ${cobranca.id} (${cobranca.customer}) sincronizada.`);
      }

      page++;
    } catch (err) {
      console.error('Erro ao sincronizar cobranças:', err.message);
      break;
    }
  }

  console.log('Sincronização de cobranças concluída!');
}

sincronizarCobrancas()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Erro geral:', err);
    process.exit(1);
  });
