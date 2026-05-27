package com.merenda.domain.cantina.service;

import com.merenda.config.exception.BusinessException;
import com.merenda.config.exception.NotFoundException;
import com.merenda.domain.cantina.model.Cantina;
import com.merenda.domain.cantina.model.Fatura;
import com.merenda.domain.cantina.model.Plano;
import com.merenda.domain.cantina.repository.CantinaRepository;
import com.merenda.domain.cantina.repository.FaturaRepository;

import com.merenda.config.exception.BusinessException;
import com.merenda.config.exception.NotFoundException;
import com.merenda.domain.cantina.model.Cantina;
import com.merenda.domain.cantina.model.Fatura;
import com.merenda.domain.cantina.model.Plano;
import com.merenda.domain.cantina.repository.CantinaRepository;
import com.merenda.domain.cantina.repository.FaturaRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.List;
import java.util.UUID;

@Service
public class FaturaSaasService {

    private static final Logger log = LoggerFactory.getLogger(FaturaSaasService.class);

    private final FaturaRepository faturaRepository;
    private final CantinaRepository cantinaRepository;

    public FaturaSaasService(FaturaRepository faturaRepository, CantinaRepository cantinaRepository) {
        this.faturaRepository = faturaRepository;
        this.cantinaRepository = cantinaRepository;
    }

    public List<Fatura> listar(Long cantinaId) {
        return faturaRepository.findByCantinaIdOrderByVencimentoDesc(cantinaId);
    }

    @Transactional
    public Fatura gerarParaCantina(Cantina cantina, YearMonth competencia) {
        String comp = competencia.toString();
        var existente = faturaRepository.findByCantinaIdAndCompetencia(cantina.getId(), comp);
        if (existente.isPresent()) return existente.get();

        Plano plano = cantina.getPlano() == null ? Plano.ESSENCIAL : cantina.getPlano();
        BigDecimal valor = cantina.getMensalidadeSaas() != null
                ? cantina.getMensalidadeSaas()
                : plano.getMensalidade();
        int dia = cantina.getDiaCobrancaMensalidade() == null ? 5 : cantina.getDiaCobrancaMensalidade();
        if (dia < 1 || dia > 28) dia = 5;
        LocalDate venc = competencia.atDay(dia);

        Fatura f = Fatura.builder()
                .cantina(cantina)
                .competencia(comp)
                .plano(plano)
                .valor(valor)
                .vencimento(venc)
                .status("ABERTA")
                .externalId("inv-" + UUID.randomUUID())
                .build();
        return faturaRepository.save(f);
    }

    @Transactional
    public Fatura pagar(Long faturaId) {
        Fatura f = faturaRepository.findById(faturaId)
                .orElseThrow(() -> new NotFoundException("Fatura não encontrada"));
        if ("PAGA".equals(f.getStatus())) throw new BusinessException("Fatura já paga");
        f.setStatus("PAGA");
        f.setPagaEm(LocalDateTime.now());
        return faturaRepository.save(f);
    }

    /** Roda dia 1 de cada mês às 03:00. */
    @Scheduled(cron = "0 0 3 1 * *")
    @Transactional
    public void gerarFaturasDoMes() {
        YearMonth comp = YearMonth.now();
        log.info("[saas-billing] gerando faturas para competência {}", comp);
        int geradas = 0;
        for (Cantina c : cantinaRepository.findByAtivaTrue()) {
            try {
                gerarParaCantina(c, comp);
                geradas++;
            } catch (Exception e) {
                log.error("[saas-billing] falha cantina {}: {}", c.getId(), e.getMessage());
            }
        }
        log.info("[saas-billing] {} faturas geradas/garantidas", geradas);
    }

    /** Marca como ATRASADA o que estiver vencido. Roda 1x/dia. */
    @Scheduled(cron = "0 0 5 * * *")
    @Transactional
    public void marcarAtrasadas() {
        LocalDate hoje = LocalDate.now();
        for (Fatura f : faturaRepository.findByStatus("ABERTA")) {
            if (f.getVencimento().isBefore(hoje)) {
                f.setStatus("ATRASADA");
                faturaRepository.save(f);
            }
        }
    }
}
