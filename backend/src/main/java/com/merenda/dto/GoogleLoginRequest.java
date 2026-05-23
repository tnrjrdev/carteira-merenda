package com.merenda.dto;

import com.merenda.model.Role;
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
