Teste de deploy part 2

# AgroServer API

API base em Node.js com Express para o projeto AgroServer.

## 📋 Estrutura do Projeto

```
AgroServer/
├── src/
│   ├── controllers/     # Controladores da aplicação
│   ├── middlewares/     # Middlewares customizados
│   │   └── errorHandler.js
│   ├── models/          # Modelos de dados
│   ├── routes/          # Definição de rotas
│   │   └── index.js
│   ├── services/        # Lógica de negócio
│   ├── app.js           # Configuração do Express
│   └── server.js        # Inicialização do servidor
├── .env                 # Variáveis de ambiente (não versionado)
├── .env.example         # Exemplo de variáveis de ambiente
├── .gitignore          # Arquivos ignorados pelo Git
├── package.json        # Dependências do projeto
└── README.md          # Este arquivo
```


## 🚀 Começando

### Pré-requisitos

- Node.js (versão 14 ou superior)
- npm ou yarn

### Instalação

1. Clone o repositório (se aplicável)
```bash
git clone <url-do-repositorio>
cd AgroServer
```

2. Instale as dependências
```bash
npm install
```

3. Configure as variáveis de ambiente
```bash
# Copie o arquivo de exemplo
cp .env.example .env

# Edite o arquivo .env com suas configurações:
# - DATABASE_URL: Substitua [YOUR_PASSWORD] pela senha do PostgreSQL
# - ASAAS_API_KEY: Sua chave de API do Asaas (se necessário)
```

### Executando o Projeto

#### Modo Desenvolvimento
```bash
npm run dev
```

#### Modo Produção
```bash
npm start
```

O servidor iniciará na porta definida no arquivo `.env` (padrão: 3000).

## 📍 Endpoints Disponíveis

### Health Check
```
GET /health
```
Verifica se a API está funcionando.

### API Base
```
GET /api/
```
Retorna informações sobre a API e endpoints disponíveis.

### Asaas - Teste de Conexão
```
GET /api/asaas/test
```
Testa a conexão com a API do Asaas.

### Asaas - Informações da Conta
```
GET /api/asaas/account
```
Retorna informações da conta Asaas.

### Asaas - Clientes
```
GET /api/asaas/customers
POST /api/asaas/customers
```
Lista ou cria clientes.

### Asaas - Cobranças
```
GET /api/asaas/payments
POST /api/asaas/payments
GET /api/asaas/payments/:id
```
Gerencia cobranças (listar, criar, obter detalhes).

### Database - Teste de Conexão
```
GET /api/database/test
```
Testa a conexão com o banco de dados PostgreSQL.

### Database - Pool Info
```
GET /api/database/pool-info
```
Retorna informações sobre o pool de conexões.

### Database - Listar Tabelas
```
GET /api/database/tables
```
Lista todas as tabelas do schema público.

## 🛠️ Tecnologias Utilizadas

- **Express** - Framework web
- **PostgreSQL (pg)** - Cliente PostgreSQL para Node.js
- **Supabase** - Database PostgreSQL hospedado
- **Axios** - Cliente HTTP para API do Asaas
- **dotenv** - Gerenciamento de variáveis de ambiente
- **cors** - Habilitação de CORS
- **nodemon** - Hot reload em desenvolvimento

## 📝 Próximos Passos

- [ ] Adicionar autenticação
- [ ] Implementar banco de dados
- [ ] Criar testes unitários
- [ ] Adicionar validação de dados
- [ ] Implementar logging
- [ ] Documentação com Swagger

## 🤝 Contribuindo

1. Crie uma branch para sua feature (`git checkout -b feature/MinhaFeature`)
2. Commit suas mudanças (`git commit -m 'Adiciona MinhaFeature'`)
3. Push para a branch (`git push origin feature/MinhaFeature`)
4. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença ISC.
