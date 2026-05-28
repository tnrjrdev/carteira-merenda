package com.merenda.infrastructure.gateway;

import java.math.BigDecimal;

/**
 * Payload de cobrança via cartão de crédito.
 * `cardToken` e `paymentMethodId` vêm do Mercado Pago Bricks (frontend tokeniza o cartão
 * com a public key e nunca expõe o PAN ao backend).
 */
public record CartaoCobrancaRequest(
        BigDecimal valor,
        String cardToken,
        String paymentMethodId,
        String issuerId,
        String descricao,
        String payerEmail,
        String payerNome,
        String payerCpf,
        Integer parcelas) {}
