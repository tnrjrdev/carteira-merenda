package com.merenda.service;

import com.merenda.exception.BusinessException;
import com.merenda.exception.NotFoundException;
import com.merenda.model.*;
import com.merenda.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class GamificacaoService {

    private static final Logger log = LoggerFactory.getLogger(GamificacaoService.class);

    private final MetaRepository metaRepository;
    private final BadgeRepository badgeRepository;
    private final UsuarioBadgeRepository usuarioBadgeRepository;
    private final UsuarioRepository usuarioRepository;
    private final TransacaoRepository transacaoRepository;

    @Autowired(required = false)
    private NotificacaoService notificacaoService;

    public GamificacaoService(MetaRepository metaRepository,
                              BadgeRepository badgeRepository,
                              UsuarioBadgeRepository usuarioBadgeRepository,
                              UsuarioRepository usuarioRepository,
                              TransacaoRepository transacaoRepository) {
        this.metaRepository = metaRepository;
        this.badgeRepository = badgeRepository;
        this.usuarioBadgeRepository = usuarioBadgeRepository;
        this.usuarioRepository = usuarioRepository;
        this.transacaoRepository = transacaoRepository;
    }

    @Transactional
    public Meta criarMeta(Usuario estudante, String titulo, BigDecimal valorAlvo, LocalDate prazo) {
        if (estudante.getRole() != Role.ESTUDANTE) {
            throw new BusinessException("Metas são exclusivas para estudantes");
        }
        if (valorAlvo == null || valorAlvo.compareTo(BigDecimal.ONE) < 0) {
            throw new BusinessException("Valor alvo mínimo R$ 1,00");
        }
        return metaRepository.save(Meta.builder()
                .estudante(estudante)
                .titulo(titulo)
                .valorAlvo(valorAlvo)
                .valorAtual(BigDecimal.ZERO)
                .prazo(prazo)
                .concluida(false)
                .build());
    }

    @Transactional
    public Meta progredir(Usuario estudante, Long metaId, BigDecimal incremento) {
        Meta m = metaRepository.findById(metaId)
                .orElseThrow(() -> new NotFoundException("Meta não encontrada"));
        if (!m.getEstudante().getId().equals(estudante.getId())) {
            throw new BusinessException("Meta não é sua");
        }
        if (m.isConcluida()) throw new BusinessException("Meta já concluída");
        m.setValorAtual(m.getValorAtual().add(incremento));
        if (m.getValorAtual().compareTo(m.getValorAlvo()) >= 0) {
            m.setConcluida(true);
            m.setConcluidaEm(java.time.LocalDateTime.now());
            concederBadge(estudante, "META_CONCLUIDA");
        }
        return metaRepository.save(m);
    }

    public List<Meta> listarMetas(Long estudanteId) {
        return metaRepository.findByEstudanteIdOrderByConcluidaAscCriadaEmDesc(estudanteId);
    }

    public List<UsuarioBadge> listarBadges(Long usuarioId) {
        return usuarioBadgeRepository.findByUsuarioIdOrderByGanhoEmDesc(usuarioId);
    }

    @Transactional
    public Optional<UsuarioBadge> concederBadge(Usuario usuario, String codigo) {
        Badge b = badgeRepository.findByCodigo(codigo).orElse(null);
        if (b == null) {
            log.warn("Badge {} não cadastrada — pulando concessão", codigo);
            return Optional.empty();
        }
        if (usuarioBadgeRepository.existsByUsuarioIdAndBadgeId(usuario.getId(), b.getId())) {
            return Optional.empty();
        }
        UsuarioBadge ub = usuarioBadgeRepository.save(UsuarioBadge.builder()
                .usuario(usuario).badge(b).build());
        if (notificacaoService != null) {
            notificacaoService.criar(usuario, "BADGE",
                    "Conquista desbloqueada: " + b.getNome() + " " + (b.getEmoji() == null ? "" : b.getEmoji()),
                    b.getDescricao() == null ? "+1 conquista" : b.getDescricao(),
                    "/estudante");
        }
        return Optional.of(ub);
    }

    /** Avalia conquistas automáticas após uma compra. */
    @Transactional
    public void avaliarAposCompra(Usuario estudante, Long carteiraId, BigDecimal totalCompra, List<ItemTransacao> itens) {
        if (estudante == null || carteiraId == null) return;
        boolean todosSaudaveis = !itens.isEmpty() && itens.stream().allMatch(it ->
                it.getProduto() != null && it.getProduto().getCategoria() != null
                        && it.getProduto().getCategoria().isSaudavel());
        if (todosSaudaveis) concederBadge(estudante, "ESCOLHA_SAUDAVEL");

        long compras = transacaoRepository.findByCarteiraIdOrderByCriadaEmDesc(
                        carteiraId,
                        org.springframework.data.domain.PageRequest.of(0, 1))
                .getTotalElements();
        if (compras == 1L) concederBadge(estudante, "PRIMEIRA_COMPRA");
        if (compras >= 10L) concederBadge(estudante, "DEZ_COMPRAS");
    }

    public Map<String, Object> resumoEstudante(Long usuarioId) {
        Usuario u = usuarioRepository.findById(usuarioId)
                .orElseThrow(() -> new NotFoundException("Usuário não encontrado"));
        List<Meta> metas = listarMetas(usuarioId);
        List<UsuarioBadge> badges = listarBadges(usuarioId);
        int pontos = badges.stream().mapToInt(ub -> ub.getBadge().getPontos() == null ? 0 : ub.getBadge().getPontos()).sum();
        Map<String, Object> r = new HashMap<>();
        r.put("nome", u.getNome());
        r.put("pontos", pontos);
        r.put("metas", metas);
        r.put("badges", badges);
        return r;
    }
}
