package com.merenda.domain.carteira.service;

import com.merenda.config.exception.BusinessException;
import com.merenda.config.exception.NotFoundException;
import com.merenda.domain.carteira.dto.CarteiraDto;
import com.merenda.domain.carteira.model.Carteira;
import com.merenda.domain.carteira.model.TipoTransacao;
import com.merenda.domain.carteira.model.Transacao;
import com.merenda.domain.carteira.repository.CarteiraRepository;
import com.merenda.domain.carteira.repository.TransacaoRepository;
import com.merenda.domain.usuario.model.Role;
import com.merenda.domain.usuario.model.Usuario;
import com.merenda.domain.usuario.repository.UsuarioRepository;

import com.merenda.domain.carteira.dto.CarteiraDto;
import com.merenda.config.exception.BusinessException;
import com.merenda.config.exception.NotFoundException;
import com.merenda.domain.carteira.repository.CarteiraRepository;
import com.merenda.domain.carteira.repository.TransacaoRepository;
import com.merenda.domain.usuario.repository.UsuarioRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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

    private static final Logger log = LoggerFactory.getLogger(CarteiraService.class);

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
        log.info("[DEBUG-EXTRATO] inicio estudanteId={} page={} size={}", estudanteId, page, size);
        Carteira carteira;
        try {
            carteira = carteiraRepository.findByEstudanteId(estudanteId)
                    .orElseThrow(() -> new NotFoundException("Carteira não encontrada"));
            log.info("[DEBUG-EXTRATO] carteira carregada id={}", carteira.getId());
        } catch (RuntimeException e) {
            log.error("[DEBUG-EXTRATO] FALHA ao carregar carteira do estudanteId={}", estudanteId, e);
            throw e;
        }

        Page<Transacao> pageResult;
        try {
            pageResult = transacaoRepository.findByCarteiraIdOrderByCriadaEmDesc(
                    carteira.getId(), PageRequest.of(page, size));
            log.info("[DEBUG-EXTRATO] page de transacoes carregada total={}", pageResult.getTotalElements());
        } catch (RuntimeException e) {
            log.error("[DEBUG-EXTRATO] FALHA ao carregar page de transacoes carteiraId={}", carteira.getId(), e);
            throw e;
        }

        try {
            List<CarteiraDto.TransacaoResumo> result = pageResult.getContent().stream().map(this::toResumo).toList();
            log.info("[DEBUG-EXTRATO] mapeamento OK count={}", result.size());
            return result;
        } catch (RuntimeException e) {
            log.error("[DEBUG-EXTRATO] FALHA ao mapear transacoes para DTO", e);
            throw e;
        }
    }

    public CarteiraDto.TransacaoResumo toResumo(Transacao t) {
        Long txId = null;
        try {
            txId = t.getId();
            log.info("[DEBUG-RESUMO] tx={} step=start", txId);
            Long id = t.getId();
            String tipo = t.getTipo().name();
            log.info("[DEBUG-RESUMO] tx={} step=tipo ok", txId);
            BigDecimal valor = t.getValor();
            BigDecimal saldoApos = t.getSaldoApos();
            String descricao = t.getDescricao();
            log.info("[DEBUG-RESUMO] tx={} step=campos-basicos ok", txId);

            String nomeCantina;
            try {
                nomeCantina = t.getCantina() == null ? null : t.getCantina().getNome();
                log.info("[DEBUG-RESUMO] tx={} step=cantina ok nome={}", txId, nomeCantina);
            } catch (RuntimeException e) {
                log.error("[DEBUG-RESUMO] tx={} step=cantina FALHA", txId, e);
                throw e;
            }

            LocalDateTime criadaEm = t.getCriadaEm();
            log.info("[DEBUG-RESUMO] tx={} step=criadaEm ok", txId);

            List<CarteiraDto.ItemResumo> itensDto;
            try {
                itensDto = t.getItens().stream()
                        .map(i -> new CarteiraDto.ItemResumo(
                                i.getNomeProduto(),
                                i.getQuantidade(),
                                i.getPrecoUnitario(),
                                i.getSubtotal()))
                        .toList();
                log.info("[DEBUG-RESUMO] tx={} step=itens ok count={}", txId, itensDto.size());
            } catch (RuntimeException e) {
                log.error("[DEBUG-RESUMO] tx={} step=itens FALHA", txId, e);
                throw e;
            }

            return new CarteiraDto.TransacaoResumo(id, tipo, valor, saldoApos, descricao, nomeCantina, criadaEm, itensDto);
        } catch (RuntimeException e) {
            log.error("[DEBUG-RESUMO] tx={} step=geral FALHA", txId, e);
            throw e;
        }
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
