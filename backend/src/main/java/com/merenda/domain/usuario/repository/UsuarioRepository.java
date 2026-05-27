package com.merenda.domain.usuario.repository;

import com.merenda.domain.usuario.model.Role;
import com.merenda.domain.usuario.model.Usuario;

import com.merenda.domain.usuario.model.Role;
import com.merenda.domain.usuario.model.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UsuarioRepository extends JpaRepository<Usuario, Long> {
    Optional<Usuario> findByEmail(String email);
    boolean existsByEmail(String email);
    List<Usuario> findByResponsavelId(Long responsavelId);
    List<Usuario> findByRoleAndResponsavelId(Role role, Long responsavelId);
    List<Usuario> findByCantinaId(Long cantinaId);
}
