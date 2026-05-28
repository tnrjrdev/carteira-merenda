package com.merenda.domain.usuario.service;

import com.merenda.config.exception.BusinessException;
import com.merenda.config.exception.NotFoundException;
import com.merenda.domain.carteira.model.Carteira;
import com.merenda.domain.carteira.model.TipoTransacao;
import com.merenda.domain.carteira.repository.CarteiraRepository;
import com.merenda.domain.carteira.repository.TransacaoRepository;
import com.merenda.domain.usuario.dto.DependenteDto;
import com.merenda.domain.usuario.model.Role;
import com.merenda.domain.usuario.model.Usuario;
import com.merenda.domain.usuario.repository.UsuarioRepository;

import com.merenda.domain.usuario.dto.DependenteDto;
import com.merenda.config.exception.BusinessException;
import com.merenda.config.exception.NotFoundException;
import com.merenda.domain.carteira.model.Carteira;
import com.merenda.domain.usuario.model.Role;
import com.merenda.domain.carteira.model.TipoTransacao;
import com.merenda.domain.usuario.model.Usuario;
import com.merenda.domain.carteira.repository.CarteiraRepository;
import com.merenda.domain.carteira.repository.TransacaoRepository;
import com.merenda.domain.usuario.repository.UsuarioRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Period;
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

        // COPPA: estudantes < 13 só podem ser cadastrados com verificação parental explícita
        boolean coppa = req.dataNascimento() != null
                && Period.between(req.dataNascimento(), LocalDate.now()).getYears() < 13;
        if (coppa && (req.verificacaoParental() == null || !req.verificacaoParental())) {
            throw new BusinessException(
                    "Estudantes menores de 13 anos exigem verificação parental explícita do responsável (COPPA).");
        }

        Usuario estudante = Usuario.builder()
                .nome(req.nome())
                .email(req.email().toLowerCase().trim())
                .senhaHash(passwordEncoder.encode(req.senha()))
                .role(Role.ESTUDANTE)
                .responsavel(responsavel)
                .dataNascimento(req.dataNascimento())
                .alergias(req.alergias())
                .consentimentoLgpd(true)
                .consentimentoLgpdEm(LocalDateTime.now())
                .consentimentoVersao(responsavel.getConsentimentoVersao())
                .ativo(true)
                .build();
        if (coppa) {
            estudante.setVerificacaoParentalEm(LocalDateTime.now());
            estudante.setVerificacaoParentalMetodo("cadastro_responsavel");
            estudante.setTelefone(null);
            estudante.setCpf(null);
        }
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

    @Transactional
    public DependenteDto.Resumo atualizarPerfil(Long responsavelId, Long estudanteId,
                                                DependenteDto.AtualizarPerfil req) {
        Usuario estudante = usuarioRepository.findById(estudanteId)
                .orElseThrow(() -> new NotFoundException("Estudante não encontrado"));
        if (estudante.getResponsavel() == null || !estudante.getResponsavel().getId().equals(responsavelId)) {
            throw new BusinessException("Estudante não pertence a este responsável");
        }
        estudante.setDataNascimento(req.dataNascimento());
        estudante.setAlergias(req.alergias() == null || req.alergias().isBlank() ? null : req.alergias().trim());
        usuarioRepository.save(estudante);
        Carteira c = carteiraRepository.findByEstudanteId(estudanteId)
                .orElseThrow(() -> new NotFoundException("Carteira não encontrada"));
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
                est.getDataNascimento(),
                est.getAlergias(),
                c.getSaldo(),
                c.getLimiteDiario(),
                c.getLimiteSemanal(),
                gastoHoje == null ? BigDecimal.ZERO : gastoHoje,
                gastoSemana == null ? BigDecimal.ZERO : gastoSemana);
    }
}
