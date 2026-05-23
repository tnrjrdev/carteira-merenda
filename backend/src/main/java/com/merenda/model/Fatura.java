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
@Table(name = "faturas",
        uniqueConstraints = @UniqueConstraint(columnNames = {"cantina_id", "competencia"}))
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Fatura {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cantina_id", nullable = false)
    private Cantina cantina;

    @Column(nullable = false, length = 7)
    private String competencia;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Plano plano;

    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal valor;

    @Column(nullable = false)
    private LocalDate vencimento;

    @Column(nullable = false, length = 20)
    private String status;

    @Column(length = 80)
    private String externalId;

    @Column(nullable = false, updatable = false)
    private LocalDateTime criadaEm;

    private LocalDateTime pagaEm;

    @PrePersist
    public void prePersist() {
        this.criadaEm = LocalDateTime.now();
        if (this.status == null) this.status = "ABERTA";
    }
}
