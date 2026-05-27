package com.merenda.domain.cantina.repository;

import com.merenda.domain.cantina.model.Fatura;

import com.merenda.domain.cantina.model.Fatura;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FaturaRepository extends JpaRepository<Fatura, Long> {
    Optional<Fatura> findByCantinaIdAndCompetencia(Long cantinaId, String competencia);
    List<Fatura> findByCantinaIdOrderByVencimentoDesc(Long cantinaId);
    List<Fatura> findByStatus(String status);
}
