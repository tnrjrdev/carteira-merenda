package com.merenda.domain.cantina.dto;


import java.math.BigDecimal;
import java.util.List;

public class RelatorioDto {

    public record Kpis(
            BigDecimal totalReceita,
            long totalTransacoes,
            BigDecimal ticketMedio,
            long alunosAtivos,
            int dias) {}

    public record TopProduto(
            String nomeProduto,
            long quantidade,
            BigDecimal receita) {}

    public record VendasCategoria(
            String categoria,
            BigDecimal receita,
            long quantidade) {}

    public record VendasDia(
            String data,
            BigDecimal receita,
            long transacoes) {}

    public record Resumo(
            Long cantinaId,
            String cantinaNome,
            int dias,
            Kpis kpis,
            List<TopProduto> topProdutos,
            List<VendasCategoria> porCategoria,
            List<VendasDia> porDia) {}
}
