package com.travelswap.repository;

import com.travelswap.entity.TicketListingEntity;
import com.travelswap.model.ListingStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface TicketListingRepository extends JpaRepository<TicketListingEntity, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select listing from TicketListingEntity listing where listing.id = :id")
    Optional<TicketListingEntity> findByIdForUpdate(Long id);

    List<TicketListingEntity> findByStatusAndRouteFromContainingIgnoreCaseAndRouteToContainingIgnoreCaseOrderByDepartureTimeAsc(
            ListingStatus status,
            String routeFrom,
            String routeTo
    );

    List<TicketListingEntity> findByStatusAndRouteFromContainingIgnoreCaseAndRouteToContainingIgnoreCaseAndDepartureTimeGreaterThanEqualAndDepartureTimeLessThanOrderByDepartureTimeAsc(
            ListingStatus status,
            String routeFrom,
            String routeTo,
            LocalDateTime from,
            LocalDateTime to
    );

    List<TicketListingEntity> findByRouteFromContainingIgnoreCaseAndRouteToContainingIgnoreCaseOrderByDepartureTimeAsc(
            String routeFrom,
            String routeTo
    );

    List<TicketListingEntity> findByRouteFromContainingIgnoreCaseAndRouteToContainingIgnoreCaseAndDepartureTimeGreaterThanEqualAndDepartureTimeLessThanOrderByDepartureTimeAsc(
            String routeFrom,
            String routeTo,
            LocalDateTime from,
            LocalDateTime to
    );

    List<TicketListingEntity> findByStatusOrderByDepartureTimeAsc(ListingStatus status);

    List<TicketListingEntity> findByStatusAndDepartureTimeBefore(ListingStatus status, LocalDateTime threshold);

    List<TicketListingEntity> findBySellerIdOrderByCreatedAtDesc(Long sellerId);

    List<TicketListingEntity> findByBuyerIdOrderByDepartureTimeAsc(Long buyerId);

    List<TicketListingEntity> findByBuyerIdAndDepartureTimeAfterOrderByDepartureTimeAsc(Long buyerId, LocalDateTime threshold);

    List<TicketListingEntity> findByTravelOwnerIdOrderByCreatedAtDesc(Long ownerId);

    @Query("select count(distinct listing.seller.id) from TicketListingEntity listing")
    long countDistinctSellers();

    @Query("select count(distinct listing.buyer.id) from TicketListingEntity listing where listing.buyer is not null")
    long countDistinctBuyers();

    long countByStatus(ListingStatus status);

    @Query("select coalesce(sum(listing.platformFee), 0) from TicketListingEntity listing where listing.status = com.travelswap.model.ListingStatus.SOLD")
    java.math.BigDecimal sumPlatformFeesForSoldListings();

    @Query("select coalesce(sum(listing.travellerCommission), 0) from TicketListingEntity listing where listing.status = com.travelswap.model.ListingStatus.SOLD and listing.travel.owner.id = :travelOwnerId")
    java.math.BigDecimal sumTravellerCommissionByTravelOwner(Long travelOwnerId);
}
