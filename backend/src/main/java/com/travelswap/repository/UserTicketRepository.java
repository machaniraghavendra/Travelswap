package com.travelswap.repository;

import com.travelswap.entity.UserTicketEntity;
import com.travelswap.model.UserTicketStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface UserTicketRepository extends JpaRepository<UserTicketEntity, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select ticket from UserTicketEntity ticket where ticket.id = :id")
    Optional<UserTicketEntity> findByIdForUpdate(Long id);

    List<UserTicketEntity> findByOwnerIdOrderByJourneyDepartureTimeDesc(Long ownerId);

    List<UserTicketEntity> findByOwnerIdAndStatusInOrderByJourneyDepartureTimeAsc(Long ownerId, Collection<UserTicketStatus> statuses);

    List<UserTicketEntity> findByJourneyIdAndStatusInOrderBySeatNumberAsc(Long journeyId, Collection<UserTicketStatus> statuses);

    Optional<UserTicketEntity> findByIdAndOwnerId(Long id, Long ownerId);

    @Query("select count(ticket.id) from UserTicketEntity ticket where ticket.journey.id = :journeyId and ticket.status in :statuses")
    long countActiveByJourney(Long journeyId, Collection<UserTicketStatus> statuses);

    boolean existsByJourneyIdAndSeatNumberIgnoreCaseAndStatusIn(Long journeyId, String seatNumber, Collection<UserTicketStatus> statuses);
}
