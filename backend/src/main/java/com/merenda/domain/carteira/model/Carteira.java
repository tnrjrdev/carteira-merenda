package com.merenda.domain.carteira.model;

import com.merenda.domain.usuario.model.Usuario;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "carteiras")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Carteira {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "estudante_id", nullable = false, unique = true)
    private Usuario estudante;

    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal saldo = BigDecimal.ZERO;

    @Column(precision = 14, scale = 2)
    private BigDecimal limiteDiario;

    @Column(precision = 14, scale = 2)
    private BigDecimal limiteSemanal;

    /** Auto-recarga: quando saldo < saldoMinimo, cobra valorRecarga do cartão salvo do responsável. */
    @Column(nullable = false)
    private boolean autoRecargaAtiva = false;

    @Column(precision = 14, scale = 2)
    private BigDecimal saldoMinimo;

    @Column(precision = 14, scale = 2)
    private BigDecimal valorRecarga;

    private String mpCustomerId;
    private String mpCardId;
    @Column(length = 20)
    private String cardBandeira;
    @Column(length = 4)
    private String cardUltimos4;

    @Column(length = 300)
    private String ultimaFalhaAutoRecarga;
    private LocalDateTime ultimaFalhaAutoRecargaEm;
    private LocalDateTime ultimaAutoRecargaEm;

    @Column(nullable = false, updatable = false)
    private LocalDateTime criadoEm;

    @Column(nullable = false)
    private LocalDateTime atualizadoEm;

    @PrePersist
    public void prePersist() {
        this.criadoEm = LocalDateTime.now();
        this.atualizadoEm = LocalDateTime.now();
        if (this.saldo == null) this.saldo = BigDecimal.ZERO;
    }

    @PreUpdate
    public void preUpdate() {
        this.atualizadoEm = LocalDateTime.now();
    }
}
