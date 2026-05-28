package com.merenda.domain.carteira.model;

import com.merenda.domain.usuario.model.Usuario;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "mesadas",
        uniqueConstraints = @UniqueConstraint(columnNames = {"estudante_id"}))
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Mesada {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "estudante_id", nullable = false, unique = true)
    private Usuario estudante;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "responsavel_id", nullable = false)
    private Usuario responsavel;

    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal valor;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 12)
    private FrequenciaMesada frequencia;

    @Enumerated(EnumType.STRING)
    @Column(length = 10)
    private DayOfWeek diaSemana;

    private Integer diaMes;

    @Column(nullable = false)
    private boolean ativa = true;

    private LocalDate ultimaExecucao;

    /** Quando true, em cada execução o backend tenta cobrar o cartão salvo do responsável (MP). */
    @Column(nullable = false)
    private boolean cobrarDoCartao = false;

    private String mpCustomerId;
    private String mpCardId;
    @Column(length = 20)
    private String cardBandeira;
    @Column(length = 4)
    private String cardUltimos4;

    /** Última falha de cobrança no cartão (para mostrar ao responsável). */
    @Column(length = 300)
    private String ultimaFalhaCobranca;
    private LocalDate ultimaFalhaEm;

    @Column(nullable = false, updatable = false)
    private LocalDateTime criadaEm;

    @PrePersist
    public void prePersist() {
        this.criadaEm = LocalDateTime.now();
    }

    public enum FrequenciaMesada {
        DIARIA,
        SEMANAL,
        QUINZENAL,
        MENSAL
    }
}
