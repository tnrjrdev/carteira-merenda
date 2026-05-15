package com.merenda.service;

import com.merenda.dto.PagamentoDto;
import com.merenda.exception.BusinessException;
import com.merenda.exception.NotFoundException;
import com.merenda.model.*;
import com.merenda.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.security.SecureRandom;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.Base64;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class PagamentoService {

    private static final int TOKEN_TTL_SECONDS = 90;
    private static final SecureRandom RANDOM = new SecureRandom();

    private final PagamentoTokenRepository tokenRepository;
    private final UsuarioRepository usuarioRepository;
    private final CarteiraRepository carteiraRepository;
    private final ProdutoRepository produtoRepository;
    private final TransacaoRepository transacaoRepository;
    private final BloqueioCategoriaRepository bloqueioRepository;

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
        if (estudante.getRole() != Role.ESTUDANTE) {
            throw new BusinessException("Somente estudantes podem gerar tokens de pagamento");
        }
        byte[] bytes = new byte[24];
        RANDOM.nextBytes(bytes);
        String tokenValue = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);

        PagamentoToken pt = PagamentoToken.builder()
                .token(tokenValue)
                .estudante(estudante)
                .expiraEm(LocalDateTime.now().plusSeconds(TOKEN_TTL_SECONDS))
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
                .descricao("Compra em " + cantina.getNome())
                .cantina(cantina)
                .build();
        transacaoRepository.save(tx);

        for (ItemTransacao it : itens) {
            it.setTransacao(tx);
        }
        tx.setItens(itens);
        transacaoRepository.save(tx);

        pt.setUtilizado(true);
        tokenRepository.save(pt);

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
}
