package com.merenda.gateway;

import java.math.BigDecimal;

public record CobrancaCartao(
        String externalId,
        BigDecimal valorBruto,
        BigDecimal taxaConveniencia,
        BigDecimal valorLiquidoCreditado,
        String bandeira,
        String ultimosDigitos,
        StatusPagamento status,
        String mensagem) {}
