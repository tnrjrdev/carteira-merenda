package com.merenda.domain.usuario.controller;

import com.merenda.config.security.SecurityUtils;
import com.merenda.domain.usuario.model.PushToken;
import com.merenda.domain.usuario.service.PushService;

import com.merenda.domain.usuario.model.PushToken;
import com.merenda.domain.usuario.service.PushService;
import com.merenda.config.security.SecurityUtils;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/push")
public class PushController {

    private final PushService pushService;
    private final SecurityUtils securityUtils;

    public PushController(PushService pushService, SecurityUtils securityUtils) {
        this.pushService = pushService;
        this.securityUtils = securityUtils;
    }

    @PostMapping("/registrar")
    public ResponseEntity<Map<String, Object>> registrar(@RequestBody Map<String, String> body) {
        PushToken t = pushService.registrarToken(
                securityUtils.currentUser(),
                body.get("token"),
                body.get("plataforma"),
                body.get("userAgent"));
        return ResponseEntity.ok(Map.of("id", t.getId(), "registradoEm", t.getRegistradoEm()));
    }
}
