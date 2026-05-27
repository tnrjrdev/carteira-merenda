package com.merenda.domain.cantina.controller;

import com.merenda.config.security.SecurityUtils;
import com.merenda.domain.cantina.dto.ProdutoDto;
import com.merenda.domain.cantina.service.ProdutoService;

import com.merenda.domain.cantina.dto.ProdutoDto;
import com.merenda.domain.cantina.service.ProdutoService;
import com.merenda.config.security.SecurityUtils;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/produtos")
public class ProdutoController {

    private final ProdutoService produtoService;
    private final SecurityUtils securityUtils;

    public ProdutoController(ProdutoService produtoService, SecurityUtils securityUtils) {
        this.produtoService = produtoService;
        this.securityUtils = securityUtils;
    }

    @GetMapping("/cantina/{cantinaId}")
    public ResponseEntity<List<ProdutoDto.Response>> listar(
            @PathVariable Long cantinaId,
            @RequestParam(defaultValue = "true") boolean somenteDisponiveis) {
        return ResponseEntity.ok(produtoService.listarPorCantina(cantinaId, somenteDisponiveis));
    }

    @PostMapping
    public ResponseEntity<ProdutoDto.Response> criar(@RequestBody @Valid ProdutoDto.CreateRequest req) {
        return ResponseEntity.ok(produtoService.criar(securityUtils.currentUser(), req));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ProdutoDto.Response> atualizar(@PathVariable Long id,
                                                         @RequestBody @Valid ProdutoDto.CreateRequest req) {
        return ResponseEntity.ok(produtoService.atualizar(securityUtils.currentUser(), id, req));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> remover(@PathVariable Long id) {
        produtoService.remover(securityUtils.currentUser(), id);
        return ResponseEntity.noContent().build();
    }
}
