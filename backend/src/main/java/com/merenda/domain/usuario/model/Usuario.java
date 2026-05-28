package com.merenda.domain.usuario.model;

import com.merenda.domain.cantina.model.Cantina;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "usuarios")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Usuario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String nome;

    @Column(nullable = false, unique = true)
    private String email;

    @com.fasterxml.jackson.annotation.JsonIgnore
    @Column(nullable = false)
    private String senhaHash;

    private String cpf;

    private String telefone;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    @Column(nullable = false)
    private boolean ativo = true;

    @Column(nullable = false, updatable = false)
    private LocalDateTime criadoEm;

    private LocalDate dataNascimento;

    @Column(length = 500)
    private String alergias;

    @Column(nullable = false)
    private boolean consentimentoLgpd = false;

    private LocalDateTime consentimentoLgpdEm;

    @Column(length = 20)
    private String consentimentoVersao;

    /** COPPA: verificação parental explícita do responsável para estudantes &lt; 13 anos. */
    private LocalDateTime verificacaoParentalEm;

    @Column(length = 30)
    private String verificacaoParentalMetodo;

    @com.fasterxml.jackson.annotation.JsonIgnore
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "responsavel_id")
    private Usuario responsavel;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "cantina_id")
    private Cantina cantina;

    @PrePersist
    public void prePersist() {
        this.criadoEm = LocalDateTime.now();
    }
}
