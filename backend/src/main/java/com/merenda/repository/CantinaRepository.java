package com.merenda.repository;

import com.merenda.model.Cantina;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CantinaRepository extends JpaRepository<Cantina, Long> {
    List<Cantina> findByAtivaTrue();
}
