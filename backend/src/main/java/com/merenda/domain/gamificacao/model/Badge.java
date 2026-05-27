package com.merenda.domain.gamificacao.model;


import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "badges")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Badge {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 40)
    private String codigo;

    @Column(nullable = false)
    private String nome;

    @Column(length = 300)
    private String descricao;

    @Column(length = 20)
    private String emoji;

    @Column(nullable = false)
    private Integer pontos = 10;
}
