package com.merenda.repository;

import com.merenda.model.RecargaPendente;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface RecargaPendenteRepository extends JpaRepository<RecargaPendente, Long> {
    Optional<RecargaPendente> findByExternalId(String externalId);
}
