package com.merenda.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.merenda.service.gateway.MercadoPagoPixGateway;
import com.merenda.service.gateway.PagamentoGateway;
import com.merenda.service.gateway.SimulatedPagamentoGateway;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class PagamentoConfig {

    private static final Logger log = LoggerFactory.getLogger(PagamentoConfig.class);

    @Bean
    public PagamentoGateway pagamentoGateway(
            @Value("${merenda.pagamento.gateway:simulated}") String gatewayNome,
            @Value("${merenda.pagamento.mercadopago.access-token:}") String mpToken,
            ObjectMapper objectMapper) {

        if ("mercadopago".equalsIgnoreCase(gatewayNome)) {
            if (mpToken == null || mpToken.isBlank()) {
                log.warn("Gateway mercadopago selecionado, mas MERCADOPAGO_ACCESS_TOKEN não está configurado. Caindo para simulated.");
                return new SimulatedPagamentoGateway();
            }
            log.info("PagamentoGateway: Mercado Pago (Pix real)");
            return new MercadoPagoPixGateway(mpToken, objectMapper);
        }

        log.info("PagamentoGateway: Simulated (sem cobrança real)");
        return new SimulatedPagamentoGateway();
    }
}
