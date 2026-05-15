package com.merenda.security;

import com.merenda.model.Role;
import com.merenda.model.Usuario;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;

public class UsuarioPrincipal implements UserDetails {

    private final Long id;
    private final String email;
    private final String senhaHash;
    private final Role role;
    private final Long cantinaId;
    private final Long responsavelId;
    private final String nome;

    public UsuarioPrincipal(Usuario u) {
        this.id = u.getId();
        this.email = u.getEmail();
        this.senhaHash = u.getSenhaHash();
        this.role = u.getRole();
        this.cantinaId = u.getCantina() != null ? u.getCantina().getId() : null;
        this.responsavelId = u.getResponsavel() != null ? u.getResponsavel().getId() : null;
        this.nome = u.getNome();
    }

    public Long getId() { return id; }
    public Role getRole() { return role; }
    public Long getCantinaId() { return cantinaId; }
    public Long getResponsavelId() { return responsavelId; }
    public String getNome() { return nome; }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + role.name()));
    }

    @Override public String getPassword() { return senhaHash; }
    @Override public String getUsername() { return email; }
    @Override public boolean isAccountNonExpired() { return true; }
    @Override public boolean isAccountNonLocked() { return true; }
    @Override public boolean isCredentialsNonExpired() { return true; }
    @Override public boolean isEnabled() { return true; }
}
