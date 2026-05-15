package com.merenda.controller;

import com.merenda.dto.CarteiraDto;
import com.merenda.exception.BusinessException;
import com.merenda.model.Role;
import com.merenda.model.TipoTransacao;
import com.merenda.model.Usuario;
import com.merenda.repository.TransacaoRepository;
import com.merenda.service.CarteiraService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/cantina/painel")
@PreAuthorize("hasRole('CANTINA')")
public class CantinaPainelController {

    private final SecurityUtils securityUtils;
    private final TransacaoRepository transacaoRepository;
    private final CarteiraService carteiraService;

    public CantinaPainelController(SecurityUtils securityUtils,
                                   TransacaoRepository transacaoRepository,
                                   CarteiraService carteiraService) {
        this.securityUtils = securityUtils;
        this.transacaoRepository = transacaoRepository;
        this.carteiraService = carteiraService;
    }

    @GetMapping("/resumo")
    public ResponseEntity<Map<String, Object>> resumo() {
        Usuario u = securityUtils.currentUser();
        if (u.getRole() != Role.CANTINA || u.getCantina() == null) {
            throw new BusinessException("Operador sem cantina vinculada");
        }
        Long cantinaId = u.getCantina().getId();
        LocalDateTime inicioDia = LocalDate.now().atStartOfDay();
        BigDecimal totalHoje = transacaoRepository.somaCantinaPorTipoDesde(cantinaId, TipoTransacao.COMPRA, inicioDia);
        BigDecimal totalMes = transacaoRepository.somaCantinaPorTipoDesde(cantinaId, TipoTransacao.COMPRA,
                LocalDate.now().withDayOfMonth(1).atStartOfDay());

        List<CarteiraDto.TransacaoResumo> ultimas = transacaoRepository
                .findTop20ByCantinaIdOrderByCriadaEmDesc(cantinaId)
                .stream()
                .map(carteiraService::toResumo)
                .toList();

        Map<String, Object> resp = new HashMap<>();
        resp.put("cantinaId", cantinaId);
        resp.put("cantinaNome", u.getCantina().getNome());
        resp.put("totalHoje", totalHoje == null ? BigDecimal.ZERO : totalHoje);
        resp.put("totalMes", totalMes == null ? BigDecimal.ZERO : totalMes);
        resp.put("ultimasVendas", ultimas);
        return ResponseEntity.ok(resp);
    }
}
