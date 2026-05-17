package com.merenda.model;

public enum Plano {
    ESSENCIAL(300, "Essencial"),
    ESCOLA(0, "Escola"),     // 0 = ilimitado
    REDE(0, "Rede");

    private final int maxAlunosPadrao;
    private final String nomeExibicao;

    Plano(int maxAlunosPadrao, String nomeExibicao) {
        this.maxAlunosPadrao = maxAlunosPadrao;
        this.nomeExibicao = nomeExibicao;
    }

    public int getMaxAlunosPadrao() { return maxAlunosPadrao; }
    public String getNomeExibicao() { return nomeExibicao; }
    public boolean isIlimitado() { return maxAlunosPadrao == 0; }
}
