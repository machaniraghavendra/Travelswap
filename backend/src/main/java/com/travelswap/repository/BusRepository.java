package com.travelswap.repository;

import com.travelswap.entity.BusEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface BusRepository extends JpaRepository<BusEntity, Long> {

    List<BusEntity> findByTravelIdOrderByBusNumberAsc(Long travelId);

    boolean existsByTravelIdAndBusNumberIgnoreCase(Long travelId, String busNumber);
    boolean existsByBusNumberIgnoreCase(String busNumber);
    boolean existsByBusNumberIgnoreCaseAndIdNot(String busNumber, Long id);

    Optional<BusEntity> findByTravelIdAndBusNumberIgnoreCase(Long travelId, String busNumber);

    long countByTravelOwnerId(Long ownerId);
}
