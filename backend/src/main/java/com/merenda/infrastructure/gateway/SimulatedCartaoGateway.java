package com.merenda.infrastructure.gateway;


import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.UUID;

/**
 * Mock de gateway de cartão para dev. Tokens de teste:
 *   - prefixo "REC_" → RECUSADO
 *   - prefixo "ERR_" → CANCELADO (erro temporário)
 *   - qualquer outro → APROVADO
 */
public class SimulatedCartaoGateway implements CartaoGateway {

    private static final Logger log = LoggerFactory.getLogger(SimulatedCartaoGateway.class);

    private final BigDecimal taxaPercentual;

    public SimulatedCartaoGateway(BigDecimal taxaPercentual) {
        this.taxaPercentual = taxaPercentual == null ? new BigDecimal("0.0499") : taxaPercentual;
    }

    @Override
    public String nome() { return "cartao-simulated"; }

    @Override
    public CobrancaCartao cobrar(CartaoCobrancaRequest req) {
        String externalId = "crd-" + UUID.randomUUID();
        String cardToken = req.cardToken();
        BigDecimal valor = req.valor();

        if (cardToken == null || cardToken.isBlank()) {
            return new CobrancaCartao(externalId, valor, BigDecimal.ZERO, BigDecimal.ZERO,
                    null, null, StatusPagamento.RECUSADO, "Token do cartão ausente");
        }
        if (cardToken.startsWith("REC_")) {
            return new CobrancaCartao(externalId, valor, BigDecimal.ZERO, BigDecimal.ZERO,
                    "VISA", "0002", StatusPagamento.RECUSADO, "Cartão recusado pela operadora");
        }
        if (cardToken.startsWith("ERR_")) {
            return new CobrancaCartao(externalId, valor, BigDecimal.ZERO, BigDecimal.ZERO,
                    "VISA", "0127", StatusPagamento.CANCELADO, "Erro temporário na operadora");
        }

        BigDecimal taxa = valor.multiply(taxaPercentual).setScale(2, RoundingMode.HALF_UP);
        BigDecimal liquido = valor.subtract(taxa).setScale(2, RoundingMode.HALF_UP);

        log.info("[cartao-simulated] aprovado externalId={} bruto={} taxa={} liquido={}",
                externalId, valor, taxa, liquido);
        return new CobrancaCartao(
                externalId, valor, taxa, liquido,
                req.paymentMethodId() != null ? req.paymentMethodId().toUpperCase() : "VISA",
                "1234",
                StatusPagamento.APROVADO,
                "Aprovado");
    }
}
