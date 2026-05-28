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
import com.merenda.infrastructure.gateway.CartaoGateway;
import com.merenda.infrastructure.gateway.CobrancaCartao;
import com.merenda.infrastructure.gateway.MercadoPagoCartaoGateway;
import com.merenda.infrastructure.gateway.StatusPagamento;
import com.merenda.service.NotificacaoService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

/**
 * Auto-recarga: quando o saldo do estudante fica abaixo de `saldoMinimo`, cobra
 * automaticamente `valorRecarga` do cartão salvo do responsável.
 *
 * Reusa o mesmo cartão salvo no Mercado Pago (Customer + Card API). Para reduzir
 * carga e evitar spam de cobrança, o serviço aplica throttle: no máximo 1 tentativa
 * por hora por carteira, e suspende auto-recarga após 3 falhas seguidas.
 */
@Service
public class AutoRecargaService {

    private static final Logger log = LoggerFactory.getLogger(AutoRecargaService.class);
    private static final long THROTTLE_SEGUNDOS = 3600;

    private final CartaoGateway cartaoGateway;
    private final CarteiraRepository carteiraRepository;
    private final RecargaPendenteRepository recargaRepository;
    private final TransacaoRepository transacaoRepository;
    private final NotificacaoService notificacaoService;

    public AutoRecargaService(CartaoGateway cartaoGateway,
                              CarteiraRepository carteiraRepository,
                              RecargaPendenteRepository recargaRepository,
                              TransacaoRepository transacaoRepository,
                              NotificacaoService notificacaoService) {
        this.cartaoGateway = cartaoGateway;
        this.carteiraRepository = carteiraRepository;
        this.recargaRepository = recargaRepository;
        this.transacaoRepository = transacaoRepository;
        this.notificacaoService = notificacaoService;
    }

    /** Configura/atualiza auto-recarga. Se `cardToken` fornecido, salva novo cartão no MP. */
    @Transactional
    public Map<String, Object> configurar(Usuario responsavel, Long estudanteId,
                                          boolean ativa, BigDecimal saldoMinimo, BigDecimal valorRecarga,
                                          String cardToken) {
        if (responsavel.getRole() != Role.RESPONSAVEL && responsavel.getRole() != Role.ADMIN) {
            throw new BusinessException("Apenas responsáveis configuram auto-recarga");
        }
        Carteira carteira = carteiraRepository.findByEstudanteId(estudanteId)
                .orElseThrow(() -> new NotFoundException("Carteira não encontrada"));
        if (responsavel.getRole() == Role.RESPONSAVEL
                && (carteira.getEstudante().getResponsavel() == null
                || !carteira.getEstudante().getResponsavel().getId().equals(responsavel.getId()))) {
            throw new BusinessException("Estudante não pertence a este responsável");
        }

        if (ativa) {
            if (saldoMinimo == null || saldoMinimo.compareTo(BigDecimal.ZERO) <= 0) {
                throw new BusinessException("Saldo mínimo precisa ser maior que zero");
            }
            if (valorRecarga == null || valorRecarga.compareTo(BigDecimal.ONE) < 0) {
                throw new BusinessException("Valor de recarga mínimo R$ 1,00");
            }
            if (cardToken != null && !cardToken.isBlank()) {
                if (!(cartaoGateway instanceof MercadoPagoCartaoGateway mp)) {
                    throw new BusinessException("Auto-recarga via cartão exige gateway Mercado Pago configurado");
                }
                Map<String, String> saved = mp.salvarCartao(responsavel.getEmail(), cardToken);
                carteira.setMpCustomerId(saved.get("customerId"));
                carteira.setMpCardId(saved.get("cardId"));
                carteira.setCardBandeira(saved.get("bandeira"));
                carteira.setCardUltimos4(saved.get("ultimos4"));
            }
            if (carteira.getMpCardId() == null) {
                throw new BusinessException("Salve um cartão antes de ativar a auto-recarga");
            }
            carteira.setSaldoMinimo(saldoMinimo);
            carteira.setValorRecarga(valorRecarga);
            carteira.setAutoRecargaAtiva(true);
            carteira.setUltimaFalhaAutoRecarga(null);
            carteira.setUltimaFalhaAutoRecargaEm(null);
        } else {
            carteira.setAutoRecargaAtiva(false);
        }
        carteiraRepository.save(carteira);
        return montarResposta(carteira);
    }

    /** Remove cartão salvo (mas mantém configuração). */
    @Transactional
    public Map<String, Object> removerCartao(Usuario responsavel, Long estudanteId) {
        Carteira c = validarAcesso(responsavel, estudanteId);
        c.setMpCustomerId(null);
        c.setMpCardId(null);
        c.setCardBandeira(null);
        c.setCardUltimos4(null);
        c.setAutoRecargaAtiva(false);
        carteiraRepository.save(c);
        return montarResposta(c);
    }

    public Map<String, Object> consultar(Usuario responsavel, Long estudanteId) {
        Carteira c = validarAcesso(responsavel, estudanteId);
        return montarResposta(c);
    }

