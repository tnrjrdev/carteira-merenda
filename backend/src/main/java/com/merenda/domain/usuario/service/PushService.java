package com.merenda.domain.usuario.service;

import com.merenda.domain.usuario.model.PushToken;
import com.merenda.domain.usuario.model.Usuario;
import com.merenda.domain.usuario.repository.PushTokenRepository;
import com.merenda.domain.usuario.repository.UsuarioRepository;

import com.merenda.domain.usuario.model.PushToken;
import com.merenda.domain.usuario.model.Usuario;
import com.merenda.domain.usuario.repository.PushTokenRepository;
import com.merenda.domain.usuario.repository.UsuarioRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * Stub de push para Web/Mobile.
 * MOCK: hoje só loga e marca o token como usado. Para ativar:
 *  1. Criar projeto Firebase, gerar service account JSON
 *  2. Adicionar dependência firebase-admin no pom.xml
 *  3. Inicializar FirebaseApp em @PostConstruct lendo o JSON
 *  4. Substituir o bloco "log.info" por FirebaseMessaging.send(Message.builder()...)
 */
@Service
public class PushService {

    private static final Logger log = LoggerFactory.getLogger(PushService.class);

    private final PushTokenRepository pushTokenRepository;
    private final UsuarioRepository usuarioRepository;
    private final boolean enabled;

    public PushService(PushTokenRepository pushTokenRepository,
                       UsuarioRepository usuarioRepository,
                       @Value("${merenda.push.enabled:false}") boolean enabled) {
        this.pushTokenRepository = pushTokenRepository;
        this.usuarioRepository = usuarioRepository;
        this.enabled = enabled;
        if (!enabled) {
            log.info("PushService em modo MOCK (merenda.push.enabled=false). Notificações somente in-app/SSE.");
        }
    }

    @Transactional
    public PushToken registrarToken(Usuario u, String token, String plataforma, String userAgent) {
        if (token == null || token.isBlank()) {
            throw new IllegalArgumentException("Token vazio");
        }
        return pushTokenRepository.findByToken(token)
                .map(existente -> {
                    existente.setUsuario(u);
                    existente.setPlataforma(plataforma);
                    existente.setUserAgent(userAgent);
                    existente.setUltimoUsoEm(LocalDateTime.now());
                    return pushTokenRepository.save(existente);
                })
                .orElseGet(() -> pushTokenRepository.save(PushToken.builder()
                        .usuario(u)
                        .token(token)
                        .plataforma(plataforma)
                        .userAgent(userAgent)
                        .build()));
    }

    @Transactional
    public void enviarParaUsuario(Long usuarioId, String titulo, String mensagem, String linkAcao) {
        var tokens = pushTokenRepository.findByUsuarioId(usuarioId);
        if (tokens.isEmpty()) return;
        for (PushToken t : tokens) {
            if (enabled) {
                // TODO: integrar com FirebaseMessaging quando credenciais existirem
                log.info("[push REAL] (não implementado) -> token={} titulo='{}'", abbrev(t.getToken()), titulo);
            } else {
                log.info("[push MOCK] {} -> token={} titulo='{}'",
                        usuarioId, abbrev(t.getToken()), titulo);
            }
            t.setUltimoUsoEm(LocalDateTime.now());
            pushTokenRepository.save(t);
        }
    }

    private String abbrev(String token) {
        if (token == null) return "?";
        if (token.length() <= 12) return token;
        return token.substring(0, 6) + "..." + token.substring(token.length() - 6);
    }
}
