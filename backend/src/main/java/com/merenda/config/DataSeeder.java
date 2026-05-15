package com.merenda.config;

import com.merenda.model.*;
import com.merenda.repository.*;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.List;

@Component
public class DataSeeder implements CommandLineRunner {

    private final UsuarioRepository usuarioRepository;
    private final CantinaRepository cantinaRepository;
    private final CategoriaRepository categoriaRepository;
    private final ProdutoRepository produtoRepository;
    private final CarteiraRepository carteiraRepository;
    private final PasswordEncoder passwordEncoder;

    public DataSeeder(UsuarioRepository usuarioRepository,
                      CantinaRepository cantinaRepository,
                      CategoriaRepository categoriaRepository,
                      ProdutoRepository produtoRepository,
                      CarteiraRepository carteiraRepository,
                      PasswordEncoder passwordEncoder) {
        this.usuarioRepository = usuarioRepository;
        this.cantinaRepository = cantinaRepository;
        this.categoriaRepository = categoriaRepository;
        this.produtoRepository = produtoRepository;
        this.carteiraRepository = carteiraRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        if (usuarioRepository.count() > 0) {
            return;
        }

        Cantina cantina = cantinaRepository.save(Cantina.builder()
                .nome("Cantina Central")
                .escola("Colégio Modelo")
                .cnpj("00.000.000/0001-00")
                .endereco("Rua das Escolas, 100")
                .ativa(true)
                .build());

        Categoria salgados = categoriaRepository.save(Categoria.builder()
                .nome("Salgados").descricao("Coxinhas, pasteis, esfihas").saudavel(false).build());
        Categoria bebidas = categoriaRepository.save(Categoria.builder()
                .nome("Bebidas").descricao("Sucos e refrigerantes").saudavel(false).build());
        Categoria saudaveis = categoriaRepository.save(Categoria.builder()
                .nome("Saudáveis").descricao("Frutas, barrinhas e sucos naturais").saudavel(true).build());
        Categoria doces = categoriaRepository.save(Categoria.builder()
                .nome("Doces").descricao("Chocolates e balas").saudavel(false).build());
        Categoria refeicao = categoriaRepository.save(Categoria.builder()
                .nome("Refeições").descricao("Pratos do dia").saudavel(true).build());

        produtoRepository.saveAll(List.of(
                Produto.builder().nome("Coxinha de Frango").descricao("Tradicional, recheada").preco(new BigDecimal("7.50"))
                        .estoque(50).categoria(salgados).cantina(cantina).disponivel(true).build(),
                Produto.builder().nome("Pastel de Queijo").descricao("Massa crocante").preco(new BigDecimal("8.00"))
                        .estoque(40).categoria(salgados).cantina(cantina).disponivel(true).build(),
                Produto.builder().nome("Suco de Laranja Natural").descricao("300ml, sem açúcar").preco(new BigDecimal("6.00"))
                        .estoque(30).categoria(saudaveis).cantina(cantina).disponivel(true).build(),
                Produto.builder().nome("Refrigerante Lata").descricao("350ml").preco(new BigDecimal("5.50"))
                        .estoque(60).categoria(bebidas).cantina(cantina).disponivel(true).build(),
                Produto.builder().nome("Água Mineral").descricao("500ml").preco(new BigDecimal("3.00"))
                        .estoque(80).categoria(saudaveis).cantina(cantina).disponivel(true).build(),
                Produto.builder().nome("Maçã").descricao("Unidade").preco(new BigDecimal("2.50"))
                        .estoque(25).categoria(saudaveis).cantina(cantina).disponivel(true).build(),
                Produto.builder().nome("Barra de Cereal").descricao("Frutas vermelhas").preco(new BigDecimal("4.00"))
                        .estoque(35).categoria(saudaveis).cantina(cantina).disponivel(true).build(),
                Produto.builder().nome("Chocolate ao Leite").descricao("25g").preco(new BigDecimal("4.50"))
                        .estoque(45).categoria(doces).cantina(cantina).disponivel(true).build(),
                Produto.builder().nome("Prato do Dia").descricao("Arroz, feijão, frango grelhado e salada").preco(new BigDecimal("16.00"))
                        .estoque(20).categoria(refeicao).cantina(cantina).disponivel(true).build()
        ));

        Usuario responsavel = usuarioRepository.save(Usuario.builder()
                .nome("Maria Responsável")
                .email("maria@merenda.com")
                .senhaHash(passwordEncoder.encode("123456"))
                .telefone("11999990000")
                .role(Role.RESPONSAVEL)
                .ativo(true)
                .build());

        Usuario estudante = usuarioRepository.save(Usuario.builder()
                .nome("Joãozinho da Silva")
                .email("joao@merenda.com")
                .senhaHash(passwordEncoder.encode("123456"))
                .role(Role.ESTUDANTE)
                .responsavel(responsavel)
                .ativo(true)
                .build());
        carteiraRepository.save(Carteira.builder()
                .estudante(estudante)
                .saldo(new BigDecimal("50.00"))
                .limiteDiario(new BigDecimal("25.00"))
                .build());

        usuarioRepository.save(Usuario.builder()
                .nome("Carlos Cantineiro")
                .email("cantina@merenda.com")
                .senhaHash(passwordEncoder.encode("123456"))
                .role(Role.CANTINA)
                .cantina(cantina)
                .ativo(true)
                .build());

        usuarioRepository.save(Usuario.builder()
                .nome("Admin")
                .email("admin@merenda.com")
                .senhaHash(passwordEncoder.encode("admin123"))
                .role(Role.ADMIN)
                .ativo(true)
                .build());

        System.out.println(">>> Seed completo. Usuários iniciais:");
        System.out.println("    Responsável: maria@merenda.com / 123456");
        System.out.println("    Estudante:   joao@merenda.com / 123456");
        System.out.println("    Cantina:     cantina@merenda.com / 123456");
        System.out.println("    Admin:       admin@merenda.com / admin123");
    }
}
