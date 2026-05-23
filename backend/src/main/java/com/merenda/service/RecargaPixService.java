package com.merenda.service;

import com.merenda.exception.BusinessException;
import com.merenda.exception.NotFoundException;
import com.merenda.model.*;
import com.merenda.repository.*;
import com.merenda.gateway.CobrancaPix;
import com.merenda.gateway.PagamentoGateway;
import com.merenda.gateway.SimulatedPagamentoGateway;
import com.merenda.gateway.StatusPagamento;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@Service
public class RecargaPixService {

    private static final Logger log = LoggerFactory.getLogger(RecargaPixService.class);

    private final PagamentoGateway gateway;
    private final CarteiraRepository carteiraRepository;
    private final UsuarioRepository usuarioRepository;
    private final RecargaPendenteRepository recargaRepository;
    private final TransacaoRepository transacaoRepository;

    public RecargaPixService(PagamentoGateway gateway,
                             CarteiraRepository carteiraRepository,
                             UsuarioRepository usuarioRepository,
                             RecargaPendenteRepository recargaRepository,
                             TransacaoRepository transacaoRepository) {
        this.gateway = gateway;
        this.carteiraRepository = carteiraRepository;
        this.usuarioRepository = usuarioRepository;
        this.recargaRepository = recargaRepository;
        this.transacaoRepository = transacaoRepository;
    }

    @Transactional
    public Map<String, Object> iniciar(Usuario solicitante, Long estudanteId, BigDecimal valor) {
        if (valor == null || valor.compareTo(BigDecimal.ONE) < 0) {
            throw new BusinessException("Valor mínimo é R$ 1,00");
        }
        Usuario estudante = usuarioRepository.findById(estudanteId)
                .orElseThrow(() -> new NotFoundException("Estudante não encontrado"));
        if (estudante.getRole() != Role.ESTUDANTE) {
            throw new BusinessException("Apenas estudantes recebem recarga");
        }
        if (solicitante.getRole() == Role.RESPONSAVEL) {
            if (estudante.getResponsavel() == null
                    || !estudante.getResponsavel().getId().equals(solicitante.getId())) {
                throw new BusinessException("Estudante não pertence a este responsável");
            }
        } else if (solicitante.getRole() != Role.ADMIN) {
            throw new BusinessException("Sem permissão para iniciar recarga");
        }

        Carteira carteira = carteiraRepository.findByEstudanteId(estudante.getId())
                .orElseGet(() -> carteiraRepository.save(Carteira.builder()
                        .estudante(estudante)
                        .saldo(BigDecimal.ZERO)
                        .build()));

        CobrancaPix cobranca = gateway.criarCobrancaPix(
                valor,
                "Recarga Merenda · " + estudante.getNome(),
                solicitante.getEmail(),
                solicitante.getNome());

        RecargaPendente r = RecargaPendente.builder()
                .carteira(carteira)
                .solicitadoPor(solicitante)
                .externalId(cobranca.externalId())
                .gatewayNome(gateway.nome())
                .metodo("PIX")
                .valor(valor)
                .status(cobranca.status())
                .qrCodeBase64(cobranca.qrCodeBase64())
                .qrCodeCopiaCola(cobranca.qrCodeCopiaCola())
                .urlTicket(cobranca.urlTicket())
                .expiraEm(cobranca.expiraEm())
                .build();
        recargaRepository.save(r);

        return montarResposta(r);
    }

    @Transactional
    public Map<String, Object> consultar(Usuario solicitante, Long recargaId) {
        RecargaPendente r = recargaRepository.findById(recargaId)
                .orElseThrow(() -> new NotFoundException("Recarga não encontrada"));
        verificarAcesso(solicitante, r);

        if (r.getStatus() == StatusPagamento.PENDENTE) {
            StatusPagamento atual = gateway.consultarStatus(r.getExternalId());
            if (atual != StatusPagamento.PENDENTE) {
                aplicarStatus(r, atual);
            }
        }
        return montarResposta(r);
    }

    /** Chamado pelo webhook do gateway externo (sem autenticação de usuário). */
    @Transactional
    public void processarNotificacaoExterna(String externalId) {
        recargaRepository.findByExternalId(externalId).ifPresentOrElse(r -> {
            if (r.getStatus() != StatusPagamento.PENDENTE) {
                log.info("Recarga {} já processada com status {}", externalId, r.getStatus());
                return;
            }
            StatusPagamento atual = gateway.consultarStatus(externalId);
            aplicarStatus(r, atual);
        }, () -> log.warn("Recarga com externalId={} não encontrada", externalId));
    }

    /** Atalho de DEV — só funciona se o gateway ativo for o Simulated. */
    @Transactional
    public void aprovarSimulado(String externalId) {
        if (!(gateway instanceof SimulatedPagamentoGateway sim)) {
            throw new BusinessException("Aprovação manual só está disponível no gateway simulated");
        }
        sim.aprovarManualmente(externalId);
        processarNotificacaoExterna(externalId);
    }

    private void aplicarStatus(RecargaPendente r, StatusPagamento novo) {
        r.setStatus(novo);
        if (novo == StatusPagamento.APROVADO) {
            Carteira c = r.getCarteira();
            c.setSaldo(c.getSaldo().add(r.getValor()));
            carteiraRepository.save(c);

            Transacao tx = Transacao.builder()
                    .carteira(c)
                    .tipo(TipoTransacao.RECARGA)
                    .valor(r.getValor())
                    .saldoApos(c.getSaldo())
                    .descricao("Recarga Pix (" + r.getGatewayNome() + ")")
                    .build();
            transacaoRepository.save(tx);

            r.setTransacao(tx);
            r.setAprovadaEm(LocalDateTime.now());
        }
        recargaRepository.save(r);
        log.info("Recarga {} → {}", r.getExternalId(), novo);
    }

    private void verificarAcesso(Usuario solicitante, RecargaPendente r) {
        if (solicitante.getRole() == Role.ADMIN) return;
        if (solicitante.getRole() == Role.RESPONSAVEL
                && r.getCarteira().getEstudante().getResponsavel() != null
                && r.getCarteira().getEstudante().getResponsavel().getId().equals(solicitante.getId())) {
            return;
        }
        if (solicitante.getRole() == Role.ESTUDANTE
                && r.getCarteira().getEstudante().getId().equals(solicitante.getId())) {
            return;
        }
        throw new BusinessException("Sem permissão para consultar esta recarga");
    }

    private Map<String, Object> montarResposta(RecargaPendente r) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", r.getId());
        m.put("externalId", r.getExternalId());
        m.put("gateway", r.getGatewayNome());
        m.put("metodo", r.getMetodo());
        m.put("valor", r.getValor());
        m.put("taxaConveniencia", r.getTaxaConveniencia());
        m.put("valorLiquidoCreditado", r.getValorLiquidoCreditado());
        m.put("status", r.getStatus().name());
        m.put("qrCodeBase64", r.getQrCodeBase64());
        m.put("qrCodeCopiaCola", r.getQrCodeCopiaCola());
        m.put("urlTicket", r.getUrlTicket());
        m.put("expiraEm", r.getExpiraEm());
        m.put("aprovadaEm", r.getAprovadaEm());
        m.put("estudanteId", r.getCarteira().getEstudante().getId());
        m.put("estudanteNome", r.getCarteira().getEstudante().getNome());
        return m;
    }
}
