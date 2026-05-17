package com.merenda.model;

import com.merenda.service.gateway.StatusPagamento;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "recargas_pendentes",
        indexes = @Index(name = "idx_recarga_externalid", columnList = "externalId", unique = true))
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RecargaPendente {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "carteira_id", nullable = false)
    private Carteira carteira;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "solicitado_por_id", nullable = false)
    private Usuario solicitadoPor;

    @Column(nullable = false, length = 80, unique = true)
    private String externalId;

    @Column(nullable = false, length = 30)
    private String gatewayNome;

    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal valor;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private StatusPagamento status;

    @Lob
    @com.fasterxml.jackson.annotation.JsonIgnore
    @Column(name = "qr_code_base64")
    private String qrCodeBase64;

    @Column(length = 1024)
    private String qrCodeCopiaCola;

    @Column(length = 500)
    private String urlTicket;

    @Column(nullable = false, updatable = false)
    private LocalDateTime criadaEm;

    private LocalDateTime expiraEm;

    private LocalDateTime aprovadaEm;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "transacao_id")
    private Transacao transacao;

    @PrePersist
    public void prePersist() {
        if (this.criadaEm == null) this.criadaEm = LocalDateTime.now();
        if (this.status == null) this.status = StatusPagamento.PENDENTE;
    }
}
