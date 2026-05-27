package com.merenda.domain.cantina.repository;

import com.merenda.domain.cantina.model.Cantina;

import com.merenda.domain.cantina.model.Cantina;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CantinaRepository extends JpaRepository<Cantina, Long> {
    List<Cantina> findByAtivaTrue();
}
