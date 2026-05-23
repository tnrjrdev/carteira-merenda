package com.merenda.controller;

import com.merenda.exception.BusinessException;
import com.merenda.model.Fatura;
import com.merenda.service.FaturaSaasService;
import com.merenda.security.SecurityUtils;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/faturas")
public class FaturaController {

    private final FaturaSaasService faturaService;
    private final SecurityUtils securityUtils;

    public FaturaController(FaturaSaasService faturaService, SecurityUtils securityUtils) {
        this.faturaService = faturaService;
        this.securityUtils = securityUtils;
    }

    @GetMapping("/cantina")
    @PreAuthorize("hasRole('CANTINA')")
    public ResponseEntity<List<Fatura>> minhas() {
        var u = securityUtils.currentUser();
        if (u.getCantina() == null) throw new BusinessException("Operador sem cantina");
        return ResponseEntity.ok(faturaService.listar(u.getCantina().getId()));
    }

    @GetMapping("/cantina/{cantinaId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<Fatura>> dasCantina(@PathVariable Long cantinaId) {
        return ResponseEntity.ok(faturaService.listar(cantinaId));
    }

    /** MOCK — simula pagamento de fatura. Em produção viria via webhook do gateway. */
    @PostMapping("/{id}/pagar")
    public ResponseEntity<Fatura> pagar(@PathVariable Long id) {
        return ResponseEntity.ok(faturaService.pagar(id));
    }
}
