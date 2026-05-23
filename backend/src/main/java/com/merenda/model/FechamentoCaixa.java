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
@Table(name = "fechamentos_caixa",
        uniqueConstraints = @UniqueConstraint(columnNames = {"cantina_id", "dia"}))
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FechamentoCaixa {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cantina_id", nullable = false)
    private Cantina cantina;

    @Column(nullable = false)
    private LocalDate dia;

    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal totalBruto;

    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal taxaPlataforma;

    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal totalLiquido;

    @Column(nullable = false)
    private Integer quantidadeTransacoes;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fechado_por_id")
    private Usuario fechadoPor;

    @Column(nullable = false, updatable = false)
    private LocalDateTime fechadoEm;

    @Column(length = 20)
    private String statusRepasse;

    private LocalDateTime repassadoEm;

    @PrePersist
    public void prePersist() {
        this.fechadoEm = LocalDateTime.now();
        if (this.statusRepasse == null) this.statusRepasse = "PENDENTE";
    }
}
