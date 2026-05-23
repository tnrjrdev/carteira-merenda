package com.merenda.model;

import java.math.BigDecimal;

public enum Plano {
    ESSENCIAL(300, "Essencial", new BigDecimal("149.00"), new BigDecimal("0.04")),
    ESCOLA(0, "Escola", new BigDecimal("399.00"), new BigDecimal("0.03")),
    REDE(0, "Rede", new BigDecimal("999.00"), new BigDecimal("0.02"));

    private final int maxAlunosPadrao;
    private final String nomeExibicao;
    private final BigDecimal mensalidade;
    private final BigDecimal taxaPlataforma;

    Plano(int maxAlunosPadrao, String nomeExibicao, BigDecimal mensalidade, BigDecimal taxaPlataforma) {
        this.maxAlunosPadrao = maxAlunosPadrao;
        this.nomeExibicao = nomeExibicao;
        this.mensalidade = mensalidade;
        this.taxaPlataforma = taxaPlataforma;
    }

    public int getMaxAlunosPadrao() { return maxAlunosPadrao; }
    public String getNomeExibicao() { return nomeExibicao; }
    public BigDecimal getMensalidade() { return mensalidade; }
    public BigDecimal getTaxaPlataforma() { return taxaPlataforma; }
    public boolean isIlimitado() { return maxAlunosPadrao == 0; }
}
