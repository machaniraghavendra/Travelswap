package com.travelswap.service;

import com.travelswap.audit.AuditService;
import com.travelswap.dto.CreateListingRequest;
import com.travelswap.dto.MarketplaceSummaryResponse;
import com.travelswap.dto.ProviderInfoResponse;
import com.travelswap.dto.PurchaseRequest;
import com.travelswap.dto.RoutePointResponse;
import com.travelswap.dto.SettlementBreakdown;
import com.travelswap.dto.TicketListingResponse;
import com.travelswap.dto.UserDashboardResponse;
import com.travelswap.entity.BusEntity;
import com.travelswap.entity.JourneyEntity;
import com.travelswap.entity.TicketListingEntity;
import com.travelswap.entity.TravelEntity;
import com.travelswap.entity.UserEntity;
import com.travelswap.entity.UserTicketEntity;
import com.travelswap.event.ListingEventType;
import com.travelswap.event.ListingLifecycleEvent;
import com.travelswap.exception.ConflictException;
import com.travelswap.exception.InvalidRequestException;
import com.travelswap.exception.ResourceNotFoundException;
import com.travelswap.model.ListingStatus;
import com.travelswap.model.PassengerGender;
import com.travelswap.model.UserRole;
import com.travelswap.model.UserTicketStatus;
import com.travelswap.model.VerificationStatus;
import com.travelswap.repository.TicketListingRepository;
import com.travelswap.repository.UserRepository;
import com.travelswap.repository.UserTicketRepository;
import com.travelswap.security.CurrentUserService;
import jakarta.transaction.Transactional;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Service
public class TicketMarketplaceService {

    private static final Set<String> SUPPORTED_CROSS_PLATFORMS = Set.of(
            "REDBUS",
            "ABHIBUS",
            "CONFIRMTICKET",
            "KSRRTC",
            "APSRTC",
            "TNRTC"
    );

    private final TicketListingRepository ticketListingRepository;
    private final UserTicketRepository userTicketRepository;
    private final UserRepository userRepository;
    private final PricingService pricingService;
    private final TicketVerificationService ticketVerificationService;
    private final CurrentUserService currentUserService;
    private final ApplicationEventPublisher eventPublisher;
    private final AuditService auditService;
    private final NotificationService notificationService;

    public TicketMarketplaceService(
            TicketListingRepository ticketListingRepository,
            UserTicketRepository userTicketRepository,
            UserRepository userRepository,
            PricingService pricingService,
            TicketVerificationService ticketVerificationService,
            CurrentUserService currentUserService,
            ApplicationEventPublisher eventPublisher,
            AuditService auditService,
            NotificationService notificationService
    ) {
        this.ticketListingRepository = ticketListingRepository;
        this.userTicketRepository = userTicketRepository;
        this.userRepository = userRepository;
        this.pricingService = pricingService;
        this.ticketVerificationService = ticketVerificationService;
        this.currentUserService = currentUserService;
        this.eventPublisher = eventPublisher;
        this.auditService = auditService;
        this.notificationService = notificationService;
    }

    @Transactional
    public TicketListingResponse createListing(CreateListingRequest request) {
        UserEntity seller = currentUserService.requireCurrentUser();

        if (!ticketVerificationService.isAuthentic(request)) {
            auditService.record("LISTING_CREATE", false, 400, seller, "/api/listings", "Ticket verification failed", null, null);
            throw new InvalidRequestException("Ticket verification failed. Please check PNR or departure time.");
        }

        if (request.ticketId() != null) {
            return createListingFromOwnedTicket(request, seller);
        }
        return createCrossPlatformListing(request, seller);
    }

