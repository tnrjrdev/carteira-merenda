package com.merenda.service;

import com.merenda.domain.cantina.model.Cantina;
import com.merenda.domain.cantina.repository.CantinaRepository;
import com.merenda.domain.carteira.model.TipoTransacao;
import com.merenda.domain.carteira.repository.TransacaoRepository;
import com.merenda.domain.usuario.model.Role;
import com.merenda.domain.usuario.repository.UsuarioRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class AdminRedeService {

    private final CantinaRepository cantinaRepository;
    private final TransacaoRepository transacaoRepository;
    private final UsuarioRepository usuarioRepository;

    public AdminRedeService(CantinaRepository cantinaRepository,
                            TransacaoRepository transacaoRepository,
                            UsuarioRepository usuarioRepository) {
        this.cantinaRepository = cantinaRepository;
        this.transacaoRepository = transacaoRepository;
        this.usuarioRepository = usuarioRepository;
    }

    public Map<String, Object> resumoRede(int dias) {
        LocalDateTime inicio = LocalDate.now().minusDays(dias - 1L).atStartOfDay();
        LocalDateTime inicioHoje = LocalDate.now().atStartOfDay();

        List<Cantina> cantinas = cantinaRepository.findAll();
        long totalResponsaveis = usuarioRepository.findAll().stream()
                .filter(u -> u.getRole() == Role.RESPONSAVEL).count();
        long totalEstudantes = usuarioRepository.findAll().stream()
                .filter(u -> u.getRole() == Role.ESTUDANTE).count();
        long totalOperadores = usuarioRepository.findAll().stream()
                .filter(u -> u.getRole() == Role.CANTINA).count();

        BigDecimal totalReceitaPeriodo = BigDecimal.ZERO;
        long totalTransacoesPeriodo = 0;
        BigDecimal totalReceitaHoje = BigDecimal.ZERO;

        List<Map<String, Object>> porCantina = new ArrayList<>();
        for (Cantina c : cantinas) {
            BigDecimal receita = transacaoRepository.somaCantinaPorTipoDesde(c.getId(), TipoTransacao.COMPRA, inicio);
            BigDecimal hoje = transacaoRepository.somaCantinaPorTipoDesde(c.getId(), TipoTransacao.COMPRA, inicioHoje);
            long count = transacaoRepository.contarCantinaPorTipoDesde(c.getId(), TipoTransacao.COMPRA, inicio);
            long alunosAtivos = transacaoRepository.alunosAtivosDesde(c.getId(), inicio);

            if (receita == null) receita = BigDecimal.ZERO;
            if (hoje == null) hoje = BigDecimal.ZERO;
            totalReceitaPeriodo = totalReceitaPeriodo.add(receita);
            totalReceitaHoje = totalReceitaHoje.add(hoje);
            totalTransacoesPeriodo += count;

            Map<String, Object> linha = new HashMap<>();
            linha.put("id", c.getId());
            linha.put("nome", c.getNome());
            linha.put("escola", c.getEscola());
            linha.put("ativa", c.isAtiva());
            linha.put("receitaPeriodo", receita);
            linha.put("receitaHoje", hoje);
            linha.put("transacoesPeriodo", count);
            linha.put("alunosAtivos", alunosAtivos);
            porCantina.add(linha);
        }

        Map<String, Object> resp = new HashMap<>();
        resp.put("dias", dias);
        resp.put("totalCantinas", cantinas.size());
        resp.put("totalResponsaveis", totalResponsaveis);
        resp.put("totalEstudantes", totalEstudantes);
        resp.put("totalOperadores", totalOperadores);
        resp.put("totalReceitaPeriodo", totalReceitaPeriodo);
        resp.put("totalReceitaHoje", totalReceitaHoje);
        resp.put("totalTransacoesPeriodo", totalTransacoesPeriodo);
        resp.put("porCantina", porCantina);
        return resp;
    }
}
