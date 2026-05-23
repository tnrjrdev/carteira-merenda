package com.merenda.service;

import com.merenda.exception.BusinessException;
import com.merenda.exception.NotFoundException;
import com.merenda.model.*;
import com.merenda.repository.CarteiraRepository;
import com.merenda.repository.MesadaRepository;
import com.merenda.repository.TransacaoRepository;
import com.merenda.repository.UsuarioRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Service
public class MesadaService {

    private static final Logger log = LoggerFactory.getLogger(MesadaService.class);

    private final MesadaRepository mesadaRepository;
    private final UsuarioRepository usuarioRepository;
    private final CarteiraRepository carteiraRepository;
    private final TransacaoRepository transacaoRepository;
    private final NotificacaoService notificacaoService;

    public MesadaService(MesadaRepository mesadaRepository,
                         UsuarioRepository usuarioRepository,
                         CarteiraRepository carteiraRepository,
                         TransacaoRepository transacaoRepository,
                         NotificacaoService notificacaoService) {
        this.mesadaRepository = mesadaRepository;
        this.usuarioRepository = usuarioRepository;
        this.carteiraRepository = carteiraRepository;
        this.transacaoRepository = transacaoRepository;
        this.notificacaoService = notificacaoService;
    }

    @Transactional
    public Mesada salvar(Usuario responsavel, Long estudanteId, BigDecimal valor,
                         Mesada.FrequenciaMesada frequencia, DayOfWeek diaSemana, Integer diaMes, boolean ativa) {
        if (responsavel.getRole() != Role.RESPONSAVEL && responsavel.getRole() != Role.ADMIN) {
            throw new BusinessException("Apenas responsáveis configuram mesada");
        }
        if (valor == null || valor.compareTo(new BigDecimal("0.50")) < 0) {
            throw new BusinessException("Valor mínimo da mesada é R$ 0,50");
        }
        Usuario estudante = usuarioRepository.findById(estudanteId)
                .orElseThrow(() -> new NotFoundException("Estudante não encontrado"));
        if (estudante.getRole() != Role.ESTUDANTE) {
            throw new BusinessException("Mesada só para estudantes");
        }
        if (responsavel.getRole() == Role.RESPONSAVEL
                && (estudante.getResponsavel() == null
                        || !estudante.getResponsavel().getId().equals(responsavel.getId()))) {
            throw new BusinessException("Estudante não pertence a este responsável");
        }
        if (frequencia == Mesada.FrequenciaMesada.SEMANAL && diaSemana == null) {
            throw new BusinessException("Mesada semanal precisa de dia da semana");
        }
        if (frequencia == Mesada.FrequenciaMesada.MENSAL && (diaMes == null || diaMes < 1 || diaMes > 28)) {
            throw new BusinessException("Mesada mensal precisa de dia entre 1 e 28");
        }

        Mesada existente = mesadaRepository.findByEstudanteId(estudanteId).orElse(null);
        Mesada m = existente != null ? existente : Mesada.builder()
                .estudante(estudante)
                .responsavel(responsavel)
                .build();
        m.setValor(valor);
        m.setFrequencia(frequencia);
        m.setDiaSemana(diaSemana);
        m.setDiaMes(diaMes);
        m.setAtiva(ativa);
        return mesadaRepository.save(m);
    }

    public Mesada buscar(Long estudanteId) {
        return mesadaRepository.findByEstudanteId(estudanteId).orElse(null);
    }

    @Transactional
    public void remover(Usuario responsavel, Long estudanteId) {
        Mesada m = mesadaRepository.findByEstudanteId(estudanteId)
                .orElseThrow(() -> new NotFoundException("Mesada não encontrada"));
        if (responsavel.getRole() == Role.RESPONSAVEL
                && !m.getResponsavel().getId().equals(responsavel.getId())) {
            throw new BusinessException("Sem permissão");
        }
        mesadaRepository.delete(m);
    }

    /** Roda 8h da manhã todo dia. */
    @Scheduled(cron = "0 0 8 * * *")
    @Transactional
    public void executarMesadasDoDia() {
        LocalDate hoje = LocalDate.now();
        List<Mesada> ativas = mesadaRepository.findByAtivaTrue();
        log.info("[mesada] Verificando {} mesadas para hoje={}", ativas.size(), hoje);
        for (Mesada m : ativas) {
            if (!devePagar(m, hoje)) continue;
            try {
                pagar(m, hoje);
            } catch (Exception e) {
                log.error("[mesada] Falha ao pagar mesada {}: {}", m.getId(), e.getMessage());
            }
        }
    }

    private boolean devePagar(Mesada m, LocalDate hoje) {
        if (m.getUltimaExecucao() != null && m.getUltimaExecucao().equals(hoje)) return false;
        switch (m.getFrequencia()) {
            case DIARIA:
                return true;
            case SEMANAL:
                return m.getDiaSemana() != null && hoje.getDayOfWeek() == m.getDiaSemana();
            case QUINZENAL:
                if (m.getDiaSemana() != null && hoje.getDayOfWeek() != m.getDiaSemana()) return false;
                if (m.getUltimaExecucao() == null) return true;
                return hoje.toEpochDay() - m.getUltimaExecucao().toEpochDay() >= 14;
            case MENSAL:
                return m.getDiaMes() != null && hoje.getDayOfMonth() == m.getDiaMes();
            default:
                return false;
        }
    }

    private void pagar(Mesada m, LocalDate hoje) {
        Carteira c = carteiraRepository.findByEstudanteId(m.getEstudante().getId())
                .orElseGet(() -> carteiraRepository.save(Carteira.builder()
                        .estudante(m.getEstudante()).saldo(BigDecimal.ZERO).build()));
        c.setSaldo(c.getSaldo().add(m.getValor()));
        carteiraRepository.save(c);

        Transacao tx = Transacao.builder()
                .carteira(c)
                .tipo(TipoTransacao.MESADA)
                .valor(m.getValor())
                .saldoApos(c.getSaldo())
                .descricao("Mesada " + m.getFrequencia().name().toLowerCase())
                .build();
        transacaoRepository.save(tx);

        m.setUltimaExecucao(hoje);
        mesadaRepository.save(m);

        notificacaoService.criar(m.getResponsavel(), "MESADA",
                "Mesada paga",
                "R$ " + m.getValor() + " creditados para " + m.getEstudante().getNome(),
                null);
        notificacaoService.criar(m.getEstudante(), "MESADA",
                "Você recebeu mesada!",
                "R$ " + m.getValor() + " no seu saldo · Bom apetite!",
                null);
        log.info("[mesada] Paga R$ {} para estudante={}", m.getValor(), m.getEstudante().getId());
    }

    /** Atalho dev para forçar execução agora. */
    @Transactional
    public Map<String, Object> executarManualmente() {
        executarMesadasDoDia();
        return Map.of("executadoEm", java.time.LocalDateTime.now().toString());
    }
}
