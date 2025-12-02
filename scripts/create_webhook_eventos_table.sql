-- ============================================
-- TABELA: webhook_eventos
-- Descrição: Armazena todos os eventos recebidos do Asaas via webhook
-- ============================================

CREATE TABLE IF NOT EXISTS webhook_eventos (
  id SERIAL PRIMARY KEY,
  evento VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  recebido_em TIMESTAMP DEFAULT NOW()
);

-- Índices para melhorar performance de consultas
CREATE INDEX IF NOT EXISTS idx_webhook_eventos_evento ON webhook_eventos(evento);
CREATE INDEX IF NOT EXISTS idx_webhook_eventos_recebido_em ON webhook_eventos(recebido_em DESC);

-- Índice para consultas por payment ID no payload
CREATE INDEX IF NOT EXISTS idx_webhook_eventos_payment_id ON webhook_eventos((payload->'payment'->>'id'));

-- Comentários
COMMENT ON TABLE webhook_eventos IS 'Armazena todos os eventos de webhook recebidos do Asaas';
COMMENT ON COLUMN webhook_eventos.id IS 'ID único do evento registrado';
COMMENT ON COLUMN webhook_eventos.evento IS 'Tipo do evento (ex: PAYMENT_RECEIVED, PAYMENT_CONFIRMED)';
COMMENT ON COLUMN webhook_eventos.payload IS 'Dados completos do evento em formato JSON';
COMMENT ON COLUMN webhook_eventos.recebido_em IS 'Timestamp de quando o evento foi recebido';

-- ============================================
-- CONSULTAS ÚTEIS
-- ============================================

-- Ver últimos 10 eventos recebidos
-- SELECT id, evento, recebido_em FROM webhook_eventos ORDER BY recebido_em DESC LIMIT 10;

-- Ver eventos de um pagamento específico
-- SELECT * FROM webhook_eventos WHERE payload->'payment'->>'id' = 'pay_123456';

-- Contar eventos por tipo
-- SELECT evento, COUNT(*) as total FROM webhook_eventos GROUP BY evento ORDER BY total DESC;

-- Ver eventos recebidos nas últimas 24 horas
-- SELECT * FROM webhook_eventos WHERE recebido_em >= NOW() - INTERVAL '24 hours';

-- Ver payload completo de um evento
-- SELECT payload FROM webhook_eventos WHERE id = 1;
