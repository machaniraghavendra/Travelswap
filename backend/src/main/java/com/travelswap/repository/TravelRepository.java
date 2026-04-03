package com.travelswap.repository;

import com.travelswap.entity.TravelEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface TravelRepository extends JpaRepository<TravelEntity, Long> {

    List<TravelEntity> findByOwnerIdOrderByCreatedAtDesc(Long ownerId);

    List<TravelEntity> findAllByOrderByNameAsc();

    boolean existsByCodeIgnoreCase(String code);

    Optional<TravelEntity> findByCodeIgnoreCase(String code);

    @Query("select count(distinct travel.owner.id) from TravelEntity travel")
    long countDistinctOwners();
}
