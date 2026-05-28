package com.merenda.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.merenda.infrastructure.gateway.BoletoGateway;
import com.merenda.infrastructure.gateway.CartaoGateway;
import com.merenda.infrastructure.gateway.MercadoPagoBoletoGateway;
import com.merenda.infrastructure.gateway.MercadoPagoCartaoGateway;
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
    public BoletoGateway boletoGateway(
            @Value("${merenda.pagamento.gateway:simulated}") String gatewayNome,
            @Value("${merenda.pagamento.mercadopago.access-token:}") String mpToken,
            ObjectMapper objectMapper) {

        if ("mercadopago".equalsIgnoreCase(gatewayNome)) {
            if (mpToken == null || mpToken.isBlank()) {
                log.warn("BoletoGateway mercadopago sem MERCADOPAGO_ACCESS_TOKEN. Caindo para simulated.");
                return new SimulatedBoletoGateway();
            }
            log.info("BoletoGateway: Mercado Pago (boleto real)");
            return new MercadoPagoBoletoGateway(mpToken, objectMapper);
        }
        log.info("BoletoGateway: simulated (dev/teste)");
        return new SimulatedBoletoGateway();
    }

    @Bean
    public CartaoGateway cartaoGateway(
            @Value("${merenda.pagamento.gateway:simulated}") String gatewayNome,
            @Value("${merenda.pagamento.mercadopago.access-token:}") String mpToken,
            @Value("${merenda.pagamento.cartao.taxa-conveniencia:0.0499}") String taxa,
            ObjectMapper objectMapper) {

        if ("mercadopago".equalsIgnoreCase(gatewayNome)) {
            if (mpToken == null || mpToken.isBlank()) {
                log.warn("CartaoGateway mercadopago sem MERCADOPAGO_ACCESS_TOKEN. Caindo para simulated.");
                return new SimulatedCartaoGateway(new BigDecimal(taxa));
            }
            log.info("CartaoGateway: Mercado Pago (cartão real)");
            return new MercadoPagoCartaoGateway(mpToken, objectMapper);
        }

        BigDecimal taxaPercentual = new BigDecimal(taxa);
        log.info("CartaoGateway: simulated com taxa de conveniência de {}%",
                taxaPercentual.multiply(new BigDecimal("100")));
        return new SimulatedCartaoGateway(taxaPercentual);
    }
}
