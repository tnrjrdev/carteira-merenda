package com.merenda.gateway;

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
 * Integração real com a API do Mercado Pago para Pix.
 * Documentação: https://www.mercadopago.com.br/developers/pt/docs/checkout-api/payment-methods/pix
 *
 * Habilitar via:
 *   merenda.pagamento.gateway=mercadopago
 *   merenda.pagamento.mercadopago.access-token=APP_USR-...   (sandbox ou produção)
 */
public class MercadoPagoPixGateway implements PagamentoGateway {

    private static final Logger log = LoggerFactory.getLogger(MercadoPagoPixGateway.class);
    private static final String BASE_URL = "https://api.mercadopago.com";

    private final String accessToken;
    private final ObjectMapper objectMapper;
    private final HttpClient http;

    public MercadoPagoPixGateway(String accessToken, ObjectMapper objectMapper) {
        this.accessToken = accessToken;
        this.objectMapper = objectMapper;
        this.http = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
    }

    @Override
    public String nome() { return "mercadopago"; }

    @Override
    public CobrancaPix criarCobrancaPix(BigDecimal valor, String descricao, String payerEmail, String payerNome) {
        try {
            Map<String, Object> payer = new HashMap<>();
            payer.put("email", payerEmail == null || payerEmail.isBlank() ? "pagador@merenda.app" : payerEmail);
            if (payerNome != null && !payerNome.isBlank()) {
                Map<String, Object> firstLast = splitNome(payerNome);
                payer.putAll(firstLast);
            }

            Map<String, Object> body = new HashMap<>();
            body.put("transaction_amount", valor);
            body.put("description", descricao == null ? "Recarga Merenda" : descricao);
            body.put("payment_method_id", "pix");
            body.put("payer", payer);

            String idempotencyKey = UUID.randomUUID().toString();

            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create(BASE_URL + "/v1/payments"))
                    .timeout(Duration.ofSeconds(20))
                    .header("Authorization", "Bearer " + accessToken)
                    .header("Content-Type", "application/json")
                    .header("X-Idempotency-Key", idempotencyKey)
                    .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(body)))
                    .build();

            HttpResponse<String> resp = http.send(req, HttpResponse.BodyHandlers.ofString());
            if (resp.statusCode() >= 400) {
                log.error("[mercadopago] erro ao criar cobrança HTTP {}: {}", resp.statusCode(), resp.body());
                throw new IllegalStateException("Falha ao criar cobrança Pix (HTTP " + resp.statusCode() + ")");
            }
            JsonNode node = objectMapper.readTree(resp.body());
            String externalId = node.path("id").asText();
            JsonNode poi = node.path("point_of_interaction").path("transaction_data");
            String qrBase64 = poi.path("qr_code_base64").asText(null);
            String copiaCola = poi.path("qr_code").asText(null);
            String ticket = poi.path("ticket_url").asText(null);

            LocalDateTime expiraEm = parseIso(node.path("date_of_expiration").asText(null));
            if (expiraEm == null) expiraEm = LocalDateTime.now().plusMinutes(30);

            log.info("[mercadopago] cobrança {} criada valor={}", externalId, valor);
            return new CobrancaPix(externalId, valor, qrBase64, copiaCola, ticket, expiraEm, StatusPagamento.PENDENTE);
        } catch (Exception e) {
            log.error("[mercadopago] criar cobrança", e);
            throw new IllegalStateException("Erro ao criar cobrança Pix: " + e.getMessage(), e);
        }
    }

    @Override
    public StatusPagamento consultarStatus(String externalId) {
        try {
            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create(BASE_URL + "/v1/payments/" + externalId))
                    .timeout(Duration.ofSeconds(15))
                    .header("Authorization", "Bearer " + accessToken)
                    .GET()
                    .build();
            HttpResponse<String> resp = http.send(req, HttpResponse.BodyHandlers.ofString());
            if (resp.statusCode() >= 400) {
                log.warn("[mercadopago] consulta status {} retornou HTTP {}", externalId, resp.statusCode());
                return StatusPagamento.PENDENTE;
            }
            String status = objectMapper.readTree(resp.body()).path("status").asText("pending");
            return mapStatus(status);
        } catch (Exception e) {
            log.warn("[mercadopago] consultar status {}: {}", externalId, e.getMessage());
            return StatusPagamento.PENDENTE;
        }
    }

    private static Map<String, Object> splitNome(String nomeCompleto) {
        Map<String, Object> m = new HashMap<>();
        String[] parts = nomeCompleto.trim().split("\\s+", 2);
        m.put("first_name", parts[0]);
        if (parts.length > 1) m.put("last_name", parts[1]);
        return m;
    }

    private static LocalDateTime parseIso(String s) {
        if (s == null || s.isBlank()) return null;
        try { return OffsetDateTime.parse(s).toLocalDateTime(); }
        catch (Exception e) { return null; }
    }

    public static StatusPagamento mapStatus(String mpStatus) {
        if (mpStatus == null) return StatusPagamento.PENDENTE;
        return switch (mpStatus.toLowerCase()) {
            case "approved" -> StatusPagamento.APROVADO;
            case "rejected" -> StatusPagamento.RECUSADO;
            case "cancelled", "refunded", "charged_back" -> StatusPagamento.CANCELADO;
            case "expired" -> StatusPagamento.EXPIRADO;
            default -> StatusPagamento.PENDENTE;
        };
    }
}
