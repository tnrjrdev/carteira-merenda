package com.merenda.repository;

import com.merenda.model.UsuarioBadge;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface UsuarioBadgeRepository extends JpaRepository<UsuarioBadge, Long> {
    List<UsuarioBadge> findByUsuarioIdOrderByGanhoEmDesc(Long usuarioId);
    boolean existsByUsuarioIdAndBadgeId(Long usuarioId, Long badgeId);
}
