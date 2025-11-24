
# 📋 Cadastro Rápido de Clientes por CPF

Módulo para cadastrar múltiplos clientes em uma rota de forma rápida usando apenas os CPFs.

## 🎯 Funcionalidade

- ✅ Busca clientes no Asaas por CPF
- ✅ Verifica se o cliente tem **EXATAMENTE 1 parcelamento**
- ✅ Cadastra automaticamente na rota escolhida
- ⚠️ **Ignora** clientes com 0 ou 2+ parcelamentos
- ⚠️ **Ignora** clientes não encontrados
- ⚠️ **Ignora** clientes já cadastrados na rota

---

## 🚀 Como Usar

### Opção 1: Arquivo HTTP (Recomendado)

1. Abra o arquivo `cadastroRapido.http`
2. Substitua `"COLOQUE_O_ID_DA_ROTA_AQUI"` pelo ID real da sua rota
3. Clique em **"Send Request"** (se usar REST Client extension do VS Code)
   
   **OU** copie e cole no Postman/Insomnia

### Opção 2: cURL (Terminal)

```bash
curl -X POST http://localhost:3000/api/cadastro-rapido/clientes-por-cpf \
  -H "Content-Type: application/json" \
  -d '{
    "rota_id": "123",
    "cpfs": ["931.830.541-91", "883.304.353-34", ...]
  }'
```

### Opção 3: Script Node.js

```bash
# Edite o arquivo scripts/cadastroRapidoPorCPF.js
# Cole seus CPFs e execute:
node scripts/cadastroRapidoPorCPF.js <rota_id>
```

---

## 📊 Exemplo de Resposta

```json
{
  "success": true,
  "rota": {
    "id": "123",
    "nome": "Rota Norte"
  },
  "processamento": {
    "total": 82,
    "cadastrados": 45,
    "ignorados": 35,
    "erros": 2,
    "tempoTotal": "25.34s"
  },
  "detalhes": {
    "sucesso": [
      {
        "cpf": "931.830.541-91",
        "clienteId": "cus_xxx",
        "clienteNome": "João Silva",
        "parcelamentoId": "ins_yyy",
        "valor": 1500.00,
        "parcelas": 10,
        "status": "sucesso"
      }
    ],
    "ignorados": [
      {
        "cpf": "883.304.353-34",
        "clienteNome": "Maria Santos",
        "status": "ignorado",
        "motivo": "Cliente possui 3 parcelamentos (esperado: 1)"
      }
    ],
    "erros": []
  }
}
```

---

## ⚙️ Regras de Negócio

### ✅ Cliente É Cadastrado Quando:
1. Existe no Asaas
2. Tem **exatamente 1 parcelamento**
3. Não está cadastrado na rota ainda

### ⚠️ Cliente É Ignorado Quando:
- Não encontrado no Asaas
- Possui **0 parcelamentos**
- Possui **2 ou mais parcelamentos**
- Já está cadastrado na rota

### ❌ Erro Acontece Quando:
- API do Asaas retorna erro
- Problema de conexão
- Dados inválidos

---

## 🎨 Output no Console (Servidor)

```
========================================
🚀 CADASTRO RÁPIDO DE CLIENTES POR CPF
========================================
Rota ID: 123
Total de CPFs: 82
========================================

✅ Rota encontrada: Rota Norte

📋 Processando CPF: 931.830.541-91
  🔍 Buscando cliente no Asaas...
  ✅ Cliente encontrado: João Silva
  🔍 Buscando parcelamentos...
  📊 Parcelamentos encontrados: 1
  ✅ 1 parcelamento encontrado: ins_xxx
     Valor: R$ 1500
     Parcelas: 10x
  ✅ CADASTRADO COM SUCESSO!

📋 Processando CPF: 883.304.353-34
  🔍 Buscando cliente no Asaas...
  ✅ Cliente encontrado: Maria Santos
  🔍 Buscando parcelamentos...
  📊 Parcelamentos encontrados: 3
  ⚠️  Cliente com 3 parcelamentos - IGNORADO

  ⏳ Aguardando 300ms antes do próximo lote...

========================================
📊 RESUMO DO PROCESSAMENTO
========================================
✅ Cadastrados: 45
⚠️  Ignorados: 35
❌ Erros: 2
⏱️  Tempo total: 25.34s
========================================
```

---

## 🔧 Configuração

### Ajustar Velocidade de Processamento

Edite o arquivo `src/routes/cadastroRapidoRoutes.js`:

```javascript
// Linha ~141
const BATCH_SIZE = 5; // Processar 5 CPFs por vez

// Se der erro 403/429, diminua para 3
// Se quiser mais rápido, aumente para 7-10
```

### Ajustar Delay Entre Lotes

```javascript
// Linha ~225
await new Promise(resolve => setTimeout(resolve, 300)); // 300ms

// Se der erro, aumente para 500ms
// Se estiver estável, pode diminuir para 200ms
```

---

## 📝 Formato dos CPFs

Aceita CPFs com ou sem formatação:

```json
"cpfs": [
  "931.830.541-91",  // ✅ Com pontos e traço
  "93183054191",     // ✅ Apenas números
  "931-830-541-91",  // ✅ Outra formatação
  "931 830 541 91"   // ✅ Com espaços
]
```

O sistema remove automaticamente qualquer formatação.

---

## ⚠️ Limitações

- **Máximo recomendado**: 100 CPFs por requisição
- **Tempo estimado**: ~0.3s por CPF (com cache e otimizações)
- **Rate limit**: Respeita limites da API Asaas (50 req concorrentes)

Se precisar cadastrar mais de 100 CPFs, divida em múltiplas requisições.

---

## 🐛 Troubleshooting

### Problema: Erro 403/429
**Solução**: Diminua o `BATCH_SIZE` para 3 e aumente delay para 400ms

### Problema: Muitos ignorados
**Motivos comuns**:
- Clientes com múltiplos parcelamentos
- Clientes sem parcelamento
- CPFs não encontrados no Asaas

**Solução**: Verifique manualmente no Asaas

### Problema: Servidor lento/trava
**Solução**: Use paginação - máximo 50 CPFs por vez

---

## 📞 Endpoint da API

```
POST /api/cadastro-rapido/clientes-por-cpf
```

**Body:**
```json
{
  "rota_id": "string (obrigatório)",
  "cpfs": ["array de strings (obrigatório)"]
}
```

**Response:**
```json
{
  "success": boolean,
  "rota": { "id": string, "nome": string },
  "processamento": { ... },
  "detalhes": { "sucesso": [], "ignorados": [], "erros": [] }
}
```

---

## ✅ Checklist de Uso

- [ ] Servidor está rodando (`npm start`)
- [ ] Você tem o ID da rota onde quer cadastrar
- [ ] Lista de CPFs está pronta
- [ ] CPFs estão no Asaas
- [ ] Clientes têm parcelamentos criados
- [ ] Testou com 2-3 CPFs primeiro
- [ ] Verificou os logs no console do servidor

---

**Pronto para usar! 🚀**

*Última atualização: 23/11/2025*
