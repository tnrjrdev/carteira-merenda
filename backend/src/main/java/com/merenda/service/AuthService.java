package com.merenda.service;

import com.merenda.dto.AuthDto;
import com.merenda.exception.BusinessException;
import com.merenda.exception.NotFoundException;
import com.merenda.model.Cantina;
import com.merenda.model.Carteira;
import com.merenda.model.Role;
import com.merenda.model.Usuario;
import com.merenda.repository.CantinaRepository;
import com.merenda.repository.CarteiraRepository;
import com.merenda.repository.UsuarioRepository;
import com.merenda.security.JwtService;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Map;

@Service
public class AuthService {

    private final UsuarioRepository usuarioRepository;
    private final CarteiraRepository carteiraRepository;
    private final CantinaRepository cantinaRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;

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
}
