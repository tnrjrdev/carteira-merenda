package com.merenda.infrastructure.webhook;


import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;

@Service
public class WebhookDispatcher {

    private static final Logger log = LoggerFactory.getLogger(WebhookDispatcher.class);

    private final WebhookRepository webhookRepository;
    private final ObjectMapper objectMapper;
    private final HttpClient http;

    public WebhookDispatcher(WebhookRepository webhookRepository, ObjectMapper objectMapper) {
        this.webhookRepository = webhookRepository;
        this.objectMapper = objectMapper;
        this.http = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(5))
                .build();
    }

    @Async
    public void dispatch(Long cantinaId, WebhookEvento evento, Map<String, Object> payload) {
        List<Webhook> alvos = webhookRepository.findAtivosPorCantinaEEvento(cantinaId, evento);
        if (alvos.isEmpty()) return;

        Map<String, Object> envelope = new HashMap<>();
        envelope.put("evento", evento.name());
        envelope.put("cantinaId", cantinaId);
        envelope.put("criadoEm", LocalDateTime.now().toString());
        envelope.put("dados", payload);

        String body;
        try {
            body = objectMapper.writeValueAsString(envelope);
        } catch (Exception e) {
            log.error("Falha ao serializar payload do webhook", e);
            return;
        }

        for (Webhook w : alvos) {
            try {
                String assinatura = sign(body, w.getSecret());
                HttpRequest req = HttpRequest.newBuilder()
                        .uri(URI.create(w.getUrl()))
                        .timeout(Duration.ofSeconds(10))
                        .header("Content-Type", "application/json")
                        .header("X-Merenda-Event", evento.name())
                        .header("X-Merenda-Signature", "sha256=" + assinatura)
                        .POST(HttpRequest.BodyPublishers.ofString(body, StandardCharsets.UTF_8))
                        .build();
                HttpResponse<String> resp = http.send(req, HttpResponse.BodyHandlers.ofString());
                marcarDisparo(w.getId(), resp.statusCode());
            } catch (Exception e) {
                log.warn("Falha ao disparar webhook {} para {}: {}", w.getId(), w.getUrl(), e.getMessage());
                marcarDisparo(w.getId(), -1);
            }
        }
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void marcarDisparo(Long webhookId, int statusHttp) {
        webhookRepository.findById(webhookId).ifPresent(w -> {
            w.setUltimoDisparoEm(LocalDateTime.now());
            w.setUltimoStatusHttp(statusHttp);
            webhookRepository.save(w);
        });
    }

    private static String sign(String body, String secret) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] raw = mac.doFinal(body.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(raw);
        } catch (Exception e) {
            throw new IllegalStateException("Erro ao assinar webhook", e);
        }
    }
}
