package com.merenda.controller;

import com.merenda.exception.BusinessException;
import com.merenda.model.FechamentoCaixa;
import com.merenda.service.FechamentoCaixaService;
import com.merenda.security.SecurityUtils;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/cantina/caixa")
@PreAuthorize("hasRole('CANTINA')")
public class FechamentoCaixaController {

    private final FechamentoCaixaService fechamentoService;
    private final SecurityUtils securityUtils;

    public FechamentoCaixaController(FechamentoCaixaService fechamentoService, SecurityUtils securityUtils) {
        this.fechamentoService = fechamentoService;
        this.securityUtils = securityUtils;
    }

    @GetMapping("/previa")
    public ResponseEntity<Map<String, Object>> previa(@RequestParam(required = false) String dia) {
        var u = securityUtils.currentUser();
        if (u.getCantina() == null) throw new BusinessException("Operador sem cantina");
        LocalDate d = dia == null ? LocalDate.now() : LocalDate.parse(dia);
        return ResponseEntity.ok(fechamentoService.previa(u.getCantina(), d));
    }

    @PostMapping("/fechar")
    public ResponseEntity<FechamentoCaixa> fechar(@RequestBody(required = false) Map<String, String> body) {
        LocalDate dia = body == null || body.get("dia") == null
                ? LocalDate.now() : LocalDate.parse(body.get("dia"));
        return ResponseEntity.ok(fechamentoService.fechar(securityUtils.currentUser(), dia));
    }

    @GetMapping
    public ResponseEntity<List<FechamentoCaixa>> listar() {
        var u = securityUtils.currentUser();
        if (u.getCantina() == null) throw new BusinessException("Operador sem cantina");
        return ResponseEntity.ok(fechamentoService.listar(u.getCantina().getId()));
    }
}
