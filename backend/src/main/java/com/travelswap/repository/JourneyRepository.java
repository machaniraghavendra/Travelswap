package com.travelswap.repository;

import com.travelswap.entity.JourneyEntity;
import com.travelswap.model.JourneyStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface JourneyRepository extends JpaRepository<JourneyEntity, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select journey from JourneyEntity journey where journey.id = :id")
    Optional<JourneyEntity> findByIdForUpdate(Long id);

    List<JourneyEntity> findByTravelOwnerIdOrderByDepartureTimeAsc(Long ownerUserId);

    boolean existsByBusId(Long busId);

    List<JourneyEntity> findByRouteFromContainingIgnoreCaseAndRouteToContainingIgnoreCaseAndDepartureTimeAfterAndStatusOrderByDepartureTimeAsc(
            String routeFrom,
            String routeTo,
            LocalDateTime threshold,
            JourneyStatus status
    );

    List<JourneyEntity> findByRouteFromContainingIgnoreCaseAndRouteToContainingIgnoreCaseAndDepartureTimeGreaterThanEqualAndDepartureTimeLessThanAndStatusOrderByDepartureTimeAsc(
            String routeFrom,
            String routeTo,
            LocalDateTime from,
            LocalDateTime to,
            JourneyStatus status
    );
}
