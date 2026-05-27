package com.merenda.infrastructure.webhook;

import com.merenda.domain.carteira.service.RecargaPixService;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
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
 * Webhook público recebido do Mercado Pago.
 *
 * Configure a URL `https://SEU_DOMINIO/api/webhooks/mercadopago/pix` no painel
 * do Mercado Pago em Notificações → Webhooks, eventos: Payments.
 *
 * Se MERCADOPAGO_WEBHOOK_SECRET estiver definido, validamos a assinatura
 * conforme: https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks
 */
@RestController
@RequestMapping("/api/webhooks/mercadopago")
public class MercadoPagoWebhookController {

    private static final Logger log = LoggerFactory.getLogger(MercadoPagoWebhookController.class);

    private final RecargaPixService recargaPixService;
    private final ObjectMapper objectMapper;
    private final String webhookSecret;

    public MercadoPagoWebhookController(RecargaPixService recargaPixService,
                                        ObjectMapper objectMapper,
                                        @Value("${merenda.pagamento.mercadopago.webhook-secret:}") String webhookSecret) {
        this.recargaPixService = recargaPixService;
        this.objectMapper = objectMapper;
        this.webhookSecret = webhookSecret;
    }

    @PostMapping("/pix")
    public ResponseEntity<Map<String, Object>> receber(
            @RequestBody(required = false) String body,
            @RequestParam(value = "data.id", required = false) String dataIdQuery,
            @RequestHeader(value = "x-signature", required = false) String signature,
            @RequestHeader(value = "x-request-id", required = false) String requestId) {

        if (webhookSecret != null && !webhookSecret.isBlank() && !assinaturaOk(signature, requestId, dataIdQuery)) {
            log.warn("Webhook MP com assinatura inválida (requestId={})", requestId);
            return ResponseEntity.status(401).build();
        }

        try {
            String externalId = dataIdQuery;
            if (externalId == null && body != null && !body.isBlank()) {
                JsonNode node = objectMapper.readTree(body);
                JsonNode dataId = node.path("data").path("id");
                if (!dataId.isMissingNode()) externalId = dataId.asText();
            }
            if (externalId == null || externalId.isBlank()) {
                log.warn("Webhook MP sem data.id");
                return ResponseEntity.ok(Map.of("ignored", true));
            }
            recargaPixService.processarNotificacaoExterna(externalId);
            return ResponseEntity.ok(Map.of("ok", true));
        } catch (Exception e) {
            log.error("Erro processando webhook MP", e);
            return ResponseEntity.status(500).body(Map.of("erro", e.getMessage()));
        }
    }

    private boolean assinaturaOk(String signatureHeader, String requestId, String dataId) {
        if (signatureHeader == null || dataId == null) return false;
        try {
            // header esperado: "ts=1700000000,v1=abcdef..."
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