    private TicketListingResponse createListingFromOwnedTicket(CreateListingRequest request, UserEntity seller) {
        UserTicketEntity sourceTicket = userTicketRepository.findByIdForUpdate(request.ticketId())
                .orElseThrow(() -> new ResourceNotFoundException("Ticket not found: " + request.ticketId()));
        if (!sourceTicket.getOwner().getId().equals(seller.getId())) {
            throw new InvalidRequestException("You can list only your own booked tickets");
        }
        if (sourceTicket.getStatus() != UserTicketStatus.BOOKED) {
            throw new ConflictException("Only BOOKED tickets can be sold. Current status: " + sourceTicket.getStatus());
        }
        JourneyEntity journey = sourceTicket.getJourney();
        if (journey.getDepartureTime().isBefore(LocalDateTime.now().plusMinutes(10))) {
            throw new ConflictException("Ticket is too close to departure to be listed");
        }

        BigDecimal systemSuggestedPrice = pricingService.suggestResalePrice(sourceTicket.getAmountPaid(), journey.getDepartureTime());
        BigDecimal finalResalePrice = systemSuggestedPrice;

        if (request.resalePrice() != null) {
            pricingService.validateOverridePrice(systemSuggestedPrice, request.resalePrice());
            finalResalePrice = request.resalePrice().setScale(2, RoundingMode.HALF_UP);
        }

        TravelEntity travel = journey.getTravel();
        BusEntity bus = journey.getBus();

        TicketListingEntity listing = new TicketListingEntity();
        listing.setSourcePlatform(travel.getCode().trim().toUpperCase(Locale.ROOT));
        listing.setOperatorName(travel.getName().trim());
        listing.setTravel(travel);
        listing.setBus(bus);
        listing.setSourceTicket(sourceTicket);
        listing.setRouteFrom(journey.getRouteFrom());
        listing.setRouteTo(journey.getRouteTo());
        listing.setDepartureTime(journey.getDepartureTime());
        listing.setSeatNumber(sourceTicket.getSeatNumber().toUpperCase(Locale.ROOT));
        listing.setOriginalPnr(sourceTicket.getPnr().toUpperCase(Locale.ROOT));
        listing.setOriginalFare(sourceTicket.getAmountPaid().setScale(2, RoundingMode.HALF_UP));
        listing.setResalePrice(finalResalePrice);
        listing.setBuyerFinalPrice(finalResalePrice);
        listing.setPlatformFee(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));
        listing.setTravellerCommission(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));
        listing.setStatus(ListingStatus.AVAILABLE);
        listing.setVerificationStatus(VerificationStatus.VERIFIED);
        listing.setSeller(seller);
        listing.setSellerContact(resolveSellerContact(request, seller));

        sourceTicket.setStatus(UserTicketStatus.LISTED);
        userTicketRepository.save(sourceTicket);

        TicketListingEntity saved = ticketListingRepository.save(listing);
        TicketListingResponse response = map(saved);

        publish(ListingEventType.CREATED, response,
                "Listing " + saved.getId() + " created for " + saved.getRouteFrom() + " to " + saved.getRouteTo());
        auditService.record("LISTING_CREATE", true, 201, seller, "/api/listings", "Listing created", saved.getId(), null);

        return response;
    }

    private TicketListingResponse createCrossPlatformListing(CreateListingRequest request, UserEntity seller) {
        String sourcePlatform = request.sourcePlatform().trim().toUpperCase(Locale.ROOT);
        if (!SUPPORTED_CROSS_PLATFORMS.contains(sourcePlatform)) {
            throw new InvalidRequestException("Unsupported source platform. Supported values: " + String.join(", ", SUPPORTED_CROSS_PLATFORMS));
        }

        BigDecimal originalFare = request.originalFare().setScale(2, RoundingMode.HALF_UP);
        BigDecimal systemSuggestedPrice = pricingService.suggestResalePrice(originalFare, request.departureTime());
        BigDecimal finalResalePrice = systemSuggestedPrice;
        if (request.resalePrice() != null) {
            pricingService.validateOverridePrice(systemSuggestedPrice, request.resalePrice());
            finalResalePrice = request.resalePrice().setScale(2, RoundingMode.HALF_UP);
        }

        TicketListingEntity listing = new TicketListingEntity();
        listing.setSourcePlatform(sourcePlatform);
        listing.setOperatorName(request.operatorName().trim());
        listing.setTravel(null);
        listing.setBus(null);
        listing.setSourceTicket(null);
        listing.setRouteFrom(request.routeFrom().trim());
        listing.setRouteTo(request.routeTo().trim());
        listing.setDepartureTime(request.departureTime());
        listing.setSeatNumber(request.seatNumber().trim().toUpperCase(Locale.ROOT));
        listing.setOriginalPnr(request.originalPnr().trim().toUpperCase(Locale.ROOT));
        listing.setOriginalFare(originalFare);
        listing.setResalePrice(finalResalePrice);
        listing.setBuyerFinalPrice(finalResalePrice);
        listing.setPlatformFee(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));
        listing.setTravellerCommission(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));
        listing.setStatus(ListingStatus.AVAILABLE);
        listing.setVerificationStatus(VerificationStatus.VERIFIED);
        listing.setSeller(seller);
        listing.setSellerContact(resolveSellerContact(request, seller));

        TicketListingEntity saved = ticketListingRepository.save(listing);
        TicketListingResponse response = map(saved);

        publish(
                ListingEventType.CREATED,
                response,
                "Cross-platform listing " + saved.getId() + " created from " + sourcePlatform
        );
        auditService.record("LISTING_CREATE", true, 201, seller, "/api/listings", "Cross-platform listing created", saved.getId(), null);

        return response;
    }

    @Transactional
    public TicketListingResponse getListing(long id) {
        TicketListingEntity listing = ticketListingRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Listing not found: " + id));
        expireIfRequired(listing);
        return map(listing);
    }

    @Transactional
    public List<TicketListingResponse> getListings(
            Optional<ListingStatus> status,
            Optional<String> routeFrom,
            Optional<String> routeTo,
            Optional<LocalDate> journeyDate
    ) {
        expireDueListings();

        String safeRouteFrom = routeFrom.orElse("").trim();
        String safeRouteTo = routeTo.orElse("").trim();

        LocalDateTime dateFrom = journeyDate.map(LocalDate::atStartOfDay).orElse(null);
        LocalDateTime dateTo = journeyDate.map(date -> date.plusDays(1).atStartOfDay()).orElse(null);

        List<TicketListingEntity> listings = status
                .map(value -> {
                    if (dateFrom != null && dateTo != null) {
                        return ticketListingRepository.findByStatusAndRouteFromContainingIgnoreCaseAndRouteToContainingIgnoreCaseAndDepartureTimeGreaterThanEqualAndDepartureTimeLessThanOrderByDepartureTimeAsc(
                                value,
                                safeRouteFrom,
                                safeRouteTo,
                                dateFrom,
                                dateTo
                        );
                    }
                    return ticketListingRepository.findByStatusAndRouteFromContainingIgnoreCaseAndRouteToContainingIgnoreCaseOrderByDepartureTimeAsc(
                            value,
                            safeRouteFrom,
                            safeRouteTo
                    );
                })
                .orElseGet(() -> {
                    if (dateFrom != null && dateTo != null) {
                        return ticketListingRepository.findByRouteFromContainingIgnoreCaseAndRouteToContainingIgnoreCaseAndDepartureTimeGreaterThanEqualAndDepartureTimeLessThanOrderByDepartureTimeAsc(
                                safeRouteFrom,
                                safeRouteTo,
                                dateFrom,
                                dateTo
                        );
                    }
                    return ticketListingRepository.findByRouteFromContainingIgnoreCaseAndRouteToContainingIgnoreCaseOrderByDepartureTimeAsc(
                            safeRouteFrom,
                            safeRouteTo
                    );
                });

        return listings.stream().map(this::map).toList();
    }

    @Transactional
    public TicketListingResponse updatePrice(long listingId, BigDecimal newPrice) {
        UserEntity seller = currentUserService.requireCurrentUser();
        TicketListingEntity listing = ticketListingRepository.findByIdForUpdate(listingId)
                .orElseThrow(() -> new ResourceNotFoundException("Listing not found: " + listingId));

        ensureAvailable(listing);
        ensureOwnership(seller, listing);

        BigDecimal systemSuggestedPrice = pricingService.suggestResalePrice(listing.getOriginalFare(), listing.getDepartureTime());
        pricingService.validateOverridePrice(systemSuggestedPrice, newPrice);

        listing.setResalePrice(newPrice.setScale(2, RoundingMode.HALF_UP));
        TicketListingEntity updated = ticketListingRepository.save(listing);
        TicketListingResponse response = map(updated);

        publish(ListingEventType.PRICE_UPDATED, response,
                "Listing " + listingId + " updated price to " + updated.getResalePrice());
        auditService.record("LISTING_UPDATE_PRICE", true, 200, seller, "/api/listings/" + listingId + "/price", "Price updated", listingId, null);

        return response;
    }

    @Transactional
    public TicketListingResponse purchase(long listingId, PurchaseRequest purchaseRequest) {
        UserEntity buyer = currentUserService.requireCurrentUser();
        TicketListingEntity listing = ticketListingRepository.findByIdForUpdate(listingId)
                .orElseThrow(() -> new ResourceNotFoundException("Listing not found: " + listingId));

        ensureAvailable(listing);

        if (listing.getDepartureTime().isBefore(LocalDateTime.now())) {
            listing.setStatus(ListingStatus.EXPIRED);
            ticketListingRepository.save(listing);
            publish(ListingEventType.EXPIRED, map(listing), "Listing " + listingId + " expired before purchase");
            auditService.record("LISTING_PURCHASE", false, 409, buyer, "/api/listings/" + listingId + "/purchase", "Listing expired", listingId, null);
            throw new ConflictException("Ticket already expired and cannot be purchased.");
        }

        if (listing.getSeller().getId().equals(buyer.getId())) {
            auditService.record("LISTING_PURCHASE", false, 400, buyer, "/api/listings/" + listingId + "/purchase", "Buyer cannot purchase own listing", listingId, null);
            throw new InvalidRequestException("You cannot purchase your own listing");
        }

        listing.setStatus(ListingStatus.SOLD);
        listing.setBuyer(buyer);
        listing.setBuyerContact(resolveBuyerContact(purchaseRequest, buyer));
        listing.setTransferCode(generateTransferCode());
        SettlementBreakdown settlement = pricingService.settlementForPurchase(
                listing.getResalePrice(),
                listing.getOriginalFare(),
                listing.getDepartureTime()
        );
        listing.setPlatformFee(settlement.platformFee());
        listing.setTravellerCommission(settlement.travellerCommission());
        listing.setBuyerFinalPrice(settlement.buyerFinalPrice());
        creditCommissionBalances(listing, settlement);

        UserTicketEntity sourceTicket = listing.getSourceTicket();
        if (sourceTicket != null) {
            String pickupPoint = validateJourneyPoint(
                    sourceTicket.getJourney().getPickupPoints(),
                    purchaseRequest.pickupPoint(),
                    sourceTicket.getPickupPoint(),
                    "pickup"
            );
            String droppingPoint = validateJourneyPoint(
                    sourceTicket.getJourney().getDroppingPoints(),
                    purchaseRequest.droppingPoint(),
                    sourceTicket.getDroppingPoint(),
                    "dropping"
            );
            PassengerGender passengerGender = purchaseRequest.passengerGender() == null
                    ? sourceTicket.getPassengerGender()
                    : purchaseRequest.passengerGender();

            sourceTicket.setStatus(UserTicketStatus.TRANSFERRED);
            userTicketRepository.save(sourceTicket);

            UserTicketEntity buyerTicket = new UserTicketEntity();
            buyerTicket.setOwner(buyer);
            buyerTicket.setJourney(sourceTicket.getJourney());
            buyerTicket.setSeatNumber(sourceTicket.getSeatNumber());
            buyerTicket.setPassengerName(
                    sourceTicket.getPassengerName() == null || sourceTicket.getPassengerName().isBlank()
                            ? buyer.getFullName()
                            : sourceTicket.getPassengerName()
            );
            buyerTicket.setPassengerAge(sourceTicket.getPassengerAge());
            buyerTicket.setPassengerPhone(
                    sourceTicket.getPassengerPhone() == null || sourceTicket.getPassengerPhone().isBlank()
                            ? resolveBuyerContact(purchaseRequest, buyer)
                            : sourceTicket.getPassengerPhone()
            );
            buyerTicket.setPassengerGender(passengerGender);
            buyerTicket.setPickupPoint(pickupPoint);
            buyerTicket.setDroppingPoint(droppingPoint);
            buyerTicket.setPnr(generateTransferredPnr(sourceTicket.getPnr()));
            buyerTicket.setAmountPaid(settlement.buyerFinalPrice());
            buyerTicket.setStatus(UserTicketStatus.BOOKED);
            buyerTicket.setSourceListingId(listing.getId());
            userTicketRepository.save(buyerTicket);
        }

        TicketListingEntity updated = ticketListingRepository.save(listing);
        TicketListingResponse response = map(updated);

        notificationService.notifySellerSale(
                listing.getSeller(),
                listing.getId(),
                buyer.getFullName(),
                settlement.sellerPayout(),
                settlement.sellerLoss(),
                settlement.platformFee(),
                settlement.travellerCommission(),
                settlement.buyerFinalPrice()
        );

        publish(ListingEventType.PURCHASED, response,
                "Listing " + listingId + " sold to " + buyer.getFullName() + " (transfer " + updated.getTransferCode() + ")");
        auditService.record("LISTING_PURCHASE", true, 200, buyer, "/api/listings/" + listingId + "/purchase", "Listing purchased", listingId, null);

        return response;
    }

    @Transactional
    public TicketListingResponse revokeListing(long listingId) {
        UserEntity seller = currentUserService.requireCurrentUser();
        TicketListingEntity listing = ticketListingRepository.findByIdForUpdate(listingId)
                .orElseThrow(() -> new ResourceNotFoundException("Listing not found: " + listingId));

        ensureOwnership(seller, listing);

        if (listing.getStatus() != ListingStatus.AVAILABLE) {
            throw new ConflictException("Only available listings can be revoked. Current status: " + listing.getStatus());
        }

        listing.setStatus(ListingStatus.CANCELLED);
        if (listing.getSourceTicket() != null && listing.getSourceTicket().getStatus() == UserTicketStatus.LISTED) {
            listing.getSourceTicket().setStatus(UserTicketStatus.BOOKED);
            userTicketRepository.save(listing.getSourceTicket());
        }
        TicketListingEntity updated = ticketListingRepository.save(listing);
        TicketListingResponse response = map(updated);

        publish(ListingEventType.REVOKED, response, "Listing " + listingId + " revoked by seller");
        auditService.record("LISTING_REVOKE", true, 200, seller, "/api/listings/" + listingId, "Listing revoked", listingId, null);

        return response;
    }

    @Transactional
    public MarketplaceSummaryResponse summary() {
        expireDueListings();

        List<TicketListingEntity> all = ticketListingRepository.findAll();
        long total = all.size();
        long available = all.stream().filter(listing -> listing.getStatus() == ListingStatus.AVAILABLE).count();
        long sold = all.stream().filter(listing -> listing.getStatus() == ListingStatus.SOLD).count();
        long expired = all.stream().filter(listing -> listing.getStatus() == ListingStatus.EXPIRED).count();

        BigDecimal sellerRecovery = all.stream()
                .filter(listing -> listing.getStatus() == ListingStatus.SOLD)
                .map(TicketListingEntity::getResalePrice)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);

        BigDecimal buyerSavings = all.stream()
                .filter(listing -> listing.getStatus() == ListingStatus.SOLD)
                .map(listing -> listing.getOriginalFare().subtract(defaultMoney(listing.getBuyerFinalPrice(), listing.getResalePrice())).max(BigDecimal.ZERO))
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);

        double occupancyLift = total == 0 ? 0 : (sold * 100.0) / total;

        return new MarketplaceSummaryResponse(
                total,
                available,
                sold,
                expired,
                sellerRecovery,
                buyerSavings,
                Math.round(occupancyLift * 100.0) / 100.0
        );
    }

    public List<ProviderInfoResponse> providers() {
        return List.of(
                new ProviderInfoResponse("RedBus", "CONNECTED", "Listing + ownership transfer webhook"),
                new ProviderInfoResponse("AbhiBus", "CONNECTED", "Listing + ownership transfer webhook"),
                new ProviderInfoResponse("RTC", "CONNECTED", "Seat lock and validation sync")
        );
    }

    @Transactional
    public List<TicketListingResponse> sellerTrail() {
        expireDueListings();
        UserEntity currentUser = currentUserService.requireCurrentUser();
        return ticketListingRepository.findBySellerIdOrderByCreatedAtDesc(currentUser.getId())
                .stream()
                .map(this::map)
                .toList();
    }

    @Transactional
    public List<TicketListingResponse> purchasedTickets() {
        expireDueListings();
        UserEntity currentUser = currentUserService.requireCurrentUser();
        return ticketListingRepository.findByBuyerIdOrderByDepartureTimeAsc(currentUser.getId())
                .stream()
                .map(this::map)
                .toList();
    }

    @Transactional
    public UserDashboardResponse userDashboard() {
        expireDueListings();
        UserEntity currentUser = currentUserService.requireCurrentUser();

        List<TicketListingEntity> mySales = ticketListingRepository.findBySellerIdOrderByCreatedAtDesc(currentUser.getId());
        List<TicketListingEntity> myPurchases = ticketListingRepository.findByBuyerIdOrderByDepartureTimeAsc(currentUser.getId());
        List<UserTicketEntity> myOwnedTickets = userTicketRepository.findByOwnerIdAndStatusInOrderByJourneyDepartureTimeAsc(
                currentUser.getId(),
                List.of(UserTicketStatus.BOOKED, UserTicketStatus.LISTED)
        );

        long activeSelling = mySales.stream().filter(listing -> listing.getStatus() == ListingStatus.AVAILABLE).count();
        long sold = mySales.stream().filter(listing -> listing.getStatus() == ListingStatus.SOLD).count();
        long cancelled = mySales.stream().filter(listing -> listing.getStatus() == ListingStatus.CANCELLED).count();

        BigDecimal totalRecovery = mySales.stream()
                .filter(listing -> listing.getStatus() == ListingStatus.SOLD)
                .map(TicketListingEntity::getResalePrice)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);

        BigDecimal totalLoss = mySales.stream()
                .filter(listing -> listing.getStatus() == ListingStatus.SOLD)
                .map(listing -> listing.getOriginalFare().subtract(listing.getResalePrice()).max(BigDecimal.ZERO))
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);

        BigDecimal totalSpent = myOwnedTickets.stream()
                .map(UserTicketEntity::getAmountPaid)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);

        BigDecimal totalSavings = myOwnedTickets.stream()
                .map(ticket -> ticket.getJourney().getBaseFare().subtract(ticket.getAmountPaid()).max(BigDecimal.ZERO))
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);

        BigDecimal totalPlatformFeePaid = myPurchases.stream()
                .map(listing -> defaultMoney(listing.getPlatformFee(), BigDecimal.ZERO))
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);

        BigDecimal totalPlatformFeeGenerated = mySales.stream()
                .filter(listing -> listing.getStatus() == ListingStatus.SOLD)
                .map(listing -> defaultMoney(listing.getPlatformFee(), BigDecimal.ZERO))
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);

        BigDecimal totalTravellerCommission = mySales.stream()
                .filter(listing -> listing.getStatus() == ListingStatus.SOLD)
                .map(listing -> defaultMoney(listing.getTravellerCommission(), BigDecimal.ZERO))
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);

        BigDecimal net = totalRecovery
                .add(totalSavings)
                .add(totalTravellerCommission)
                .subtract(totalLoss.add(totalSpent))
                .setScale(2, RoundingMode.HALF_UP);

        TicketListingResponse upcomingTrip = myOwnedTickets.stream()
                .filter(ticket -> ticket.getStatus() == UserTicketStatus.BOOKED)
                .filter(ticket -> ticket.getJourney().getDepartureTime().isAfter(LocalDateTime.now()))
                .findFirst()
                .map(this::mapTicketAsUpcomingTrip)
                .orElseGet(() -> ticketListingRepository
                        .findByBuyerIdAndDepartureTimeAfterOrderByDepartureTimeAsc(currentUser.getId(), LocalDateTime.now())
                        .stream()
                        .filter(listing -> listing.getStatus() == ListingStatus.SOLD)
                        .findFirst()
                        .map(this::map)
                        .orElse(null));

        return new UserDashboardResponse(
                activeSelling,
                sold,
                cancelled,
                myOwnedTickets.size(),
                totalRecovery,
                totalLoss,
                totalSpent,
                totalSavings,
                totalPlatformFeePaid,
                totalPlatformFeeGenerated,
                totalTravellerCommission,
                net,
                upcomingTrip
        );
    }

    @Transactional
    public void expireDueListings() {
        List<TicketListingEntity> dueListings = ticketListingRepository.findByStatusAndDepartureTimeBefore(
                ListingStatus.AVAILABLE,
                LocalDateTime.now()
        );

        for (TicketListingEntity listing : dueListings) {
            listing.setStatus(ListingStatus.EXPIRED);
            if (listing.getSourceTicket() != null && listing.getSourceTicket().getStatus() == UserTicketStatus.LISTED) {
                listing.getSourceTicket().setStatus(UserTicketStatus.BOOKED);
                userTicketRepository.save(listing.getSourceTicket());
            }
            TicketListingEntity updated = ticketListingRepository.save(listing);
            publish(ListingEventType.EXPIRED, map(updated), "Listing " + updated.getId() + " expired");
        }
    }

    private void expireIfRequired(TicketListingEntity listing) {
        if (listing.getStatus() == ListingStatus.AVAILABLE && listing.getDepartureTime().isBefore(LocalDateTime.now())) {
            listing.setStatus(ListingStatus.EXPIRED);
            if (listing.getSourceTicket() != null && listing.getSourceTicket().getStatus() == UserTicketStatus.LISTED) {
                listing.getSourceTicket().setStatus(UserTicketStatus.BOOKED);
                userTicketRepository.save(listing.getSourceTicket());
            }
            TicketListingEntity updated = ticketListingRepository.save(listing);
            publish(ListingEventType.EXPIRED, map(updated), "Listing " + updated.getId() + " expired");
        }
    }

    private void ensureAvailable(TicketListingEntity listing) {
        if (listing.getStatus() != ListingStatus.AVAILABLE) {
            throw new ConflictException("Listing is not available. Current status: " + listing.getStatus());
        }
    }

    private void ensureOwnership(UserEntity seller, TicketListingEntity listing) {
        if (!listing.getSeller().getId().equals(seller.getId())) {
            throw new InvalidRequestException("You can only update your own listings");
        }
    }

    private String generateTransferCode() {
        return UUID.randomUUID().toString().substring(0, 8).toUpperCase(Locale.ROOT);
    }

    private String generateTransferredPnr(String sourcePnr) {
        String prefix = sourcePnr == null ? "TRX" : sourcePnr.substring(0, Math.min(3, sourcePnr.length()));
        return (prefix + UUID.randomUUID().toString().replace("-", "").substring(0, 7)).toUpperCase(Locale.ROOT);
    }

    private String resolveSellerContact(CreateListingRequest request, UserEntity seller) {
        if (request.sellerContact() == null || request.sellerContact().isBlank()) {
            return seller.getPhone();
        }
        return request.sellerContact().trim();
    }

    private String resolveBuyerContact(PurchaseRequest request, UserEntity buyer) {
        if (request.buyerContact() == null || request.buyerContact().isBlank()) {
            return buyer.getPhone();
        }
        return request.buyerContact().trim();
    }

    private String validateJourneyPoint(String csv, String selectedValue, String fallbackValue, String label) {
        List<RoutePointResponse> values = routePoints(csv);
        if (values.isEmpty()) {
            return selectedValue == null ? fallbackValue : selectedValue.trim();
        }

        String normalized = selectedValue == null || selectedValue.isBlank()
                ? fallbackValue
                : selectedValue.trim();
        if (normalized == null || normalized.isBlank()) {
            throw new InvalidRequestException("Please select a " + label + " point");
        }
        return values.stream()
                .map(RoutePointResponse::point)
                .filter(value -> value.equalsIgnoreCase(normalized))
                .findFirst()
                .orElseThrow(() -> new InvalidRequestException("Selected " + label + " point is not valid for this journey"));
    }

    private List<String> splitCsv(String csv) {
        if (csv == null || csv.isBlank()) {
            return List.of();
        }
        return java.util.Arrays.stream(csv.split(","))
                .map(String::trim)
                .filter(value -> !value.isBlank())
                .toList();
    }

    private List<RoutePointResponse> routePoints(String csv) {
        return splitCsv(csv).stream()
                .map(value -> {
                    String[] parts = value.split("\\|", 3);
                    String point = parts[0].trim();
                    String date = parts.length > 2 ? parts[1].trim() : "";
                    String time = parts.length > 2 ? parts[2].trim() : (parts.length > 1 ? parts[1].trim() : "");
                    return new RoutePointResponse(point, date, time);
                })
                .toList();
    }

    private TicketListingResponse map(TicketListingEntity listing) {
        BigDecimal suggestedPrice = pricingService.suggestResalePrice(listing.getOriginalFare(), listing.getDepartureTime());
        SettlementBreakdown previewSettlement = pricingService.settlementForPurchase(
                listing.getResalePrice(),
                listing.getOriginalFare(),
                listing.getDepartureTime()
        );
        TravelEntity travel = listing.getTravel();
        BusEntity bus = listing.getBus();
        boolean sold = listing.getStatus() == ListingStatus.SOLD;

        BigDecimal buyerFinalPrice = sold
                ? defaultMoney(listing.getBuyerFinalPrice(), previewSettlement.buyerFinalPrice())
                : previewSettlement.buyerFinalPrice();
        BigDecimal platformFee = sold
                ? defaultMoney(listing.getPlatformFee(), previewSettlement.platformFee())
                : previewSettlement.platformFee();
        BigDecimal travellerCommission = sold
                ? defaultMoney(listing.getTravellerCommission(), previewSettlement.travellerCommission())
                : previewSettlement.travellerCommission();

        return new TicketListingResponse(
                listing.getId(),
                listing.getSourcePlatform(),
                listing.getOperatorName(),
                travel == null ? null : travel.getId(),
                travel == null ? null : travel.getName(),
                bus == null ? null : bus.getId(),
                bus == null ? null : bus.getBusNumber(),
                bus == null ? null : bus.getBusType(),
                listing.getRouteFrom(),
                listing.getRouteTo(),
                listing.getSourceTicket() == null ? List.<RoutePointResponse>of() : routePoints(listing.getSourceTicket().getJourney().getPickupPoints()),
                listing.getSourceTicket() == null ? List.<RoutePointResponse>of() : routePoints(listing.getSourceTicket().getJourney().getDroppingPoints()),
                listing.getDepartureTime(),
                listing.getSeatNumber(),
                listing.getOriginalPnr(),
                listing.getOriginalFare(),
                suggestedPrice,
                listing.getResalePrice(),
                listing.getStatus(),
                listing.getVerificationStatus(),
                listing.getSeller().getId(),
                listing.getSeller().getFullName(),
                listing.getSellerContact(),
                listing.getBuyer() == null ? null : listing.getBuyer().getId(),
                listing.getBuyer() == null ? null : listing.getBuyer().getFullName(),
                listing.getBuyerContact(),
                listing.getTransferCode(),
                buyerFinalPrice,
                platformFee,
                travellerCommission,
                listing.getCreatedAt(),
                listing.getUpdatedAt()
        );
    }

    private TicketListingResponse mapTicketAsUpcomingTrip(UserTicketEntity ticket) {
        JourneyEntity journey = ticket.getJourney();
        TravelEntity travel = journey.getTravel();
        BusEntity bus = journey.getBus();
        BigDecimal fare = ticket.getAmountPaid().setScale(2, RoundingMode.HALF_UP);

        return new TicketListingResponse(
                -ticket.getId(),
                travel.getCode(),
                travel.getName(),
                travel.getId(),
                travel.getName(),
                bus.getId(),
                bus.getBusNumber(),
                bus.getBusType(),
                journey.getRouteFrom(),
                journey.getRouteTo(),
                routePoints(journey.getPickupPoints()),
                routePoints(journey.getDroppingPoints()),
                journey.getDepartureTime(),
                ticket.getSeatNumber(),
                ticket.getPnr(),
                fare,
                fare,
                fare,
                ListingStatus.SOLD,
                VerificationStatus.VERIFIED,
                null,
                null,
                null,
                ticket.getOwner().getId(),
                ticket.getOwner().getFullName(),
                ticket.getOwner().getPhone(),
                null,
                fare,
                BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP),
                BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP),
                ticket.getCreatedAt(),
                ticket.getUpdatedAt()
        );
    }

    private BigDecimal defaultMoney(BigDecimal value, BigDecimal fallback) {
        if (value == null) {
            return fallback == null ? BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP)
                    : fallback.setScale(2, RoundingMode.HALF_UP);
        }
        return value.setScale(2, RoundingMode.HALF_UP);
    }

    private void publish(ListingEventType type, TicketListingResponse listing, String message) {
        eventPublisher.publishEvent(new ListingLifecycleEvent(type, listing, message));
    }

    private void creditCommissionBalances(TicketListingEntity listing, SettlementBreakdown settlement) {
        if (listing.getTravel() != null && listing.getTravel().getOwner() != null) {
            UserEntity travelOwner = listing.getTravel().getOwner();
            travelOwner.setBalance(defaultMoney(travelOwner.getBalance(), BigDecimal.ZERO).add(settlement.travellerCommission()));
            userRepository.save(travelOwner);
        }

        userRepository.findFirstByRoleOrderByCreatedAtAsc(UserRole.ADMIN).ifPresent(admin -> {
            admin.setBalance(defaultMoney(admin.getBalance(), BigDecimal.ZERO).add(settlement.platformFee()));
            userRepository.save(admin);
        });
    }
}
