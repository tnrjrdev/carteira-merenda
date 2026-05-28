package com.merenda.infrastructure.gateway;


public interface CartaoGateway {

    String nome();

    /**
     * Cobra um cartão de crédito.
     * Em produção, o frontend usa o SDK do gateway (ex: Mercado Pago Bricks)
     * para gerar o cardToken seguro (PCI-compliant). O backend recebe SÓ o token
     * e o paymentMethodId (visa, master, etc).
     */
    CobrancaCartao cobrar(CartaoCobrancaRequest req);
}
