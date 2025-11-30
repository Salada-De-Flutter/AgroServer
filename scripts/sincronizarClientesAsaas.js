require('dotenv').config();
const asaasService = require('../src/services/asaasService');
const databaseService = require('../src/services/databaseService');

const PAGE_SIZE = 50; // Tamanho do lote (padrão Asaas)
const DELAY_MS = 1200; // Delay entre páginas (1.2s)

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function upsertCliente(cliente) {
  // Adapta os campos para pt-br
  const query = `
    INSERT INTO clientes (
      id, data_criacao, nome, email, telefone, celular, endereco, numero_endereco, complemento, bairro, cidade_id, cidade_nome, estado, pais, cep, cpf_cnpj, tipo_pessoa, deletado, emails_adicionais, referencia_externa, notificacao_desativada, observacoes, estrangeiro, criado_em, atualizado_em
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, NOW(), NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      data_criacao = EXCLUDED.data_criacao,
      nome = EXCLUDED.nome,
      email = EXCLUDED.email,
      telefone = EXCLUDED.telefone,
      celular = EXCLUDED.celular,
      endereco = EXCLUDED.endereco,
      numero_endereco = EXCLUDED.numero_endereco,
      complemento = EXCLUDED.complemento,
      bairro = EXCLUDED.bairro,
      cidade_id = EXCLUDED.cidade_id,
      cidade_nome = EXCLUDED.cidade_nome,
      estado = EXCLUDED.estado,
      pais = EXCLUDED.pais,
      cep = EXCLUDED.cep,
      cpf_cnpj = EXCLUDED.cpf_cnpj,
      tipo_pessoa = EXCLUDED.tipo_pessoa,
      deletado = EXCLUDED.deletado,
      emails_adicionais = EXCLUDED.emails_adicionais,
      referencia_externa = EXCLUDED.referencia_externa,
      notificacao_desativada = EXCLUDED.notificacao_desativada,
      observacoes = EXCLUDED.observacoes,
      estrangeiro = EXCLUDED.estrangeiro,
      atualizado_em = NOW();
  `;
  const values = [
    cliente.id,
    cliente.dateCreated,
    cliente.name,
    cliente.email,
    cliente.phone,
    cliente.mobilePhone,
    cliente.address,
    cliente.addressNumber,
    cliente.complement,
    cliente.province,
    cliente.city,
    cliente.cityName,
    cliente.state,
    cliente.country,
    cliente.postalCode,
    cliente.cpfCnpj,
    cliente.personType,
    cliente.deleted,
    cliente.additionalEmails,
    cliente.externalReference,
    cliente.notificationDisabled,
    cliente.observations,
    cliente.foreignCustomer
  ];
  await databaseService.query(query, values);
}

async function sincronizarClientes() {
  let page = 0;
  let total = 0;
  let hasMore = true;
  let erros = [];
  let sincronizados = 0;
  let tentativas = 0;
  const clientesComErro = [];

  console.log('Iniciando sincronização de clientes do Asaas...');

  while (hasMore) {
    const params = {
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE
    };
    try {
      await asaasService.beforeRequest();
      const response = await asaasService.listCustomers(params);
      const clientes = response.data || [];
      hasMore = response.hasMore || false;
      if (page === 0 || (response.totalCount && response.totalCount > total)) {
        total = response.totalCount || total;
      }

      console.log(`Página ${page + 1} - ${clientes.length} clientes encontrados`);

      for (const cliente of clientes) {
        try {
          await upsertCliente(cliente);
          sincronizados++;
          console.log(`  → Cliente ${cliente.id} (${cliente.name}) sincronizado.`);
        } catch (err) {
          erros.push({ id: cliente.id, nome: cliente.name, erro: err.message, stack: err.stack });
          clientesComErro.push(cliente);
          console.error(`❌ Erro ao sincronizar cliente ${cliente.id} (${cliente.name}):`, err.message);
        }
      }

      page++;
    } catch (err) {
      console.error('Erro ao sincronizar clientes:', err.message);
      break;
    }
  }

  // Segunda tentativa para clientes que falharam
  if (clientesComErro.length > 0) {
    console.log(`\nTentando novamente sincronizar ${clientesComErro.length} cliente(s) que falharam na primeira tentativa...`);
    for (const cliente of clientesComErro) {
      try {
        await upsertCliente(cliente);
        sincronizados++;
        console.log(`  → [2ª tentativa] Cliente ${cliente.id} (${cliente.name}) sincronizado.`);
        // Remove do array de erros se sincronizar com sucesso
        erros = erros.filter(e => e.id !== cliente.id);
      } catch (err) {
        console.error(`❌ [2ª tentativa] Erro ao sincronizar cliente ${cliente.id} (${cliente.name}):`, err.message);
        // Mantém no array de erros
      }
    }
  }

  console.log('\nSincronização concluída!');
  console.log(`Total de clientes no Asaas: ${total}`);
  console.log(`Total sincronizados com sucesso: ${sincronizados}`);
  if (erros.length > 0) {
    console.log(`❌ Total de clientes com erro: ${erros.length}`);
    erros.forEach(e => {
      console.log(`  - ${e.id} (${e.nome}): ${e.erro}`);
    });
  } else {
    console.log('✅ Todos os clientes sincronizados com sucesso!');
  }
}

sincronizarClientes()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Erro geral:', err);
    process.exit(1);
  });
