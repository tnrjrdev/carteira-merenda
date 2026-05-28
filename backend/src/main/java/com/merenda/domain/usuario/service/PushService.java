package com.merenda.domain.usuario.service;

import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.FirebaseMessagingException;
import com.google.firebase.messaging.Message;
import com.google.firebase.messaging.Notification;
import com.google.firebase.messaging.WebpushConfig;
import com.google.firebase.messaging.WebpushFcmOptions;
import com.merenda.domain.usuario.model.PushToken;
import com.merenda.domain.usuario.model.Usuario;
import com.merenda.domain.usuario.repository.PushTokenRepository;
import com.merenda.domain.usuario.repository.UsuarioRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

/**
 * Envia push notifications via Firebase Cloud Messaging quando habilitado.
 * Em modo MOCK (sem credenciais), apenas registra o evento no log.
 */
@Service
public class PushService {

    private static final Logger log = LoggerFactory.getLogger(PushService.class);

    private final PushTokenRepository pushTokenRepository;
    private final UsuarioRepository usuarioRepository;
    private final boolean enabled;
    private final FirebaseMessaging firebaseMessaging;

    public PushService(PushTokenRepository pushTokenRepository,
                       UsuarioRepository usuarioRepository,
                       @Value("${merenda.push.enabled:false}") boolean enabled,
                       ObjectProvider<FirebaseMessaging> firebaseMessagingProvider) {
        this.pushTokenRepository = pushTokenRepository;
        this.usuarioRepository = usuarioRepository;
        this.enabled = enabled;
        this.firebaseMessaging = firebaseMessagingProvider.getIfAvailable();
        if (!enabled) {
            log.info("PushService em modo MOCK (merenda.push.enabled=false). Notificações somente in-app/SSE.");
        } else if (firebaseMessaging == null) {
            log.warn("PushService habilitado mas FirebaseMessaging não inicializado. Verifique credenciais.");
        } else {
            log.info("PushService ATIVO — FCM real");
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

        boolean podeEnviar = enabled && firebaseMessaging != null;
        for (PushToken t : tokens) {
            if (podeEnviar && !t.getToken().startsWith("mock-")) {
                try {
                    Message.Builder builder = Message.builder()
                            .setToken(t.getToken())
                            .setNotification(Notification.builder()
                                    .setTitle(titulo)
                                    .setBody(mensagem)
                                    .build());

                    Map<String, String> data = new HashMap<>();
                    if (linkAcao != null) data.put("link", linkAcao);
                    if (!data.isEmpty()) builder.putAllData(data);

                    if (linkAcao != null && !linkAcao.isBlank()) {
                        builder.setWebpushConfig(WebpushConfig.builder()
                                .setFcmOptions(WebpushFcmOptions.withLink(linkAcao))
                                .build());
                    }

                    String resp = firebaseMessaging.send(builder.build());
                    log.info("[push] enviado fcm={} usuario={} titulo='{}'", resp, usuarioId, titulo);
                } catch (FirebaseMessagingException e) {
                    String code = e.getMessagingErrorCode() == null ? "?" : e.getMessagingErrorCode().name();
                    log.warn("[push] falha fcm code={} usuario={} token={}: {}",
                            code, usuarioId, abbrev(t.getToken()), e.getMessage());
                    if ("UNREGISTERED".equals(code) || "INVALID_ARGUMENT".equals(code)) {
                        pushTokenRepository.delete(t);
                        continue;
                    }
                } catch (Exception e) {
                    log.warn("[push] erro inesperado usuario={}: {}", usuarioId, e.getMessage());
                }
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
