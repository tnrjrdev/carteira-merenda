package com.merenda.infrastructure.gateway;


import java.math.BigDecimal;
import java.time.LocalDateTime;

public record CobrancaPix(
        String externalId,
        BigDecimal valor,
        String qrCodeBase64,
        String qrCodeCopiaCola,
        String urlTicket,
        LocalDateTime expiraEm,
        StatusPagamento status) {}
