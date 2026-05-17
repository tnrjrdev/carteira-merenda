package com.merenda.service.gateway;

import java.math.BigDecimal;

public interface PagamentoGateway {

    String nome();

    /** Cria uma cobrança Pix dinâmica. */
    CobrancaPix criarCobrancaPix(BigDecimal valor, String descricao, String payerEmail, String payerNome);

    /** Consulta o status atualizado de uma cobrança pelo ID externo. */
    StatusPagamento consultarStatus(String externalId);
}
