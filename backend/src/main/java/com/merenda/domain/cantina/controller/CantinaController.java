package com.merenda.domain.cantina.controller;

import com.merenda.config.exception.NotFoundException;
import com.merenda.domain.cantina.model.Cantina;
import com.merenda.domain.cantina.model.Plano;
import com.merenda.domain.cantina.repository.CantinaRepository;
import com.merenda.domain.cantina.service.PlanoService;

import com.merenda.config.exception.NotFoundException;
import com.merenda.domain.cantina.model.Cantina;
import com.merenda.domain.cantina.model.Plano;
import com.merenda.domain.cantina.repository.CantinaRepository;
import com.merenda.domain.cantina.service.PlanoService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/cantinas")
public class CantinaController {

    private final CantinaRepository cantinaRepository;
    private final PlanoService planoService;

    public CantinaController(CantinaRepository cantinaRepository, PlanoService planoService) {
        this.cantinaRepository = cantinaRepository;
        this.planoService = planoService;
    }

    @GetMapping("/publicas")
    public ResponseEntity<List<Cantina>> publicas() {
        return ResponseEntity.ok(cantinaRepository.findByAtivaTrue());
    }

    @GetMapping
    public ResponseEntity<List<Cantina>> todas() {
        return ResponseEntity.ok(cantinaRepository.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Cantina> byId(@PathVariable Long id) {
        return ResponseEntity.ok(cantinaRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Cantina não encontrada")));
    }

    @GetMapping("/{id}/uso")
    public ResponseEntity<Map<String, Object>> uso(@PathVariable Long id) {
        return ResponseEntity.ok(planoService.uso(id));
    }

    @PutMapping("/{id}/plano")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> atualizarPlano(@PathVariable Long id,
                                                              @RequestBody Map<String, Object> body) {
        Plano plano = Plano.valueOf(((String) body.get("plano")).toUpperCase());
        Integer maxAlunos = body.get("maxAlunos") == null ? null
                : ((Number) body.get("maxAlunos")).intValue();
        return ResponseEntity.ok(planoService.atualizarPlano(id, plano, maxAlunos));
    }
}
