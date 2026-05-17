package com.merenda.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.Map;

/**
 * Endpoint público de saúde — usado pelo health check do Render.
 * Não acessa banco, não toca em filtros pesados: garante resposta imediata
 * desde que o Tomcat esteja ouvindo.
 */
@RestController
@RequestMapping("/api/health")
public class HealthController {

    @GetMapping
    public ResponseEntity<Map<String, Object>> health() {
        return ResponseEntity.ok(Map.of(
                "status", "UP",
                "service", "merenda-backend",
                "time", LocalDateTime.now().toString()));
    }
}
