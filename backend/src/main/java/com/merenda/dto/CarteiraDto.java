package com.merenda.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public class CarteiraDto {

    public record SaldoResponse(
            Long carteiraId,
            Long estudanteId,
            String nomeEstudante,
            BigDecimal saldo,
            BigDecimal limiteDiario,
            BigDecimal limiteSemanal,
            BigDecimal gastoHoje,
            BigDecimal gastoSemana) {}

    public record RecargaRequest(
            @NotNull(message = "Estudante é obrigatório")
            Long estudanteId,

            @NotNull(message = "Valor é obrigatório")
            @DecimalMin(value = "1.00", message = "Valor mínimo de recarga é R$ 1,00")
            @DecimalMax(value = "10000.00", message = "Valor máximo de recarga é R$ 10.000,00")
            @Digits(integer = 6, fraction = 2, message = "Valor inválido")
            BigDecimal valor,

            @Size(max = 30, message = "Método inválido")
            String metodo,

            @Size(max = 200, message = "Descrição muito longa")
            String descricao) {}

    public record TransacaoResumo(
            Long id,
            String tipo,
            BigDecimal valor,
            BigDecimal saldoApos,
            String descricao,
            String cantinaNome,
            LocalDateTime criadaEm,
            List<ItemResumo> itens) {}

    public record ItemResumo(
            String nomeProduto,
            Integer quantidade,
            BigDecimal precoUnitario,
            BigDecimal subtotal) {}
}
