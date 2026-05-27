package com.merenda.domain.cantina.service;

import com.merenda.config.exception.BusinessException;
import com.merenda.config.exception.NotFoundException;
import com.merenda.domain.cantina.dto.ProdutoDto;
import com.merenda.domain.cantina.model.Cantina;
import com.merenda.domain.cantina.model.Categoria;
import com.merenda.domain.cantina.model.Produto;
import com.merenda.domain.cantina.repository.CantinaRepository;
import com.merenda.domain.cantina.repository.CategoriaRepository;
import com.merenda.domain.cantina.repository.ProdutoRepository;
import com.merenda.domain.usuario.model.Role;
import com.merenda.domain.usuario.model.Usuario;

import com.merenda.domain.cantina.dto.ProdutoDto;
import com.merenda.config.exception.BusinessException;
import com.merenda.config.exception.NotFoundException;
import com.merenda.domain.cantina.model.Cantina;
import com.merenda.domain.cantina.model.Categoria;
import com.merenda.domain.cantina.model.Produto;
import com.merenda.domain.usuario.model.Role;
import com.merenda.domain.usuario.model.Usuario;
import com.merenda.domain.cantina.repository.CantinaRepository;
import com.merenda.domain.cantina.repository.CategoriaRepository;
import com.merenda.domain.cantina.repository.ProdutoRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class ProdutoService {

    private final ProdutoRepository produtoRepository;
    private final CategoriaRepository categoriaRepository;
    private final CantinaRepository cantinaRepository;

    public ProdutoService(ProdutoRepository produtoRepository,
                          CategoriaRepository categoriaRepository,
                          CantinaRepository cantinaRepository) {
        this.produtoRepository = produtoRepository;
        this.categoriaRepository = categoriaRepository;
        this.cantinaRepository = cantinaRepository;
    }

    public List<ProdutoDto.Response> listarPorCantina(Long cantinaId, boolean somenteDisponiveis) {
        List<Produto> produtos = somenteDisponiveis
                ? produtoRepository.findByCantinaIdAndDisponivelTrue(cantinaId)
                : produtoRepository.findByCantinaId(cantinaId);
        return produtos.stream().map(this::toResponse).toList();
    }

    @Transactional
    public ProdutoDto.Response criar(Usuario operador, ProdutoDto.CreateRequest req) {
        if (operador.getRole() != Role.CANTINA) {
            throw new BusinessException("Apenas operadores de cantina podem criar produtos");
        }
        Cantina cantina = operador.getCantina();
        if (cantina == null) {
            throw new BusinessException("Operador sem cantina vinculada");
        }
        Categoria categoria = null;
        if (req.categoriaId() != null) {
            categoria = categoriaRepository.findById(req.categoriaId())
                    .orElseThrow(() -> new NotFoundException("Categoria não encontrada"));
        }
        Produto p = Produto.builder()
                .nome(req.nome())
                .descricao(req.descricao())
                .preco(req.preco())
                .estoque(req.estoque() == null ? 0 : req.estoque())
                .imagemUrl(req.imagemUrl())
                .categoria(categoria)
                .cantina(cantina)
                .disponivel(req.disponivel() == null ? true : req.disponivel())
                .calorias(req.calorias())
                .ingredientes(req.ingredientes())
                .alergenos(normalizarAlergenos(req.alergenos()))
                .infoNutricional(req.infoNutricional())
                .build();
        produtoRepository.save(p);
        return toResponse(p);
    }

    @Transactional
    public ProdutoDto.Response atualizar(Usuario operador, Long produtoId, ProdutoDto.CreateRequest req) {
        Produto p = produtoRepository.findById(produtoId)
                .orElseThrow(() -> new NotFoundException("Produto não encontrado"));
        if (operador.getRole() == Role.CANTINA &&
                (operador.getCantina() == null || !operador.getCantina().getId().equals(p.getCantina().getId()))) {
            throw new BusinessException("Produto não pertence à sua cantina");
        }
        p.setNome(req.nome());
        p.setDescricao(req.descricao());
        p.setPreco(req.preco());
        if (req.estoque() != null) p.setEstoque(req.estoque());
        p.setImagemUrl(req.imagemUrl());
        if (req.disponivel() != null) p.setDisponivel(req.disponivel());
        if (req.categoriaId() != null) {
            Categoria c = categoriaRepository.findById(req.categoriaId())
                    .orElseThrow(() -> new NotFoundException("Categoria não encontrada"));
            p.setCategoria(c);
        }
        p.setCalorias(req.calorias());
        p.setIngredientes(req.ingredientes());
        p.setAlergenos(normalizarAlergenos(req.alergenos()));
        p.setInfoNutricional(req.infoNutricional());
        produtoRepository.save(p);
        return toResponse(p);
    }

    @Transactional
    public void remover(Usuario operador, Long produtoId) {
        Produto p = produtoRepository.findById(produtoId)
                .orElseThrow(() -> new NotFoundException("Produto não encontrado"));
        if (operador.getRole() == Role.CANTINA &&
                (operador.getCantina() == null || !operador.getCantina().getId().equals(p.getCantina().getId()))) {
            throw new BusinessException("Produto não pertence à sua cantina");
        }
        produtoRepository.delete(p);
    }

    public ProdutoDto.Response toResponse(Produto p) {
        return new ProdutoDto.Response(
                p.getId(),
                p.getNome(),
                p.getDescricao(),
                p.getPreco(),
                p.getEstoque(),
                p.getImagemUrl(),
                p.getCategoria() == null ? null : p.getCategoria().getId(),
                p.getCategoria() == null ? null : p.getCategoria().getNome(),
                p.getCategoria() != null && p.getCategoria().isSaudavel(),
                p.getCantina().getId(),
                p.getCantina().getNome(),
                p.isDisponivel(),
                p.getCalorias(),
                p.getIngredientes(),
                p.getAlergenos(),
                p.getInfoNutricional());
    }

    private String normalizarAlergenos(String csv) {
        if (csv == null) return null;
        String trimmed = csv.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
