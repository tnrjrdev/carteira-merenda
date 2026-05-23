package com.merenda.controller;

import com.merenda.service.RecargaCartaoService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.Map;

@RestController
@RequestMapping("/api/carteira/recarga-cartao")
public class RecargaCartaoController {

    private final RecargaCartaoService recargaCartaoService;
    private final SecurityUtils securityUtils;

    public RecargaCartaoController(RecargaCartaoService recargaCartaoService, SecurityUtils securityUtils) {
        this.recargaCartaoService = recargaCartaoService;
        this.securityUtils = securityUtils;
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> cobrar(@RequestBody Map<String, Object> body) {
        Long estudanteId = ((Number) body.get("estudanteId")).longValue();
        BigDecimal valor = new BigDecimal(body.get("valor").toString());
        String cardToken = (String) body.get("cardToken");
        Integer parcelas = body.get("parcelas") == null ? 1 : ((Number) body.get("parcelas")).intValue();
        return ResponseEntity.ok(recargaCartaoService.cobrar(securityUtils.currentUser(),
                estudanteId, valor, cardToken, parcelas));
    }
}
