package com.merenda.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "usuarios_badges",
        uniqueConstraints = @UniqueConstraint(columnNames = {"usuario_id", "badge_id"}))
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UsuarioBadge {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "badge_id", nullable = false)
    private Badge badge;

    @Column(nullable = false, updatable = false)
    private LocalDateTime ganhoEm;

    @PrePersist
    public void prePersist() {
        this.ganhoEm = LocalDateTime.now();
    }
}
