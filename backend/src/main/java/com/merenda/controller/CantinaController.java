package com.merenda.controller;

import com.merenda.exception.NotFoundException;
import com.merenda.model.Cantina;
import com.merenda.repository.CantinaRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/cantinas")
public class CantinaController {

    private final CantinaRepository cantinaRepository;

    public CantinaController(CantinaRepository cantinaRepository) {
        this.cantinaRepository = cantinaRepository;
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
}
