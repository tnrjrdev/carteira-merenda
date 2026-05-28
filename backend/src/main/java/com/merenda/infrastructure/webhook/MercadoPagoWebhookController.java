package com.merenda.infrastructure.webhook;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.merenda.domain.carteira.model.RecargaPendente;
import com.merenda.domain.carteira.repository.RecargaPendenteRepository;
import com.merenda.domain.carteira.service.RecargaBoletoService;
import com.merenda.domain.carteira.service.RecargaPixService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.HexFormat;
import java.util.Map;

/**
 * Webhook público recebido do Mercado Pago. Configure no painel:
 *   URL: https://SEU_DOMINIO/api/webhooks/mercadopago
 *   Eventos: Payments
 *
 * O endpoint detecta o método (Pix/Boleto) pela RecargaPendente armazenada e
 * delega para o service certo. Aceita também a URL legada /pix por retrocompat.
 *
 * Quando MERCADOPAGO_WEBHOOK_SECRET está definido, valida a assinatura HMAC-SHA256.
 * Doc: https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks
 */
@RestController
@RequestMapping("/api/webhooks/mercadopago")
public class MercadoPagoWebhookController {

    private static final Logger log = LoggerFactory.getLogger(MercadoPagoWebhookController.class);

    private final RecargaPixService recargaPixService;
    private final RecargaBoletoService recargaBoletoService;
    private final RecargaPendenteRepository recargaRepository;
    private final ObjectMapper objectMapper;
    private final String webhookSecret;

    public MercadoPagoWebhookController(RecargaPixService recargaPixService,
                                        RecargaBoletoService recargaBoletoService,
                                        RecargaPendenteRepository recargaRepository,
                                        ObjectMapper objectMapper,
                                        @Value("${merenda.pagamento.mercadopago.webhook-secret:}") String webhookSecret) {
        this.recargaPixService = recargaPixService;
        this.recargaBoletoService = recargaBoletoService;
        this.recargaRepository = recargaRepository;
        this.objectMapper = objectMapper;
        this.webhookSecret = webhookSecret;
    }

    /** Endpoint unificado — usa o método da RecargaPendente para rotear. */
    @PostMapping
    public ResponseEntity<Map<String, Object>> receber(
            @RequestBody(required = false) String body,
            @RequestParam(value = "data.id", required = false) String dataIdQuery,
            @RequestParam(value = "type", required = false) String type,
            @RequestHeader(value = "x-signature", required = false) String signature,
            @RequestHeader(value = "x-request-id", required = false) String requestId) {
        return processar(body, dataIdQuery, type, signature, requestId);
    }

    /** Alias legado — caso já exista URL antiga configurada. */
    @PostMapping("/pix")
    public ResponseEntity<Map<String, Object>> receberPix(
            @RequestBody(required = false) String body,
            @RequestParam(value = "data.id", required = false) String dataIdQuery,
            @RequestParam(value = "type", required = false) String type,
            @RequestHeader(value = "x-signature", required = false) String signature,
            @RequestHeader(value = "x-request-id", required = false) String requestId) {
        return processar(body, dataIdQuery, type, signature, requestId);
    }

    private ResponseEntity<Map<String, Object>> processar(String body, String dataIdQuery, String type,
                                                          String signature, String requestId) {
        if (webhookSecret != null && !webhookSecret.isBlank()
                && !assinaturaOk(signature, requestId, dataIdQuery)) {
            log.warn("Webhook MP com assinatura inválida (requestId={})", requestId);
            return ResponseEntity.status(401).build();
        }

        try {
            String externalId = dataIdQuery;
            if (externalId == null && body != null && !body.isBlank()) {
                JsonNode node = objectMapper.readTree(body);
                JsonNode dataId = node.path("data").path("id");
                if (!dataId.isMissingNode()) externalId = dataId.asText();
                if (type == null) {
                    JsonNode t = node.path("type");
                    if (!t.isMissingNode()) type = t.asText();
                }
            }
            if (externalId == null || externalId.isBlank()) {
                log.warn("Webhook MP sem data.id (type={})", type);
                return ResponseEntity.ok(Map.of("ignored", true));
            }
            if (type != null && !"payment".equalsIgnoreCase(type)) {
                log.info("Webhook MP type={} ignorado", type);
                return ResponseEntity.ok(Map.of("ignored", true, "type", type));
            }

            RecargaPendente recarga = recargaRepository.findByExternalId(externalId).orElse(null);
            if (recarga == null) {
                log.info("Webhook MP para externalId={} sem RecargaPendente correspondente (provável pagamento fora do app)", externalId);
                return ResponseEntity.ok(Map.of("ignored", true));
            }

            String metodo = recarga.getMetodo();
            if ("BOLETO".equalsIgnoreCase(metodo)) {
                recargaBoletoService.processarNotificacaoExterna(externalId);
            } else if ("CARTAO".equalsIgnoreCase(metodo)) {
                log.info("Webhook MP recebido para cartão {} — confirmação síncrona; nada a fazer", externalId);
            } else {
                recargaPixService.processarNotificacaoExterna(externalId);
            }
            return ResponseEntity.ok(Map.of("ok", true, "metodo", metodo));
        } catch (Exception e) {
            log.error("Erro processando webhook MP", e);
            return ResponseEntity.status(500).body(Map.of("erro", e.getMessage()));
        }
    }

    private boolean assinaturaOk(String signatureHeader, String requestId, String dataId) {
        if (signatureHeader == null || dataId == null) return false;
        try {
            String ts = null, v1 = null;
            for (String part : signatureHeader.split(",")) {
                String[] kv = part.trim().split("=", 2);
                if (kv.length != 2) continue;
                if ("ts".equals(kv[0])) ts = kv[1];
                if ("v1".equals(kv[0])) v1 = kv[1];
            }
            if (ts == null || v1 == null) return false;
            String manifest = "id:" + dataId + ";request-id:" + (requestId == null ? "" : requestId)
                    + ";ts:" + ts + ";";
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(webhookSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] raw = mac.doFinal(manifest.getBytes(StandardCharsets.UTF_8));
            String calc = HexFormat.of().formatHex(raw);
            return calc.equalsIgnoreCase(v1);
        } catch (Exception e) {
            log.warn("Erro validando assinatura MP: {}", e.getMessage());
            return false;
        }
    }
}
