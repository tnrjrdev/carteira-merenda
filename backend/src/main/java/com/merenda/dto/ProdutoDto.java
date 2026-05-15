package com.merenda.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public class ProdutoDto {

    public record CreateRequest(
            @NotBlank(message = "Nome do produto é obrigatório")
            @Size(min = 2, max = 120, message = "Nome deve ter entre 2 e 120 caracteres")
            String nome,

            @Size(max = 500, message = "Descrição muito longa")
            String descricao,

            @NotNull(message = "Preço é obrigatório")
            @DecimalMin(value = "0.01", message = "Preço deve ser maior que zero")
            @DecimalMax(value = "10000.00", message = "Preço máximo de R$ 10.000,00")
            @Digits(integer = 6, fraction = 2, message = "Preço inválido")
            BigDecimal preco,

            @PositiveOrZero(message = "Estoque não pode ser negativo")
            @Max(value = 100000, message = "Estoque máximo de 100.000")
            Integer estoque,

            Long categoriaId,

            @Size(max = 500, message = "URL da imagem muito longa")
            String imagemUrl,

            Boolean disponivel) {}

    public record Response(
            Long id,
            String nome,
            String descricao,
            BigDecimal preco,
            Integer estoque,
            String imagemUrl,
            Long categoriaId,
            String categoriaNome,
            boolean categoriaSaudavel,
            Long cantinaId,
            String cantinaNome,
            boolean disponivel) {}
}
