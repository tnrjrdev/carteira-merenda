package com.merenda.domain.carteira.repository;

import com.merenda.domain.carteira.model.Carteira;

import com.merenda.domain.carteira.model.Carteira;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CarteiraRepository extends JpaRepository<Carteira, Long> {
    Optional<Carteira> findByEstudanteId(Long estudanteId);
}
