package com.merenda.domain.usuario.dto;

import com.merenda.domain.usuario.model.Role;

import com.merenda.domain.usuario.model.Role;
import jakarta.validation.constraints.NotBlank;

public record GoogleLoginRequest(
    @NotBlank(message = "O ID Token não pode estar vazio")
    String idToken,

    Role role,

    Long cantinaId,

    Boolean aceitaLgpd,

    String politicaVersao
) {
}
