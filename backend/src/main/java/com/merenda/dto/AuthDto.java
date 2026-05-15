package com.merenda.dto;

import com.merenda.model.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public class AuthDto {

    public record LoginRequest(
            @NotBlank(message = "Email é obrigatório")
            @Email(message = "Email inválido")
            String email,

            @NotBlank(message = "Senha é obrigatória")
            String senha) {}

    public record RegisterRequest(
            @NotBlank(message = "Nome é obrigatório")
            @Size(min = 3, max = 120, message = "Nome deve ter entre 3 e 120 caracteres")
            String nome,

            @NotBlank(message = "Email é obrigatório")
            @Email(message = "Email inválido")
            @Size(max = 150, message = "Email muito longo")
            String email,

            @NotBlank(message = "Senha é obrigatória")
            @Size(min = 6, max = 60, message = "Senha deve ter entre 6 e 60 caracteres")
            String senha,

            @Pattern(regexp = "^$|^\\d{11}$|^\\d{3}\\.\\d{3}\\.\\d{3}-\\d{2}$",
                    message = "CPF deve ter 11 dígitos ou estar no formato 000.000.000-00")
            String cpf,

            @Pattern(regexp = "^$|^\\d{10,11}$|^\\(\\d{2}\\)\\s?\\d{4,5}-?\\d{4}$",
                    message = "Telefone inválido")
            String telefone,

            Role role,

            Long cantinaId) {}

    public record AuthResponse(
            String token,
            Long userId,
            String nome,
            String email,
            Role role,
            Long cantinaId) {}
}
