# 🚀 Guia de Implementação - Progresso em Tempo Real

## 📡 Nova Rota com Server-Sent Events (SSE)

### **Endpoint:**
```
POST /api/rota/vendas/stream
```

### **O que ela faz:**
Envia atualizações em **tempo real** enquanto processa cada cliente, mostrando:
- ✅ Status de progresso (ex: "Processando cliente 77 de 130")
- ⏳ "Aguardando resposta do Asaas..."
- 📊 Porcentagem de conclusão
- 👤 Dados de cada cliente assim que é processado

---

## 🎯 Eventos SSE Enviados

| Evento | Quando | Dados |
|--------|--------|-------|
| `start` | Ao iniciar | `{ message: "Iniciando..." }` |
| `total` | Após contar clientes | `{ total: 130, message: "Processando 130 clientes..." }` |
| `processing` | Durante processamento | `{ current: 77, total: 130, percentage: 59, message: "Processando cliente 77 de 130...", step: "waiting_asaas" }` |
| `client_processed` | Cliente concluído | `{ current: 77, total: 130, percentage: 59, message: "Cliente processado: João Silva", cliente: {...} }` |
| `client_error` | Erro em um cliente | `{ current: 77, message: "Erro ao processar cliente 77", error: "..." }` |
| `complete` | Tudo concluído | `{ message: "Processamento concluído!", total: 130, vendas: [...] }` |
| `error` | Erro fatal | `{ message: "Erro...", error: "..." }` |

---

## 💻 Implementação no Frontend (React/Next.js)

### **1. Hook customizado para SSE**

```typescript
// hooks/useRotaVendasStream.ts
import { useState, useEffect } from 'react';

interface ProgressData {
  current: number;
  total: number;
  percentage: number;
  message: string;
  step?: 'fetching' | 'waiting_asaas' | 'processing';
}

interface ClienteData {
  parcelamentoId: string;
  clienteId: string;
  nomeCliente: string;
  status: string;
  // ... outros campos
}

export function useRotaVendasStream(rotaId: string) {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [clientes, setClientes] = useState<ClienteData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);

  const startStream = async () => {
    setIsLoading(true);
    setError(null);
    setClientes([]);
    setProgress(null);
    setIsComplete(false);

    try {
      // Faz POST para iniciar o stream
      const response = await fetch('https://agroserver-it9g.onrender.com/api/rota/vendas/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rota_id: rotaId })
      });

      if (!response.ok) {
        throw new Error('Erro ao conectar com o servidor');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('Stream não disponível');
      }

      // Lê o stream
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          setIsLoading(false);
          break;
        }

        // Decodifica os dados
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('event:')) {
            const eventType = line.replace('event:', '').trim();
            continue;
          }

          if (line.startsWith('data:')) {
            const data = JSON.parse(line.replace('data:', '').trim());

            // Processa cada tipo de evento
            if (line.includes('"event":"start"') || data.message?.includes('Iniciando')) {
              setProgress({ current: 0, total: 0, percentage: 0, message: data.message });
            }
            else if (line.includes('"event":"total"')) {
              setProgress({ current: 0, total: data.total, percentage: 0, message: data.message });
            }
            else if (line.includes('"event":"processing"')) {
              setProgress({
                current: data.current,
                total: data.total,
                percentage: data.percentage,
                message: data.message,
                step: data.step
              });
            }
            else if (line.includes('"event":"client_processed"')) {
              setProgress({
                current: data.current,
                total: data.total,
                percentage: data.percentage,
                message: data.message
              });
              // Adiciona o cliente à lista
              setClientes(prev => [...prev, data.cliente]);
            }
            else if (line.includes('"event":"client_error"')) {
              console.error('Erro ao processar cliente:', data);
            }
            else if (line.includes('"event":"complete"')) {
              setIsComplete(true);
              setIsLoading(false);
              // Garante que todos os clientes estão na lista
              if (data.vendas) {
                setClientes(data.vendas);
              }
            }
            else if (line.includes('"event":"error"')) {
              setError(data.message);
              setIsLoading(false);
            }
          }
        }
      }

    } catch (err) {
      console.error('Erro no stream:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      setIsLoading(false);
    }
  };

  return {
    startStream,
    isLoading,
    progress,
    clientes,
    error,
    isComplete
  };
}
```

---

### **2. Componente de UI**

