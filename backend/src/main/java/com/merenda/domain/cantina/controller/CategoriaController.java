package com.merenda.domain.cantina.controller;

import com.merenda.domain.cantina.model.Categoria;
import com.merenda.domain.cantina.repository.CategoriaRepository;

import com.merenda.domain.cantina.model.Categoria;
import com.merenda.domain.cantina.repository.CategoriaRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/categorias")
public class CategoriaController {

    private final CategoriaRepository categoriaRepository;

    public CategoriaController(CategoriaRepository categoriaRepository) {
        this.categoriaRepository = categoriaRepository;
    }

    @GetMapping
    public ResponseEntity<List<Categoria>> listar() {
        return ResponseEntity.ok(categoriaRepository.findAll());
    }
}
