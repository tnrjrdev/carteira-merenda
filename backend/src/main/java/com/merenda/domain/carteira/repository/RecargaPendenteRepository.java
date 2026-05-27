package com.merenda.domain.carteira.repository;

import com.merenda.domain.carteira.model.RecargaPendente;

import com.merenda.domain.carteira.model.RecargaPendente;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface RecargaPendenteRepository extends JpaRepository<RecargaPendente, Long> {
    Optional<RecargaPendente> findByExternalId(String externalId);
}
