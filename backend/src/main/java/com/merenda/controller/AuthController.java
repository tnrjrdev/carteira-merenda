package com.merenda.controller;

import com.merenda.dto.AuthDto;
import com.merenda.dto.GoogleLoginRequest;
import com.merenda.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    public ResponseEntity<AuthDto.AuthResponse> login(@RequestBody @Valid AuthDto.LoginRequest req) {
        return ResponseEntity.ok(authService.login(req));
    }

    @PostMapping("/register")
    public ResponseEntity<AuthDto.AuthResponse> register(@RequestBody @Valid AuthDto.RegisterRequest req) {
        return ResponseEntity.ok(authService.register(req));
    }

    @PostMapping("/google-login")
    public ResponseEntity<AuthDto.AuthResponse> googleLogin(@RequestBody @Valid GoogleLoginRequest req) {
        return ResponseEntity.ok(authService.googleLogin(req));
    }

    @PostMapping("/google-register")
    public ResponseEntity<AuthDto.AuthResponse> googleRegister(@RequestBody @Valid GoogleLoginRequest req) {
        return ResponseEntity.ok(authService.googleRegister(req));
    }
}
