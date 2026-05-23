package com.merenda.service.gateway;

import java.math.BigDecimal;

public interface CartaoGateway {

    String nome();

    /**
     * Em produção, o frontend usa o SDK do gateway (ex: Mercado Pago Bricks)
     * para gerar um cardToken seguro (PCI-compliant). O backend recebe SÓ o token.
     * Aqui (mock) aceitamos o token literal — NÃO USE EM PRODUÇÃO sem SDK.
     */
    CobrancaCartao cobrar(BigDecimal valor, String cardToken, String descricao,
                          String payerEmail, String payerNome, Integer parcelas);
}
