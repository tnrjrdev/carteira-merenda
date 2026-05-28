package com.merenda.domain.usuario.controller;

import com.merenda.config.security.SecurityUtils;
import com.merenda.domain.usuario.model.Usuario;
import com.merenda.domain.usuario.repository.UsuarioRepository;
import com.merenda.domain.usuario.service.CoppaService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/coppa")
public class CoppaController {

    private final CoppaService coppaService;
    private final UsuarioRepository usuarioRepository;
    private final SecurityUtils securityUtils;

    public CoppaController(CoppaService coppaService,
                           UsuarioRepository usuarioRepository,
                           SecurityUtils securityUtils) {
        this.coppaService = coppaService;
        this.usuarioRepository = usuarioRepository;
        this.securityUtils = securityUtils;
    }

    /** Indica se um estudante precisa de verificação parental e se já foi feita. */
    @GetMapping("/estudante/{id}")
    public ResponseEntity<Map<String, Object>> status(@PathVariable Long id) {
        Usuario u = usuarioRepository.findById(id).orElseThrow();
        Map<String, Object> body = new HashMap<>();
        body.put("estudanteId", id);
        body.put("idade", coppaService.idade(u));
        body.put("aplicaCoppa", coppaService.aplicaCoppa(u));
        body.put("verificadoEm", u.getVerificacaoParentalEm());
        body.put("metodo", u.getVerificacaoParentalMetodo());
        return ResponseEntity.ok(body);
    }

    /** O responsável confirma a verificação parental do filho < 13. */
    @PostMapping("/estudante/{id}/verificar")
    @PreAuthorize("hasAnyRole('RESPONSAVEL','ADMIN')")
    public ResponseEntity<Usuario> verificar(@PathVariable Long id,
                                             @RequestBody(required = false) Map<String, Object> body) {
        String metodo = body == null ? null : (String) body.get("metodo");
        return ResponseEntity.ok(coppaService.registrarVerificacaoParental(
                securityUtils.currentUser(), id, metodo));
    }
}
