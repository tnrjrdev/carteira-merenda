package com.merenda.repository;

import com.merenda.model.Webhook;
import com.merenda.model.WebhookEvento;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface WebhookRepository extends JpaRepository<Webhook, Long> {

    List<Webhook> findByCantinaId(Long cantinaId);

    @Query("SELECT w FROM Webhook w JOIN w.eventos e WHERE w.cantina.id = :cantinaId " +
           "AND w.ativo = true AND e = :evento")
    List<Webhook> findAtivosPorCantinaEEvento(@Param("cantinaId") Long cantinaId,
                                              @Param("evento") WebhookEvento evento);
}
