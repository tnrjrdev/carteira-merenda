package com.merenda.domain.carteira.controller;

import com.merenda.config.security.SecurityUtils;
import com.merenda.domain.carteira.service.RecargaCartaoService;
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
        String paymentMethodId = (String) body.get("paymentMethodId");
        String issuerId = body.get("issuerId") == null ? null : body.get("issuerId").toString();
        Integer parcelas = body.get("parcelas") == null ? 1 : ((Number) body.get("parcelas")).intValue();
        return ResponseEntity.ok(recargaCartaoService.cobrar(securityUtils.currentUser(),
                estudanteId, valor, cardToken, paymentMethodId, issuerId, parcelas));
    }
}
