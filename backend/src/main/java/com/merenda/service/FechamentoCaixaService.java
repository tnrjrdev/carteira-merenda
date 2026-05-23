package com.merenda.service;

import com.merenda.exception.BusinessException;
import com.merenda.model.Cantina;
import com.merenda.model.FechamentoCaixa;
import com.merenda.model.Plano;
import com.merenda.model.TipoTransacao;
import com.merenda.model.Usuario;
import com.merenda.repository.FechamentoCaixaRepository;
import com.merenda.repository.TransacaoRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class FechamentoCaixaService {

    private static final Logger log = LoggerFactory.getLogger(FechamentoCaixaService.class);

    private final FechamentoCaixaRepository fechamentoRepository;
    private final TransacaoRepository transacaoRepository;

    public FechamentoCaixaService(FechamentoCaixaRepository fechamentoRepository,
                                  TransacaoRepository transacaoRepository) {
        this.fechamentoRepository = fechamentoRepository;
        this.transacaoRepository = transacaoRepository;
    }

    @Transactional
    public FechamentoCaixa fechar(Usuario operador, LocalDate dia) {
        if (operador.getCantina() == null) {
            throw new BusinessException("Operador sem cantina vinculada");
        }
        Cantina cantina = operador.getCantina();
        if (fechamentoRepository.findByCantinaIdAndDia(cantina.getId(), dia).isPresent()) {
            throw new BusinessException("Caixa de " + dia + " já está fechado");
        }
        LocalDateTime inicio = dia.atStartOfDay();
        LocalDateTime fim = dia.plusDays(1).atStartOfDay();
        BigDecimal bruto = transacaoRepository.somaCantinaPorTipoDesde(cantina.getId(), TipoTransacao.COMPRA, inicio);
        if (bruto == null) bruto = BigDecimal.ZERO;
        long qtd = transacaoRepository.contarCantinaPorTipoDesde(cantina.getId(), TipoTransacao.COMPRA, inicio);

        // Take rate da plataforma — usa o configurado na cantina ou cai no padrão do plano
        BigDecimal taxaPct = cantina.getTaxaPlataforma();
        if (taxaPct == null) {
            Plano p = cantina.getPlano() == null ? Plano.ESSENCIAL : cantina.getPlano();
            taxaPct = p.getTaxaPlataforma();
        }
        BigDecimal taxa = bruto.multiply(taxaPct).setScale(2, RoundingMode.HALF_UP);
        BigDecimal liquido = bruto.subtract(taxa);

        FechamentoCaixa f = FechamentoCaixa.builder()
                .cantina(cantina)
                .dia(dia)
                .totalBruto(bruto)
                .taxaPlataforma(taxa)
                .totalLiquido(liquido)
                .quantidadeTransacoes((int) qtd)
                .fechadoPor(operador)
                .statusRepasse("PENDENTE")
                .build();
        fechamentoRepository.save(f);

        // Aqui chamaríamos o gateway de marketplace para criar o pagamento ao seller.
        // MOCK: marcamos como REPASSADO imediatamente, com data agora.
        f.setStatusRepasse("REPASSADO");
        f.setRepassadoEm(LocalDateTime.now());
        fechamentoRepository.save(f);

        log.info("[fechamento] cantina={} dia={} bruto={} taxa={} liquido={}",
                cantina.getId(), dia, bruto, taxa, liquido);
        return f;
    }

    public List<FechamentoCaixa> listar(Long cantinaId) {
        return fechamentoRepository.findByCantinaIdOrderByDiaDesc(cantinaId);
    }

    public Map<String, Object> previa(Cantina cantina, LocalDate dia) {
        LocalDateTime inicio = dia.atStartOfDay();
        BigDecimal bruto = transacaoRepository.somaCantinaPorTipoDesde(cantina.getId(), TipoTransacao.COMPRA, inicio);
        if (bruto == null) bruto = BigDecimal.ZERO;
        long qtd = transacaoRepository.contarCantinaPorTipoDesde(cantina.getId(), TipoTransacao.COMPRA, inicio);

        BigDecimal taxaPct = cantina.getTaxaPlataforma();
        if (taxaPct == null) {
            Plano p = cantina.getPlano() == null ? Plano.ESSENCIAL : cantina.getPlano();
            taxaPct = p.getTaxaPlataforma();
        }
        BigDecimal taxa = bruto.multiply(taxaPct).setScale(2, RoundingMode.HALF_UP);

        Map<String, Object> m = new HashMap<>();
        m.put("dia", dia);
        m.put("totalBruto", bruto);
        m.put("taxaPlataformaPct", taxaPct);
        m.put("taxaPlataforma", taxa);
        m.put("totalLiquido", bruto.subtract(taxa));
        m.put("quantidadeTransacoes", qtd);
        m.put("jaFechado", fechamentoRepository.findByCantinaIdAndDia(cantina.getId(), dia).isPresent());
        return m;
    }
}
