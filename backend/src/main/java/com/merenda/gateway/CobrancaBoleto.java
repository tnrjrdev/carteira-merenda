package com.merenda.gateway;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record CobrancaBoleto(
        String externalId,
        BigDecimal valor,
        String linhaDigitavel,
        String urlBoleto,
        LocalDateTime expiraEm,
        StatusPagamento status) {}
