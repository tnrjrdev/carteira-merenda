package com.merenda.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.messaging.FirebaseMessaging;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.io.ByteArrayInputStream;
import java.io.FileInputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

/**
 * Inicializa o FirebaseApp se {@code merenda.push.enabled=true} e houver credenciais.
 * Aceita duas formas de credencial:
 *   - {@code FIREBASE_CREDENTIALS_JSON} → conteúdo JSON inline (recomendado para Render/Heroku)
 *   - {@code FIREBASE_CREDENTIALS_PATH} → caminho para o arquivo service-account.json
 *
 * Se nada estiver configurado mas push.enabled=true, loga aviso e retorna null —
 * PushService cai em modo MOCK silenciosamente.
 */
@Configuration
public class FirebaseConfig {

    private static final Logger log = LoggerFactory.getLogger(FirebaseConfig.class);

    @Bean
    @ConditionalOnProperty(name = "merenda.push.enabled", havingValue = "true")
    public FirebaseMessaging firebaseMessaging(
            @Value("${merenda.push.firebase.credentials-json:}") String credentialsJson,
            @Value("${merenda.push.firebase.credentials-path:}") String credentialsPath) {

        try (InputStream creds = openCredentials(credentialsJson, credentialsPath)) {
            if (creds == null) {
                log.warn("merenda.push.enabled=true mas nenhuma credencial Firebase encontrada. "
                        + "Defina FIREBASE_CREDENTIALS_JSON ou FIREBASE_CREDENTIALS_PATH. PushService ficará em MOCK.");
                return null;
            }
            if (FirebaseApp.getApps().isEmpty()) {
                FirebaseOptions options = FirebaseOptions.builder()
                        .setCredentials(GoogleCredentials.fromStream(creds))
                        .build();
                FirebaseApp.initializeApp(options);
                log.info("FirebaseApp inicializado — FCM real habilitado");
            }
            return FirebaseMessaging.getInstance();
        } catch (Exception e) {
            log.error("Falha ao inicializar Firebase: {}. PushService ficará em modo MOCK.", e.getMessage());
            return null;
        }
    }

    private InputStream openCredentials(String json, String path) throws Exception {
        if (json != null && !json.isBlank()) {
            return new ByteArrayInputStream(json.getBytes(StandardCharsets.UTF_8));
        }
        if (path != null && !path.isBlank() && Files.exists(Path.of(path))) {
            return new FileInputStream(path);
        }
        return null;
    }
}