```typescript
// components/RotaDetalhesComProgresso.tsx
'use client';

import { useRotaVendasStream } from '@/hooks/useRotaVendasStream';
import { useEffect } from 'react';

export default function RotaDetalhesComProgresso({ rotaId }: { rotaId: string }) {
  const { startStream, isLoading, progress, clientes, error, isComplete } = useRotaVendasStream(rotaId);

  // Inicia automaticamente ao montar
  useEffect(() => {
    startStream();
  }, [rotaId]);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Detalhes da Rota</h1>

      {/* Barra de Progresso */}
      {isLoading && progress && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-700">
              {progress.message}
            </span>
            <span className="text-sm font-bold text-blue-700">
              {progress.percentage}%
            </span>
          </div>
          
          {/* Barra de progresso visual */}
          <div className="w-full bg-blue-200 rounded-full h-2.5">
            <div 
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
          
          {progress.total > 0 && (
            <p className="text-xs text-blue-600 mt-2">
              {progress.current} de {progress.total} clientes processados
            </p>
          )}

          {/* Indicador de status específico */}
          {progress.step === 'waiting_asaas' && (
            <div className="mt-3 flex items-center text-amber-600">
              <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span className="text-sm">⏳ Aguardando resposta do Asaas...</span>
            </div>
          )}
        </div>
      )}

      {/* Mensagem de conclusão */}
      {isComplete && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-700 font-medium">
            ✅ Processamento concluído! {clientes.length} clientes carregados.
          </p>
        </div>
      )}

      {/* Erro */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700">❌ {error}</p>
        </div>
      )}

      {/* Lista de Clientes (renderiza conforme vão chegando) */}
      <div className="space-y-4">
        {clientes.map((cliente, index) => (
          <div 
            key={cliente.parcelamentoId} 
            className="p-4 border rounded-lg animate-fadeIn"
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold text-lg">{cliente.nomeCliente}</h3>
                <span className={`inline-block mt-1 px-3 py-1 rounded-full text-sm ${
                  cliente.status === 'Pago' ? 'bg-green-100 text-green-700' :
                  cliente.status === 'Inadimplente' ? 'bg-red-100 text-red-700' :
                  'bg-yellow-100 text-yellow-700'
                }`}>
                  {cliente.status}
                </span>
              </div>
              
              <div className="text-right text-sm text-gray-500">
                Cliente {index + 1}
              </div>
            </div>

            {/* Informações das parcelas */}
            <div className="mt-3 grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Vencidas</p>
                <p className="font-semibold text-red-600">
                  {cliente.parcelasVencidas.quantidade} - R$ {cliente.parcelasVencidas.valor.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Pagas</p>
                <p className="font-semibold text-green-600">
                  {cliente.parcelasPagas.quantidade} - R$ {cliente.parcelasPagas.valor.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-gray-600">A Vencer</p>
                <p className="font-semibold text-blue-600">
                  {cliente.parcelasAVencer.quantidade} - R$ {cliente.parcelasAVencer.valor.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Loading spinner inicial */}
      {isLoading && clientes.length === 0 && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      )}
    </div>
  );
}
```

---

### **3. CSS para animação (opcional)**

```css
/* globals.css */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fadeIn {
  animation: fadeIn 0.3s ease-in;
}
```

---

## 🎯 Benefícios desta Abordagem

✅ **Feedback em tempo real** - Usuário vê progresso enquanto processa  
✅ **Não trava a tela** - Clientes aparecem conforme são processados  
✅ **Mensagens claras** - "Aguardando Asaas", "Processando cliente X de Y"  
✅ **Porcentagem visual** - Barra de progresso mostra % concluído  
✅ **Experiência melhor** - Muito melhor que loading infinito  
✅ **Detecção de erros** - Mostra quando um cliente falha sem travar tudo  

---

## 📝 Resumo para o Frontend

### **Passos simples:**

1. **Copie o hook** `useRotaVendasStream.ts`
2. **Use no seu componente:**
   ```typescript
   const { startStream, progress, clientes } = useRotaVendasStream(rotaId);
   ```
3. **Renderize:**
   - Barra de progresso com `progress.percentage`
   - Mensagem com `progress.message`
   - Lista de clientes com `clientes` (vai crescendo em tempo real!)

### **URL da nova rota:**
```
POST https://agroserver-it9g.onrender.com/api/rota/vendas/stream
Body: { "rota_id": "seu-uuid-aqui" }
```

---

## 🔄 Comparação das Rotas

| Rota | Tipo | Quando usar |
|------|------|-------------|
| `/api/rota/vendas` | JSON normal | Quando não precisa de progresso |
| `/api/rota/vendas/stream` | Server-Sent Events | Quando quer mostrar progresso em tempo real |

---

## 🎬 Exemplo de Mensagens Durante o Processamento

```
🔵 Iniciando processamento...
🔵 Processando 130 clientes...
🔵 Processando cliente 1 de 130...
⏳ Aguardando resposta do Asaas...
✅ Cliente processado: João Silva (1/130)
🔵 Processando cliente 2 de 130...
⏳ Aguardando resposta do Asaas...
✅ Cliente processado: Maria Santos (2/130)
...
🔵 Processando cliente 130 de 130...
✅ Cliente processado: Pedro Costa (130/130)
✅ Processamento concluído! 130 clientes carregados.
```

---

**Agora você tem progresso em tempo real! 🚀**
