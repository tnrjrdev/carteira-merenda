package com.merenda.domain.pedido.controller;

import com.merenda.config.security.SecurityUtils;
import com.merenda.domain.pedido.model.Pedido;
import com.merenda.domain.pedido.model.StatusPedido;
import com.merenda.domain.pedido.service.PedidoService;

import com.merenda.domain.pedido.model.Pedido;
import com.merenda.domain.pedido.model.StatusPedido;
import com.merenda.domain.pedido.service.PedidoService;
import com.merenda.config.security.SecurityUtils;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/pedidos")
public class PedidoController {

    private final PedidoService pedidoService;
    private final SecurityUtils securityUtils;

    public PedidoController(PedidoService pedidoService, SecurityUtils securityUtils) {
        this.pedidoService = pedidoService;
        this.securityUtils = securityUtils;
    }

    @PostMapping
    @PreAuthorize("hasRole('ESTUDANTE')")
    @SuppressWarnings("unchecked")
    public ResponseEntity<Pedido> criar(@RequestBody Map<String, Object> body) {
        Long cantinaId = ((Number) body.get("cantinaId")).longValue();
        List<Map<String, Object>> itens = (List<Map<String, Object>>) body.get("itens");
        LocalDateTime retirada = body.get("retiradaPrevista") == null ? null
                : LocalDateTime.parse((String) body.get("retiradaPrevista"));
        return ResponseEntity.ok(pedidoService.criar(securityUtils.currentUser(), cantinaId, itens, retirada));
    }

    @GetMapping("/meus")
    @PreAuthorize("hasRole('ESTUDANTE')")
    public ResponseEntity<List<Pedido>> meus() {
        return ResponseEntity.ok(pedidoService.listarEstudante(securityUtils.currentUser().getId()));
    }

    @PostMapping("/{id}/cancelar")
    @PreAuthorize("hasRole('ESTUDANTE')")
    public ResponseEntity<Pedido> cancelar(@PathVariable Long id) {
        return ResponseEntity.ok(pedidoService.cancelarPeloEstudante(securityUtils.currentUser(), id));
    }

    @GetMapping("/fila")
    @PreAuthorize("hasRole('CANTINA')")
    public ResponseEntity<List<Pedido>> fila() {
        var u = securityUtils.currentUser();
        if (u.getCantina() == null) return ResponseEntity.badRequest().build();
        return ResponseEntity.ok(pedidoService.listarFilaCantina(u.getCantina().getId()));
    }

    @PutMapping("/{id}/status")
    @PreAuthorize("hasRole('CANTINA')")
    public ResponseEntity<Pedido> mudarStatus(@PathVariable Long id, @RequestBody Map<String, String> body) {
        StatusPedido novo = StatusPedido.valueOf(body.get("status").toUpperCase());
        return ResponseEntity.ok(pedidoService.atualizarStatus(securityUtils.currentUser(), id, novo));
    }
}
