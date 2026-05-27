package com.merenda.domain.cantina.repository;

import com.merenda.domain.cantina.model.Categoria;

import com.merenda.domain.cantina.model.Categoria;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CategoriaRepository extends JpaRepository<Categoria, Long> {
    Optional<Categoria> findByNomeIgnoreCase(String nome);
}
