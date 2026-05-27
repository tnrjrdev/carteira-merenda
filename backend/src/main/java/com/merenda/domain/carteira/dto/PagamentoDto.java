package com.merenda.domain.carteira.dto;

import com.merenda.domain.cantina.model.Produto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public class PagamentoDto {

    public record TokenResponse(
            String token,
            LocalDateTime expiraEm,
            Long estudanteId,
            String estudanteNome) {}

    public record ItemRequest(
            @NotNull(message = "Produto é obrigatório")
            Long produtoId,

            @NotNull(message = "Quantidade é obrigatória")
            @Positive(message = "Quantidade deve ser maior que zero")
            @Max(value = 99, message = "Quantidade máxima por item é 99")
            Integer quantidade) {}

    public record CobrancaRequest(
            @NotNull(message = "Token é obrigatório")
            @Size(min = 8, max = 64, message = "Token inválido")
            String token,

            @NotEmpty(message = "Adicione ao menos um item ao carrinho")
            @Size(max = 50, message = "Máximo de 50 itens por compra")
            @Valid
            List<ItemRequest> itens) {}

    public record CobrancaResponse(
            Long transacaoId,
            BigDecimal totalCobrado,
            BigDecimal saldoApos,
            String estudanteNome,
            LocalDateTime criadaEm) {}
}
