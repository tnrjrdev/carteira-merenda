package com.merenda.controller;

import com.merenda.dto.DependenteDto;
import com.merenda.service.DependenteService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/dependentes")
@PreAuthorize("hasRole('RESPONSAVEL')")
public class DependenteController {

    private final DependenteService dependenteService;
    private final SecurityUtils securityUtils;

    public DependenteController(DependenteService dependenteService, SecurityUtils securityUtils) {
        this.dependenteService = dependenteService;
        this.securityUtils = securityUtils;
    }

    @GetMapping
    public ResponseEntity<List<DependenteDto.Resumo>> listar() {
        Long responsavelId = securityUtils.currentUser().getId();
        return ResponseEntity.ok(dependenteService.listarPorResponsavel(responsavelId));
    }

    @PostMapping
    public ResponseEntity<DependenteDto.Resumo> criar(@RequestBody @Valid DependenteDto.CreateRequest req) {
        return ResponseEntity.ok(dependenteService.criarDependente(securityUtils.currentUser(), req));
    }

    @PutMapping("/{estudanteId}/limites")
    public ResponseEntity<DependenteDto.Resumo> atualizarLimites(
            @PathVariable Long estudanteId,
            @RequestBody DependenteDto.AtualizarLimites req) {
        Long responsavelId = securityUtils.currentUser().getId();
        return ResponseEntity.ok(dependenteService.atualizarLimites(responsavelId, estudanteId, req));
    }
}
