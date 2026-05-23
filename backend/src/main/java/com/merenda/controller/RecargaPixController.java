package com.merenda.controller;

import com.merenda.service.RecargaPixService;
import com.merenda.security.SecurityUtils;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.Map;

@RestController
@RequestMapping("/api/carteira/recarga-pix")
public class RecargaPixController {

    private final RecargaPixService recargaPixService;
    private final SecurityUtils securityUtils;

    public RecargaPixController(RecargaPixService recargaPixService, SecurityUtils securityUtils) {
        this.recargaPixService = recargaPixService;
        this.securityUtils = securityUtils;
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> iniciar(@RequestBody Map<String, Object> body) {
        Long estudanteId = ((Number) body.get("estudanteId")).longValue();
        BigDecimal valor = new BigDecimal(body.get("valor").toString());
        return ResponseEntity.ok(recargaPixService.iniciar(securityUtils.currentUser(), estudanteId, valor));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> consultar(@PathVariable Long id) {
        return ResponseEntity.ok(recargaPixService.consultar(securityUtils.currentUser(), id));
    }

    /** DEV — aprova manualmente uma cobrança simulada. */
    @PostMapping("/{externalId}/aprovar-simulado")
    public ResponseEntity<Void> aprovarSimulado(@PathVariable String externalId) {
        recargaPixService.aprovarSimulado(externalId);
        return ResponseEntity.noContent().build();
    }
}
