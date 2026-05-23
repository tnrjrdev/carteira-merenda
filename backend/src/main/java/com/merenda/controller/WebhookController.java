package com.merenda.controller;

import com.merenda.exception.BusinessException;
import com.merenda.exception.NotFoundException;
import com.merenda.model.Role;
import com.merenda.model.Usuario;
import com.merenda.model.Webhook;
import com.merenda.model.WebhookEvento;
import com.merenda.repository.WebhookRepository;
import com.merenda.security.SecurityUtils;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.SecureRandom;
import java.util.Base64;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/webhooks")
public class WebhookController {

    private static final SecureRandom RNG = new SecureRandom();

    private final WebhookRepository webhookRepository;
    private final SecurityUtils securityUtils;

    public WebhookController(WebhookRepository webhookRepository, SecurityUtils securityUtils) {
        this.webhookRepository = webhookRepository;
        this.securityUtils = securityUtils;
    }

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> listar() {
        Usuario u = exigirCantina();
        List<Map<String, Object>> resp = webhookRepository.findByCantinaId(u.getCantina().getId()).stream()
                .map(this::toJson)
                .toList();
        return ResponseEntity.ok(resp);
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> criar(@RequestBody Map<String, Object> body) {
        Usuario u = exigirCantina();
        String url = (String) body.get("url");
        if (url == null || url.isBlank()) throw new BusinessException("URL é obrigatória");
        if (!url.startsWith("http")) throw new BusinessException("URL deve começar com http(s)://");

        @SuppressWarnings("unchecked")
        List<String> eventosRaw = (List<String>) body.getOrDefault("eventos", List.of());
        Set<WebhookEvento> eventos = new HashSet<>();
        for (String e : eventosRaw) {
            try { eventos.add(WebhookEvento.valueOf(e)); }
            catch (Exception ex) { throw new BusinessException("Evento inválido: " + e); }
        }
        if (eventos.isEmpty()) {
            eventos.add(WebhookEvento.COMPRA_REALIZADA);
            eventos.add(WebhookEvento.RECARGA_REALIZADA);
        }

        byte[] secretBytes = new byte[32];
        RNG.nextBytes(secretBytes);
        String secret = Base64.getUrlEncoder().withoutPadding().encodeToString(secretBytes);

        Webhook w = Webhook.builder()
                .cantina(u.getCantina())
                .url(url)
                .descricao((String) body.get("descricao"))
                .secret(secret)
                .eventos(eventos)
                .ativo(true)
                .build();
        webhookRepository.save(w);

        Map<String, Object> resp = toJson(w);
        resp.put("secret", secret);
        resp.put("aviso", "Guarde o secret agora — ele não será exibido novamente.");
        return ResponseEntity.ok(resp);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> remover(@PathVariable Long id) {
        Usuario u = exigirCantina();
        Webhook w = webhookRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Webhook não encontrado"));
        if (!w.getCantina().getId().equals(u.getCantina().getId())) {
            throw new BusinessException("Webhook não pertence à sua cantina");
        }
        webhookRepository.delete(w);
        return ResponseEntity.noContent().build();
    }

    private Usuario exigirCantina() {
        Usuario u = securityUtils.currentUser();
        if (u.getRole() != Role.CANTINA && u.getRole() != Role.ADMIN) {
            throw new BusinessException("Apenas operadores de cantina podem gerenciar webhooks");
        }
        if (u.getCantina() == null && u.getRole() != Role.ADMIN) {
            throw new BusinessException("Operador sem cantina vinculada");
        }
        return u;
    }

    private Map<String, Object> toJson(Webhook w) {
        Map<String, Object> m = new java.util.HashMap<>();
        m.put("id", w.getId());
        m.put("url", w.getUrl());
        m.put("descricao", w.getDescricao());
        m.put("eventos", w.getEventos().stream().map(Enum::name).toList());
        m.put("ativo", w.isAtivo());
        m.put("ultimoDisparoEm", w.getUltimoDisparoEm());
        m.put("ultimoStatusHttp", w.getUltimoStatusHttp());
        return m;
    }
}
