package com.merenda.infrastructure.gateway;


import java.math.BigDecimal;

public interface BoletoGateway {

    String nome();

    CobrancaBoleto criarBoleto(BigDecimal valor, String descricao, String payerEmail,
                               String payerNome, String payerCpf);

    StatusPagamento consultarStatus(String externalId);
}
