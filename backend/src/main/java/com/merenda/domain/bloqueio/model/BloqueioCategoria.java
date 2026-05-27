package com.merenda.domain.bloqueio.model;

import com.merenda.domain.cantina.model.Categoria;
import com.merenda.domain.carteira.model.Carteira;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "bloqueios_categoria",
        uniqueConstraints = @UniqueConstraint(columnNames = {"carteira_id", "categoria_id"}))
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BloqueioCategoria {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "carteira_id", nullable = false)
    private Carteira carteira;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "categoria_id", nullable = false)
    private Categoria categoria;

    private String motivo;
}
