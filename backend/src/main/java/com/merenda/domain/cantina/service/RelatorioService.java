package com.merenda.domain.cantina.service;

import com.merenda.config.exception.NotFoundException;
import com.merenda.domain.cantina.dto.RelatorioDto;
import com.merenda.domain.cantina.model.Cantina;
import com.merenda.domain.cantina.repository.CantinaRepository;
import com.merenda.domain.carteira.model.TipoTransacao;
import com.merenda.domain.carteira.model.Transacao;
import com.merenda.domain.carteira.repository.TransacaoRepository;

import com.merenda.domain.cantina.dto.RelatorioDto;
import com.merenda.config.exception.NotFoundException;
import com.merenda.domain.cantina.model.Cantina;
import com.merenda.domain.carteira.model.TipoTransacao;
import com.merenda.domain.carteira.model.Transacao;
import com.merenda.domain.cantina.repository.CantinaRepository;
import com.merenda.domain.carteira.repository.TransacaoRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class RelatorioService {

    private final TransacaoRepository transacaoRepository;
    private final CantinaRepository cantinaRepository;

    public RelatorioService(TransacaoRepository transacaoRepository, CantinaRepository cantinaRepository) {
        this.transacaoRepository = transacaoRepository;
        this.cantinaRepository = cantinaRepository;
    }

    public RelatorioDto.Resumo gerarResumo(Long cantinaId, int dias) {
        Cantina cantina = cantinaRepository.findById(cantinaId)
                .orElseThrow(() -> new NotFoundException("Cantina não encontrada"));

        LocalDateTime inicio = LocalDate.now().minusDays(dias - 1L).atStartOfDay();

        BigDecimal totalReceita = transacaoRepository.somaCantinaPorTipoDesde(cantinaId, TipoTransacao.COMPRA, inicio);
        if (totalReceita == null) totalReceita = BigDecimal.ZERO;
        long totalTransacoes = transacaoRepository.contarCantinaPorTipoDesde(cantinaId, TipoTransacao.COMPRA, inicio);
        BigDecimal ticketMedio = totalTransacoes > 0
                ? totalReceita.divide(BigDecimal.valueOf(totalTransacoes), 2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;
        long alunosAtivos = transacaoRepository.alunosAtivosDesde(cantinaId, inicio);

        List<RelatorioDto.TopProduto> topProdutos = transacaoRepository
                .topProdutosPorQuantidade(cantinaId, inicio).stream()
                .limit(10)
                .map(r -> new RelatorioDto.TopProduto(
                        (String) r[0],
                        ((Number) r[1]).longValue(),
                        toBigDecimal(r[2])))
                .toList();

        List<RelatorioDto.VendasCategoria> porCategoria = transacaoRepository
                .vendasPorCategoria(cantinaId, inicio).stream()
                .map(r -> new RelatorioDto.VendasCategoria(
                        (String) r[0],
                        toBigDecimal(r[1]),
                        ((Number) r[2]).longValue()))
                .toList();

        List<RelatorioDto.VendasDia> porDia = transacaoRepository
                .vendasPorDia(cantinaId, inicio).stream()
                .map(r -> new RelatorioDto.VendasDia(
                        String.valueOf(r[0]),
                        toBigDecimal(r[1]),
                        ((Number) r[2]).longValue()))
                .toList();

        RelatorioDto.Kpis kpis = new RelatorioDto.Kpis(
                totalReceita, totalTransacoes, ticketMedio, alunosAtivos, dias);

        return new RelatorioDto.Resumo(
                cantina.getId(), cantina.getNome(), dias, kpis, topProdutos, porCategoria, porDia);
    }

    public String exportarCsv(Long cantinaId, int dias) {
        LocalDateTime inicio = LocalDate.now().minusDays(dias - 1L).atStartOfDay();
        LocalDateTime fim = LocalDate.now().plusDays(1L).atStartOfDay();
        List<Transacao> txs = transacaoRepository.listarParaExport(cantinaId, inicio, fim);

        StringBuilder sb = new StringBuilder();
        sb.append("data;tipo;valor;saldo_apos;estudante;produto;quantidade;preco_unitario;subtotal\n");
        for (Transacao t : txs) {
            String estudante = t.getCarteira() != null && t.getCarteira().getEstudante() != null
                    ? sanitize(t.getCarteira().getEstudante().getNome()) : "";
            String dataIso = t.getCriadaEm().toString();
            if (t.getItens() == null || t.getItens().isEmpty()) {
                sb.append(String.join(";",
                        dataIso,
                        t.getTipo().name(),
                        money(t.getValor()),
                        money(t.getSaldoApos()),
                        estudante, "", "", "", "")).append('\n');
            } else {
                for (var i : t.getItens()) {
                    sb.append(String.join(";",
                            dataIso,
                            t.getTipo().name(),
                            money(t.getValor()),
                            money(t.getSaldoApos()),
                            estudante,
                            sanitize(i.getNomeProduto()),
                            String.valueOf(i.getQuantidade()),
                            money(i.getPrecoUnitario()),
                            money(i.getSubtotal()))).append('\n');
                }
            }
        }
        return sb.toString();
    }

    private static BigDecimal toBigDecimal(Object v) {
        if (v == null) return BigDecimal.ZERO;
        if (v instanceof BigDecimal b) return b;
        if (v instanceof Number n) return BigDecimal.valueOf(n.doubleValue());
        return new BigDecimal(v.toString());
    }

    private static String money(BigDecimal v) {
        return v == null ? "0.00" : v.toPlainString();
    }

    private static String sanitize(String s) {
        if (s == null) return "";
        return s.replace(';', ',').replace('\n', ' ').replace('\r', ' ');
    }
}
