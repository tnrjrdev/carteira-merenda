package com.merenda.domain.usuario.service;

import com.merenda.config.exception.BusinessException;
import com.merenda.config.exception.NotFoundException;
import com.merenda.config.security.JwtService;
import com.merenda.domain.cantina.model.Cantina;
import com.merenda.domain.cantina.repository.CantinaRepository;
import com.merenda.domain.carteira.model.Carteira;
import com.merenda.domain.carteira.repository.CarteiraRepository;
import com.merenda.domain.usuario.dto.AuthDto;
import com.merenda.domain.usuario.dto.GoogleLoginRequest;
import com.merenda.domain.usuario.model.Role;
import com.merenda.domain.usuario.model.Usuario;
import com.merenda.domain.usuario.repository.UsuarioRepository;

import com.merenda.domain.usuario.dto.AuthDto;
import com.merenda.config.exception.BusinessException;
import com.merenda.config.exception.NotFoundException;
import com.merenda.domain.cantina.model.Cantina;
import com.merenda.domain.carteira.model.Carteira;
import com.merenda.domain.usuario.model.Role;
import com.merenda.domain.usuario.model.Usuario;
import com.merenda.domain.cantina.repository.CantinaRepository;
import com.merenda.domain.carteira.repository.CarteiraRepository;
import com.merenda.domain.usuario.repository.UsuarioRepository;
import com.merenda.config.security.JwtService;
import com.merenda.domain.usuario.dto.GoogleLoginRequest;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.Map;
import java.util.UUID;

@Service
public class AuthService {

