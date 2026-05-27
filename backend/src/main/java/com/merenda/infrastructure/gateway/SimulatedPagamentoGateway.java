package com.merenda.infrastructure.gateway;


import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Gateway de testes — gera QR Code fake e mantém status em memória.
 * Para confirmar manualmente o pagamento em dev, exponha endpoint que chame
 * {@link #aprovarManualmente(String)} (não fazemos automaticamente para preservar
 * o ciclo real PENDENTE → APROVADO).
 */
public class SimulatedPagamentoGateway implements PagamentoGateway {

    private static final Logger log = LoggerFactory.getLogger(SimulatedPagamentoGateway.class);

    // 1x1 PNG transparente em base64 — apenas para o frontend renderizar algo enquanto a UI
    // pinta o copia-cola via biblioteca local. Em produção, o MP devolve o PNG real.
    private static final String QR_PLACEHOLDER_BASE64 =
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

    private final Map<String, StatusPagamento> estado = new ConcurrentHashMap<>();

    @Override
    public String nome() { return "simulated"; }

    @Override
    public CobrancaPix criarCobrancaPix(BigDecimal valor, String descricao, String payerEmail, String payerNome) {
        String externalId = "sim-" + UUID.randomUUID();
        estado.put(externalId, StatusPagamento.PENDENTE);
        // copia-cola estilo BR Code (não é um Pix real, só serve para parecer um payload)
        String copiaCola = "00020126" + externalId.length() + externalId + "5204000053039865802BR5913MERENDA SIMUL6009SAO PAULO"
                + "62" + String.format("%02d", externalId.length() + 4) + "05" + externalId + "6304ABCD";
        log.info("[simulated] cobrança criada externalId={} valor={}", externalId, valor);
        return new CobrancaPix(
                externalId, valor, QR_PLACEHOLDER_BASE64, copiaCola, null,
                LocalDateTime.now().plusMinutes(30),
                StatusPagamento.PENDENTE);
    }

    @Override
    public StatusPagamento consultarStatus(String externalId) {
        return estado.getOrDefault(externalId, StatusPagamento.PENDENTE);
    }

    /** Marca uma cobrança simulada como APROVADA (endpoint dev). */
    public void aprovarManualmente(String externalId) {
        estado.put(externalId, StatusPagamento.APROVADO);
        log.info("[simulated] cobrança {} aprovada manualmente", externalId);
    }
}
