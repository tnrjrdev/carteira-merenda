package com.merenda.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;

public class DependenteDto {

    public record CreateRequest(
            @NotBlank(message = "Nome do estudante é obrigatório")
            @Size(min = 3, max = 120, message = "Nome deve ter entre 3 e 120 caracteres")
            String nome,

            @NotBlank(message = "Email é obrigatório")
            @Email(message = "Email inválido")
            @Size(max = 150, message = "Email muito longo")
            String email,

            @NotBlank(message = "Senha é obrigatória")
            @Size(min = 6, max = 60, message = "Senha deve ter entre 6 e 60 caracteres")
            String senha,

            LocalDate dataNascimento,

            @Size(max = 500, message = "Lista de alergias muito longa")
            String alergias) {}

    public record Resumo(
            Long id,
            String nome,
            String email,
            LocalDate dataNascimento,
            String alergias,
            BigDecimal saldo,
            BigDecimal limiteDiario,
            BigDecimal limiteSemanal,
            BigDecimal gastoHoje,
            BigDecimal gastoSemana) {}

    public record AtualizarLimites(
            @DecimalMin(value = "0.00", inclusive = true, message = "Limite diário não pode ser negativo")
            @Digits(integer = 12, fraction = 2, message = "Limite diário inválido")
            BigDecimal limiteDiario,

            @DecimalMin(value = "0.00", inclusive = true, message = "Limite semanal não pode ser negativo")
            @Digits(integer = 12, fraction = 2, message = "Limite semanal inválido")
            BigDecimal limiteSemanal) {}

    public record AtualizarPerfil(
            LocalDate dataNascimento,

            @Size(max = 500, message = "Lista de alergias muito longa")
            String alergias) {}
}
