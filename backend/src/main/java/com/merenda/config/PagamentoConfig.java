package com.merenda.config;

import com.merenda.infrastructure.gateway.BoletoGateway;
import com.merenda.infrastructure.gateway.CartaoGateway;
import com.merenda.infrastructure.gateway.MercadoPagoPixGateway;
import com.merenda.infrastructure.gateway.PagamentoGateway;
import com.merenda.infrastructure.gateway.SimulatedBoletoGateway;
import com.merenda.infrastructure.gateway.SimulatedCartaoGateway;
import com.merenda.infrastructure.gateway.SimulatedPagamentoGateway;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.merenda.infrastructure.gateway.BoletoGateway;
import com.merenda.infrastructure.gateway.CartaoGateway;
import com.merenda.infrastructure.gateway.MercadoPagoPixGateway;
import com.merenda.infrastructure.gateway.PagamentoGateway;
import com.merenda.infrastructure.gateway.SimulatedBoletoGateway;
import com.merenda.infrastructure.gateway.SimulatedCartaoGateway;
import com.merenda.infrastructure.gateway.SimulatedPagamentoGateway;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.math.BigDecimal;

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

    @Bean
    public BoletoGateway boletoGateway() {
        log.info("BoletoGateway: simulated (MVP). Para produção, plugar Iugu/Asaas/Mercado Pago Boletos.");
        return new SimulatedBoletoGateway();
    }

    @Bean
    public CartaoGateway cartaoGateway(
            @Value("${merenda.pagamento.cartao.taxa-conveniencia:0.0499}") String taxa) {
        BigDecimal taxaPercentual = new BigDecimal(taxa);
        log.info("CartaoGateway: simulated com taxa de conveniência de {}%. Para produção, plugar Mercado Pago Bricks / Stripe / Pagar.me.",
                taxaPercentual.multiply(new BigDecimal("100")));
        return new SimulatedCartaoGateway(taxaPercentual);
    }
}
