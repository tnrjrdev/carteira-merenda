package com.merenda.controller;

import com.merenda.model.Notificacao;
import com.merenda.service.NotificacaoService;
import com.merenda.security.SecurityUtils;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notificacoes")
public class NotificacaoController {

    private final NotificacaoService notificacaoService;
    private final SecurityUtils securityUtils;

    public NotificacaoController(NotificacaoService notificacaoService, SecurityUtils securityUtils) {
        this.notificacaoService = notificacaoService;
        this.securityUtils = securityUtils;
    }

    @GetMapping
    public ResponseEntity<List<Notificacao>> listar() {
        return ResponseEntity.ok(notificacaoService.listar(securityUtils.currentUser().getId()));
    }

    @GetMapping("/nao-lidas")
    public ResponseEntity<Map<String, Object>> naoLidas() {
        long count = notificacaoService.contarNaoLidas(securityUtils.currentUser().getId());
        return ResponseEntity.ok(Map.of("naoLidas", count));
    }

    @PostMapping("/{id}/lida")
    public ResponseEntity<Void> marcarLida(@PathVariable Long id) {
        notificacaoService.marcarLida(securityUtils.currentUser().getId(), id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/lidas")
    public ResponseEntity<Void> marcarTodas() {
        notificacaoService.marcarTodasLidas(securityUtils.currentUser().getId());
        return ResponseEntity.noContent().build();
    }

    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter stream() {
        return notificacaoService.conectar(securityUtils.currentUser().getId());
    }
}
