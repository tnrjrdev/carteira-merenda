package com.merenda.repository;

import com.merenda.model.Pedido;
import com.merenda.model.StatusPedido;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PedidoRepository extends JpaRepository<Pedido, Long> {
    List<Pedido> findByEstudanteIdOrderByCriadoEmDesc(Long estudanteId);
    List<Pedido> findByCantinaIdAndStatusInOrderByRetiradaPrevistaAsc(Long cantinaId, List<StatusPedido> status);
    List<Pedido> findByCantinaIdOrderByCriadoEmDesc(Long cantinaId);
    Optional<Pedido> findByCodigoRetirada(String codigoRetirada);
}
