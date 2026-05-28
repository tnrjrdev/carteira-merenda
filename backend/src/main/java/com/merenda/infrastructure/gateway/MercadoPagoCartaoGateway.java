package com.merenda.infrastructure.gateway;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Cobrança de cartão via Mercado Pago Payments API.
 * Frontend tokeniza com Bricks → envia `cardToken` + `paymentMethodId` para o backend.
 * Doc: https://www.mercadopago.com.br/developers/pt/docs/checkout-api/payment-methods/cards
 */
public class MercadoPagoCartaoGateway implements CartaoGateway {

    private static final Logger log = LoggerFactory.getLogger(MercadoPagoCartaoGateway.class);
    private static final String BASE_URL = "https://api.mercadopago.com";

    private final String accessToken;
    private final ObjectMapper objectMapper;
    private final HttpClient http;

    public MercadoPagoCartaoGateway(String accessToken, ObjectMapper objectMapper) {
        this.accessToken = accessToken;
        this.objectMapper = objectMapper;
        this.http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();
    }

    @Override
    public String nome() { return "mercadopago-cartao"; }

    @Override
    public CobrancaCartao cobrar(CartaoCobrancaRequest req) {
        if (req.cardToken() == null || req.cardToken().isBlank()) {
            return new CobrancaCartao("mp-error-" + UUID.randomUUID(),
                    req.valor(), BigDecimal.ZERO, BigDecimal.ZERO,
                    null, null, StatusPagamento.RECUSADO, "Token do cartão ausente");
        }
        try {
            Map<String, Object> payer = new HashMap<>();
            payer.put("email", safeEmail(req.payerEmail()));
            if (req.payerNome() != null && !req.payerNome().isBlank()) {
                String[] parts = req.payerNome().trim().split("\\s+", 2);
                payer.put("first_name", parts[0]);
                if (parts.length > 1) payer.put("last_name", parts[1]);
            }
            if (req.payerCpf() != null && !req.payerCpf().isBlank()) {
                Map<String, Object> ident = new HashMap<>();
                ident.put("type", "CPF");
                ident.put("number", req.payerCpf().replaceAll("\\D", ""));
                payer.put("identification", ident);
            }

            Map<String, Object> body = new HashMap<>();
            body.put("transaction_amount", req.valor());
            body.put("token", req.cardToken());
            body.put("description", req.descricao() == null ? "Recarga Merenda" : req.descricao());
            body.put("installments", req.parcelas() == null || req.parcelas() < 1 ? 1 : req.parcelas());
            if (req.paymentMethodId() != null && !req.paymentMethodId().isBlank()) {
                body.put("payment_method_id", req.paymentMethodId());
            }
            if (req.issuerId() != null && !req.issuerId().isBlank()) {
                body.put("issuer_id", req.issuerId());
            }
            body.put("payer", payer);

            HttpRequest httpReq = HttpRequest.newBuilder()
                    .uri(URI.create(BASE_URL + "/v1/payments"))
                    .timeout(Duration.ofSeconds(20))
                    .header("Authorization", "Bearer " + accessToken)
                    .header("Content-Type", "application/json")
                    .header("X-Idempotency-Key", UUID.randomUUID().toString())
                    .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(body)))
                    .build();

            HttpResponse<String> resp = http.send(httpReq, HttpResponse.BodyHandlers.ofString());
            JsonNode node = objectMapper.readTree(resp.body());

            if (resp.statusCode() >= 400) {
                String msg = node.path("message").asText("Erro " + resp.statusCode());
                log.warn("[mp-cartao] HTTP {}: {}", resp.statusCode(), resp.body());
                return new CobrancaCartao("mp-error-" + UUID.randomUUID(),
                        req.valor(), BigDecimal.ZERO, BigDecimal.ZERO,
                        null, null, StatusPagamento.RECUSADO, msg);
            }

            String externalId = node.path("id").asText();
            String mpStatus = node.path("status").asText("pending");
            String statusDetail = node.path("status_detail").asText(null);
            String bandeira = node.path("payment_method_id").asText(null);
            String ultimos = node.path("card").path("last_four_digits").asText(null);

