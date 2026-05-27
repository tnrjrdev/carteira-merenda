package com.merenda.domain.usuario.model;


import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "push_tokens",
        uniqueConstraints = @UniqueConstraint(columnNames = {"token"}))
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PushToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    @Column(nullable = false, length = 500)
    private String token;

    @Column(length = 30)
    private String plataforma;

    @Column(length = 200)
    private String userAgent;

    @Column(nullable = false, updatable = false)
    private LocalDateTime registradoEm;

    private LocalDateTime ultimoUsoEm;

    @PrePersist
    public void prePersist() {
        this.registradoEm = LocalDateTime.now();
    }
}
