package com.merenda.controller;

import com.merenda.model.Meta;
import com.merenda.service.GamificacaoService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;

@RestController
@RequestMapping("/api/gamificacao")
public class GamificacaoController {

    private final GamificacaoService gamificacaoService;
    private final SecurityUtils securityUtils;

    public GamificacaoController(GamificacaoService gamificacaoService, SecurityUtils securityUtils) {
        this.gamificacaoService = gamificacaoService;
        this.securityUtils = securityUtils;
    }

    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> meu() {
        return ResponseEntity.ok(gamificacaoService.resumoEstudante(securityUtils.currentUser().getId()));
    }

    @GetMapping("/estudante/{id}")
    public ResponseEntity<Map<String, Object>> doEstudante(@PathVariable Long id) {
        return ResponseEntity.ok(gamificacaoService.resumoEstudante(id));
    }

    @PostMapping("/metas")
    @PreAuthorize("hasRole('ESTUDANTE')")
    public ResponseEntity<Meta> criarMeta(@RequestBody Map<String, Object> body) {
        String titulo = (String) body.get("titulo");
        BigDecimal valor = new BigDecimal(body.get("valorAlvo").toString());
        LocalDate prazo = body.get("prazo") == null ? null : LocalDate.parse((String) body.get("prazo"));
        return ResponseEntity.ok(gamificacaoService.criarMeta(securityUtils.currentUser(), titulo, valor, prazo));
    }

    @PostMapping("/metas/{id}/progresso")
    @PreAuthorize("hasRole('ESTUDANTE')")
    public ResponseEntity<Meta> progredir(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        BigDecimal incremento = new BigDecimal(body.get("incremento").toString());
        return ResponseEntity.ok(gamificacaoService.progredir(securityUtils.currentUser(), id, incremento));
    }
}
