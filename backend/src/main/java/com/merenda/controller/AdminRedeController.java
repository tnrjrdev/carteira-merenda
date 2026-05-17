package com.merenda.controller;

import com.merenda.service.AdminRedeService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/rede")
@PreAuthorize("hasRole('ADMIN')")
public class AdminRedeController {

    private final AdminRedeService adminRedeService;

    public AdminRedeController(AdminRedeService adminRedeService) {
        this.adminRedeService = adminRedeService;
    }

    @GetMapping("/resumo")
    public ResponseEntity<Map<String, Object>> resumo(@RequestParam(defaultValue = "30") int dias) {
        int periodo = Math.max(1, Math.min(dias, 365));
        return ResponseEntity.ok(adminRedeService.resumoRede(periodo));
    }
}
