package com.merenda.domain.carteira.controller;

import com.merenda.config.security.SecurityUtils;
import com.merenda.domain.carteira.dto.PagamentoDto;
import com.merenda.domain.carteira.service.PagamentoService;

import com.merenda.domain.carteira.dto.PagamentoDto;
import com.merenda.domain.carteira.service.PagamentoService;
import com.merenda.config.security.SecurityUtils;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/pagamentos")
public class PagamentoController {

    private final PagamentoService pagamentoService;
    private final SecurityUtils securityUtils;

    public PagamentoController(PagamentoService pagamentoService, SecurityUtils securityUtils) {
        this.pagamentoService = pagamentoService;
        this.securityUtils = securityUtils;
    }

    @PostMapping("/token")
    public ResponseEntity<PagamentoDto.TokenResponse> gerarToken() {
        return ResponseEntity.ok(pagamentoService.gerarToken(securityUtils.currentUser()));
    }

    @PostMapping("/token-nfc")
    public ResponseEntity<PagamentoDto.TokenResponse> gerarTokenNfc() {
        return ResponseEntity.ok(pagamentoService.gerarTokenNfc(securityUtils.currentUser()));
    }

    @PostMapping("/cobrar")
    public ResponseEntity<PagamentoDto.CobrancaResponse> cobrar(@RequestBody @Valid PagamentoDto.CobrancaRequest req) {
        return ResponseEntity.ok(pagamentoService.cobrar(securityUtils.currentUser(), req));
    }
}
