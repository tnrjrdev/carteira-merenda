package com.merenda.domain.usuario.service;

import com.merenda.config.exception.BusinessException;
import com.merenda.config.exception.NotFoundException;
import com.merenda.domain.usuario.model.Role;
import com.merenda.domain.usuario.model.Usuario;
import com.merenda.domain.usuario.repository.UsuarioRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Period;

/**
 * Controles específicos de COPPA — estudantes com menos de 13 anos exigem:
 *   - Verificação parental explícita pelo responsável (consentimento documentado).
 *   - Restrição de coleta de dados não-essenciais (telefone, CPF próprio etc).
 *
 * O ECA Digital + LGPD já tratam menores de idade no geral; COPPA é mais estrito
 * para o subgrupo &lt; 13 e por isso temos tratamento dedicado.
 */
@Service
public class CoppaService {

    private static final Logger log = LoggerFactory.getLogger(CoppaService.class);
    private static final int IDADE_COPPA = 13;

    private final UsuarioRepository usuarioRepository;

    public CoppaService(UsuarioRepository usuarioRepository) {
        this.usuarioRepository = usuarioRepository;
    }

    public boolean aplicaCoppa(Usuario u) {
        if (u == null || u.getRole() != Role.ESTUDANTE || u.getDataNascimento() == null) return false;
        return idade(u) < IDADE_COPPA;
    }

    public int idade(Usuario u) {
        if (u.getDataNascimento() == null) return 99;
        return Period.between(u.getDataNascimento(), LocalDate.now()).getYears();
    }

    /** Sanitiza os campos que não podem ser coletados de menores de 13. */
    public void sanitizarCamposRestritos(Usuario u) {
        if (!aplicaCoppa(u)) return;
        u.setTelefone(null);
        u.setCpf(null);
    }

    /** Bloqueia operação quando estudante &lt; 13 ainda não teve verificação parental. */
    public void exigirVerificacaoParental(Usuario u) {
        if (aplicaCoppa(u) && u.getVerificacaoParentalEm() == null) {
            throw new BusinessException(
                    "Estudante menor de 13 anos precisa de verificação parental antes de prosseguir");
        }
    }

    @Transactional
    public Usuario registrarVerificacaoParental(Usuario responsavel, Long estudanteId, String metodo) {
        Usuario estudante = usuarioRepository.findById(estudanteId)
                .orElseThrow(() -> new NotFoundException("Estudante não encontrado"));
        if (estudante.getResponsavel() == null
                || !estudante.getResponsavel().getId().equals(responsavel.getId())) {
            throw new BusinessException("Apenas o responsável vinculado pode confirmar a verificação parental");
        }
        if (!aplicaCoppa(estudante)) {
            log.info("[coppa] Estudante {} não está sob COPPA (>= 13), ignorando", estudanteId);
            return estudante;
        }
        estudante.setVerificacaoParentalEm(LocalDateTime.now());
        estudante.setVerificacaoParentalMetodo(metodo == null || metodo.isBlank() ? "auth_responsavel" : metodo);
        sanitizarCamposRestritos(estudante);
        Usuario salvo = usuarioRepository.save(estudante);
        log.info("[coppa] Verificação parental registrada para estudante {} ({} anos) método={}",
                estudanteId, idade(estudante), salvo.getVerificacaoParentalMetodo());
        return salvo;
    }
}
