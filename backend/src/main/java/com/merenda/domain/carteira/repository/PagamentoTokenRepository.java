package com.merenda.domain.carteira.repository;

import com.merenda.domain.carteira.model.PagamentoToken;

import com.merenda.domain.carteira.model.PagamentoToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PagamentoTokenRepository extends JpaRepository<PagamentoToken, Long> {
    Optional<PagamentoToken> findByToken(String token);
}
