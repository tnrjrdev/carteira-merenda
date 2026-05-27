package com.merenda.config;

import com.merenda.domain.cantina.model.Cantina;
import com.merenda.domain.cantina.model.Categoria;
import com.merenda.domain.cantina.model.Plano;
import com.merenda.domain.cantina.model.Produto;
import com.merenda.domain.cantina.repository.CantinaRepository;
import com.merenda.domain.cantina.repository.CategoriaRepository;
import com.merenda.domain.cantina.repository.ProdutoRepository;
import com.merenda.domain.carteira.model.Carteira;
import com.merenda.domain.carteira.model.Mesada;
import com.merenda.domain.carteira.repository.CarteiraRepository;
import com.merenda.domain.gamificacao.model.Badge;
import com.merenda.domain.gamificacao.model.Meta;
import com.merenda.domain.gamificacao.repository.BadgeRepository;
import com.merenda.domain.usuario.model.Role;
import com.merenda.domain.usuario.model.Usuario;
import com.merenda.domain.usuario.repository.UsuarioRepository;

import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Component
public class DataSeeder implements CommandLineRunner {

    private final UsuarioRepository usuarioRepository;
    private final CantinaRepository cantinaRepository;
    private final CategoriaRepository categoriaRepository;
    private final ProdutoRepository produtoRepository;
    private final CarteiraRepository carteiraRepository;
    private final BadgeRepository badgeRepository;
    private final PasswordEncoder passwordEncoder;

    public DataSeeder(UsuarioRepository usuarioRepository,
                      CantinaRepository cantinaRepository,
                      CategoriaRepository categoriaRepository,
                      ProdutoRepository produtoRepository,
                      CarteiraRepository carteiraRepository,
                      BadgeRepository badgeRepository,
                      PasswordEncoder passwordEncoder) {
        this.usuarioRepository = usuarioRepository;
        this.cantinaRepository = cantinaRepository;
        this.categoriaRepository = categoriaRepository;
        this.produtoRepository = produtoRepository;
        this.carteiraRepository = carteiraRepository;
        this.badgeRepository = badgeRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        seedBadges();
        if (usuarioRepository.count() > 0) {
            return;
        }

        Cantina cantina = cantinaRepository.save(Cantina.builder()
                .nome("Cantina Central")
                .escola("Colégio Modelo")
                .cnpj("00.000.000/0001-00")
                .endereco("Rua das Escolas, 100")
                .plano(Plano.ESSENCIAL)
                .maxAlunos(300)
                .mensalidadeSaas(Plano.ESSENCIAL.getMensalidade())
                .taxaPlataforma(Plano.ESSENCIAL.getTaxaPlataforma())
                .diaCobrancaMensalidade(5)
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
                        .estoque(50).categoria(salgados).cantina(cantina).disponivel(true)
                        .calorias(220).alergenos("gluten,leite,soja").ingredientes("Frango, massa de trigo, ovo")
                        .build(),
                Produto.builder().nome("Pastel de Queijo").descricao("Massa crocante").preco(new BigDecimal("8.00"))
                        .estoque(40).categoria(salgados).cantina(cantina).disponivel(true)
                        .calorias(280).alergenos("gluten,leite,ovo").ingredientes("Massa de pastel, queijo mussarela")
                        .build(),
                Produto.builder().nome("Suco de Laranja Natural").descricao("300ml, sem açúcar").preco(new BigDecimal("6.00"))
                        .estoque(30).categoria(saudaveis).cantina(cantina).disponivel(true)
                        .calorias(110).alergenos(null).ingredientes("Laranja")
                        .build(),
                Produto.builder().nome("Refrigerante Lata").descricao("350ml").preco(new BigDecimal("5.50"))
                        .estoque(60).categoria(bebidas).cantina(cantina).disponivel(true)
                        .calorias(150).alergenos(null)
                        .build(),
                Produto.builder().nome("Água Mineral").descricao("500ml").preco(new BigDecimal("3.00"))
                        .estoque(80).categoria(saudaveis).cantina(cantina).disponivel(true)
                        .calorias(0)
                        .build(),
                Produto.builder().nome("Maçã").descricao("Unidade").preco(new BigDecimal("2.50"))
                        .estoque(25).categoria(saudaveis).cantina(cantina).disponivel(true)
                        .calorias(80)
                        .build(),
                Produto.builder().nome("Barra de Cereal").descricao("Frutas vermelhas").preco(new BigDecimal("4.00"))
                        .estoque(35).categoria(saudaveis).cantina(cantina).disponivel(true)
                        .calorias(120).alergenos("gluten,amendoim")
                        .build(),
                Produto.builder().nome("Chocolate ao Leite").descricao("25g").preco(new BigDecimal("4.50"))
                        .estoque(45).categoria(doces).cantina(cantina).disponivel(true)
                        .calorias(140).alergenos("leite,soja")
                        .build(),
                Produto.builder().nome("Prato do Dia").descricao("Arroz, feijão, frango grelhado e salada").preco(new BigDecimal("16.00"))
                        .estoque(20).categoria(refeicao).cantina(cantina).disponivel(true)
                        .calorias(620).alergenos(null).ingredientes("Arroz, feijão, frango, salada")
                        .build()
        ));

