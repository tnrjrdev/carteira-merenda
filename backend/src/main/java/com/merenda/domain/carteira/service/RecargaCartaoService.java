package com.merenda.domain.carteira.service;

import com.merenda.config.exception.BusinessException;
import com.merenda.config.exception.NotFoundException;
import com.merenda.domain.carteira.model.Carteira;
import com.merenda.domain.carteira.model.RecargaPendente;
import com.merenda.domain.carteira.model.TipoTransacao;
import com.merenda.domain.carteira.model.Transacao;
import com.merenda.domain.carteira.repository.CarteiraRepository;
import com.merenda.domain.carteira.repository.RecargaPendenteRepository;
import com.merenda.domain.carteira.repository.TransacaoRepository;
import com.merenda.domain.usuario.model.Role;
import com.merenda.domain.usuario.model.Usuario;
import com.merenda.domain.usuario.repository.UsuarioRepository;
import com.merenda.infrastructure.gateway.CartaoGateway;
import com.merenda.infrastructure.gateway.CobrancaCartao;
import com.merenda.infrastructure.gateway.StatusPagamento;

import com.merenda.config.exception.BusinessException;
import com.merenda.config.exception.NotFoundException;
import com.merenda.infrastructure.gateway.CartaoGateway;
import com.merenda.infrastructure.gateway.CobrancaCartao;
import com.merenda.infrastructure.gateway.StatusPagamento;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@Service
public class RecargaCartaoService {

    private static final Logger log = LoggerFactory.getLogger(RecargaCartaoService.class);

    private final CartaoGateway gateway;
    private final CarteiraRepository carteiraRepository;
    private final UsuarioRepository usuarioRepository;
    private final RecargaPendenteRepository recargaRepository;
    private final TransacaoRepository transacaoRepository;
    private final NotificacaoService notificacaoService;

    public RecargaCartaoService(CartaoGateway gateway,
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
    public Map<String, Object> cobrar(Usuario solicitante, Long estudanteId,
                                      BigDecimal valor, String cardToken, Integer parcelas) {
        if (valor == null || valor.compareTo(BigDecimal.ONE) < 0) {
            throw new BusinessException("Valor mínimo é R$ 1,00");
        }
        if (cardToken == null || cardToken.isBlank()) {
            throw new BusinessException("Token do cartão é obrigatório");
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
            throw new BusinessException("Sem permissão");
        }

        Carteira carteira = carteiraRepository.findByEstudanteId(estudante.getId())
                .orElseGet(() -> carteiraRepository.save(Carteira.builder()
                        .estudante(estudante).saldo(BigDecimal.ZERO).build()));

        CobrancaCartao cob = gateway.cobrar(valor, cardToken,
                "Recarga Merenda · " + estudante.getNome(),
                solicitante.getEmail(),
                solicitante.getNome(),
                parcelas == null || parcelas < 1 ? 1 : parcelas);

        RecargaPendente r = RecargaPendente.builder()
                .carteira(carteira)
                .solicitadoPor(solicitante)
                .externalId(cob.externalId())
                .gatewayNome(gateway.nome())
                .metodo("CARTAO")
                .valor(cob.valorBruto())
                .taxaConveniencia(cob.taxaConveniencia())
                .valorLiquidoCreditado(cob.valorLiquidoCreditado())
                .status(cob.status())
                .qrCodeCopiaCola(cob.bandeira() + " •••• " + cob.ultimosDigitos())
                .build();

        if (cob.status() == StatusPagamento.APROVADO) {
            BigDecimal creditar = cob.valorLiquidoCreditado() != null
                    ? cob.valorLiquidoCreditado() : cob.valorBruto();
            carteira.setSaldo(carteira.getSaldo().add(creditar));
            carteiraRepository.save(carteira);

            Transacao tx = Transacao.builder()
                    .carteira(carteira)
                    .tipo(TipoTransacao.RECARGA)
                    .valor(creditar)
                    .saldoApos(carteira.getSaldo())
                    .descricao("Recarga via Cartão " + cob.bandeira()
                            + " •••• " + cob.ultimosDigitos()
                            + (cob.taxaConveniencia() != null && cob.taxaConveniencia().compareTo(BigDecimal.ZERO) > 0
                                    ? " (taxa R$ " + cob.taxaConveniencia() + ")" : ""))
                    .build();
            transacaoRepository.save(tx);

            r.setTransacao(tx);
            r.setAprovadaEm(LocalDateTime.now());

            notificacaoService.criar(solicitante, "RECARGA_APROVADA",
                    "Recarga aprovada",
                    "Cartão de R$ " + cob.valorBruto() + " confirmado. Crédito líquido R$ " + creditar + ".",
                    null);
        }
        recargaRepository.save(r);

        log.info("[cartao] {} para estudante={} status={}", cob.externalId(), estudante.getId(), cob.status());

        Map<String, Object> m = new HashMap<>();
        m.put("id", r.getId());
        m.put("externalId", r.getExternalId());
        m.put("gateway", r.getGatewayNome());
        m.put("metodo", r.getMetodo());
        m.put("valor", r.getValor());
        m.put("taxaConveniencia", r.getTaxaConveniencia());
        m.put("valorLiquidoCreditado", r.getValorLiquidoCreditado());
        m.put("bandeira", cob.bandeira());
        m.put("ultimosDigitos", cob.ultimosDigitos());
        m.put("status", r.getStatus().name());
        m.put("mensagem", cob.mensagem());
        m.put("aprovadaEm", r.getAprovadaEm());
        m.put("estudanteId", estudante.getId());
        m.put("estudanteNome", estudante.getNome());
        return m;
    }
}
