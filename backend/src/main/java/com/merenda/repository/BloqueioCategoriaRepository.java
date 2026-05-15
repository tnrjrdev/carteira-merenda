package com.merenda.repository;

import com.merenda.model.BloqueioCategoria;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BloqueioCategoriaRepository extends JpaRepository<BloqueioCategoria, Long> {
    List<BloqueioCategoria> findByCarteiraId(Long carteiraId);
    boolean existsByCarteiraIdAndCategoriaId(Long carteiraId, Long categoriaId);
    void deleteByCarteiraIdAndCategoriaId(Long carteiraId, Long categoriaId);
}
