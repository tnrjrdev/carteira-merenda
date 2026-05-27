package com.merenda.domain.cantina.service;

import com.merenda.config.exception.NotFoundException;
import com.merenda.domain.cantina.model.Cantina;
import com.merenda.domain.cantina.model.Plano;
import com.merenda.domain.cantina.repository.CantinaRepository;
import com.merenda.domain.carteira.repository.TransacaoRepository;

import com.merenda.config.exception.NotFoundException;
import com.merenda.domain.cantina.model.Cantina;
import com.merenda.domain.cantina.model.Plano;
import com.merenda.domain.cantina.repository.CantinaRepository;
import com.merenda.domain.carteira.repository.TransacaoRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@Service
public class PlanoService {

    private final CantinaRepository cantinaRepository;
    private final TransacaoRepository transacaoRepository;

    public PlanoService(CantinaRepository cantinaRepository, TransacaoRepository transacaoRepository) {
        this.cantinaRepository = cantinaRepository;
        this.transacaoRepository = transacaoRepository;
    }

    public Map<String, Object> uso(Long cantinaId) {
        Cantina cantina = cantinaRepository.findById(cantinaId)
                .orElseThrow(() -> new NotFoundException("Cantina não encontrada"));

        LocalDateTime inicio = LocalDate.now().minusDays(29).atStartOfDay();
        long alunosAtivos30d = transacaoRepository.alunosAtivosDesde(cantinaId, inicio);
        boolean ilimitado = cantina.getPlano() == null || cantina.getPlano().isIlimitado() || cantina.getMaxAlunos() == 0;
        double percentUso = ilimitado ? 0.0
                : Math.min(100.0, (alunosAtivos30d * 100.0) / cantina.getMaxAlunos());

        Map<String, Object> resp = new HashMap<>();
        resp.put("cantinaId", cantina.getId());
        resp.put("cantinaNome", cantina.getNome());
        resp.put("plano", cantina.getPlano() == null ? null : cantina.getPlano().name());
        resp.put("planoNome", cantina.getPlano() == null ? null : cantina.getPlano().getNomeExibicao());
        resp.put("maxAlunos", cantina.getMaxAlunos());
        resp.put("ilimitado", ilimitado);
        resp.put("alunosAtivos30d", alunosAtivos30d);
        resp.put("percentUso", percentUso);
        return resp;
    }

    @Transactional
    public Map<String, Object> atualizarPlano(Long cantinaId, Plano plano, Integer maxAlunos) {
        Cantina cantina = cantinaRepository.findById(cantinaId)
                .orElseThrow(() -> new NotFoundException("Cantina não encontrada"));
        cantina.setPlano(plano);
        cantina.setMaxAlunos(maxAlunos != null ? maxAlunos : plano.getMaxAlunosPadrao());
        cantinaRepository.save(cantina);
        return uso(cantinaId);
    }
}
