package com.merenda.domain.carteira.service;

import com.merenda.config.exception.BusinessException;
import com.merenda.config.exception.NotFoundException;
import com.merenda.domain.bloqueio.repository.BloqueioCategoriaRepository;
import com.merenda.domain.cantina.model.Cantina;
import com.merenda.domain.cantina.model.Plano;
import com.merenda.domain.cantina.model.Produto;
import com.merenda.domain.cantina.repository.ProdutoRepository;
import com.merenda.domain.carteira.dto.PagamentoDto;
import com.merenda.domain.carteira.model.Carteira;
import com.merenda.domain.carteira.model.ItemTransacao;
import com.merenda.domain.carteira.model.PagamentoToken;
import com.merenda.domain.carteira.model.TipoTransacao;
import com.merenda.domain.carteira.model.Transacao;
import com.merenda.domain.carteira.repository.CarteiraRepository;
import com.merenda.domain.carteira.repository.PagamentoTokenRepository;
import com.merenda.domain.carteira.repository.TransacaoRepository;
import com.merenda.domain.gamificacao.service.GamificacaoService;
import com.merenda.domain.usuario.model.Role;
import com.merenda.domain.usuario.model.Usuario;
import com.merenda.domain.usuario.repository.UsuarioRepository;
import com.merenda.infrastructure.webhook.WebhookDispatcher;
import com.merenda.infrastructure.webhook.WebhookEvento;

