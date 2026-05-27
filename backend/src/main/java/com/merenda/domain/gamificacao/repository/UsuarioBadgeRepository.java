package com.merenda.domain.gamificacao.repository;

import com.merenda.domain.gamificacao.model.UsuarioBadge;

import com.merenda.domain.gamificacao.model.UsuarioBadge;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface UsuarioBadgeRepository extends JpaRepository<UsuarioBadge, Long> {
    List<UsuarioBadge> findByUsuarioIdOrderByGanhoEmDesc(Long usuarioId);
    boolean existsByUsuarioIdAndBadgeId(Long usuarioId, Long badgeId);
}
