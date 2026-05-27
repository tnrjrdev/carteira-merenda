package com.merenda.domain.carteira.repository;

import com.merenda.domain.carteira.model.Mesada;

import com.merenda.domain.carteira.model.Mesada;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MesadaRepository extends JpaRepository<Mesada, Long> {
    Optional<Mesada> findByEstudanteId(Long estudanteId);
    List<Mesada> findByResponsavelId(Long responsavelId);
    List<Mesada> findByAtivaTrue();
}