            BigDecimal taxa = node.path("fee_details").isArray() && node.path("fee_details").size() > 0
                    ? new BigDecimal(node.path("fee_details").get(0).path("amount").asText("0"))
                    : BigDecimal.ZERO;
            BigDecimal liquido = node.path("transaction_details").path("net_received_amount").isMissingNode()
                    ? req.valor().subtract(taxa).setScale(2, RoundingMode.HALF_UP)
                    : new BigDecimal(node.path("transaction_details").path("net_received_amount").asText("0"));

            StatusPagamento status = MercadoPagoPixGateway.mapStatus(mpStatus);
            log.info("[mp-cartao] {} status={} bandeira={} ****{}", externalId, mpStatus, bandeira, ultimos);

            return new CobrancaCartao(
                    externalId, req.valor(), taxa, liquido,
                    bandeira != null ? bandeira.toUpperCase() : null,
                    ultimos,
                    status,
                    statusDetail != null ? statusDetail : mpStatus);

        } catch (Exception e) {
            log.error("[mp-cartao] erro inesperado", e);
            return new CobrancaCartao("mp-error-" + UUID.randomUUID(),
                    req.valor(), BigDecimal.ZERO, BigDecimal.ZERO,
                    null, null, StatusPagamento.CANCELADO,
                    "Erro de comunicação com o gateway: " + e.getMessage());
        }
    }

    private static String safeEmail(String e) {
        return (e == null || e.isBlank()) ? "pagador@merenda.app" : e;
    }

    /**
     * Cria (ou reutiliza) um customer MP e adiciona o cartão à carteira dele para reuso futuro.
     * Retorna mapa com `customerId`, `cardId`, `bandeira`, `ultimos4`.
     */
    public Map<String, String> salvarCartao(String payerEmail, String cardToken) {
        try {
            String customerId = obterOuCriarCustomer(payerEmail);

            Map<String, Object> cardBody = new HashMap<>();
            cardBody.put("token", cardToken);

            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create(BASE_URL + "/v1/customers/" + customerId + "/cards"))
                    .timeout(Duration.ofSeconds(20))
                    .header("Authorization", "Bearer " + accessToken)
                    .header("Content-Type", "application/json")
                    .header("X-Idempotency-Key", UUID.randomUUID().toString())
                    .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(cardBody)))
                    .build();
            HttpResponse<String> resp = http.send(req, HttpResponse.BodyHandlers.ofString());
            if (resp.statusCode() >= 400) {
                log.warn("[mp-cartao] salvarCartao HTTP {}: {}", resp.statusCode(), resp.body());
                throw new IllegalStateException("Não foi possível salvar o cartão: "
                        + objectMapper.readTree(resp.body()).path("message").asText("erro " + resp.statusCode()));
            }
            JsonNode node = objectMapper.readTree(resp.body());
            Map<String, String> out = new HashMap<>();
            out.put("customerId", customerId);
            out.put("cardId", node.path("id").asText());
            out.put("bandeira", node.path("payment_method").path("id").asText("?").toUpperCase());
            out.put("ultimos4", node.path("last_four_digits").asText("?"));
            log.info("[mp-cartao] cartão salvo customer={} card={}", customerId, out.get("cardId"));
            return out;
        } catch (IllegalStateException e) {
            throw e;
        } catch (Exception e) {
            throw new IllegalStateException("Erro ao salvar cartão: " + e.getMessage(), e);
        }
    }

    /**
     * Cobra usando um cartão salvo no customer (MIT — server-initiated).
     * Em sandbox aceita sem CVV; em produção pode exigir tokenização da SecurityCode da SDK,
     * dependendo do acordo MP. Quando isso for o caso, passe o cardTokenFresh do frontend.
     */
    public CobrancaCartao cobrarComCartaoSalvo(String customerId, String cardId, String cardTokenFresh,
                                               BigDecimal valor, String descricao) {
        try {
            Map<String, Object> body = new HashMap<>();
            body.put("transaction_amount", valor);
            body.put("description", descricao == null ? "Recarga Merenda recorrente" : descricao);
            body.put("installments", 1);
            body.put("capture", true);
            Map<String, Object> payer = new HashMap<>();
            payer.put("type", "customer");
            payer.put("id", customerId);
            body.put("payer", payer);
            if (cardTokenFresh != null && !cardTokenFresh.isBlank()) {
                body.put("token", cardTokenFresh);
            } else {
                // sandbox MIT: identifica o card salvo
                body.put("token", cardId);
            }

            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create(BASE_URL + "/v1/payments"))
                    .timeout(Duration.ofSeconds(20))
                    .header("Authorization", "Bearer " + accessToken)
                    .header("Content-Type", "application/json")
                    .header("X-Idempotency-Key", UUID.randomUUID().toString())
                    .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(body)))
                    .build();
            HttpResponse<String> resp = http.send(req, HttpResponse.BodyHandlers.ofString());
            JsonNode node = objectMapper.readTree(resp.body());
            if (resp.statusCode() >= 400) {
                String msg = node.path("message").asText("Erro " + resp.statusCode());
                log.warn("[mp-cartao] cobrança recorrente HTTP {}: {}", resp.statusCode(), resp.body());
                return new CobrancaCartao("mp-error-" + UUID.randomUUID(), valor,
                        BigDecimal.ZERO, BigDecimal.ZERO, null, null,
                        StatusPagamento.RECUSADO, msg);
            }
            String externalId = node.path("id").asText();
            String mpStatus = node.path("status").asText("pending");
            String bandeira = node.path("payment_method_id").asText(null);
            String ultimos = node.path("card").path("last_four_digits").asText(null);
            BigDecimal taxa = node.path("fee_details").isArray() && node.path("fee_details").size() > 0
                    ? new BigDecimal(node.path("fee_details").get(0).path("amount").asText("0"))
                    : BigDecimal.ZERO;
            BigDecimal liquido = node.path("transaction_details").path("net_received_amount").isMissingNode()
                    ? valor.subtract(taxa)
                    : new BigDecimal(node.path("transaction_details").path("net_received_amount").asText("0"));
            return new CobrancaCartao(externalId, valor, taxa, liquido,
                    bandeira != null ? bandeira.toUpperCase() : null, ultimos,
                    MercadoPagoPixGateway.mapStatus(mpStatus), mpStatus);
        } catch (Exception e) {
            log.error("[mp-cartao] erro em cobrança recorrente", e);
            return new CobrancaCartao("mp-error-" + UUID.randomUUID(), valor,
                    BigDecimal.ZERO, BigDecimal.ZERO, null, null,
                    StatusPagamento.CANCELADO, "Erro: " + e.getMessage());
        }
    }

    private String obterOuCriarCustomer(String email) throws Exception {
        String safe = safeEmail(email);
        // tenta achar por search
        HttpRequest search = HttpRequest.newBuilder()
                .uri(URI.create(BASE_URL + "/v1/customers/search?email=" + java.net.URLEncoder.encode(safe, StandardCharsets.UTF_8)))
                .header("Authorization", "Bearer " + accessToken)
                .GET().build();
        HttpResponse<String> sr = http.send(search, HttpResponse.BodyHandlers.ofString());
        if (sr.statusCode() < 400) {
            JsonNode results = objectMapper.readTree(sr.body()).path("results");
            if (results.isArray() && results.size() > 0) {
                return results.get(0).path("id").asText();
            }
        }
        // cria novo
        Map<String, Object> body = new HashMap<>();
        body.put("email", safe);
        HttpRequest create = HttpRequest.newBuilder()
                .uri(URI.create(BASE_URL + "/v1/customers"))
                .header("Authorization", "Bearer " + accessToken)
                .header("Content-Type", "application/json")
                .header("X-Idempotency-Key", UUID.randomUUID().toString())
                .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(body)))
                .build();
        HttpResponse<String> cr = http.send(create, HttpResponse.BodyHandlers.ofString());
        if (cr.statusCode() >= 400) {
            String msg = objectMapper.readTree(cr.body()).path("message").asText("erro " + cr.statusCode());
            throw new IllegalStateException("Falha ao criar customer MP: " + msg);
        }
        return objectMapper.readTree(cr.body()).path("id").asText();
    }
}
