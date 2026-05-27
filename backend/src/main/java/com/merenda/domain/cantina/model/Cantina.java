package com.merenda.domain.cantina.model;


import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "cantinas")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Cantina {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String nome;

    private String escola;

    private String cnpj;

    private String endereco;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Plano plano = Plano.ESSENCIAL;

    @Column(nullable = false)
    private int maxAlunos = 300;

    @Column(precision = 5, scale = 4)
    private BigDecimal taxaPlataforma;

    @Column(precision = 14, scale = 2)
    private BigDecimal mensalidadeSaas;

    private Integer diaCobrancaMensalidade;

    @Column(nullable = false)
    private boolean ativa = true;

    @Column(nullable = false, updatable = false)
    private LocalDateTime criadaEm;

    @PrePersist
    public void prePersist() {
        this.criadaEm = LocalDateTime.now();
    }
}
