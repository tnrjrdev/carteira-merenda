package com.merenda.domain.carteira.controller;

import com.merenda.config.security.SecurityUtils;
import com.merenda.domain.carteira.service.AutoRecargaService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.Map;

@RestController
@RequestMapping("/api/carteira/auto-recarga")
public class AutoRecargaController {

    private final AutoRecargaService autoRecargaService;
    private final SecurityUtils securityUtils;

    public AutoRecargaController(AutoRecargaService autoRecargaService, SecurityUtils securityUtils) {
        this.autoRecargaService = autoRecargaService;
        this.securityUtils = securityUtils;
    }

    @GetMapping("/estudante/{estudanteId}")
    public ResponseEntity<Map<String, Object>> consultar(@PathVariable Long estudanteId) {
        return ResponseEntity.ok(autoRecargaService.consultar(securityUtils.currentUser(), estudanteId));
    }

    @PutMapping("/estudante/{estudanteId}")
    @PreAuthorize("hasAnyRole('RESPONSAVEL','ADMIN')")
    public ResponseEntity<Map<String, Object>> configurar(@PathVariable Long estudanteId,
                                                          @RequestBody Map<String, Object> body) {
        boolean ativa = body.get("ativa") != null && (Boolean) body.get("ativa");
        BigDecimal saldoMin = body.get("saldoMinimo") == null
                ? null : new BigDecimal(body.get("saldoMinimo").toString());
        BigDecimal valor = body.get("valorRecarga") == null
                ? null : new BigDecimal(body.get("valorRecarga").toString());
        String cardToken = (String) body.get("cardToken");
        return ResponseEntity.ok(autoRecargaService.configurar(securityUtils.currentUser(),
                estudanteId, ativa, saldoMin, valor, cardToken));
    }

    @DeleteMapping("/estudante/{estudanteId}/cartao")
    @PreAuthorize("hasAnyRole('RESPONSAVEL','ADMIN')")
    public ResponseEntity<Map<String, Object>> removerCartao(@PathVariable Long estudanteId) {
        return ResponseEntity.ok(autoRecargaService.removerCartao(securityUtils.currentUser(), estudanteId));
    }
}
