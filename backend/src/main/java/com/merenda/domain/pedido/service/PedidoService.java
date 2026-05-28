package com.merenda.domain.pedido.service;

import com.merenda.config.exception.BusinessException;
import com.merenda.config.exception.NotFoundException;
import com.merenda.domain.bloqueio.repository.BloqueioCategoriaRepository;
import com.merenda.domain.cantina.model.Cantina;
import com.merenda.domain.cantina.model.Categoria;
import com.merenda.domain.cantina.model.Produto;
import com.merenda.domain.cantina.repository.CantinaRepository;
import com.merenda.domain.cantina.repository.ProdutoRepository;
import com.merenda.domain.carteira.model.Carteira;
import com.merenda.domain.carteira.model.ItemTransacao;
import com.merenda.domain.carteira.model.TipoTransacao;
import com.merenda.domain.carteira.model.Transacao;
import com.merenda.domain.carteira.repository.CarteiraRepository;
import com.merenda.domain.carteira.repository.TransacaoRepository;
import com.merenda.domain.pedido.model.ItemPedido;
import com.merenda.domain.pedido.model.Pedido;
import com.merenda.domain.pedido.model.StatusPedido;
import com.merenda.domain.pedido.repository.PedidoRepository;
import com.merenda.domain.usuario.model.Role;
import com.merenda.domain.usuario.model.Usuario;
import com.merenda.domain.usuario.repository.UsuarioRepository;
import com.merenda.service.NotificacaoService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

@Service
public class PedidoService {

    private final PedidoRepository pedidoRepository;
    private final UsuarioRepository usuarioRepository;
    private final CantinaRepository cantinaRepository;
    private final ProdutoRepository produtoRepository;
    private final CarteiraRepository carteiraRepository;
    private final TransacaoRepository transacaoRepository;
    private final BloqueioCategoriaRepository bloqueioRepository;
    private final NotificacaoService notificacaoService;

    public PedidoService(PedidoRepository pedidoRepository,
                         UsuarioRepository usuarioRepository,
                         CantinaRepository cantinaRepository,
                         ProdutoRepository produtoRepository,
                         CarteiraRepository carteiraRepository,
                         TransacaoRepository transacaoRepository,
                         BloqueioCategoriaRepository bloqueioRepository,
                         NotificacaoService notificacaoService) {
        this.pedidoRepository = pedidoRepository;
        this.usuarioRepository = usuarioRepository;
        this.cantinaRepository = cantinaRepository;
        this.produtoRepository = produtoRepository;
        this.carteiraRepository = carteiraRepository;
        this.transacaoRepository = transacaoRepository;
        this.bloqueioRepository = bloqueioRepository;
        this.notificacaoService = notificacaoService;
    }

    @Transactional
    public Pedido criar(Usuario estudante, Long cantinaId, List<Map<String, Object>> itensReq, LocalDateTime retirada) {
        if (estudante.getRole() != Role.ESTUDANTE) {
            throw new BusinessException("Somente estudantes fazem pré-venda");
        }
        Cantina cantina = cantinaRepository.findById(cantinaId)
                .orElseThrow(() -> new NotFoundException("Cantina não encontrada"));
        if (itensReq == null || itensReq.isEmpty()) {
            throw new BusinessException("Adicione ao menos um item");
        }
        if (itensReq.size() > 50) {
            throw new BusinessException("Máximo de 50 itens por pedido");
        }

        Carteira carteira = carteiraRepository.findByEstudanteId(estudante.getId())
                .orElseThrow(() -> new NotFoundException("Carteira não encontrada"));

        List<Long> bloqueadas = bloqueioRepository.findByCarteiraId(carteira.getId()).stream()
                .map(b -> b.getCategoria().getId())
                .toList();

        Pedido pedido = Pedido.builder()
                .estudante(estudante)
                .cantina(cantina)
                .status(StatusPedido.AGENDADO)
                .total(BigDecimal.ZERO)
                .retiradaPrevista(retirada)
                .codigoRetirada(gerarCodigoRetirada())
                .build();

        BigDecimal total = BigDecimal.ZERO;
        List<ItemPedido> itens = new ArrayList<>();
        for (Map<String, Object> ir : itensReq) {
            Long produtoId = ((Number) ir.get("produtoId")).longValue();
            int qtd = ((Number) ir.get("quantidade")).intValue();
            if (qtd <= 0 || qtd > 99) {
                throw new BusinessException("Quantidade inválida (1-99)");
            }
            Produto p = produtoRepository.findById(produtoId)
                    .orElseThrow(() -> new NotFoundException("Produto " + produtoId + " não encontrado"));
            if (!p.getCantina().getId().equals(cantina.getId())) {
                throw new BusinessException("Produto " + p.getNome() + " não pertence a esta cantina");
            }
            if (!p.isDisponivel()) {
                throw new BusinessException("Produto " + p.getNome() + " indisponível");
            }
            if (p.getCategoria() != null && bloqueadas.contains(p.getCategoria().getId())) {
                throw new BusinessException("Categoria \"" + p.getCategoria().getNome() + "\" bloqueada");
            }
            BigDecimal subtotal = p.getPreco().multiply(BigDecimal.valueOf(qtd));
            total = total.add(subtotal);
            itens.add(ItemPedido.builder()
                    .pedido(pedido)
                    .produto(p)
                    .nomeProduto(p.getNome())
                    .quantidade(qtd)
                    .precoUnitario(p.getPreco())
                    .subtotal(subtotal)
                    .build());
        }

        if (carteira.getSaldo().compareTo(total) < 0) {
            throw new BusinessException("Saldo insuficiente. Saldo: R$ " + carteira.getSaldo() + " | Total: R$ " + total);
        }

        // Reserva o saldo já no pedido (debita do estudante, transação CASH-OUT amarrada ao Pedido)
        carteira.setSaldo(carteira.getSaldo().subtract(total));
        carteiraRepository.save(carteira);

        Transacao tx = Transacao.builder()
                .carteira(carteira)
                .tipo(TipoTransacao.COMPRA)
                .valor(total)
                .saldoApos(carteira.getSaldo())
                .descricao("Pré-venda em " + cantina.getNome() + " (código " + pedido.getCodigoRetirada() + ")")
                .cantina(cantina)
                .build();
        transacaoRepository.save(tx);

        // grava itens da transação espelhando os itens do pedido (para o extrato detalhado)
        List<ItemTransacao> itensTx = new ArrayList<>();
        for (ItemPedido ip : itens) {
            itensTx.add(ItemTransacao.builder()
                    .transacao(tx)
                    .produto(ip.getProduto())
                    .nomeProduto(ip.getNomeProduto())
                    .quantidade(ip.getQuantidade())
                    .precoUnitario(ip.getPrecoUnitario())
                    .subtotal(ip.getSubtotal())
                    .build());
        }
        tx.setItens(itensTx);
        transacaoRepository.save(tx);

        pedido.setTotal(total);
        pedido.setItens(itens);
        pedido.setTransacao(tx);
        pedidoRepository.save(pedido);

        // Notifica cantina (todos os operadores)
        final BigDecimal totalFinal = total;
        usuarioRepository.findByCantinaId(cantina.getId()).forEach(op ->
                notificacaoService.criar(op, "PEDIDO_NOVO",
                        "Novo pedido pré-agendado",
                        estudante.getNome() + " · R$ " + totalFinal + " · código " + pedido.getCodigoRetirada(),
                        "/cantina/pedidos"));

        return pedido;
    }

