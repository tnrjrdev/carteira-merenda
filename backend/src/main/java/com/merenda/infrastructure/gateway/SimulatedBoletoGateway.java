package com.merenda.infrastructure.gateway;


import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Gateway mock de boleto — gera linha digitável fake e mantém status em memória.
 * Para integração real, plugar Iugu, Asaas ou Mercado Pago Boletos.
 */
public class SimulatedBoletoGateway implements BoletoGateway {

    private static final Logger log = LoggerFactory.getLogger(SimulatedBoletoGateway.class);

    private final Map<String, StatusPagamento> estado = new ConcurrentHashMap<>();

    @Override
    public String nome() { return "boleto-simulated"; }

    @Override
    public CobrancaBoleto criarBoleto(BigDecimal valor, String descricao, String payerEmail,
                                      String payerNome, String payerCpf) {
        String externalId = "bol-" + UUID.randomUUID();
        estado.put(externalId, StatusPagamento.PENDENTE);

        long centavos = valor.movePointRight(2).longValueExact();
        String linha = String.format(
                "23793.38128 60082.123456 78901.234567 8 %010d",
                Math.max(centavos, 100));

        log.info("[boleto-simulated] criado externalId={} valor={}", externalId, valor);
        return new CobrancaBoleto(
                externalId,
                valor,
                linha,
                "https://example.invalid/boleto/" + externalId,
                LocalDateTime.now().plusDays(3),
                StatusPagamento.PENDENTE);
    }

    @Override
    public StatusPagamento consultarStatus(String externalId) {
        return estado.getOrDefault(externalId, StatusPagamento.PENDENTE);
    }

    public void aprovarManualmente(String externalId) {
        estado.put(externalId, StatusPagamento.APROVADO);
        log.info("[boleto-simulated] {} aprovado manualmente", externalId);
    }
}