        Usuario responsavel = usuarioRepository.save(Usuario.builder()
                .nome("Maria Responsável")
                .email("maria@merenda.com")
                .senhaHash(passwordEncoder.encode("123456"))
                .telefone("11999990000")
                .role(Role.RESPONSAVEL)
                .consentimentoLgpd(true)
                .consentimentoLgpdEm(LocalDateTime.now())
                .consentimentoVersao("2026-01-01")
                .ativo(true)
                .build());

        Usuario estudante = usuarioRepository.save(Usuario.builder()
                .nome("Joãozinho da Silva")
                .email("joao@merenda.com")
                .senhaHash(passwordEncoder.encode("123456"))
                .role(Role.ESTUDANTE)
                .responsavel(responsavel)
                .dataNascimento(LocalDate.of(2014, 5, 20))
                .alergias("amendoim")
                .consentimentoLgpd(true)
                .consentimentoLgpdEm(LocalDateTime.now())
                .consentimentoVersao("2026-01-01")
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
                .consentimentoLgpd(true)
                .consentimentoLgpdEm(LocalDateTime.now())
                .ativo(true)
                .build());

        usuarioRepository.save(Usuario.builder()
                .nome("Admin")
                .email("admin@merenda.com")
                .senhaHash(passwordEncoder.encode("admin123"))
                .role(Role.ADMIN)
                .consentimentoLgpd(true)
                .consentimentoLgpdEm(LocalDateTime.now())
                .ativo(true)
                .build());

        System.out.println(">>> Seed completo. Usuários iniciais:");
        System.out.println("    Responsável: maria@merenda.com / 123456");
        System.out.println("    Estudante:   joao@merenda.com / 123456 (alergia: amendoim)");
        System.out.println("    Cantina:     cantina@merenda.com / 123456");
        System.out.println("    Admin:       admin@merenda.com / admin123");
    }

    private void seedBadges() {
        cadastrarSeNaoExiste("PRIMEIRA_COMPRA", "Primeira compra", "Você comprou pela primeira vez!", "🎉", 10);
        cadastrarSeNaoExiste("DEZ_COMPRAS", "10 compras", "10 compras na cantina", "🛒", 30);
        cadastrarSeNaoExiste("ESCOLHA_SAUDAVEL", "Escolha saudável", "Comprou só itens saudáveis em uma transação", "🥗", 25);
        cadastrarSeNaoExiste("META_CONCLUIDA", "Meta cumprida", "Você concluiu uma meta de poupança", "🏆", 50);
        cadastrarSeNaoExiste("MESADA_ATIVA", "Mesada ativada", "Sua mesada programada está ativa", "💸", 5);
    }

    private void cadastrarSeNaoExiste(String codigo, String nome, String descricao, String emoji, int pontos) {
        if (badgeRepository.findByCodigo(codigo).isEmpty()) {
            badgeRepository.save(Badge.builder()
                    .codigo(codigo).nome(nome).descricao(descricao).emoji(emoji).pontos(pontos).build());
        }
    }
}
