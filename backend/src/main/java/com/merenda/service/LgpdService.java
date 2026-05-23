package com.merenda.service;

import com.merenda.exception.BusinessException;
import com.merenda.exception.NotFoundException;
import com.merenda.model.*;
import com.merenda.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

@Service
public class LgpdService {

    private static final Logger log = LoggerFactory.getLogger(LgpdService.class);

    private final UsuarioRepository usuarioRepository;
    private final CarteiraRepository carteiraRepository;
    private final TransacaoRepository transacaoRepository;
    private final BloqueioCategoriaRepository bloqueioRepository;
    private final PedidoRepository pedidoRepository;
    private final MetaRepository metaRepository;
    private final UsuarioBadgeRepository usuarioBadgeRepository;
    private final NotificacaoRepository notificacaoRepository;
    private final RecargaPendenteRepository recargaRepository;
    private final PushTokenRepository pushTokenRepository;

    private final String politicaVersao;

    public LgpdService(UsuarioRepository usuarioRepository,
                       CarteiraRepository carteiraRepository,
                       TransacaoRepository transacaoRepository,
                       BloqueioCategoriaRepository bloqueioRepository,
                       PedidoRepository pedidoRepository,
                       MetaRepository metaRepository,
                       UsuarioBadgeRepository usuarioBadgeRepository,
                       NotificacaoRepository notificacaoRepository,
                       RecargaPendenteRepository recargaRepository,
                       PushTokenRepository pushTokenRepository,
                       @Value("${merenda.lgpd.politica-versao:2026-01-01}") String politicaVersao) {
        this.usuarioRepository = usuarioRepository;
        this.carteiraRepository = carteiraRepository;
        this.transacaoRepository = transacaoRepository;
        this.bloqueioRepository = bloqueioRepository;
        this.pedidoRepository = pedidoRepository;
        this.metaRepository = metaRepository;
        this.usuarioBadgeRepository = usuarioBadgeRepository;
        this.notificacaoRepository = notificacaoRepository;
        this.recargaRepository = recargaRepository;
        this.pushTokenRepository = pushTokenRepository;
        this.politicaVersao = politicaVersao;
    }

    public String versaoAtual() { return politicaVersao; }

    @Transactional
    public void registrarConsentimento(Usuario u, String versaoAceita) {
        u.setConsentimentoLgpd(true);
        u.setConsentimentoLgpdEm(LocalDateTime.now());
        u.setConsentimentoVersao(versaoAceita == null ? politicaVersao : versaoAceita);
        usuarioRepository.save(u);
        log.info("[lgpd] usuário {} aceitou política versão {}", u.getId(), u.getConsentimentoVersao());
    }

    @Transactional
    public Map<String, Object> exportarDados(Usuario u) {
        Map<String, Object> dump = new LinkedHashMap<>();
        Map<String, Object> usuario = new LinkedHashMap<>();
        usuario.put("id", u.getId());
        usuario.put("nome", u.getNome());
        usuario.put("email", u.getEmail());
        usuario.put("cpf", u.getCpf());
        usuario.put("telefone", u.getTelefone());
        usuario.put("dataNascimento", u.getDataNascimento());
        usuario.put("alergias", u.getAlergias());
        usuario.put("role", u.getRole().name());
        usuario.put("criadoEm", u.getCriadoEm());
        usuario.put("consentimentoLgpd", u.isConsentimentoLgpd());
        usuario.put("consentimentoLgpdEm", u.getConsentimentoLgpdEm());
        usuario.put("consentimentoVersao", u.getConsentimentoVersao());
        dump.put("usuario", usuario);

        if (u.getRole() == Role.ESTUDANTE) {
            carteiraRepository.findByEstudanteId(u.getId()).ifPresent(c -> {
                Map<String, Object> carteira = new LinkedHashMap<>();
                carteira.put("saldo", c.getSaldo());
                carteira.put("limiteDiario", c.getLimiteDiario());
                carteira.put("limiteSemanal", c.getLimiteSemanal());
                dump.put("carteira", carteira);
                dump.put("transacoes", transacaoRepository.findTop20ByCarteiraIdOrderByCriadaEmDesc(c.getId()));
                dump.put("bloqueios", bloqueioRepository.findByCarteiraId(c.getId()));
            });
            dump.put("pedidos", pedidoRepository.findByEstudanteIdOrderByCriadoEmDesc(u.getId()));
            dump.put("metas", metaRepository.findByEstudanteIdOrderByConcluidaAscCriadaEmDesc(u.getId()));
        }
        dump.put("badges", usuarioBadgeRepository.findByUsuarioIdOrderByGanhoEmDesc(u.getId()));
        dump.put("notificacoes", notificacaoRepository.findTop50ByUsuarioIdOrderByCriadaEmDesc(u.getId()));
        return dump;
    }

    /** Anonimiza o usuário ao invés de deletar (preserva integridade contábil). */
    @Transactional
    public Map<String, Object> excluirConta(Usuario u, String senha) {
        if (u.getRole() == Role.ADMIN) {
            throw new BusinessException("Conta administrativa não pode ser excluída por este endpoint");
        }
        // Tokens push são apagados de fato
        pushTokenRepository.findByUsuarioId(u.getId()).forEach(pushTokenRepository::delete);

        // Anonimiza identidade
        String anonimo = "anon-" + u.getId() + "@apagado.merenda";
        u.setNome("Usuário removido");
        u.setEmail(anonimo);
        u.setCpf(null);
        u.setTelefone(null);
        u.setDataNascimento(null);
        u.setAlergias(null);
        u.setAtivo(false);
        u.setSenhaHash("!");
        usuarioRepository.save(u);

        log.info("[lgpd] usuário {} solicitou exclusão — anonimizado", u.getId());
        Map<String, Object> r = new HashMap<>();
        r.put("excluido", true);
        r.put("anonimoId", u.getId());
        r.put("mensagem", "Sua conta foi anonimizada. Dados financeiros são mantidos por obrigação legal (Receita/escolas).");
        return r;
    }

    public Usuario buscarUsuario(Long id) {
        return usuarioRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Usuário não encontrado"));
    }
}
