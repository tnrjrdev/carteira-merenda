package com.merenda.domain.carteira.controller;

import com.merenda.config.exception.BusinessException;
import com.merenda.config.security.SecurityUtils;
import com.merenda.domain.carteira.dto.CarteiraDto;
import com.merenda.domain.carteira.service.CarteiraService;
import com.merenda.domain.usuario.model.Role;
import com.merenda.domain.usuario.model.Usuario;

import com.merenda.domain.carteira.dto.CarteiraDto;
import com.merenda.config.exception.BusinessException;
import com.merenda.domain.usuario.model.Role;
import com.merenda.domain.usuario.model.Usuario;
import com.merenda.domain.carteira.service.CarteiraService;
import com.merenda.config.security.SecurityUtils;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/carteira")
public class CarteiraController {

    private final CarteiraService carteiraService;
    private final SecurityUtils securityUtils;

    public CarteiraController(CarteiraService carteiraService, SecurityUtils securityUtils) {
        this.carteiraService = carteiraService;
        this.securityUtils = securityUtils;
    }

    @GetMapping("/me")
    public ResponseEntity<CarteiraDto.SaldoResponse> minhaCarteira() {
        Usuario u = securityUtils.currentUser();
        if (u.getRole() != Role.ESTUDANTE) {
            throw new BusinessException("Apenas estudantes têm carteira própria");
        }
        return ResponseEntity.ok(carteiraService.saldoDoEstudante(u.getId()));
    }

    @GetMapping("/me/extrato")
    public ResponseEntity<List<CarteiraDto.TransacaoResumo>> meuExtrato(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Usuario u = securityUtils.currentUser();
        if (u.getRole() != Role.ESTUDANTE) {
            throw new BusinessException("Use /api/carteira/estudante/{id}/extrato para ver outras carteiras");
        }
        return ResponseEntity.ok(carteiraService.historicoDoEstudante(u.getId(), page, size));
    }

    @GetMapping("/estudante/{estudanteId}")
    public ResponseEntity<CarteiraDto.SaldoResponse> saldoEstudante(@PathVariable Long estudanteId) {
        Usuario solicitante = securityUtils.currentUser();
        validarAcesso(solicitante, estudanteId);
        return ResponseEntity.ok(carteiraService.saldoDoEstudante(estudanteId));
    }

    @GetMapping("/estudante/{estudanteId}/extrato")
    public ResponseEntity<List<CarteiraDto.TransacaoResumo>> extratoEstudante(
            @PathVariable Long estudanteId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Usuario solicitante = securityUtils.currentUser();
        validarAcesso(solicitante, estudanteId);
        return ResponseEntity.ok(carteiraService.historicoDoEstudante(estudanteId, page, size));
    }

    @PostMapping("/recarga")
    public ResponseEntity<CarteiraDto.SaldoResponse> recarregar(@RequestBody @Valid CarteiraDto.RecargaRequest req) {
        return ResponseEntity.ok(carteiraService.recarregar(securityUtils.currentUser(), req));
    }

    private void validarAcesso(Usuario solicitante, Long estudanteId) {
        if (solicitante.getRole() == Role.ADMIN) return;
        if (solicitante.getRole() == Role.ESTUDANTE) {
            if (!solicitante.getId().equals(estudanteId)) {
                throw new BusinessException("Sem permissão");
            }
            return;
        }
        if (solicitante.getRole() == Role.RESPONSAVEL) {
            // já validado pelo service
            return;
        }
        throw new BusinessException("Sem permissão");
    }
}
