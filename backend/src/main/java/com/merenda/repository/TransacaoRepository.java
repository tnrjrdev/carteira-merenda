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

    @Query("SELECT COUNT(t) FROM Transacao t WHERE t.cantina.id = :cantinaId " +
           "AND t.tipo = :tipo AND t.criadaEm >= :inicio")
    long contarCantinaPorTipoDesde(@Param("cantinaId") Long cantinaId,
                                   @Param("tipo") TipoTransacao tipo,
                                   @Param("inicio") LocalDateTime inicio);

    @Query("SELECT i.nomeProduto, SUM(i.quantidade), SUM(i.subtotal) " +
           "FROM Transacao t JOIN t.itens i " +
           "WHERE t.cantina.id = :cantinaId AND t.tipo = com.merenda.model.TipoTransacao.COMPRA " +
           "AND t.criadaEm >= :inicio " +
           "GROUP BY i.nomeProduto " +
           "ORDER BY SUM(i.quantidade) DESC")
    List<Object[]> topProdutosPorQuantidade(@Param("cantinaId") Long cantinaId,
                                            @Param("inicio") LocalDateTime inicio);

    @Query("SELECT COALESCE(c.nome, 'Sem categoria'), SUM(i.subtotal), SUM(i.quantidade) " +
           "FROM Transacao t JOIN t.itens i " +
           "LEFT JOIN i.produto p LEFT JOIN p.categoria c " +
           "WHERE t.cantina.id = :cantinaId AND t.tipo = com.merenda.model.TipoTransacao.COMPRA " +
           "AND t.criadaEm >= :inicio " +
           "GROUP BY c.nome " +
           "ORDER BY SUM(i.subtotal) DESC")
    List<Object[]> vendasPorCategoria(@Param("cantinaId") Long cantinaId,
                                      @Param("inicio") LocalDateTime inicio);

    @Query("SELECT FUNCTION('DATE', t.criadaEm), COALESCE(SUM(t.valor), 0), COUNT(t) " +
           "FROM Transacao t " +
           "WHERE t.cantina.id = :cantinaId AND t.tipo = com.merenda.model.TipoTransacao.COMPRA " +
           "AND t.criadaEm >= :inicio " +
           "GROUP BY FUNCTION('DATE', t.criadaEm) " +
           "ORDER BY FUNCTION('DATE', t.criadaEm) ASC")
    List<Object[]> vendasPorDia(@Param("cantinaId") Long cantinaId,
                                @Param("inicio") LocalDateTime inicio);

    @Query("SELECT COUNT(DISTINCT t.carteira.estudante.id) FROM Transacao t " +
           "WHERE t.cantina.id = :cantinaId AND t.tipo = com.merenda.model.TipoTransacao.COMPRA " +
           "AND t.criadaEm >= :inicio")
    long alunosAtivosDesde(@Param("cantinaId") Long cantinaId,
                           @Param("inicio") LocalDateTime inicio);

    @Query("SELECT t FROM Transacao t WHERE t.cantina.id = :cantinaId " +
           "AND t.criadaEm >= :inicio AND t.criadaEm < :fim " +
           "ORDER BY t.criadaEm DESC")
    List<Transacao> listarParaExport(@Param("cantinaId") Long cantinaId,
                                     @Param("inicio") LocalDateTime inicio,
                                     @Param("fim") LocalDateTime fim);
}
