package com.merenda.domain.carteira.controller;

import com.merenda.config.security.SecurityUtils;
import com.merenda.domain.carteira.model.Mesada;
import com.merenda.domain.carteira.service.MesadaService;

import com.merenda.domain.carteira.model.Mesada;
import com.merenda.domain.carteira.service.MesadaService;
import com.merenda.config.security.SecurityUtils;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.util.Map;

@RestController
@RequestMapping("/api/mesadas")
public class MesadaController {

    private final MesadaService mesadaService;
    private final SecurityUtils securityUtils;

    public MesadaController(MesadaService mesadaService, SecurityUtils securityUtils) {
        this.mesadaService = mesadaService;
        this.securityUtils = securityUtils;
    }

    @GetMapping("/estudante/{estudanteId}")
    public ResponseEntity<Mesada> buscar(@PathVariable Long estudanteId) {
        Mesada m = mesadaService.buscar(estudanteId);
        return m == null ? ResponseEntity.noContent().build() : ResponseEntity.ok(m);
    }

    @PutMapping("/estudante/{estudanteId}")
    @PreAuthorize("hasAnyRole('RESPONSAVEL','ADMIN')")
    public ResponseEntity<Mesada> salvar(@PathVariable Long estudanteId,
                                         @RequestBody Map<String, Object> body) {
        BigDecimal valor = new BigDecimal(body.get("valor").toString());
        Mesada.FrequenciaMesada freq = Mesada.FrequenciaMesada.valueOf(
                ((String) body.get("frequencia")).toUpperCase());
        DayOfWeek diaSemana = body.get("diaSemana") == null ? null
                : DayOfWeek.valueOf(((String) body.get("diaSemana")).toUpperCase());
        Integer diaMes = body.get("diaMes") == null ? null : ((Number) body.get("diaMes")).intValue();
        boolean ativa = body.get("ativa") == null || (Boolean) body.get("ativa");
        return ResponseEntity.ok(mesadaService.salvar(securityUtils.currentUser(),
                estudanteId, valor, freq, diaSemana, diaMes, ativa));
    }

    @DeleteMapping("/estudante/{estudanteId}")
    @PreAuthorize("hasAnyRole('RESPONSAVEL','ADMIN')")
    public ResponseEntity<Void> remover(@PathVariable Long estudanteId) {
        mesadaService.remover(securityUtils.currentUser(), estudanteId);
        return ResponseEntity.noContent().build();
    }

    /** Dispara execução manual (dev/admin). */
    @PostMapping("/executar-agora")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> executar() {
        return ResponseEntity.ok(mesadaService.executarManualmente());
    }

    /** Vincula um cartão (Mercado Pago) para cobrar a mesada do responsável a cada execução. */
    @PostMapping("/estudante/{estudanteId}/cartao")
    @PreAuthorize("hasAnyRole('RESPONSAVEL','ADMIN')")
    public ResponseEntity<Mesada> vincularCartao(@PathVariable Long estudanteId,
                                                 @RequestBody Map<String, Object> body) {
        String cardToken = (String) body.get("cardToken");
        return ResponseEntity.ok(mesadaService.vincularCartao(
                securityUtils.currentUser(), estudanteId, cardToken));
    }

    @DeleteMapping("/estudante/{estudanteId}/cartao")
    @PreAuthorize("hasAnyRole('RESPONSAVEL','ADMIN')")
    public ResponseEntity<Mesada> desvincularCartao(@PathVariable Long estudanteId) {
        return ResponseEntity.ok(mesadaService.desvincularCartao(securityUtils.currentUser(), estudanteId));
    }
}
