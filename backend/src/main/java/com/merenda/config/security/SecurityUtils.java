package com.merenda.config.security;

import com.merenda.config.exception.NotFoundException;
import com.merenda.domain.usuario.model.Usuario;
import com.merenda.domain.usuario.repository.UsuarioRepository;

import com.merenda.config.exception.NotFoundException;
import com.merenda.domain.usuario.model.Usuario;
import com.merenda.domain.usuario.repository.UsuarioRepository;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

@Component
public class SecurityUtils {

    private final UsuarioRepository usuarioRepository;

    public SecurityUtils(UsuarioRepository usuarioRepository) {
        this.usuarioRepository = usuarioRepository;
    }

    public Usuario currentUser() {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        if (!(principal instanceof UsuarioPrincipal p)) {
            throw new NotFoundException("Usuário não autenticado");
        }
        return usuarioRepository.findById(p.getId())
                .orElseThrow(() -> new NotFoundException("Usuário não encontrado"));
    }
}
