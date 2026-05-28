package com.merenda.controller;

import com.merenda.service.LgpdService;
import com.merenda.config.security.SecurityUtils;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/lgpd")
public class LgpdController {

    private final LgpdService lgpdService;
    private final SecurityUtils securityUtils;

    public LgpdController(LgpdService lgpdService, SecurityUtils securityUtils) {
        this.lgpdService = lgpdService;
        this.securityUtils = securityUtils;
    }

    @GetMapping("/politica")
    public ResponseEntity<Map<String, Object>> politica() {
        return ResponseEntity.ok(Map.of(
                "versao", lgpdService.versaoAtual(),
                "url", "/politica-privacidade"
        ));
    }

    @PostMapping("/aceitar")
    public ResponseEntity<Map<String, Object>> aceitar(@RequestBody(required = false) Map<String, Object> body) {
        String versao = body == null ? null : (String) body.get("versao");
        lgpdService.registrarConsentimento(securityUtils.currentUser(), versao);
        return ResponseEntity.ok(Map.of(
                "ok", true,
                "versaoAceita", versao == null ? lgpdService.versaoAtual() : versao
        ));
    }

    @GetMapping(value = "/exportar", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Object> exportar() {
        var u = securityUtils.currentUser();
        var dump = lgpdService.exportarDados(u);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"meus-dados-merenda.json\"")
                .body(dump);
    }

    @DeleteMapping("/conta")
    public ResponseEntity<Map<String, Object>> excluir(@RequestBody(required = false) Map<String, Object> body) {
        var u = securityUtils.currentUser();
        String senha = body == null ? null : (String) body.get("senha");
        return ResponseEntity.ok(lgpdService.excluirConta(u, senha));
    }
}
