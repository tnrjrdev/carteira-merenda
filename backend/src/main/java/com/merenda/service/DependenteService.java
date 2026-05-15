package com.merenda.service;

import com.merenda.dto.DependenteDto;
import com.merenda.exception.BusinessException;
import com.merenda.exception.NotFoundException;
import com.merenda.model.Carteira;
import com.merenda.model.Role;
import com.merenda.model.TipoTransacao;
import com.merenda.model.Usuario;
import com.merenda.repository.CarteiraRepository;
import com.merenda.repository.TransacaoRepository;
import com.merenda.repository.UsuarioRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
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
public class DependenteService {

    private final UsuarioRepository usuarioRepository;
    private final CarteiraRepository carteiraRepository;
    private final TransacaoRepository transacaoRepository;
    private final PasswordEncoder passwordEncoder;

    public DependenteService(UsuarioRepository usuarioRepository,
                             CarteiraRepository carteiraRepository,
                             TransacaoRepository transacaoRepository,
                             PasswordEncoder passwordEncoder) {
        this.usuarioRepository = usuarioRepository;
        this.carteiraRepository = carteiraRepository;
        this.transacaoRepository = transacaoRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public DependenteDto.Resumo criarDependente(Usuario responsavel, DependenteDto.CreateRequest req) {
        if (responsavel.getRole() != Role.RESPONSAVEL) {
            throw new BusinessException("Apenas responsáveis podem cadastrar dependentes");
        }
        if (usuarioRepository.existsByEmail(req.email())) {
            throw new BusinessException("Já existe conta para este email");
        }
        Usuario estudante = Usuario.builder()
                .nome(req.nome())
                .email(req.email().toLowerCase().trim())
                .senhaHash(passwordEncoder.encode(req.senha()))
                .role(Role.ESTUDANTE)
                .responsavel(responsavel)
                .ativo(true)
                .build();
        usuarioRepository.save(estudante);
        Carteira c = Carteira.builder()
                .estudante(estudante)
                .saldo(BigDecimal.ZERO)
                .build();
        carteiraRepository.save(c);
        return toResumo(estudante, c);
    }

    public List<DependenteDto.Resumo> listarPorResponsavel(Long responsavelId) {
        return usuarioRepository.findByRoleAndResponsavelId(Role.ESTUDANTE, responsavelId).stream()
                .map(est -> {
                    Carteira c = carteiraRepository.findByEstudanteId(est.getId())
                            .orElseGet(() -> carteiraRepository.save(
                                    Carteira.builder().estudante(est).saldo(BigDecimal.ZERO).build()));
                    return toResumo(est, c);
                })
                .toList();
    }

    @Transactional
    public DependenteDto.Resumo atualizarLimites(Long responsavelId, Long estudanteId,
                                                 DependenteDto.AtualizarLimites req) {
        Usuario estudante = usuarioRepository.findById(estudanteId)
                .orElseThrow(() -> new NotFoundException("Estudante não encontrado"));
        if (estudante.getResponsavel() == null || !estudante.getResponsavel().getId().equals(responsavelId)) {
            throw new BusinessException("Estudante não pertence a este responsável");
        }
        Carteira c = carteiraRepository.findByEstudanteId(estudanteId)
                .orElseThrow(() -> new NotFoundException("Carteira não encontrada"));
        c.setLimiteDiario(req.limiteDiario());
        c.setLimiteSemanal(req.limiteSemanal());
        carteiraRepository.save(c);
        return toResumo(estudante, c);
    }

    private DependenteDto.Resumo toResumo(Usuario est, Carteira c) {
        LocalDateTime inicioDia = LocalDate.now().atStartOfDay();
        LocalDateTime inicioSemana = LocalDate.now()
                .with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))
                .atTime(LocalTime.MIN);
        BigDecimal gastoHoje = transacaoRepository.somaPorTipoDesde(c.getId(), TipoTransacao.COMPRA, inicioDia);
        BigDecimal gastoSemana = transacaoRepository.somaPorTipoDesde(c.getId(), TipoTransacao.COMPRA, inicioSemana);
        return new DependenteDto.Resumo(
                est.getId(),
                est.getNome(),
                est.getEmail(),
                c.getSaldo(),
                c.getLimiteDiario(),
                c.getLimiteSemanal(),
                gastoHoje == null ? BigDecimal.ZERO : gastoHoje,
                gastoSemana == null ? BigDecimal.ZERO : gastoSemana);
    }
}