    public List<Pedido> listarEstudante(Long estudanteId) {
        return pedidoRepository.findByEstudanteIdOrderByCriadoEmDesc(estudanteId);
    }

    public List<Pedido> listarFilaCantina(Long cantinaId) {
        return pedidoRepository.findByCantinaIdAndStatusInOrderByRetiradaPrevistaAsc(
                cantinaId, List.of(StatusPedido.AGENDADO, StatusPedido.PREPARANDO, StatusPedido.PRONTO));
    }

    @Transactional
    public Pedido atualizarStatus(Usuario operador, Long pedidoId, StatusPedido novo) {
        Pedido p = pedidoRepository.findById(pedidoId)
                .orElseThrow(() -> new NotFoundException("Pedido não encontrado"));
        if (operador.getRole() != Role.CANTINA || operador.getCantina() == null
                || !operador.getCantina().getId().equals(p.getCantina().getId())) {
            throw new BusinessException("Pedido não pertence à sua cantina");
        }
        StatusPedido atual = p.getStatus();
        if (atual == StatusPedido.ENTREGUE || atual == StatusPedido.CANCELADO) {
            throw new BusinessException("Pedido já está finalizado");
        }
        p.setStatus(novo);
        pedidoRepository.save(p);

        String titulo = switch (novo) {
            case PREPARANDO -> "Pedido em preparo";
            case PRONTO -> "Pedido pronto para retirada";
            case ENTREGUE -> "Pedido entregue";
            case CANCELADO -> "Pedido cancelado pela cantina";
            default -> "Pedido atualizado";
        };
        notificacaoService.criar(p.getEstudante(), "PEDIDO_" + novo.name(),
                titulo, "Código " + p.getCodigoRetirada(), "/estudante");

        if (novo == StatusPedido.CANCELADO) {
            estornarSaldo(p, "Pedido cancelado pela cantina");
        }
        return p;
    }

    @Transactional
    public Pedido cancelarPeloEstudante(Usuario estudante, Long pedidoId) {
        Pedido p = pedidoRepository.findById(pedidoId)
                .orElseThrow(() -> new NotFoundException("Pedido não encontrado"));
        if (!p.getEstudante().getId().equals(estudante.getId())) {
            throw new BusinessException("Pedido não pertence a você");
        }
        if (p.getStatus() != StatusPedido.AGENDADO) {
            throw new BusinessException("Só é possível cancelar pedido AGENDADO");
        }
        p.setStatus(StatusPedido.CANCELADO);
        pedidoRepository.save(p);
        estornarSaldo(p, "Pedido cancelado pelo estudante");
        return p;
    }

    private void estornarSaldo(Pedido p, String motivo) {
        Carteira c = carteiraRepository.findByEstudanteId(p.getEstudante().getId())
                .orElseThrow(() -> new NotFoundException("Carteira não encontrada"));
        c.setSaldo(c.getSaldo().add(p.getTotal()));
        carteiraRepository.save(c);
        Transacao tx = Transacao.builder()
                .carteira(c)
                .tipo(TipoTransacao.ESTORNO)
                .valor(p.getTotal())
                .saldoApos(c.getSaldo())
                .descricao(motivo + " · pedido " + p.getCodigoRetirada())
                .cantina(p.getCantina())
                .build();
        transacaoRepository.save(tx);
    }

    private String gerarCodigoRetirada() {
        String chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        StringBuilder sb = new StringBuilder(6);
        Random r = new Random();
        for (int i = 0; i < 6; i++) sb.append(chars.charAt(r.nextInt(chars.length())));
        return sb.toString();
    }
}
