require('dotenv').config();
const asaasService = require('../src/services/asaasService');
const databaseService = require('../src/services/databaseService');

const CLIENTE_ID = 'cus_000123336813';

async function upsertCliente(cliente) {
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

async function main() {
  try {
    console.log(`Buscando cliente ${CLIENTE_ID} no Asaas...`);
    const cliente = await asaasService.getCustomer(CLIENTE_ID);
    console.log('Dados do cliente:', cliente);
    console.log('Tentando inserir/atualizar no banco...');
    await upsertCliente(cliente);
    console.log('✅ Cliente inserido/atualizado com sucesso!');
  } catch (err) {
    console.error('❌ Erro ao inserir/atualizar cliente:', err);
  }
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Erro geral:', err);
    process.exit(1);
  });
