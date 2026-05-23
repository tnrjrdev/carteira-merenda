package com.merenda.service;

import com.merenda.exception.BusinessException;
import com.merenda.exception.NotFoundException;
import com.merenda.model.*;
import com.merenda.repository.*;
import com.merenda.gateway.BoletoGateway;
import com.merenda.gateway.CobrancaBoleto;
import com.merenda.gateway.SimulatedBoletoGateway;
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
public class RecargaBoletoService {

    private static final Logger log = LoggerFactory.getLogger(RecargaBoletoService.class);

    private final BoletoGateway gateway;
    private final CarteiraRepository carteiraRepository;
    private final UsuarioRepository usuarioRepository;
    private final RecargaPendenteRepository recargaRepository;
    private final TransacaoRepository transacaoRepository;
    private final NotificacaoService notificacaoService;

    public RecargaBoletoService(BoletoGateway gateway,
                                CarteiraRepository carteiraRepository,
                                UsuarioRepository usuarioRepository,
                                RecargaPendenteRepository recargaRepository,
                                TransacaoRepository transacaoRepository,
                                NotificacaoService notificacaoService) {
        this.gateway = gateway;
        this.carteiraRepository = carteiraRepository;
        this.usuarioRepository = usuarioRepository;
        this.recargaRepository = recargaRepository;
        this.transacaoRepository = transacaoRepository;
        this.notificacaoService = notificacaoService;
    }

    @Transactional
    public Map<String, Object> iniciar(Usuario solicitante, Long estudanteId, BigDecimal valor) {
        if (valor == null || valor.compareTo(new BigDecimal("5.00")) < 0) {
            throw new BusinessException("Valor mínimo do boleto é R$ 5,00");
        }
        Usuario estudante = validarEstudante(solicitante, estudanteId);
        Carteira carteira = garantirCarteira(estudante);

        CobrancaBoleto cob = gateway.criarBoleto(
                valor,
                "Recarga Merenda · " + estudante.getNome(),
                solicitante.getEmail(),
                solicitante.getNome(),
                solicitante.getCpf());

        RecargaPendente r = RecargaPendente.builder()
                .carteira(carteira)
                .solicitadoPor(solicitante)
                .externalId(cob.externalId())
                .gatewayNome(gateway.nome())
                .metodo("BOLETO")
                .valor(valor)
                .status(cob.status())
                .qrCodeCopiaCola(cob.linhaDigitavel())
                .urlTicket(cob.urlBoleto())
                .expiraEm(cob.expiraEm())
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
            if (atual != StatusPagamento.PENDENTE) aplicarStatus(r, atual);
        }
        return montarResposta(r);
    }

    @Transactional
    public void aprovarSimulado(String externalId) {
        if (!(gateway instanceof SimulatedBoletoGateway sim)) {
            throw new BusinessException("Aprovação manual só disponível no gateway simulated");
        }
        sim.aprovarManualmente(externalId);
        recargaRepository.findByExternalId(externalId).ifPresent(r -> {
            if (r.getStatus() == StatusPagamento.PENDENTE) aplicarStatus(r, StatusPagamento.APROVADO);
        });
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
                    .descricao("Recarga via Boleto (" + r.getGatewayNome() + ")")
                    .build();
            transacaoRepository.save(tx);

            r.setTransacao(tx);
            r.setAprovadaEm(LocalDateTime.now());

            Usuario responsavel = r.getSolicitadoPor();
            notificacaoService.criar(responsavel, "RECARGA_APROVADA",
                    "Recarga aprovada",
                    "Boleto de R$ " + r.getValor() + " confirmado. Saldo atualizado.",
                    null);
        }
        recargaRepository.save(r);
        log.info("[boleto] Recarga {} → {}", r.getExternalId(), novo);
    }

    private Usuario validarEstudante(Usuario solicitante, Long estudanteId) {
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
            throw new BusinessException("Sem permissão");
        }
        return estudante;
    }

    private Carteira garantirCarteira(Usuario estudante) {
        return carteiraRepository.findByEstudanteId(estudante.getId())
                .orElseGet(() -> carteiraRepository.save(Carteira.builder()
                        .estudante(estudante).saldo(BigDecimal.ZERO).build()));
    }

    private void verificarAcesso(Usuario solicitante, RecargaPendente r) {
        if (solicitante.getRole() == Role.ADMIN) return;
        if (solicitante.getRole() == Role.RESPONSAVEL
                && r.getCarteira().getEstudante().getResponsavel() != null
                && r.getCarteira().getEstudante().getResponsavel().getId().equals(solicitante.getId())) {
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
        m.put("linhaDigitavel", r.getQrCodeCopiaCola());
        m.put("urlBoleto", r.getUrlTicket());
        m.put("status", r.getStatus().name());
        m.put("expiraEm", r.getExpiraEm());
        m.put("aprovadaEm", r.getAprovadaEm());
        m.put("estudanteId", r.getCarteira().getEstudante().getId());
        m.put("estudanteNome", r.getCarteira().getEstudante().getNome());
        return m;
    }
}