    private final UsuarioRepository usuarioRepository;
    private final CarteiraRepository carteiraRepository;
    private final CantinaRepository cantinaRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);

    @Value("${google.client.id}")
    private String googleClientId;

    @Value("${merenda.lgpd.politica-versao:2026-01-01}")
    private String politicaVersaoAtual;

    public AuthService(UsuarioRepository usuarioRepository,
                       CarteiraRepository carteiraRepository,
                       CantinaRepository cantinaRepository,
                       PasswordEncoder passwordEncoder,
                       AuthenticationManager authenticationManager,
                       JwtService jwtService) {
        this.usuarioRepository = usuarioRepository;
        this.carteiraRepository = carteiraRepository;
        this.cantinaRepository = cantinaRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
    }

    @Transactional
    public AuthDto.AuthResponse register(AuthDto.RegisterRequest req) {
        if (usuarioRepository.existsByEmail(req.email())) {
            throw new BusinessException("Já existe conta para este email");
        }
        Role role = req.role() == null ? Role.RESPONSAVEL : req.role();
        if (role == Role.ESTUDANTE) {
            throw new BusinessException("Cadastro de estudante é feito pelo responsável (endpoint /api/dependentes)");
        }

        Cantina cantina = null;
        if (role == Role.CANTINA) {
            if (req.cantinaId() == null) {
                throw new BusinessException("Selecione uma cantina para vincular o operador");
            }
            cantina = cantinaRepository.findById(req.cantinaId())
                    .orElseThrow(() -> new NotFoundException("Cantina não encontrada"));
        }

        Usuario u = Usuario.builder()
                .nome(req.nome())
                .email(req.email().toLowerCase().trim())
                .senhaHash(passwordEncoder.encode(req.senha()))
                .cpf(req.cpf())
                .telefone(req.telefone())
                .role(role)
                .cantina(cantina)
                .dataNascimento(req.dataNascimento())
                .consentimentoLgpd(true)
                .consentimentoLgpdEm(LocalDateTime.now())
                .consentimentoVersao(req.politicaVersao() == null ? politicaVersaoAtual : req.politicaVersao())
                .ativo(true)
                .build();

        usuarioRepository.save(u);
        return buildAuthResponse(u);
    }

    public AuthDto.AuthResponse login(AuthDto.LoginRequest req) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(req.email().toLowerCase().trim(), req.senha()));
        Usuario u = usuarioRepository.findByEmail(req.email().toLowerCase().trim())
                .orElseThrow(() -> new NotFoundException("Usuário não encontrado"));
        return buildAuthResponse(u);
    }

    @Transactional
    public AuthDto.AuthResponse googleLogin(GoogleLoginRequest req) {
        try {
            GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier.Builder(new NetHttpTransport(), new GsonFactory())
                    .setAudience(Collections.singletonList(googleClientId))
                    .build();

            GoogleIdToken idToken = verifier.verify(req.idToken());
            if (idToken == null) {
                log.warn("GoogleIdTokenVerifier returned null for token (len={}) — attempting tokeninfo fallback", req.idToken() == null ? 0 : req.idToken().length());
                String emailFromTokenInfo = verifyTokenWithTokenInfo(req.idToken());
                if (emailFromTokenInfo != null) {
                    Usuario u = usuarioRepository.findByEmail(emailFromTokenInfo)
                            .orElseThrow(() -> new NotFoundException("Usuário não encontrado. Por favor, cadastre-se primeiro."));

                    return buildAuthResponse(u);
                } else {
                    throw new BusinessException("Token do Google inválido");
                }
            }

            if (idToken != null) {
                String email = idToken.getPayload().getEmail();

                Usuario u = usuarioRepository.findByEmail(email)
                        .orElseThrow(() -> new NotFoundException("Usuário não encontrado. Por favor, cadastre-se primeiro."));

                return buildAuthResponse(u);
            } else {
                throw new BusinessException("Token do Google inválido");
            }
        } catch (NotFoundException | BusinessException | org.springframework.dao.DataAccessException e) {
            throw e;
        } catch (Exception e) {
            log.error("Falha inesperada ao validar token do Google", e);
            throw new BusinessException("Não foi possível validar seu login com o Google. Tente novamente em instantes.");
        }
    }

    @Transactional
    public AuthDto.AuthResponse googleRegister(GoogleLoginRequest req) {
        Role role = req.role() == null ? Role.RESPONSAVEL : req.role();
        if (role == Role.ESTUDANTE) {
            throw new BusinessException("Cadastro de estudante é feito pelo responsável (endpoint /api/dependentes)");
        }

        Cantina cantina = null;
        if (role == Role.CANTINA) {
            if (req.cantinaId() == null) {
                throw new BusinessException("Selecione uma cantina para vincular o operador");
            }
            cantina = cantinaRepository.findById(req.cantinaId())
                    .orElseThrow(() -> new NotFoundException("Cantina não encontrada"));
        }

        if (req.aceitaLgpd() == null || !req.aceitaLgpd()) {
            throw new BusinessException("É necessário aceitar a política de privacidade (LGPD)");
        }

        try {
            GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier.Builder(new NetHttpTransport(), new GsonFactory())
                    .setAudience(Collections.singletonList(googleClientId))
                    .build();

            GoogleIdToken idToken = verifier.verify(req.idToken());
            if (idToken == null) {
                log.warn("GoogleIdTokenVerifier returned null for register token (len={}) — attempting tokeninfo fallback", req.idToken() == null ? 0 : req.idToken().length());
                String emailFromTokenInfo = verifyTokenWithTokenInfo(req.idToken());
                if (emailFromTokenInfo != null) {
                    if (usuarioRepository.existsByEmail(emailFromTokenInfo)) {
                        throw new BusinessException("Já existe conta para este email. Por favor, faça login.");
                    }
                    Usuario novo = Usuario.builder()
                            .nome("Usuário Google")
                            .email(emailFromTokenInfo)
                            .senhaHash(passwordEncoder.encode(UUID.randomUUID().toString()))
                            .role(role)
                            .cantina(cantina)
                            .consentimentoLgpd(true)
                            .consentimentoLgpdEm(LocalDateTime.now())
                            .consentimentoVersao(req.politicaVersao() == null ? politicaVersaoAtual : req.politicaVersao())
                            .ativo(true)
                            .build();
                    usuarioRepository.save(novo);
                    return buildAuthResponse(novo);
                } else {
                    throw new BusinessException("Token do Google inválido");
                }
            }

            if (idToken != null) {
                GoogleIdToken.Payload payload = idToken.getPayload();
                String email = payload.getEmail();
                String name = (String) payload.get("name");

                if (usuarioRepository.existsByEmail(email)) {
                    throw new BusinessException("Já existe conta para este email. Por favor, faça login.");
                }

                Usuario novo = Usuario.builder()
                        .nome(name != null ? name : "Usuário Google")
                        .email(email)
                        .senhaHash(passwordEncoder.encode(UUID.randomUUID().toString()))
                        .role(role)
                        .cantina(cantina)
                        .consentimentoLgpd(true)
                        .consentimentoLgpdEm(LocalDateTime.now())
                        .consentimentoVersao(req.politicaVersao() == null ? politicaVersaoAtual : req.politicaVersao())
                        .ativo(true)
                        .build();
                usuarioRepository.save(novo);

                return buildAuthResponse(novo);
            } else {
                throw new BusinessException("Token do Google inválido");
            }
        } catch (BusinessException | NotFoundException | org.springframework.dao.DataAccessException e) {
            throw e;
        } catch (Exception e) {
            log.error("Falha inesperada ao registrar com Google", e);
            throw new BusinessException("Não foi possível concluir seu cadastro com o Google. Tente novamente em instantes.");
        }
    }

    public AuthDto.AuthResponse buildAuthResponse(Usuario u) {
        Map<String, Object> claims = Map.of(
                "uid", u.getId(),
                "role", u.getRole().name(),
                "nome", u.getNome(),
                "cantinaId", u.getCantina() == null ? -1L : u.getCantina().getId());
        String token = jwtService.generateToken(u.getEmail(), claims);
        return new AuthDto.AuthResponse(
                token,
                u.getId(),
                u.getNome(),
                u.getEmail(),
                u.getRole(),
                u.getCantina() == null ? null : u.getCantina().getId());
    }

    @Transactional
    public Carteira garantirCarteira(Usuario estudante) {
        return carteiraRepository.findByEstudanteId(estudante.getId())
                .orElseGet(() -> {
                    Carteira c = Carteira.builder()
                            .estudante(estudante)
                            .saldo(BigDecimal.ZERO)
                            .build();
                    return carteiraRepository.save(c);
                });
    }

    private String verifyTokenWithTokenInfo(String idToken) {
        try {
            HttpClient client = HttpClient.newHttpClient();
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://oauth2.googleapis.com/tokeninfo?id_token=" + idToken))
                    .GET()
                    .build();
            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == 200) {
                JsonObject obj = JsonParser.parseString(response.body()).getAsJsonObject();
                String aud = obj.has("aud") ? obj.get("aud").getAsString() : null;
                if (aud != null && aud.equals(googleClientId)) {
                    return obj.has("email") ? obj.get("email").getAsString() : null;
                } else {
                    log.warn("tokeninfo aud mismatch: {} expected {}", aud, googleClientId);
                    return null;
                }
            } else {
                log.warn("tokeninfo returned status {} body {}", response.statusCode(), response.body());
                return null;
            }
        } catch (Exception e) {
            log.warn("tokeninfo request failed: {}", e.getMessage());
            return null;
        }
    }
}
