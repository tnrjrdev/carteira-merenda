package com.merenda.repository;

import com.merenda.model.Notificacao;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificacaoRepository extends JpaRepository<Notificacao, Long> {
    List<Notificacao> findTop50ByUsuarioIdOrderByCriadaEmDesc(Long usuarioId);
    long countByUsuarioIdAndLidaFalse(Long usuarioId);
}
