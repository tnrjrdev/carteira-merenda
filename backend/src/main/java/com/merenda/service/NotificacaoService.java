package com.merenda.service;

import com.merenda.model.Notificacao;
import com.merenda.domain.usuario.model.Usuario;
import com.merenda.repository.NotificacaoRepository;
import com.merenda.domain.usuario.repository.UsuarioRepository;
import com.merenda.domain.usuario.service.PushService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@Service
public class NotificacaoService {

    private static final Logger log = LoggerFactory.getLogger(NotificacaoService.class);

    private final NotificacaoRepository notificacaoRepository;
    private final UsuarioRepository usuarioRepository;

    @Autowired(required = false)
    private PushService pushService;

    private final Map<Long, List<SseEmitter>> emitters = new ConcurrentHashMap<>();

    public NotificacaoService(NotificacaoRepository notificacaoRepository,
                              UsuarioRepository usuarioRepository) {
        this.notificacaoRepository = notificacaoRepository;
        this.usuarioRepository = usuarioRepository;
    }

    @Transactional
    public Notificacao criar(Usuario destinatario, String tipo, String titulo, String mensagem, String linkAcao) {
        if (destinatario == null) return null;
        Notificacao n = Notificacao.builder()
                .usuario(destinatario)
                .tipo(tipo)
                .titulo(titulo)
                .mensagem(mensagem)
                .linkAcao(linkAcao)
                .lida(false)
                .build();
        notificacaoRepository.save(n);
        broadcast(destinatario.getId(), n);
        if (pushService != null) {
            try {
                pushService.enviarParaUsuario(destinatario.getId(), titulo, mensagem, linkAcao);
            } catch (Exception e) {
                log.warn("Falha ao enviar push: {}", e.getMessage());
            }
        }
        return n;
    }

    public List<Notificacao> listar(Long usuarioId) {
        return notificacaoRepository.findTop50ByUsuarioIdOrderByCriadaEmDesc(usuarioId);
    }

    public long contarNaoLidas(Long usuarioId) {
        return notificacaoRepository.countByUsuarioIdAndLidaFalse(usuarioId);
    }

    @Transactional
    public void marcarLida(Long usuarioId, Long notificacaoId) {
        notificacaoRepository.findById(notificacaoId).ifPresent(n -> {
            if (!n.getUsuario().getId().equals(usuarioId)) return;
            if (!n.isLida()) {
                n.setLida(true);
                n.setLidaEm(LocalDateTime.now());
                notificacaoRepository.save(n);
            }
        });
    }

    @Transactional
    public void marcarTodasLidas(Long usuarioId) {
        notificacaoRepository.findTop50ByUsuarioIdOrderByCriadaEmDesc(usuarioId).forEach(n -> {
            if (!n.isLida()) {
                n.setLida(true);
                n.setLidaEm(LocalDateTime.now());
                notificacaoRepository.save(n);
            }
        });
    }

    public SseEmitter conectar(Long usuarioId) {
        SseEmitter emitter = new SseEmitter(0L);
        emitters.computeIfAbsent(usuarioId, k -> new CopyOnWriteArrayList<>()).add(emitter);
        emitter.onCompletion(() -> remover(usuarioId, emitter));
        emitter.onTimeout(() -> remover(usuarioId, emitter));
        emitter.onError(t -> remover(usuarioId, emitter));
        try {
            emitter.send(SseEmitter.event().name("hello").data("ok"));
        } catch (IOException e) {
            remover(usuarioId, emitter);
        }
        return emitter;
    }

    private void remover(Long usuarioId, SseEmitter emitter) {
        List<SseEmitter> lista = emitters.get(usuarioId);
        if (lista != null) lista.remove(emitter);
    }

    private void broadcast(Long usuarioId, Notificacao n) {
        List<SseEmitter> lista = emitters.get(usuarioId);
        if (lista == null || lista.isEmpty()) return;
        Map<String, Object> payload = new HashMap<>();
        payload.put("id", n.getId());
        payload.put("tipo", n.getTipo());
        payload.put("titulo", n.getTitulo());
        payload.put("mensagem", n.getMensagem());
        payload.put("linkAcao", n.getLinkAcao());
        payload.put("criadaEm", n.getCriadaEm().toString());
        for (SseEmitter e : lista) {
            try {
                e.send(SseEmitter.event().name("notificacao").data(payload));
            } catch (IOException ex) {
                remover(usuarioId, e);
            }
        }
    }
}
