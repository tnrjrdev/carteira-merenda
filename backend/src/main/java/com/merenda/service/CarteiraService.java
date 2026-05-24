package com.merenda.service;

import com.merenda.dto.CarteiraDto;
import com.merenda.exception.BusinessException;
import com.merenda.exception.NotFoundException;
import com.merenda.model.*;
import com.merenda.repository.CarteiraRepository;
import com.merenda.repository.TransacaoRepository;
import com.merenda.repository.UsuarioRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.TemporalAdjusters;
import java.util.List;

@Service
public class CarteiraService {

    private final CarteiraRepository carteiraRepository;
    private final UsuarioRepository usuarioRepository;
    private final TransacaoRepository transacaoRepository;

    public CarteiraService(CarteiraRepository carteiraRepository,
                           UsuarioRepository usuarioRepository,
                           TransacaoRepository transacaoRepository) {
        this.carteiraRepository = carteiraRepository;
        this.usuarioRepository = usuarioRepository;
        this.transacaoRepository = transacaoRepository;
    }

    @Transactional
    public CarteiraDto.SaldoResponse recarregar(Usuario solicitante, CarteiraDto.RecargaRequest req) {
        Usuario estudante = usuarioRepository.findById(req.estudanteId())
                .orElseThrow(() -> new NotFoundException("Estudante não encontrado"));
        if (estudante.getRole() != Role.ESTUDANTE) {
            throw new BusinessException("Apenas carteiras de estudantes podem ser recarregadas");
        }
        if (solicitante.getRole() == Role.RESPONSAVEL) {
            if (estudante.getResponsavel() == null || !estudante.getResponsavel().getId().equals(solicitante.getId())) {
                throw new BusinessException("Estudante não pertence a este responsável");
            }
        } else if (solicitante.getRole() != Role.ADMIN) {
            throw new BusinessException("Sem permissão para recarregar");
        }

        Carteira carteira = carteiraRepository.findByEstudanteId(estudante.getId())
                .orElseGet(() -> carteiraRepository.save(Carteira.builder()
                        .estudante(estudante)
                        .saldo(BigDecimal.ZERO)
                        .build()));

        carteira.setSaldo(carteira.getSaldo().add(req.valor()));
        carteiraRepository.save(carteira);

        Transacao tx = Transacao.builder()
                .carteira(carteira)
                .tipo(TipoTransacao.RECARGA)
                .valor(req.valor())
                .saldoApos(carteira.getSaldo())
                .descricao("Recarga " + (req.metodo() == null ? "manual" : req.metodo())
                        + (req.descricao() == null ? "" : " - " + req.descricao()))
                .build();
        transacaoRepository.save(tx);

        return buildSaldo(estudante, carteira);
    }

    public CarteiraDto.SaldoResponse saldoDoEstudante(Long estudanteId) {
        Usuario estudante = usuarioRepository.findById(estudanteId)
                .orElseThrow(() -> new NotFoundException("Estudante não encontrado"));
        Carteira carteira = carteiraRepository.findByEstudanteId(estudanteId)
                .orElseThrow(() -> new NotFoundException("Carteira não encontrada"));
        return buildSaldo(estudante, carteira);
    }

    @Transactional(readOnly = true)
    public List<CarteiraDto.TransacaoResumo> historicoDoEstudante(Long estudanteId, int page, int size) {
        Carteira carteira = carteiraRepository.findByEstudanteId(estudanteId)
                .orElseThrow(() -> new NotFoundException("Carteira não encontrada"));
        Page<Transacao> pageResult = transacaoRepository.findByCarteiraIdOrderByCriadaEmDesc(
                carteira.getId(), PageRequest.of(page, size));
        return pageResult.getContent().stream().map(this::toResumo).toList();
    }

    public CarteiraDto.TransacaoResumo toResumo(Transacao t) {
        return new CarteiraDto.TransacaoResumo(
                t.getId(),
                t.getTipo().name(),
                t.getValor(),
                t.getSaldoApos(),
                t.getDescricao(),
                t.getCantina() == null ? null : t.getCantina().getNome(),
                t.getCriadaEm(),
                t.getItens().stream()
                        .map(i -> new CarteiraDto.ItemResumo(
                                i.getNomeProduto(),
                                i.getQuantidade(),
                                i.getPrecoUnitario(),
                                i.getSubtotal()))
                        .toList());
    }

    public CarteiraDto.SaldoResponse buildSaldo(Usuario estudante, Carteira c) {
        LocalDateTime inicioDia = LocalDate.now().atStartOfDay();
        LocalDateTime inicioSemana = LocalDate.now()
                .with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))
                .atTime(LocalTime.MIN);
        BigDecimal gastoHoje = transacaoRepository.somaPorTipoDesde(c.getId(), TipoTransacao.COMPRA, inicioDia);
        BigDecimal gastoSemana = transacaoRepository.somaPorTipoDesde(c.getId(), TipoTransacao.COMPRA, inicioSemana);
        return new CarteiraDto.SaldoResponse(
                c.getId(),
                estudante.getId(),
                estudante.getNome(),
                c.getSaldo(),
                c.getLimiteDiario(),
                c.getLimiteSemanal(),
                gastoHoje == null ? BigDecimal.ZERO : gastoHoje,
                gastoSemana == null ? BigDecimal.ZERO : gastoSemana);
    }
}