import com.merenda.domain.carteira.dto.PagamentoDto;
import com.merenda.config.exception.BusinessException;
import com.merenda.config.exception.NotFoundException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.security.SecureRandom;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Base64;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class PagamentoService {

    private static final int TOKEN_TTL_SECONDS = 90;
    private static final int NFC_TOKEN_TTL_SECONDS = 30;
    private static final SecureRandom RANDOM = new SecureRandom();

    private final PagamentoTokenRepository tokenRepository;
    private final UsuarioRepository usuarioRepository;
    private final CarteiraRepository carteiraRepository;
    private final ProdutoRepository produtoRepository;
    private final TransacaoRepository transacaoRepository;
    private final BloqueioCategoriaRepository bloqueioRepository;

    @Autowired(required = false)
    private WebhookDispatcher webhookDispatcher;

    @Autowired(required = false)
    private NotificacaoService notificacaoService;

    @Autowired(required = false)
    private GamificacaoService gamificacaoService;

    public PagamentoService(PagamentoTokenRepository tokenRepository,
                            UsuarioRepository usuarioRepository,
                            CarteiraRepository carteiraRepository,
                            ProdutoRepository produtoRepository,
                            TransacaoRepository transacaoRepository,
                            BloqueioCategoriaRepository bloqueioRepository) {
        this.tokenRepository = tokenRepository;
        this.usuarioRepository = usuarioRepository;
        this.carteiraRepository = carteiraRepository;
        this.produtoRepository = produtoRepository;
        this.transacaoRepository = transacaoRepository;
        this.bloqueioRepository = bloqueioRepository;
    }

    @Transactional
    public PagamentoDto.TokenResponse gerarToken(Usuario estudante) {
        return gerarTokenInterno(estudante, "QR", TOKEN_TTL_SECONDS);
    }

    @Transactional
    public PagamentoDto.TokenResponse gerarTokenNfc(Usuario estudante) {
        return gerarTokenInterno(estudante, "NFC", NFC_TOKEN_TTL_SECONDS);
    }

    private PagamentoDto.TokenResponse gerarTokenInterno(Usuario estudante, String canal, int ttlSeconds) {
        if (estudante.getRole() != Role.ESTUDANTE) {
            throw new BusinessException("Somente estudantes podem gerar tokens de pagamento");
        }
        byte[] bytes = new byte[24];
        RANDOM.nextBytes(bytes);
        String tokenValue = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);

        PagamentoToken pt = PagamentoToken.builder()
                .token(tokenValue)
                .estudante(estudante)
                .canal(canal)
                .expiraEm(LocalDateTime.now().plusSeconds(ttlSeconds))
                .utilizado(false)
                .build();
        tokenRepository.save(pt);
        return new PagamentoDto.TokenResponse(pt.getToken(), pt.getExpiraEm(),
                estudante.getId(), estudante.getNome());
    }

    @Transactional
    public PagamentoDto.CobrancaResponse cobrar(Usuario operador, PagamentoDto.CobrancaRequest req) {
        if (operador.getRole() != Role.CANTINA) {
            throw new BusinessException("Apenas operadores de cantina podem cobrar");
        }
        Cantina cantina = operador.getCantina();
        if (cantina == null) {
            throw new BusinessException("Operador sem cantina vinculada");
        }

        PagamentoToken pt = tokenRepository.findByToken(req.token())
                .orElseThrow(() -> new NotFoundException("Token de pagamento inválido"));
        if (pt.isUtilizado()) {
            throw new BusinessException("Token já utilizado");
        }
        if (pt.getExpiraEm().isBefore(LocalDateTime.now())) {
            throw new BusinessException("Token expirado - peça ao aluno para gerar outro");
        }

        Usuario estudante = pt.getEstudante();
        Carteira carteira = carteiraRepository.findByEstudanteId(estudante.getId())
                .orElseThrow(() -> new NotFoundException("Carteira não encontrada"));

        List<Long> bloqueadas = bloqueioRepository.findByCarteiraId(carteira.getId()).stream()
                .map(b -> b.getCategoria().getId())
                .toList();

        Set<String> alergiasEstudante = parseCsvLower(estudante.getAlergias());

        Map<Long, Integer> agregadas = new HashMap<>();
        for (PagamentoDto.ItemRequest it : req.itens()) {
            agregadas.merge(it.produtoId(), it.quantidade(), Integer::sum);
        }

        BigDecimal total = BigDecimal.ZERO;
        List<ItemTransacao> itens = new ArrayList<>();

        for (Map.Entry<Long, Integer> e : agregadas.entrySet()) {
            Produto p = produtoRepository.findById(e.getKey())
                    .orElseThrow(() -> new NotFoundException("Produto " + e.getKey() + " não encontrado"));
            if (!p.getCantina().getId().equals(cantina.getId())) {
                throw new BusinessException("Produto " + p.getNome() + " não pertence a esta cantina");
            }
            if (!p.isDisponivel()) {
                throw new BusinessException("Produto " + p.getNome() + " está indisponível");
            }
            if (p.getEstoque() != null && p.getEstoque() < e.getValue()) {
                throw new BusinessException("Estoque insuficiente para " + p.getNome());
            }
            if (p.getCategoria() != null && bloqueadas.contains(p.getCategoria().getId())) {
                throw new BusinessException("O responsável bloqueou a categoria \""
                        + p.getCategoria().getNome() + "\" - não é possível comprar " + p.getNome());
            }
            String alergenoConflitante = primeiraInterseccao(alergiasEstudante, parseCsvLower(p.getAlergenos()));
            if (alergenoConflitante != null) {
                throw new BusinessException("ALERGIA: " + p.getNome()
                        + " contém \"" + alergenoConflitante + "\", registrado nas alergias do aluno");
            }

            BigDecimal subtotal = p.getPreco().multiply(BigDecimal.valueOf(e.getValue()));
            total = total.add(subtotal);

            if (p.getEstoque() != null) {
                p.setEstoque(p.getEstoque() - e.getValue());
                produtoRepository.save(p);
            }

            itens.add(ItemTransacao.builder()
                    .produto(p)
                    .nomeProduto(p.getNome())
                    .quantidade(e.getValue())
                    .precoUnitario(p.getPreco())
                    .subtotal(subtotal)
                    .build());
        }

        if (carteira.getSaldo().compareTo(total) < 0) {
            throw new BusinessException("Saldo insuficiente. Saldo: R$ " + carteira.getSaldo()
                    + " | Total: R$ " + total);
        }

        validarLimites(carteira, total);

        carteira.setSaldo(carteira.getSaldo().subtract(total));
        carteiraRepository.save(carteira);

        Transacao tx = Transacao.builder()
                .carteira(carteira)
                .tipo(TipoTransacao.COMPRA)
                .valor(total)
                .saldoApos(carteira.getSaldo())
                .descricao("Compra em " + cantina.getNome() + " · " + pt.getCanal())
                .cantina(cantina)
                .build();
        transacaoRepository.save(tx);

        for (ItemTransacao it : itens) {
            it.setTransacao(tx);
        }
        tx.setItens(itens);
        transacaoRepository.save(tx);

        // Registro da taxa de plataforma (apenas marcação contábil, não mexe no saldo do estudante).
        BigDecimal taxaPct = cantina.getTaxaPlataforma();
        if (taxaPct == null) {
            Plano pl = cantina.getPlano() == null ? Plano.ESSENCIAL : cantina.getPlano();
            taxaPct = pl.getTaxaPlataforma();
        }
        if (taxaPct != null && taxaPct.compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal taxa = total.multiply(taxaPct).setScale(2, RoundingMode.HALF_UP);
            Transacao taxaTx = Transacao.builder()
                    .carteira(carteira)
                    .tipo(TipoTransacao.TAXA_PLATAFORMA)
                    .valor(taxa)
                    .saldoApos(carteira.getSaldo())
                    .descricao("Taxa plataforma " + taxaPct.multiply(BigDecimal.valueOf(100))
                            .setScale(2, RoundingMode.HALF_UP) + "% sobre compra #" + tx.getId())
                    .cantina(cantina)
                    .build();
            transacaoRepository.save(taxaTx);
        }

        pt.setUtilizado(true);
        tokenRepository.save(pt);

        if (webhookDispatcher != null) {
            Map<String, Object> payload = new HashMap<>();
            payload.put("transacaoId", tx.getId());
            payload.put("estudanteId", estudante.getId());
            payload.put("estudanteNome", estudante.getNome());
            payload.put("total", total);
            payload.put("saldoApos", carteira.getSaldo());
            payload.put("canal", pt.getCanal());
            payload.put("itens", itens.stream().map(it -> {
                Map<String, Object> mi = new HashMap<>();
                mi.put("produto", it.getNomeProduto());
                mi.put("quantidade", it.getQuantidade());
                mi.put("precoUnitario", it.getPrecoUnitario());
                mi.put("subtotal", it.getSubtotal());
                return mi;
            }).toList());
            webhookDispatcher.dispatch(cantina.getId(), WebhookEvento.COMPRA_REALIZADA, payload);
        }

        // Notificação ao responsável (extrato em tempo real)
        if (notificacaoService != null && estudante.getResponsavel() != null) {
            notificacaoService.criar(estudante.getResponsavel(), "COMPRA",
                    "Compra de " + estudante.getNome(),
                    "R$ " + total + " em " + cantina.getNome() + " · saldo R$ " + carteira.getSaldo(),
                    "/responsavel/dependente/" + estudante.getId());
        }
        if (gamificacaoService != null) {
            try {
                gamificacaoService.avaliarAposCompra(estudante, carteira.getId(), total, itens);
            } catch (Exception ex) {
                // gamificação nunca quebra o fluxo de cobrança
            }
        }

        return new PagamentoDto.CobrancaResponse(tx.getId(), total, carteira.getSaldo(),
                estudante.getNome(), tx.getCriadaEm());
    }

    private void validarLimites(Carteira carteira, BigDecimal valorCompra) {
        if (carteira.getLimiteDiario() != null) {
            LocalDateTime inicioDia = LocalDate.now().atStartOfDay();
            BigDecimal gastoHoje = transacaoRepository.somaPorTipoDesde(
                    carteira.getId(), TipoTransacao.COMPRA, inicioDia);
            if (gastoHoje == null) gastoHoje = BigDecimal.ZERO;
            if (gastoHoje.add(valorCompra).compareTo(carteira.getLimiteDiario()) > 0) {
                throw new BusinessException("Limite diário excedido. Limite: R$ "
                        + carteira.getLimiteDiario() + " | Gasto hoje: R$ " + gastoHoje);
            }
        }
        if (carteira.getLimiteSemanal() != null) {
            LocalDateTime inicioSemana = LocalDate.now()
                    .with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))
                    .atTime(LocalTime.MIN);
            BigDecimal gastoSemana = transacaoRepository.somaPorTipoDesde(
                    carteira.getId(), TipoTransacao.COMPRA, inicioSemana);
            if (gastoSemana == null) gastoSemana = BigDecimal.ZERO;
            if (gastoSemana.add(valorCompra).compareTo(carteira.getLimiteSemanal()) > 0) {
                throw new BusinessException("Limite semanal excedido. Limite: R$ "
                        + carteira.getLimiteSemanal() + " | Gasto semana: R$ " + gastoSemana);
            }
        }
    }

    private Set<String> parseCsvLower(String csv) {
        if (csv == null || csv.isBlank()) return Set.of();
        Set<String> out = new HashSet<>();
        for (String part : csv.split(",")) {
            String t = part.trim().toLowerCase();
            if (!t.isEmpty()) out.add(t);
        }
        return out;
    }

    private String primeiraInterseccao(Set<String> a, Set<String> b) {
        if (a.isEmpty() || b.isEmpty()) return null;
        for (String s : a) {
            for (String t : b) {
                if (s.equals(t) || s.contains(t) || t.contains(s)) {
                    return s;
                }
            }
        }
        return null;
    }
}
