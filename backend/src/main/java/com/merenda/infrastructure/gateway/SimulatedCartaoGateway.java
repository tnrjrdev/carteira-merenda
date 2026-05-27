package com.merenda.infrastructure.gateway;


import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.UUID;

/**
 * Mock de gateway de cartão. Em produção:
 *  - Use Mercado Pago Bricks/Checkout API, Stripe Elements ou Pagar.me Checkout
 *    para tokenizar o cartão no FRONTEND (PCI-compliant).
 *  - O backend nunca vê o PAN — apenas o cardToken descartável.
 *  - O `valorLiquidoCreditado` aqui é calculado como `valorBruto - taxa`. Em produção
 *    o gateway debita a taxa do split — o saldo creditado ao aluno deve refletir essa
 *    diferença.
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
    public CobrancaCartao cobrar(BigDecimal valor, String cardToken, String descricao,
                                 String payerEmail, String payerNome, Integer parcelas) {
        String externalId = "crd-" + UUID.randomUUID();

        if (cardToken == null || cardToken.isBlank()) {
            return new CobrancaCartao(externalId, valor, BigDecimal.ZERO, BigDecimal.ZERO,
                    null, null, StatusPagamento.RECUSADO, "Token do cartão ausente");
        }
        // Convenção de teste: tokens começados com "REC_" recusam, "ERR_" erram.
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
                externalId,
                valor,
                taxa,
                liquido,
                "VISA",
                "1234",
                StatusPagamento.APROVADO,
                "Aprovado");
    }
}
