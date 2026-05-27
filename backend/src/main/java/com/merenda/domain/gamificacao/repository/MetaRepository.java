package com.merenda.domain.gamificacao.repository;

import com.merenda.domain.gamificacao.model.Meta;

import com.merenda.domain.gamificacao.model.Meta;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MetaRepository extends JpaRepository<Meta, Long> {
    List<Meta> findByEstudanteIdOrderByConcluidaAscCriadaEmDesc(Long estudanteId);
}
