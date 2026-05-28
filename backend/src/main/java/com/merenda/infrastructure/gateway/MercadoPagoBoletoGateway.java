package com.merenda.infrastructure.gateway;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.math.BigDecimal;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Boleto bancário via Mercado Pago Payments API (payment_method_id=bolbradesco).
 * Doc: https://www.mercadopago.com.br/developers/pt/docs/checkout-api/payment-methods/other-payment-methods
 */
public class MercadoPagoBoletoGateway implements BoletoGateway {

    private static final Logger log = LoggerFactory.getLogger(MercadoPagoBoletoGateway.class);
    private static final String BASE_URL = "https://api.mercadopago.com";

    private final String accessToken;
    private final ObjectMapper objectMapper;
    private final HttpClient http;

    public MercadoPagoBoletoGateway(String accessToken, ObjectMapper objectMapper) {
        this.accessToken = accessToken;
        this.objectMapper = objectMapper;
        this.http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();
    }

    @Override
    public String nome() { return "mercadopago-boleto"; }

    @Override
    public CobrancaBoleto criarBoleto(BigDecimal valor, String descricao, String payerEmail,
                                      String payerNome, String payerCpf) {
        try {
            Map<String, Object> payer = new HashMap<>();
            payer.put("email", payerEmail == null || payerEmail.isBlank() ? "pagador@merenda.app" : payerEmail);
            String[] parts = (payerNome == null ? "Pagador Merenda" : payerNome).trim().split("\\s+", 2);
            payer.put("first_name", parts[0]);
            payer.put("last_name", parts.length > 1 ? parts[1] : "Cliente");
            if (payerCpf != null && !payerCpf.isBlank()) {
                Map<String, Object> ident = new HashMap<>();
                ident.put("type", "CPF");
                ident.put("number", payerCpf.replaceAll("\\D", ""));
                payer.put("identification", ident);
            }

            Map<String, Object> body = new HashMap<>();
            body.put("transaction_amount", valor);
            body.put("description", descricao == null ? "Recarga Merenda" : descricao);
            body.put("payment_method_id", "bolbradesco");
            body.put("payer", payer);

            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create(BASE_URL + "/v1/payments"))
                    .timeout(Duration.ofSeconds(20))
                    .header("Authorization", "Bearer " + accessToken)
                    .header("Content-Type", "application/json")
                    .header("X-Idempotency-Key", UUID.randomUUID().toString())
                    .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(body)))
                    .build();

            HttpResponse<String> resp = http.send(req, HttpResponse.BodyHandlers.ofString());
            if (resp.statusCode() >= 400) {
                log.error("[mp-boleto] HTTP {}: {}", resp.statusCode(), resp.body());
                throw new IllegalStateException("Falha ao criar boleto (HTTP " + resp.statusCode() + ")");
            }
            JsonNode node = objectMapper.readTree(resp.body());

            String externalId = node.path("id").asText();
            String linhaDigitavel = node.path("transaction_details").path("barcode").path("content").asText(null);
            if (linhaDigitavel == null || linhaDigitavel.isBlank()) {
                linhaDigitavel = node.path("barcode").path("content").asText("");
            }
            String url = node.path("transaction_details").path("external_resource_url").asText(null);
            if (url == null || url.isBlank()) {
                url = node.path("point_of_interaction").path("transaction_data").path("ticket_url").asText(null);
            }
            LocalDateTime expiraEm = parseIso(node.path("date_of_expiration").asText(null));
            if (expiraEm == null) expiraEm = LocalDateTime.now().plusDays(3);

            log.info("[mp-boleto] criado externalId={} valor={}", externalId, valor);
            return new CobrancaBoleto(externalId, valor, linhaDigitavel, url, expiraEm, StatusPagamento.PENDENTE);

        } catch (Exception e) {
            log.error("[mp-boleto] erro ao criar boleto", e);
            throw new IllegalStateException("Erro ao criar boleto: " + e.getMessage(), e);
        }
    }

    @Override
    public StatusPagamento consultarStatus(String externalId) {
        try {
            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create(BASE_URL + "/v1/payments/" + externalId))
                    .timeout(Duration.ofSeconds(15))
                    .header("Authorization", "Bearer " + accessToken)
                    .GET().build();
            HttpResponse<String> resp = http.send(req, HttpResponse.BodyHandlers.ofString());
            if (resp.statusCode() >= 400) {
                log.warn("[mp-boleto] consulta {} HTTP {}", externalId, resp.statusCode());
                return StatusPagamento.PENDENTE;
            }
            String mpStatus = objectMapper.readTree(resp.body()).path("status").asText("pending");
            return MercadoPagoPixGateway.mapStatus(mpStatus);
        } catch (Exception e) {
            log.warn("[mp-boleto] consultarStatus {}: {}", externalId, e.getMessage());
            return StatusPagamento.PENDENTE;
        }
    }

    private static LocalDateTime parseIso(String s) {
        if (s == null || s.isBlank()) return null;
        try { return OffsetDateTime.parse(s).toLocalDateTime(); }
        catch (Exception e) { return null; }
    }
}
