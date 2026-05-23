package com.merenda.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "metas")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Meta {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "estudante_id", nullable = false)
    private Usuario estudante;

    @Column(nullable = false, length = 200)
    private String titulo;

    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal valorAlvo;

    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal valorAtual = BigDecimal.ZERO;

    private LocalDate prazo;

    @Column(nullable = false)
    private boolean concluida = false;

    @Column(nullable = false, updatable = false)
    private LocalDateTime criadaEm;

    private LocalDateTime concluidaEm;

    @PrePersist
    public void prePersist() {
        this.criadaEm = LocalDateTime.now();
        if (this.valorAtual == null) this.valorAtual = BigDecimal.ZERO;
    }
}
