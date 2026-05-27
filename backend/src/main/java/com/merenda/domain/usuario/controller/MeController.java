package com.merenda.domain.usuario.controller;

import com.merenda.config.security.SecurityUtils;
import com.merenda.domain.usuario.model.Usuario;

import com.merenda.domain.usuario.model.Usuario;
import com.merenda.config.security.SecurityUtils;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/me")
public class MeController {

    private final SecurityUtils securityUtils;

    public MeController(SecurityUtils securityUtils) {
        this.securityUtils = securityUtils;
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> me() {
        Usuario u = securityUtils.currentUser();
        Map<String, Object> body = new HashMap<>();
        body.put("id", u.getId());
        body.put("nome", u.getNome());
        body.put("email", u.getEmail());
        body.put("role", u.getRole().name());
        body.put("cantinaId", u.getCantina() == null ? null : u.getCantina().getId());
        body.put("cantinaNome", u.getCantina() == null ? null : u.getCantina().getNome());
        body.put("responsavelId", u.getResponsavel() == null ? null : u.getResponsavel().getId());
        body.put("dataNascimento", u.getDataNascimento());
        body.put("alergias", u.getAlergias());
        body.put("cpf", u.getCpf());
        body.put("telefone", u.getTelefone());
        body.put("consentimentoLgpd", u.isConsentimentoLgpd());
        body.put("consentimentoLgpdEm", u.getConsentimentoLgpdEm());
        body.put("consentimentoVersao", u.getConsentimentoVersao());
        return ResponseEntity.ok(body);
    }
}
