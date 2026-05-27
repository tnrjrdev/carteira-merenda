package com.merenda.domain.bloqueio.service;

import com.merenda.config.exception.BusinessException;
import com.merenda.config.exception.NotFoundException;
import com.merenda.domain.bloqueio.model.BloqueioCategoria;
import com.merenda.domain.bloqueio.repository.BloqueioCategoriaRepository;
import com.merenda.domain.cantina.model.Categoria;
import com.merenda.domain.cantina.repository.CategoriaRepository;
import com.merenda.domain.carteira.model.Carteira;
import com.merenda.domain.carteira.repository.CarteiraRepository;
import com.merenda.domain.usuario.model.Role;
import com.merenda.domain.usuario.model.Usuario;
import com.merenda.domain.usuario.repository.UsuarioRepository;

import com.merenda.config.exception.BusinessException;
import com.merenda.config.exception.NotFoundException;
import com.merenda.domain.bloqueio.model.BloqueioCategoria;
import com.merenda.domain.carteira.model.Carteira;
import com.merenda.domain.cantina.model.Categoria;
import com.merenda.domain.usuario.model.Role;
import com.merenda.domain.usuario.model.Usuario;
import com.merenda.domain.bloqueio.repository.BloqueioCategoriaRepository;
import com.merenda.domain.carteira.repository.CarteiraRepository;
import com.merenda.domain.cantina.repository.CategoriaRepository;
import com.merenda.domain.usuario.repository.UsuarioRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class BloqueioService {

    private final BloqueioCategoriaRepository bloqueioRepository;
    private final CarteiraRepository carteiraRepository;
    private final CategoriaRepository categoriaRepository;
    private final UsuarioRepository usuarioRepository;

    public BloqueioService(BloqueioCategoriaRepository bloqueioRepository,
                           CarteiraRepository carteiraRepository,
                           CategoriaRepository categoriaRepository,
                           UsuarioRepository usuarioRepository) {
        this.bloqueioRepository = bloqueioRepository;
        this.carteiraRepository = carteiraRepository;
        this.categoriaRepository = categoriaRepository;
        this.usuarioRepository = usuarioRepository;
    }

    public List<BloqueioCategoria> listar(Usuario solicitante, Long estudanteId) {
        verificarAcesso(solicitante, estudanteId);
        Carteira c = carteiraRepository.findByEstudanteId(estudanteId)
                .orElseThrow(() -> new NotFoundException("Carteira não encontrada"));
        return bloqueioRepository.findByCarteiraId(c.getId());
    }

    @Transactional
    public BloqueioCategoria criar(Usuario solicitante, Long estudanteId, Long categoriaId, String motivo) {
        verificarAcesso(solicitante, estudanteId);
        Carteira carteira = carteiraRepository.findByEstudanteId(estudanteId)
                .orElseThrow(() -> new NotFoundException("Carteira não encontrada"));
        Categoria categoria = categoriaRepository.findById(categoriaId)
                .orElseThrow(() -> new NotFoundException("Categoria não encontrada"));
        if (bloqueioRepository.existsByCarteiraIdAndCategoriaId(carteira.getId(), categoria.getId())) {
            throw new BusinessException("Categoria já bloqueada");
        }
        return bloqueioRepository.save(BloqueioCategoria.builder()
                .carteira(carteira)
                .categoria(categoria)
                .motivo(motivo)
                .build());
    }

    @Transactional
    public void remover(Usuario solicitante, Long estudanteId, Long categoriaId) {
        verificarAcesso(solicitante, estudanteId);
        Carteira c = carteiraRepository.findByEstudanteId(estudanteId)
                .orElseThrow(() -> new NotFoundException("Carteira não encontrada"));
        bloqueioRepository.deleteByCarteiraIdAndCategoriaId(c.getId(), categoriaId);
    }

    private void verificarAcesso(Usuario solicitante, Long estudanteId) {
        if (solicitante.getRole() == Role.ADMIN) return;
        if (solicitante.getRole() != Role.RESPONSAVEL) {
            throw new BusinessException("Apenas responsáveis podem gerenciar bloqueios");
        }
        Usuario estudante = usuarioRepository.findById(estudanteId)
                .orElseThrow(() -> new NotFoundException("Estudante não encontrado"));
        if (estudante.getResponsavel() == null || !estudante.getResponsavel().getId().equals(solicitante.getId())) {
            throw new BusinessException("Estudante não pertence a este responsável");
        }
    }
}