    /**
     * Disparado após cada compra; verifica se precisa recarregar e cobra cartão salvo.
     * NÃO joga exceções para fora — falhas são logadas e notificadas ao responsável.
     */
    @Transactional
    public void tentarAposCompra(Carteira carteira) {
        try {
            if (carteira == null || !carteira.isAutoRecargaAtiva()) return;
            if (carteira.getSaldoMinimo() == null || carteira.getValorRecarga() == null) return;
            if (carteira.getSaldo().compareTo(carteira.getSaldoMinimo()) >= 0) return;
            if (carteira.getMpCardId() == null || carteira.getMpCustomerId() == null) return;

            // Throttle: não tenta mais de 1× por hora
            if (carteira.getUltimaAutoRecargaEm() != null
                    && carteira.getUltimaAutoRecargaEm().plusSeconds(THROTTLE_SEGUNDOS).isAfter(LocalDateTime.now())) {
                return;
            }
            if (carteira.getUltimaFalhaAutoRecargaEm() != null
                    && carteira.getUltimaFalhaAutoRecargaEm().plusSeconds(THROTTLE_SEGUNDOS).isAfter(LocalDateTime.now())) {
                return;
            }

            if (!(cartaoGateway instanceof MercadoPagoCartaoGateway mp)) {
                log.debug("[auto-recarga] gateway não é Mercado Pago, ignorando");
                return;
            }

            CobrancaCartao cob = mp.cobrarComCartaoSalvo(
                    carteira.getMpCustomerId(), carteira.getMpCardId(), null,
                    carteira.getValorRecarga(),
                    "Auto-recarga Merenda · " + carteira.getEstudante().getNome());

            RecargaPendente r = RecargaPendente.builder()
                    .carteira(carteira)
                    .solicitadoPor(carteira.getEstudante().getResponsavel())
                    .externalId(cob.externalId())
                    .gatewayNome(mp.nome())
                    .metodo("AUTO_CARTAO")
                    .valor(cob.valorBruto())
                    .taxaConveniencia(cob.taxaConveniencia())
                    .valorLiquidoCreditado(cob.valorLiquidoCreditado())
                    .status(cob.status())
                    .qrCodeCopiaCola((cob.bandeira() == null ? "?" : cob.bandeira()) + " •••• " + cob.ultimosDigitos())
                    .build();
            recargaRepository.save(r);

            Usuario responsavel = carteira.getEstudante().getResponsavel();
            if (cob.status() == StatusPagamento.APROVADO) {
                BigDecimal credito = cob.valorLiquidoCreditado() != null
                        ? cob.valorLiquidoCreditado() : cob.valorBruto();
                carteira.setSaldo(carteira.getSaldo().add(credito));
                carteira.setUltimaAutoRecargaEm(LocalDateTime.now());
                carteira.setUltimaFalhaAutoRecarga(null);
                carteira.setUltimaFalhaAutoRecargaEm(null);

                Transacao tx = Transacao.builder()
                        .carteira(carteira)
                        .tipo(TipoTransacao.RECARGA)
                        .valor(credito)
                        .saldoApos(carteira.getSaldo())
                        .descricao("Auto-recarga " + (cob.bandeira() == null ? "" : cob.bandeira())
                                + " •••• " + cob.ultimosDigitos())
                        .build();
                transacaoRepository.save(tx);
                r.setTransacao(tx);
                r.setAprovadaEm(LocalDateTime.now());
                recargaRepository.save(r);

                if (responsavel != null) {
                    notificacaoService.criar(responsavel, "AUTO_RECARGA",
                            "Auto-recarga realizada",
                            "R$ " + credito + " creditados em " + carteira.getEstudante().getNome()
                                    + " (saldo estava em R$ " + carteira.getSaldo().subtract(credito) + ").",
                            null);
                }
                log.info("[auto-recarga] OK estudante={} valor={} novoSaldo={}",
                        carteira.getEstudante().getId(), credito, carteira.getSaldo());
            } else {
                carteira.setUltimaFalhaAutoRecarga(
                        truncate(cob.mensagem() == null ? cob.status().name() : cob.mensagem(), 290));
                carteira.setUltimaFalhaAutoRecargaEm(LocalDateTime.now());
                if (responsavel != null) {
                    notificacaoService.criar(responsavel, "AUTO_RECARGA_FALHA",
                            "Auto-recarga falhou",
                            "Não conseguimos cobrar o cartão de " + carteira.getEstudante().getNome()
                                    + ": " + cob.mensagem(),
                            "/responsavel/dependente/" + carteira.getEstudante().getId());
                }
                log.warn("[auto-recarga] falha estudante={} motivo={}",
                        carteira.getEstudante().getId(), cob.mensagem());
            }
            carteiraRepository.save(carteira);
        } catch (Exception e) {
            log.error("[auto-recarga] exceção inesperada estudante={}: {}",
                    carteira == null ? "?" : carteira.getEstudante().getId(), e.getMessage());
        }
    }

    private Carteira validarAcesso(Usuario solicitante, Long estudanteId) {
        Carteira c = carteiraRepository.findByEstudanteId(estudanteId)
                .orElseThrow(() -> new NotFoundException("Carteira não encontrada"));
        if (solicitante.getRole() == Role.ADMIN) return c;
        if (solicitante.getRole() == Role.RESPONSAVEL
                && c.getEstudante().getResponsavel() != null
                && c.getEstudante().getResponsavel().getId().equals(solicitante.getId())) return c;
        throw new BusinessException("Sem permissão");
    }

    private Map<String, Object> montarResposta(Carteira c) {
        Map<String, Object> m = new HashMap<>();
        m.put("estudanteId", c.getEstudante().getId());
        m.put("ativa", c.isAutoRecargaAtiva());
        m.put("saldoMinimo", c.getSaldoMinimo());
        m.put("valorRecarga", c.getValorRecarga());
        m.put("cardBandeira", c.getCardBandeira());
        m.put("cardUltimos4", c.getCardUltimos4());
        m.put("temCartao", c.getMpCardId() != null);
        m.put("ultimaAutoRecargaEm", c.getUltimaAutoRecargaEm());
        m.put("ultimaFalha", c.getUltimaFalhaAutoRecarga());
        m.put("ultimaFalhaEm", c.getUltimaFalhaAutoRecargaEm());
        return m;
    }

    private static String truncate(String s, int max) {
        if (s == null) return null;
        return s.length() <= max ? s : s.substring(0, max);
    }
}
