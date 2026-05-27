package com.merenda.domain.usuario.repository;

import com.merenda.domain.usuario.model.PushToken;

import com.merenda.domain.usuario.model.PushToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PushTokenRepository extends JpaRepository<PushToken, Long> {
    Optional<PushToken> findByToken(String token);
    List<PushToken> findByUsuarioId(Long usuarioId);
}
