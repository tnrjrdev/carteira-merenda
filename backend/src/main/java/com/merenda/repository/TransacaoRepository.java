package com.merenda.repository;

import com.merenda.model.Transacao;
import com.merenda.model.TipoTransacao;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface TransacaoRepository extends JpaRepository<Transacao, Long> {

    Page<Transacao> findByCarteiraIdOrderByCriadaEmDesc(Long carteiraId, Pageable pageable);

    List<Transacao> findTop20ByCarteiraIdOrderByCriadaEmDesc(Long carteiraId);

    List<Transacao> findTop20ByCantinaIdOrderByCriadaEmDesc(Long cantinaId);

    @Query("SELECT COALESCE(SUM(t.valor), 0) FROM Transacao t WHERE t.carteira.id = :carteiraId " +
           "AND t.tipo = :tipo AND t.criadaEm >= :inicio")
    BigDecimal somaPorTipoDesde(@Param("carteiraId") Long carteiraId,
                                @Param("tipo") TipoTransacao tipo,
                                @Param("inicio") LocalDateTime inicio);

    @Query("SELECT COALESCE(SUM(t.valor), 0) FROM Transacao t WHERE t.cantina.id = :cantinaId " +
           "AND t.tipo = :tipo AND t.criadaEm >= :inicio")
    BigDecimal somaCantinaPorTipoDesde(@Param("cantinaId") Long cantinaId,
                                       @Param("tipo") TipoTransacao tipo,
                                       @Param("inicio") LocalDateTime inicio);
}
