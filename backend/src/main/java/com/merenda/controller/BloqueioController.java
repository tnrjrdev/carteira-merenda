package com.merenda.controller;

import com.merenda.model.BloqueioCategoria;
import com.merenda.service.BloqueioService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/bloqueios")
public class BloqueioController {

    private final BloqueioService bloqueioService;
    private final SecurityUtils securityUtils;

    public BloqueioController(BloqueioService bloqueioService, SecurityUtils securityUtils) {
        this.bloqueioService = bloqueioService;
        this.securityUtils = securityUtils;
    }

    @GetMapping("/estudante/{estudanteId}")
    public ResponseEntity<List<Map<String, Object>>> listar(@PathVariable Long estudanteId) {
        List<Map<String, Object>> resp = bloqueioService.listar(securityUtils.currentUser(), estudanteId).stream()
                .map(this::toMap)
                .toList();
        return ResponseEntity.ok(resp);
    }

    @PostMapping("/estudante/{estudanteId}/categoria/{categoriaId}")
    public ResponseEntity<Map<String, Object>> criar(@PathVariable Long estudanteId,
                                                     @PathVariable Long categoriaId,
                                                     @RequestBody(required = false) Map<String, String> body) {
        String motivo = body == null ? null : body.get("motivo");
        BloqueioCategoria b = bloqueioService.criar(securityUtils.currentUser(), estudanteId, categoriaId, motivo);
        return ResponseEntity.ok(toMap(b));
    }

    private Map<String, Object> toMap(BloqueioCategoria b) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", b.getId());
        m.put("categoriaId", b.getCategoria().getId());
        m.put("categoriaNome", b.getCategoria().getNome());
        m.put("motivo", b.getMotivo());
        return m;
    }

    @DeleteMapping("/estudante/{estudanteId}/categoria/{categoriaId}")
    public ResponseEntity<Void> remover(@PathVariable Long estudanteId, @PathVariable Long categoriaId) {
        bloqueioService.remover(securityUtils.currentUser(), estudanteId, categoriaId);
        return ResponseEntity.noContent().build();
    }
}
