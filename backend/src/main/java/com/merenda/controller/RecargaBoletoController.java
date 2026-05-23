package com.merenda.controller;

import com.merenda.service.RecargaBoletoService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.Map;

@RestController
@RequestMapping("/api/carteira/recarga-boleto")
public class RecargaBoletoController {

    private final RecargaBoletoService recargaBoletoService;
    private final SecurityUtils securityUtils;

    public RecargaBoletoController(RecargaBoletoService recargaBoletoService, SecurityUtils securityUtils) {
        this.recargaBoletoService = recargaBoletoService;
        this.securityUtils = securityUtils;
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> iniciar(@RequestBody Map<String, Object> body) {
        Long estudanteId = ((Number) body.get("estudanteId")).longValue();
        BigDecimal valor = new BigDecimal(body.get("valor").toString());
        return ResponseEntity.ok(recargaBoletoService.iniciar(securityUtils.currentUser(), estudanteId, valor));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> consultar(@PathVariable Long id) {
        return ResponseEntity.ok(recargaBoletoService.consultar(securityUtils.currentUser(), id));
    }

    @PostMapping("/{externalId}/aprovar-simulado")
    public ResponseEntity<Void> aprovarSimulado(@PathVariable String externalId) {
        recargaBoletoService.aprovarSimulado(externalId);
        return ResponseEntity.noContent().build();
    }
}
