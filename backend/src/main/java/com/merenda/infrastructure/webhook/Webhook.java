package com.merenda.infrastructure.webhook;

import com.merenda.domain.cantina.model.Cantina;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "webhooks")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Webhook {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cantina_id", nullable = false)
    private Cantina cantina;

    @Column(nullable = false, length = 500)
    private String url;

    @Column(length = 200)
    private String descricao;

    @com.fasterxml.jackson.annotation.JsonIgnore
    @Column(nullable = false, length = 128)
    private String secret;

    @ElementCollection(targetClass = WebhookEvento.class, fetch = FetchType.EAGER)
    @CollectionTable(name = "webhook_eventos", joinColumns = @JoinColumn(name = "webhook_id"))
    @Enumerated(EnumType.STRING)
    @Column(name = "evento", length = 40)
    @Builder.Default
    private Set<WebhookEvento> eventos = new HashSet<>();

    @Column(nullable = false)
    @Builder.Default
    private boolean ativo = true;

    @Column(nullable = false, updatable = false)
    private LocalDateTime criadoEm;

    private LocalDateTime ultimoDisparoEm;

    private Integer ultimoStatusHttp;

    @PrePersist
    public void prePersist() {
        this.criadoEm = LocalDateTime.now();
    }
}
