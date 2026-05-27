package com.merenda.domain.cantina.repository;

import com.merenda.domain.cantina.model.Produto;

import com.merenda.domain.cantina.model.Produto;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProdutoRepository extends JpaRepository<Produto, Long> {
    List<Produto> findByCantinaIdAndDisponivelTrue(Long cantinaId);
    List<Produto> findByCantinaId(Long cantinaId);
}
